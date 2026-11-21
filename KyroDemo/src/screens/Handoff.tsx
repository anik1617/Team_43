import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { C, F, shadow } from '../theme';
import { useNav } from '../nav';
import { Btn, Card, FadeIn, Label, OfflinePill, Screen, Small, Spinner, Tag } from '../ui';
import { PATIENT, SPECIALIST } from '../demoCase';
import { DISP_LABEL } from '../logic';

const STAGES = [
  { k: 'queued', t: 'Brief saved and queued', s: 'No signal. Kyro will retry automatically.', i: 'archive' },
  { k: 'signal', t: 'Signal found · 1 bar', s: 'Sending a 4 KB compressed packet', i: 'wifi' },
  { k: 'sent', t: 'Delivered to on-call neurosurgeon', s: SPECIALIST.site, i: 'check-circle' },
  { k: 'read', t: 'Opened by specialist', s: 'Reviewing the brief and GCS trend', i: 'eye' },
  { k: 'reply', t: 'Specialist replied', s: '', i: 'message-circle' },
] as const;

export default function Handoff() {
  const nav = useNav();
  const { enc } = nav;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!enc.handoffAt) nav.setEnc({ handoffAt: Date.now() }); }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const elapsed = enc.handoffAt ? now - enc.handoffAt : 0;
  const AT = [0, 3200, 5000, 6800, 9200];
  const stage = AT.filter((a) => elapsed >= a).length - 1;
  const prev = useRef(stage);
  useEffect(() => {
    if (stage !== prev.current) {
      prev.current = stage;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (stage >= 2 && !enc.synced) nav.setEnc({ synced: true });
    }
  }, [stage]);
  const online = stage >= 1;

  return (
    <Screen
      title="Specialist handoff"
      subtitle={`${PATIENT.id} · nothing lost if the connection drops`}
      right={<OfflinePill online={online} />}
      footer={stage >= 4
        ? <Btn label="Close case" icon="check" onPress={() => nav.push('summary')} />
        : <Btn label="Preview what the specialist sees" icon="eye" variant="ghost" onPress={() => nav.push('specialist')} />}
    >
      {/* Status timeline */}
      <FadeIn>
        <Card>
          {STAGES.map((s, i) => {
            const done = i < stage || (i === stage && i === STAGES.length - 1);
            const cur = i === stage && !done;
            if (i > stage) return null;
            return (
              <FadeIn key={s.k} from={8}>
                <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 8 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: done || i < stage ? C.greenWash : C.amberWash, alignItems: 'center', justifyContent: 'center' }}>
                    {cur && i !== 0 ? <Spinner color={C.amber} size={14} /> : <Feather name={s.i as any} size={14} color={i < stage || done ? C.green : C.amber} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.semi, fontSize: 14, color: C.ink }}>{s.t}</Text>
                    {s.s ? <Small>{s.s}</Small> : null}
                  </View>
                  <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.faint }}>{['20:37', '20:39', '20:39', '20:41', '20:44'][i]}</Text>
                </View>
              </FadeIn>
            );
          })}
        </Card>
      </FadeIn>

      {stage >= 4 ? (
        <FadeIn>
          <View style={[{ marginTop: 14, backgroundColor: C.navy, borderRadius: 20, padding: 16 }, shadow]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="user" size={17} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.semi, fontSize: 14, color: '#fff' }}>{SPECIALIST.name}</Text>
                <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.navyText }}>{SPECIALIST.site}</Text>
              </View>
              <Tag label="Accepted transfer" tone="green" icon="check" />
            </View>
            <Text style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 21, color: '#E8F0FA', marginTop: 12 }}>{SPECIALIST.reply}</Text>
          </View>
        </FadeIn>
      ) : null}

      {/* Brief */}
      <FadeIn delay={150}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 10 }}>
          <Label style={{ flex: 1 }}>Auto-generated brief</Label>
          <Tag label="SBAR" tone="gray" />
        </View>
        <Card>
          {[
            ['Situation', `${PATIENT.label}, ${PATIENT.mechanism.toLowerCase()} ~3 h ago. GCS 14 → 11 over 45 min with new right pupil change and left arm drift.`],
            ['Background', 'Brief LOC at scene, then lucid interval. Vomited ×2, severe headache. No blood thinners. No CT on site.'],
            ['Assessment', `Kyro: lateralizing signs without imaging (leaf L-12). Clinician's first call: ${DISP_LABEL[enc.selfAssessment ?? 'transfer']}.`],
            ['Request', 'Decision on urgent transfer or local intervention. Advice on hyperosmolar therapy.'],
          ].map(([h, b], i) => (
            <View key={h} style={{ marginTop: i ? 12 : 0 }}>
              <Text style={{ fontFamily: F.semi, fontSize: 12, color: C.brandDeep }}>{h.toUpperCase()}</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 13.5, lineHeight: 20, color: C.ink2, marginTop: 2 }}>{b}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: C.line, marginVertical: 14 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Tag label="GCS trend attached" tone="brand" icon="trending-down" />
            <Tag label={`${enc.stabilized.length}/6 stabilization steps`} tone="brand" icon="check-square" />
            <Tag label="Guideline path attached" tone="brand" icon="git-branch" />
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={220}>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <Btn small label="Call" icon="phone" variant="ghost" style={{ flex: 1 }} onPress={() => {}} />
          <Btn small label="SMS fallback" icon="message-square" variant="ghost" style={{ flex: 1 }} onPress={() => {}} />
        </View>
      </FadeIn>
    </Screen>
  );
}
