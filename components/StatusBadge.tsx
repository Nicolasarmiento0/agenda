import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  status: string;
  colors: Record<string, string>;
  labels: Record<string, string>;
};

export default function StatusBadge({ status, colors, labels }: Props) {
  const color = colors[status] ?? '#9CA3AF';
  const label = labels[status] ?? status.toUpperCase();

  return (
    <View style={[styles.badge, { backgroundColor: `${color}20`, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
