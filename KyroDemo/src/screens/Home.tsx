import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, shadow } from '../theme';
import { useNav } from '../nav';
import { Card, FadeIn, KyroMark, Label, OfflinePill, Pulse, Small, Tag, tap } from '../ui';
import { RECENT } from '../demoCase';

export default function Home() {
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const start = () => { nav.newEncounter(); nav.push('intake'); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 18, paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <KyroMark size={36} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.heavy, fontSize: 19, color: C.ink, letterSpacing: 1.2 }}>KYRO</Text>
              <Small>District Hospital · Emergency</Small>
            </View>
            <OfflinePill />
            <Pressable hitSlop={8} onPress={() => { tap(); nav.push('about'); }} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }}>
              <Feather name="settings" size={17} color={C.ink2} />
            </Pressable>
          </View>
        </FadeIn>

        <FadeIn delay={80}>
          <Text style={{ fontFamily: F.regular, fontSize: 15, color: C.muted }}>Good evening, Dr. Kamara</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 27, color: C.ink, letterSpacing: -0.6, marginTop: 2, marginBottom: 16 }}>Ready when you are.</Text>
        </FadeIn>

        {/* Hero CTA */}
        <FadeIn delay={160}>
          <Pressable onPress={() => { tap(); start(); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
            <LinearGradient colors={['#0A1626', '#12305A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: 24, padding: 20, overflow: 'hidden' }, shadow]}>
              <View style={{ position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(45,127,249,0.18)' }} />
              <Tag label="HEAD INJURY · ADULT & ADOLESCENT" tone="navy" />
              <Text style={{ fontFamily: F.bold, fontSize: 22, color: '#fff', marginTop: 14, lineHeight: 28 }}>Start a new{'\n'}assessment</Text>
              <Text style={{ fontFamily: F.regular, fontSize: 13.5, color: C.navyText, marginTop: 6, lineHeight: 19, maxWidth: 220 }}>
                Speak the history and exam. Kyro structures it, checks what's missing and walks the guidelines.
              </Text>
              <View style={{ position: 'absolute', right: 22, bottom: 22, alignItems: 'center', justifyContent: 'center' }}>
                <Pulse size={64} color={C.sky} />
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="mic" size={26} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </FadeIn>

        {/* On-device status */}
        <FadeIn delay={240}>
          <Card style={{ marginTop: 14, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Feather name="smartphone" size={15} color={C.ink2} />
              <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: C.ink, marginLeft: 8, flex: 1 }}>Everything runs on this phone</Text>
              <Tag label="No signal needed" tone="green" icon="check" />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { i: 'mic', t: 'Speech', s: 'On device' },
                { i: 'git-branch', t: 'Guidelines', s: 'v1.4 signed' },
                { i: 'lock', t: 'Patient data', s: 'Encrypted' },
              ].map((x) => (
                <View key={x.t} style={{ flex: 1, backgroundColor: C.bg, borderRadius: 12, padding: 10 }}>
                  <Feather name={x.i as any} size={15} color={C.brand} />
                  <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: C.ink, marginTop: 6 }}>{x.t}</Text>
                  <Text style={{ fontFamily: F.regular, fontSize: 11, color: C.muted }}>{x.s}</Text>
                </View>
              ))}
            </View>
          </Card>
        </FadeIn>

        {/* Sync queue */}
        <FadeIn delay={300}>
          <Card style={{ marginTop: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.amberWash, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="upload-cloud" size={18} color={C.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: C.ink }}>1 case waiting to sync</Text>
              <Small>Sends automatically when a signal returns</Small>
            </View>
            <Feather name="chevron-right" size={18} color={C.faint} />
          </Card>
        </FadeIn>

        <FadeIn delay={360}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 10 }}>
            <Label style={{ flex: 1 }}>Recent cases</Label>
            <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: C.brand }}>See all</Text>
          </View>
          <Card style={{ padding: 0 }}>
            {RECENT.map((r, i) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Feather name="user" size={16} color={C.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 14, color: C.ink }}>{r.who} · <Text style={{ fontFamily: F.regular, color: C.muted }}>{r.what}</Text></Text>
                  <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.faint, marginTop: 2 }}>{r.id} · {r.when}</Text>
                </View>
                <Tag label={r.status} tone={r.tone} />
              </View>
            ))}
          </Card>
        </FadeIn>

        <FadeIn delay={420}>
          <Text style={{ fontFamily: F.regular, fontSize: 11, color: C.faint, textAlign: 'center', marginTop: 22 }}>
            Research prototype · not yet approved for clinical use
          </Text>
        </FadeIn>
      </ScrollView>
    </View>
  );
}
