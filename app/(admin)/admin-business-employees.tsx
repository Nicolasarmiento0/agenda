import { Feather } from '@expo/vector-icons';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import GlassCard from '../../components/GlassCard';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import EmployeeSheet, { Employee } from '../../components/admin/EmployeeSheet';
import EmployeeFormModal, { EmployeeFormData } from '../../components/admin/EmployeeFormModal';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseAnonKey, supabaseUrl } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

const PALETTE = ['#D00024', '#3B7BE0', '#3D9E5A', '#F0A030', '#8A2BE2', '#E24B4A'];

export default function AdminBusinessEmployeesScreen() {
  const { id: businessId } = useLocalSearchParams<{ id: string }>();
  const { showAlert } = useAlert();
  const { colors, isDarkMode, toggleTheme } = useTheme();
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
    if (!businessId) return;
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error) return;

    setEmployees(
      data.map((w) => ({
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
      }))
    );
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [fetchEmployees])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  }, [fetchEmployees]);

  const stats = useMemo(() => {
    const total = employees.length;
    const activos = employees.filter((e) => e.active).length;
    return [
      { label: 'TOTAL', value: String(total) },
      { label: 'ACTIVOS', value: String(activos) },
    ];
  }, [employees]);

  const openSheet = useCallback((emp: Employee) => {
    setSelectedEmp(emp);
    setSheetVisible(true);
  }, []);

  const handleSheetAction = useCallback(
    async (actionId: 'edit' | 'toggleActive' | 'delete', emp: Employee) => {
      if (actionId === 'toggleActive') {
        const { error } = await supabase.from('workers').update({ active: !emp.active }).eq('id', emp.id);
        if (!error) fetchEmployees();
      } else if (actionId === 'delete') {
        showAlert({
          title: 'ELIMINAR EMPLEADO',
          message: `¿Eliminar a ${emp.name}? Esta acción no se puede deshacer.`,
          buttons: [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: async () => {
                const { error } = await supabase.from('workers').delete().eq('id', emp.id);
                if (!error) {
                  fetchEmployees();
                } else {
                  showAlert({ title: 'Error', message: 'No se pudo eliminar el empleado.' });
                }
              },
            },
          ],
        });
      } else if (actionId === 'edit') {
        setEditingEmp(emp);
        setFormVisible(true);
      }
    },
    [fetchEmployees]
  );

  const handleSaveEmp = useCallback(
    async (data: EmployeeFormData) => {
      if (!businessId) return;

      const workerData: Record<string, unknown> = {
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
          showAlert({ title: 'Atención', message: 'El correo y la contraseña son obligatorios.' });
          return;
        }

        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email: data.email,
          password: data.password,
        });

        if (authError) {
          showAlert({ title: 'Error de Registro', message: authError.message });
          return;
        }

        const newUserId = authData?.user?.id;
        if (!newUserId) {
          showAlert({ title: 'Error', message: 'No se pudo obtener el ID del nuevo usuario.' });
          return;
        }

        const { error: profileError } = await supabase.from('profiles').upsert({
          id: newUserId,
          role: 'worker',
          nickname: data.name || 'Trabajador',
        });

        if (profileError) {
          showAlert({ title: 'Error de perfil', message: profileError.message });
          return;
        }

        workerData.user_id = newUserId;
        workerData.email = data.email;

        const { error } = await supabase
          .from('workers')
          .insert([{ ...workerData, business_id: businessId }]);

        if (!error) fetchEmployees();
        else showAlert({ title: 'Error DB', message: error.message });
      }
    },
    [editingEmp, businessId, fetchEmployees]
  );

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="GESTIÓN DE EQUIPO"
        onLeft={() => {
          if (router.canGoBack()) {
            router.back();
          } else if (businessId) {
            router.replace({ pathname: '/admin-business-detail', params: { id: businessId } });
          } else {
            router.replace('/admin-dashboard');
          }
        }}
        leftIcon="arrow-left"
        paddingTop={Platform.OS === 'ios' ? 56 : 36}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Botón invitar - Ocultado para rol admin de monitoreo */}

          {/* Stats */}
          <View style={styles.statsRow}>
            {stats.map((stat, i) => (
              <GlassCard key={i} style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
              </GlassCard>
            ))}
          </View>

          {/* Lista de empleados */}
          <View style={styles.listContainer}>
            {employees.length === 0 ? (
              <EmptyState
                icon="users"
                title="SIN EMPLEADOS"
                subtitle="El negocio no tiene trabajadores registrados."
              />
            ) : (
              employees.map((emp) => (
                <GlassCard key={emp.id} style={styles.employeeCard}>
                  <TouchableOpacity
                    activeOpacity={1}
                    disabled={true}
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 16 }}
                  >
                    <View style={[styles.avatar, { backgroundColor: `${emp.color}20`, borderColor: emp.color }]}>
                      <Text style={[styles.avatarText, { color: emp.color }]}>{emp.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
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
                </GlassCard>
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
    marginBottom: 20,
  },
  addButtonText: { fontSize: 12, letterSpacing: 2, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 20, paddingVertical: 16, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  statLabel: { fontSize: 9, letterSpacing: 2, fontFamily: 'Inter_400Regular' },
  listContainer: { gap: 12 },
  employeeCard: { padding: 16, borderRadius: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  employeeName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  employeeSub: { fontSize: 13 },
  employeeRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  citasText: { fontSize: 11 },
});
