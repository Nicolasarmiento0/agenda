import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GlassInput from '../GlassInput';
import { useTheme } from '../../context/ThemeContext';
import { appColors, glassColors } from '../../styles/appStyles';
import type { Employee } from './CompanyEmployeeSheet';

const PALETTE = ['#D00024', '#3B7BE0', '#3D9E5A', '#F0A030', '#8A2BE2', '#E24B4A'];

const WEEK_DAYS = [
  { label: 'Lun', val: 1 },
  { label: 'Mar', val: 2 },
  { label: 'Mié', val: 3 },
  { label: 'Jue', val: 4 },
  { label: 'Vie', val: 5 },
  { label: 'Sáb', val: 6 },
  { label: 'Dom', val: 0 },
];

type Props = {
  visible: boolean;
  initialData?: Employee;
  onClose: () => void;
  onSave: (emp: Partial<Employee> & { email?: string; password?: string }) => void;
  colors: { textPrimary: string; textSecondary: string; border: string };
};

export default function CompanyEmployeeFormModal({ visible, initialData, onClose, onSave, colors }: Props) {
  const { isDarkMode } = useTheme();
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [availableDays, setAvailableDays] = useState<number[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name);
        setSpecialty(initialData.specialty);
        setColor(initialData.color);
        setAvailableDays(initialData.availableDays || []);
        setEmail(initialData.email || '');
        setPassword('');
      } else {
        setName('');
        setSpecialty('');
        setColor(PALETTE[0]);
        setAvailableDays([1, 2, 3, 4, 5]);
        setEmail('');
        setPassword('');
      }
    }
  }, [visible, initialData]);

  const toggleDay = (val: number) => {
    setAvailableDays(prev => prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]);
  };

  const handleSave = () => {
    onSave({ name, specialty, color, availableDays, email, password } as any);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={styles.blurCard}>
          <View style={[styles.content, !isDarkMode && styles.contentLight]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {initialData ? 'Editar Empleado' : 'Invitar Empleado'}
            </Text>

            <GlassInput
              value={name}
              onChangeText={setName}
              placeholder="Nombre del empleado"
              label="Nombre"
              style={{ marginBottom: 4 }}
            />

            <GlassInput
              value={specialty}
              onChangeText={setSpecialty}
              placeholder="Ej: Barbero, Manicurista"
              label="Especialidad"
              style={{ marginTop: 12, marginBottom: 4 }}
            />

            {!initialData && (
              <>
                <GlassInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ej: carlos@empresa.com"
                  label="Correo de Acceso (Obligatorio)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{ marginTop: 12, marginBottom: 4 }}
                />
                <GlassInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  label="Contraseña Temporal (Obligatorio)"
                  secureTextEntry
                  style={{ marginTop: 12, marginBottom: 4 }}
                />
              </>
            )}

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Color Identificador</Text>
            <View style={styles.row}>
              {PALETTE.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[styles.colorCircle, { backgroundColor: c, borderColor: color === c ? '#fff' : c, borderWidth: color === c ? 2 : 0 }]}
                />
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Días Disponibles</Text>
            <View style={styles.row}>
              {WEEK_DAYS.map(d => {
                const selected = availableDays.includes(d.val);
                return (
                  <TouchableOpacity
                    key={d.val}
                    onPress={() => toggleDay(d.val)}
                    style={[styles.chip, { borderColor: colors.border }, selected && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
                  >
                    <Text style={[styles.chipText, { color: selected ? '#fff' : colors.textSecondary }]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity onPress={onClose} style={[styles.btn, { borderColor: colors.border }]}>
                <Text style={[styles.btnText, { color: colors.textPrimary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.btn, { backgroundColor: appColors.primary, borderColor: appColors.primary }]}>
                <Text style={[styles.btnText, { color: '#fff' }]}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: glassColors.overlayMedium,
    justifyContent: 'center',
    padding: 24,
  },
  blurCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: glassColors.borderDarkMedium,
  },
  content: {
    backgroundColor: glassColors.sheetModalDark,
    padding: 24,
  },
  contentLight: {
    backgroundColor: glassColors.sheetModalLight,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.5,
    fontFamily: 'Inter_700Bold',
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorCircle: { width: 32, height: 32, borderRadius: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 12, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 100,
    alignItems: 'center',
  },
  btnText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, fontFamily: 'Inter_600SemiBold' },
});
