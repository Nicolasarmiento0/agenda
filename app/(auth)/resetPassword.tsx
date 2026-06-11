import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

type Step = 'form' | 'success';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const appStyles = useAppStyles();

  const [step, setStep] = useState<Step>('form');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase detecta automáticamente el token del deep link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validate = () => {
    let valid = true;

    if (!password.trim()) {
      setPasswordError('La contraseña es requerida.');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Mínimo 6 caracteres.');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Confirma tu contraseña.');
      valid = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('Las contraseñas no coinciden.');
      valid = false;
    } else {
      setConfirmPasswordError('');
    }

    return valid;
  };

  const handleReset = async () => {
    if (!validate()) return;

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setPasswordError('No pudimos actualizar la contraseña. Intenta nuevamente.');
      return;
    }

    setStep('success');
  };

  // ─── Vista de éxito ───────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <View style={appStyles.screenCentered}>
        <View style={localStyles.iconCircle}>
          <Text style={localStyles.iconText}>✓</Text>
        </View>

        <Text style={[appStyles.title, { textAlign: 'center', fontSize: 28, paddingVertical: 10 }]}>
          CONTRASEÑA{'\n'}ACTUALIZADA
        </Text>

        <Text style={appStyles.subtitleCentered}>
          Tu contraseña fue restablecida correctamente. Ya puedes iniciar sesión.
        </Text>

        <TouchableOpacity
          style={[appStyles.primaryButton, { marginTop: 24 }]}
          onPress={() => router.replace('/login')}
          activeOpacity={0.8}
        >
          <Text style={appStyles.primaryButtonText}>Ir al login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Formulario ───────────────────────────────────────────────────────────
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
          <View style={appStyles.screenContent}>

            {/* Header */}
            <View>
              <Text style={appStyles.title}>Nueva{'\n'}Contraseña</Text>
              <Text style={appStyles.subtitle}>
                Ingresa tu nueva contraseña para recuperar el acceso.
              </Text>
            </View>

            {/* Password */}
            <View style={{ gap: 6 }}>
              <TextInput
                style={[
                  appStyles.input,
                  passwordError ? { borderColor: colors.error } : null,
                ]}
                placeholder="Nueva contraseña"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                  if (confirmPasswordError && text === confirmPassword) setConfirmPasswordError('');
                }}
              />
              {passwordError ? (
                <Text style={appStyles.errorText}>{passwordError}</Text>
              ) : null}
            </View>

            {/* Confirm Password */}
            <View style={{ gap: 6 }}>
              <TextInput
                style={[
                  appStyles.input,
                  confirmPasswordError ? { borderColor: colors.error } : null,
                ]}
                placeholder="Confirmar contraseña"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) setConfirmPasswordError('');
                }}
              />
              {confirmPasswordError ? (
                <Text style={appStyles.errorText}>{confirmPasswordError}</Text>
              ) : null}
            </View>

            {/* Botón primario */}
            <TouchableOpacity
              style={[appStyles.primaryButton, (loading || !sessionReady) ? { opacity: 0.7 } : null]}
              onPress={handleReset}
              disabled={loading || !sessionReady}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={appStyles.primaryButtonText}>Restablecer contraseña</Text>
              )}
            </TouchableOpacity>

            {!sessionReady && (
              <Text style={[appStyles.subtitle, { textAlign: 'center', fontSize: 12 }]}>
                Verificando enlace de recuperación...
              </Text>
            )}

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