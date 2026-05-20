import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  View,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import Sidebar from '../../../../components/Sidebar';
import { useAlert } from '../../../../context/AlertContext';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles } from '../../../../styles/appStyles';

export default function CompanyServicesScreen() {
  const { business } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [editingService, setEditingService] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [isGym, setIsGym] = useState(false);

  const fetchServices = React.useCallback(async () => {
    if (!business?.id) return;

    try {
      let gymFlag = false;
      if (business?.category_id) {
        const { data: cat } = await supabase
          .from('service_categories')
          .select('name')
          .eq('id', business.category_id)
          .single();
        gymFlag = !!(cat?.name?.toUpperCase().includes('GIMNASIO') || cat?.name?.toUpperCase().includes('FITNESS'));
        setIsGym(gymFlag);
      }

      const { data, error } = await supabase
        .from('business_services')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true);

      if (error) {
        console.warn('Error fetching services:', error);
      }

      if (gymFlag) {
        // Enforce the existence of the 3 plans
        const planNames = ['Plan Básico', 'Plan Premium', 'Plan VIP'];
        const existingPlans = data ? data.filter(s => planNames.includes(s.name)) : [];
        if (existingPlans.length < 3) {
          const defaultPrices: Record<string, number> = { 'Plan Básico': 15000, 'Plan Premium': 25000, 'Plan VIP': 35000 };
          const plansToCreate = planNames.filter(name => !existingPlans.some(p => p.name === name));
          
          if (plansToCreate.length > 0) {
            const inserts = plansToCreate.map(name => ({
              business_id: business.id,
              name,
              price: defaultPrices[name],
              duration_min: 30,
              is_active: true
            }));
            const { data: newPlans, error: insertError } = await supabase
              .from('business_services')
              .insert(inserts)
              .select('*');
              
            if (!insertError && newPlans) {
              setServices([...(data || []), ...newPlans].sort((a, b) => a.name.localeCompare(b.name)));
              return;
            }
          }
        }
      }

      if (!error && data && data.length > 0) {
        setServices(data.sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setServices([]);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  }, [business?.id]);

  // Refresca servicios cada vez que la pantalla gana foco
  useFocusEffect(useCallback(() => {
    fetchServices();
  }, [fetchServices]));

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
  }, [fetchServices]);

  const handleAddPress = () => {
    setEditingService({ id: 'new' });
    setEditName('');
    setEditPrice('');
  };

  const handleEditPress = (service: any) => {
    setEditingService(service);
    setEditName(service.name || '');
    setEditPrice(String(service.price || ''));
  };

  const handleSaveEdit = async () => {
    if (!editingService || isSaving) return;
    setIsSaving(true);
    try {
      let finalName = editName;

      if (editingService.id === 'new' || (typeof editingService.id === 'string' && editingService.id.startsWith('p'))) {
        if (!business?.id) {
          showAlert({ title: 'Error', message: 'No se encontró la información del negocio. Intenta recargar.' });
          return;
        }

        if (isGym) {
          // Si es gym, solo puede crear estos servicios extra, no puede crear planes adicionales
          if (editName !== 'Taller Extraprogramático' && editName !== 'Evaluación') {
            showAlert({ title: 'Atención', message: 'Los gimnasios solo pueden agregar "Taller Extraprogramático" o "Evaluación". Los planes base ya existen.' });
            setIsSaving(false);
            return;
          }
        }

        const { error } = await supabase
          .from('business_services')
          .insert({
            business_id: business.id,
            name: finalName,
            price: parseFloat(editPrice) || 0,
            duration_min: 30,
            is_active: true
          });
        if (error) throw error;
      } else {
        const isBasePlan = ['Plan Básico', 'Plan Premium', 'Plan VIP'].includes(editingService.name);
        if (isGym && isBasePlan) {
          finalName = editingService.name; // Cannot change name of base plan
        }

        const { error } = await supabase
          .from('business_services')
          .update({ 
            name: finalName, 
            price: parseFloat(editPrice) || 0 
          })
          .eq('id', editingService.id);
        if (error) throw error;

        // Si el nombre cambió, actualizar todas las citas existentes que usaban el nombre antiguo
        if (editingService.name && editingService.name !== finalName && business?.id) {
          const { error: apptError } = await supabase
            .from('appointments')
            .update({ service: finalName })
            .eq('business_id', business.id)
            .eq('service', editingService.name);
          
          if (apptError) console.error('Error updating appointments service name:', apptError);
        }
      }
      
      setEditingService(null);
      await fetchServices();
    } catch (err: any) {
      console.error('Error saving service:', err);
      showAlert({ title: 'Error', message: 'No se pudo guardar el servicio: ' + (err.message || 'Error desconocido') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = () => {
    // Guardamos la referencia antes de cerrar el modal
    const serviceToDelete = editingService;
    if (!serviceToDelete || serviceToDelete.id === 'new') return;

    const isBasePlan = ['Plan Básico', 'Plan Premium', 'Plan VIP'].includes(serviceToDelete.name);
    if (isGym && isBasePlan) {
      showAlert({ title: 'No Permitido', message: 'Los planes de gimnasio no se pueden eliminar. Solo puedes modificar su precio.' });
      return;
    }

    // Cerramos el modal de edición primero para evitar que bloquee la alerta
    setEditingService(null);

    // Pequeño delay para asegurar que el modal se cierre antes de mostrar la alerta
    setTimeout(() => {
      showAlert({
        title: 'Eliminar Servicio',
        message: '¿Estás seguro de que quieres eliminar este servicio?',
        buttons: [
          { 
            text: 'CANCELAR', 
            style: 'cancel',
            onPress: () => {
              // Si cancela, podemos volver a abrir el modal si fuera necesario, 
              // pero lo usual es quedarse en la lista.
              setEditingService(serviceToDelete);
            }
          },
          { 
            text: 'ELIMINAR', 
            style: 'destructive', 
            onPress: async () => {
              setIsSaving(true);
              try {
                const { error } = await supabase
                  .from('business_services')
                  .delete()
                  .eq('id', serviceToDelete.id);

                if (error) throw error;

                await fetchServices();
                showAlert({ title: 'Éxito', message: 'Servicio eliminado correctamente' });
              } catch (err: any) {
                console.error('Error deleting service:', err);
                showAlert({ title: 'Error', message: 'No se pudo eliminar el servicio: ' + (err.message || 'Error desconocido') });
              } finally {
                setIsSaving(false);
              }
            }
          }
        ]
      });
    }, 300);
  };

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

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={localStyles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} activeOpacity={0.7} style={{ width: 40 }}>
          <Text style={[localStyles.hamburger, { color: colors.textPrimary }]}>≡</Text>
        </TouchableOpacity>
        <Text style={[localStyles.headerLabel, { color: colors.textSecondary }]}>SERVICIOS</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Botón agregar */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAddPress}
            style={[localStyles.addButton, { borderColor: appColors.primary }]}
          >
            <Feather name="plus" size={18} color={appColors.primary} />
            <Text style={[localStyles.addButtonText, { color: appColors.primary }]}>AGREGAR SERVICIO</Text>
          </TouchableOpacity>

          {/* Listado de servicios */}
          {services.length > 0 ? (
            <View style={{ gap: 12 }}>
              {services.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  onPress={() => handleEditPress(item)}
                  style={[localStyles.serviceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[localStyles.serviceName, { color: colors.textPrimary }]}>
                      {item.name || 'Servicio sin nombre'}
                    </Text>
                    <Text style={[localStyles.servicePrice, { color: appColors.primary }]}>
                      ${Number(item.price || 0).toLocaleString('es-CL')}
                    </Text>
                  </View>
                  <View style={[localStyles.editBadge, { backgroundColor: colors.background }]}>
                    <Feather name="edit-2" size={14} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            /* Estado vacío */
            <View style={localStyles.emptyContainer}>
              <View style={[localStyles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="list" size={28} color={colors.textSecondary} />
              </View>
              <Text style={[localStyles.emptyTitle, { color: colors.textPrimary }]}>SIN SERVICIOS</Text>
              <Text style={[localStyles.emptySubtitle, { color: colors.textSecondary }]}>
                Aún no has creado ningún servicio.{'\n'}Agrega tus primeros servicios para que los clientes puedan reservar.
              </Text>
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* Modal de Edición / Creación */}
      <Modal visible={!!editingService} transparent animationType="fade">
        <View style={localStyles.modalOverlay}>
          <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={localStyles.blurCard}>
            <View style={[localStyles.glassContent, !isDarkMode && localStyles.glassContentLight]}>
            <View style={localStyles.modalHeader}>
              <Text style={[localStyles.modalTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                {editingService?.id === 'new' ? 'Nuevo Servicio' : 'Editar Servicio'}
              </Text>
              {editingService?.id !== 'new' && (
                <TouchableOpacity onPress={handleDeleteService} disabled={isSaving}>
                  <Feather name="trash-2" size={20} color="#E24B4A" />
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={[localStyles.label, { color: colors.textSecondary, marginTop: 20 }]}>NOMBRE DEL SERVICIO</Text>
            {isGym && editingService?.id !== 'new' && ['Plan Básico', 'Plan Premium', 'Plan VIP'].includes(editingService?.name) ? (
              <Text style={[localStyles.input, { color: colors.textSecondary, borderColor: colors.border, backgroundColor: colors.background, opacity: 0.6 }]}>
                {editName}
              </Text>
            ) : isGym && editingService?.id === 'new' ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity 
                  onPress={() => setEditName('Taller Extraprogramático')}
                  style={[localStyles.modalBtn, { flex: 1, paddingHorizontal: 10, borderColor: editName === 'Taller Extraprogramático' ? appColors.primary : colors.border }]}
                >
                  <Text style={{ fontSize: 12, color: editName === 'Taller Extraprogramático' ? appColors.primary : colors.textSecondary, textAlign: 'center' }}>Taller Extraprogramático</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setEditName('Evaluación')}
                  style={[localStyles.modalBtn, { flex: 1, paddingHorizontal: 10, borderColor: editName === 'Evaluación' ? appColors.primary : colors.border }]}
                >
                  <Text style={{ fontSize: 12, color: editName === 'Evaluación' ? appColors.primary : colors.textSecondary, textAlign: 'center' }}>Evaluación</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TextInput
                style={[localStyles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Ej: Corte y Barba"
                placeholderTextColor={colors.textSecondary}
              />
            )}

            <Text style={[localStyles.label, { color: colors.textSecondary, marginTop: 16 }]}>PRECIO ($)</Text>
            <TextInput
              style={[localStyles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="numeric"
              placeholder="Ej: 15000"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={localStyles.modalActions}>
              <TouchableOpacity 
                style={[localStyles.modalBtn, { borderColor: colors.border }]} 
                onPress={() => setEditingService(null)}
              >
                <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[localStyles.modalBtn, { backgroundColor: appColors.primary, borderColor: appColors.primary }]} 
                onPress={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const localStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
  },
  hamburger: { fontSize: 26 },
  headerLabel: { fontSize: 11, letterSpacing: 3 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 14,
    justifyContent: 'center',
    marginBottom: 28,
  },
  addButtonText: { fontSize: 12, letterSpacing: 2, fontWeight: '600' },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', letterSpacing: 3 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', letterSpacing: 0.5, lineHeight: 20 },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  serviceName: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  servicePrice: { fontSize: 13, fontWeight: '600' },
  editBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  blurCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  glassContent: {
    backgroundColor: 'rgba(16,16,16,0.82)',
    padding: 24,
  },
  glassContentLight: {
    backgroundColor: 'rgba(250,250,250,0.90)',
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: 1,
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 32,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
});
