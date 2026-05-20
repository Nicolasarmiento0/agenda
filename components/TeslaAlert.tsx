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
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
          stiffness: 300,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
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

  const isTwoButtons = orderedButtons.length === 2;

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
            <BlurView
              intensity={45}
              tint={isDark ? 'dark' : 'light'}
              style={[styles.blurCard, !isDark && styles.blurCardLight]}
            >
              <View style={[styles.glassOverlay, !isDark && styles.glassOverlayLight]}>
                {/* Close button */}
                <TouchableOpacity
                  style={[styles.closeButton, !isDark && styles.closeButtonLight]}
                  onPress={hideAlert}
                >
                  <Text style={[styles.closeText, !isDark && styles.closeTextLight]}>✕</Text>
                </TouchableOpacity>

                {/* Content */}
                <View style={styles.contentArea}>
                  <Text style={[styles.title, !isDark && styles.titleLight]}>{title}</Text>
                  {!!message && (
                    <Text style={[styles.message, !isDark && styles.messageLight]}>{message}</Text>
                  )}
                </View>



                {/* Buttons */}
                <View style={[styles.buttonContainer, isTwoButtons && styles.buttonContainerRow]}>
                  {orderedButtons.map((btn, index) => {
                    const isDestructive = btn.style === 'destructive';
                    const isCancel = btn.style === 'cancel';

                    return (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.52}
                        style={[
                          styles.button,
                          isTwoButtons && styles.buttonFlex,
                          isCancel && (isDark ? styles.cancelButton : styles.cancelButtonLight),
                          isDestructive && styles.destructiveButton,
                          !isCancel && !isDestructive && (isDark ? styles.actionButton : styles.actionButtonLight),
                        ]}
                        onPress={() => {
                          hideAlert();
                          if (btn.onPress) btn.onPress();
                        }}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            isCancel && (isDark ? styles.cancelText : styles.cancelTextLight),
                            isDestructive && styles.destructiveText,
                            !isCancel && !isDestructive && (isDark ? styles.actionText : styles.actionTextLight),
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
    backgroundColor: 'rgba(0,0,0,0.60)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 32,
  },
  blurCard: {
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  blurCardLight: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  glassOverlay: {
    paddingTop: 44,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Light tint to enhance glass effect
  },
  glassOverlayLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonLight: {
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  closeText: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 11,
    fontWeight: '600',
  },
  closeTextLight: {
    color: 'rgba(0,0,0,0.35)',
  },
  contentArea: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 8,
    paddingBottom: 20,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  titleLight: {
    color: '#0A0A0A',
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.58)',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  messageLight: {
    color: 'rgba(0,0,0,0.52)',
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginBottom: 16,
  },
  dividerLight: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 10,
  },
  buttonContainerRow: {
    flexDirection: 'row',
  },
  button: {
    paddingVertical: 15,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFlex: {
    flex: 1,
  },
  // Cancel — dark glass filled (dark mode)
  cancelButton: {
    backgroundColor: 'rgba(50,50,50,0.95)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  cancelButtonLight: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.10)',
  },
  // Action — white pill (dark mode) / dark pill (light mode)
  actionButton: {
    backgroundColor: '#FFFFFF',
  },
  actionButtonLight: {
    backgroundColor: '#0A0A0A',
  },
  // Destructive — always red
  destructiveButton: {
    backgroundColor: '#E31937',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  cancelText: {
    color: 'rgba(255,255,255,0.72)',
  },
  cancelTextLight: {
    color: 'rgba(0,0,0,0.60)',
  },
  actionText: {
    color: '#0A0A0A',
  },
  actionTextLight: {
    color: '#FFFFFF',
  },
  destructiveText: {
    color: '#FFFFFF',
  },
});
