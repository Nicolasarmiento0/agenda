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
  // Calendar semantic tokens
  backgroundPrimary: '#1A1A1A',
  backgroundSurface: 'rgba(255,255,255,0.06)',
  accent: '#B4F736',
  accentDim: 'rgba(180,247,54,0.18)',
  statusConfirmed: '#30D158',
  statusPending: '#FF9F0A',
  statusCompleted: '#636366',
  statusCancelled: '#FF453A',
  statusNoShow: '#FF6961',
  workerColors: ['#FF6B6B', '#4DD4C0', '#FFD166', '#C77DFF', '#FF8FAB', '#4F8EF7'] as string[],
};

const lightColors = {
  white: '#ffffffb7',
  black: '#000000',
  background: '#f4f5f7b8',
  surface: 'rgba(255,255,255,0.80)',
  border: 'rgba(0,0,0,0.08)',
  primary: '#B4F736',
  primaryText: '#111827',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  error: '#FF4B4B',
  // Calendar semantic tokens
  backgroundPrimary: '#f4f5f7cd',
  backgroundSurface: 'rgba(255,255,255,0.80)',
  accent: '#B4F736',
  accentDim: 'rgba(180,247,54,0.18)',
  statusConfirmed: '#30D158',
  statusPending: '#FF9F0A',
  statusCompleted: '#636366',
  statusCancelled: '#FF453A',
  statusNoShow: '#FF6961',
  workerColors: ['#FF6B6B', '#4DD4C0', '#FFD166', '#C77DFF', '#FF8FAB', '#4F8EF7'] as string[],
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: true,
  toggleTheme: () => { },
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
