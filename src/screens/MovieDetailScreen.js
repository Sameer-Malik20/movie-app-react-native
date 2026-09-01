import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scrapeMovieDetails, fetchSimilarAndSequels, cleanMovieTitle } from '../services/api';
import { userStore } from '../services/userStore';
import { MovieShelf } from '../components/MovieShelf';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

export const MovieDetailScreen = ({ movie, onBack, onPlayMovie, onMovieSelect }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [savedResumePos, setSavedResumePos] = useState(0);
  const [similarMovies, setSimilarMovies] = useState([]);

  const currentMovie = {
    ...movie,
    ...(details || {}),
    link: movie?.link || movie?.url || details?.link || '',
    title: cleanMovieTitle(details?.title || movie?.title) || 'Movie Stream',
    poster: details?.poster || movie?.poster || '',
  };

  useEffect(() => {
    let isMounted = true;

    // Load user store states
    setIsLiked(userStore.isLiked(movie));
    setIsWatchLater(userStore.isInWatchLater(movie));
    setSavedResumePos(userStore.getPlaybackPosition(movie));

    const unsubscribe = userStore.subscribe(() => {
      if (isMounted) {
        setIsLiked(userStore.isLiked(movie));
        setIsWatchLater(userStore.isInWatchLater(movie));
        setSavedResumePos(userStore.getPlaybackPosition(movie));
      }
    });

    const loadDetails = async () => {
      const targetLink = movie?.link || movie?.url;
      if (!targetLink) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const scrapedData = await scrapeMovieDetails(targetLink);
        if (isMounted) {
          setDetails(scrapedData);
        }
        
        // Fetch franchise next parts, sequels and matching genre movies
        const similar = await fetchSimilarAndSequels(movie, scrapedData);
        if (isMounted) {
          setSimilarMovies(similar);
        }
      } catch (e) {
        console.log('Detail load error:', e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDetails();
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [movie?.link || movie?.url]);

  const handleToggleLike = () => {
    const next = userStore.toggleLike(currentMovie);
    setIsLiked(next);
  };

  const handleToggleWatchLater = () => {
    const next = userStore.toggleWatchLater(currentMovie);
    setIsWatchLater(next);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Watch "${currentMovie.title}" on CinePremium Ad-Free Stream!`,
      });
    } catch (e) {}
  };

  const formatTime = (millis) => {
    if (!millis || isNaN(millis) || millis < 0) return '00:00';
    const totalSeconds = Math.floor(millis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const posterUrl = details?.poster || movie.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400';
  const meta = details?.details || {};

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Backdrop Header */}
        <View style={styles.backdropWrap}>
          <Image source={{ uri: posterUrl }} style={styles.backdropImage} resizeMode="cover" />
          <View
            style={[styles.backdropGradient, { backgroundColor: 'rgba(5, 20, 36, 0.7)' }]}
          />

          {/* Navigation Bar */}
          <View style={styles.topNav}>
            <TouchableOpacity style={styles.roundBtn} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.topActions}>
              <TouchableOpacity
                style={styles.roundBtn}
                onPress={handleToggleLike}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isLiked ? '#ef4444' : '#ffffff'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.roundBtn}
                onPress={handleToggleWatchLater}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isWatchLater ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isWatchLater ? Colors.primary : '#ffffff'}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.roundBtn} onPress={handleShare} activeOpacity={0.7}>
                <Ionicons name="share-social-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.infoSection}>
          <Text style={styles.titleText}>{currentMovie.title}</Text>

          {/* Meta Badges */}
          <View style={styles.metaRow}>
            {meta.IMDb && (
              <View style={[styles.badge, styles.badgeGold]}>
                <Ionicons name="star" size={12} color={Colors.gold} />
                <Text style={[styles.badgeText, { color: Colors.gold }]}>IMDb {meta.IMDb}</Text>
              </View>
            )}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{meta.Year || movie.year || '2026'}</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{meta.Duration || '135 min'}</Text>
            </View>
            <View style={[styles.badge, styles.badgeAccent]}>
              <Text style={[styles.badgeText, { color: '#38bdf8' }]}>4K ULTRA HD</Text>
            </View>
          </View>

          {/* Resume Progress Hint if watched previously */}
          {savedResumePos > 5000 && (
            <View style={styles.resumeBanner}>
              <Ionicons name="time" size={16} color={Colors.primary} />
              <Text style={styles.resumeBannerText}>
                Resume Watching from <Text style={{ color: '#ffffff', fontWeight: '800' }}>{formatTime(savedResumePos)}</Text>
              </Text>
            </View>
          )}

          {/* Action Buttons: Watch Now, Like & Watch Later */}
          <View style={styles.actionButtonRow}>
            <TouchableOpacity
              style={styles.mainPlayBtn}
              onPress={() => onPlayMovie(currentMovie)}
              activeOpacity={0.8}
            >
              <View style={[styles.playGradient, { backgroundColor: Colors.primaryContainer }]}>
                <Ionicons name="play" size={20} color="#ffffff" />
                <Text style={styles.mainPlayText}>
                  {savedResumePos > 5000 ? 'Resume Playback' : 'Watch Movie'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionSquareBtn, isLiked && styles.actionSquareBtnActive]}
              onPress={handleToggleLike}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={22}
                color={isLiked ? '#ef4444' : Colors.onSurface}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionSquareBtn, isWatchLater && styles.actionSquareBtnActive]}
              onPress={handleToggleWatchLater}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isWatchLater ? 'bookmark' : 'bookmark-outline'}
                size={22}
                color={isWatchLater ? Colors.primary : Colors.onSurface}
              />
            </TouchableOpacity>
          </View>

          {/* Synopsis */}
          <View style={styles.synopsisCard}>
            <Text style={styles.sectionHeading}>Synopsis</Text>
            <Text
              style={styles.synopsisText}
              numberOfLines={showFullSynopsis ? undefined : 3}
            >
              {currentMovie.description ||
                'Experience high octane cinema in crystal clear high definition, free of intrusive advertisements and popups. Streaming with Dolby audio and multiple quality profiles.'}
            </Text>
            <TouchableOpacity onPress={() => setShowFullSynopsis(!showFullSynopsis)}>
              <Text style={styles.readMoreText}>
                {showFullSynopsis ? 'Show Less' : 'Read More'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Movie Details & Metadata */}
          <View style={styles.castSection}>
            <Text style={styles.sectionHeading}>Movie Information</Text>
            <View style={styles.detailGrid}>
              {meta.Genre && (
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Genre</Text>
                  <Text style={styles.gridValue}>{meta.Genre}</Text>
                </View>
              )}
              {meta.Director && (
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Director</Text>
                  <Text style={styles.gridValue}>{meta.Director}</Text>
                </View>
              )}
              {meta.Cast && (
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Cast</Text>
                  <Text style={styles.gridValue}>{meta.Cast}</Text>
                </View>
              )}
              <View style={styles.gridItem}>
                <Text style={styles.gridLabel}>Audio & Video</Text>
                <Text style={styles.gridValue}>Stereo / Dolby 5.1 • 1080p FHD HLS</Text>
              </View>
            </View>
          </View>

          {/* Similar Movies */}
          <MovieShelf
            title="More Like This"
            movies={similarMovies}
            onMoviePress={onMovieSelect}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  backdropWrap: {
    width: width,
    height: 380,
    position: 'relative',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  backdropGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topNav: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topActions: {
    flexDirection: 'row',
    gap: 10,
  },
  roundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginTop: -30,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  badgeAccent: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  badgeText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(208, 188, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(208, 188, 255, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 16,
  },
  resumeBannerText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  mainPlayBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  playGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  mainPlayText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  actionSquareBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionSquareBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(208, 188, 255, 0.12)',
  },
  synopsisCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  synopsisText: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  readMoreText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  castSection: {
    marginBottom: 24,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: (width - 40 - 10) / 2,
    backgroundColor: Colors.surfaceContainer,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridLabel: {
    color: Colors.textDim,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  gridValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
