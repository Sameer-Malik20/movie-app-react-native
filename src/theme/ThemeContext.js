import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors, Colors } from './colors';

const THEME_STORAGE_KEY = '@cinepremium_theme';

export const ThemeContext = createContext({
  theme: 'dark', // 'dark' | 'light'
  isDark: true,
  colors: DarkColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((savedTheme) => {
        if (isMounted && (savedTheme === 'light' || savedTheme === 'dark')) {
          setThemeState(savedTheme);
          Object.assign(Colors, savedTheme === 'light' ? LightColors : DarkColors);
        }
      })
      .catch((e) => {
        console.log('Error reading theme from storage:', e.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setTheme = async (newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark') return;
    setThemeState(newTheme);
    Object.assign(Colors, newTheme === 'light' ? LightColors : DarkColors);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.log('Error saving theme to storage:', e.message);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const isDark = theme === 'dark';
  const currentColors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors: currentColors,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
