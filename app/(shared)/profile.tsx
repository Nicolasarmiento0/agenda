import { Feather, Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { readLocalUriAsBlob } from '../../utils/webUploadHelper';
import {
  ActivityIndicator,
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
import GlassCard from '../../components/GlassCard';
import Sidebar from '../../components/Sidebar';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

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

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile, updateProfileState } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // States for dynamic image cropping
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [tempImageUri, setTempImageUri] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);

  const [stats, setStats] = useState({ completed: 0, upcoming: 0, reviews: 0 });
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  useEffect(() => {
    if (profile?.nickname) setNickname(profile.nickname);
    if (profile?.role === 'client') fetchStats();
  }, [profile]);

  const fetchStats = async () => {
    if (!user?.id) return;
    try {
      const [apptsRes, reviewsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('status')
          .eq('client_id', user.id),
        supabase
          .from('reviews')
          .select('id, score, comment, created_at, businesses(name)')
          .eq('client_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      const appts = apptsRes.data ?? [];
      const reviews = reviewsRes.data ?? [];

      setStats({
        completed: appts.filter(a => a.status === 'completed').length,
        upcoming: appts.filter(a => a.status === 'confirmed' || a.status === 'pending').length,
        reviews: reviews.length,
      });
      setMyReviews(reviews);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useFocusEffect(useCallback(() => { refreshProfile(); }, []));

  // ─── LÓGICA DE ACTUALIZACIÓN DE NICKNAME ───
  const handleUpdateProfile = async () => {
    if (!nickname.trim()) {
      showAlert({ title: 'Atención', message: 'El nickname no puede estar vacío' });
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('id', user?.id);

      if (error) throw error;
      await refreshProfile();
      showAlert({ title: 'Éxito', message: 'Perfil actualizado correctamente' });
      setIsEditing(false);
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message });
    }
  };

  // ─── LÓGICA DE SUBIDA DE AVATAR (CORREGIDA) ───
  const proceedWithUpload = async (imageUri: string) => {
    setUploadingAvatar(true);
    try {
      const fileExt = imageUri.startsWith('data:') ? 'jpeg' : (imageUri.split('.').pop()?.toLowerCase() ?? 'jpeg');
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      let body: any;
      let contentType: string | undefined = `image/${fileExt}`;

      if (Platform.OS === 'web') {
        body = await readLocalUriAsBlob(imageUri);
      } else {
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          name: fileName.split('/')[1],
          type: contentType,
        } as any);
        body = formData;
        contentType = undefined;
      }

      // 1. Subir a Storage
      const { error: storageError } = await supabase.storage
        .from('avatars')
        .upload(fileName, body, { upsert: true, contentType });

      if (storageError) throw storageError;

      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // 3. Actualizar base de datos (URL limpia)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // 4. Actualizar estado local con Timestamp para forzar el refresco visual
      updateProfileState({ avatar_url: `${publicUrl}?t=${Date.now()}` });

      showAlert({ title: 'Éxito', message: 'Foto de perfil actualizada.' });
    } catch (error: any) {
      showAlert({ title: 'Error de subida', message: error.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const uploadAvatar = async () => {
    console.log('Iniciando subida de avatar...');
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert({ title: 'Permiso necesario', message: 'Necesitamos acceso a tu galería.' });
        return;
      }

      // IMPORTANTE: En iOS se necesita un pequeño delay después de que se cierra un Alert/Modal
      await new Promise(resolve => setTimeout(resolve, 600));

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      console.log('Resultado de ImagePicker:', result.canceled ? 'cancelado' : 'imagen seleccionada');

      if (result.canceled || !result.assets[0].uri) return;

      const image = result.assets[0];
      if (Platform.OS === 'web') {
        // En Web, abrimos nuestro propio modal interactivo de recorte/D-Pad
        setTempImageUri(image.uri);
        setCropZoom(1);
        setCropX(0);
        setCropY(0);
        setCropModalVisible(true);
      } else {
        // En nativo, subimos el resultado recortado directamente por el cropper del sistema
        await proceedWithUpload(image.uri);
      }
    } catch (error: any) {
      showAlert({ title: 'Error', message: 'No se pudo seleccionar la foto: ' + error.message });
    }
  };

  const handleCropSave = async () => {
    if (!tempImageUri) return;
    setCropModalVisible(false);
    setUploadingAvatar(true);
    try {
      const croppedUri = await cropImageWeb(tempImageUri, cropZoom, cropX, cropY);
      await proceedWithUpload(croppedUri);
    } catch (e: any) {
      showAlert({ title: 'Error al recortar', message: e.message });
      setUploadingAvatar(false);
    }
  };

  // ─── LÓGICA DE BORRADO DE AVATAR (CORREGIDA) ───
  const deleteAvatar = async () => {
    if (!profile?.avatar_url) return;

    showAlert({
      title: 'Borrar foto',
      message: '¿Estás seguro de que quieres eliminar tu foto de perfil?',
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingAvatar(true);

              // Extraer el path real del archivo eliminando la URL base y los query params
              const url = new URL(profile.avatar_url!);
              const pathParts = url.pathname.split('/avatars/');
              const filePath = pathParts[1]?.split('?')[0]; // Limpiamos el ?t=...

              if (filePath) {
                await supabase.storage.from('avatars').remove([filePath]);
              }

              // Actualizar DB a null
              await supabase.from('profiles').update({ avatar_url: null }).eq('id', user?.id);

              // Actualizar estado local
              updateProfileState({ avatar_url: null });

              showAlert({ title: 'Listo', message: 'Foto de perfil eliminada.' });
            } catch (error: any) {
              showAlert({ title: 'Error', message: 'No se pudo eliminar la imagen.' });
            } finally {
              setUploadingAvatar(false);
            }
          },
        },
      ]
    });
  };

  const handleAvatarPress = () => {
    const options: any[] = [{ text: 'Cambiar foto', onPress: uploadAvatar }];
    if (profile?.avatar_url) options.push({ text: 'Borrar foto', style: 'destructive', onPress: deleteAvatar });
    options.push({ text: 'Cancelar', style: 'cancel' });
    showAlert({ title: 'Foto de perfil', message: '¿Qué deseas hacer?', buttons: options });
  };

  // ─── LÓGICA DE MENÚ ───
  const handleNotifications = () => {
    showAlert({
      title: 'Notificaciones',
      message: 'Próximamente podrás activar o desactivar las notificaciones push para la app.'
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Sidebar visible={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <View style={[appStyles.screen, { backgroundColor: 'transparent' }]}>
          <View style={localStyles.topNav}>
            <TouchableOpacity onPress={() => setIsSidebarOpen(true)}>
              <Feather name="menu" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme}>
              <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={[appStyles.title, { color: colors.textPrimary, paddingVertical: 10 }]}>MI PERFIL</Text>

          <View style={localStyles.headerContainer}>
            <TouchableOpacity onPress={handleAvatarPress} disabled={uploadingAvatar} style={localStyles.avatarContainer}>
              {profile?.avatar_url ? (
                <ExpoImage
                  // IMPORTANTE: El key y el source con timestamp aseguran que la imagen cambie al instante
                  key={profile.avatar_url}
                  source={{ uri: profile.avatar_url.includes('?') ? profile.avatar_url : `${profile.avatar_url}?t=${Date.now()}` }}
                  style={localStyles.avatarImageLarge}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[localStyles.avatarPlaceholderLarge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="user" size={50} color={colors.textSecondary} />
                </View>
              )}
              <View style={[localStyles.cameraBadge, { backgroundColor: colors.primary }]}>
                {uploadingAvatar ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="camera" size={12} color="#fff" />}
              </View>
            </TouchableOpacity>

            <View style={localStyles.infoContainer}>
              {isEditing ? (
                <View style={localStyles.editInputContainer}>
                  <Text style={[localStyles.atSymbol, { color: colors.textSecondary }]}>@</Text>
                  <TextInput
                    style={[localStyles.nicknameInput, { color: colors.textPrimary, borderBottomColor: colors.primary }]}
                    value={nickname}
                    onChangeText={setNickname}
                    autoFocus
                    placeholder="usuario"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <View style={localStyles.editActions}>
                    <TouchableOpacity onPress={handleUpdateProfile} style={localStyles.saveAction}>
                      <Feather name="check" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsEditing(false)} style={localStyles.cancelAction}>
                      <Feather name="x" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={localStyles.nicknameWrapper}
                  onPress={() => setIsEditing(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[localStyles.nicknameText, { color: colors.textPrimary }]}>
                    @{profile?.nickname || 'usuario'}
                  </Text>
                  <Feather name="edit-2" size={12} color={colors.textSecondary} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              )}
              <Text style={[localStyles.emailSubText, { color: colors.textSecondary }]}>
                {user?.email}
              </Text>
            </View>
          </View>

          {profile?.role === 'client' && (
            <GlassCard style={localStyles.activityCard}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => myReviews.length > 3 && setShowAllReviews(v => !v)}
                style={localStyles.activityHeader}
              >
                <Feather name="zap" size={18} color="#FF7A00" />
                <Text style={[localStyles.activityTitle, { color: colors.textPrimary }]}>ACTIVIDAD</Text>
                {myReviews.length > 3 && (
                  <Feather
                    name={showAllReviews ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textSecondary}
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row' }}>
                <View style={localStyles.statItem}>
                  <Text style={[localStyles.statLabel, { color: colors.textSecondary }]}>COMPLETADAS</Text>
                  <Text style={[localStyles.statValue, { color: colors.textPrimary }]}>{stats.completed}</Text>
                </View>
                <View style={localStyles.statItem}>
                  <Text style={[localStyles.statLabel, { color: colors.textSecondary }]}>PRÓXIMAS</Text>
                  <Text style={[localStyles.statValue, { color: colors.textPrimary }]}>{stats.upcoming}</Text>
                </View>
                <View style={localStyles.statItem}>
                  <Text style={[localStyles.statLabel, { color: colors.textSecondary }]}>RESEÑAS</Text>
                  <Text style={[localStyles.statValue, { color: colors.textPrimary }]}>{stats.reviews}</Text>
                </View>
              </View>

              {myReviews.length > 0 && (
                <>
                  <View style={[localStyles.reviewsDivider, { backgroundColor: colors.border }]} />
                  <View style={localStyles.reviewsHeader}>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text style={[localStyles.reviewsTitle, { color: colors.textSecondary }]}>MIS RESEÑAS</Text>
                  </View>
                  {(showAllReviews ? myReviews : myReviews.slice(0, 3)).map((r: any, i: number) => (
                    <View
                      key={r.id}
                      style={[
                        localStyles.reviewItem,
                        { borderTopColor: colors.border },
                        i === 0 && { borderTopWidth: 0 },
                      ]}
                    >
                      <View style={localStyles.reviewTop}>
                        <Text style={[localStyles.reviewBiz, { color: colors.textPrimary }]} numberOfLines={1}>
                          {(r.businesses as any)?.name ?? 'Negocio'}
                        </Text>
                        <View style={localStyles.starsRow}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <Ionicons
                              key={s}
                              name={s <= r.score ? 'star' : 'star-outline'}
                              size={11}
                              color={s <= r.score ? '#F59E0B' : (isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)')}
                            />
                          ))}
                        </View>
                      </View>
                      {!!r.comment && (
                        <Text style={[localStyles.reviewComment, { color: colors.textSecondary }]} numberOfLines={2}>
                          &quot;{r.comment}&quot;
                        </Text>
                      )}
                      <Text style={[localStyles.reviewDate, { color: colors.textSecondary }]}>
                        {new Date(r.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  ))}
                  {myReviews.length > 3 && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setShowAllReviews(v => !v)}
                      style={localStyles.showAllBtn}
                    >
                      <Text style={[localStyles.showAllText, { color: appColors.primary }]}>
                        {showAllReviews ? 'Ver menos' : `Ver todas (${myReviews.length})`}
                      </Text>
                      <Feather name={showAllReviews ? 'chevron-up' : 'chevron-down'} size={13} color={appColors.primary} />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </GlassCard>
          )}

          {/* Menú de opciones */}
          <View style={localStyles.menuContainer}>
            <TouchableOpacity style={[localStyles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleNotifications}>
              <View style={localStyles.menuItemLeft}>
                <View style={[localStyles.menuIconBox, { backgroundColor: colors.background }]}>
                  <Feather name="bell" size={18} color={colors.textSecondary} />
                </View>
                <View>
                  <Text style={[localStyles.menuItemTitle, { color: colors.textPrimary }]}>Notificaciones</Text>
                  <Text style={[localStyles.menuItemSubtitle, { color: colors.textSecondary }]}>Alertas y actividad</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[localStyles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/privacy')}>
              <View style={localStyles.menuItemLeft}>
                <View style={[localStyles.menuIconBox, { backgroundColor: colors.background }]}>
                  <Feather name="lock" size={18} color={colors.textSecondary} />
                </View>
                <View>
                  <Text style={[localStyles.menuItemTitle, { color: colors.textPrimary }]}>Privacidad</Text>
                  <Text style={[localStyles.menuItemSubtitle, { color: colors.textSecondary }]}>Seguridad y acceso</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[localStyles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/support')}>
              <View style={localStyles.menuItemLeft}>
                <View style={[localStyles.menuIconBox, { backgroundColor: colors.background }]}>
                  <Feather name="headphones" size={18} color={colors.textSecondary} />
                </View>
                <View>
                  <Text style={[localStyles.menuItemTitle, { color: colors.textPrimary }]}>Soporte</Text>
                  <Text style={[localStyles.menuItemSubtitle, { color: colors.textSecondary }]}>Contacto y ayuda</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[localStyles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/terms')}>
              <View style={localStyles.menuItemLeft}>
                <View style={[localStyles.menuIconBox, { backgroundColor: colors.background }]}>
                  <Feather name="file-text" size={18} color={colors.textSecondary} />
                </View>
                <View>
                  <Text style={[localStyles.menuItemTitle, { color: colors.textPrimary }]}>Términos y Condiciones</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[localStyles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/privacy-policy' as any)}>
              <View style={localStyles.menuItemLeft}>
                <View style={[localStyles.menuIconBox, { backgroundColor: colors.background }]}>
                  <Feather name="shield" size={18} color={colors.textSecondary} />
                </View>
                <View>
                  <Text style={[localStyles.menuItemTitle, { color: colors.textPrimary }]}>Política de Privacidad</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[localStyles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={async () => { await signOut(); router.replace('/home'); }}>
              <View style={localStyles.menuItemLeft}>
                <View style={[localStyles.menuIconBox, { backgroundColor: colors.background }]}>
                  <Feather name="log-out" size={18} color="#FF4B4B" />
                </View>
                <View>
                  <Text style={[localStyles.menuItemTitle, { color: '#FF4B4B' }]}>Cerrar sesión</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Web Image Cropping Modal */}
      <Modal
        visible={cropModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCropModalVisible(false)}
      >
        <View style={localStyles.modalOverlay}>
          <View style={[localStyles.modalCard, { backgroundColor: isDarkMode ? 'rgba(20, 20, 25, 0.95)' : 'rgba(255, 255, 255, 0.98)', borderColor: colors.border }]}>
            <Text style={[localStyles.modalTitle, { color: colors.textPrimary }]}>AJUSTAR FOTO DE PERFIL</Text>
            <Text style={[localStyles.modalSubtitle, { color: colors.textSecondary }]}>
              Usa los controles para encuadrar y acercar tu foto perfectamente.
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
            <View style={localStyles.controlsContainer}>
              {/* Zoom Slider / Botones */}
              <View style={localStyles.controlSection}>
                <Text style={[localStyles.controlLabel, { color: colors.textSecondary }]}>ZOOM: {Math.round(cropZoom * 100)}%</Text>
                <View style={localStyles.zoomRow}>
                  <TouchableOpacity
                    style={[localStyles.zoomBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setCropZoom(z => Math.max(1, z - 0.1))}
                  >
                    <Feather name="minus" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  
                  <View style={[localStyles.sliderTrack, { backgroundColor: colors.border }]}>
                    <View style={[localStyles.sliderFill, { width: `${Math.min(100, Math.max(0, (cropZoom - 1) / 3 * 100))}%`, backgroundColor: colors.primary }]} />
                  </View>

                  <TouchableOpacity
                    style={[localStyles.zoomBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setCropZoom(z => Math.min(4, z + 0.1))}
                  >
                    <Feather name="plus" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* D-Pad Cockpit para mover la foto */}
              <View style={localStyles.controlSection}>
                <Text style={[localStyles.controlLabel, { color: colors.textSecondary, marginBottom: 8 }]}>POSICIÓN</Text>
                <View style={localStyles.dpadContainer}>
                  {/* Fila Superior: Arriba */}
                  <View style={localStyles.dpadRow}>
                    <TouchableOpacity
                      style={[localStyles.dpadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setCropY(y => y - 5)}
                    >
                      <Feather name="chevron-up" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  {/* Fila Media: Izquierda, Reset, Derecha */}
                  <View style={localStyles.dpadRowMid}>
                    <TouchableOpacity
                      style={[localStyles.dpadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setCropX(x => x - 5)}
                    >
                      <Feather name="chevron-left" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[localStyles.dpadCenterBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setCropX(0);
                        setCropY(0);
                        setCropZoom(1);
                      }}
                    >
                      <Text style={localStyles.dpadCenterText}>Reset</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[localStyles.dpadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setCropX(x => x + 5)}
                    >
                      <Feather name="chevron-right" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  {/* Fila Inferior: Abajo */}
                  <View style={localStyles.dpadRow}>
                    <TouchableOpacity
                      style={[localStyles.dpadBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setCropY(y => y + 5)}
                    >
                      <Feather name="chevron-down" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Acciones del Modal */}
            <View style={localStyles.modalActions}>
              <TouchableOpacity
                style={[localStyles.modalBtnCancel, { borderColor: colors.border }]}
                onPress={() => setCropModalVisible(false)}
              >
                <Text style={[localStyles.modalBtnCancelText, { color: colors.textSecondary }]}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[localStyles.modalBtnSave, { backgroundColor: colors.primary }]}
                onPress={handleCropSave}
              >
                <Text style={localStyles.modalBtnSaveText}>APLICAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 10 },
  headerContainer: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatarImageLarge: {
    width: 110,
    height: 110,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: appColors.primary,
  },
  avatarPlaceholderLarge: {
    width: 110,
    height: 110,
    borderRadius: 35,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: appColors.background,
  },
  infoContainer: { alignItems: 'center', width: '100%' },
  nicknameWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  nicknameText: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5, fontFamily: 'Inter_700Bold' },
  editInputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  atSymbol: { fontSize: 18, fontWeight: '700' },
  nicknameInput: { fontSize: 18, fontWeight: '700', borderBottomWidth: 1, paddingVertical: 2, minWidth: 100 },
  editActions: { flexDirection: 'row', gap: 12, marginLeft: 10 },
  saveAction: { padding: 4 },
  cancelAction: { padding: 4 },
  emailSubText: { fontSize: 13, fontWeight: '400', opacity: 0.8 },
  activityCard: { padding: 24, borderRadius: 24, marginBottom: 32 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  activityTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 2, fontFamily: 'Inter_700Bold' },
  statItem: { flex: 1 },
  statLabel: { fontSize: 10, fontWeight: '700', marginBottom: 6, fontFamily: 'Inter_700Bold' },
  statValue: { fontSize: 20, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  menuContainer: { marginTop: 10, paddingBottom: 40, gap: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, borderWidth: 1 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuItemTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2, fontFamily: 'Inter_700Bold' },
  menuItemSubtitle: { fontSize: 12, fontWeight: '500', opacity: 0.8, fontFamily: 'Inter_500Medium' },

  reviewsDivider: { height: StyleSheet.hairlineWidth, marginVertical: 20 },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  reviewsTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 2, fontFamily: 'Inter_700Bold' },
  reviewItem: { paddingTop: 14, marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewBiz: { fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8, fontFamily: 'Inter_700Bold' },
  starsRow: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
  reviewDate: { fontSize: 10, letterSpacing: 0.3, opacity: 0.6 },
  showAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 14, marginTop: 14 },
  showAllText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // Estilos del Cropper Modal Premium (Web)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  modalSubtitle: {
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
  controlsContainer: {
    width: '100%',
    gap: 16,
    marginVertical: 10,
  },
  controlSection: {
    width: '100%',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 10,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
  },
  dpadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
    position: 'relative',
  },
  dpadRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadRowMid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  dpadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: 'Inter_700Bold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancelText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'Inter_700Bold',
  },
  modalBtnSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSaveText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'Inter_700Bold',
  },
});