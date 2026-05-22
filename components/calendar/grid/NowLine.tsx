import React from 'react';
import { View } from 'react-native';
import { calendarTokens } from '../calendarTokens';

interface NowLineProps {
  top: number;
}

export function NowLine({ top }: NowLineProps) {
  const { nowDotSize, nowLineHeight, nowColor } = calendarTokens;
  const offset = nowDotSize / 2;

  return (
    <View
      style={{ position: 'absolute', left: 0, right: 0, top: top - offset, zIndex: 10, flexDirection: 'row', alignItems: 'center' }}
      pointerEvents="none"
    >
      <View
        style={{
          width: nowDotSize,
          height: nowDotSize,
          borderRadius: nowDotSize / 2,
          backgroundColor: nowColor,
          marginLeft: -nowDotSize / 2,
        }}
      />
      <View style={{ flex: 1, height: nowLineHeight, backgroundColor: nowColor }} />
    </View>
  );
}
