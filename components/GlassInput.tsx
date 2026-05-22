import React from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { glassColors } from '../styles/appStyles';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  secureTextEntry?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  autoFocus?: boolean;
};

export default function GlassInput({
  value,
  onChangeText,
  placeholder,
  label,
  multiline,
  numberOfLines,
  style,
  inputStyle,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoFocus,
}: Props) {
  const { colors, isDarkMode } = useTheme();

  return (
    <View style={style}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDarkMode ? glassColors.placeholderDark : glassColors.placeholderLight}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoFocus={autoFocus}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={[
          styles.input,
          {
            borderColor: isDarkMode ? glassColors.borderDarkStrong : glassColors.borderLightStrong,
            backgroundColor: isDarkMode ? glassColors.surfaceDark : glassColors.surfaceLight,
            color: colors.textPrimary,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          inputStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    letterSpacing: 0.3,
    fontFamily: 'Inter_400Regular',
  },
});
