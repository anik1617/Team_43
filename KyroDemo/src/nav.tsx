import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, View } from 'react-native';

export type Route =
  | 'splash' | 'home' | 'intake' | 'readback' | 'missing' | 'selfAssess' | 'analyzing' | 'guidance'
  | 'plan' | 'monitor' | 'handoff' | 'specialist' | 'summary' | 'about';

export type Disposition = 'observe' | 'transfer' | 'specialist';

/** Everything the demo encounter accumulates as the clinician moves through it. */
export type Encounter = {
  pupils?: 'equal' | 'right_sluggish' | 'right_fixed';
  anticoag?: 'none' | 'yes' | 'unknown';
  selfAssessment?: Disposition;
  selfConfidence?: 'low' | 'med' | 'high';
  guidanceViewedAt?: number;
  deteriorated: boolean;
  /** Plan steps the clinician has ticked as done (ids from src/guidelines.ts). */
  stabilized: string[];
  /** Estimated weight used to scale per-kg doses on the plan screen. */
  weightKg?: number;
  synced: boolean;
  handoffAt?: number;
};

type NavCtx = {
  route: Route;
  canGoBack: boolean;
  push: (r: Route) => void;
  replace: (r: Route) => void;
  reset: (r: Route) => void;
  back: () => void;
  enc: Encounter;
  setEnc: (p: Partial<Encounter>) => void;
  newEncounter: () => void;
};

const Ctx = createContext<NavCtx | null>(null);
export const useNav = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useNav outside provider');
  return c;
};

const fresh = (): Encounter => ({ deteriorated: false, stabilized: [], synced: false });

export function NavProvider({ screens, overlay }: { screens: Record<Route, React.ComponentType>; overlay?: React.ReactNode }) {
  const [stack, setStack] = useState<Route[]>(['splash']);
  const [enc, setEncState] = useState<Encounter>(fresh());
  const anim = useRef(new Animated.Value(1)).current;
  const dir = useRef(1);

  const run = useCallback((d: number, next: (s: Route[]) => Route[]) => {
    dir.current = d;
    anim.setValue(0);
    setStack(next);
  }, [anim]);

  // Start the enter animation after the new screen has mounted (starting it earlier gets cancelled
  // when the previous screen's animated view detaches).
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [stack, anim]);

  const push = useCallback((r: Route) => run(1, (s) => [...s, r]), [run]);
  const replace = useCallback((r: Route) => run(1, (s) => [...s.slice(0, -1), r]), [run]);
  const reset = useCallback((r: Route) => run(1, () => [r]), [run]);
  const back = useCallback(() => run(-1, (s) => (s.length > 1 ? s.slice(0, -1) : s)), [run]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) { back(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [stack, back]);

  const route = stack[stack.length - 1];
  const value = useMemo<NavCtx>(() => ({
    route, canGoBack: stack.length > 1 && route !== 'home', push, replace, reset, back, enc,
    setEnc: (p) => setEncState((e) => ({ ...e, ...p })),
    newEncounter: () => setEncState(fresh()),
  }), [route, stack.length, push, replace, reset, back, enc]);

  const S = screens[route];
  return (
    <Ctx.Provider value={value}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View key={route + stack.length} style={{
          flex: 1,
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }),
          transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [dir.current * 40, 0] }) }],
        }}>
          <S />
        </Animated.View>
      </View>
      {overlay}
    </Ctx.Provider>
  );
}
