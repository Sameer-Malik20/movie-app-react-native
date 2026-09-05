import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

export const Top10Row = ({ movies, onMoviePress }) => {
  const { colors } = useTheme();
  if (!movies || movies.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Top 10 in India Today</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {movies.slice(0, 10).map((movie, index) => {
          const rank = index + 1;
          const posterUrl = movie.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300';

          return (
            <TouchableOpacity
              key={movie.link || index}
              style={styles.itemWrapper}
              onPress={() => onMoviePress(movie)}
              activeOpacity={0.8}
            >
              {/* Big Stylized Rank Number */}
              <Text style={styles.rankNumber}>{rank}</Text>

              {/* Poster card positioned offset over number */}
              <View style={styles.cardBox}>
                <Image
                  source={{ uri: posterUrl }}
                  style={styles.posterImage}
                  resizeMode="cover"
                />
                {movie.quality && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{movie.quality}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 18,
  },
  headerRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: 14,
    alignItems: 'flex-end',
  },
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: 20,
    position: 'relative',
    height: 185,
  },
  rankNumber: {
    fontSize: 90,
    fontWeight: '900',
    color: 'transparent',
    textShadowColor: 'rgba(208, 188, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    marginRight: -22,
    zIndex: 1,
    lineHeight: 90,
  },
  cardBox: {
    width: 110,
    height: 165,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceContainerHighest,
    zIndex: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(5, 20, 36, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.primary,
  },
});
