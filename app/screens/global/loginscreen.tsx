import { AntDesign } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
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
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';
import { useAppStyles } from '../../../styles/appStyles';


export default function LoginScreen() {
  const { colors } = useTheme();
  const appStyles = useAppStyles();
  const { signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validate = () => {
    let valid = true;

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

    return valid;
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
    } catch (err: any) {
      setPasswordError(err?.message ?? 'Error al iniciar con Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setPasswordError('Correo o contraseña incorrectos.');
      return;
    }

    // Al iniciar sesión exitosamente, redirigimos al punto de entrada ('/')
    // donde el Index manejará la distribución por roles.
    router.replace('/');
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

          {/* Back button */}
          <TouchableOpacity
            style={appStyles.back}
            onPress={() => router.replace('/screens/global/home')}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13, letterSpacing: 1 }}>
              ← HOME
            </Text>
          </TouchableOpacity>

          <View style={appStyles.screenContent}>

            {/* Header */}
            <View>
              <Text style={appStyles.title}>Iniciar{'\n'}Sesión</Text>
              <Text style={appStyles.subtitle}>
                Accede a tu cuenta para continuar.
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
                }}
              />
              {passwordError ? (
                <Text style={appStyles.errorText}>{passwordError}</Text>
              ) : null}
            </View>

            {/* Olvidé contraseña */}
            <TouchableOpacity
              onPress={() => router.push('/screens/global/forgotPassword')}
              activeOpacity={0.7}
            >
              <Text style={appStyles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            {/* Botón primario */}
            <TouchableOpacity
              style={[appStyles.primaryButton, loading ? { opacity: 0.7 } : null]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color='#111827' />
              ) : (
                <Text style={appStyles.primaryButtonText}>Ingresar</Text>
              )}
            </TouchableOpacity>

            {/* Divisor */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text style={{ color: colors.textSecondary, fontSize: 12, letterSpacing: 1 }}>O</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            {/* Botón Google */}
            <TouchableOpacity
              style={[loginStyles.googleButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={colors.textPrimary} />
              ) : (
                <>
                  <ExpoImage 
                    source={require('../../../assets/images/google-logo.svg')} 
                    style={{ width: 18, height: 18 }} 
                    contentFit="contain"
                  />
                  <Text style={[loginStyles.googleText, { color: colors.textPrimary }]}>
                    Continuar con Google (Proximamente)
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Botón secundario */}
            <TouchableOpacity
              style={appStyles.secondaryButton}
              onPress={() => router.push('/screens/global/signup')}
              activeOpacity={0.8}
            >
              <Text style={appStyles.secondaryButtonText}>Crear cuenta</Text>
            </TouchableOpacity>

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const loginStyles = StyleSheet.create({
  googleButton: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    gap: 10,
  },
  googleText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: 'Inter_500Medium',
  },
});