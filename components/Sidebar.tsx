import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { appColors } from '../styles/appStyles';

const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.65;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function Sidebar({ visible, onClose }: Props) {
  const { profile, signOut } = useAuth();
  const { isDarkMode, toggleTheme, colors } = useTheme();

  // 1. Estado para mantener el Modal renderizado durante la animación
  const [showModal, setShowModal] = useState(visible);

  // 2. Animación de posición (izquierda a derecha) y opacidad (fondo oscuro)
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true); // Mostrar el Modal inmediatamente
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300, // 300ms de animación
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        // 3. SOLO ocultamos el Modal cuando la animación finaliza
        setShowModal(false);
      });
    }
  }, [visible]);

  const handleLogout = async () => {
    onClose();
    await signOut();
  };

  const handleNavigate = (route: string) => {
    onClose();
    router.push(route as any);
  };

  return (
    <Modal visible={showModal} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        {/* Ahora el fondo oscuro también se anima suavemente */}
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.drawerContainer, { transform: [{ translateX: slideAnim }] }]}>

        <BlurView
          intensity={40}
          tint={isDarkMode ? 'dark' : 'light'}
          style={[styles.drawer, { borderRightColor: colors.border }]}
        >
          {/* Avatar y nombre */}
          <TouchableOpacity
            style={styles.profileSection}
            activeOpacity={0.7}
            onPress={() => handleNavigate('/screens/global/profile')}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: isDarkMode ? '#333' : '#E1E1E1' }]}>
                <Text style={styles.avatarInitial}>
                  {profile?.nickname?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <Text style={[styles.nickname, { color: colors.textPrimary }]}>{profile?.nickname ?? 'Usuario'}</Text>
            <View style={[styles.roleBadge, { borderColor: colors.border }]}>
              <Text style={[styles.roleText, { color: colors.textSecondary }]}>
                {profile?.role === 'admin'
                  ? 'ADMINISTRADOR'
                  : profile?.role === 'company'
                    ? 'EMPRESA'
                    : 'CLIENTE'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Navegación Dinámica según Rol */}
          <>
            {/* ---- MENU CLIENTE ---- */}
            {profile?.role === 'client' && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('/screens/global/explore')}>
                  <Feather name="search" size={20} color={colors.textSecondary} style={styles.iconWidth} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>EXPLORAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('/screens/global/explore')}>
                  <Feather name="calendar" size={20} color={colors.textSecondary} style={styles.iconWidth} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>RESERVAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('/screens/global/my-appointments')}>
                  <Feather name="calendar" size={20} color={colors.textSecondary} style={styles.iconWidth} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>MIS CITAS</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ---- MENU EMPRESA ---- */}
            {profile?.role === 'company' && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('/screens/roles/company/company-agenda')}>
                  <Feather name="calendar" size={20} color={colors.textSecondary} style={styles.iconWidth} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>AGENDA</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('/screens/roles/company/company-services')}>
                  <Feather name="list" size={20} color={colors.textSecondary} style={styles.iconWidth} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>SERVICIOS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('/screens/roles/company/company-employees')}>
                  <Feather name="users" size={20} color={colors.textSecondary} style={styles.iconWidth} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>EMPLEADOS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('/screens/roles/company/company-history')}>
                  <Feather name="bar-chart-2" size={20} color={colors.textSecondary} style={styles.iconWidth} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>HISTORIAL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('/screens/roles/company/company-business')}>
                  <Feather name="briefcase" size={20} color={colors.textSecondary} style={styles.iconWidth} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>MI NEGOCIO</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ---- MENU ADMIN ---- */}
            {profile?.role === 'admin' && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('/screens/roles/admin/admin-dashboard')}>
                  <Feather name="grid" size={20} color={colors.textSecondary} style={styles.iconWidth} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>HOME</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('/screens/roles/admin/admin-businesses')}>
                  <Feather name="shield" size={20} color={colors.textSecondary} style={styles.iconWidth} />
                  <Text style={[styles.menuText, { color: colors.textPrimary }]}>EMPRESAS</Text>
                </TouchableOpacity>
              </>
            )}

          </>


          <View style={[styles.divider, { backgroundColor: colors.border }]} />


          {/* Cerrar sesión */}
          <TouchableOpacity style={[styles.menuItem, { marginTop: 'auto' }]} onPress={handleLogout}>
            <Feather name="log-out" size={20} color="#FF4B4B" style={styles.iconWidth} />
            <Text style={[styles.menuText, { color: '#FF4B4B' }]}>CERRAR SESIÓN</Text>
          </TouchableOpacity>
        </BlurView>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
  },
  drawer: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderRightWidth: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: appColors.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  nickname: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  roleBadge: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: {
    fontSize: 10,
    letterSpacing: 2,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  iconWidth: {
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '500',
  },
});