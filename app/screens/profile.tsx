import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, appStyles } from '../../styles/appStyles';

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile, updateProfileState } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    completed: 0,
    upcoming: 0
  });

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
      const { data: appts, error } = await supabase
        .from('appointments')
        .select('status')
        .or(`client_id.eq.${user.id},client_name.eq.${profile?.nickname}`);

      if (error) throw error;
      if (appts) {
        setStats({
          completed: appts.filter(a => a.status === 'completed').length,
          upcoming: appts.filter(a => a.status === 'confirmed' || a.status === 'pending').length
        });
      }
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

      setUploadingAvatar(true);
      const image = result.assets[0];
      const fileExt = image.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      let body: any;
      let contentType: string | undefined = image.mimeType || `image/${fileExt}`;

      if (Platform.OS === 'web') {
        const response = await fetch(image.uri);
        body = await response.blob();
      } else {
        const formData = new FormData();
        formData.append('file', {
          uri: image.uri,
          name: fileName.split('/')[1],
          type: contentType,
        } as any);
        body = formData;
        // En nativo con FormData no pasamos contentType manualmente para evitar errores de boundary
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
            <View style={[localStyles.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={localStyles.activityHeader}>
                <Feather name="zap" size={18} color="#FF7A00" />
                <Text style={[localStyles.activityTitle, { color: colors.textPrimary }]}>ACTIVIDAD</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <View style={localStyles.statItem}>
                  <Text style={[localStyles.statLabel, { color: colors.textSecondary }]}>COMPLETADAS</Text>
                  <Text style={[localStyles.statValue, { color: colors.textPrimary }]}>{stats.completed}</Text>
                </View>
                <View style={localStyles.statItem}>
                  <Text style={[localStyles.statLabel, { color: colors.textSecondary }]}>PRÓXIMAS</Text>
                  <Text style={[localStyles.statValue, { color: colors.textPrimary }]}>{stats.upcoming}</Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity style={localStyles.logoutButton} onPress={async () => { await signOut(); router.replace('/screens/home'); }}>
            <Text style={localStyles.logoutText}>CERRAR SESIÓN</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  nicknameText: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  editInputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  atSymbol: { fontSize: 18, fontWeight: '700' },
  nicknameInput: { fontSize: 18, fontWeight: '700', borderBottomWidth: 1, paddingVertical: 2, minWidth: 100 },
  editActions: { flexDirection: 'row', gap: 12, marginLeft: 10 },
  saveAction: { padding: 4 },
  cancelAction: { padding: 4 },
  emailSubText: { fontSize: 13, fontWeight: '400', opacity: 0.8 },
  activityCard: { padding: 24, borderRadius: 24, borderWidth: 1, marginBottom: 32 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  activityTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  statItem: { flex: 1 },
  statLabel: { fontSize: 10, fontWeight: '700', marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '800' },
  logoutButton: { marginTop: 20, paddingBottom: 40, alignItems: 'center' },
  logoutText: { color: '#FF4B4B', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
});