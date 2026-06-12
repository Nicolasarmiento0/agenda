import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { appColors } from '../../styles/appStyles';

const LAST_UPDATED = '1 de junio de 2026';

export default function TermsScreen() {
  const { colors } = useTheme();

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/profile');
          }
        }}>
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Términos y Condiciones</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={[s.updated, { color: colors.textSecondary }]}>
          Última actualización: {LAST_UPDATED}
        </Text>

        <Section title="1. Aceptación de los Términos" color={colors.textPrimary} secondary={colors.textSecondary}>
          Al registrarte y utilizar NUCORA (en adelante, &quot;la Plataforma&quot;), aceptas cumplir con estos Términos y Condiciones.
          Si no estás de acuerdo con alguna parte de estos términos, no debes usar la Plataforma.
        </Section>

        <Section title="2. Descripción del Servicio" color={colors.textPrimary} secondary={colors.textSecondary}>
          NUCORA es una plataforma digital de agendamiento y gestión de citas que conecta a negocios (empresas) con sus
          clientes. Permite a los negocios registrados publicar sus servicios, horarios y recibir reservas en línea, y a
          los clientes buscar negocios y agendar citas de forma remota.
        </Section>

        <Section title="3. Tipos de Usuarios" color={colors.textPrimary} secondary={colors.textSecondary}>
          La Plataforma distingue tres roles:{'\n\n'}
          <Text style={{ color: appColors.primary }}>• Cliente:</Text>
          {' '}usuario que busca y reserva citas en negocios registrados.{'\n\n'}
          <Text style={{ color: appColors.primary }}>• Empresa:</Text>
          {' '}negocio que publica sus servicios y gestiona sus citas a través de la Plataforma.{'\n\n'}
          <Text style={{ color: appColors.primary }}>• Trabajador:</Text>
          {' '}colaborador de una empresa que atiende citas asignadas por su negocio.
        </Section>

        <Section title="4. Registro y Cuenta" color={colors.textPrimary} secondary={colors.textSecondary}>
          Para acceder a la Plataforma debes crear una cuenta con datos verídicos y mantenerlos actualizados. Eres
          responsable de la confidencialidad de tus credenciales y de toda actividad realizada desde tu cuenta.
          NUCORA se reserva el derecho de suspender o eliminar cuentas que infrinjan estos Términos.
        </Section>

        <Section title="5. Uso Aceptable" color={colors.textPrimary} secondary={colors.textSecondary}>
          Queda prohibido:{'\n\n'}
          {'• '}Usar la Plataforma para actividades ilícitas o fraudulentas.{'\n'}
          {'• '}Publicar información falsa o engañosa sobre servicios o precios.{'\n'}
          {'• '}Interferir con el correcto funcionamiento técnico de la Plataforma.{'\n'}
          {'• '}Usar sistemas automatizados para acceder a la Plataforma sin autorización expresa.{'\n'}
          {'• '}Suplantar la identidad de otro usuario, empresa o trabajador.
        </Section>

        <Section title="6. Negocios y Servicios" color={colors.textPrimary} secondary={colors.textSecondary}>
          Los negocios que se registren en NUCORA son responsables de la veracidad de la información publicada
          (servicios, precios, horarios y ubicación). NUCORA actúa como intermediario tecnológico y no garantiza
          la calidad ni la prestación efectiva de los servicios ofrecidos por los negocios.{'\n\n'}
          Los negocios deben obtener las aprobaciones necesarias del administrador de la Plataforma antes de
          estar visibles para los clientes.
        </Section>

        <Section title="7. Citas y Cancelaciones" color={colors.textPrimary} secondary={colors.textSecondary}>
          Las citas agendadas a través de NUCORA constituyen un acuerdo entre el cliente y el negocio. NUCORA
          no es parte de dicho acuerdo y no asume responsabilidad por cancelaciones, inasistencias o disputas
          entre los usuarios. Las políticas de cancelación son definidas por cada negocio.
        </Section>

        <Section title="8. Propiedad Intelectual" color={colors.textPrimary} secondary={colors.textSecondary}>
          Todo el contenido de NUCORA (nombre, logo, interfaz, código fuente) es propiedad exclusiva de sus
          creadores y está protegido por las leyes de propiedad intelectual de Chile. Está prohibida su
          reproducción total o parcial sin autorización escrita.
        </Section>

        <Section title="9. Limitación de Responsabilidad" color={colors.textPrimary} secondary={colors.textSecondary}>
          NUCORA no será responsable por daños indirectos, incidentales o consecuentes derivados del uso o
          imposibilidad de uso de la Plataforma, incluyendo pérdida de datos, interrupciones del servicio o
          errores técnicos. La Plataforma se entrega &quot;tal cual&quot; sin garantías de disponibilidad continua.
        </Section>

        <Section title="10. Modificaciones" color={colors.textPrimary} secondary={colors.textSecondary}>
          NUCORA puede modificar estos Términos en cualquier momento. Los cambios serán notificados a través
          de la Plataforma. El uso continuado del servicio tras la publicación de modificaciones constituye
          aceptación de los nuevos Términos.
        </Section>

        <Section title="11. Legislación Aplicable" color={colors.textPrimary} secondary={colors.textSecondary}>
          Estos Términos se rigen por las leyes de la República de Chile. Cualquier disputa será sometida a
          la jurisdicción de los tribunales competentes de Santiago de Chile.
        </Section>

        <Section title="12. Contacto" color={colors.textPrimary} secondary={colors.textSecondary}>
          Para consultas sobre estos Términos, contáctanos en:{'\n'}
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
