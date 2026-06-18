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
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors } from '../../styles/appStyles';

const LAST_UPDATED = '1 de junio de 2026';

export default function PrivacyScreen() {
  const { user, signOut } = useAuth();
  const { colors } = useTheme();
  const { showAlert } = useAlert();

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'nucora://auth/callback'
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
              const { error } = await supabase.rpc('delete_user');
              if (error) throw error;

              await signOut();
              router.replace('/home');
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
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/profile');
          }
        }}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Privacidad y Seguridad</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Opciones de cuenta - Solo para usuarios autenticados */}
        {user && (
          <>
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

            {/* Separador visual antes del texto de política de privacidad */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </>
        )}

        {/* Contenido de la Política de Privacidad */}
        <View style={styles.policyContainer}>
          <Text style={[styles.policyHeaderTitle, { color: colors.textPrimary }]}>Política de Privacidad</Text>
          <Text style={[styles.policyUpdated, { color: colors.textSecondary }]}>
            Última actualización: {LAST_UPDATED}
          </Text>

          <PolicySection title="1. Responsable del Tratamiento" color={colors.textPrimary} secondary={colors.textSecondary}>
            NUCORA, operada por su equipo fundador, es responsable del tratamiento de los datos personales
            recopilados a través de la Plataforma. Puedes contactarnos en:{'\n'}
            <Text style={{ color: appColors.primary }}>nucorachile@gmail.com</Text>
          </PolicySection>

          <PolicySection title="2. Datos que Recopilamos" color={colors.textPrimary} secondary={colors.textSecondary}>
            Recopilamos los siguientes datos personales:{'\n\n'}
            <Text style={{ fontFamily: 'Inter_700Bold', color: colors.textPrimary }}>Al registrarte:</Text>
            {'\n'}{'• '}Nombre completo{'\n'}
            {'• '}Correo electrónico{'\n'}
            {'• '}Contraseña (almacenada de forma cifrada){'\n\n'}
            <Text style={{ fontFamily: 'Inter_700Bold', color: colors.textPrimary }}>Al usar la Plataforma:</Text>
            {'\n'}{'• '}Foto de perfil (opcional){'\n'}
            {'• '}Historial de citas agendadas{'\n'}
            {'• '}Reseñas y calificaciones emitidas{'\n\n'}
            <Text style={{ fontFamily: 'Inter_700Bold', color: colors.textPrimary }}>Si eres empresa/negocio:</Text>
            {'\n'}{'• '}Nombre del negocio y descripción{'\n'}
            {'• '}Logo del negocio (opcional){'\n'}
            {'• '}Enlace de Google Maps y redes sociales (opcional){'\n'}
            {'• '}Horarios de atención y servicios ofrecidos
          </PolicySection>

          <PolicySection title="3. Finalidad del Tratamiento" color={colors.textPrimary} secondary={colors.textSecondary}>
            Utilizamos tus datos para:{'\n\n'}
            {'• '}Gestionar tu cuenta y autenticación.{'\n'}
            {'• '}Facilitar la reserva y gestión de citas entre clientes y negocios.{'\n'}
            {'• '}Mostrar tu perfil y el de tu negocio a otros usuarios de la Plataforma.{'\n'}
            {'• '}Enviarte notificaciones sobre el estado de tus citas.{'\n'}
            {'• '}Mejorar la experiencia de uso y el rendimiento de la Plataforma.{'\n'}
            {'• '}Cumplir con obligaciones legales aplicables.
          </PolicySection>

          <PolicySection title="4. Base Legal" color={colors.textPrimary} secondary={colors.textSecondary}>
            El tratamiento de tus datos se basa en el consentimiento otorgado al aceptar esta Política de
            Privacidad al momento del registro, y en la ejecución del contrato de servicios que constituyen
            estos Términos. En Chile, cumplimos con la Ley N.° 19.628 sobre Protección de la Vida Privada.
          </PolicySection>

          <PolicySection title="5. Terceros y Subprocesadores" color={colors.textPrimary} secondary={colors.textSecondary}>
            Para operar la Plataforma utilizamos los siguientes servicios de terceros, quienes pueden tener
            acceso a tus datos en la medida necesaria para prestar sus servicios:{'\n\n'}
            <Text style={{ color: appColors.primary }}>• Supabase (supabase.com):</Text>
            {' '}proveedor de base de datos, autenticación y almacenamiento de archivos. Tus datos se
            almacenan en servidores seguros bajo estándares SOC 2.{'\n\n'}
            <Text style={{ color: appColors.primary }}>• Expo (expo.dev):</Text>
            {' '}plataforma de distribución de la aplicación móvil.{'\n\n'}
            No vendemos ni compartimos tus datos personales con terceros con fines comerciales.
          </PolicySection>

          <PolicySection title="6. Almacenamiento y Seguridad" color={colors.textPrimary} secondary={colors.textSecondary}>
            Tus datos se almacenan en servidores con cifrado en tránsito (TLS) y en reposo. Implementamos
            medidas técnicas y organizativas para proteger tu información contra accesos no autorizados,
            pérdida o divulgación. Las contraseñas se almacenan con hash seguro y nunca en texto plano.
          </PolicySection>

          <PolicySection title="7. Retención de Datos" color={colors.textPrimary} secondary={colors.textSecondary}>
            Conservamos tus datos mientras mantengas una cuenta activa en NUCORA. Si eliminas tu cuenta,
            procederemos a borrar tus datos personales en un plazo de 30 días, salvo obligación legal
            que exija su conservación por un período determinado.
          </PolicySection>

          <PolicySection title="8. Tus Derechos" color={colors.textPrimary} secondary={colors.textSecondary}>
            De acuerdo con la legislación chilena (Ley N.° 19.628), tienes derecho a:{'\n\n'}
            {'• '}Acceder a los datos personales que tenemos sobre ti.{'\n'}
            {'• '}Solicitar la rectificación de datos incorrectos o incompletos.{'\n'}
            {'• '}Solicitar la eliminación de tus datos (derecho al olvido).{'\n'}
            {'• '}Oponerte al tratamiento de tus datos en determinadas circunstancias.{'\n\n'}
            Para ejercer cualquiera de estos derechos, contáctanos en:{'\n'}
            <Text style={{ color: appColors.primary }}>nucorachile@gmail.com</Text>
          </PolicySection>

          <PolicySection title="9. Cookies y Datos de Uso" color={colors.textPrimary} secondary={colors.textSecondary}>
            La versión web de NUCORA puede utilizar cookies técnicas necesarias para el funcionamiento
            de la sesión. No utilizamos cookies de seguimiento o publicidad de terceros.
          </PolicySection>

          <PolicySection title="10. Menores de Edad" color={colors.textPrimary} secondary={colors.textSecondary}>
            NUCORA no está dirigida a menores de 14 años. Si eres menor de esa edad, no debes registrarte
            sin el consentimiento de tu padre, madre o tutor legal.
          </PolicySection>

          <PolicySection title="11. Cambios a esta Política" color={colors.textPrimary} secondary={colors.textSecondary}>
            Podemos actualizar esta Política de Privacidad periódicamente. Te notificaremos sobre cambios
            significativos a través de la Plataforma. El uso continuado del servicio implica aceptación
            de la política actualizada.
          </PolicySection>

          <PolicySection title="12. Contacto" color={colors.textPrimary} secondary={colors.textSecondary}>
            Para consultas, solicitudes de datos o cualquier inquietud sobre privacidad:{'\n'}
            <Text style={{ color: appColors.primary }}>nucorachile@gmail.com</Text>
          </PolicySection>
        </View>
      </ScrollView>
    </View>
  );
}

function PolicySection({
  title,
  children,
  color,
  secondary,
}: {
  title: string;
  children: React.ReactNode;
  color: string;
  secondary: string;
}) {
  return (
    <View style={styles.policySection}>
      <Text style={[styles.policySectionTitle, { color }]}>{title}</Text>
      <Text style={[styles.policySectionBody, { color: secondary }]}>{children}</Text>
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
  divider: { height: 1, marginVertical: 8, marginBottom: 32 },
  policyContainer: { marginTop: 10 },
  policyHeaderTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 6 },
  policyUpdated: { fontSize: 12, letterSpacing: 0.3, marginBottom: 24, fontFamily: 'Inter_400Regular' },
  policySection: { marginBottom: 28 },
  policySectionTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 8, letterSpacing: 0.2 },
  policySectionBody: { fontSize: 14, lineHeight: 22, fontFamily: 'Inter_400Regular' },
});
