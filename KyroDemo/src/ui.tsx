import React, { useEffect, useRef } from 'react';
import {
  Animated, Easing, Pressable, ScrollView, Text, View,
  type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { C, F, shadow } from './theme';
import { useNav } from './nav';

export const tap = () => { Haptics.selectionAsync().catch(() => {}); };

// ── Typography ────────────────────────────────────────────────────────────────
type TP = { children: React.ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };
export const H1 = ({ children, style }: TP) => (
  <Text style={[{ fontFamily: F.bold, fontSize: 26, lineHeight: 32, color: C.ink, letterSpacing: -0.5 }, style]}>{children}</Text>
);
export const H2 = ({ children, style }: TP) => (
  <Text style={[{ fontFamily: F.semi, fontSize: 18, lineHeight: 24, color: C.ink, letterSpacing: -0.2 }, style]}>{children}</Text>
);
export const Body = ({ children, style, numberOfLines }: TP) => (
  <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.regular, fontSize: 14.5, lineHeight: 21, color: C.ink2 }, style]}>{children}</Text>
);
export const Small = ({ children, style, numberOfLines }: TP) => (
  <Text numberOfLines={numberOfLines} style={[{ fontFamily: F.regular, fontSize: 12.5, lineHeight: 17, color: C.muted }, style]}>{children}</Text>
);
export const Label = ({ children, style }: TP) => (
  <Text style={[{ fontFamily: F.semi, fontSize: 11.5, letterSpacing: 0.8, color: C.faint, textTransform: 'uppercase' }, style]}>{children}</Text>
);
export const Mono = ({ children, style }: TP) => (
  <Text style={[{ fontFamily: F.mono, fontSize: 12, color: C.muted }, style]}>{children}</Text>
);

// ── Layout ────────────────────────────────────────────────────────────────────
export function Screen({
  children, title, subtitle, footer, scroll = true, dark = false, right, step, onBack,
}: {
  children: React.ReactNode; title?: string; subtitle?: string; footer?: React.ReactNode; scroll?: boolean;
  dark?: boolean; right?: React.ReactNode; step?: [number, number]; onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const nav = useNav();
  const bg = dark ? C.navy : C.bg;
  const body = scroll ? (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>{children}</ScrollView>
  ) : <View style={{ flex: 1, padding: 18 }}>{children}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 12, paddingBottom: 6, backgroundColor: bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 44 }}>
          {nav.canGoBack ? (
            <Pressable hitSlop={10} onPress={() => { tap(); (onBack ?? nav.back)(); }} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="arrow-left" size={22} color={dark ? '#fff' : C.ink} />
            </Pressable>
          ) : <View style={{ width: 8 }} />}
          <View style={{ flex: 1, paddingHorizontal: 4 }}>
            {title ? <Text numberOfLines={1} style={{ fontFamily: F.semi, fontSize: 16, color: dark ? '#fff' : C.ink }}>{title}</Text> : null}
            {subtitle ? <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 12, color: dark ? C.navyText : C.muted }}>{subtitle}</Text> : null}
          </View>
          {right ?? <OfflinePill dark={dark} online={nav.enc.synced} />}
        </View>
        {step ? <StepBar step={step[0]} total={step[1]} dark={dark} /> : null}
      </View>
      <View style={{ flex: 1 }}>{body}</View>
      {footer ? (
        <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: insets.bottom + 14, backgroundColor: dark ? C.navy : C.card, borderTopWidth: 1, borderTopColor: dark ? C.navyLine : C.line }}>
          {footer}
        </View>
      ) : <View style={{ height: insets.bottom }} />}
    </View>
  );
}

function StepBar({ step, total, dark }: { step: number; total: number; dark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 8, marginTop: 4 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i < step ? C.brand : dark ? 'rgba(255,255,255,0.15)' : C.line2 }} />
      ))}
    </View>
  );
}

export function OfflinePill({ dark, online }: { dark?: boolean; online?: boolean }) {
  const col = online ? C.green : dark ? C.navyText : C.muted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: online ? C.greenWash : dark ? 'rgba(255,255,255,0.08)' : '#E9EDF2' }}>
      <Feather name={online ? 'wifi' : 'wifi-off'} size={12} color={col} />
      <Text style={{ fontFamily: F.semi, fontSize: 11, color: col }}>{online ? 'Online' : 'Offline'}</Text>
    </View>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const inner = <View style={[{ backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 16 }, shadow, style]}>{children}</View>;
  if (!onPress) return inner;
  return <Pressable onPress={() => { tap(); onPress(); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>{inner}</Pressable>;
}

export function Btn({
  label, onPress, variant = 'primary', icon, disabled, style, small,
}: {
  label: string; onPress: () => void; variant?: 'primary' | 'ghost' | 'dark' | 'danger' | 'light'; icon?: keyof typeof Feather.glyphMap;
  disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const bg = { primary: C.brand, ghost: C.card, dark: C.navy, danger: C.red, light: 'rgba(255,255,255,0.12)' }[variant];
  const fg = variant === 'ghost' ? C.ink : '#fff';
  return (
    <Pressable
      disabled={disabled}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [{
        height: small ? 42 : 54, borderRadius: small ? 12 : 16, backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.88 : 1,
        borderWidth: variant === 'ghost' ? 1 : 0, borderColor: C.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        paddingHorizontal: 16, transform: [{ scale: pressed ? 0.98 : 1 }],
      }, style]}
    >
      {icon ? <Feather name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={{ fontFamily: F.semi, fontSize: small ? 14 : 15.5, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label, selected, onPress, tone = 'brand', icon,
}: { label: string; selected?: boolean; onPress?: () => void; tone?: 'brand' | 'red' | 'amber' | 'green'; icon?: keyof typeof Feather.glyphMap }) {
  const col = { brand: C.brand, red: C.red, amber: C.amber, green: C.green }[tone];
  return (
    <Pressable
      onPress={() => { tap(); onPress?.(); }}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: selected ? col : C.line2, backgroundColor: selected ? col : C.card }}
    >
      {icon ? <Feather name={icon} size={14} color={selected ? '#fff' : C.ink2} /> : null}
      <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: selected ? '#fff' : C.ink2 }}>{label}</Text>
    </Pressable>
  );
}

export function Tag({ label, tone = 'brand', icon, style }: { label: string; tone?: 'brand' | 'red' | 'amber' | 'green' | 'gray' | 'violet' | 'navy'; icon?: keyof typeof Feather.glyphMap; style?: StyleProp<ViewStyle> }) {
  const m = {
    brand: [C.brandWash, C.brandDeep], red: [C.redWash, C.red], amber: [C.amberWash, C.amber], green: [C.greenWash, C.green],
    gray: ['#EDF0F4', C.muted], violet: [C.violetWash, C.violet], navy: ['rgba(255,255,255,0.10)', '#D8E6F7'],
  }[tone];
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: m[0] }, style]}>
      {icon ? <Feather name={icon} size={11} color={m[1]} /> : null}
      <Text style={{ fontFamily: F.semi, fontSize: 11, color: m[1], letterSpacing: 0.2 }}>{label}</Text>
    </View>
  );
}

export function IconBubble({ name, color = C.brand, bg = C.brandWash, size = 40 }: { name: keyof typeof Feather.glyphMap; color?: string; bg?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={name} size={size * 0.48} color={color} />
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: C.line, marginVertical: 12 }, style]} />;
}

// ── Motion ────────────────────────────────────────────────────────────────────
export function FadeIn({ children, delay = 0, style, from = 14 }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle>; from?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, delay]);
  return (
    <Animated.View style={[{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

export function Pulse({ color = C.brand, size = 120, on = true }: { color?: string; size?: number; on?: boolean }) {
  const rings = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    if (!on) return;
    const loops = rings.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 900),
      Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [on]);
  if (!on) return null;
  return (
    <>
      {rings.map((v, i) => (
        <Animated.View key={i} pointerEvents="none" style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.7] }) }],
        }} />
      ))}
    </>
  );
}

export function Waveform({ active, color = '#fff', bars = 24, height = 44 }: { active: boolean; color?: string; bars?: number; height?: number }) {
  const vals = useRef(Array.from({ length: bars }, () => new Animated.Value(0.2))).current;
  useEffect(() => {
    if (!active) {
      vals.forEach((v) => Animated.timing(v, { toValue: 0.15, duration: 250, useNativeDriver: true }).start());
      return;
    }
    let alive = true;
    const tick = () => {
      if (!alive) return;
      Animated.parallel(vals.map((v, i) => Animated.timing(v, {
        toValue: 0.2 + Math.random() * (0.8 - Math.abs(i - bars / 2) / bars), duration: 160, useNativeDriver: true,
      }))).start(() => tick());
    };
    tick();
    return () => { alive = false; };
  }, [active]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height }}>
      {vals.map((v, i) => (
        <Animated.View key={i} style={{ width: 3.5, height, borderRadius: 2, backgroundColor: color, transform: [{ scaleY: v }] }} />
      ))}
    </View>
  );
}

export function Spinner({ color = C.brand, size = 18 }: { color?: string; size?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    l.start();
    return () => l.stop();
  }, [a]);
  return (
    <Animated.View style={{ transform: [{ rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <Feather name="loader" size={size} color={color} />
    </Animated.View>
  );
}

/** Kyro's mark: three voice bars inside a rounded tile. */
export function KyroMark({ size = 40, dark }: { size?: number; dark?: boolean }) {
  const h = [0.42, 0.78, 0.56];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: dark ? C.brand : C.navy, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: size * 0.08 }}>
      {h.map((x, i) => (
        <View key={i} style={{ width: size * 0.11, height: size * x, borderRadius: size, backgroundColor: i === 1 ? C.sky : '#fff' }} />
      ))}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Banner({ tone, icon, title, text }: { tone: 'amber' | 'red' | 'green' | 'brand' | 'violet'; icon: keyof typeof Feather.glyphMap; title: string; text?: string }) {
  const m = {
    amber: [C.amberWash, C.amberLine, C.amber], red: [C.redWash, C.redLine, C.red], green: [C.greenWash, '#BFE6D3', C.green],
    brand: [C.brandWash, '#C9DDFD', C.brandDeep], violet: [C.violetWash, '#D9D3F5', C.violet],
  }[tone];
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, backgroundColor: m[0], borderWidth: 1, borderColor: m[1] }}>
      <Feather name={icon} size={18} color={m[2]} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.semi, fontSize: 14, color: m[2] }}>{title}</Text>
        {text ? <Text style={{ fontFamily: F.regular, fontSize: 13, lineHeight: 19, color: C.ink2, marginTop: 3 }}>{text}</Text> : null}
      </View>
    </View>
  );
}
