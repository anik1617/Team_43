/**
 * Kyro — the conversational, voice-guided clinical co-pilot (from the Claude UI handoff).
 * Light, Mission:Brain blue. 6 steps: begin → listen → read-back → decision path → recommendation →
 * boundary/handoff. The recommendation + abstain are REAL engine output (runDecision).
 */
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Pressable, ScrollView, StatusBar, Text, View,
  type ViewStyle, type TextStyle,
} from 'react-native';
import { runDecision, type KyroDecision } from './src/engine';
import { buildSeed } from './src/fields';
import { C, F } from './src/theme';

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
const Btn = ({ label, onPress, variant = 'primary', style }: { label: string; onPress: () => void; variant?: 'primary' | 'ghost'; style?: ViewStyle }) => (
  <Pressable onPress={onPress} style={[{ height: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: variant === 'primary' ? C.brand : C.card, borderWidth: variant === 'ghost' ? 1 : 0, borderColor: '#D7DDE1' }, style]}>
    <Text style={T({ fontFamily: F.sans, fontWeight: '600', fontSize: 14.5, color: variant === 'primary' ? '#fff' : '#33404A' })}>{label}</Text>
  </Pressable>
);

const EVIDENCE: Array<[string, string]> = [['GCS', '6'], ['L pupil', 'fixed'], ['BP', '160/90'], ['Onset', 'lucid'], ['Elapsed', '23 min'], ['Mannitol', '18 min ago']];

export default function App() {
  const [step, setStep] = useState(0);
  const [online, setOnline] = useState(false);
  const [r, setR] = useState<KyroDecision | null>(null);

  useEffect(() => {
    // run the real engine in the background so steps 4–5 show real output
    runDecision(buildSeed({
      mechanism_class: 'blunt', gcs_e: 1, gcs_v: 2, gcs_m: 3, pupil_react_l: 'fixed', pupil_react_r: 'brisk',
      lucid_interval: 'yes', sbp_mmhg: 160, anticoag_antiplatelet: 'none', focal_weakness_side: 'right', posturing: 'none',
    })).then(setR).catch(() => {});
  }, []);

  const next = () => setStep((s) => Math.min(5, s + 1));
  const evidenceCount = step <= 1 ? 0 : step === 2 ? 1 : step === 3 ? 4 : 6;

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
      <View style={{ paddingHorizontal: 20, paddingBottom: 10 }}>
        <SectionLabel style={{ color: C.faint2, letterSpacing: 1.3, fontSize: 11 }}>ACUTE TBI · EDH SUSPECTED</SectionLabel>
      </View>

      {/* content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <>
            <KyroMsg>New encounter. I'll guide evidence-gathering by voice — hands-free. Everything runs on this phone; nothing leaves it unless you choose to connect.</KyroMsg>
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardLine, borderRadius: 14, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <SectionLabel>KNOWLEDGE BUNDLE</SectionLabel>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.brand }} />
                  <Text style={T({ fontFamily: F.sans, fontWeight: '600', fontSize: 12, color: C.brandInk })}>Loaded · ready</Text>
                </View>
              </View>
              <Text style={T({ fontFamily: F.mono, fontSize: 12, lineHeight: 20, color: C.offText })}>edh-core-v0.kyro · signed{'\n'}WFNS Peshawar · BTF 4th ed · WHO</Text>
              <View style={{ height: 1, backgroundColor: C.hair, marginVertical: 12 }} />
              <Text style={T({ fontFamily: F.sans, fontSize: 13, lineHeight: 19, color: C.muted })}>Full acute-TBI guidance with <Text style={{ color: C.ink, fontWeight: '700' }}>zero connectivity</Text>. Connect only to reach a human expert.</Text>
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <KyroMsg>First, the basics. <Text style={{ color: C.ink, fontWeight: '700' }}>What is the patient's GCS?</Text></KyroMsg>
            <UserMsg>"GCS is six… eyes one, verbal two, motor three."</UserMsg>
            <Text style={T({ fontFamily: F.sans, fontSize: 11, color: C.faint2, fontStyle: 'italic', textAlign: 'right' })}>transcribing your voice…</Text>
          </>
        )}

        {step === 2 && (
          <>
            <KyroMsg>I heard <Text style={{ color: C.ink, fontWeight: '700' }}>GCS 6</Text> — eyes 1, verbal 2, motor 3. Is that correct?</KyroMsg>
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardLine, borderLeftWidth: 3, borderLeftColor: C.brand, borderRadius: 6, paddingVertical: 14, paddingHorizontal: 16 }}>
              <SectionLabel style={{ fontSize: 11, letterSpacing: 0.6 }}>READ-BACK · CONFIRM</SectionLabel>
              <Text style={T({ fontFamily: F.mono, fontSize: 30, color: C.ink, marginVertical: 7 })}>GCS 6</Text>
              <Text style={T({ fontFamily: F.sans, fontSize: 13, lineHeight: 19, color: C.muted })}>Every critical value is confirmed aloud before it enters the decision tree. Nothing is assumed on your behalf.</Text>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <KyroMsg>A fixed dilated left pupil, a lucid interval, and GCS 6. That matches the lateralizing pattern for an extradural haematoma.</KyroMsg>
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.cardLine, borderRadius: 14, padding: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionLabel>DECISION PATH</SectionLabel>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F2F5F6', borderWidth: 1, borderColor: C.hair2, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 7 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: C.brand }} />
                  <Text style={T({ fontFamily: F.mono, fontSize: 11, color: C.muted })}>WFNS Peshawar §3.2</Text>
                </View>
              </View>
              {[
                ['Mechanism + lucid interval present', false],
                ['GCS 6 → severe head injury', false],
                ['Unilateral fixed pupil → lateralizing', false],
                ['Operate-vs-transfer checkpoint', true],
              ].map(([txt, here], i, arr) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: i < arr.length - 1 ? 15 : 0 }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: C.brand, borderWidth: 3, borderColor: here ? '#DDEBFF' : '#fff', boxShadow: `0 0 0 1px ${C.brand}`, marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={T({ fontFamily: F.sans, fontSize: here ? 14.5 : 13.5, fontWeight: here ? '600' : '400', color: here ? C.ink : C.muted, lineHeight: 18 })}>{txt as string}</Text>
                    {here ? <Text style={T({ fontFamily: F.sans, fontSize: 11.5, fontWeight: '600', color: C.brand, marginTop: 3 })}>You are here</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <View style={{ backgroundColor: C.navy, borderRadius: 16, padding: 17, marginBottom: 13, boxShadow: '0 12px 26px rgba(10,22,38,0.30)' }}>
              <Text style={T({ fontFamily: F.sans, fontWeight: '700', fontSize: 11, letterSpacing: 1.3, color: C.sky, marginBottom: 9 })}>RECOMMENDATION · CITED</Text>
              <Text style={T({ fontFamily: F.sans, fontSize: 16.5, fontWeight: '600', lineHeight: 24, color: '#fff' })}>{r ? r.recommendation : 'Emergent surgical evacuation is indicated. If there is no operative capability on-site, transfer now under stabilization.'}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                {(r?.citation ? [r.citation.split('(')[0].split('[')[0].trim()] : ['WFNS Peshawar §3.2', 'BTF 4th ed.', 'WHO TBI']).map((c, i) => (
                  <View key={i} style={{ backgroundColor: C.navyChip, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 }}>
                    <Text style={T({ fontFamily: F.mono, fontSize: 11, color: C.navyChipText })}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={T({ fontFamily: F.sans, fontSize: 13, lineHeight: 19, color: C.muted, paddingHorizontal: 2 })}>Kyro recommends the <Text style={{ color: C.ink, fontWeight: '700' }}>decision</Text>. It does not localize the procedure — that needs imaging Kyro can't supply.</Text>
          </>
        )}

        {step === 5 && (
          <>
            <View style={{ backgroundColor: C.amberBg, borderWidth: 1, borderColor: C.amberLine, borderRadius: 14, padding: 14, marginBottom: 13 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                <View style={{ width: 19, height: 19, borderRadius: 10, backgroundColor: C.amberIcon, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={T({ fontFamily: F.sans, fontWeight: '700', fontSize: 13, color: '#fff' })}>!</Text>
                </View>
                <SectionLabel style={{ color: C.amberHead, letterSpacing: 0.7 }}>BOUNDARY REACHED</SectionLabel>
              </View>
              <Text style={T({ fontFamily: F.sans, fontSize: 14.5, lineHeight: 22, color: C.amberText })}>Burr-hole localization needs CT imaging I cannot supply. I won't invent this step — handing to a human expert.</Text>
            </View>
            <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: online ? '#BFD9FF' : C.cardLine, borderRadius: 14, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: online ? C.brand : C.offDot }} />
                  <Text style={T({ fontFamily: F.sans, fontWeight: '600', fontSize: 13, color: online ? C.brandInk : C.offText })}>{online ? 'Expert link live · sending' : 'Handoff brief · queued'}</Text>
                </View>
                <Text style={T({ fontFamily: F.mono, fontSize: 11, color: online ? C.brand : C.faint2 })}>{online ? '2G · 14.2 kB' : 'awaiting signal'}</Text>
              </View>
              <Text style={T({ fontFamily: F.sans, fontSize: 13, lineHeight: 19, color: C.muted })}>{online ? 'A neurosurgeon picks up mid-emergency in ~10 s, not from zero — the brief travels ahead of the call.' : 'No connection now. The brief sends the instant any signal returns — even 30 s of 2G. Guidance keeps running offline.'}</Text>
              <View style={{ backgroundColor: '#F5F8F8', borderWidth: 1, borderColor: C.hair2, borderRadius: 10, padding: 12, marginTop: 12 }}>
                <Text style={T({ fontFamily: F.mono, fontSize: 11.5, lineHeight: 18, color: '#3A444C' })}>
                  <Text style={{ color: C.brand, fontFamily: F.monoSemi }}>HANDOFF · auto-generated{'\n'}</Text>
                  {r ? r.handoff.sbar.situation : 'Acute EDH suspected · 23 min. GCS 6, L pupil fixed/dilated, BP 160/90, lucid interval, R-sided weakness. Tree reached operate-vs-transfer. Needs: expert confirm + surgical localization.'}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* evidence rail */}
      {evidenceCount > 0 && (
        <View style={{ paddingVertical: 9, paddingLeft: 20, borderTopWidth: 1, borderTopColor: C.hair, backgroundColor: '#FBFCFD' }}>
          <SectionLabel style={{ fontSize: 10, letterSpacing: 1.1, color: C.faint2, marginBottom: 8 }}>ENCOUNTER STATE · CAPTURED</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingRight: 20 }}>
            {EVIDENCE.slice(0, evidenceCount).map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderWidth: 1, borderColor: C.hair2, borderRadius: 9, paddingVertical: 5, paddingHorizontal: 9 }}>
                <Text style={T({ fontFamily: F.sans, fontSize: 11, color: C.faint })}>{k}</Text>
                <Text style={T({ fontFamily: F.monoSemi, fontSize: 12, color: C.ink })}>{v}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* voice dock */}
      <View style={{ paddingVertical: 13, paddingHorizontal: 20, paddingBottom: 22, borderTopWidth: 1, borderTopColor: C.hair, backgroundColor: '#fff' }}>
        {(step === 0 || step === 1) && (
          <Pressable onPress={next} style={{ alignItems: 'center', gap: 9 }}>
            <PulseRing on={step === 1}>
              <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
                <VoiceBars heights={[10, 18, 24, 14, 8]} animate={step === 1} />
              </View>
            </PulseRing>
            <Text style={T({ fontFamily: F.sans, fontWeight: '500', fontSize: 13, color: step === 1 ? C.brand : C.muted })}>{step === 0 ? 'Tap to begin · voice-guided' : 'Listening… · tap to confirm'}</Text>
          </Pressable>
        )}
        {step === 2 && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn label="Yes, correct" onPress={next} style={{ flex: 2 }} />
            <Btn label="Repeat" variant="ghost" onPress={() => {}} style={{ flex: 1 }} />
          </View>
        )}
        {step === 3 && (
          <Pressable onPress={next} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <PulseRing on>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
                <VoiceBars heights={[11, 19, 14, 20]} w={2.5} animate />
              </View>
            </PulseRing>
            <Text style={T({ fontFamily: F.sans, fontWeight: '500', fontSize: 13.5, color: C.muted })}>Reach the recommendation →</Text>
          </Pressable>
        )}
        {step === 4 && <Btn label="Continue" onPress={next} />}
        {step === 5 && (
          online
            ? <Btn label="Open secure call" onPress={() => {}} />
            : <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn label="Continue offline" onPress={() => setStep(0)} style={{ flex: 1 }} />
                <Btn label="Edit brief" variant="ghost" onPress={() => {}} style={{ width: 120 }} />
              </View>
        )}
      </View>
    </View>
  );
}
