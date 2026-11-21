import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { C, F, shadow } from '../theme';
import { useNav } from '../nav';
import { Btn, Card, FadeIn, Label, Screen, Small, Tag, tap } from '../ui';
import { DISP_LABEL, evaluate } from '../logic';

export default function Guidance() {
  const nav = useNav();
  const { enc } = nav;
  const ev = evaluate(enc);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [nudge, setNudge] = useState(false);
  const shownAt = useRef(Date.now());

  useEffect(() => { shownAt.current = Date.now(); }, []);

  const mine = enc.selfAssessment ?? 'transfer';
  const aligned = mine === ev.rec;
  const reviewed = Object.values(open).filter(Boolean).length;

  const proceed = () => {
    const fast = Date.now() - shownAt.current < 8000 && reviewed < 2;
    if (fast && !nudge) { setNudge(true); return; }
    go();
  };
  const go = () => {
    setNudge(false);
    nav.push(ev.rec === 'specialist' ? 'defer' : 'monitor');
  };

  return (
    <View style={{ flex: 1 }}>
    <Screen
      title="Kyro's guidance"
      subtitle={ev.leaf}
      step={[5, 5]}
      footer={ev.rec === 'specialist'
        ? <Btn label="Hand off to a specialist" icon="phone-forwarded" variant="danger" onPress={proceed} />
        : <Btn label="Start 15-minute neuro checks" icon="activity" onPress={proceed} />}
    >
      {/* You vs Kyro */}
      <FadeIn>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: C.violetWash, borderRadius: 16, padding: 12 }}>
            <Label style={{ color: C.violet, fontSize: 10.5 }}>{enc.deteriorated ? 'Your earlier call' : 'Your call'}</Label>
            <Text style={{ fontFamily: F.semi, fontSize: 14, color: C.ink, marginTop: 4 }}>{DISP_LABEL[mine]}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: C.brandWash, borderRadius: 16, padding: 12 }}>
            <Label style={{ color: C.brandDeep, fontSize: 10.5 }}>Kyro</Label>
            <Text style={{ fontFamily: F.semi, fontSize: 14, color: C.ink, marginTop: 4 }}>{DISP_LABEL[ev.rec]}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', marginTop: -10 }}>
          <Tag label={aligned ? 'You agree' : 'You disagree · review the reasons below'} tone={aligned ? 'green' : 'amber'} icon={aligned ? 'check' : 'git-pull-request'} style={{ borderWidth: 2, borderColor: C.bg }} />
        </View>
      </FadeIn>

      {/* Hero */}
      <FadeIn delay={120}>
        <LinearGradient colors={ev.rec === 'specialist' ? ['#2A0F14', '#4A1820'] : ['#0A1626', '#13305A']} style={[{ borderRadius: 22, padding: 18, marginTop: 12 }, shadow]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(91,209,154,0.16)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#5BD19A' }} />
              <Text style={{ fontFamily: F.semi, fontSize: 11, color: '#7BE0B0' }}>Guideline leaf reached</Text>
            </View>
            <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.navyText, marginLeft: 'auto' }}>7 checks · 7 citations</Text>
          </View>
          <Text style={{ fontFamily: F.bold, fontSize: 20, lineHeight: 26, color: '#fff', marginTop: 14 }}>{ev.title}</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 13.5, lineHeight: 20, color: C.navyText, marginTop: 8 }}>{ev.summary}</Text>

          <Text style={{ fontFamily: F.semi, fontSize: 11, letterSpacing: 0.8, color: C.navyText, marginTop: 16, marginBottom: 8 }}>RISK OF NEEDING NEUROSURGERY</Text>
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {['Low', 'Moderate', 'High'].map((l, i) => (
              <View key={l} style={{ flex: 1 }}>
                <View style={{ height: 7, borderRadius: 4, backgroundColor: i < ev.risk ? ['#5BD19A', '#F2B544', '#FF6B5B'][i] : 'rgba(255,255,255,0.12)' }} />
                <Text style={{ fontFamily: F.medium, fontSize: 11, color: i === ev.risk - 1 ? '#fff' : 'rgba(201,216,234,0.55)', marginTop: 5 }}>{l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </FadeIn>

      {/* Why */}
      <FadeIn delay={220}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 10 }}>
          <Label style={{ flex: 1 }}>Why Kyro says this</Label>
          <Small>{reviewed}/{ev.path.length} opened</Small>
        </View>
        <Card style={{ padding: 0 }}>
          {ev.path.map((n, i) => {
            const o = !!open[n.id];
            return (
              <Pressable key={n.id} onPress={() => { tap(); setOpen((x) => ({ ...x, [n.id]: !x[n.id] })); }}>
                <View style={{ padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: n.hit ? C.redWash : C.greenWash, alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name={n.hit ? 'alert-circle' : 'check'} size={12} color={n.hit ? C.red : C.green} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: F.medium, fontSize: 13.5, color: C.ink }}>{n.q}</Text>
                      <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: n.hit ? C.red : C.green, marginTop: 1 }}>{n.a}</Text>
                    </View>
                    <Feather name={o ? 'chevron-up' : 'chevron-down'} size={16} color={C.faint} />
                  </View>
                  {o ? (
                    <FadeIn from={6}>
                      <View style={{ marginTop: 10, marginLeft: 32, padding: 12, borderRadius: 12, backgroundColor: C.bg, borderLeftWidth: 3, borderLeftColor: C.brand }}>
                        <Text style={{ fontFamily: F.semi, fontSize: 12, color: C.brandDeep }}>{n.cite.src} · {n.cite.loc}</Text>
                        <Text style={{ fontFamily: F.regular, fontSize: 12.5, lineHeight: 18, color: C.ink2, marginTop: 4 }}>{n.cite.quote}</Text>
                        <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.faint, marginTop: 6 }}>guideline summary · node {n.id}</Text>
                      </View>
                    </FadeIn>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </Card>
      </FadeIn>

      <FadeIn delay={320}>
        <Card style={{ marginTop: 14, flexDirection: 'row', gap: 12, backgroundColor: '#F7F8FA' }}>
          <Feather name="shield" size={18} color={C.ink2} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: C.ink }}>What Kyro will not decide</Text>
            <Small style={{ marginTop: 3, lineHeight: 18 }}>
              Whether to operate, or where. Those decisions can't be undone and need imaging or a specialist, so Kyro always hands them to a person.
            </Small>
          </View>
        </Card>
      </FadeIn>

    </Screen>
      {nudge ? <Nudge onReview={() => setNudge(false)} onGo={go} /> : null}
    </View>
  );
}

function Nudge({ onReview, onGo }: { onReview: () => void; onGo: () => void }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(10,22,38,0.45)', justifyContent: 'flex-start', paddingTop: 140, paddingHorizontal: 18 }}>
      <FadeIn>
        <View style={[{ backgroundColor: C.card, borderRadius: 22, padding: 20 }, shadow]}>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.amberWash, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="clock" size={22} color={C.amber} />
          </View>
          <Text style={{ fontFamily: F.bold, fontSize: 19, color: C.ink, marginTop: 14 }}>That was quick</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 21, color: C.ink2, marginTop: 6 }}>
            You're accepting Kyro's guidance a few seconds after it appeared, without opening the reasons. Kyro can be wrong. Take a moment to check the findings it relied on.
          </Text>
          <View style={{ gap: 10, marginTop: 18 }}>
            <Btn label="Review the reasons" icon="list" onPress={onReview} />
            <Btn label="I've checked, continue" variant="ghost" onPress={onGo} />
          </View>
          <Text style={{ fontFamily: F.regular, fontSize: 11.5, color: C.faint, marginTop: 12, textAlign: 'center' }}>Logged to the case record for quality review</Text>
        </View>
      </FadeIn>
    </View>
  );
}
