import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { C, F } from '../theme';
import { useNav } from '../nav';
import { FadeIn, Screen, Spinner, Tag } from '../ui';
import { evaluate } from '../logic';

export default function Analyzing() {
  const nav = useNav();
  const ev = evaluate(nav.enc);
  const [k, setK] = useState(0);

  useEffect(() => {
    if (k > ev.path.length) {
      const t = setTimeout(() => nav.replace('guidance'), 1100);
      return () => clearTimeout(t);
    }
    // Uneven per-node pacing (retrieval + rule checks don't all take the same time on a phone).
    const t = setTimeout(() => {
      setK((x) => x + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, k === 0 ? 1200 : 650 + Math.random() * 650);
    return () => clearTimeout(t);
  }, [k]);

  return (
    <Screen dark title={nav.enc.deteriorated ? 'Re-running guideline tree' : 'Walking the guideline tree'} subtitle="Deterministic rules · every step cited">
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
        <Tag label="0 model decisions" tone="navy" icon="cpu" />
        <Tag label="Peshawar · BTF · NICE" tone="navy" icon="book-open" />
      </View>

      {ev.path.map((n, i) => {
        const shown = i < k;
        const current = i === k;
        const col = n.hit ? '#FF8A7A' : '#5BD19A';
        return (
          <View key={n.id} style={{ flexDirection: 'row', opacity: shown || current ? 1 : 0.28 }}>
            <View style={{ alignItems: 'center', width: 30 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: shown ? (n.hit ? 'rgba(255,138,122,0.18)' : 'rgba(91,209,154,0.18)') : 'rgba(255,255,255,0.06)', borderWidth: 1.5, borderColor: shown ? col : current ? C.sky : 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                {shown ? <Feather name={n.hit ? 'alert-circle' : 'check'} size={13} color={col} /> : current ? <Spinner color={C.sky} size={12} /> : null}
              </View>
              {i < ev.path.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 26, backgroundColor: shown ? 'rgba(124,196,255,0.4)' : 'rgba(255,255,255,0.1)' }} /> : null}
            </View>
            <View style={{ flex: 1, paddingLeft: 12, paddingBottom: 16 }}>
              <Text style={{ fontFamily: F.mono, fontSize: 10.5, color: C.navyText }}>{n.id}</Text>
              <Text style={{ fontFamily: F.semi, fontSize: 14, color: '#fff', marginTop: 1 }}>{n.q}</Text>
              {shown ? (
                <FadeIn from={6}>
                  <Text style={{ fontFamily: F.medium, fontSize: 13, color: col, marginTop: 3 }}>{n.a}</Text>
                  <Text style={{ fontFamily: F.regular, fontSize: 11.5, color: 'rgba(201,216,234,0.7)', marginTop: 2 }}>{n.cite.src}</Text>
                </FadeIn>
              ) : null}
            </View>
          </View>
        );
      })}

      {k > ev.path.length - 1 ? (
        <FadeIn>
          <View style={{ marginTop: 6, padding: 14, borderRadius: 14, backgroundColor: 'rgba(124,196,255,0.12)', borderWidth: 1, borderColor: 'rgba(124,196,255,0.35)', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Feather name="flag" size={16} color={C.sky} />
            <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: '#fff', flex: 1 }}>Reached {ev.leaf}</Text>
          </View>
        </FadeIn>
      ) : null}
    </Screen>
  );
}
