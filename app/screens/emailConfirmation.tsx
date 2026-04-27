import { router } from 'expo-router';
import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { appColors, appStyles } from '../../styles/appStyles'; // ajusta el path

export default function EmailConfirmationScreen() {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: appColors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={appStyles.screen}>
        <View style={appStyles.screenContent}>

          {/* Ícono */}
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 64 }}>📧</Text>
          </View>

          {/* Texto */}
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Text style={appStyles.title}>Revisa tu{'\n'}correo</Text>
            <Text style={[appStyles.subtitle, { textAlign: 'center' }]}>
              Te enviamos un enlace de confirmación. Revisa tu bandeja de entrada y sigue las instrucciones para activar tu cuenta.
            </Text>
          </View>

          {/* Botón volver al login */}
          <TouchableOpacity
            style={appStyles.primaryButton}
            onPress={() => router.replace('/screens/loginscreen')}
            activeOpacity={0.8}
          >
            <Text style={appStyles.primaryButtonText}>Volver al inicio de sesión</Text>
          </TouchableOpacity>

        </View>
      </View>
    </KeyboardAvoidingView>
  );
}