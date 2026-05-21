import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';
import { appColors } from '../../../styles/appStyles';

export default function PrivacyScreen() {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const { showAlert } = useAlert();

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      // Usar la funcionalidad de GoTrue para tier gratuito
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'myapp://reset-password'
      });
      if (error) throw error;
      showAlert({ title: 'Correo enviado', message: 'Revisa tu bandeja de entrada para restablecer tu contraseña. (Límite: 3 correos por hora)' });
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message });
    }
  };

  const handleDeleteAccount = () => {
    showAlert({
      title: 'Confirmar eliminación',
      message: '¿Estás seguro de que quieres eliminar tu cuenta permanentemente? Esta acción es irreversible y borrará todos tus datos según normativas de privacidad.',
      buttons: [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar permanentemente',
          style: 'destructive',
          onPress: async () => {
            try {
              // Llamar a una función Postgres "delete_user" que el admin debe crear en Supabase
              const { error } = await supabase.rpc('delete_user');
              if (error) throw error;

              await signOut();
              router.replace('/screens/global/home');
            } catch (err: any) {
              showAlert({
                title: 'Atención requerida',
                message: 'Para que esto funcione, debes crear la función "delete_user" en Supabase. Revisa las instrucciones previas.'
              });
            }
          }
        }
      ]
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header con botón back */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Privacidad y Seguridad</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>GESTIÓN DE ACCESO</Text>

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleResetPassword}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: colors.background }]}>
                <Feather name="key" size={18} color={appColors.primary} />
              </View>
              <View>
                <Text style={[styles.menuItemTitle, { color: colors.textPrimary }]}>Restablecer contraseña</Text>
                <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>Enviar correo de recuperación</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ZONA DE PELIGRO</Text>

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleDeleteAccount}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBox, { backgroundColor: '#FF4B4B15' }]}>
                <Feather name="trash-2" size={18} color="#FF4B4B" />
              </View>
              <View>
                <Text style={[styles.menuItemTitle, { color: '#FF4B4B' }]}>Eliminar cuenta</Text>
                <Text style={[styles.menuItemSubtitle, { color: colors.textSecondary }]}>Borrar datos permanentemente</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  content: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4, fontFamily: 'Inter_700Bold' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuItemTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2, fontFamily: 'Inter_700Bold' },
  menuItemSubtitle: { fontSize: 12, fontWeight: '500', opacity: 0.8, fontFamily: 'Inter_500Medium' },
});
