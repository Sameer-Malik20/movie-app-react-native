import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { HeroBanner } from '../components/HeroBanner';
import { Top10Row } from '../components/Top10Row';
import { MovieShelf } from '../components/MovieShelf';
import { fetchExploreMovies } from '../services/api';
import { Colors } from '../theme/colors';

export const HomeScreen = ({ onMovieSelect, onPlayMovie, onSeeAllCategory }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [latestMovies, setLatestMovies] = useState([]);
  const [bollywoodMovies, setBollywoodMovies] = useState([]);
  const [dualAudioMovies, setDualAudioMovies] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);

  const loadData = async () => {
    try {
      const [latest, bollywood, dualAudio, topRated] = await Promise.all([
        fetchExploreMovies('latest'),
        fetchExploreMovies('bollywood'),
        fetchExploreMovies('dual-audio'),
        fetchExploreMovies('top-rated')
      ]);

      setLatestMovies(latest);
      setBollywoodMovies(bollywood);
      setDualAudioMovies(dualAudio);
      setTopRatedMovies(topRated);
    } catch (e) {
      console.log('Error loading home data:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading CinePremium Cinema...</Text>
      </View>
    );
  }

  const heroMovie = latestMovies[0] || null;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
      contentContainerStyle={styles.scrollContent}
    >
      {/* Hero Movie Feature */}
      {heroMovie && (
        <HeroBanner
          movie={heroMovie}
          onPlayPress={onPlayMovie}
          onInfoPress={onMovieSelect}
        />
      )}

      {/* Top 10 in India */}
      <Top10Row
        movies={latestMovies}
        onMoviePress={onMovieSelect}
      />

      {/* Trending Now */}
      <MovieShelf
        title="Trending Now"
        movies={topRatedMovies}
        onMoviePress={onMovieSelect}
        onSeeAll={() => onSeeAllCategory('top-rated')}
      />

      {/* Bollywood Specials */}
      <MovieShelf
        title="Bollywood Specials"
        movies={bollywoodMovies}
        onMoviePress={onMovieSelect}
        onSeeAll={() => onSeeAllCategory('bollywood')}
      />

      {/* Dual Audio & Dubbed Blockbusters */}
      <MovieShelf
        title="Dual Audio & Hollywood"
        movies={dualAudioMovies}
        onMoviePress={onMovieSelect}
        onSeeAll={() => onSeeAllCategory('dual-audio')}
      />

      {/* Action & Latest Releases */}
      <MovieShelf
        title="Latest Releases"
        movies={latestMovies.slice(1)}
        onMoviePress={onMovieSelect}
        onSeeAll={() => onSeeAllCategory('latest')}
      />

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
});
