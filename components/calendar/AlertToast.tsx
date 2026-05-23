import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { ToastType } from '../../hooks/useToast';

type Props = {
  type: ToastType;
  message: string;
  duration?: number;
  visible: boolean;
  onHide: () => void;
};

const ICON_MAP: Record<ToastType, string> = {
  success: 'check-circle',
  error: 'x-circle',
  info: 'info',
  warning: 'alert-triangle',
};

export default function AlertToast({ type, message, visible, onHide }: Props) {
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const accentColor = {
    success: colors.statusConfirmed,
    error: colors.statusCancelled,
    info: colors.accent,
    warning: colors.statusPending,
  }[type];

  const [mounted, setMounted] = useState(false);

  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  const unmount = () => setMounted(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else if (mounted) {
      translateY.value = withTiming(-120, { duration: 280 }, (finished) => {
        if (finished) runOnJS(unmount)();
      });
      opacity.value = withTiming(0, { duration: 220 });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!mounted) return null;

  const top = insets.top + 8;

  return (
    <Animated.View style={[styles.wrapper, { top }, animStyle]}>
      <BlurView
        intensity={60}
        tint={isDarkMode ? 'dark' : 'light'}
        style={[
          styles.blur,
          {
            borderColor: accentColor + '44',
          },
        ]}
      >
        <View style={[styles.leftBar, { backgroundColor: accentColor }]} />
        <Feather
          name={ICON_MAP[type] as any}
          size={18}
          color={accentColor}
          style={styles.icon}
        />
        <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={2}>
          {message}
        </Text>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  blur: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 14,
    paddingRight: 16,
  },
  leftBar: {
    width: 4,
    alignSelf: 'stretch',
    marginRight: 12,
    borderRadius: 2,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
  },
});
