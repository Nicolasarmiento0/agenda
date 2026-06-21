import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, StyleSheet, Text, TextStyle, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { appStyles } from '../styles/appStyles';

type Props = {
  title: string;
  onLeft: () => void;
  leftIcon?: keyof typeof Feather.glyphMap;
  onRight?: () => void;
  rightIcon?: keyof typeof Feather.glyphMap;
  paddingTop?: number;
  titleStyle?: TextStyle;
  hideRight?: boolean;
};

export default function ScreenHeader({
  title,
  onLeft,
  leftIcon = 'menu',
  onRight,
  rightIcon,
  paddingTop,
  titleStyle,
  hideRight = false,
}: Props) {
  const { colors, isDarkMode, toggleTheme } = useTheme();

  const resolvedRightIcon = rightIcon ?? (isDarkMode ? 'moon' : 'sun');
  const handleRight = onRight ?? toggleTheme;

  const handleLeftPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onLeft();
  };

  const handleRightPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    handleRight();
  };

  return (
    <View
      style={[
        appStyles.headerRow,
        paddingTop !== undefined && { paddingTop },
        Platform.OS === 'android' && { paddingTop: paddingTop ?? 36 },
      ]}
    >
      <TouchableOpacity onPress={handleLeftPress} activeOpacity={0.7} style={styles.btn}>
        <Feather name={leftIcon} size={leftIcon === 'arrow-left' ? 22 : 24} color={colors.textPrimary} />
      </TouchableOpacity>

      <Text style={[appStyles.headerLabel, { color: colors.textSecondary }, titleStyle]}>{title}</Text>

      {hideRight ? (
        <View style={styles.btn} />
      ) : (
        <TouchableOpacity onPress={handleRightPress} activeOpacity={0.7} style={[styles.btn, styles.btnRight]}>
          <Feather name={resolvedRightIcon} size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40 },
  btnRight: { alignItems: 'flex-end' },
});
