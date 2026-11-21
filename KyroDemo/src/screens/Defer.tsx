import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F } from '../theme';
import { useNav } from '../nav';
import { Btn, Card, FadeIn, Label, Screen, Small, tap } from '../ui';
import { STABILIZE } from '../demoCase';

export default function Defer() {
  const nav = useNav();
  const { enc, setEnc } = nav;
  const toggle = (id: string) => {
    tap();
    setEnc({ stabilized: enc.stabilized.includes(id) ? enc.stabilized.filter((x) => x !== id) : [...enc.stabilized, id] });
  };

  return (
    <Screen
      title="Specialist decision"
      subtitle="Kyro is deferring this call to a person"
      footer={<Btn label="Send handoff to neurosurgeon" icon="send" onPress={() => nav.push('handoff')} />}
    >
      <FadeIn>
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: C.redWash, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="user-check" size={32} color={C.red} />
          </View>
          <Text style={{ fontFamily: F.bold, fontSize: 22, color: C.ink, textAlign: 'center', marginTop: 14, letterSpacing: -0.3 }}>This decision belongs{'\n'}to a specialist</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 14, lineHeight: 21, color: C.muted, textAlign: 'center', marginTop: 8, paddingHorizontal: 8 }}>
            Whether to operate, and where, can't be undone and depends on imaging this site doesn't have. Kyro won't recommend surgery. It will brief a neurosurgeon and help you stabilize until they respond.
          </Text>
        </View>
      </FadeIn>

      <FadeIn delay={120}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 10 }}>
          <Label style={{ flex: 1 }}>Stabilize while you wait</Label>
          <Small>{enc.stabilized.length}/{STABILIZE.length} done</Small>
        </View>
        <Card style={{ padding: 0 }}>
          {STABILIZE.map((s, i) => {
            const on = enc.stabilized.includes(s.id);
            return (
              <Pressable key={s.id} onPress={() => toggle(s.id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                  <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: on ? C.green : C.card, borderWidth: on ? 0 : 1.5, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Feather name="check" size={16} color="#fff" /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.semi, fontSize: 14, color: on ? C.muted : C.ink, textDecorationLine: on ? 'line-through' : 'none' }}>{s.title}</Text>
                    <Small>{s.sub}</Small>
                  </View>
                  <Text style={{ fontFamily: F.medium, fontSize: 10.5, color: C.brandDeep, backgroundColor: C.brandWash, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' }}>{s.src}</Text>
                </View>
              </Pressable>
            );
          })}
        </Card>
      </FadeIn>

      <FadeIn delay={200}>
        <Card style={{ marginTop: 14, flexDirection: 'row', gap: 12, backgroundColor: C.amberWash, borderColor: C.amberLine }}>
          <Feather name="alert-octagon" size={18} color={C.amber} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: C.ink }}>Only with specialist instruction</Text>
            <Small style={{ marginTop: 3, lineHeight: 18 }}>Hyperosmolar therapy (hypertonic saline or mannitol) and any surgical step. Kyro shows guideline information but leaves these to the specialist.</Small>
          </View>
        </Card>
      </FadeIn>
    </Screen>
  );
}
