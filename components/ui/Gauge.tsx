import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { appColors } from '../../styles/appStyles';

type Props = {
  value: number;
  size?: number;
  trackColor: string;
  textColor: string;
  subColor: string;
};

const TICKS = 40;

export default function Gauge({ value, size = 128, trackColor, textColor, subColor }: Props) {
  const active = Math.round((value / 100) * TICKS);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: TICKS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.tickWrapper,
            { width: size, height: size, transform: [{ rotate: `${(360 / TICKS) * i}deg` }] },
          ]}
        >
          <View
            style={[
              styles.tick,
              { backgroundColor: i < active ? appColors.primary : trackColor },
            ]}
          />
        </View>
      ))}
      <Text style={{ fontSize: 30, fontWeight: '700', letterSpacing: -1, color: textColor }}>
        {value}
        <Text style={{ fontSize: 15, color: subColor }}>%</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tickWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  tick: {
    width: 3,
    height: 13,
    borderRadius: 2,
  },
});
