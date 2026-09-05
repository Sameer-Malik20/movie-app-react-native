import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  BackHandler,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from './src/theme/colors';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { VideoPlayer } from './src/components/VideoPlayer';
import { MiniPlayer } from './src/components/MiniPlayer';

import { HomeScreen } from './src/screens/HomeScreen';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { YouTubeScreen } from './src/screens/YouTubeScreen';
import { MovieDetailScreen } from './src/screens/MovieDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

import { scrapeMovieDetails } from './src/services/api';

function MainApp() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const [isSplashLoading, setIsSplashLoading] = useState(true);
  const splashFadeAnim = useRef(new Animated.Value(1)).current;
  const splashScaleAnim = useRef(new Animated.Value(0.9)).current;

  const [activeTab, setActiveTab] = useState('home');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [playingMovie, setPlayingMovie] = useState(null);
  const [playerMode, setPlayerMode] = useState(null); // 'fullscreen' | 'mini' | null
  const [playbackStatus, setPlaybackStatus] = useState({
    isPlaying: true,
    positionMillis: 0,
    durationMillis: 0,
  });
  const [discoverCategory, setDiscoverCategory] = useState('latest');

  // Splash Screen Display Timer & Animation
  useEffect(() => {
    Animated.spring(splashScaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(splashFadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setIsSplashLoading(false);
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  // Keep screen awake while a movie is actively playing in the app
  useEffect(() => {
    if (playingMovie && playbackStatus.isPlaying) {
      activateKeepAwakeAsync('CinePremiumApp').catch(() => {});
    } else {
      deactivateKeepAwake('CinePremiumApp');
    }
    return () => {
      deactivateKeepAwake('CinePremiumApp');
    };
  }, [playingMovie, playbackStatus.isPlaying]);

  // Handle Android Hardware Back Button
  useEffect(() => {
    const onBackPress = () => {
      // 1. If Video Player is in fullscreen, minimize to floating pop-up
      if (playingMovie && playerMode === 'fullscreen') {
        setPlayerMode('mini');
        return true;
      }
      // 2. If Mini Player is active, dismiss playback
      if (playingMovie && playerMode === 'mini') {
        setPlayerMode(null);
        setPlayingMovie(null);
        return true;
      }
      // 3. If Movie Detail screen is open, go back to previous list
      if (selectedMovie) {
        setSelectedMovie(null);
        return true;
      }
      // 4. If on another tab, return to Home
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      // 5. Default exit app
      return false;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [playingMovie, playerMode, selectedMovie, activeTab]);

  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
  };

  const handlePlayMovie = async (movie) => {
    if (!movie) return;
    setPlayingMovie(movie);
    setPlayerMode('fullscreen');
    setPlaybackStatus({ isPlaying: true, positionMillis: 0, durationMillis: 0 });

    if (movie.streamUrl || movie.isYouTube) {
      return;
    }

    if (movie.link) {
      try {
        const details = await scrapeMovieDetails(movie.link);
        if (details && details.streamUrl) {
          setPlayingMovie((prev) => (prev ? { ...prev, ...details } : details));
        }
      } catch (e) {
        console.log('Error resolving stream URL in App:', e.message);
      }
    }
  };

  const handleSeeAllCategory = (category) => {
    setDiscoverCategory(category);
    setActiveTab('discover');
  };

  const handleClosePlayer = () => {
    setPlayerMode(null);
    setPlayingMovie(null);
    setPlaybackStatus({ isPlaying: false, positionMillis: 0, durationMillis: 0 });
  };

  const handleMinimizePlayer = () => {
    setPlayerMode('mini');
  };

  const handleExpandPlayer = () => {
    setPlayerMode('fullscreen');
  };

  const handlePlaybackUpdate = useCallback((st) => {
    if (!st) return;
    setPlaybackStatus((prev) => {
      const isPlaySame = prev.isPlaying === st.isPlaying;
      const isPosClose = Math.abs((prev.positionMillis || 0) - (st.positionMillis || 0)) < 1000;
      const isDurSame = prev.durationMillis === st.durationMillis;
      if (isPlaySame && isPosClose && isDurSame) {
        return prev;
      }
      return {
        isPlaying: typeof st.isPlaying === 'boolean' ? st.isPlaying : prev.isPlaying,
        positionMillis: typeof st.positionMillis === 'number' ? st.positionMillis : prev.positionMillis,
        durationMillis: typeof st.durationMillis === 'number' ? st.durationMillis : prev.durationMillis,
      };
    });
  }, []);

  return (
    <View
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

        {/* Top Header (only show when not in detail or fullscreen player) */}
        {!selectedMovie && playerMode !== 'fullscreen' && (
          <Header
            onSearchPress={() => setActiveTab('discover')}
            onProfilePress={() => setActiveTab('profile')}
          />
        )}

        {/* Main Content Screens */}
        <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
          {selectedMovie ? (
            <MovieDetailScreen
              movie={selectedMovie}
              onBack={() => setSelectedMovie(null)}
              onPlayMovie={handlePlayMovie}
              onMovieSelect={handleMovieSelect}
            />
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeScreen
                  onMovieSelect={handleMovieSelect}
                  onPlayMovie={handlePlayMovie}
                  onSeeAllCategory={handleSeeAllCategory}
                />
              )}

              {activeTab === 'discover' && (
                <DiscoverScreen
                  onMovieSelect={handleMovieSelect}
                  initialCategory={discoverCategory}
                />
              )}

              {activeTab === 'youtube' && (
                <YouTubeScreen
                  onPlayMovie={handlePlayMovie}
                  onMovieSelect={handleMovieSelect}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileScreen
                  onPlayMovie={handlePlayMovie}
                  onMovieSelect={handleMovieSelect}
                />
              )}
            </>
          )}
        </View>

        {/* Floating Pop-up Mini-Player */}
        {playingMovie && playerMode === 'mini' && (
          <MiniPlayer
            media={playingMovie}
            isPlaying={playbackStatus.isPlaying}
            progress={
              playbackStatus.durationMillis > 0
                ? playbackStatus.positionMillis / playbackStatus.durationMillis
                : 0
            }
            onExpand={handleExpandPlayer}
            onTogglePlay={() => {
              setPlaybackStatus((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
            }}
            onClose={handleClosePlayer}
          />
        )}

        {/* Video Player Modal / Overlay */}
        {playingMovie && playerMode === 'fullscreen' && (
          <VideoPlayer
            movie={playingMovie}
            streamUrl={playingMovie.streamUrl}
            title={playingMovie.title}
            referer={playingMovie.referer}
            onClose={handleClosePlayer}
            onMinimize={handleMinimizePlayer}
            onPlaybackUpdate={handlePlaybackUpdate}
          />
        )}

        {/* Floating Glassmorphic Bottom Navigation */}
        {!selectedMovie && playerMode !== 'fullscreen' && (
          <BottomNav
            activeTab={activeTab}
            onTabPress={setActiveTab}
            onTabChange={setActiveTab}
          />
        )}

        {/* In-App App Logo Splash Screen */}
        {isSplashLoading && (
          <Animated.View
            style={[
              styles.splashContainer,
              {
                opacity: splashFadeAnim,
              },
            ]}
            pointerEvents="none"
          >
            <Animated.View
              style={[
                styles.splashContent,
                {
                  transform: [{ scale: splashScaleAnim }],
                },
              ]}
            >
              {/* Official CinePremium VIP Crown App Brand Logo */}
              <Image
                source={require('./assets/icon.png')}
                style={styles.splashLogoImg}
                resizeMode="cover"
              />

              {/* App Brand Name */}
              <Text style={styles.splashBrand}>
                CINE<Text style={styles.splashBrandHighlight}>PREMIUM</Text>
              </Text>

              {/* VIP Subtitle */}
              <View style={styles.splashVipBadge}>
                <Text style={styles.splashVipText}>⚡ 0 ADS • VIP STREAMING</Text>
              </View>

              <ActivityIndicator
                size="small"
                color={Colors.primary}
                style={{ marginTop: 28 }}
              />
            </Animated.View>
          </Animated.View>
        )}
      </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#051424',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  splashContent: {
    alignItems: 'center',
  },
  splashLogoImg: {
    width: 90,
    height: 90,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(160, 120, 255, 0.4)',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 18,
  },
  splashBrand: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  splashBrandHighlight: {
    color: Colors.primary,
  },
  splashVipBadge: {
    backgroundColor: 'rgba(208, 188, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.25)',
  },
  splashVipText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
});
