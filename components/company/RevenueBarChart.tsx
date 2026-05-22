import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appColors } from '../../styles/appStyles';

type TimeFilter = 'daily' | 'weekly' | 'monthly';

type Props = {
  data: { label: string; value: number }[];
  filter: TimeFilter;
  colors: { textPrimary: string; textSecondary: string };
};

const formatCurrency = (v: number): string => {
  if (v === 0) return '';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `$${(v / 1_000).toFixed(0)}k`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v}`;
};

export default function RevenueBarChart({ data, filter, colors }: Props) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <View>
      <View style={styles.totalRow}>
        <Text style={[styles.totalValue, { color: colors.textPrimary }]}>
          {total > 0 ? `$${total.toLocaleString('es-AR')}` : '$0'}
        </Text>
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
          {filter === 'daily' ? 'hoy' : filter === 'weekly' ? 'esta semana' : 'últimos 30 días'}
        </Text>
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.barsWrapper}>
          {data.map((item, index) => {
            const heightPercent = (item.value / maxValue) * 100;
            const isMax = item.value === maxValue && item.value > 0;
            return (
              <View key={index} style={styles.barCol}>
                <Text style={[styles.barValue, { color: item.value > 0 ? appColors.primary : 'transparent' }]}>
                  {formatCurrency(item.value)}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[
                    styles.barFill,
                    { height: `${heightPercent}%`, backgroundColor: isMax ? appColors.primary : appColors.primary + '70' },
                  ]} />
                </View>
                <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
  },
  totalValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: 'Inter_800ExtraBold',
  },
  totalLabel: { fontSize: 12, fontWeight: '400', fontFamily: 'Inter_400Regular' },
  chartContainer: { height: 140 },
  barsWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barCol: {
    alignItems: 'center',
    width: 30,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: { fontSize: 8, fontWeight: '700', marginBottom: 3 },
  barTrack: {
    width: 8,
    height: 90,
    backgroundColor: '#33333320',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 10, marginTop: 6, fontWeight: '500', fontFamily: 'Inter_500Medium' },
});
