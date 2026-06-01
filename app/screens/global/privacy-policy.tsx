import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { appColors } from '../../../styles/appStyles';

const LAST_UPDATED = '1 de junio de 2026';

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Política de Privacidad</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.updated, { color: colors.textSecondary }]}>
          Última actualización: {LAST_UPDATED}
        </Text>

        <Section title="1. Responsable del Tratamiento" color={colors.textPrimary} secondary={colors.textSecondary}>
          NUCORA, operada por su equipo fundador, es responsable del tratamiento de los datos personales
          recopilados a través de la Plataforma. Puedes contactarnos en:{'\n'}
          <Text style={{ color: appColors.primary }}>nucorachile@gmail.com</Text>
        </Section>

        <Section title="2. Datos que Recopilamos" color={colors.textPrimary} secondary={colors.textSecondary}>
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
        </Section>

        <Section title="3. Finalidad del Tratamiento" color={colors.textPrimary} secondary={colors.textSecondary}>
          Utilizamos tus datos para:{'\n\n'}
          {'• '}Gestionar tu cuenta y autenticación.{'\n'}
          {'• '}Facilitar la reserva y gestión de citas entre clientes y negocios.{'\n'}
          {'• '}Mostrar tu perfil y el de tu negocio a otros usuarios de la Plataforma.{'\n'}
          {'• '}Enviarte notificaciones sobre el estado de tus citas.{'\n'}
          {'• '}Mejorar la experiencia de uso y el rendimiento de la Plataforma.{'\n'}
          {'• '}Cumplir con obligaciones legales aplicables.
        </Section>

        <Section title="4. Base Legal" color={colors.textPrimary} secondary={colors.textSecondary}>
          El tratamiento de tus datos se basa en el consentimiento otorgado al aceptar esta Política de
          Privacidad al momento del registro, y en la ejecución del contrato de servicios que constituyen
          estos Términos. En Chile, cumplimos con la Ley N.° 19.628 sobre Protección de la Vida Privada.
        </Section>

        <Section title="5. Terceros y Subprocesadores" color={colors.textPrimary} secondary={colors.textSecondary}>
          Para operar la Plataforma utilizamos los siguientes servicios de terceros, quienes pueden tener
          acceso a tus datos en la medida necesaria para prestar sus servicios:{'\n\n'}
          <Text style={{ color: appColors.primary }}>• Supabase (supabase.com):</Text>
          {' '}proveedor de base de datos, autenticación y almacenamiento de archivos. Tus datos se
          almacenan en servidores seguros bajo estándares SOC 2.{'\n\n'}
          <Text style={{ color: appColors.primary }}>• Expo (expo.dev):</Text>
          {' '}plataforma de distribución de la aplicación móvil.{'\n\n'}
          No vendemos ni compartimos tus datos personales con terceros con fines comerciales.
        </Section>

        <Section title="6. Almacenamiento y Seguridad" color={colors.textPrimary} secondary={colors.textSecondary}>
          Tus datos se almacenan en servidores con cifrado en tránsito (TLS) y en reposo. Implementamos
          medidas técnicas y organizativas para proteger tu información contra accesos no autorizados,
          pérdida o divulgación. Las contraseñas se almacenan con hash seguro y nunca en texto plano.
        </Section>

        <Section title="7. Retención de Datos" color={colors.textPrimary} secondary={colors.textSecondary}>
          Conservamos tus datos mientras mantengas una cuenta activa en NUCORA. Si eliminas tu cuenta,
          procederemos a borrar tus datos personales en un plazo de 30 días, salvo obligación legal
          que exija su conservación por un período determinado.
        </Section>

        <Section title="8. Tus Derechos" color={colors.textPrimary} secondary={colors.textSecondary}>
          De acuerdo con la legislación chilena (Ley N.° 19.628), tienes derecho a:{'\n\n'}
          {'• '}Acceder a los datos personales que tenemos sobre ti.{'\n'}
          {'• '}Solicitar la rectificación de datos incorrectos o incompletos.{'\n'}
          {'• '}Solicitar la eliminación de tus datos (derecho al olvido).{'\n'}
          {'• '}Oponerte al tratamiento de tus datos en determinadas circunstancias.{'\n\n'}
          Para ejercer cualquiera de estos derechos, contáctanos en:{'\n'}
          <Text style={{ color: appColors.primary }}>nucorachile@gmail.com</Text>
        </Section>

        <Section title="9. Cookies y Datos de Uso" color={colors.textPrimary} secondary={colors.textSecondary}>
          La versión web de NUCORA puede utilizar cookies técnicas necesarias para el funcionamiento
          de la sesión. No utilizamos cookies de seguimiento o publicidad de terceros.
        </Section>

        <Section title="10. Menores de Edad" color={colors.textPrimary} secondary={colors.textSecondary}>
          NUCORA no está dirigida a menores de 14 años. Si eres menor de esa edad, no debes registrarte
          sin el consentimiento de tu padre, madre o tutor legal.
        </Section>

        <Section title="11. Cambios a esta Política" color={colors.textPrimary} secondary={colors.textSecondary}>
          Podemos actualizar esta Política de Privacidad periódicamente. Te notificaremos sobre cambios
          significativos a través de la Plataforma. El uso continuado del servicio implica aceptación
          de la política actualizada.
        </Section>

        <Section title="12. Contacto" color={colors.textPrimary} secondary={colors.textSecondary}>
          Para consultas, solicitudes de datos o cualquier inquietud sobre privacidad:{'\n'}
          <Text style={{ color: appColors.primary }}>nucorachile@gmail.com</Text>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Section({
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
    <View style={s.section}>
      <Text style={[s.sectionTitle, { color }]}>{title}</Text>
      <Text style={[s.sectionBody, { color: secondary }]}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 },
  updated: { fontSize: 12, letterSpacing: 0.3, marginBottom: 24 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold', marginBottom: 8, letterSpacing: 0.2 },
  sectionBody: { fontSize: 14, lineHeight: 22, fontFamily: 'Inter_400Regular' },
});
