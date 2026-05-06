import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useTheme } from '../context/ThemeContext';
import { appColors } from '../styles/appStyles';

export default function TeslaAlert() {
  const { visible, hideAlert, alertConfig } = useAlert();
  const { colors } = useTheme();

  if (!alertConfig) return null;

  const { title, message, buttons } = alertConfig;

  // Si no hay botones, agregamos uno por defecto
  const alertButtons = buttons && buttons.length > 0 
    ? buttons 
    : [{ text: 'OK', onPress: () => {} }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={hideAlert}
    >
      <Pressable style={styles.overlay} onPress={hideAlert}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          
          <View style={styles.buttonContainer}>
            {alertButtons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel = btn.style === 'cancel';
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button, 
                    { borderColor: colors.border },
                    index > 0 && styles.buttonMargin,
                    isDestructive && styles.destructiveButton
                  ]}
                  onPress={() => {
                    hideAlert();
                    if (btn.onPress) btn.onPress();
                  }}
                >
                  <Text 
                    style={[
                      styles.buttonText, 
                      { color: colors.textPrimary },
                      isDestructive && { color: '#fff' },
                      isCancel && { color: colors.textSecondary }
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {btn.text.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
    gap: 12,
    // Sombra para iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    // Elevación para Android
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonMargin: {
    marginLeft: 0, // ya tenemos gap
  },
  destructiveButton: {
    backgroundColor: appColors.primary,
    borderColor: appColors.primary,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
