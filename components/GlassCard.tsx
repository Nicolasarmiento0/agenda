import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type Props = {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  intensity?: number;
};

export default function GlassCard({ style, children, intensity }: Props) {
  const { isDarkMode, colors } = useTheme();
  const blurIntensity = intensity ?? (isDarkMode ? 22 : 55);

  return (
    <BlurView
      intensity={blurIntensity}
      tint={isDarkMode ? 'dark' : 'light'}
      style={[styles.base, { borderColor: colors.border }, style, { overflow: 'hidden' }]}
    >
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.surface }]} />
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
