import type { Disposition, Encounter } from './nav';
import { treePath } from './demoCase';

export function evaluate(enc: Encounter) {
  const lateralizing = enc.deteriorated || (!!enc.pupils && enc.pupils !== 'equal');
  const path = treePath({ lateralizing, deteriorated: enc.deteriorated });
  const rec: Disposition = lateralizing ? 'specialist' : 'transfer';
  return {
    lateralizing,
    path,
    rec,
    risk: lateralizing ? 3 : 2,
    title: lateralizing
      ? 'Possible expanding bleed. Specialist decision needed now.'
      : 'High-risk head injury. Observe closely and prepare transfer.',
    summary: lateralizing && !enc.deteriorated
      ? 'Lucid interval after a high-energy crash, now with one-sided pupil signs. This pattern is time-critical. Whether and where to operate is a specialist decision that needs imaging Kyro does not have.'
      : lateralizing
      ? 'Lucid interval followed by a falling GCS and new one-sided signs. This pattern is time-critical. Whether and where to operate is a specialist decision that needs imaging Kyro does not have.'
      : 'Loss of consciousness with a lucid interval after a high-energy crash, plus repeated vomiting. With no CT on site: prevent secondary injury, give TXA inside the 3-hour window, run neuro checks and alert the referral centre early.',
    leaf: lateralizing ? 'Leaf L-12 · Lateralizing signs without imaging' : 'Leaf L-07 · High-risk mild TBI without imaging',
  };
}

export const DISP_LABEL: Record<Disposition, string> = {
  observe: 'Observe here',
  transfer: 'Prepare transfer',
  specialist: 'Urgent specialist decision',
};
