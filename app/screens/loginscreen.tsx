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
import { supabase } from '../../lib/supabase'; // ajusta el path
import { appColors, appStyles } from '../../styles/appStyles'; // ajusta el path 


export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleLogin = async () => {
    if (!validate()) return;
  
    setLoading(true);
  
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
  
    setLoading(false);
  
    if (error) {
      setPasswordError('Correo o contraseña incorrectos.');
      return;
    }
  
    router.replace('/screens/dashboard');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: appColors.background }}
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
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={{ color: appColors.textSecondary, fontSize: 13, letterSpacing: 1 }}>
              ← VOLVER
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
                  emailError ? { borderColor: appColors.error } : null,
                ]}
                placeholder="Correo electrónico"
                placeholderTextColor={appColors.textSecondary}
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
                  passwordError ? { borderColor: appColors.error } : null,
                ]}
                placeholder="Contraseña"
                placeholderTextColor={appColors.textSecondary}
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
              onPress={() => router.push('/screens/forgotPassword')}
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
                <ActivityIndicator color={appColors.white} />
              ) : (
                <Text style={appStyles.primaryButtonText}>Ingresar</Text>
              )}
            </TouchableOpacity>

            {/* Divisor */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: appColors.border }} />
              <Text style={{ color: appColors.textSecondary, fontSize: 12, letterSpacing: 1 }}>O</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: appColors.border }} />
            </View>

            {/* Botón secundario */}
            <TouchableOpacity
              style={appStyles.secondaryButton}
              onPress={() => router.push('/screens/signup')}
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