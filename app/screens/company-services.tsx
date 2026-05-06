import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
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
import Sidebar from '../../components/Sidebar';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

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

  const fetchServices = React.useCallback(async () => {
    if (!business?.id) return;

    try {
      const { data, error } = await supabase
        .from('business_services')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true);

      if (error) {
        console.warn('Error fetching services, using placeholders:', error);
        // No alertar en cada fetch para no molestar, pero dejar log
      }

      if (!error && data && data.length > 0) {
        setServices(data);
      } else {
        // Fallback to defaults
        setServices([
          { id: 'p1', name: 'Servicio 1', price: 10000 },
          { id: 'p2', name: 'Servicio 2', price: 10000 },
          { id: 'p3', name: 'Servicio 3', price: 10000 },
        ]);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  }, [business?.id]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

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
      if (editingService.id === 'new' || (typeof editingService.id === 'string' && editingService.id.startsWith('p'))) {
        if (!business?.id) {
          showAlert({ title: 'Error', message: 'No se encontró la información del negocio. Intenta recargar.' });
          return;
        }
        const { error } = await supabase
          .from('business_services')
          .insert({
            business_id: business.id,
            name: editName,
            price: parseFloat(editPrice) || 0,
            duration_min: 30,
            is_active: true
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('business_services')
          .update({ 
            name: editName, 
            price: parseFloat(editPrice) || 0 
          })
          .eq('id', editingService.id);
        if (error) throw error;

        // Si el nombre cambió, actualizar todas las citas existentes que usaban el nombre antiguo
        if (editingService.name && editingService.name !== editName && business?.id) {
          const { error: apptError } = await supabase
            .from('appointments')
            .update({ service: editName })
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
          <View style={[localStyles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
            <TextInput
              style={[localStyles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Ej: Corte y Barba"
              placeholderTextColor={colors.textSecondary}
            />

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
