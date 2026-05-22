import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Appointment, STATUS_CONFIG } from '../../constants/appointments';
import { appColors, glassColors } from '../../styles/appStyles';
import { formatHour } from './agendaHelpers';

type Colors = { textPrimary: string; textSecondary: string; border: string };

type Props = {
  appt: Appointment | null;
  visible: boolean;
  onClose: () => void;
  onAction: (action: string, appt: Appointment) => void;
  isGym?: boolean;
  colors: Colors;
  isDarkMode: boolean;
};

export default function AppointmentSheet({ appt, visible, onClose, onAction, isGym = false, colors, isDarkMode }: Props) {
  const slideY = useRef(new Animated.Value(400)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: 400, duration: 250, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => { if (g.dy > 0) slideY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80) { onClose(); }
        else { Animated.spring(slideY, { toValue: 0, useNativeDriver: true }).start(); }
      },
    })
  ).current;

  if (!appt) return null;

  const status = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
  const endHour = appt.startHour + appt.durationHours;
  const isBlocked = appt.service === 'BLOQUEO';

  const ACTIONS = isBlocked
    ? [{ id: 'cancel', icon: 'unlock', label: 'Desbloquear', color: '#E24B4A' }]
    : appt.status === 'pending'
    ? [
        { id: 'confirm',     icon: 'check-circle', label: 'Confirmar',                       color: '#3D9E5A' },
        { id: 'rescheduled', icon: 'clock',         label: 'Reprogramar',                     color: '#F39C12' },
        { id: 'edit',        icon: 'edit-2',        label: 'Editar',                          color: appColors.primary },
        { id: 'no-show',     icon: 'user-x',        label: isGym ? 'No asistió' : 'No Show', color: '#D00024' },
        { id: 'cancel',      icon: 'x-circle',      label: 'Cancelar',                        color: '#E24B4A' },
      ]
    : appt.status === 'confirmed'
    ? [
        { id: 'complete',    icon: 'check-square',  label: isGym ? 'Asistió' : 'Completar',  color: '#5C90D2' },
        { id: 'rescheduled', icon: 'clock',         label: 'Reprogramar',                     color: '#F39C12' },
        { id: 'edit',        icon: 'edit-2',        label: 'Editar',                          color: appColors.primary },
        { id: 'no-show',     icon: 'user-x',        label: isGym ? 'No asistió' : 'No Show', color: '#D00024' },
        { id: 'cancel',      icon: 'x-circle',      label: 'Cancelar',                        color: '#E24B4A' },
      ]
    : appt.status === 'rescheduled'
    ? [
        { id: 'confirm',     icon: 'check-circle', label: 'Confirmar',                       color: '#3D9E5A' },
        { id: 'complete',    icon: 'check-square',  label: isGym ? 'Asistió' : 'Completar',  color: '#5C90D2' },
        { id: 'edit',        icon: 'edit-2',        label: 'Editar',                          color: appColors.primary },
        { id: 'no-show',     icon: 'user-x',        label: isGym ? 'No asistió' : 'No Show', color: '#D00024' },
        { id: 'cancel',      icon: 'x-circle',      label: 'Cancelar',                        color: '#E24B4A' },
      ]
    : [];

  const sheetBg = isDarkMode ? glassColors.sheetDarkAlt : glassColors.sheetLightAlt;
  const sheetBorder = isDarkMode ? glassColors.borderDarkSubtle : glassColors.borderLightSubtle;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, pointerEvents: visible ? 'auto' : 'none' }, !visible && { opacity: 0 }]}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideY }], overflow: 'hidden' }]}
        {...panResponder.panHandlers}
      >
        <BlurView
          intensity={isDarkMode ? 60 : 80}
          tint={isDarkMode ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}
        />
        <View style={[StyleSheet.absoluteFill, {
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: sheetBg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: sheetBorder,
        }]} />

        <View style={[styles.handle, { backgroundColor: isDarkMode ? glassColors.handleDark : glassColors.handleLight }]} />

        <View style={styles.top}>
          <View style={[styles.workerDot, { backgroundColor: appt.workerColor }]}>
            <Text style={styles.workerInitial}>{appt.worker[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.service, { color: colors.textPrimary }]}>{appt.service}</Text>
            <Text style={[styles.client, { color: colors.textSecondary }]}>{appt.clientName}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        <View style={[styles.details, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <View style={styles.detailRow}>
            <Feather name="clock" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {formatHour(appt.startHour)} – {formatHour(endHour)}
              {'  ·  '}{Math.round(appt.durationHours * 60)} min
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Feather name="user" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>{appt.worker}</Text>
          </View>
          {!!appt.notes && (
            <View style={styles.detailRow}>
              <Feather name="file-text" size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary, flex: 1 }]} numberOfLines={3}>
                {appt.notes}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.action}
              activeOpacity={0.7}
              onPress={() => { onClose(); onAction(a.id, appt); }}
            >
              <View style={[styles.actionIcon, { backgroundColor: a.color + '18' }]}>
                <Feather name={a.icon as keyof typeof Feather.glyphMap} size={18} color={a.color} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: glassColors.overlayMedium,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 280,
    paddingBottom: 30,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  workerDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  service: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  client: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  details: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  action: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
