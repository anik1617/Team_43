import { Platform } from 'react-native';
import { requireOptionalNativeModule, type EventSubscription } from 'expo';

export type AudioEvent = { data: string; level: number };

type KyroMicNative = {
  start(sampleRate: number): Promise<boolean>;
  stop(): Promise<boolean>;
  addListener(event: 'onAudio', cb: (e: AudioEvent) => void): EventSubscription;
  addListener(event: 'onMicError', cb: (e: { message: string }) => void): EventSubscription;
};

/** null on web, in Expo Go, or in any build without the native module compiled in. */
const KyroMic: KyroMicNative | null =
  Platform.OS === 'android' ? (requireOptionalNativeModule('KyroMic') as KyroMicNative | null) : null;

export default KyroMic;
