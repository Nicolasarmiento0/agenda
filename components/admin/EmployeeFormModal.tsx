import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import GlassModal from '../GlassModal';
import { appColors, appStyles } from '../../styles/appStyles';

export type EmployeeFormData = {
  name: string;
  specialty: string;
  color: string;
  availableDays: number[];
  email?: string;
  password?: string;
};

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

type Colors = {
  textPrimary: string;
  textSecondary: string;
  border: string;
  surface: string;
};

type Props = {
  visible: boolean;
  initialData?: EmployeeFormData & { id?: string };
  onClose: () => void;
  onSave: (data: EmployeeFormData) => void;
  colors: Colors;
};

export default function EmployeeFormModal({ visible, initialData, onClose, onSave, colors }: Props) {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!visible) return;
    if (initialData) {
      setName(initialData.name);
      setSpecialty(initialData.specialty);
      setColor(initialData.color);
      setAvailableDays(initialData.availableDays ?? []);
      setEmail(initialData.email ?? '');
      setPassword('');
    } else {
      setName('');
      setSpecialty('');
      setColor(PALETTE[0]);
      setAvailableDays([1, 2, 3, 4, 5]);
      setEmail('');
      setPassword('');
    }
  }, [visible, initialData]);

  const toggleDay = (val: number) =>
    setAvailableDays((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
    );

  const handleSave = () => {
    onSave({ name, specialty, color, availableDays, email, password });
    onClose();
  };

  const isEditing = !!initialData;

  return (
    <GlassModal visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {isEditing ? 'Editar Empleado' : 'Invitar Empleado'}
      </Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre</Text>
      <TextInput
        style={[appStyles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
        value={name}
        onChangeText={setName}
        placeholderTextColor={colors.textSecondary}
        placeholder="Nombre del empleado"
      />

      <Text style={[styles.label, { color: colors.textSecondary }]}>Especialidad</Text>
      <TextInput
        style={[appStyles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
        value={specialty}
        onChangeText={setSpecialty}
        placeholderTextColor={colors.textSecondary}
        placeholder="Ej: Barbero, Manicurista"
      />

      {!isEditing && (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Correo de Acceso</Text>
          <TextInput
            style={[appStyles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={email}
            onChangeText={setEmail}
            placeholderTextColor={colors.textSecondary}
            placeholder="correo@empresa.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Contraseña Temporal</Text>
          <TextInput
            style={[appStyles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor={colors.textSecondary}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
          />
        </>
      )}

      <Text style={[styles.label, { color: colors.textSecondary }]}>Color Identificador</Text>
      <View style={styles.row}>
        {PALETTE.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.colorCircle,
              { backgroundColor: c, borderColor: color === c ? '#fff' : c, borderWidth: color === c ? 2 : 0 },
            ]}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Días Disponibles</Text>
      <View style={styles.row}>
        {WEEK_DAYS.map((d) => {
          const selected = availableDays.includes(d.val);
          return (
            <TouchableOpacity
              key={d.val}
              onPress={() => toggleDay(d.val)}
              style={[
                styles.chip,
                selected && { backgroundColor: appColors.primary, borderColor: appColors.primary },
                !selected && { borderColor: colors.border },
              ]}
            >
              <Text style={[styles.chipText, { color: selected ? '#111827' : colors.textSecondary }]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={appStyles.glassModalActions}>
        <TouchableOpacity
          onPress={onClose}
          style={[appStyles.glassModalBtn, { borderColor: colors.border }]}
        >
          <Text style={[appStyles.glassModalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={[appStyles.glassModalBtn, { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
        >
          <Text style={[appStyles.glassModalBtnText, { color: '#111827' }]}>Guardar</Text>
        </TouchableOpacity>
      </View>
    </GlassModal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  label: { fontSize: 12, marginBottom: 6, letterSpacing: 0.5, marginTop: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorCircle: { width: 32, height: 32, borderRadius: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 12, fontWeight: '500' },
});
