import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
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

const cropImageWeb = (uri: string, zoom: number, x: number, y: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not on Web platform'));
      return;
    }
    const img = new window.Image();
    img.src = uri;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      canvas.width = 300;
      canvas.height = 300;
      
      const frameVisualSize = 200;
      const sourceToVisualRatio = Math.min(img.width, img.height) / frameVisualSize;
      const sSize = Math.min(img.width, img.height) / zoom;
      
      const sourceOffsetX = x * sourceToVisualRatio;
      const sourceOffsetY = y * sourceToVisualRatio;
      
      const sx = (img.width - sSize) / 2 - sourceOffsetX;
      const sy = (img.height - sSize) / 2 - sourceOffsetY;
      
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, 300, 300);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
  });
};

export default function CompanyBusinessScreen() {
  const { colors, isDarkMode } = useTheme();
  const { profile, business, refreshProfile } = useAuth();
  const { showAlert } = useAlert();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // States for dynamic image cropping
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [tempImageUri, setTempImageUri] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);

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

  const handleImagePress = () => {
    // Cerrar el modal de edición antes de mostrar el alert para evitar
    // el problema de iOS donde dos <Modal> apilados no se ven correctamente.
    setEditModalVisible(false);
    setTimeout(() => {
      const options: any[] = [
        { text: 'Cambiar logo', onPress: handlePickImage },
      ];
      if (avatarUrl) {
        options.push({ text: 'Borrar logo', style: 'destructive', onPress: handleDeleteLogo });
      }
      options.push({ text: 'Cancelar', style: 'cancel', onPress: () => setEditModalVisible(true) });
      showAlert({ title: 'Logo del negocio', message: '¿Qué deseas hacer?', buttons: options });
    }, 350);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert({ title: 'Permiso necesario', message: 'Necesitamos acceso a tu galería.' });
        setEditModalVisible(true);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 600));

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0].uri) {
        if (Platform.OS === 'web') {
          setTempImageUri(result.assets[0].uri);
          setCropZoom(1);
          setCropX(0);
          setCropY(0);
          setCropModalVisible(true);
          // El modal de edición se re-abre tras completar/cancelar el recorte
        } else {
          await uploadImage(result.assets[0].uri);
          setEditModalVisible(true);
        }
      } else {
        setEditModalVisible(true);
      }
    } catch (error: any) {
      showAlert({ title: 'Error', message: 'No se pudo seleccionar la foto: ' + error.message });
      setEditModalVisible(true);
    }
  };

  const handleDeleteLogo = () => {
    showAlert({
      title: 'Borrar logo',
      message: '¿Estás seguro de que quieres eliminar el logo del negocio?',
      buttons: [
        { text: 'Cancelar', style: 'cancel', onPress: () => setEditModalVisible(true) },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUploading(true);
              if (avatarUrl) {
                try {
                  const url = new URL(avatarUrl);
                  const pathParts = url.pathname.split('/avatars/');
                  const filePath = pathParts[1]?.split('?')[0];
                  if (filePath) await supabase.storage.from('avatars').remove([filePath]);
                } catch (_) {}
              }
              const { error } = await supabase
                .from('businesses')
                .update({ avatar_url: null })
                .eq('id', business?.id);
              if (error) throw error;
              setAvatarUrl('');
              await refreshProfile();
              showAlert({ title: 'Listo', message: 'Logo eliminado.' });
            } catch (error: any) {
              showAlert({ title: 'Error', message: 'No se pudo eliminar el logo.' });
            } finally {
              setIsUploading(false);
            }
          },
        },
      ],
    });
  };

  const handleCropSave = async () => {
    if (!tempImageUri) return;
    setCropModalVisible(false);
    setIsUploading(true);
    try {
      const croppedUri = await cropImageWeb(tempImageUri, cropZoom, cropX, cropY);
      await uploadImage(croppedUri);
      setEditModalVisible(true);
    } catch (e: any) {
      showAlert({ title: 'Error al recortar', message: e.message });
      setIsUploading(false);
      setEditModalVisible(true);
    }
  };

  const uploadImage = async (imageUri: string) => {
    if (!profile?.id) return;
    setIsUploading(true);
    try {
      const ext = imageUri.startsWith('data:') ? 'jpeg' : (imageUri.split('.').pop()?.toLowerCase() ?? 'jpg');
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

              <TouchableOpacity style={localStyles.imagePickerContainer} onPress={handleImagePress} disabled={isUploading}>
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
                  onPress={() => { setAvatarUrl(business?.avatar_url || ''); setEditModalVisible(false); }}
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

      {/* Web Image Cropping Modal */}
      <Modal
        visible={cropModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setCropModalVisible(false); setEditModalVisible(true); }}
      >
        <View style={localStyles.cropModalOverlay}>
          <View style={[localStyles.cropModalCard, { backgroundColor: isDarkMode ? 'rgba(20, 20, 25, 0.95)' : 'rgba(255, 255, 255, 0.98)', borderColor: colors.border }]}>
            <Text style={[localStyles.cropModalTitle, { color: colors.textPrimary }]}>AJUSTAR LOGO DEL NEGOCIO</Text>
            <Text style={[localStyles.cropModalSubtitle, { color: colors.textSecondary }]}>
              Usa los controles para encuadrar y acercar tu logo perfectamente.
            </Text>

            {/* Area de Previsualizacion */}
            <View style={[localStyles.cropFrameContainer, { borderColor: colors.border, backgroundColor: isDarkMode ? '#000' : '#f0f0f0' }]}>
              <View style={localStyles.cropCircleMask}>
                {tempImageUri && (
                  <ExpoImage
                    source={{ uri: tempImageUri }}
                    style={[
                      localStyles.cropPreviewImage,
                      {
                        transform: [
                          { scale: cropZoom },
                          { translateX: cropX },
                          { translateY: cropY },
                        ],
                      },
                    ]}
                    contentFit="contain"
                  />
                )}
              </View>
              {/* Lineas de cuadrícula */}
              <View style={[localStyles.cropGridLineH, { top: '33.3%' }]} />
              <View style={[localStyles.cropGridLineH, { top: '66.6%' }]} />
              <View style={[localStyles.cropGridLineV, { left: '33.3%' }]} />
              <View style={[localStyles.cropGridLineV, { left: '66.6%' }]} />
            </View>

            {/* Controles de Ajuste */}
            <View style={localStyles.cropControlsContainer}>
              {/* Zoom Slider / Botones */}
              <View style={localStyles.cropControlSection}>
                <Text style={[localStyles.cropControlLabel, { color: colors.textSecondary }]}>ZOOM: {Math.round(cropZoom * 100)}%</Text>
                <View style={localStyles.cropZoomRow}>
                  <TouchableOpacity
                    style={[localStyles.cropZoomBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setCropZoom(z => Math.max(1, z - 0.1))}
                  >
                    <Feather name="minus" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  
                  <View style={[localStyles.cropSliderTrack, { backgroundColor: colors.border }]}>
                    <View style={[localStyles.cropSliderFill, { width: `${Math.min(100, Math.max(0, (cropZoom - 1) / 3 * 100))}%`, backgroundColor: colors.primary }]} />
                  </View>

                  <TouchableOpacity
                    style={[localStyles.cropZoomBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setCropZoom(z => Math.min(4, z + 0.1))}
                  >
                    <Feather name="plus" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* D-Pad Cockpit para mover la foto */}
              <View style={localStyles.cropControlSection}>
                <Text style={[localStyles.cropControlLabel, { color: colors.textSecondary, marginBottom: 8 }]}>POSICIÓN</Text>
                <View style={localStyles.cropDpadContainer}>
                  {/* Fila Superior: Arriba */}
                  <View style={localStyles.cropDpadRow}>
                    <TouchableOpacity
                      style={[localStyles.cropDpadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setCropY(y => y - 5)}
                    >
                      <Feather name="chevron-up" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  {/* Fila Media: Izquierda, Reset, Derecha */}
                  <View style={localStyles.cropDpadRowMid}>
                    <TouchableOpacity
                      style={[localStyles.cropDpadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setCropX(x => x - 5)}
                    >
                      <Feather name="chevron-left" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[localStyles.cropDpadCenterBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setCropX(0);
                        setCropY(0);
                        setCropZoom(1);
                      }}
                    >
                      <Text style={localStyles.cropDpadCenterText}>Reset</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[localStyles.cropDpadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setCropX(x => x + 5)}
                    >
                      <Feather name="chevron-right" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  {/* Fila Inferior: Abajo */}
                  <View style={localStyles.cropDpadRow}>
                    <TouchableOpacity
                      style={[localStyles.cropDpadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setCropY(y => y + 5)}
                    >
                      <Feather name="chevron-down" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Acciones del Modal */}
            <View style={localStyles.cropModalActions}>
              <TouchableOpacity
                style={[localStyles.cropModalBtnCancel, { borderColor: colors.border }]}
                onPress={() => { setCropModalVisible(false); setEditModalVisible(true); }}
              >
                <Text style={[localStyles.cropModalBtnCancelText, { color: colors.textSecondary }]}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[localStyles.cropModalBtnSave, { backgroundColor: colors.primary }]}
                onPress={handleCropSave}
              >
                <Text style={localStyles.cropModalBtnSaveText}>APLICAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Estilos del Cropper Modal Premium (Web)
  cropModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cropModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    gap: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 8 },
      web: { boxShadow: '0px 10px 30px rgba(0,0,0,0.5)' },
    }),
  },
  cropModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  cropModalSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  cropFrameContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    borderWidth: 2,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  cropCircleMask: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropPreviewImage: {
    width: 200,
    height: 200,
  },
  cropGridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cropGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cropControlsContainer: {
    width: '100%',
    gap: 16,
    marginVertical: 10,
  },
  cropControlSection: {
    width: '100%',
    alignItems: 'center',
  },
  cropControlLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cropZoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 10,
  },
  cropZoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropSliderTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  cropSliderFill: {
    height: '100%',
    borderRadius: 3,
  },
  cropDpadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
    position: 'relative',
  },
  cropDpadRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropDpadRowMid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  cropDpadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropDpadCenterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropDpadCenterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: 'Inter_700Bold',
  },
  cropModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  cropModalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropModalBtnCancelText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'Inter_700Bold',
  },
  cropModalBtnSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropModalBtnSaveText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'Inter_700Bold',
  },
});
