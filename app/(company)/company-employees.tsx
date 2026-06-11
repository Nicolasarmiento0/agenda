import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import CompanyEmployeeFormModal from '../../components/company/CompanyEmployeeFormModal';
import CompanyEmployeeSheet, { Employee } from '../../components/company/CompanyEmployeeSheet';
import ScreenHeader from '../../components/ScreenHeader';
import Sidebar from '../../components/Sidebar';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseAnonKey, supabaseUrl } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

const PALETTE = ['#D00024', '#3B7BE0', '#3D9E5A', '#F0A030', '#8A2BE2', '#E24B4A'];

export default function CompanyEmployeesScreen() {
  const { business } = useAuth();
  const { showAlert } = useAlert();
  const { colors } = useTheme();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
      .select('*, profiles(avatar_url)')
      .eq('business_id', business.id)
      .order('created_at', { ascending: true });

    if (error) { console.error('Error fetching workers:', error); return; }

    setEmployees(data.map(w => ({
      id: w.id,
      name: w.name,
      specialty: w.specialty || '',
      color: w.color || PALETTE[0],
      initials: w.name.substring(0, 2).toUpperCase(),
      active: w.active,
      appointmentsToday: 0,
      availableDays: w.available_days || [],
      email: w.email || '',
      user_id: w.user_id,
      avatar_url: w.profiles?.avatar_url || null,
    })));
  }, [business?.id]);

  useFocusEffect(useCallback(() => { fetchEmployees(); }, [fetchEmployees]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  }, [fetchEmployees]);

  const stats = useMemo(() => [
    { label: 'TOTAL', value: String(employees.length) },
    { label: 'ACTIVOS', value: String(employees.filter(e => e.active).length) },
  ], [employees]);

  const openSheet = useCallback((emp: Employee) => {
    setSelectedEmp(emp);
    setSheetVisible(true);
  }, []);

  const handleSheetAction = useCallback(async (actionId: string, emp: Employee) => {
    if (actionId === 'toggleActive') {
      const { error } = await supabase.from('workers').update({ active: !emp.active }).eq('id', emp.id);
      if (!error) fetchEmployees();
    } else if (actionId === 'delete') {
      showAlert({
        title: 'ELIMINAR EMPLEADO',
        message: `¿Eliminar a ${emp.name}? Esta acción no se puede deshacer y eliminará su historial asociado.`,
        buttons: [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase.from('workers').delete().eq('id', emp.id);
              if (!error) fetchEmployees();
              else showAlert({ title: 'Error', message: 'No se pudo eliminar el empleado. Intenta nuevamente.' });
            },
          },
        ],
      });
    } else if (actionId === 'edit') {
      setEditingEmp(emp);
      setFormVisible(true);
    }
  }, [fetchEmployees]);

  const handleSaveEmp = useCallback(async (data: Partial<Employee> & { email?: string; password?: string }) => {
    if (!business?.id) return;

    const workerData: any = {
      name: data.name || 'Sin nombre',
      specialty: data.specialty || '',
      color: data.color || PALETTE[0],
      available_days: data.availableDays || [],
    };

    if (editingEmp) {
      const { error } = await supabase.from('workers').update(workerData).eq('id', editingEmp.id);
      if (!error) fetchEmployees();
      else showAlert({ title: 'Error', message: 'No se pudo actualizar el empleado.' });
    } else {
      if (!data.email || !data.password) {
        showAlert({ title: 'Atención', message: 'El correo y la contraseña son obligatorios para crear un nuevo trabajador.' });
        return;
      }

      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) { showAlert({ title: 'Error de Registro', message: authError.message }); return; }

      const newUserId = authData?.user?.id;
      if (newUserId) {
        await supabase.from('profiles').upsert({
          id: newUserId,
          role: 'worker',
          nickname: data.name || 'Trabajador',
        });
        workerData.user_id = newUserId;
        workerData.email = data.email;
      }

      const { error } = await supabase.from('workers').insert([{ ...workerData, business_id: business.id }]);
      if (!error) fetchEmployees();
      else showAlert({ title: 'Error', message: 'No se pudo vincular el empleado a la base de datos.' });
    }
  }, [editingEmp, business?.id, fetchEmployees]);

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader title="EMPLEADOS" onLeft={() => setSidebarVisible(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={{ marginBottom: 20 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.addButton, { borderColor: appColors.primary }]}
              onPress={() => { setEditingEmp(undefined); setFormVisible(true); }}
            >
              <Feather name="user-plus" size={18} color={appColors.primary} />
              <Text style={[styles.addButtonText, { color: appColors.primary }]}>AGREGAR EMPLEADO</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            {stats.map((stat, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

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
                    {emp.avatar_url ? (
                      <Image source={{ uri: emp.avatar_url }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                    ) : (
                      <Text style={[styles.avatarText, { color: emp.color }]}>{emp.initials}</Text>
                    )}
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

      <CompanyEmployeeSheet
        employee={selectedEmp}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onAction={handleSheetAction}
        colors={colors}
      />

      <CompanyEmployeeFormModal
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

const styles = StyleSheet.create({
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
  addButtonText: { fontSize: 12, letterSpacing: 2, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
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
  statValue: { fontSize: 22, fontWeight: '700', letterSpacing: 1, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 9, letterSpacing: 2, fontFamily: 'Inter_400Regular' },
  listContainer: { gap: 12 },
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
  avatarText: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: '600', marginBottom: 4, fontFamily: 'Inter_600SemiBold' },
  employeeSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  employeeRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, fontFamily: 'Inter_600SemiBold' },
  citasText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  emptyContainer: { alignItems: 'center', paddingVertical: 32, gap: 16 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 3, fontFamily: 'Inter_700Bold' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', letterSpacing: 0.5, lineHeight: 20, fontFamily: 'Inter_400Regular' },
});
