import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cleanMovieTitle } from '../services/api';
import { Colors } from '../theme/colors';

export const MovieCard = ({ movie, onPress, width = 135, height = 195 }) => {
  const posterUrl = movie.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&auto=format&fit=crop&q=80';
  const displayTitle = cleanMovieTitle(movie.title) || 'Movie Stream';

  return (
    <TouchableOpacity
      style={[styles.container, { width }]}
      onPress={() => onPress(movie)}
      activeOpacity={0.75}
    >
      <View style={[styles.posterWrap, { height }]}>
        <Image
          source={{ uri: posterUrl }}
          style={styles.posterImage}
          resizeMode="cover"
        />

        {/* Quality Badge */}
        {movie.quality ? (
          <View style={styles.badgeTopLeft}>
            <Text style={styles.badgeText}>{movie.quality}</Text>
          </View>
        ) : null}

        {/* IMDb Rating */}
        {movie.imdb ? (
          <View style={styles.badgeTopRight}>
            <Ionicons name="star" size={10} color={Colors.gold} />
            <Text style={styles.ratingText}>{movie.imdb}</Text>
          </View>
        ) : null}

        {/* Play Icon Hint on subtle gradient */}
        <View style={styles.vignetteBottom}>
          <View style={styles.miniPlayIcon}>
            <Ionicons name="play" size={12} color="#ffffff" />
          </View>
        </View>
      </View>

      <Text style={styles.titleText} numberOfLines={2}>
        {displayTitle}
      </Text>
      <Text style={styles.yearText} numberOfLines={1}>
        {movie.year || 'Movie'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 14,
    marginBottom: 4,
  },
  posterWrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerHighest,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  badgeTopLeft: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(5, 20, 36, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.3,
  },
  badgeTopRight: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(5, 20, 36, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  ratingText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.gold,
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  miniPlayIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 8,
  },
  yearText: {
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 2,
  },
});
