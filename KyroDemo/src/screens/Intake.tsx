import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { C, F } from '../theme';
import { useNav } from '../nav';
import { Btn, FadeIn, Pulse, Screen, Spinner, Tag, Waveform, tap } from '../ui';
import { PATIENT, READBACK, TRANSCRIPT } from '../demoCase';
import { buildReadback, parseIntake } from '../voice/parse';
import { LiveTranscriber, asrSupported, requestMic, warmUp } from '../voice/asr';

type State = 'idle' | 'preparing' | 'listening' | 'finishing' | 'structuring' | 'done' | 'error';

const SAMPLE_WORDS = TRANSCRIPT.split(' ');
const LEVELS = 28;

export default function Intake() {
  const nav = useNav();
  const [state, setState] = useState<State>('idle');
  const [mode, setMode] = useState<'voice' | 'sample'>(asrSupported() ? 'voice' : 'sample');
  const [text, setText] = useState('');
  const [levels, setLevels] = useState<number[]>(() => Array(LEVELS).fill(0));
  const [silentMic, setSilentMic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [n, setN] = useState(0); // sample mode: words revealed
  const live = useRef<LiveTranscriber | null>(null);
  const scroller = useRef<any>(null);

  // Load the speech model as soon as the screen opens, so the mic is instant.
  useEffect(() => {
    if (mode !== 'voice') return;
    warmUp().then(() => setModelReady(true)).catch((e) => {
      setError(`Speech model failed to load: ${String(e?.message ?? e)}`);
      setState('error');
    });
    return () => { live.current?.cancel(); live.current = null; };
  }, [mode]);

  // Sample mode: reveal the scripted transcript word by word.
  useEffect(() => {
    if (mode !== 'sample' || state !== 'listening') return;
    if (n >= SAMPLE_WORDS.length) { setState('structuring'); return; }
    const w = SAMPLE_WORDS[n - 1] ?? '';
    const t = setTimeout(() => setN((x) => x + 1), /[.,]$/.test(w) ? 300 : 150);
    return () => clearTimeout(t);
  }, [mode, state, n]);
  useEffect(() => { if (mode === 'sample') setText(SAMPLE_WORDS.slice(0, n).join(' ')); }, [mode, n]);

  // Every field comes from the same deterministic parser, live, from whatever has been heard so far.
  const parsed = useMemo(() => parseIntake(text), [text]);
  const fields = parsed.fields;

  useEffect(() => { scroller.current?.scrollToEnd({ animated: true }); }, [text]);

  useEffect(() => {
    if (state !== 'structuring') return;
    const t = setTimeout(() => {
      const p = parseIntake(text);
      nav.setEnc({
        intake: { transcript: text, fields: p.fields, readback: buildReadback(p, READBACK), source: mode },
        ...(p.pupils ? { pupils: p.pupils } : {}),
      });
      setState('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, 1100);
    return () => clearTimeout(t);
  }, [state]);

  const startVoice = async () => {
    setError(null);
    setSilentMic(false);
    setText('');
    if (!(await requestMic())) {
      setError('Microphone permission was denied. Allow it in Settings › Apps › Kyro › Permissions.');
      setState('error');
      return;
    }
    setState('preparing');
    const lt = new LiveTranscriber(
      (u) => {
        setText(u.text);
        setSilentMic(u.silentMic);
        setLevels((l) => [...l.slice(1), u.level]);
      },
      (msg) => setError(msg),
    );
    live.current = lt;
    try {
      await lt.start();
      setState('listening');
    } catch (e: any) {
      live.current = null;
      setError(String(e?.message ?? e));
      setState('error');
    }
  };

  const stopVoice = async () => {
    const lt = live.current;
    if (!lt) return;
    setState('finishing');
    const final = await lt.stop();
    live.current = null;
    setText(final);
    setLevels(Array(LEVELS).fill(0));
    if (!final) {
      setError(silentMic
        ? 'No sound reached the microphone, so nothing was transcribed.'
        : "Kyro didn't catch any words. Tap the mic and try again.");
      setState('error');
      return;
    }
    setState('structuring');
  };

  const onMic = () => {
    tap();
    if (mode === 'sample') {
      if (state === 'idle' || state === 'error') { setState('listening'); setN(1); }
      else if (state === 'listening') setN(SAMPLE_WORDS.length);
      return;
    }
    if (state === 'idle' || state === 'error') startVoice();
    else if (state === 'listening') stopVoice();
  };

  const useSample = () => {
    tap();
    live.current?.cancel();
    live.current = null;
    setError(null);
    setMode('sample');
    setN(1);
    setState('listening');
  };

  const listening = state === 'listening';
  const busy = state === 'preparing' || state === 'finishing';
  const criticalHeard = READBACK.filter((r) => fields.some((f) => f.key === r.key)).length;
  const notHeard = READBACK.length - criticalHeard;
  const showText = state !== 'idle' && !(state === 'error' && !text);

  return (
    <Screen
      dark
      title="New assessment"
      subtitle={`${PATIENT.id} · ${PATIENT.site}`}
      step={[1, 5]}
      scroll={false}
      footer={state === 'done' ? (
        <FadeIn>
          <Btn label="Review read-back" icon="arrow-right" onPress={() => nav.push('readback')} />
        </FadeIn>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
          <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: C.navyText }}>
            <Feather name="type" size={12} />  Type instead
          </Text>
          <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: C.navyText }}>
            <Feather name="globe" size={12} />  English
          </Text>
        </View>
      )}
    >
      {/* Transcript */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Tag label={listening ? 'LISTENING' : state === 'idle' || state === 'preparing' || state === 'error' ? 'READY' : 'CAPTURED'} tone="navy" icon={listening ? 'radio' : 'mic'} />
          <Tag label="Transcribed on device" tone="navy" icon="cpu" />
        </View>
        <ScrollView ref={scroller} style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
          {!showText ? (
            <Text style={{ fontFamily: F.medium, fontSize: 20, lineHeight: 29, color: 'rgba(255,255,255,0.45)' }}>
              Tap the mic and describe the patient: what happened, how they are now, and your exam.
            </Text>
          ) : (
            <Text style={{ fontFamily: F.medium, fontSize: 19, lineHeight: 28, color: '#fff' }}>
              {text || (listening ? <Text style={{ color: 'rgba(255,255,255,0.45)' }}>Listening…</Text> : null)}
              {listening ? <Text style={{ color: C.sky }}> ▍</Text> : null}
            </Text>
          )}
        </ScrollView>

        {listening && silentMic ? (
          <Notice icon="mic-off" text="No sound is reaching the microphone. On the emulator, turn on ⋯ › Microphone › “Virtual microphone uses host audio input”." />
        ) : null}
        {state === 'error' && error ? (
          <Notice icon="alert-circle" text={error} action={mode === 'voice' ? { label: 'Play the sample case instead', onPress: useSample } : undefined} />
        ) : null}

        {/* Live case record */}
        <View style={{ flex: 1, marginTop: 14, backgroundColor: C.navy2, borderRadius: 20, borderWidth: 1, borderColor: C.navyLine, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Feather name="file-text" size={14} color={C.sky} />
            <Text style={{ fontFamily: F.semi, fontSize: 13, color: '#fff', marginLeft: 8, flex: 1 }}>Structured case record</Text>
            <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.navyText }}>{fields.length} fields</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {fields.length === 0 ? (
              <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>
                Fields appear here as Kyro hears them.
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {fields.map((f) => <FieldPill key={f.key} label={f.label} value={f.value} critical={f.critical} icon={f.icon} />)}
            </View>
            {state === 'finishing' ? (
              <Status icon="cpu" text="Finishing transcription on device…" />
            ) : null}
            {state === 'structuring' ? (
              <Status icon="zap" text="Checking ranges and units…" />
            ) : null}
            {state === 'done' ? (
              <FadeIn>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <Feather name={notHeard ? 'alert-circle' : 'check-circle'} size={14} color={notHeard ? C.amber : '#5BD19A'} />
                  <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: notHeard ? '#F5C77A' : '#5BD19A', flex: 1 }}>
                    {fields.length} fields captured · {READBACK.length} critical need read-back
                    {notHeard ? ` · ${notHeard} not heard, confirm next` : ''}
                  </Text>
                </View>
              </FadeIn>
            ) : null}
          </ScrollView>
        </View>

        {/* Mic */}
        <View style={{ alignItems: 'center', paddingTop: 18, paddingBottom: 4 }}>
          {state !== 'done' && state !== 'structuring' ? (
            <>
              <View style={{ height: 40, justifyContent: 'center', marginBottom: 10 }}>
                {listening ? (mode === 'voice' ? <LevelWave levels={levels} /> : <Waveform active color={C.sky} bars={28} height={36} />) : null}
              </View>
              <Pressable onPress={onMic} disabled={busy} style={{ alignItems: 'center' }}>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Pulse size={86} color={C.sky} on={listening} />
                  <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: listening ? C.red : C.brand, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.7 : 1 }}>
                    {busy ? <Spinner color="#fff" size={28} /> : <Feather name={listening ? 'square' : 'mic'} size={listening ? 26 : 34} color="#fff" />}
                  </View>
                </View>
                <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: C.navyText, marginTop: 10 }}>
                  {listening ? 'Tap to finish'
                    : state === 'finishing' ? 'Transcribing…'
                    : state === 'preparing' ? 'Opening microphone…'
                    : mode === 'voice' && !modelReady ? 'Loading speech model…'
                    : state === 'error' ? 'Tap to try again'
                    : 'Tap to speak'}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

/** Bars driven by the real microphone level, so silence looks like silence. */
function LevelWave({ levels }: { levels: number[] }) {
  const peak = Math.max(0.02, ...levels);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 36 }}>
      {levels.map((l, i) => (
        <View key={i} style={{ width: 3.5, height: 4 + 32 * Math.min(1, Math.sqrt(l / peak)), borderRadius: 2, backgroundColor: C.sky, opacity: 0.5 + 0.5 * (i / levels.length) }} />
      ))}
    </View>
  );
}

function Status({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
      <Feather name={icon} size={13} color={C.sky} />
      <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: C.sky }}>{text}</Text>
    </View>
  );
}

function Notice({ icon, text, action }: { icon: keyof typeof Feather.glyphMap; text: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ marginTop: 10, backgroundColor: 'rgba(245,199,122,0.12)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(245,199,122,0.35)', padding: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Feather name={icon} size={14} color="#F5C77A" style={{ marginTop: 1 }} />
        <Text style={{ fontFamily: F.regular, fontSize: 12.5, lineHeight: 18, color: '#F5E3C0', flex: 1 }}>{text}</Text>
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={8} style={{ marginTop: 8, marginLeft: 22 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: C.sky }}>{action.label} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FieldPill({ label, value, critical, icon }: { label: string; value: string; critical?: boolean; icon: string }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(a, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);
  return (
    <Animated.View style={{
      opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
      backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, borderWidth: 1, borderColor: critical ? 'rgba(124,196,255,0.45)' : C.navyLine,
      paddingVertical: 8, paddingHorizontal: 10, minWidth: '47%', flexGrow: 1,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Feather name={icon as any} size={11} color={critical ? C.sky : C.navyText} />
        <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: C.navyText, letterSpacing: 0.3 }}>{label.toUpperCase()}</Text>
        {critical ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.sky, marginLeft: 'auto' }} /> : null}
      </View>
      <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: '#fff', marginTop: 3 }}>{value}</Text>
    </Animated.View>
  );
}
