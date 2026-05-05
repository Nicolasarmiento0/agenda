import { Feather } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

export default function CompanyBusinessScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { profile, business, refreshProfile } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Form states
  const [name, setName] = useState(business?.name || '');
  const [description, setDescription] = useState(business?.description || '');
  const [mapsUrl, setMapsUrl] = useState(business?.maps_url || '');
  const [avatarUrl, setAvatarUrl] = useState(business?.avatar_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    if (business) {
      setName(business.name);
      setDescription(business.description || '');
      setMapsUrl(business.maps_url || '');
      setAvatarUrl(business.avatar_url || '');
    }
  }, [business]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        uploadImage(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir la galería');
    }
  };

  const uploadImage = async (base64File: string) => {
    if (!profile?.id) return;
    setIsUploading(true);
    try {
      // Usaremos el bucket de avatars para guardar el logo de la empresa.
      // Se podría crear un bucket específico "business_logos" pero esto requiere setup manual en supabase.
      const filePath = `${profile.id}/business_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64File), { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrlData.publicUrl);
    } catch (error: any) {
      Alert.alert('Error al subir imagen', error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!business?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          name,
          description,
          maps_url: mapsUrl,
          avatar_url: avatarUrl,
        })
        .eq('id', business.id);

      if (error) throw error;

      // Actualizar contexto global
      await refreshProfile();
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error al guardar', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const statusColor =
    business?.status === 'approved' ? '#4CAF50'
      : business?.status === 'pending' ? '#FFA726'
        : business?.status === 'rejected' ? '#EF5350'
          : appColors.primary;

  const statusLabel =
    business?.status === 'approved' ? 'NEGOCIO APROBADO'
      : business?.status === 'pending' ? 'PENDIENTE'
        : business?.status === 'rejected' ? 'RECHAZADO'
          : 'SUSPENDIDO';

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  return (
    <View style={[appStyles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={localStyles.header}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} activeOpacity={0.7} style={{ width: 40 }}>
          <Text style={[localStyles.hamburger, { color: colors.textPrimary }]}>≡</Text>
        </TouchableOpacity>
        <Text style={[localStyles.headerLabel, { color: colors.textSecondary }]}>MI NEGOCIO</Text>
        <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
          <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Badge */}
          <View style={localStyles.badge}>
            <View style={[localStyles.badgeDot, { backgroundColor: statusColor }]} />
            <Text style={[localStyles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>

          <Text style={[appStyles.title, { paddingVertical: 10, color: colors.textPrimary, textAlign: 'center' }]}>
            {business?.name ?? 'MI NEGOCIO'}
          </Text>

          {business?.avatar_url ? (
            <Image source={{ uri: business.avatar_url }} style={localStyles.profileImage} />
          ) : (
            <View style={[localStyles.profileImage, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
              <Feather name="image" size={32} color={colors.textSecondary} />
            </View>
          )}

          {business?.description ? (
            <View style={localStyles.aboutContainer}>
              <Text style={[localStyles.aboutTitle, { color: colors.textPrimary }]}>Acerca de nosotros</Text>
              <Text style={[localStyles.aboutText, { color: colors.textSecondary }]}>
                {business.description}
              </Text>
            </View>
          ) : null}

          <View style={[localStyles.divider, { backgroundColor: colors.border }]} />

          {/* Info cards */}
          {[
            //{ label: 'NOMBRE', value: business?.name ?? '—' },
            { label: 'DIRECCIÓN MAPS', value: business?.maps_url || 'No agregada', isLink: !!business?.maps_url },
            //{ label: 'PROPIETARIO', value: profile?.nickname ?? '—' },
            //{ label: 'ESTADO', value: statusLabel },
          ].map((item, i) => (
            <View key={i} style={[localStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[localStyles.cardLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              {item.isLink ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(item.value)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}
                >
                  <Text style={[localStyles.cardValue, { color: appColors.primary, textDecorationLine: 'underline' }]}>
                    Abrir en Maps
                  </Text>
                  <Feather name="external-link" size={14} color={appColors.primary} />
                </TouchableOpacity>
              ) : (
                <Text style={[localStyles.cardValue, { color: colors.textPrimary }]}>{item.value}</Text>
              )}
            </View>
          ))}

          {/* Botón editar */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setEditModalVisible(true)}
            style={[localStyles.editButton, { backgroundColor: appColors.primary }]}
          >
            <Feather name="edit-2" size={16} color="#fff" />
            <Text style={localStyles.editButtonText}>EDITAR INFORMACIÓN</Text>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>

      {/* Modal de Edición */}
      <Modal transparent visible={editModalVisible} animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={[localStyles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <View style={[localStyles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[localStyles.modalTitle, { color: colors.textPrimary }]}>Editar Negocio</Text>

              <TouchableOpacity style={localStyles.imagePickerContainer} onPress={pickImage} disabled={isUploading}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={localStyles.pickerImage} />
                ) : (
                  <View style={[localStyles.pickerImage, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                    <Feather name="camera" size={32} color={colors.textSecondary} />
                  </View>
                )}
                <View style={[localStyles.pickerBadge, { backgroundColor: appColors.primary }]}>
                  <Feather name="edit-2" size={12} color="#fff" />
                </View>
              </TouchableOpacity>
              {isUploading && <Text style={{ textAlign: 'center', color: appColors.primary, marginBottom: 16 }}>Subiendo imagen...</Text>}

              <Text style={[localStyles.modalLabel, { color: colors.textSecondary }]}>Nombre del negocio</Text>
              <TextInput
                style={[localStyles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={name}
                onChangeText={setName}
              />

              <Text style={[localStyles.modalLabel, { color: colors.textSecondary }]}>Descripción</Text>
              <TextInput
                style={[localStyles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface, height: 80 }]}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                placeholder="Cuenta sobre tu negocio..."
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[localStyles.modalLabel, { color: colors.textSecondary }]}>Enlace de Google Maps</Text>
              <TextInput
                style={[localStyles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={mapsUrl}
                onChangeText={setMapsUrl}
                placeholder="https://maps.app.goo.gl/..."
                placeholderTextColor={colors.textSecondary}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity
                  style={[localStyles.modalButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={[localStyles.modalButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[localStyles.modalButton, { backgroundColor: appColors.primary, borderColor: appColors.primary }]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  <Text style={[localStyles.modalButtonText, { color: '#fff' }]}>{isSaving ? 'Guardando...' : 'Guardar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 10, letterSpacing: 3 },
  divider: { height: 1, marginVertical: 28 },
  card: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 4,
  },
  cardLabel: { fontSize: 10, letterSpacing: 3 },
  cardValue: { fontSize: 14, letterSpacing: 0.5 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 4,
    marginTop: 8,
  },
  editButtonText: { color: '#fff', fontSize: 13, letterSpacing: 2, fontWeight: '600' },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  imagePickerContainer: {
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  pickerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  pickerBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 1,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  modalButton: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  aboutContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: -4,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
