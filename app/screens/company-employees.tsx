import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors } from '../../styles/appStyles';

// ─── Tipos y Datos ────────────────────────────────────────────────────────────

type Employee = {
  id: string;
  name: string;
  specialty: string;
  color: string;
  initials: string;
  active: boolean;
  appointmentsToday: number;
  availableDays: number[];
};

// Se cargan desde Supabase
const INITIAL_EMPLOYEES: Employee[] = [];

const WEEK_DAYS = [
  { label: 'Lun', val: 1 },
  { label: 'Mar', val: 2 },
  { label: 'Mié', val: 3 },
  { label: 'Jue', val: 4 },
  { label: 'Vie', val: 5 },
  { label: 'Sáb', val: 6 },
  { label: 'Dom', val: 0 },
];

const PALETTE = ['#D00024', '#3B7BE0', '#3D9E5A', '#F0A030', '#8A2BE2', '#E24B4A'];

// ─── Componentes ──────────────────────────────────────────────────────────────

function EmployeeSheet({
  employee,
  visible,
  onClose,
  onAction,
  colors,
}: {
  employee: Employee | null;
  visible: boolean;
  onClose: () => void;
  onAction: (action: string, emp: Employee) => void;
  colors: any;
}) {
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
        if (g.dy > 80) { onClose(); }
        else { Animated.spring(slideY, { toValue: 0, useNativeDriver: true }).start(); }
      },
    })
  ).current;

  if (!employee) return null;

  const ACTIONS = [
    { id: 'edit', icon: 'edit-2', label: 'Editar', color: appColors.primary },
    { id: 'toggleActive', icon: employee.active ? 'pause-circle' : 'play-circle', label: employee.active ? 'Desactivar' : 'Activar', color: '#F0A030' },
    { id: 'delete', icon: 'trash-2', label: 'Eliminar', color: '#E24B4A' },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.sheetOverlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { backgroundColor: colors.surface, transform: [{ translateY: slideY }] }]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

        <View style={styles.sheetTop}>
          <View style={[styles.sheetWorkerDot, { backgroundColor: employee.color }]}>
            <Text style={styles.sheetWorkerInitial}>{employee.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sheetService, { color: colors.textPrimary }]}>{employee.name}</Text>
            <Text style={[styles.sheetClient, { color: colors.textSecondary }]}>{employee.specialty}</Text>
          </View>
          <View style={[styles.sheetBadge, { backgroundColor: employee.active ? '#EEF8F0' : '#FDEAEB' }]}>
            <Text style={[styles.sheetBadgeText, { color: employee.active ? '#2E7D45' : '#D00024' }]}>
              {employee.active ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>

        <View style={styles.sheetActions}>
          {ACTIONS.map((a) => (
            <TouchableOpacity key={a.label} style={styles.sheetAction} activeOpacity={0.7} onPress={() => { onClose(); onAction(a.id, employee); }}>
              <View style={[styles.sheetActionIcon, { backgroundColor: a.color + '18' }]}>
                <Feather name={a.icon as any} size={18} color={a.color} />
              </View>
              <Text style={[styles.sheetActionLabel, { color: colors.textSecondary }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

function EmployeeFormModal({
  visible,
  initialData,
  onClose,
  onSave,
  colors,
}: {
  visible: boolean;
  initialData?: Employee;
  onClose: () => void;
  onSave: (emp: Partial<Employee>) => void;
  colors: any;
}) {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [availableDays, setAvailableDays] = useState<number[]>([]);

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name);
        setSpecialty(initialData.specialty);
        setColor(initialData.color);
        setAvailableDays(initialData.availableDays || []);
      } else {
        setName('');
        setSpecialty('');
        setColor(PALETTE[0]);
        setAvailableDays([1, 2, 3, 4, 5]); // Lun-Vie default
      }
    }
  }, [visible, initialData]);

  const toggleDay = (val: number) => {
    setAvailableDays(prev => prev.includes(val) ? prev.filter(d => d !== val) : [...prev, val]);
  };

  const handleSave = () => {
    onSave({ name, specialty, color, availableDays });
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {initialData ? 'Editar Empleado' : 'Invitar Empleado'}
          </Text>

          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Nombre</Text>
          <TextInput
            style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.textSecondary}
            placeholder="Nombre del empleado"
          />

          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Especialidad</Text>
          <TextInput
            style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={specialty}
            onChangeText={setSpecialty}
            placeholderTextColor={colors.textSecondary}
            placeholder="Ej: Barbero, Manicurista"
          />

          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Color Identificador</Text>
          <View style={styles.modalRow}>
            {PALETTE.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorCircle, { backgroundColor: c, borderColor: color === c ? '#fff' : c, borderWidth: color === c ? 2 : 0 }]}
              />
            ))}
          </View>

          <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Días Disponibles</Text>
          <View style={styles.modalRow}>
            {WEEK_DAYS.map(d => {
              const selected = availableDays.includes(d.val);
              return (
                <TouchableOpacity
                  key={d.val}
                  onPress={() => toggleDay(d.val)}
                  style={[styles.modalChip, selected && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
                >
                  <Text style={[styles.modalChipText, selected ? { color: '#fff' } : { color: colors.textSecondary }]}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { borderColor: colors.border }]}>
              <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.modalBtn, { backgroundColor: appColors.primary, borderColor: appColors.primary }]}>
              <Text style={[styles.modalBtnText, { color: '#fff' }]}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Pantalla Principal ───────────────────────────────────────────────────────

export default function CompanyEmployeesScreen() {
  const { business } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);

  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | undefined>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const fetchEmployees = useCallback(async () => {
    if (!business?.id) return;
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching workers:', error);
      return;
    }

    const formatted: Employee[] = data.map(w => ({
      id: w.id,
      name: w.name,
      specialty: w.specialty || '',
      color: w.color || PALETTE[0],
      initials: w.name.substring(0, 2).toUpperCase(),
      active: w.active,
      appointmentsToday: 0, // TODO: calculate from appointments
      availableDays: w.available_days || [],
    }));
    setEmployees(formatted);
  }, [business?.id]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const stats = useMemo(() => {
    const total = employees.length;
    const activos = employees.filter(e => e.active).length;
    return [
      { label: 'TOTAL', value: String(total) },
      { label: 'ACTIVOS', value: String(activos) },
    ];
  }, [employees]);

  const openSheet = useCallback((emp: Employee) => {
    setSelectedEmp(emp);
    setSheetVisible(true);
  }, []);

  const handleSheetAction = useCallback(async (actionId: string, emp: Employee) => {
    if (actionId === 'toggleActive') {
      const { error } = await supabase.from('workers').update({ active: !emp.active }).eq('id', emp.id);
      if (!error) fetchEmployees();
    } else if (actionId === 'delete') {
      const { error } = await supabase.from('workers').delete().eq('id', emp.id);
      if (!error) fetchEmployees();
    } else if (actionId === 'edit') {
      setEditingEmp(emp);
      setFormVisible(true);
    }
  }, [fetchEmployees]);

  const handleSaveEmp = useCallback(async (data: Partial<Employee>) => {
    if (!business?.id) return;

    const workerData = {
      name: data.name || 'Sin nombre',
      specialty: data.specialty || '',
      color: data.color || PALETTE[0],
      available_days: data.availableDays || [],
    };

    if (editingEmp) {
      const { error } = await supabase.from('workers').update(workerData).eq('id', editingEmp.id);
      if (!error) fetchEmployees();
    } else {
      const { error } = await supabase.from('workers').insert([
        { ...workerData, business_id: business.id }
      ]);
      if (!error) fetchEmployees();
    }
  }, [editingEmp, business?.id, fetchEmployees]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 56 : 36 }]}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.iconBtn} activeOpacity={0.7}>
          <Feather name="menu" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>EMPLEADOS</Text>
        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn} activeOpacity={0.7}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Botón invitar */}
          <View style={{ paddingHorizontal: 16 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.addButton, { borderColor: appColors.primary }]}
              onPress={() => {
                setEditingEmp(undefined);
                setFormVisible(true);
              }}
            >
              <Feather name="user-plus" size={18} color={appColors.primary} />
              <Text style={[styles.addButtonText, { color: appColors.primary }]}>AGREGAR EMPLEADO</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {stats.map((stat, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Lista de empleados */}
          <View style={styles.listContainer}>
            {employees.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="users" size={28} color={colors.textSecondary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>SIN EMPLEADOS</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Invita a tu equipo para gestionar citas y servicios juntos.
                </Text>
              </View>
            ) : (
              employees.map(emp => (
                <TouchableOpacity
                  key={emp.id}
                  style={[styles.employeeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  activeOpacity={0.8}
                  onPress={() => openSheet(emp)}
                >
                  <View style={[styles.avatar, { backgroundColor: emp.color + '20', borderColor: emp.color }]}>
                    <Text style={[styles.avatarText, { color: emp.color }]}>{emp.initials}</Text>
                  </View>
                  <View style={styles.employeeInfo}>
                    <Text style={[styles.employeeName, { color: colors.textPrimary }]}>{emp.name}</Text>
                    <Text style={[styles.employeeSub, { color: colors.textSecondary }]}>{emp.specialty}</Text>
                  </View>
                  <View style={styles.employeeRight}>
                    <View style={[styles.statusBadge, { backgroundColor: emp.active ? '#EEF8F0' : '#FDEAEB' }]}>
                      <Text style={[styles.statusText, { color: emp.active ? '#2E7D45' : '#D00024' }]}>
                        {emp.active ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                    <Text style={[styles.citasText, { color: colors.textSecondary }]}>
                      {emp.appointmentsToday} citas hoy
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

        </Animated.View>
      </ScrollView>

      {/* ── Modals ─────────────────────────────────────────────── */}
      <EmployeeSheet
        employee={selectedEmp}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onAction={handleSheetAction}
        colors={colors}
      />

      <EmployeeFormModal
        visible={formVisible}
        initialData={editingEmp}
        onClose={() => setFormVisible(false)}
        onSave={handleSaveEmp}
        colors={colors}
      />

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statLabel: {
    fontSize: 9,
    letterSpacing: 2,
  },
  listContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  employeeSub: {
    fontSize: 13,
  },
  employeeRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  citasText: {
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 20,
  },

  // Bottom Sheet
  sheetOverlay: {
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
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  sheetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sheetWorkerDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetWorkerInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  sheetService: {
    fontSize: 16,
    fontWeight: '600',
  },
  sheetClient: {
    fontSize: 13,
    marginTop: 2,
  },
  sheetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sheetBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  sheetAction: {
    alignItems: 'center',
    gap: 6,
  },
  sheetActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // Modal Form
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  modalLabel: {
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.5,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#444',
  },
  modalChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 32,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 100,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
