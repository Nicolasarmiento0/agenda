import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
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
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';
import { appStyles } from '../../styles/appStyles';

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
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

  // Refresca el perfil desde Supabase cada vez que el usuario entra a esta pantalla
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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled || !result.assets[0].uri) return;

      setUploadingAvatar(true);
      const image = result.assets[0];

      const fileExt = image.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      // Siempre sobreescribimos el mismo archivo por usuario para no acumular archivos huérfanos
      const fileName = `${user?.id}/avatar.${fileExt}`;

      const response = await fetch(image.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: storageError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Añadimos un timestamp como query param para romper el caché en todos los dispositivos
      // Esto fuerza a React Native (y navegadores) a descargar la imagen nueva en lugar de usar la cacheada
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBustedUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Refrescamos el perfil completo desde Supabase para que todos los estados
      // queden sincronizados con lo que realmente está guardado en la base de datos
      await refreshProfile();
      showAlert({ title: 'Éxito', message: 'Foto de perfil actualizada correctamente.' });
    } catch (error: any) {
      console.error('Error al subir avatar:', error);
      showAlert({ title: 'Error', message: error.message || 'No se pudo actualizar la imagen.' });
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

              // Extraemos el path relativo desde la URL pública
              // URL ejemplo: https://xxx.supabase.co/storage/v1/object/public/avatars/user-id/123.jpg
              const url = new URL(profile.avatar_url!);
              const pathParts = url.pathname.split('/avatars/');
              const filePath = pathParts[1]; // ej: "user-id/123.jpg"

              if (filePath) {
                const { error: removeError } = await supabase.storage
                  .from('avatars')
                  .remove([filePath]);
                if (removeError) throw removeError;
              }

              // Limpiar avatar_url en la tabla profiles
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', user?.id);

              if (updateError) throw updateError;

              await refreshProfile();
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

            {/* Toca el avatar para cambiar/borrar */}
            <TouchableOpacity
              onPress={handleAvatarPress}
              disabled={uploadingAvatar}
              style={localStyles.avatarWrapper}
              activeOpacity={0.8}
            >
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={localStyles.avatarImage}
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

              {/* Ícono de cámara sobre el avatar */}
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