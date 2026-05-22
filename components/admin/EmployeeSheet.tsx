import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { appColors } from '../../styles/appStyles';

export type Employee = {
  id: string;
  name: string;
  specialty: string;
  color: string;
  initials: string;
  active: boolean;
  appointmentsToday: number;
  availableDays: number[];
  email?: string;
  user_id?: string;
};

type Colors = {
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
};

type Props = {
  employee: Employee | null;
  visible: boolean;
  onClose: () => void;
  onAction: (action: 'edit' | 'toggleActive' | 'delete', emp: Employee) => void;
  colors: Colors;
};

export default function EmployeeSheet({ employee, visible, onClose, onAction, colors }: Props) {
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
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80) {
          onClose();
        } else {
          Animated.spring(slideY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (!employee) return null;

  const ACTIONS: { id: 'edit' | 'toggleActive' | 'delete'; icon: keyof typeof Feather.glyphMap; label: string; color: string }[] = [
    { id: 'edit', icon: 'edit-2', label: 'Editar', color: appColors.primary },
    {
      id: 'toggleActive',
      icon: employee.active ? 'pause-circle' : 'play-circle',
      label: employee.active ? 'Desactivar' : 'Activar',
      color: '#F0A030',
    },
    { id: 'delete', icon: 'trash-2', label: 'Eliminar', color: '#E24B4A' },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { backgroundColor: colors.surface, transform: [{ translateY: slideY }] }]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <View style={styles.top}>
          <View style={[styles.avatar, { backgroundColor: employee.color }]}>
            <Text style={styles.avatarText}>{employee.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{employee.name}</Text>
            <Text style={[styles.specialty, { color: colors.textSecondary }]}>{employee.specialty}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: employee.active ? '#EEF8F0' : '#FDEAEB' }]}>
            <Text style={[styles.badgeText, { color: employee.active ? '#2E7D45' : '#D00024' }]}>
              {employee.active ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          {ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.action}
              activeOpacity={0.7}
              onPress={() => {
                onClose();
                onAction(a.id, employee);
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${a.color}18` }]}>
                <Feather name={a.icon} size={18} color={a.color} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textSecondary }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
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
    marginBottom: 24,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  name: { fontSize: 16, fontWeight: '600' },
  specialty: { fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16 },
  action: { alignItems: 'center', gap: 6 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 11, letterSpacing: 0.2 },
});
