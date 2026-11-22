import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F } from '../theme';
import { useNav } from '../nav';
import { Btn, Card, FadeIn, Label, Screen, Small, Tag } from '../ui';
import { PATIENT } from '../demoCase';
import { DISP_LABEL } from '../logic';

export default function Summary() {
  const nav = useNav();
  const e = nav.enc;
  const events = [
    ['19:46', 'mic', 'History and exam captured by voice', '11 fields'],
    ['19:47', 'check-square', 'Critical fields read back and confirmed', '6/6'],
    ['19:48', 'lock', 'Guidance held until pupils and blood thinners recorded', '2 added'],
    ['19:48', 'user', `Clinician assessment: ${DISP_LABEL[e.selfAssessment ?? 'transfer']}`, 'before Kyro'],
    ['19:49', 'git-branch', 'Guideline tree → L-07 Observe and prepare transfer', '7 citations'],
    ['19:50', 'list', 'Management plan: TXA, BP, oxygen, glucose, neuro checks', '8 cited steps'],
    ['20:35', 'alert-triangle', 'Deterioration: GCS 14 → 11, right pupil change', 'alert'],
    ['20:36', 'git-branch', 'Tree re-run → L-12 Lateralizing signs without imaging', 'herniation'],
    ['20:37', 'list', 'Herniation protocol: mannitol, head up, SBP ≥ 110, airway plan', 'cited doses'],
    ['20:39', 'send', 'Handoff delivered when signal returned', 'auto-sent'],
    ['20:44', 'message-circle', 'Neurosurgeon accepted transfer', 'reply'],
  ];
  return (
    <Screen
      title="Case summary"
      subtitle={`${PATIENT.id} · ${PATIENT.label}`}
      footer={<Btn label="Back to home" icon="home" onPress={() => nav.reset('home')} />}
    >
      <FadeIn>
        <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.greenWash, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="truck" size={26} color={C.green} />
          </View>
          <Text style={{ fontFamily: F.bold, fontSize: 20, color: C.ink, marginTop: 12 }}>Transfer accepted</Text>
          <Small style={{ textAlign: 'center', marginTop: 4 }}>Patient leaving for the regional referral centre.{'\n'}Full record travels with him.</Small>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Tag label={e.synced ? 'Synced' : 'Queued'} tone={e.synced ? 'green' : 'amber'} icon={e.synced ? 'check' : 'clock'} />
            <Tag label="Encrypted on device" tone="gray" icon="lock" />
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={120}>
        <Label style={{ marginTop: 22, marginBottom: 10 }}>Audit trail</Label>
        <Card>
          {events.map(([t, i, s, tag], k) => (
            <View key={k} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center', width: 26 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: tag === 'alert' ? C.redWash : C.brandWash, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={i as any} size={12} color={tag === 'alert' ? C.red : C.brandDeep} />
                </View>
                {k < events.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: C.line, minHeight: 14 }} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 14 }}>
                <Text style={{ fontFamily: F.medium, fontSize: 13.5, color: C.ink }}>{s}</Text>
                <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.faint, marginTop: 2 }}>{t} · {tag}</Text>
              </View>
            </View>
          ))}
        </Card>
      </FadeIn>

      <FadeIn delay={200}>
        <Card style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
          <Feather name="database" size={18} color={C.violet} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: C.ink }}>Helps make Kyro better, safely</Text>
            <Small style={{ marginTop: 3, lineHeight: 18 }}>With consent, the de-identified outcome is used for quality review. Specialist corrections only reach Kyro through a versioned update that must pass accuracy benchmarks first.</Small>
          </View>
        </Card>
      </FadeIn>
    </Screen>
  );
}
