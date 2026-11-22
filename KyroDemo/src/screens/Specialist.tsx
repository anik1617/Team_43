import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, F } from '../theme';
import { useNav } from '../nav';
import { Btn, Card, Chip, FadeIn, Screen, Tag } from '../ui';
import { OBS_BASE, OBS_DROP, PATIENT } from '../demoCase';
import { DISP_LABEL, evaluate } from '../logic';

export default function Specialist() {
  const nav = useNav();
  const ev = evaluate({ ...nav.enc, deteriorated: true });
  const [reply, setReply] = useState<string | null>(null);
  const obs = [...OBS_BASE, OBS_DROP];

  return (
    <Screen
      dark
      title="Specialist view"
      subtitle="What the receiving neurosurgeon opens"
      right={<Tag label="Preview" tone="navy" icon="eye" />}
      footer={<Btn label="Back to handoff" icon="arrow-left" variant="light" onPress={nav.back} />}
    >
      <FadeIn>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,107,91,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="alert-triangle" size={22} color="#FF8A7A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 18, color: '#fff' }}>{PATIENT.label} · head injury</Text>
            <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: C.navyText }}>{PATIENT.site} · received 20:39</Text>
          </View>
        </View>
      </FadeIn>

      <FadeIn delay={80}>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Stat label="GCS now" value="11" sub="was 14" bad />
          <Stat label="Pupils" value="R > L" sub="5 mm sluggish" bad />
          <Stat label="BP" value="168/90" sub="HR 52, falling" bad />
        </View>
      </FadeIn>

      <FadeIn delay={140}>
        <Card style={{ marginTop: 12, backgroundColor: C.navy2, borderColor: C.navyLine }}>
          <Text style={{ fontFamily: F.semi, fontSize: 13, color: '#fff', marginBottom: 6 }}>GCS over 45 minutes</Text>
          <Spark data={obs.map((o) => o.gcs)} />
        </Card>
      </FadeIn>

      <FadeIn delay={200}>
        <Text style={{ fontFamily: F.semi, fontSize: 11, letterSpacing: 0.8, color: C.navyText, marginTop: 18, marginBottom: 8 }}>TWO INDEPENDENT ASSESSMENTS</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(109,91,208,0.22)', borderRadius: 14, padding: 12 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 11, color: '#C9C0F5' }}>Local clinician (first)</Text>
            <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: '#fff', marginTop: 3 }}>{DISP_LABEL[nav.enc.selfAssessment ?? 'transfer']}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(45,127,249,0.22)', borderRadius: 14, padding: 12 }}>
            <Text style={{ fontFamily: F.medium, fontSize: 11, color: '#B9D4FF' }}>Kyro guideline tree</Text>
            <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: '#fff', marginTop: 3 }}>{DISP_LABEL[ev.rec]}</Text>
          </View>
        </View>
      </FadeIn>

      <FadeIn delay={260}>
        <Text style={{ fontFamily: F.semi, fontSize: 11, letterSpacing: 0.8, color: C.navyText, marginTop: 18, marginBottom: 8 }}>OPEN QUESTIONS FOR YOU</Text>
        {['Operate locally or transfer 140 km?', 'Repeat mannitol during transport?', 'Airway: intubate before the journey?'].map((q) => (
          <View key={q} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.navyLine }}>
            <Feather name="help-circle" size={15} color={C.sky} />
            <Text style={{ fontFamily: F.medium, fontSize: 13.5, color: '#fff', flex: 1 }}>{q}</Text>
          </View>
        ))}
      </FadeIn>

      <FadeIn delay={320}>
        <Text style={{ fontFamily: F.semi, fontSize: 11, letterSpacing: 0.8, color: C.navyText, marginTop: 18, marginBottom: 8 }}>QUICK REPLY</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['Accept transfer now', 'Call me', 'Repeat GCS in 10 min'].map((r) => (
            <Chip key={r} label={r} selected={reply === r} onPress={() => setReply(r)} />
          ))}
        </View>
        {reply ? (
          <FadeIn>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <Feather name="check-circle" size={14} color="#5BD19A" />
              <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: '#5BD19A' }}>Reply goes back to the local phone, even over SMS</Text>
            </View>
          </FadeIn>
        ) : null}
      </FadeIn>
    </Screen>
  );
}

function Stat({ label, value, sub, bad }: { label: string; value: string; sub: string; bad?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: bad ? 'rgba(255,138,122,0.35)' : C.navyLine }}>
      <Text style={{ fontFamily: F.medium, fontSize: 11, color: C.navyText }}>{label}</Text>
      <Text style={{ fontFamily: F.bold, fontSize: 19, color: bad ? '#FF8A7A' : '#fff', marginTop: 3 }}>{value}</Text>
      <Text style={{ fontFamily: F.regular, fontSize: 11, color: C.navyText }}>{sub}</Text>
    </View>
  );
}

function Spark({ data }: { data: number[] }) {
  const W = 300, H = 70;
  const x = (i: number) => 10 + (i / (data.length - 1)) * (W - 20);
  const y = (g: number) => 8 + ((15 - g) / 6) * (H - 16);
  const d = data.map((g, i) => `${i ? 'L' : 'M'}${x(i)},${y(g)}`).join(' ');
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Path d={d} stroke={C.sky} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((g, i) => <Circle key={i} cx={x(i)} cy={y(g)} r={4.5} fill={g <= 12 ? '#FF6B5B' : C.sky} />)}
    </Svg>
  );
}

