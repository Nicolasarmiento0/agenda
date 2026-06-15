import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { appColors, useAppStyles } from '../../styles/appStyles';

export default function SignupScreen() {
  const { colors } = useTheme();
  const appStyles = useAppStyles();
  const { returnTo, forceRole } = useLocalSearchParams<{ returnTo?: string; forceRole?: string }>();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');

  const validate = () => {
    let valid = true;

    if (!name.trim()) {
      setNameError('El nombre es requerido.');
      valid = false;
    } else {
      setNameError('');
    }

    if (!email.trim()) {
      setEmailError('El correo es requerido.');
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Ingresa un correo válido.');
      valid = false;
    } else {
      setEmailError('');
    }

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

    if (!termsAccepted || !privacyAccepted) {
      setTermsError('Debes aceptar los Términos y la Política de Privacidad.');
      valid = false;
    } else {
      setTermsError('');
    }

    return valid;
  };

  const handleSignup = async () => {
    if (!validate()) return;

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      setEmailError(error.message);
      return;
    }

    // Propagate deferred booking params so role-select can redirect afterwards
    if (forceRole && returnTo) {
      router.push(`/role-select?returnTo=${encodeURIComponent(returnTo)}&forceRole=${forceRole}` as any);
    } else {
      router.push('/role-select');
    }
  };

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
              <Text style={appStyles.title}>Crear{'\n'}Cuenta</Text>
              <Text style={appStyles.subtitle}>
                Regístrate para comenzar.
              </Text>
            </View>

            {/* Nombre */}
            <View style={{ gap: 6 }}>
              <TextInput
                style={[
                  appStyles.input,
                  nameError ? { borderColor: colors.error } : null,
                ]}
                placeholder="Nombre completo"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                autoCorrect={false}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (nameError) setNameError('');
                }}
              />
              {nameError ? <Text style={appStyles.errorText}>{nameError}</Text> : null}
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
              {emailError ? <Text style={appStyles.errorText}>{emailError}</Text> : null}
            </View>

            {/* Password */}
            <View style={{ gap: 6 }}>
              <TextInput
                style={[
                  appStyles.input,
                  passwordError ? { borderColor: colors.error } : null,
                ]}
                placeholder="Contraseña"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                  if (confirmPasswordError && text === confirmPassword) setConfirmPasswordError('');
                }}
              />
              {passwordError ? <Text style={appStyles.errorText}>{passwordError}</Text> : null}
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

            {/* Checkboxes legales */}
            <View style={{ gap: 10 }}>
              <TouchableOpacity
                style={signupStyles.checkRow}
                onPress={() => { setTermsAccepted(v => !v); setTermsError(''); }}
                activeOpacity={0.7}
              >
                <View style={[signupStyles.checkbox, { borderColor: termsError ? colors.error : colors.border }, termsAccepted && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}>
                  {termsAccepted && <Feather name="check" size={12} color="#111827" />}
                </View>
                <Text style={[signupStyles.checkLabel, { color: colors.textSecondary }]}>
                  Acepto los{' '}
                  <Text
                    style={{ color: appColors.primary, textDecorationLine: 'underline' }}
                    onPress={() => router.push('/terms')}
                  >
                    Términos y Condiciones
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={signupStyles.checkRow}
                onPress={() => { setPrivacyAccepted(v => !v); setTermsError(''); }}
                activeOpacity={0.7}
              >
                <View style={[signupStyles.checkbox, { borderColor: termsError ? colors.error : colors.border }, privacyAccepted && { backgroundColor: appColors.primary, borderColor: appColors.primary }]}>
                  {privacyAccepted && <Feather name="check" size={12} color="#111827" />}
                </View>
                <Text style={[signupStyles.checkLabel, { color: colors.textSecondary }]}>
                  Acepto la{' '}
                  <Text
                    style={{ color: appColors.primary, textDecorationLine: 'underline' }}
                    onPress={() => router.push('/privacy-policy' as any)}
                  >
                    Política de Privacidad
                  </Text>
                </Text>
              </TouchableOpacity>

              {termsError ? (
                <Text style={appStyles.errorText}>{termsError}</Text>
              ) : null}
            </View>

            {/* Botón primario */}
            <TouchableOpacity
              style={[appStyles.primaryButton, (loading || !termsAccepted || !privacyAccepted) ? { opacity: 0.5 } : null]}
              onPress={handleSignup}
              disabled={loading || !termsAccepted || !privacyAccepted}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color='#111827' />
              ) : (
                <Text style={appStyles.primaryButtonText}>Crear cuenta</Text>
              )}
            </TouchableOpacity>

            {/* Divisor */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text style={{ color: colors.textSecondary, fontSize: 12, letterSpacing: 1 }}>O</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            {/* Ya tengo cuenta */}
            <TouchableOpacity
              style={appStyles.secondaryButton}
              onPress={() => router.push('/login')}
              activeOpacity={0.8}
            >
              <Text style={appStyles.secondaryButtonText}>Ya tengo cuenta</Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const signupStyles = StyleSheet.create({
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
  },
});