import React from 'react';
import { useRouter } from 'expo-router';
import OnboardingScreen from '../../OnboardingScreen';

export default function HomeScreen() {
  const router = useRouter();

  const handleFinish = () => {
    router.push('/login');
  };

  return <OnboardingScreen onFinish={handleFinish} />;
}
