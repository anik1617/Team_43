/**
 * Kyro — bare-bones starting screen.
 *
 * This does ONE thing: run a real Kyro decision on the hardcoded severe-HM case and dump it
 * on screen as plain text. NO styling, NO layout effort — that is YOUR job. Open the app,
 * confirm you see a real 🟢 GUIDE@L21c decision on the phone, then build the UI below.
 *
 * Everything clinical already happened inside useKyroEncounter (the real edge engine). This
 * file is pure presentation — you can throw all of it away and keep only the hook.
 */

import { ScrollView, Text, View } from 'react-native';

import { useKyroEncounter } from './src/useKyroEncounter';

const BADGE_EMOJI: Record<string, string> = {
  GREEN: '🟢',
  YELLOW: '🟡',
  RED: '🔴',
};

function App() {
  const { loading, result, error } = useKyroEncounter();

  if (loading) {
    return (
      <View style={{ flex: 1, padding: 40, justifyContent: 'center' }}>
        <Text>Running Kyro decision…</Text>
      </View>
    );
  }

  if (error || !result) {
    return (
      <View style={{ flex: 1, padding: 40, justifyContent: 'center' }}>
        <Text>Kyro failed to produce a decision.</Text>
        <Text>{error?.message ?? 'unknown error'}</Text>
      </View>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ⬇️ BUILD YOUR UI HERE
  //
  // `result` is the finished Kyro decision (see KyroDecision in useKyroEncounter.ts):
  //   result.badge          'GREEN' | 'YELLOW' | 'RED'   → the authoritative gate verdict
  //   result.label          human label for the badge
  //   result.action         GUIDE / OBSERVE / STABILIZE_TRANSFER / ABSTAIN_STOP
  //   result.leafId         the leaf the deterministic tree reached (e.g. "L21c")
  //   result.cleared        may this be surfaced as actionable?
  //   result.drillAbstain   the mandatory 🔴 N40 drill-site abstain line (GUIDE only)
  //   result.recommendation the cited recommendation text
  //   result.citation       the source citation
  //   result.trace          the node path (the tree's auditable reasoning)
  //   result.handoff        the pre-briefed SBAR expert handoff (result.handoff.sbar.*)
  //
  // Everything below is throwaway debug output. Replace it.
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
      <Text>KYRO DECISION (severe HM — herniating EDH)</Text>
      <Text> </Text>

      <Text>
        BADGE: {BADGE_EMOJI[result.badge] ?? ''} {result.badge} — {result.label}
      </Text>
      <Text>ACTION: {result.action}</Text>
      <Text>LEAF: {result.leafId}</Text>
      <Text>CLEARED: {String(result.cleared)}</Text>
      <Text> </Text>

      <Text>RECOMMENDATION:</Text>
      <Text>{result.recommendation}</Text>
      {result.citation ? <Text>[{result.citation}]</Text> : null}
      <Text> </Text>

      {result.drillAbstain ? (
        <>
          <Text>⛔ DRILL-SITE ABSTAIN (N40):</Text>
          <Text>{result.drillAbstain}</Text>
          <Text> </Text>
        </>
      ) : null}

      <Text>TRACE: {result.trace.join(' → ')}</Text>
    </ScrollView>
  );
}

export default App;
