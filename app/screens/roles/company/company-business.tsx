import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
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
  TouchableOpacity,
  View,
} from 'react-native';
import GlassInput from '../../../../components/GlassInput';
import ScreenHeader from '../../../../components/ScreenHeader';
import Sidebar from '../../../../components/Sidebar';
import { useAlert } from '../../../../context/AlertContext';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';
import { appColors, appStyles, glassColors } from '../../../../styles/appStyles';

export default function CompanyBusinessScreen() {
  const { colors, isDarkMode } = useTheme();
  const { profile, business, refreshProfile } = useAuth();
  const { showAlert } = useAlert();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Form states
  const [name, setName] = useState(business?.name || '');
  const [description, setDescription] = useState(business?.description || '');
  const [mapsUrl, setMapsUrl] = useState(business?.maps_url || '');
  const [instagramUrl, setInstagramUrl] = useState(business?.instagram_url || '');
  const [avatarUrl, setAvatarUrl] = useState(business?.avatar_url || '');
  const [openingTime, setOpeningTime] = useState(business?.opening_time?.substring(0, 5) || '07:00');
  const [closingTime, setClosingTime] = useState(business?.closing_time?.substring(0, 5) || '22:00');
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
      setInstagramUrl(business.instagram_url || '');
      setAvatarUrl(business.avatar_url || '');
      setOpeningTime(business.opening_time?.substring(0, 5) || '07:00');
      setClosingTime(business.closing_time?.substring(0, 5) || '22:00');
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

      if (!result.canceled) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      showAlert({ title: 'Error', message: 'No se pudo abrir la galería' });
    }
  };

  const uploadImage = async (imageUri: string) => {
    if (!profile?.id) return;
    setIsUploading(true);
    try {
      const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const filePath = `${profile.id}/business_${Date.now()}.${ext}`;

      let body: any;
      let contentType: string | undefined;

      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        body = await response.blob();
        contentType = `image/${ext}`;
      } else {
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          name: filePath.split('/')[1],
          type: `image/${ext}`,
        } as any);
        body = formData;
        contentType = undefined;
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, body, {
          upsert: true,
          contentType,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrlData.publicUrl);
    } catch (error: any) {
      showAlert({ title: 'Error al subir imagen', message: error.message });
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
          instagram_url: instagramUrl,
          avatar_url: avatarUrl,
          opening_time: `${openingTime}:00`,
          closing_time: `${closingTime}:00`,
        })
        .eq('id', business.id);

      if (error) throw error;

      // Actualizar contexto global
      await refreshProfile();
      setEditModalVisible(false);
    } catch (error: any) {
      showAlert({ title: 'Error al guardar', message: error.message });
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
      <ScreenHeader title="MI NEGOCIO" onLeft={() => setSidebarVisible(true)} />

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
            { label: 'DIRECCIÓN MAPS', value: business?.maps_url || 'No agregada', isLink: !!business?.maps_url, linkText: 'Abrir en Maps' },
            { label: 'INSTAGRAM', value: business?.instagram_url || 'No agregado', isLink: !!business?.instagram_url, linkText: 'Abrir en Instagram' },
            { label: 'HORARIO APERTURA', value: business?.opening_time?.substring(0, 5) || '07:00' },
            { label: 'HORARIO CIERRE', value: business?.closing_time?.substring(0, 5) || '22:00' },
          ].map((item, i) => (
            <View key={i} style={[localStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[localStyles.cardLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              {item.isLink ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(item.value)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}
                >
                  <Text style={[localStyles.cardValue, { color: appColors.primary, textDecorationLine: 'underline' }]}>
                    {item.linkText}
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
          <View style={[localStyles.modalOverlay, { backgroundColor: glassColors.overlayMedium }]}>
            <BlurView intensity={20} tint={isDarkMode ? 'dark' : 'light'} style={localStyles.blurCard}>
              <View style={[localStyles.glassContent, !isDarkMode && localStyles.glassContentLight]}>
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

              <GlassInput
                value={name}
                onChangeText={setName}
                label="Nombre del negocio"
                style={{ marginBottom: 16 }}
              />

              <GlassInput
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                placeholder="Cuenta sobre tu negocio..."
                label="Descripción"
                inputStyle={{ height: 80 }}
                style={{ marginBottom: 16 }}
              />

              <GlassInput
                value={mapsUrl}
                onChangeText={setMapsUrl}
                placeholder="https://maps.app.goo.gl/..."
                label="Enlace de Google Maps"
                autoCapitalize="none"
                style={{ marginBottom: 16 }}
              />

              <GlassInput
                value={instagramUrl}
                onChangeText={setInstagramUrl}
                placeholder="https://instagram.com/..."
                label="Enlace de Instagram"
                autoCapitalize="none"
                style={{ marginBottom: 16 }}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <GlassInput
                    value={openingTime}
                    onChangeText={setOpeningTime}
                    placeholder="09:00"
                    label="Apertura"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <GlassInput
                    value={closingTime}
                    onChangeText={setClosingTime}
                    placeholder="18:00"
                    label="Cierre"
                  />
                </View>
              </View>

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
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Sidebar visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
    </View>
  );
}

const localStyles = StyleSheet.create({
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
  blurCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: glassColors.borderDarkMedium,
  },
  glassContent: {
    backgroundColor: glassColors.sheetModalDark,
    padding: 24,
  },
  glassContentLight: {
    backgroundColor: glassColors.sheetModalLight,
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
