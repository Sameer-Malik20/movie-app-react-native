import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cleanMovieTitle } from '../services/api';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

export const HeroBanner = ({ movie, onPlayPress, onInfoPress }) => {
  if (!movie) return null;
  const displayTitle = cleanMovieTitle(movie.title) || 'Featured Blockbuster';

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: movie.poster || 'https://m.media-amazon.com/images/M/MV5BMjEzODY2MjU1Nl5BMl5BanBnXkFtZTcwMzc1ODUzNg@@._V1_FMjpg_UX613_.jpg' }}
        style={styles.backdropImage}
        resizeMode="cover"
      />

      <View style={styles.gradientOverlay} />

      <View style={styles.contentOverlay}>
        <View style={styles.badgeRow}>
          <View style={styles.pillBadge}>
            <Text style={styles.pillText}>DOLBY VISION</Text>
          </View>
          <View style={[styles.pillBadge, styles.pillBadgeAccent]}>
            <Text style={[styles.pillText, { color: Colors.gold }]}>IMDb {movie.imdb || '8.4'}</Text>
          </View>
          <View style={styles.pillBadge}>
            <Text style={styles.pillText}>{movie.quality || '4K UHD'}</Text>
          </View>
        </View>

        <Text style={styles.movieTitle} numberOfLines={2}>
          {displayTitle}
        </Text>

        <Text style={styles.genreText} numberOfLines={1}>
          {movie.genre || 'Action • Crime • Thriller • Hindi Dubbed'}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => onPlayPress(movie)}
            activeOpacity={0.8}
          >
            <View style={[styles.playGradient, { backgroundColor: Colors.primaryContainer }]}>
              <Ionicons name="play" size={18} color="#ffffff" />
              <Text style={styles.playText}>Play Now</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.infoButton}
            onPress={() => onInfoPress(movie)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color={Colors.onSurface} />
            <Text style={styles.infoText}>Watchlist</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: 460,
    position: 'relative',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  pillBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  pillBadgeAccent: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  movieTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 34,
    marginBottom: 6,
  },
  genreText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  playGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  playText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  infoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 6,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.onSurface,
  },
});
