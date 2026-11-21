import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F } from '../theme';
import { useNav } from '../nav';
import { Banner, Btn, Card, Chip, FadeIn, H2, Label, Screen, Small } from '../ui';

export default function Missing() {
  const nav = useNav();
  const { enc, setEnc } = nav;
  const done = !!enc.pupils && !!enc.anticoag;
  const left = (enc.pupils ? 0 : 1) + (enc.anticoag ? 0 : 1);

  return (
    <Screen
      title="Before Kyro can advise"
      subtitle="Critical findings still missing"
      step={[3, 5]}
      footer={<Btn label={done ? 'Continue' : `${left} finding${left > 1 ? 's' : ''} still needed`} icon={done ? 'arrow-right' : 'lock'} disabled={!done} onPress={() => nav.push('selfAssess')} />}
    >
      <FadeIn>
        {done ? (
          <Banner tone="green" icon="unlock" title="All critical findings recorded" text="Kyro can now walk the guideline tree." />
        ) : (
          <Banner tone="amber" icon="lock" title="Guidance withheld" text="Kyro won't give guidance while a finding that changes the decision is missing. Check these at the bedside." />
        )}
      </FadeIn>

      <FadeIn delay={120}>
        <Card style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: enc.pupils ? C.greenWash : C.amberWash, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={enc.pupils ? 'check' : 'eye'} size={17} color={enc.pupils ? C.green : C.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <H2 style={{ fontSize: 16 }}>Pupils</H2>
              <Small>Size and reaction to light, both eyes</Small>
            </View>
          </View>
          <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.muted, marginTop: 10, lineHeight: 19 }}>
            Why it matters: a new unequal or sluggish pupil is the strongest bedside sign of an expanding bleed.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <Chip label="Equal & reactive" selected={enc.pupils === 'equal'} onPress={() => setEnc({ pupils: 'equal' })} tone="green" />
            <Chip label="R larger, sluggish" selected={enc.pupils === 'right_sluggish'} onPress={() => setEnc({ pupils: 'right_sluggish' })} tone="red" />
            <Chip label="R fixed, dilated" selected={enc.pupils === 'right_fixed'} onPress={() => setEnc({ pupils: 'right_fixed' })} tone="red" />
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={220}>
        <Card style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: enc.anticoag ? C.greenWash : C.amberWash, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={enc.anticoag ? 'check' : 'droplet'} size={17} color={enc.anticoag ? C.green : C.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <H2 style={{ fontSize: 16 }}>Blood thinners</H2>
              <Small>Anticoagulant or antiplatelet use</Small>
            </View>
          </View>
          <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.muted, marginTop: 10, lineHeight: 19 }}>
            Why it matters: blood thinners raise the risk of bleeding inside the skull even after minor injuries.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <Chip label="None" selected={enc.anticoag === 'none'} onPress={() => setEnc({ anticoag: 'none' })} tone="green" />
            <Chip label="Yes" selected={enc.anticoag === 'yes'} onPress={() => setEnc({ anticoag: 'yes' })} tone="red" />
            <Chip label="Unknown" selected={enc.anticoag === 'unknown'} onPress={() => setEnc({ anticoag: 'unknown' })} tone="amber" />
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={320}>
        <Label style={{ marginTop: 22, marginBottom: 8 }}>Also helpful, not required</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['Limb weakness', 'Seizure', 'Blood glucose', 'Neck pain'].map((x) => (
            <View key={x} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#EBEFF4' }}>
              <Feather name="plus" size={13} color={C.muted} />
              <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: C.muted }}>{x}</Text>
            </View>
          ))}
        </View>
      </FadeIn>
    </Screen>
  );
}
