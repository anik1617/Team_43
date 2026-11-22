import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { C, F, shadow } from '../theme';
import { useNav } from '../nav';
import { Btn, Card, FadeIn, Label, Screen, Small, Tag, Waveform } from '../ui';
import { OBS_BASE, OBS_DROP, OBS_VOICE, PATIENT } from '../demoCase';
import { parseIntake } from '../voice/parse';
import { LiveTranscriber, asrSupported, requestMic } from '../voice/asr';

type Obs = typeof OBS_BASE[number];
const VWORDS = OBS_VOICE.split(' ');

export default function Monitor() {
  const nav = useNav();
  const [obs, setObs] = useState<Obs[]>(OBS_BASE);
  const [rec, setRec] = useState<'idle' | 'listening' | 'finishing' | 'alert'>('idle');
  const [n, setN] = useState(0);
  const [heard, setHeard] = useState<string | null>(null); // real transcript (voice mode)
  const live = useRef<LiveTranscriber | null>(null);
  const voice = asrSupported();
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const saveTyped = () => {
    if (!typed.trim()) return;
    Keyboard.dismiss();
    setTyping(false);
    setTypedCheck(true);
    setHeard(typed.trim());
    setRec('finishing');
    const entry = fromSpeech(typed.trim());
    setTimeout(() => raise(entry), 1800);
  };
  const [typedCheck, setTypedCheck] = useState(false);
  useEffect(() => () => live.current?.cancel(), []);
  const [secs, setSecs] = useState(14 * 60 + 52);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (rec !== 'idle') return;
    const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [rec]);

  const raise = (entry: Obs) => {
    setObs((o) => [...o, entry]);
    setRec('alert');
    nav.setEnc({ deteriorated: true });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Animated.sequence([0, 1, 2, 3].map((i) => Animated.timing(shake, { toValue: i % 2 ? -1 : 1, duration: 60, useNativeDriver: true })).concat([Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true })])).start();
  };

  /** The 45-minute reading from what was actually said; anything not heard keeps the expected value. */
  const fromSpeech = (text: string): Obs => {
    const p = parseIntake(text);
    const gcs = p.gcs?.total ?? OBS_DROP.gcs;
    const pupils = p.pupils === 'right_fixed' ? 'R fixed, dilated' : p.pupils === 'equal' ? 'Equal, reactive' : OBS_DROP.pupils;
    return { ...OBS_DROP, gcs, pupils, bp: p.bp ? `${p.bp.sys}/${p.bp.dia}` : OBS_DROP.bp, hr: p.hr ?? OBS_DROP.hr };
  };

  const startCheck = async () => {
    if (!voice) { setRec('listening'); setN(1); return; }
    if (!(await requestMic())) { setRec('listening'); setN(1); return; }
    const lt = new LiveTranscriber((u) => setHeard(u.text), () => {});
    live.current = lt;
    setHeard('');
    setRec('listening');
    try { await lt.start(); } catch { live.current = null; setHeard(null); setN(1); }
  };

  const stopCheck = async () => {
    const lt = live.current;
    if (!lt) return;
    setRec('finishing');
    const text = await lt.stop();
    live.current = null;
    setHeard(text);
    setTimeout(() => raise(fromSpeech(text)), 400);
  };

  useEffect(() => {
    if (rec !== 'listening' || heard !== null) return;
    if (n >= VWORDS.length) {
      const t = setTimeout(() => raise(OBS_DROP), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((x) => x + 1), /[.,]$/.test(VWORDS[n - 1] ?? '') ? 260 : 130);
    return () => clearTimeout(t);
  }, [rec, n]);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const last = obs[obs.length - 1];

  return (
    <Screen
      title="Neuro observations"
      subtitle={`${PATIENT.id} · ${PATIENT.label} · ${PATIENT.mechanism}`}
      footer={rec === 'alert'
        ? <Btn label="Re-run guideline tree" icon="refresh-cw" variant="danger" onPress={() => nav.push('analyzing')} />
        : rec === 'listening' && heard !== null
        ? <Btn label="Stop and save check" icon="square" onPress={stopCheck} />
        : rec === 'idle' && typing
        ? <Btn label="Save 45-minute check" icon="check" disabled={!typed.trim()} onPress={saveTyped} />
        : rec === 'idle'
        ? <Btn label="Enter 45-minute check" icon="edit-3" onPress={() => setTyping(true)} />
        : <Btn label={rec === 'finishing' ? (typedCheck ? 'Comparing with earlier checks…' : 'Transcribing…') : 'Listening…'} icon={typedCheck ? 'activity' : 'mic'} disabled onPress={() => {}} />}
    >
      {rec === 'idle' && typing ? (
        <FadeIn>
          <Card style={{ marginBottom: 12 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 12, color: C.brand, marginBottom: 8 }}>45-MINUTE CHECK</Text>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              autoFocus
              multiline
              placeholder="e.g. GCS 11, right pupil now fixed and dilated, BP 168/92, pulse 52."
              placeholderTextColor={C.faint}
              style={{ fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: C.ink, minHeight: 80, maxHeight: 140, textAlignVertical: 'top', backgroundColor: C.bg, borderRadius: 12, padding: 10 }}
            />
            {voice ? (
              <Pressable onPress={() => { setTyping(false); startCheck(); }} hitSlop={8} style={{ marginTop: 8 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: C.brand }}>Record by voice instead</Text>
              </Pressable>
            ) : null}
          </Card>
        </FadeIn>
      ) : null}
      {rec === 'alert' ? (
        <Animated.View style={{ transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) }] }}>
          <View style={[{ backgroundColor: C.red, borderRadius: 20, padding: 16, flexDirection: 'row', gap: 12 }, shadow]}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="alert-triangle" size={21} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 16, color: '#fff' }}>Deterioration detected</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 13, lineHeight: 19, color: '#FFE3DF', marginTop: 3 }}>
                GCS fell 14 → {last.gcs} in 45 min. New right pupil change and left arm drift. BP rising while pulse falls.
              </Text>
            </View>
          </View>
        </Animated.View>
      ) : (
        <FadeIn>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 3, borderColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="clock" size={20} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Small>Next check due in</Small>
              <Text style={{ fontFamily: F.monoSemi, fontSize: 26, color: C.ink, letterSpacing: 0.5 }}>{mm}:{ss}</Text>
            </View>
            <Tag label="Every 15 min" tone="brand" icon="repeat" />
          </Card>
        </FadeIn>
      )}

      {rec === 'listening' || rec === 'finishing' ? (
        <FadeIn>
          <Card style={{ marginTop: 12, backgroundColor: C.navy, borderColor: C.navy }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontFamily: F.semi, fontSize: 12, color: C.sky, flex: 1 }}>{typedCheck ? 'CHECKING TREND · 45-MIN CHECK' : 'LISTENING · 45-MIN CHECK'}</Text>
              <Waveform active color={C.sky} bars={10} height={18} />
            </View>
            <Text style={{ fontFamily: F.medium, fontSize: 15, lineHeight: 22, color: '#fff' }}>{heard !== null ? heard || 'Listening…' : VWORDS.slice(0, n).join(' ')}</Text>
          </Card>
        </FadeIn>
      ) : null}

      <FadeIn delay={100}>
        <Card style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 14, color: C.ink, flex: 1 }}>GCS trend</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 22, color: last.gcs <= 12 ? C.red : C.ink }}>{last.gcs}<Text style={{ fontFamily: F.regular, fontSize: 13, color: C.muted }}> /15</Text></Text>
          </View>
          <GcsChart data={obs} />
        </Card>
      </FadeIn>

      <FadeIn delay={180}>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {[
            { l: 'Pupils', v: last.pupils, bad: last.pupils !== 'Equal, reactive', i: 'eye' },
            { l: 'BP', v: last.bp, bad: last.min === 45, i: 'heart' },
            { l: 'Pulse', v: `${last.hr}`, bad: last.hr < 55, i: 'activity' },
          ].map((x) => (
            <View key={x.l} style={{ flex: 1, backgroundColor: x.bad ? C.redWash : C.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: x.bad ? C.redLine : C.line }}>
              <Feather name={x.i as any} size={14} color={x.bad ? C.red : C.muted} />
              <Small style={{ marginTop: 6 }}>{x.l}</Small>
              <Text style={{ fontFamily: F.semi, fontSize: 14, color: x.bad ? C.red : C.ink, marginTop: 1 }}>{x.v}</Text>
            </View>
          ))}
        </View>
      </FadeIn>

      <FadeIn delay={240}>
        <Label style={{ marginTop: 22, marginBottom: 10 }}>Observation log</Label>
        <Card style={{ padding: 0 }}>
          {[...obs].reverse().map((o, i) => (
            <View key={o.t} style={{ flexDirection: 'row', alignItems: 'center', padding: 13, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
              <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.muted, width: 52 }}>{o.t}</Text>
              <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: o.gcs <= 12 ? C.red : C.ink, width: 66 }}>GCS {o.gcs}</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: C.muted, flex: 1 }} numberOfLines={1}>{o.pupils} · {o.bp}</Text>
              {o.min === 45 ? <Feather name="alert-circle" size={15} color={C.red} /> : <Feather name="mic" size={13} color={C.faint} />}
            </View>
          ))}
        </Card>
      </FadeIn>
    </Screen>
  );
}

function GcsChart({ data }: { data: Obs[] }) {
  const W = 320, H = 150, padL = 26, padR = 12, padT = 12, padB = 24;
  const x = (m: number) => padL + (m / 60) * (W - padL - padR);
  const y = (g: number) => padT + ((15 - g) / (15 - 8)) * (H - padT - padB);
  const d = data.map((p, i) => `${i ? 'L' : 'M'}${x(p.min)},${y(p.gcs)}`).join(' ');
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Rect x={padL} y={y(12)} width={W - padL - padR} height={y(8) - y(12)} fill={C.redWash} rx={6} />
      {[15, 13, 11, 9].map((g) => (
        <React.Fragment key={g}>
          <Line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke={C.line} strokeWidth={1} />
          <SvgText x={4} y={y(g) + 4} fontSize={10} fill={C.faint}>{g}</SvgText>
        </React.Fragment>
      ))}
      {[0, 15, 30, 45, 60].map((m) => (
        <SvgText key={m} x={x(m) - 8} y={H - 6} fontSize={10} fill={C.faint}>{m}m</SvgText>
      ))}
      <Path d={d} stroke={C.brand} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((p) => (
        <Circle key={p.min} cx={x(p.min)} cy={y(p.gcs)} r={5.5} fill={p.gcs <= 12 ? C.red : C.card} stroke={p.gcs <= 12 ? C.red : C.brand} strokeWidth={2.5} />
      ))}
    </Svg>
  );
}
