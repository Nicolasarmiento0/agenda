import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import GlassCard from './GlassCard';

type Props = {
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
};

export default function SectionCard({ label, children, style, gap = 12 }: Props) {
  const { colors } = useTheme();
  return (
    <View style={style}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <GlassCard>
        <View style={[styles.inner, { gap }]}>{children}</View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    letterSpacing: 3,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  inner: {
    padding: 16,
  },
});
