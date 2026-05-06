import { Feather } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
import { appStyles } from '../../styles/appStyles';

export default function ProfileScreen() {
  // ── FIX 1: se agrega updateProfileState ──────────────────────────────────
  const { profile, user, signOut, refreshProfile, updateProfileState } = useAuth();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { showAlert } = useAlert();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  useEffect(() => {
    if (profile?.nickname) {
      setNickname(profile.nickname);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [])
  );

  // ─── Actualizar nickname ───────────────────────────────────────────────────
  const handleUpdateProfile = async () => {
    if (!nickname.trim()) {
      showAlert({ title: 'Atención', message: 'El nickname no puede estar vacío' });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('id', user?.id)
        .select()
        .single();

      if (error) throw error;
      if (data) await refreshProfile();

      showAlert({ title: 'Éxito', message: 'Perfil actualizado correctamente' });
      setIsEditing(false);
    } catch (error: any) {
      showAlert({ title: 'Error', message: error.message });
    }
  };

  // ─── Subir avatar ──────────────────────────────────────────────────────────
  const uploadAvatar = async () => {
    try {
      const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        showAlert({ 
          title: 'Permiso necesario', 
          message: 'Para cambiar tu foto, necesitamos permiso para acceder a tu galería. Por favor, actívalo en los ajustes de tu teléfono.' 
        });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 600));

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });

      if (result.canceled || !result.assets[0].uri) return;

      setUploadingAvatar(true);
      const image = result.assets[0];

      if (!image.base64) {
        throw new Error('No se pudo obtener el contenido de la imagen');
      }

      const fileExt = image.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from('avatars')
        .upload(fileName, new Uint8Array(decode(image.base64)), {
          contentType: 'image/jpeg',
          upsert: true,
        });


      console.log('storageError:', JSON.stringify(storageError)); // ← nuevo
      //console.log('storageData:', JSON.stringify(storageData));   // ← nuevo

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // ── FIX 2: guardar URL limpia en DB (sin timestamp) ───────────────────
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // ── FIX 2: actualizar estado local con timestamp para forzar re-render
      updateProfileState({ avatar_url: `${publicUrl}?t=${Date.now()}` });

      showAlert({ title: 'Éxito', message: 'Foto de perfil actualizada correctamente.' });
    } catch (error: any) {
      showAlert({ 
        title: 'Error de subida', 
        message: error.message || 'No se pudo subir la imagen. Verifica tu conexión e intenta de nuevo.' 
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ─── Borrar avatar ─────────────────────────────────────────────────────────
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

              const url = new URL(profile.avatar_url!);
              const pathParts = url.pathname.split('/avatars/');
              const filePath = pathParts[1];

              if (filePath) {
                // ── FIX 3: limpiar el ?t=... del path antes de borrar ─────
                const cleanPath = filePath.split('?')[0];
                const { error: removeError } = await supabase.storage
                  .from('avatars')
                  .remove([cleanPath]);
                if (removeError) throw removeError;
              }

              const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', user?.id);

              if (updateError) throw updateError;

              // ── FIX 3: actualizar estado local directamente ───────────────
              updateProfileState({ avatar_url: null });

              showAlert({ title: 'Listo', message: 'Foto de perfil eliminada.' });
            } catch (error: any) {
              console.error('Error al borrar avatar:', error);
              showAlert({ title: 'Error', message: error.message || 'No se pudo eliminar la imagen.' });
            } finally {
              setUploadingAvatar(false);
            }
          },
        },
      ]
    });
  };

  // ─── Menú de opciones de avatar ───────────────────────────────────────────
  const handleAvatarPress = () => {
    const options: any[] = [
      { text: 'Cambiar foto', onPress: uploadAvatar },
    ];

    if (profile?.avatar_url) {
      options.push({ text: 'Borrar foto', style: 'destructive', onPress: deleteAvatar });
    }

    options.push({ text: 'Cancelar', style: 'cancel' });

    showAlert({ title: 'Foto de perfil', message: '¿Qué deseas hacer?', buttons: options });
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  console.log('avatar_url:', profile?.avatar_url);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Sidebar visible={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textPrimary} />}
      >
        <View style={[appStyles.screen, { backgroundColor: 'transparent' }]}>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 10 }}>
            <TouchableOpacity
              onPress={() => setIsSidebarOpen(true)}
              style={{ width: 40 }}
            >
              <Text style={{ fontSize: 24, color: colors.textPrimary }}>☰</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleTheme} activeOpacity={0.7} style={{ width: 40, alignItems: 'flex-end' }}>
              <Feather name={isDarkMode ? 'moon' : 'sun'} size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={[appStyles.title, { color: colors.textPrimary, paddingVertical: 10 }]}>
            MI PERFIL
          </Text>

          {/* ── Card avatar ── */}
          <View style={[localStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>

            <TouchableOpacity
              onPress={handleAvatarPress}
              disabled={uploadingAvatar}
              style={localStyles.avatarWrapper}
              activeOpacity={0.8}
            >
              {profile?.avatar_url ? (
                <ExpoImage
                  key={profile.avatar_url}
                  source={{ uri: profile.avatar_url.split('?')[0] + '?t=' + Date.now() }}
                  style={localStyles.avatarImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View
                  style={[
                    localStyles.avatarPlaceholder,
                    { backgroundColor: isDarkMode ? '#333' : '#E1E1E1' },
                  ]}
                >
                  <Text style={{ fontSize: 40 }}>👤</Text>
                </View>
              )}

              <View style={[localStyles.cameraIcon, { backgroundColor: colors.primary }]}>
                <Text style={{ fontSize: 14 }}>
                  {uploadingAvatar ? '⏳' : '📷'}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={[localStyles.avatarHint, { color: colors.textSecondary }]}>
              {uploadingAvatar ? 'Actualizando...' : 'Toca para cambiar o borrar'}
            </Text>

            <Text style={[localStyles.emailText, { color: colors.textSecondary }]}>
              {user?.email}
            </Text>
          </View>

          {/* ── Sección nickname ── */}
          <View style={[localStyles.section, { borderTopColor: colors.border }]}>
            <Text style={[localStyles.label, { color: colors.textSecondary }]}>NICKNAME</Text>

            {isEditing ? (
              <TextInput
                style={[
                  localStyles.input,
                  {
                    color: colors.textPrimary,
                    backgroundColor: isDarkMode ? '#1E1E1E' : '#F9F9F9',
                    borderColor: colors.primary,
                  },
                ]}
                value={nickname}
                onChangeText={setNickname}
                placeholder="Tu apodo"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
            ) : (
              <Text style={[localStyles.value, { color: colors.textPrimary }]}>
                {profile?.nickname || user?.user_metadata?.full_name || 'Usuario'}
              </Text>
            )}

            <TouchableOpacity
              style={[
                localStyles.button,
                {
                  backgroundColor: isEditing ? colors.primary : 'transparent',
                  borderColor: colors.primary,
                  borderWidth: 1,
                },
              ]}
              onPress={isEditing ? handleUpdateProfile : () => setIsEditing(true)}
            >
              <Text style={{ color: isEditing ? '#FFFFFF' : colors.primary, fontWeight: 'bold', fontSize: 13 }}>
                {isEditing ? 'GUARDAR CAMBIOS' : 'EDITAR NICKNAME'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Cerrar sesión ── */}
          <View style={localStyles.logoutButton}>
            <TouchableOpacity onPress={async () => {
              await signOut();
              router.replace('/screens/home');
            }}>
              <Text style={localStyles.logoutText}>CERRAR SESIÓN</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  menuButton: {
    width: 40,
  },
  card: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: {
    fontSize: 11,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  section: {
    paddingVertical: 25,
    borderTopWidth: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 20,
    fontWeight: '400',
    marginBottom: 20,
  },
  input: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButton: {
    marginTop: 'auto',
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF4B4B',
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 12,
  },
});