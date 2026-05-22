import React from 'react';
import { Text, View } from 'react-native';
import { HOUR_HEIGHT } from '../../../constants/appointments';
import { formatHour } from '../../agenda/agendaHelpers';
import { calendarTokens } from '../calendarTokens';

interface GhostEventProps {
  top: number;
  width: number;
  hour: number;
  isDarkMode: boolean;
}

export function GhostEvent({ top, width, hour, isDarkMode }: GhostEventProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 3,
        top: top + 2,
        width: width - 6,
        height: HOUR_HEIGHT / 2 - 4,
        borderRadius: calendarTokens.ghostRadius,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: isDarkMode ? calendarTokens.ghostBorderDark : calendarTokens.ghostBorderLight,
        backgroundColor: isDarkMode ? calendarTokens.ghostBgDark : calendarTokens.ghostBgLight,
        justifyContent: 'center',
        paddingHorizontal: 6,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '500',
          color: isDarkMode ? 'rgba(180,247,54,0.8)' : 'rgba(50,120,0,0.7)',
        }}
      >
        {formatHour(hour)}
      </Text>
    </View>
  );
}
