import React, { createContext, useContext, useState } from 'react';

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: typeof darkColors;
};

const darkColors = {
  white: '#FFFFFF',
  black: '#000000',
  background: '#0A0A0A',
  surface: '#141414',
  border: '#2A2A2A',
  primary: '#E31937',
  textPrimary: '#FFFFFF',
  textSecondary: '#888888',
  error: '#FF3B30',
};

const lightColors = {
  white: '#FFFFFF',
  black: '#000000',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  border: '#E0E0E0',
  primary: '#E31937',
  textPrimary: '#0A0A0A',
  textSecondary: '#888888',
  error: '#FF3B30',
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