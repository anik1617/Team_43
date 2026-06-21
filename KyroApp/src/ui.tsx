/** Shared Vigil UI atoms used by the gather + decision screens. */
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { C, F } from './theme';

export function Reveal({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: ViewStyle }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 480, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, delay]);
  return (
    <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

export function Pulse({ color, size = 9 }: { color: string; size?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(a, { toValue: 1, duration: 2200, easing: Easing.out(Easing.ease), useNativeDriver: true })).start();
  }, [a]);
  const box = size + 5;
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: box, height: box, borderRadius: box / 2, backgroundColor: color, opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }] }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
    </View>
  );
}

export const Label = ({ children, style }: { children: React.ReactNode; style?: TextStyle }) => (
  <Text style={[{ fontFamily: F.monoSemi, fontSize: 10.5, letterSpacing: 2.4, color: C.textFaint }, style]}>{children}</Text>
);
