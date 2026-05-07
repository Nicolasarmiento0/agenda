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
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';
import { useAppStyles } from '../../../styles/appStyles'; // ajusta el path

export default function SignupScreen() {
  const { colors } = useTheme();
  const appStyles = useAppStyles();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [loading, setLoading] = useState(false);

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

    // Si tienes confirmación de email activa en Supabase,
    // avisa al usuario que revise su correo
    router.push('/screens/role-select' as any);
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
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13, letterSpacing: 1 }}>
              ← VOLVER
            </Text>
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

            {/* Botón primario */}
            <TouchableOpacity
              style={[appStyles.primaryButton, loading ? { opacity: 0.7 } : null]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
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
              onPress={() => router.push('/screens/loginscreen')}
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