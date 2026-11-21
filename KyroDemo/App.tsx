import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { NavProvider, useNav, type Route } from './src/nav';
import { C } from './src/theme';
import Splash from './src/screens/Splash';
import Home from './src/screens/Home';
import Intake from './src/screens/Intake';
import Readback from './src/screens/Readback';
import Missing from './src/screens/Missing';
import SelfAssess from './src/screens/SelfAssess';
import Analyzing from './src/screens/Analyzing';
import Guidance from './src/screens/Guidance';
import Monitor from './src/screens/Monitor';
import Defer from './src/screens/Defer';
import Handoff from './src/screens/Handoff';
import Specialist from './src/screens/Specialist';
import Summary from './src/screens/Summary';
import About from './src/screens/About';

const SCREENS: Record<Route, React.ComponentType> = {
  splash: Splash, home: Home, intake: Intake, readback: Readback, missing: Missing, selfAssess: SelfAssess,
  analyzing: Analyzing, guidance: Guidance, monitor: Monitor, defer: Defer, handoff: Handoff,
  specialist: Specialist, summary: Summary, about: About,
};

const DARK: Route[] = ['splash', 'intake', 'analyzing', 'specialist'];

function Bar() {
  const { route } = useNav();
  return <StatusBar style={DARK.includes(route) ? 'light' : 'dark'} />;
}

export default function App() {
  const [loaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
    IBMPlexMono_500Medium, IBMPlexMono_600SemiBold,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.navy }} />;
  return (
    <SafeAreaProvider>
      <NavProvider screens={SCREENS} overlay={<Bar />} />
    </SafeAreaProvider>
  );
}
