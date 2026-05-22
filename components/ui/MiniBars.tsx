import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appColors } from '../../styles/appStyles';

type Props = {
  data: number[];
  labels: string[];
  labelColor: string;
};

export default function MiniBars({ data, labels, labelColor }: Props) {
  const max = Math.max(...data, 1);

  return (
    <View style={styles.row}>
      {data.map((v, i) => (
        <View key={i} style={styles.col}>
          <Text style={[styles.value, { color: labelColor }]}>{v > 0 ? v : ''}</Text>
          <View style={[styles.track, { backgroundColor: `${appColors.primary}14` }]}>
            <View
              style={[
                styles.bar,
                {
                  height: `${Math.max(6, (v / max) * 100)}%`,
                  backgroundColor: v > 0 ? appColors.primary : `${appColors.primary}30`,
                },
              ]}
            />
          </View>
          <Text style={[styles.label, { color: labelColor }]}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 96 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  value: { fontSize: 9, fontWeight: '600', height: 12 },
  track: { width: '100%', height: 56, borderRadius: 5, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 5 },
  label: { fontSize: 9, letterSpacing: 1, fontWeight: '600' },
});
