import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { appColors } from '../styles/appStyles';

const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.75;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function Sidebar({ visible, onClose }: Props) {
  const { profile } = useAuth();
  const { isDarkMode, toggleTheme, colors } = useTheme(); // agrega esto
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -SIDEBAR_WIDTH,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handleLogout = async () => {
    onClose();
    await supabase.auth.signOut();
    router.replace('/screens/loginscreen');
  };

  const handleNavigate = (route: string) => {
    onClose();
    router.push(route as any);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>

        {/* Avatar y nombre */}
        <View style={styles.profileSection}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {profile?.nickname?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <Text style={styles.nickname}>{profile?.nickname ?? 'Usuario'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {profile?.role === 'admin' ? 'ADMINISTRADOR' : 'CLIENTE'}
            </Text>
          </View>
        </View>

        {/* Divisor */}
        <View style={styles.divider} />

        {/* Navegación */}
        <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('/screens/dashboard')}>
          <Text style={styles.menuIcon}>⊞</Text>
          <Text style={styles.menuText}>HOME</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('/screens/profile')}>
          <Text style={styles.menuIcon}>○</Text>
          <Text style={styles.menuText}>PERFIL</Text>
        </TouchableOpacity>

        {/* Divisor */}
        <View style={styles.divider} />

        {/* Toggle tema */}
        <View style={styles.menuItem}>
  <Text style={[styles.menuIcon, { color: colors.textSecondary }]}>
    {isDarkMode ? '☾' : '○'}
  </Text>
  <Text style={[styles.menuText, { color: colors.textPrimary }]}>
    {isDarkMode ? 'MODO NOCHE' : 'MODO DÍA'}
  </Text>
  <Switch
    value={isDarkMode}
    onValueChange={toggleTheme}
    trackColor={{ false: '#444', true: appColors.primary }}
    thumbColor={appColors.white}
    style={{ marginLeft: 'auto' }}
  />
</View>

        {/* Cerrar sesión */}
        <TouchableOpacity style={[styles.menuItem, { marginTop: 'auto' }]} onPress={handleLogout}>
          <Text style={[styles.menuIcon, { color: appColors.primary }]}>→</Text>
          <Text style={[styles.menuText, { color: appColors.primary }]}>CERRAR SESIÓN</Text>
        </TouchableOpacity>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: appColors.surface,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderRightWidth: 1,
    borderRightColor: appColors.border,
  },
  profileSection: {
    alignItems: 'center',
    paddingBottom: 24,
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: appColors.primary,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: appColors.primary,
    backgroundColor: appColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: appColors.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  nickname: {
    color: appColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  roleBadge: {
    borderWidth: 1,
    borderColor: appColors.border,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: {
    color: appColors.textSecondary,
    fontSize: 10,
    letterSpacing: 2,
  },
  divider: {
    height: 1,
    backgroundColor: appColors.border,
    marginVertical: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  menuIcon: {
    color: appColors.textSecondary,
    fontSize: 18,
    width: 22,
    textAlign: 'center',
  },
  menuText: {
    color: appColors.textPrimary,
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '500',
  },
});