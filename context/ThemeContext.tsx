import React, { createContext, useContext, useState } from 'react';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: typeof darkColors;
};

const darkColors = {
  white: '#FFFFFF',
  black: '#000000',
  background: '#1A1A1A',
  surface: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.10)',
  primary: '#B4F736',
  primaryText: '#111827',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  error: '#FF4B4B',
};

const lightColors = {
  white: '#FFFFFF',
  black: '#000000',
  background: '#F4F5F7',
  surface: 'rgba(255,255,255,0.80)',
  border: 'rgba(0,0,0,0.08)',
  primary: '#B4F736',
  primaryText: '#111827',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  error: '#FF4B4B',
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: true,
  toggleTheme: () => {},
  colors: darkColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
