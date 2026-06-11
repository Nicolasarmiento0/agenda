import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, useAppStyles } from '../../styles/appStyles'; // ajusta el path

type Step = 'email' | 'success';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const appStyles = useAppStyles();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      setEmailError('El correo es requerido.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Ingresa un correo válido.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSend = async () => {
    if (!validate()) return;

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'nucora://resetPassword', // cambia 'myapp' por el scheme de tu app
    });

    setLoading(false);

    if (error) {
      setEmailError('No pudimos enviar el correo. Intenta nuevamente.');
      return;
    }

    setStep('success');
  };

  // ─── Vista de éxito ───────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <View style={appStyles.screenCentered}>

        {/* Ícono circular */}
        <View style={localStyles.iconCircle}>
          <Text style={localStyles.iconText}>✓</Text>
        </View>

        <Text style={[appStyles.title, { textAlign: 'center', fontSize: 28, paddingVertical: 10 }]}>
          CORREO{'\n'}ENVIADO
        </Text>

        <Text style={appStyles.subtitleCentered}>
          Revisa tu bandeja de entrada en{'\n'}
          <Text style={{ color: colors.textPrimary }}>{email}</Text>
          {'\n'}y sigue las instrucciones para restablecer tu contraseña.
        </Text>

        <View style={{ height: 1, width: '100%', backgroundColor: colors.border, marginVertical: 16 }} />

        <Text style={[appStyles.subtitleCentered, { fontSize: 12 }]}>
          ¿No recibiste nada? Revisa tu carpeta de spam o vuelve a intentarlo.
        </Text>

        <TouchableOpacity
          style={[appStyles.primaryButton, { marginTop: 24 }]}
          onPress={() => setStep('email')}
          activeOpacity={0.8}
        >
          <Text style={appStyles.primaryButtonText}>Volver a intentar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={appStyles.secondaryButton}
          onPress={() => router.replace('/login')}
          activeOpacity={0.8}
        >
          <Text style={appStyles.secondaryButtonText}>Ir al login</Text>
        </TouchableOpacity>

      </View>
    );
  }

  // ─── Vista de email ───────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={appStyles.screen}>

          {/* Back */}
          <TouchableOpacity
            style={appStyles.back}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/login');
              }
            }}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={appStyles.screenContent}>

            {/* Header */}
            <View>
              <Text style={appStyles.title}>¿Olvidaste{'\n'}tu clave?</Text>
              <Text style={appStyles.subtitle}>
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </Text>
            </View>

            {/* Email */}
            <View style={{ gap: 6 }}>
              <TextInput
                style={[
                  appStyles.input,
                  emailError ? { borderColor: colors.error } : null,
                ]}
                placeholder="Correo electrónico"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
              />
              {emailError ? (
                <Text style={appStyles.errorText}>{emailError}</Text>
              ) : null}
            </View>

            {/* Botón primario */}
            <TouchableOpacity
              style={[appStyles.primaryButton, loading ? { opacity: 0.7 } : null]}
              onPress={handleSend}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color='#111827' />
              ) : (
                <Text style={appStyles.primaryButtonText}>Enviar enlace</Text>
              )}
            </TouchableOpacity>

            {/* Volver al login */}
            <TouchableOpacity
              onPress={() => router.push('/login')}
              activeOpacity={0.7}
            >
              <Text style={appStyles.forgotText}>¿Recordaste tu contraseña? Inicia sesión</Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

import { StyleSheet } from 'react-native';

const localStyles = StyleSheet.create({
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: appColors.primary,
    backgroundColor: appColors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconText: {
    color: appColors.primary,
    fontSize: 28,
    fontWeight: '300',
  },
});