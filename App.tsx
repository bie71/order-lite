import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, Image, StyleSheet, ActivityIndicator, Animated, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/database/db';

// Mencegah native splash screen menghilang otomatis
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [showSplashOverlay, setShowSplashOverlay] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
      } catch (e) {
        console.warn(e);
      } finally {
        setDbReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (dbReady) {
      // Hide native splash screen
      SplashScreen.hideAsync();

      // Tampilkan custom splash screen selama 300ms kemudian fade out
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setShowSplashOverlay(false);
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [dbReady]);

  if (!dbReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <AppNavigator />

      {/* CUSTOM SPLASH SCREEN OVERLAY */}
      {showSplashOverlay && (
        <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
          <View style={styles.splashContent}>
            {/* App Icon */}
            <Image
              source={require('./assets/icon.png')}
              style={styles.appIcon}
              resizeMode="contain"
            />
            <Text style={styles.appName}>OrderLite</Text>
            
            {/* Loading Indicator (300 ms) */}
            <ActivityIndicator size="small" color="#023c69" style={styles.loader} />
          </View>

          {/* Footer Text */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              by Sahla Store
            </Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 99999,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appIcon: {
    width: 100,
    height: 100,
    borderRadius: 22,
    marginBottom: 16,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#023c69',
    letterSpacing: 0.5,
    marginBottom: 16,
    fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'sans-serif-medium' }),
  },
  loader: {
    marginTop: 8,
  },
  footerContainer: {
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#023c69',
    letterSpacing: 0.8,
    fontFamily: Platform.select({ ios: 'Poppins-Bold', android: 'sans-serif-medium' }),
  },
});
