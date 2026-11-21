import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { C, F } from '../theme';
import { useNav } from '../nav';
import { Btn, FadeIn, Pulse, Screen, Tag, Waveform, tap } from '../ui';
import { EXTRACTED, PATIENT, TRANSCRIPT } from '../demoCase';

const WORDS = TRANSCRIPT.split(' ');

export default function Intake() {
  const nav = useNav();
  const [state, setState] = useState<'idle' | 'listening' | 'structuring' | 'done'>('idle');
  const [n, setN] = useState(0);
  const scroller = useRef<any>(null);

  useEffect(() => {
    if (state !== 'listening') return;
    if (n >= WORDS.length) { setState('structuring'); return; }
    const w = WORDS[n - 1] ?? '';
    const delay = /[.,]$/.test(w) ? 300 : 150;
    const t = setTimeout(() => setN((x) => x + 1), delay);
    return () => clearTimeout(t);
  }, [state, n]);

  useEffect(() => {
    if (state !== 'structuring') return;
    const t = setTimeout(() => { setState('done'); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }, 1300);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => { scroller.current?.scrollToEnd({ animated: true }); }, [n]);

  const fields = useMemo(() => EXTRACTED.filter((e) => n > e.at).sort((a, b) => a.at - b.at), [n]);
  const listening = state === 'listening';

  const onMic = () => {
    tap();
    if (state === 'idle') { setState('listening'); setN(1); }
    else if (state === 'listening') { setN(WORDS.length); }
  };

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
          <Tag label={listening ? 'LISTENING' : state === 'idle' ? 'READY' : 'CAPTURED'} tone="navy" icon={listening ? 'radio' : 'mic'} />
          <Tag label="Transcribed on device" tone="navy" icon="cpu" />
        </View>
        <ScrollView ref={scroller} style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
          {state === 'idle' ? (
            <Text style={{ fontFamily: F.medium, fontSize: 20, lineHeight: 29, color: 'rgba(255,255,255,0.45)' }}>
              Tap the mic and describe the patient: what happened, how they are now, and your exam.
            </Text>
          ) : (
            <Text style={{ fontFamily: F.medium, fontSize: 19, lineHeight: 28, color: '#fff' }}>
              {WORDS.slice(0, n).join(' ')}
              {listening ? <Text style={{ color: C.sky }}> ▍</Text> : null}
            </Text>
          )}
        </ScrollView>

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
            {state === 'structuring' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Feather name="zap" size={13} color={C.sky} />
                <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: C.sky }}>Checking ranges and units…</Text>
              </View>
            ) : null}
            {state === 'done' ? (
              <FadeIn>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                  <Feather name="check-circle" size={14} color="#5BD19A" />
                  <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: '#5BD19A' }}>11 fields captured · 6 critical need read-back</Text>
                </View>
              </FadeIn>
            ) : null}
          </ScrollView>
        </View>

        {/* Mic */}
        <View style={{ alignItems: 'center', paddingTop: 18, paddingBottom: 4 }}>
          {state !== 'done' ? (
            <>
              <View style={{ height: 40, justifyContent: 'center', marginBottom: 10 }}>
                {listening ? <Waveform active color={C.sky} bars={28} height={36} /> : null}
              </View>
              <Pressable onPress={onMic} style={{ alignItems: 'center' }}>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Pulse size={86} color={C.sky} on={listening} />
                  <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: listening ? C.red : C.brand, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={listening ? 'square' : 'mic'} size={listening ? 26 : 34} color="#fff" />
                  </View>
                </View>
                <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: C.navyText, marginTop: 10 }}>
                  {listening ? 'Tap to finish' : state === 'structuring' ? 'Structuring…' : 'Tap to speak'}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Screen>
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

