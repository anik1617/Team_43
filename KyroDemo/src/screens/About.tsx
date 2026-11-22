import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F } from '../theme';
import { Card, FadeIn, KyroMark, Label, Screen, Small, Tag } from '../ui';

const LAYERS = [
  { i: 'git-branch', c: C.brand, t: 'Guideline tree decides', s: 'Published head-injury guidelines encoded as explicit rules. Every step carries a citation. Code walks the tree, not the AI.' },
  { i: 'book-open', c: C.violet, t: 'Cited knowledge explains', s: 'A small, signed library of guideline passages, stored on the phone, shows why each step applies.' },
  { i: 'mic', c: C.green, t: 'Language model only listens and talks', s: 'Turns speech into fields, reads them back and explains in plain words. It cannot override the tree or give medical advice.' },
];

export default function About() {
  return (
    <Screen title="How Kyro works" subtitle="On-device · offline-first · human in charge">
      <FadeIn>
        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
          <KyroMark size={56} />
          <Text style={{ fontFamily: F.heavy, fontSize: 22, letterSpacing: 2, color: C.ink, marginTop: 10 }}>KYRO</Text>
          <Small>Version 1.4 · build 2026.11</Small>
        </View>
      </FadeIn>

      <Label style={{ marginTop: 16, marginBottom: 10 }}>Three layers, one rule: the tree decides</Label>
      {LAYERS.map((l, k) => (
        <FadeIn key={l.t} delay={80 + k * 70}>
          <Card style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: l.c + '1A', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={l.i as any} size={18} color={l.c} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.semi, fontSize: 14.5, color: C.ink }}>{l.t}</Text>
              <Small style={{ marginTop: 3, lineHeight: 18 }}>{l.s}</Small>
            </View>
          </Card>
        </FadeIn>
      ))}

      <FadeIn delay={320}>
        <Label style={{ marginTop: 14, marginBottom: 10 }}>On this phone</Label>
        <Card style={{ padding: 0 }}>
          {[
            ['Guideline bundle', 'edh-core v1.4', 'Signature verified', 'shield'],
            ['Speech recognition', 'Whisper, on device', '74 MB', 'mic'],
            ['Language model', 'Qwen 3B, 4-bit', '1.9 GB', 'cpu'],
            ['Patient records', 'Encrypted local storage', '4 cases', 'lock'],
            ['Last sync', 'Today 20:39', 'Up to date', 'refresh-cw'],
          ].map(([a, b, c, i], k) => (
            <View key={a} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: k ? 1 : 0, borderTopColor: C.line }}>
              <Feather name={i as any} size={16} color={C.muted} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: C.ink }}>{a}</Text>
                <Small>{b}</Small>
              </View>
              <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.muted }}>{c}</Text>
            </View>
          ))}
        </Card>
      </FadeIn>

      <FadeIn delay={380}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          <Tag label="Works with no signal" tone="green" icon="wifi-off" />
          <Tag label="Data stays on the phone" tone="brand" icon="smartphone" />
          <Tag label="Open source" tone="violet" icon="github" />
        </View>
        <Text style={{ fontFamily: F.regular, fontSize: 11.5, lineHeight: 17, color: C.faint, marginTop: 18, textAlign: 'center' }}>
          Kyro is a research prototype under evaluation and is not yet approved for clinical use.
        </Text>
      </FadeIn>
    </Screen>
  );
}
