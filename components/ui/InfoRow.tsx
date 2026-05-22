import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type Props = {
  label: string;
  value: string | null;
};

export default function InfoRow({ label, value }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.textPrimary }]}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    flexShrink: 0,
    fontFamily: 'Inter_400Regular',
  },
  value: {
    fontSize: 14,
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Inter_400Regular',
  },
});
