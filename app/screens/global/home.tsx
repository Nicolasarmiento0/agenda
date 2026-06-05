import React from 'react';
import { useRouter } from 'expo-router';
import OnboardingScreen from '../../../OnboardingScreen';

export default function HomeScreen() {
  const router = useRouter();

  const handleFinish = () => {
    router.push('/screens/global/loginscreen' as any);
  };

  return <OnboardingScreen onFinish={handleFinish} />;
}
