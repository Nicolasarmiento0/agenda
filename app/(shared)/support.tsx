import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import { appColors } from '../../styles/appStyles';

const SUPPORT_EMAIL = 'nucorachile@gmail.com';

export default function SupportScreen() {
  const { colors } = useTheme();
  const { showAlert } = useAlert();

  const openEmail = async (subject: string) => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      showAlert({
        title: 'Sin app de correo',
        message: `Escríbenos directamente a:\n${SUPPORT_EMAIL}`,
      });
    }
  };

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
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Soporte</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <View style={[s.heroIcon, { backgroundColor: `${appColors.primary}18` }]}>
            <Feather name="headphones" size={32} color={appColors.primary} />
          </View>
          <Text style={[s.heroTitle, { color: colors.textPrimary }]}>¿Cómo podemos ayudarte?</Text>
          <Text style={[s.heroSubtitle, { color: colors.textSecondary }]}>
            Nuestro equipo responde en un plazo de{' '}
            <Text style={{ color: appColors.primary }}>24 – 48 horas hábiles</Text>.
          </Text>
        </View>

        {/* Opciones de contacto */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>CONTACTAR</Text>

        <ContactItem
          icon="mail"
          title="Soporte general"
          subtitle="Problemas con la app, cuenta o citas"
          colors={colors}
          onPress={() => openEmail('[Soporte] — ')}
        />

        <ContactItem
          icon="alert-circle"
          title="Reportar un problema"
          subtitle="Bug, error técnico o comportamiento inesperado"
          colors={colors}
          onPress={() => openEmail('[Reporte de error] — ')}
        />

        <ContactItem
          icon="briefcase"
          title="Mi negocio en NUCORA"
          subtitle="Alta de negocio, aprobación o configuración"
          colors={colors}
          onPress={() => openEmail('[Mi negocio] — ')}
        />

        <ContactItem
          icon="shield"
          title="Privacidad y datos personales"
          subtitle="Solicitudes de acceso, rectificación o eliminación"
          colors={colors}
          onPress={() => openEmail('[Privacidad] — ')}
        />

        {/* Email directo */}
        <View style={[s.emailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="at-sign" size={16} color={appColors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[s.emailLabel, { color: colors.textSecondary }]}>CORREO DE SOPORTE</Text>
            <Text style={[s.emailValue, { color: colors.textPrimary }]}>{SUPPORT_EMAIL}</Text>
          </View>
          <TouchableOpacity
            style={[s.copyBtn, { backgroundColor: `${appColors.primary}20` }]}
            onPress={() => openEmail('')}
            activeOpacity={0.7}
          >
            <Feather name="send" size={14} color={appColors.primary} />
          </TouchableOpacity>
        </View>

        {/* Links legales */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary, marginTop: 12 }]}>LEGAL</Text>

        <LegalItem
          label="Términos y Condiciones"
          colors={colors}
          onPress={() => router.push('/terms')}
        />
        <LegalItem
          label="Política de Privacidad"
          colors={colors}
          onPress={() => router.push('/privacy')}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function ContactItem({
  icon,
  title,
  subtitle,
  colors,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle: string;
  colors: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.item, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[s.itemIcon, { backgroundColor: colors.background }]}>
        <Feather name={icon} size={18} color={appColors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.itemTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[s.itemSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function LegalItem({
  label,
  colors,
  onPress,
}: {
  label: string;
  colors: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.legalItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.legalLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Feather name="chevron-right" size={14} color={colors.textSecondary} />
    </TouchableOpacity>
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
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 40 },

  hero: { alignItems: 'center', marginBottom: 36, gap: 12 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'Inter_700Bold', textAlign: 'center' },
  heroSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, fontFamily: 'Inter_400Regular' },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 2,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  itemSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 28,
  },
  emailLabel: { fontSize: 10, letterSpacing: 1.5, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  emailValue: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  copyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  legalLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
