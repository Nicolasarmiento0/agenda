import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
import { appStyles } from '../../styles/appStyles';

export default function ProfileScreen() {
  const { profile, user, signOut, updateProfileState } = useAuth();
  const { colors, isDarkMode } = useTheme();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (profile?.nickname) {
      setNickname(profile.nickname);
    }
  }, [profile]);

  // ─── Actualizar nickname ───────────────────────────────────────────────────
  const handleUpdateProfile = async () => {
    if (!nickname.trim()) {
      Alert.alert('Atención', 'El nickname no puede estar vacío');
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
      if (data) updateProfileState({ nickname: data.nickname });

      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // ─── Subir avatar ──────────────────────────────────────────────────────────
  const uploadAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled || !result.assets[0].uri) return;

      setUploadingAvatar(true);
      const image = result.assets[0];

      const response = await fetch(image.uri);
      const blob = await response.blob();

      const fileExt = image.uri.split('.').pop()?.toLowerCase() ?? 'jpeg';
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (storageError) throw storageError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      updateProfileState({ avatar_url: publicUrl });
      Alert.alert('Éxito', 'Foto de perfil actualizada correctamente.');
    } catch (error: any) {
      console.error('Error al subir avatar:', error);
      Alert.alert('Error', error.message || 'No se pudo actualizar la imagen.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ─── Borrar avatar ─────────────────────────────────────────────────────────
  const deleteAvatar = async () => {
    if (!profile?.avatar_url) return;

    Alert.alert(
      'Borrar foto',
      '¿Estás seguro de que quieres eliminar tu foto de perfil?',
      [
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

              updateProfileState({ avatar_url: null });
              Alert.alert('Listo', 'Foto de perfil eliminada.');
            } catch (error: any) {
              console.error('Error al borrar avatar:', error);
              Alert.alert('Error', error.message || 'No se pudo eliminar la imagen.');
            } finally {
              setUploadingAvatar(false);
            }
          },
        },
      ]
    );
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

    Alert.alert('Foto de perfil', '¿Qué deseas hacer?', options);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Sidebar visible={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[appStyles.screen, { backgroundColor: 'transparent' }]}>

          <TouchableOpacity
            onPress={() => setIsSidebarOpen(true)}
            style={localStyles.menuButton}
          >
            <Text style={{ fontSize: 24, color: colors.textPrimary }}>☰</Text>
          </TouchableOpacity>

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
            <TouchableOpacity onPress={signOut}>
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
    marginTop: 40,
    marginBottom: 10,
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