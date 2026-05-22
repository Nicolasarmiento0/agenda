import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Appointment, HOUR_HEIGHT, STATUS_CONFIG, getPastelColors } from '../../constants/appointments';

type Colors = { textPrimary: string; textSecondary: string };

type Props = {
  appt: Appointment;
  columnWidth: number;
  onPress: () => void;
  startHour: number;
  isDarkMode: boolean;
  colors: Colors;
};

export default function AppointmentCard({ appt, columnWidth, onPress, startHour, isDarkMode, colors }: Props) {
  const top = (appt.startHour - startHour) * HOUR_HEIGHT;
  const height = Math.max(appt.durationHours * HOUR_HEIGHT - 4, 28);
  const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
  const isShort = height < 48;
  const isBlocked = appt.service === 'BLOQUEO';
  const pastel = getPastelColors(appt.id, isDarkMode);

  const glassColor = isBlocked
    ? (isDarkMode ? 'rgba(60,60,60,0.55)' : 'rgba(215,215,215,0.70)')
    : pastel.bg;

  const glassBorder = isBlocked
    ? (isDarkMode ? 'rgba(120,120,120,0.30)' : 'rgba(155,155,155,0.40)')
    : pastel.border;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        {
          top,
          height,
          width: columnWidth - 6,
          borderLeftColor: isBlocked ? (isDarkMode ? '#555555' : '#999999') : appt.workerColor,
          backgroundColor: glassColor,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: glassBorder,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: isBlocked ? (isDarkMode ? '#555555' : '#999999') : status.dot }]} />
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Text
          style={[styles.title, { color: isBlocked ? (isDarkMode ? '#AAAAAA' : '#999999') : colors.textPrimary }]}
          numberOfLines={1}
        >
          {isBlocked ? (appt.clientName || 'No disponible') : appt.service}
        </Text>
        {!isShort && !isBlocked && (
          <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
            {appt.clientName}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 3,
    borderRadius: 6,
    borderLeftWidth: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    overflow: 'hidden',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
    flexShrink: 0,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
    fontFamily: 'Inter_600SemiBold',
  },
  sub: {
    fontSize: 10,
    letterSpacing: 0.1,
    fontFamily: 'Inter_400Regular',
  },
});
