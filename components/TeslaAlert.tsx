import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useAlert } from '../context/AlertContext';

export default function TeslaAlert() {
  const { visible, hideAlert, alertConfig } = useAlert();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 18,
          stiffness: 280,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!alertConfig) return null;

  const { title, message, buttons } = alertConfig;
  const alertButtons = buttons && buttons.length > 0
    ? buttons
    : [{ text: 'OK', onPress: () => { } }];

  const cancelBtn = alertButtons.find(b => b.style === 'cancel');
  const actionBtns = alertButtons.filter(b => b.style !== 'cancel');
  const orderedButtons = cancelBtn
    ? [cancelBtn, ...actionBtns]
    : alertButtons;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={hideAlert}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={hideAlert}>
        <Animated.View
          style={[
            styles.cardWrapper,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Pressable onPress={() => { }}>
            <BlurView intensity={12} tint={isDark ? 'dark' : 'light'} style={[styles.blurCard, !isDark && styles.blurCardLight]}>
              <View style={[styles.glassOverlay, !isDark && styles.glassOverlayLight]}>
                <TouchableOpacity style={[styles.closeButton, !isDark && styles.closeButtonLight]} onPress={hideAlert}>
                  <Text style={[styles.closeText, !isDark && styles.closeTextLight]}>✕</Text>
                </TouchableOpacity>

                <Text style={[styles.title, !isDark && styles.titleLight]}>{title}</Text>
                <Text style={[styles.message, !isDark && styles.messageLight]}>{message}</Text>

                <View style={styles.buttonContainer}>
                  {orderedButtons.map((btn, index) => {
                    const isDestructive = btn.style === 'destructive';
                    const isCancel = btn.style === 'cancel';
                    const isDefault = !isDestructive && !isCancel;

                    return (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.75}
                        style={[
                          styles.button,
                          isCancel && styles.cancelButton,
                          isCancel && !isDark && styles.cancelButtonLight,
                          (isDestructive || isDefault) && styles.actionButton,
                          isDefault && !isDark && styles.actionButtonLight,
                          isDestructive && styles.destructiveAction,
                        ]}
                        onPress={() => {
                          hideAlert();
                          if (btn.onPress) btn.onPress();
                        }}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            isCancel && styles.cancelText,
                            isCancel && !isDark && styles.cancelTextLight,
                            isDefault && styles.actionText,
                            isDefault && !isDark && styles.actionTextLight,
                            isDestructive && styles.destructiveText,
                          ]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {btn.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </BlurView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 42,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  blurCard: {
    borderRadius: 42,
    overflow: 'hidden',
    borderWidth: 0.2,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  glassOverlay: {
    backgroundColor: 'rgba(18,18,18,0.72)',
    padding: 28,
    paddingTop: 36,
    alignItems: 'center',
    gap: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.62)',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  button: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
  },
  destructiveAction: {
    backgroundColor: '#E31937',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.75)',
  },
  actionText: {
    color: '#0A0A0A',
  },
  destructiveText: {
    color: '#FFFFFF',
  },
  // Light mode overrides
  blurCardLight: {
    borderColor: 'rgba(0,0,0,0.08)',
  },
  glassOverlayLight: {
    backgroundColor: 'rgba(248,248,248,0.88)',
  },
  closeButtonLight: {
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  closeTextLight: {
    color: 'rgba(0,0,0,0.4)',
  },
  titleLight: {
    color: '#0A0A0A',
  },
  messageLight: {
    color: 'rgba(0,0,0,0.55)',
  },
  cancelButtonLight: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  cancelTextLight: {
    color: 'rgba(0,0,0,0.65)',
  },
  actionButtonLight: {
    backgroundColor: '#0A0A0A',
  },
  actionTextLight: {
    color: '#FFFFFF',
  },
});
