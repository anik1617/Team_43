import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { C, F, shadow } from '../theme';
import { useNav } from '../nav';
import { Btn, Card, FadeIn, Label, Screen, Small, Spinner, Tag, tap } from '../ui';
import { evaluate } from '../logic';
import { buildPlan, LIBRARY, STRENGTH_TONE, type Source, type Step } from '../guidelines';

export default function Plan() {
  const nav = useNav();
  const { enc, setEnc } = nav;
  const ev = evaluate(enc);
  const plan = buildPlan(enc, ev.lateralizing);
  const hern = plan.variant === 'herniation';
  const [k, setK] = useState(0);
  const assembled = k > plan.matches.length;

  useEffect(() => {
    if (assembled) return;
    const t = setTimeout(() => {
      setK((x) => x + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, k === 0 ? 500 : 480);
    return () => clearTimeout(t);
  }, [k, assembled]);

  const toggle = (id: string) => {
    tap();
    setEnc({ stabilized: enc.stabilized.includes(id) ? enc.stabilized.filter((x) => x !== id) : [...enc.stabilized, id] });
  };
  const doneCount = plan.steps.filter((s) => enc.stabilized.includes(s.id) || s.met).length;
  const w = enc.weightKg ?? 60;

  return (
    <Screen
      title={hern ? 'Herniation protocol' : 'What to do now'}
      subtitle={`${ev.leaf.split(' · ')[0]} · ${plan.now}`}
      footer={assembled
        ? hern
          ? <Btn label="Send brief to neurosurgeon" icon="send" variant="danger" onPress={() => nav.push('handoff')} />
          : <Btn label="Start neuro checks" icon="activity" onPress={() => nav.push('monitor')} />
        : <Btn label="Assembling plan…" icon="loader" disabled onPress={() => {}} />}
    >
      {/* Retrieval: match this patient to the library */}
      <View style={[{ backgroundColor: C.navy, borderRadius: 20, padding: 16 }, shadow]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {assembled ? <Feather name="book-open" size={15} color="#7BE0B0" /> : <Spinner color={C.sky} size={15} />}
          <Text style={{ fontFamily: F.semi, fontSize: 13, color: '#fff', flex: 1 }}>
            {assembled ? `Matched to ${plan.used} guideline passages` : 'Matching this patient to the guidelines'}
          </Text>
          <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.navyText }}>{LIBRARY.passages} passages · {LIBRARY.sources} sources</Text>
        </View>
        <View style={{ marginTop: 10 }}>
          {plan.matches.map((m, i) => (
            <View key={m.fact} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6, opacity: i < k ? 1 : 0.18, borderTopWidth: i ? 1 : 0, borderTopColor: C.navyLine }}>
              <Feather name={i < k ? 'check' : 'circle'} size={12} color={i < k ? '#7BE0B0' : C.navyText} style={{ marginTop: 3 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: '#fff' }}>{m.fact} <Text style={{ color: C.sky }}>→</Text> {m.finding}</Text>
                <Text style={{ fontFamily: F.regular, fontSize: 11, color: 'rgba(201,216,234,0.7)', marginTop: 1 }}>{m.src}</Text>
              </View>
            </View>
          ))}
        </View>
        {assembled ? (
          <FadeIn from={4}>
            <Text style={{ fontFamily: F.regular, fontSize: 11.5, lineHeight: 16, color: C.navyText, marginTop: 8 }}>
              The guideline tree chose which steps apply. Every number below is copied from a cited passage and scaled to this patient. Kyro does not generate clinical values.
            </Text>
          </FadeIn>
        ) : null}
      </View>

      {assembled ? (
        <>
          {/* Clocks */}
          <FadeIn>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              {plan.clocks.map((c) => (
                <View key={c.label} style={{ flex: 1, backgroundColor: c.urgent ? C.redWash : C.card, borderRadius: 16, padding: 11, borderWidth: 1, borderColor: c.urgent ? C.redLine : C.line }}>
                  <Feather name="clock" size={13} color={c.urgent ? C.red : C.muted} />
                  <Text style={{ fontFamily: F.monoSemi, fontSize: 19, color: c.urgent ? C.red : C.ink, marginTop: 4 }}>{c.at}</Text>
                  <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: c.urgent ? C.red : C.ink2 }}>{c.left}</Text>
                  <Text style={{ fontFamily: F.regular, fontSize: 10.5, lineHeight: 14, color: C.muted, marginTop: 3 }}>{c.label}</Text>
                </View>
              ))}
            </View>
          </FadeIn>

          {hern ? (
            <FadeIn delay={60}>
              <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
                <Feather name="user" size={16} color={C.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: C.ink }}>Doses for {w} kg</Text>
                  <Small>Estimated weight · adjust if you know better</Small>
                </View>
                {[-5, 5].map((d) => (
                  <Pressable key={d} hitSlop={6} onPress={() => { tap(); setEnc({ weightKg: Math.min(120, Math.max(30, w + d)) }); }}
                    style={{ width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={d < 0 ? 'minus' : 'plus'} size={16} color={C.ink2} />
                  </Pressable>
                ))}
              </Card>
            </FadeIn>
          ) : null}

          <FadeIn delay={100}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
              <Label style={{ flex: 1 }}>{plan.headline}</Label>
              <Small>{doneCount}/{plan.steps.length}</Small>
            </View>
          </FadeIn>

          {plan.steps.map((s, i) => (
            <FadeIn key={s.id} delay={140 + i * 60}>
              <StepCard step={s} n={i + 1} done={enc.stabilized.includes(s.id)} onToggle={() => toggle(s.id)} />
            </FadeIn>
          ))}

          <FadeIn delay={200}>
            <Label style={{ marginTop: 14, marginBottom: 8 }}>Do not</Label>
            <Card style={{ padding: 0 }}>
              {plan.avoid.map((a, i) => <AvoidRow key={a.text} text={a.text} src={a.src} first={!i} />)}
            </Card>
          </FadeIn>

          <FadeIn delay={240}>
            <Card style={{ marginTop: 14, flexDirection: 'row', gap: 12, backgroundColor: '#F7F8FA' }}>
              <Feather name="shield" size={18} color={C.ink2} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: C.ink }}>What Kyro will not decide</Text>
                <Small style={{ marginTop: 3, lineHeight: 18 }}>
                  Whether to operate here, and where to drill. Without imaging the side and site can't be known, so that call stays with the neurosurgeon. Everything above is in your scope now.
                </Small>
              </View>
            </Card>
          </FadeIn>
        </>
      ) : null}
    </Screen>
  );
}

function StepCard({ step, n, done, onToggle }: { step: Step; n: number; done: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const blocked = (step.gates ?? []).some((g) => !g.ok);
  const complete = done || !!step.met;
  return (
    <Card style={{ marginBottom: 10, padding: 14, borderColor: blocked ? C.amberLine : C.line }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable disabled={blocked || !!step.met} onPress={onToggle} hitSlop={8}
          style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: complete ? C.green : C.card, borderWidth: complete ? 0 : 1.5, borderColor: blocked ? C.amberLine : C.line2, alignItems: 'center', justifyContent: 'center' }}>
          {complete ? <Feather name="check" size={16} color="#fff" /> : <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: blocked ? C.amber : C.muted }}>{n}</Text>}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 14.5, color: C.ink }}>{step.title}</Text>
          {step.dose ? <Text style={{ fontFamily: F.monoSemi, fontSize: 16, color: blocked ? C.amber : C.brandDeep, marginTop: 4 }}>{step.dose}</Text> : null}
          <Text style={{ fontFamily: F.regular, fontSize: 13, lineHeight: 19, color: C.ink2, marginTop: 5 }}>{step.forHim}</Text>
          {step.met ? <Tag label="Target met now" tone="green" icon="check" style={{ marginTop: 8 }} /> : null}

          {step.gates ? (
            <View style={{ marginTop: 9, padding: 10, borderRadius: 12, backgroundColor: blocked ? C.amberWash : C.greenWash }}>
              <Text style={{ fontFamily: F.semi, fontSize: 11, letterSpacing: 0.6, color: blocked ? C.amber : C.green, marginBottom: 4 }}>
                {blocked ? 'HELD UNTIL' : 'CRITERIA MET'}
              </Text>
              {step.gates.map((g) => (
                <View key={g.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Feather name={g.ok ? 'check' : 'x'} size={12} color={g.ok ? C.green : C.amber} />
                  <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.ink2, flex: 1 }}>{g.label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
            {step.sources.map((s, i) => (
              <Pressable key={s.src + s.loc} onPress={() => { tap(); setOpen(open === i ? null : i); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: open === i ? C.brand : C.brandWash }}>
                <Feather name="book-open" size={10} color={open === i ? '#fff' : C.brandDeep} />
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: open === i ? '#fff' : C.brandDeep }}>{short(s.src)}</Text>
              </Pressable>
            ))}
          </View>
          {open !== null ? <Quote s={step.sources[open]} /> : null}
        </View>
      </View>
    </Card>
  );
}

function Quote({ s }: { s: Source }) {
  return (
    <FadeIn from={6}>
      <View style={{ marginTop: 8, padding: 11, borderRadius: 12, backgroundColor: C.bg, borderLeftWidth: 3, borderLeftColor: C.brand }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ fontFamily: F.semi, fontSize: 11.5, color: C.brandDeep, flexShrink: 1 }}>{s.src}</Text>
          <Tag label={s.strength} tone={STRENGTH_TONE[s.strength]} />
        </View>
        <Text style={{ fontFamily: F.regular, fontSize: 10.5, color: C.faint, marginTop: 2 }}>{s.loc}</Text>
        <Text style={{ fontFamily: F.regular, fontSize: 12.5, lineHeight: 18, color: C.ink2, marginTop: 5 }}>“{s.quote}”</Text>
      </View>
    </FadeIn>
  );
}

function AvoidRow({ text, src, first }: { text: string; src: Source; first: boolean }) {
  const [o, setO] = useState(false);
  return (
    <Pressable onPress={() => { tap(); setO(!o); }}>
      <View style={{ padding: 13, borderTopWidth: first ? 0 : 1, borderTopColor: C.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Feather name="slash" size={14} color={C.red} />
          <Text style={{ fontFamily: F.medium, fontSize: 13.5, color: C.ink, flex: 1 }}>{text}</Text>
          <Text style={{ fontFamily: F.medium, fontSize: 11, color: C.brandDeep }}>{short(src.src)}</Text>
        </View>
        {o ? <Quote s={src} /> : null}
      </View>
    </Pressable>
  );
}

const short = (src: string) =>
  src.startsWith('Brain Trauma') ? 'BTF 4th ed.'
    : src.startsWith('WSES') ? 'WSES 2023'
    : src.startsWith('ENLS') ? 'ENLS v4.0'
    : src.startsWith('Primary Trauma') ? 'PTC manual'
    : src.startsWith('Peshawar') ? 'Peshawar 2019'
    : src.startsWith('BOOTStraP') ? 'BOOTStraP'
    : src.startsWith('WFSA') ? 'WFSA'
    : src.startsWith('Greenberg') ? 'Greenberg'
    : src.startsWith('NICE') ? 'NICE NG232'
    : src.startsWith('Post-traumatic') ? 'Seizure CPG'
    : src.startsWith('Kyro spine') ? 'Kyro spine'
    : src;
