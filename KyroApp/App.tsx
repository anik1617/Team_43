/**
 * Kyro — the conversational, voice-or-tap clinical co-pilot.
 *
 * INTERACTIVE, multi-patient. Kyro walks the authored gather (src/fields.ts STEPS): for each step it
 * ASKS aloud and renders tappable option chips. The operator answers by TAP or by VOICE (whisper →
 * classifyUtterance → field). Every spoken answer is shown as a UserMsg AND read back before it enters
 * the tree. When the gather is complete, buildSeed(answers) → runDecision(seed) drives the REAL
 * deterministic engine — DIFFERENT answers reach DIFFERENT leaves (reassuring → OBSERVE, herniation →
 * GUIDE). The model NEVER decides: the tree decides; the model only does I/O (classify, optional reword).
 *
 * Design language preserved from the Claude UI handoff: KyroMsg/UserMsg bubbles, card styles, evidence
 * rail, voice dock, PulseRing/VoiceBars, theme C/F.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, PermissionsAndroid, Platform, Pressable, ScrollView, StatusBar, Text, View,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { runDecision, rewordRecommendation, initModel, modelStatus, type KyroDecision } from './src/engine';
import { STEPS, buildSeed, type GatherStep, type Opt } from './src/fields';
import { speak, initMic, listen } from './src/voice';
import { classifyUtterance } from './src/qwenL3';
import {
  escalate, openExpertCall, escalationStatus, onEscalationStatus, type EscalationStatus,
} from './src/escalation';
import { C, F } from './src/theme';

// Fields the model can classify from speech (categorical). Everything else (GCS components, SBP) is
// numeric and falls back to tap — we never let the model invent a number.
const VOICE_FIELDS = new Set([
  'mechanism_class', 'pupil_react_l', 'pupil_react_r', 'lucid_interval',
  'anticoag_antiplatelet', 'focal_weakness_side', 'posturing',
]);
const stepHasVoiceField = (s: GatherStep) => s.controls.some((c) => VOICE_FIELDS.has(c.field));

// Friendly read-back for a classified value (what Kyro confirms aloud before it enters the tree).
const readbackLabel = (step: GatherStep, field: string, value: string | number): string => {
  for (const c of step.controls) {
    if (c.field !== field) continue;
    const opt = c.options.find((o) => o.value === value);
    if (opt) return `${c.label ? c.label + ' ' : ''}${opt.label}`.trim();
  }
  return String(value);
};

type Msg = { who: 'kyro' | 'user'; text: string };
type Phase = 'intro' | 'gather' | 'result';

// ── animated voice bars ────────────────────────────────────────────────────────
function VoiceBars({ heights, color = '#fff', w = 3, animate = false }: { heights: number[]; color?: string; w?: number; animate?: boolean }) {
  const a = useRef(heights.map(() => new Animated.Value(0.4))).current;
  useEffect(() => {
    if (!animate) return;
    const loops = a.map((v, i) =>
      Animated.loop(Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 450, delay: i * 130, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.3, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [a, animate]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {heights.map((h, i) => (
        <Animated.View key={i} style={{ width: w, height: h, borderRadius: 2, backgroundColor: color, transform: animate ? [{ scaleY: a[i] }] : [{ scaleY: h > 16 ? 1 : 0.6 }] }} />
      ))}
    </View>
  );
}

function PulseRing({ children, on }: { children: React.ReactNode; on: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return;
    const l = Animated.loop(Animated.timing(a, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    l.start();
    return () => l.stop();
  }, [a, on]);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {on ? <Animated.View style={{ position: 'absolute', width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: C.brand, opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }] }} /> : null}
      {children}
    </View>
  );
}

// ── reusable bits ───────────────────────────────────────────────────────────────
const T = (s: TextStyle) => s;
const KyroAvatar = () => (
  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.brandWash, alignItems: 'center', justifyContent: 'center' }}>
    <VoiceBars heights={[8, 13, 6]} color={C.brand} w={2.5} />
  </View>
);
function KyroMsg({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
      <KyroAvatar />
      <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardLine, borderTopLeftRadius: 4, borderTopRightRadius: 14, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, paddingVertical: 12, paddingHorizontal: 14, maxWidth: '86%' }}>
        <Text style={T({ fontFamily: F.sans, fontSize: 14.5, lineHeight: 22, color: C.ink2 })}>{children}</Text>
      </View>
    </View>
  );
}
function UserMsg({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
      <View style={{ backgroundColor: C.brand, borderTopLeftRadius: 14, borderTopRightRadius: 4, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, paddingVertical: 10, paddingHorizontal: 14, maxWidth: '82%' }}>
        <Text style={T({ fontFamily: F.sans, fontSize: 14.5, lineHeight: 20, color: '#fff' })}>{children}</Text>
      </View>
    </View>
  );
}
const SectionLabel = ({ children, style }: { children: React.ReactNode; style?: TextStyle }) => (
  <Text style={[T({ fontFamily: F.sans, fontWeight: '700', fontSize: 12, letterSpacing: 0.6, color: C.faint }), style]}>{children}</Text>
);
const Btn = ({ label, onPress, variant = 'primary', disabled, style }: { label: string; onPress: () => void; variant?: 'primary' | 'ghost'; disabled?: boolean; style?: ViewStyle }) => (
  <Pressable onPress={onPress} disabled={disabled} style={[{ height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1, backgroundColor: variant === 'primary' ? C.brand : C.card, borderWidth: variant === 'ghost' ? 1 : 0, borderColor: '#D7DDE1' }, style]}>
    <Text style={T({ fontFamily: F.sans, fontWeight: '600', fontSize: 14.5, color: variant === 'primary' ? '#fff' : '#33404A' })}>{label}</Text>
  </Pressable>
);

// Option chip — tappable; highlights when its value is the current answer for the field.
function Chip({ opt, selected, onPress }: { opt: Opt; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: selected ? C.brand : C.card, borderWidth: 1, borderColor: selected ? C.brand : C.hair2, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8 }}>
      <Text style={T({ fontFamily: F.sans, fontWeight: '600', fontSize: 14, color: selected ? '#fff' : C.ink })}>{opt.label}</Text>
      {opt.sub ? <Text style={T({ fontFamily: F.sans, fontSize: 11, color: selected ? '#DCEBFF' : C.faint })}>· {opt.sub}</Text> : null}
    </Pressable>
  );
}

// Badge colour mapping (the authoritative gate verdict → triage colour + word).
const BADGE = {
  GREEN: { dot: C.green, wash: '#E6F6EF', ink: '#177A4F', word: 'Protocol' },
  YELLOW: { dot: C.amberIcon, wash: C.amberBg, ink: C.amberHead, word: 'Principles' },
  RED: { dot: '#C2453B', wash: '#FBE9E7', ink: '#A4382F', word: 'Stop' },
} as const;

const ESC_TEXT: Record<EscalationStatus, string> = {
  idle: 'Ready to hand off', queued: 'Handoff brief · queued', sending: 'Sending brief…',
  sent: 'Brief delivered · expert briefed', failed: 'Send failed — will retry on reconnect',
};

export default function App() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [messages, setMessages] = useState<Msg[]>([]);
  const [online, setOnline] = useState(false);
  const [r, setR] = useState<KyroDecision | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [listening, setListening] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micAllowed, setMicAllowed] = useState(Platform.OS !== 'android'); // non-android: no runtime grant
  const [esc, setEsc] = useState<EscalationStatus>(escalationStatus());
  const scrollRef = useRef<ScrollView>(null);

  const step = STEPS[stepIdx];
  const pushMsg = (m: Msg) => setMessages((prev) => [...prev, m]);

  // boot: load mic + model (both optional / non-fatal), subscribe to escalation status.
  useEffect(() => {
    initMic().then((ok) => setMicReady(ok));
    initModel().catch(() => {});
    const unsub = onEscalationStatus(setEsc);
    return unsub;
  }, []);

  // keep the chat pinned to the latest message
  useEffect(() => { const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50); return () => clearTimeout(id); }, [messages, phase, stepIdx]);

  // Kyro asks the current step's question aloud + drops it into the chat when we enter the step.
  // Guarded so a re-render / StrictMode double-invoke never repeats the same prompt bubble.
  useEffect(() => {
    if (phase !== 'gather' || !step) return;
    setMessages((prev) => (prev[prev.length - 1]?.text === step.prompt ? prev : [...prev, { who: 'kyro', text: step.prompt }]));
    speak(step.prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIdx]);

  const startGather = () => {
    const intro = "New encounter. I'll gather the evidence with you — answer by voice or tap. Everything runs on this phone.";
    speak(intro);
    setMessages([{ who: 'kyro', text: intro }]);
    setPhase('gather');
    setStepIdx(0);
  };

  const newPatient = () => {
    setAnswers({}); setMessages([]); setR(null); setStepIdx(0); setListening(false); setDeciding(false);
    setPhase('intro');
  };

  // Is the current step fully answered (every control has a value)?
  const stepComplete = (s: GatherStep, a: Record<string, string | number>) =>
    s.controls.every((c) => a[c.field] !== undefined);

  const setAnswer = (field: string, value: string | number) =>
    setAnswers((prev) => ({ ...prev, [field]: value }));

  // advance to the next step, or run the engine when the gather is done
  const advance = (a: Record<string, string | number>) => {
    if (stepIdx < STEPS.length - 1) { setStepIdx((i) => i + 1); return; }
    runEngine(a);
  };

  // TAP answer: fill the field; if that completes the step, advance after a beat.
  const onTapOption = (field: string, value: string | number) => {
    const a = { ...answers, [field]: value };
    setAnswer(field, value);
    if (stepComplete(step, a)) setTimeout(() => advance(a), 280);
  };

  // RECORD_AUDIO runtime grant (Android). Returns whether the mic may be used.
  const ensureMicPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    if (micAllowed) return true;
    try {
      const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
        title: 'Microphone', message: 'Kyro needs the microphone to take spoken answers hands-free.',
        buttonPositive: 'Allow', buttonNegative: 'Use taps',
      });
      const granted = res === PermissionsAndroid.RESULTS.GRANTED;
      setMicAllowed(granted);
      return granted;
    } catch { setMicAllowed(false); return false; }
  };

  // VOICE answer: whisper transcript → classifyUtterance per categorical field in the step.
  const onMic = async () => {
    if (phase !== 'gather' || listening || !micReady) return;
    if (!(await ensureMicPermission())) return;
    setListening(true);
    const transcript = (await listen(6000)).trim();
    setListening(false);
    if (!transcript) { pushMsg({ who: 'kyro', text: "I didn't catch that — tap your answer or try the mic again." }); return; }
    pushMsg({ who: 'user', text: `"${transcript}"` });

    // classify every categorical field this step is asking for
    const filled: Record<string, string | number> = {};
    for (const c of step.controls) {
      if (!VOICE_FIELDS.has(c.field)) continue;
      const value = await classifyUtterance(c.field, transcript);
      if (value !== null) filled[c.field] = value;
    }

    if (Object.keys(filled).length === 0) {
      pushMsg({ who: 'kyro', text: 'I heard you, but couldn’t map that to a value — please tap the option.' });
      return;
    }
    // read-back (safety): confirm what entered the tree, THEN fill it
    const readback = Object.entries(filled).map(([f, v]) => readbackLabel(step, f, v)).join(', ');
    pushMsg({ who: 'kyro', text: `I heard ${readback} → recorded. Tap any chip to correct it.` });
    speak(`I heard ${readback}.`);

    const a = { ...answers, ...filled };
    setAnswers(a);
    if (stepComplete(step, a)) setTimeout(() => advance(a), 350);
  };

  // RUN THE REAL ENGINE on the gathered answers. The tree decides; we render its verdict.
  const runEngine = async (a: Record<string, string | number>) => {
    setDeciding(true);
    setPhase('result');
    try {
      const decision = await runDecision(buildSeed(a));
      setR(decision);
      // speak + log the real recommendation
      pushMsg({ who: 'kyro', text: decision.recommendation });
      speak(decision.recommendation);
      // optional polish: reword in the background if the model is ready (never changes the decision)
      if (modelStatus() === 'ready') {
        rewordRecommendation(decision.leafId, decision.citation)
          .then((worded) => { if (worded) setR((cur) => (cur ? { ...cur, recommendation: worded } : cur)); })
          .catch(() => {});
      }
    } catch {
      pushMsg({ who: 'kyro', text: 'The engine could not complete on this device. Check the bundle + model files.' });
    } finally {
      setDeciding(false);
    }
  };

  // escalation actions (Agent C module)
  const onSendExpert = () => { if (r) escalate(r.handoff).catch(() => {}); };
  const onOpenCall = () => { openExpertCall().catch(() => {}); };

  const answeredCount = Object.keys(answers).length;
  const showEvidence = phase !== 'intro' && answeredCount > 0;
  const badge = r ? BADGE[r.badge] : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <View style={{ width: 27, height: 27, borderRadius: 8, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: '#fff', transform: [{ rotate: '45deg' }] }} />
          </View>
          <Text style={T({ fontFamily: F.brand, fontSize: 20, letterSpacing: 0.5, color: C.ink })}>Kyro</Text>
        </View>
        <Pressable onPress={() => setOnline((o) => !o)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: online ? C.brandWash : C.offBg }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: online ? C.brand : C.offDot }} />
          <Text style={T({ fontFamily: F.sans, fontWeight: '600', fontSize: 11, color: online ? C.brandInk : C.offText })}>{online ? 'Online · expert link' : 'Offline · on-device'}</Text>
        </Pressable>
      </View>

      {/* context strip */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel style={{ color: C.faint2, letterSpacing: 1.3, fontSize: 11 }}>ACUTE TBI · EDH PATHWAY</SectionLabel>
        {phase === 'gather' ? <SectionLabel style={{ color: C.faint2, fontSize: 11 }}>{`STEP ${stepIdx + 1} / ${STEPS.length}`}</SectionLabel> : null}
      </View>

      {/* content */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {phase === 'intro' && (
          <>
            <KyroMsg>New encounter. I'll guide structured evidence-gathering — by voice or tap, hands-free. Everything runs on this phone; nothing leaves it unless you choose to connect.</KyroMsg>
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardLine, borderRadius: 14, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <SectionLabel>KNOWLEDGE BUNDLE</SectionLabel>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.brand }} />
                  <Text style={T({ fontFamily: F.sans, fontWeight: '600', fontSize: 12, color: C.brandInk })}>Loaded · ready</Text>
                </View>
              </View>
              <Text style={T({ fontFamily: F.mono, fontSize: 12, lineHeight: 20, color: C.offText })}>edh-core · signed{'\n'}WFNS Peshawar · BTF 4th ed · WHO</Text>
              <View style={{ height: 1, backgroundColor: C.hair, marginVertical: 12 }} />
              <Text style={T({ fontFamily: F.sans, fontSize: 13, lineHeight: 19, color: C.muted })}>
                Full acute-TBI guidance with <Text style={{ color: C.ink, fontWeight: '700' }}>zero connectivity</Text>. Voice input is {micReady ? 'ready' : 'tap-only on this device'}. Connect only to reach a human expert.
              </Text>
            </View>
          </>
        )}

        {phase === 'gather' && (
          <>
            {messages.map((m, i) => (m.who === 'kyro' ? <KyroMsg key={i}>{m.text}</KyroMsg> : <UserMsg key={i}>{m.text}</UserMsg>))}

            {/* the current step's tappable controls */}
            {step && (
              <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardLine, borderRadius: 14, padding: 14, marginTop: 2 }}>
                {step.hint ? <SectionLabel style={{ fontSize: 11, marginBottom: 10 }}>{step.hint.toUpperCase()}</SectionLabel> : null}
                {step.controls.map((c) => (
                  <View key={c.field} style={{ marginBottom: 6 }}>
                    {c.label ? <Text style={T({ fontFamily: F.sans, fontWeight: '600', fontSize: 12.5, color: C.muted, marginBottom: 7 })}>{c.label}</Text> : null}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {c.options.map((o, oi) => (
                        <Chip key={oi} opt={o} selected={answers[c.field] === o.value} onPress={() => onTapOption(c.field, o.value)} />
                      ))}
                    </View>
                  </View>
                ))}
                <Text style={T({ fontFamily: F.sans, fontSize: 11, color: C.faint2, fontStyle: 'italic', marginTop: 4 })}>
                  {listening ? 'listening… speak now'
                    : stepHasVoiceField(step) && micReady ? 'tap a chip, or use the mic to speak this answer'
                    : 'tap an option to answer'}
                </Text>
              </View>
            )}
          </>
        )}

        {phase === 'result' && (
          <>
            {messages.map((m, i) => (m.who === 'kyro' ? <KyroMsg key={i}>{m.text}</KyroMsg> : <UserMsg key={i}>{m.text}</UserMsg>))}

            {deciding && !r ? (
              <KyroMsg>Walking the guideline tree on the evidence you gathered…</KyroMsg>
            ) : null}

            {r && badge && (
              <>
                {/* badge */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: badge.wash, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 13, marginBottom: 12 }}>
                  <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: badge.dot }} />
                  <Text style={T({ fontFamily: F.sans, fontWeight: '700', fontSize: 13, color: badge.ink })}>{badge.word}</Text>
                  <Text style={T({ fontFamily: F.sans, fontSize: 12.5, color: badge.ink, flex: 1 })} numberOfLines={2}>· {r.label}</Text>
                </View>

                {/* navy recommendation card */}
                <View style={{ backgroundColor: C.navy, borderRadius: 16, padding: 17, marginBottom: 13, boxShadow: '0 12px 26px rgba(10,22,38,0.30)' }}>
                  <Text style={T({ fontFamily: F.sans, fontWeight: '700', fontSize: 11, letterSpacing: 1.3, color: C.sky, marginBottom: 9 })}>RECOMMENDATION · CITED</Text>
                  <Text style={T({ fontFamily: F.sans, fontSize: 16.5, fontWeight: '600', lineHeight: 24, color: '#fff' })}>{r.recommendation}</Text>
                  {r.citation ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                      <View style={{ backgroundColor: C.navyChip, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 }}>
                        <Text style={T({ fontFamily: F.mono, fontSize: 11, color: C.navyChipText })}>{r.citation.split('(')[0].split('[')[0].trim()}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* amber boundary / abstain card — only when the tree explicitly abstains on a step */}
                {r.drillAbstain ? (
                  <View style={{ backgroundColor: C.amberBg, borderWidth: 1, borderColor: C.amberLine, borderRadius: 14, padding: 14, marginBottom: 13 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                      <View style={{ width: 19, height: 19, borderRadius: 10, backgroundColor: C.amberIcon, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={T({ fontFamily: F.sans, fontWeight: '700', fontSize: 13, color: '#fff' })}>!</Text>
                      </View>
                      <SectionLabel style={{ color: C.amberHead, letterSpacing: 0.7 }}>BOUNDARY REACHED</SectionLabel>
                    </View>
                    <Text style={T({ fontFamily: F.sans, fontSize: 14.5, lineHeight: 22, color: C.amberText })}>{r.drillAbstain}</Text>
                  </View>
                ) : null}

                {/* handoff SBAR */}
                <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: online ? '#BFD9FF' : C.cardLine, borderRadius: 14, padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: online ? C.brand : C.offDot }} />
                      <Text style={T({ fontFamily: F.sans, fontWeight: '600', fontSize: 13, color: online ? C.brandInk : C.offText })}>{ESC_TEXT[esc]}</Text>
                    </View>
                    <Text style={T({ fontFamily: F.mono, fontSize: 11, color: online ? C.brand : C.faint2 })}>{online ? '2G · ready' : 'awaiting signal'}</Text>
                  </View>
                  <View style={{ backgroundColor: '#F5F8F8', borderWidth: 1, borderColor: C.hair2, borderRadius: 10, padding: 12, marginTop: 4 }}>
                    <Text style={T({ fontFamily: F.mono, fontSize: 11.5, lineHeight: 18, color: '#3A444C' })}>
                      <Text style={{ color: C.brand, fontFamily: F.monoSemi }}>HANDOFF · SBAR · auto-generated{'\n'}</Text>
                      {r.handoff.sbar.situation}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* evidence rail — live, built from the real captured answers */}
      {showEvidence && (
        <View style={{ paddingVertical: 9, paddingLeft: 20, borderTopWidth: 1, borderTopColor: C.hair, backgroundColor: '#FBFCFD' }}>
          <SectionLabel style={{ fontSize: 10, letterSpacing: 1.1, color: C.faint2, marginBottom: 8 }}>ENCOUNTER STATE · CAPTURED</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingRight: 20 }}>
            {Object.entries(answers).map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.hair2, borderRadius: 9, paddingVertical: 5, paddingHorizontal: 9 }}>
                <Text style={T({ fontFamily: F.sans, fontSize: 11, color: C.faint })}>{k.replace(/_/g, ' ')}</Text>
                <Text style={T({ fontFamily: F.monoSemi, fontSize: 12, color: C.ink })}>{String(v)}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* voice dock */}
      <View style={{ paddingVertical: 13, paddingHorizontal: 20, paddingBottom: 22, borderTopWidth: 1, borderTopColor: C.hair, backgroundColor: '#fff' }}>
        {phase === 'intro' && (
          <Pressable onPress={startGather} style={{ alignItems: 'center', gap: 9 }}>
            <PulseRing on>
              <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
                <VoiceBars heights={[10, 18, 24, 14, 8]} animate />
              </View>
            </PulseRing>
            <Text style={T({ fontFamily: F.sans, fontWeight: '500', fontSize: 13, color: C.brand })}>Tap to begin · voice-guided</Text>
          </Pressable>
        )}

        {phase === 'gather' && step && (
          stepHasVoiceField(step) && micReady ? (
            <Pressable onPress={onMic} disabled={listening} style={{ alignItems: 'center', gap: 9 }}>
              <PulseRing on={listening}>
                <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: listening ? C.brand : C.brand, alignItems: 'center', justifyContent: 'center' }}>
                  <VoiceBars heights={[10, 18, 24, 14, 8]} animate={listening} />
                </View>
              </PulseRing>
              <Text style={T({ fontFamily: F.sans, fontWeight: '500', fontSize: 13, color: listening ? C.brand : C.muted })}>{listening ? 'Listening…' : 'Tap & speak — or tap a chip above'}</Text>
            </Pressable>
          ) : (
            <Text style={T({ fontFamily: F.sans, fontSize: 13, color: C.muted, textAlign: 'center' })}>
              {micReady ? 'Tap an option above to answer' : 'Voice unavailable — tap an option above'}
            </Text>
          )
        )}

        {phase === 'result' && (
          deciding && !r
            ? <Btn label="Deciding…" onPress={() => {}} disabled />
            : <>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                  {online
                    ? <Btn label="Open secure call" onPress={onOpenCall} style={{ flex: 1 }} />
                    : <Btn label="Queue handoff" onPress={onSendExpert} style={{ flex: 1 }} />}
                  <Btn label={online ? 'Send to expert' : 'Send brief'} variant="ghost" onPress={onSendExpert} style={{ width: 140 }} />
                </View>
                <Btn label="New patient" variant="ghost" onPress={newPatient} />
              </>
        )}
      </View>
    </View>
  );
}
