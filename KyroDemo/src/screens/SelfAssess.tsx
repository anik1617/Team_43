import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F } from '../theme';
import { useNav, type Disposition } from '../nav';
import { Btn, Chip, FadeIn, H1, Label, Screen, Small, tap } from '../ui';

const OPTS: { k: Disposition; t: string; s: string; i: keyof typeof Feather.glyphMap }[] = [
  { k: 'observe', t: 'Observe here', s: 'Admit, repeat neuro checks, no transfer yet', i: 'eye' },
  { k: 'transfer', t: 'Prepare transfer', s: 'Close observation while arranging referral', i: 'truck' },
  { k: 'specialist', t: 'Urgent specialist decision', s: 'Time-critical, contact neurosurgery now', i: 'phone-call' },
];

export default function SelfAssess() {
  const nav = useNav();
  const { enc, setEnc } = nav;
  const ready = !!enc.selfAssessment && !!enc.selfConfidence;

  return (
    <Screen
      title="Your assessment first"
      subtitle="Kyro's guidance stays hidden until you commit"
      step={[4, 5]}
      footer={<Btn label="Lock in my assessment" icon="lock" disabled={!ready} onPress={() => nav.push('analyzing')} />}
    >
      <FadeIn>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Feather name="eye-off" size={14} color={C.violet} />
          <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: C.violet }}>Kyro's recommendation is hidden</Text>
        </View>
        <H1>What would you do{'\n'}right now?</H1>
        <Small style={{ marginTop: 8, fontSize: 13.5, lineHeight: 20 }}>
          Writing down your own judgment before you see Kyro's helps you catch it when Kyro is wrong.
        </Small>
      </FadeIn>

      <View style={{ marginTop: 20, gap: 10 }}>
        {OPTS.map((o, i) => {
          const on = enc.selfAssessment === o.k;
          return (
            <FadeIn key={o.k} delay={100 + i * 80}>
              <Pressable onPress={() => { tap(); setEnc({ selfAssessment: o.k }); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, backgroundColor: on ? C.violetWash : C.card, borderWidth: 1.5, borderColor: on ? C.violet : C.line }}>
                  <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: on ? C.violet : C.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={o.i} size={19} color={on ? '#fff' : C.ink2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.semi, fontSize: 15.5, color: C.ink }}>{o.t}</Text>
                    <Small style={{ marginTop: 2 }}>{o.s}</Small>
                  </View>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.violet : C.line2, alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.violet }} /> : null}
                  </View>
                </View>
              </Pressable>
            </FadeIn>
          );
        })}
      </View>

      <FadeIn delay={400}>
        <Label style={{ marginTop: 24, marginBottom: 10 }}>How confident are you?</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['low', 'med', 'high'] as const).map((c) => (
            <View key={c} style={{ flex: 1 }}>
              <Chip label={{ low: 'Not sure', med: 'Fairly', high: 'Very' }[c]} selected={enc.selfConfidence === c} onPress={() => setEnc({ selfConfidence: c })} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 }}>
          <Feather name="clipboard" size={13} color={C.faint} />
          <Small style={{ color: C.faint }}>Saved to the case record with a timestamp.</Small>
        </View>
      </FadeIn>
    </Screen>
  );
}
