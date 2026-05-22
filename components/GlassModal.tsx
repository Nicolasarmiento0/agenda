import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { appStyles } from '../styles/appStyles';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  animationType?: 'fade' | 'slide' | 'none';
};

export default function GlassModal({ visible, onClose, children, animationType = 'fade' }: Props) {
  const { isDarkMode } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={appStyles.glassModalOverlay}>
        <BlurView
          intensity={20}
          tint={isDarkMode ? 'dark' : 'light'}
          style={appStyles.glassModalCard}
        >
          <View style={[appStyles.glassModalContent, !isDarkMode && appStyles.glassModalContentLight]}>
            {children}
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}
