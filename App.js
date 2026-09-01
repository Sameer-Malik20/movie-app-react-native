import React, { useState, useEffect, useRef } from 'react';
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
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from './src/theme/colors';
import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { VideoPlayer } from './src/components/VideoPlayer';

import { HomeScreen } from './src/screens/HomeScreen';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { MovieDetailScreen } from './src/screens/MovieDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

import { scrapeMovieDetails } from './src/services/api';

export default function App() {
  const [isSplashLoading, setIsSplashLoading] = useState(true);
  const splashFadeAnim = useRef(new Animated.Value(1)).current;
  const splashScaleAnim = useRef(new Animated.Value(0.9)).current;

  const [activeTab, setActiveTab] = useState('home');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [playingMovie, setPlayingMovie] = useState(null);
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

  // Handle Android Hardware Back Button
  useEffect(() => {
    const onBackPress = () => {
      // 1. If Video Player is open, close it
      if (playingMovie) {
        setPlayingMovie(null);
        return true;
      }
      // 2. If Movie Detail screen is open, go back to previous list
      if (selectedMovie) {
        setSelectedMovie(null);
        return true;
      }
      // 3. If on Discover or Profile tab, go to Home
      if (activeTab !== 'home') {
        setActiveTab('home');
        return true;
      }
      // 4. If on Home with nothing open, allow default exit
      return false;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [playingMovie, selectedMovie, activeTab]);

  const handleMovieSelect = (movie) => {
    setSelectedMovie(movie);
  };

  const handlePlayMovie = async (movie) => {
    if (!movie) return;
    if (movie.streamUrl) {
      setPlayingMovie(movie);
      return;
    }

    // Set initial playing state so player opens immediately
    setPlayingMovie(movie);

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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

        {/* Top Header (only show when not in detail or video player) */}
        {!selectedMovie && !playingMovie && (
          <Header
            onSearchPress={() => setActiveTab('discover')}
            onProfilePress={() => setActiveTab('profile')}
          />
        )}

        {/* Main Content Screens */}
        <View style={styles.contentContainer}>
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

              {activeTab === 'profile' && (
                <ProfileScreen
                  onPlayMovie={handlePlayMovie}
                  onMovieSelect={handleMovieSelect}
                />
              )}
            </>
          )}
        </View>

        {/* Video Player Modal / Overlay */}
        {playingMovie && (
          <VideoPlayer
            movie={playingMovie}
            streamUrl={playingMovie.streamUrl}
            title={playingMovie.title}
            referer={playingMovie.referer}
            onClose={() => setPlayingMovie(null)}
          />
        )}

        {/* Floating Glassmorphic Bottom Navigation */}
        {!selectedMovie && !playingMovie && (
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
      </SafeAreaView>
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
