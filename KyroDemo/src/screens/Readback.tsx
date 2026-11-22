import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { C, F } from '../theme';
import { useNav } from '../nav';
import { Btn, Card, FadeIn, Label, Screen, Small, Tag, Waveform, tap } from '../ui';
import { READBACK as SCRIPTED } from '../demoCase';

export default function Readback() {
  const nav = useNav();
  // What the voice intake actually heard; any critical field it missed is flagged for confirmation.
  const READBACK = nav.enc.intake?.readback ?? SCRIPTED.map((r) => ({ ...r, heard: true }));
  const [speaking, setSpeaking] = useState(0); // index Kyro is currently reading
  const [ok, setOk] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (speaking >= READBACK.length) return;
    const t = setTimeout(() => setSpeaking((s) => s + 1), 1100);
    return () => clearTimeout(t);
  }, [speaking]);

  const all = READBACK.every((r) => ok[r.key]);
  const toggle = (k: string) => { tap(); setOk((o) => ({ ...o, [k]: !o[k] })); };
  const confirmAll = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (!all) { setOk(Object.fromEntries(READBACK.map((r) => [r.key, true]))); return; }
    nav.push('missing');
  };

  const reading = speaking < READBACK.length;
  return (
    <Screen
      title="Read-back"
      subtitle="Confirm each critical field"
      step={[2, 5]}
      footer={<Btn label={all ? 'Continue' : 'Confirm all'} icon={all ? 'arrow-right' : 'check'} onPress={confirmAll} />}
    >
      <FadeIn>
        <Card style={{ backgroundColor: C.navy, borderColor: C.navy, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(124,196,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="volume-2" size={20} color={C.sky} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 14, color: '#fff' }}>{reading ? 'Kyro is reading back…' : 'Read-back complete'}</Text>
            <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: C.navyText, marginTop: 2 }}>
              {reading ? `"${READBACK[speaking].label}: ${READBACK[speaking].value}. Correct?"` : 'Tap any field to confirm or correct it.'}
            </Text>
          </View>
          <Waveform active={reading} color={C.sky} bars={6} height={22} />
        </Card>
      </FadeIn>

      <Label style={{ marginTop: 22, marginBottom: 10 }}>Critical fields · {Object.values(ok).filter(Boolean).length}/{READBACK.length} confirmed</Label>
      {READBACK.map((r, i) => {
        const on = !!ok[r.key];
        const active = i === speaking;
        return (
          <FadeIn key={r.key} delay={i * 90}>
            <Pressable onPress={() => toggle(r.key)}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 10,
                borderWidth: 1.5, borderColor: active ? C.brand : on ? '#BFE6D3' : C.line,
              }}>
                <View style={{ flex: 1 }}>
                  <Small style={{ fontFamily: F.medium }}>{r.label}</Small>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 22, color: C.ink, letterSpacing: -0.3 }}>{r.value}</Text>
                    <Text style={{ fontFamily: F.regular, fontSize: 12.5, color: r.heard ? C.muted : C.amber, flexShrink: 1 }}>{r.detail}</Text>
                  </View>
                </View>
                <Feather name="edit-2" size={15} color={C.faint} style={{ marginRight: 14 }} />
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: on ? C.green : C.bg, borderWidth: on ? 0 : 1.5, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>
                  {on ? <Feather name="check" size={17} color="#fff" /> : null}
                </View>
              </View>
            </Pressable>
          </FadeIn>
        );
      })}

      <FadeIn delay={700}>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
          <Tag label="Numbers are never guessed" tone="gray" icon="shield" />
          <Tag label="Range-checked" tone="gray" icon="sliders" />
        </View>
      </FadeIn>
    </Screen>
  );
}
