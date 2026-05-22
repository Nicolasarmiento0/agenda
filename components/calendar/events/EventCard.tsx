import * as Haptics from 'expo-haptics';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { getPastelColors, HOUR_HEIGHT, STATUS_CONFIG } from '../../../constants/appointments';
import { formatHour } from '../../agenda/agendaHelpers';
import { calendarTokens } from '../calendarTokens';
import { Appointment } from '../types';

interface EventCardProps {
  appt: Appointment;
  columnWidth: number;
  startHour: number;
  endHour: number;
  isDarkMode: boolean;
  /** Habilita long-press → drag para reagendar */
  canDrag?: boolean;
  onPress: (appt: Appointment) => void;
  /** Llamado al soltar en nueva hora (misma columna) */
  onDrop?: (apptId: string, newHour: number, workerId: string, date: string) => void;
}

export function EventCard({
  appt, columnWidth, startHour, endHour,
  isDarkMode, canDrag, onPress, onDrop,
}: EventCardProps) {
  const top = (appt.startHour - startHour) * HOUR_HEIGHT + 2;
  const height = Math.max(appt.durationHours * HOUR_HEIGHT - 4, calendarTokens.eventMinHeight);
  const colors = getPastelColors(appt.id, isDarkMode);
  const statusDot = STATUS_CONFIG[appt.status]?.dot;

  // ─── Shared values (UI thread) ─────────────────────────────────────────────
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const elevation = useSharedValue(2);
  const isDragging = useSharedValue(false);

  // ─── Stable callbacks (JS thread) ─────────────────────────────────────────
  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePress = () => onPress(appt);

  const handleDrop = (newHour: number) => {
    if (onDrop) onDrop(appt.id, newHour, appt.worker_id ?? '', appt.date ?? '');
  };

  // ─── Gestures ─────────────────────────────────────────────────────────────

  const tap = Gesture.Tap()
    .maxDuration(350)
    .onEnd(() => { runOnJS(handlePress)(); });

  const longPressVisual = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      scale.value = withSpring(1.04, { damping: 14 });
      runOnJS(triggerHaptic)();
    });

  // Pan activates after the same 400ms — prevents accidental drag during scroll
  const pan = Gesture.Pan()
    .activateAfterLongPress(400)
    .onStart(() => {
      isDragging.value = true;
      elevation.value = 100;
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (!isDragging.value) return;
      // Primitive captures — safe in worklet context
      const apptStart = appt.startHour;
      const apptDur   = appt.durationHours;
      const raw       = apptStart + e.translationY / HOUR_HEIGHT;
      const snapped   = Math.round(raw * 2) / 2;
      const clamped   = Math.max(startHour, Math.min(endHour - apptDur, snapped));
      if (clamped !== apptStart) {
        runOnJS(handleDrop)(clamped);
      }
    })
    .onFinalize(() => {
      isDragging.value = false;
      translateY.value = withSpring(0, { damping: 18 });
      scale.value = withSpring(1);
      elevation.value = 2;
    });

  const gesture = canDrag
    ? Gesture.Exclusive(Gesture.Simultaneous(longPressVisual, pan), tap)
    : tap;

  // ─── Animated style ───────────────────────────────────────────────────────
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: elevation.value,
    opacity: isDragging.value ? 0.88 : 1,
    shadowOpacity: isDragging.value ? 0.28 : 0.06,
    shadowRadius: isDragging.value ? 14 : 4,
    elevation: elevation.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessibilityRole="button"
        accessibilityLabel={`${appt.service} — ${appt.clientName || 'Reservado'} a las ${formatHour(appt.startHour)}`}
        style={[
          styles.card,
          {
            top,
            height,
            width: columnWidth - 6,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderRadius: calendarTokens.eventCardRadius,
          },
          animStyle,
        ]}
      >
        <View style={styles.header}>
          {statusDot && height > 28 && (
            <View style={[styles.dot, { backgroundColor: statusDot }]} />
          )}
          <Text
            style={[styles.service, { color: isDarkMode ? '#fff' : '#1a1a2e' }]}
            numberOfLines={1}
          >
            {appt.service}
          </Text>
        </View>

        {height > 44 && appt.clientName ? (
          <Text
            style={[styles.client, { color: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)' }]}
            numberOfLines={1}
          >
            {appt.clientName}
          </Text>
        ) : null}

        {height > 60 && (
          <Text
            style={[styles.time, { color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)' }]}
            numberOfLines={1}
          >
            {formatHour(appt.startHour)}–{formatHour(appt.startHour + appt.durationHours)}
          </Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 3,
    paddingHorizontal: calendarTokens.eventCardPaddingH,
    paddingVertical: calendarTokens.eventCardPaddingV,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  service: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  client: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
  time: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
  },
});
