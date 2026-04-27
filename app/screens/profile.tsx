import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appStyles } from '../../styles/appStyles';

export default function ProfileScreen() {
  // 1. Extraemos la nueva función updateProfileState
  const { profile, user, signOut, updateProfileState } = useAuth();
  const { colors, isDarkMode } = useTheme();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (profile?.nickname) {
      setNickname(profile.nickname);
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!nickname.trim()) {
      Alert.alert('Atención', 'El nickname no puede estar vacío');
      return;
    }

    try {
      // 2. Usamos .select() para obligar a Supabase a devolver el valor YA guardado
      const { data, error } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('id', user?.id)
        .select()
        .single();

      if (error) throw error;
      
      // 3. LA MAGIA: Actualizamos el "cerebro" de la app instantáneamente
      // sin tener que volver a descargar todo.
      if (data) {
        updateProfileState({ nickname: data.nickname });
      }
      
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

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
          
          <View style={[localStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[localStyles.avatarPlaceholder, { backgroundColor: isDarkMode ? '#333' : '#E1E1E1' }]}>
              <Text style={{ fontSize: 40 }}>👤</Text>
            </View>
            
            <Text style={[localStyles.emailText, { color: colors.textSecondary }]}>
              {user?.email}
            </Text>
          </View>

          <View style={[localStyles.section, { borderTopColor: colors.border }]}>
            <Text style={[localStyles.label, { color: colors.textSecondary }]}>NICKNAME</Text>
            
            {isEditing ? (
              <TextInput
                style={[localStyles.input, { 
                  color: colors.textPrimary, 
                  backgroundColor: isDarkMode ? '#1E1E1E' : '#F9F9F9',
                  borderColor: colors.primary 
                }]}
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
                  borderWidth: 1 
                }
              ]}
              onPress={isEditing ? handleUpdateProfile : () => setIsEditing(true)}
            >
              <Text style={{ color: isEditing ? '#FFFFFF' : colors.primary, fontWeight: 'bold', fontSize: 13 }}>
                {isEditing ? 'GUARDAR CAMBIOS' : 'EDITAR NICKNAME'}
              </Text>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
  }
});