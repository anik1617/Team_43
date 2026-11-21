import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { C, F } from '../theme';
import { useNav } from '../nav';

export default function Splash() {
  const nav = useNav();
  const bars = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const word = useRef(new Animated.Value(0)).current;
  const checks = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.stagger(120, bars.map((b) => Animated.spring(b, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }))),
      Animated.timing(word, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(checks, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => nav.reset('home'), 3600);
    return () => clearTimeout(t);
  }, []);

  const H = [34, 62, 46];
  return (
    <Pressable style={{ flex: 1 }} onPress={() => nav.reset('home')}>
      <LinearGradient colors={['#0A1626', '#0F2744', '#123A6B']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, height: 70 }}>
          {H.map((h, i) => (
            <Animated.View key={i} style={{ width: 11, height: h, borderRadius: 6, backgroundColor: i === 1 ? C.sky : '#fff', transform: [{ scaleY: bars[i] }] }} />
          ))}
        </View>
        <Animated.View style={{ alignItems: 'center', opacity: word, transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <Text style={{ fontFamily: F.heavy, fontSize: 44, color: '#fff', letterSpacing: 3, marginTop: 22 }}>KYRO</Text>
          <Text style={{ fontFamily: F.regular, fontSize: 15, color: C.navyText, marginTop: 6, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 }}>
            Head-injury decision support{'\n'}that works without a signal
          </Text>
        </Animated.View>
        <Animated.View style={{ position: 'absolute', bottom: 70, alignItems: 'center', gap: 10, opacity: checks }}>
          {['Speech model loaded on device', 'Guideline bundle v1.4 · signature verified', 'No network needed'].map((s) => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="check-circle" size={14} color={C.sky} />
              <Text style={{ fontFamily: F.medium, fontSize: 12.5, color: C.navyText }}>{s}</Text>
            </View>
          ))}
        </Animated.View>
      </LinearGradient>
    </Pressable>
  );
}
