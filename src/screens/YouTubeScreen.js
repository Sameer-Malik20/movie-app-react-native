import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import {
  YOUTUBE_CATEGORIES,
  searchYouTube,
  fetchYouTubeCategory,
} from '../services/youtubeService';

const { width } = Dimensions.get('window');

export const YouTubeScreen = ({ onPlayMovie, onMovieSelect }) => {
  const { isDark, colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const searchTimerRef = useRef(null);

  const loadFeed = useCallback(async (catId, isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const results = await fetchYouTubeCategory(catId);
      setVideos(results || []);
    } catch (e) {
      console.log('Error loading YouTube category feed:', e.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleSearch = useCallback(async (query) => {
    if (!query || !query.trim()) {
      setActiveSearch('');
      loadFeed(selectedCategory);
      return;
    }

    setIsLoading(true);
    setActiveSearch(query.trim());
    try {
      const results = await searchYouTube(query.trim());
      setVideos(results || []);
    } catch (e) {
      console.log('Error searching YouTube:', e.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, loadFeed]);

  // Initial feed load
  useEffect(() => {
    loadFeed('all');
  }, [loadFeed]);

  const handleCategoryPress = (catId) => {
    setSelectedCategory(catId);
    setSearchQuery('');
    setActiveSearch('');
    loadFeed(catId);
  };

  const handleSearchTextChange = (text) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (text.trim().length >= 3) {
      searchTimerRef.current = setTimeout(() => {
        handleSearch(text);
      }, 600);
    } else if (text.trim().length === 0 && activeSearch) {
      setActiveSearch('');
      loadFeed(selectedCategory);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    loadFeed(selectedCategory);
  };

  const handleVideoPress = (item) => {
    const movieCompatibleItem = {
      title: item.title,
      link: `https://www.youtube.com/watch?v=${item.videoId}`,
      streamUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
      poster: item.thumbnail,
      videoId: item.videoId,
      channel: item.channel,
      duration: item.duration,
      quality: '1080p HD',
      imdb: 'YouTube',
      year: item.publishedTime || '2025',
      genre: 'YouTube Streaming',
      description: `${item.title} by ${item.channel}. Views: ${item.views}. Streaming in high quality with Pop-up and Background play.`,
      isYouTube: true,
    };

    if (onPlayMovie) {
      onPlayMovie(movieCompatibleItem);
    } else if (onMovieSelect) {
      onMovieSelect(movieCompatibleItem);
    }
  };

  const renderVideoCard = ({ item }) => (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={() => handleVideoPress(item)}
      activeOpacity={0.88}
    >
      {/* 16:9 Thumbnail with Overlay Badges */}
      <View style={styles.thumbnailWrapper}>
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />

        {/* Play Overlay Button */}
        <View style={styles.playButtonOverlay}>
          <View style={styles.playIconCircle}>
            <Ionicons name="play" size={22} color="#ffffff" style={{ marginLeft: 2 }} />
          </View>
        </View>

        {/* Duration Badge */}
        {item.duration ? (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        ) : null}

        {/* YouTube VIP Badge */}
        <View style={styles.ytBadge}>
          <Ionicons name="logo-youtube" size={11} color="#FF0000" style={{ marginRight: 3 }} />
          <Text style={styles.ytBadgeText}>HD</Text>
        </View>
      </View>

      {/* Video Details Info */}
      <View style={styles.infoRow}>
        {/* Channel Icon Placeholder / Initials */}
        <View style={styles.channelAvatar}>
          <Text style={styles.channelAvatarText}>
            {(item.channel && item.channel.charAt(0).toUpperCase()) || 'Y'}
          </Text>
        </View>

        {/* Title, Channel, Views & Date */}
        <View style={styles.textContainer}>
          <Text style={[styles.videoTitle, { color: colors.onSurface }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.channelName} numberOfLines={1}>
              {item.channel}
            </Text>
            {item.views ? (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaViews}>{item.views}</Text>
              </>
            ) : null}
            {item.publishedTime ? (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaDate}>{item.publishedTime}</Text>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Permanent Static Top Header - TextInput NEVER unmounts, keyboard stays open */}
      <View style={styles.headerArea}>
        {/* Brand YouTube VIP Bar */}
        <View style={styles.topBrandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="logo-youtube" size={24} color="#FF0000" style={styles.ytIcon} />
            <Text style={[styles.brandTitle, { color: colors.onSurface }]}>
              YOU<Text style={styles.brandTitleRed}>TUBE</Text>
            </Text>
            <View style={styles.vipTag}>
              <Text style={styles.vipTagText}>VIP • AD-FREE</Text>
            </View>
          </View>
        </View>

        {/* Live Search Bar */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textDim} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.onSurface }]}
            placeholder="Search YouTube movies, songs, trailers..."
            placeholderTextColor={colors.textDim}
            value={searchQuery}
            onChangeText={handleSearchTextChange}
            onSubmitEditing={() => handleSearch(searchQuery)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearBtn} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills Slider */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={YOUTUBE_CATEGORIES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoriesList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id && !activeSearch;
            return (
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected ? '#FF0000' : colors.surfaceContainerLow,
                    borderColor: isSelected ? '#FF0000' : colors.outlineVariant,
                  },
                  isSelected && styles.categoryPillActive,
                ]}
                onPress={() => handleCategoryPress(item.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryText,
                    { color: isSelected ? '#ffffff' : colors.textDim },
                    isSelected && styles.categoryTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        {/* Section Heading */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: colors.onSurface }]}>
            {activeSearch
              ? `Search Results for "${activeSearch}"`
              : YOUTUBE_CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'Trending Videos'}
          </Text>
          <Text style={styles.videoCountText}>{videos.length} videos</Text>
        </View>
      </View>

      {/* Video List or Loading state */}
      {isLoading && !isRefreshing ? (
        <View style={styles.spinnerContainer}>
          <ActivityIndicator size="large" color="#FF0000" />
          <Text style={styles.loadingText}>Loading YouTube Streams...</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={renderVideoCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadFeed(selectedCategory, true)}
              tintColor="#FF0000"
              colors={['#FF0000', Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="videocam-off-outline" size={54} color="rgba(255, 255, 255, 0.3)" />
              <Text style={styles.emptyTitle}>No Videos Found</Text>
              <Text style={styles.emptySubtitle}>Try searching for another movie or music topic</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingBottom: 90,
  },
  headerArea: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ytIcon: {
    marginRight: 6,
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  brandTitleRed: {
    color: '#FF0000',
  },
  vipTag: {
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.3)',
    marginLeft: 10,
  },
  vipTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF3B30',
    letterSpacing: 0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 4,
  },
  categoriesList: {
    paddingBottom: 12,
    gap: 8,
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  categoryTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  videoCountText: {
    fontSize: 12,
    color: Colors.textDim,
    fontWeight: '600',
  },
  cardContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  thumbnailWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  ytBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  ytBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'flex-start',
  },
  channelAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  channelAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  textContainer: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 20,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  channelName: {
    fontSize: 12,
    color: Colors.textDim,
    fontWeight: '600',
    maxWidth: width * 0.4,
  },
  metaDot: {
    fontSize: 11,
    color: Colors.textDim,
    marginHorizontal: 5,
  },
  metaViews: {
    fontSize: 12,
    color: Colors.textDim,
    fontWeight: '500',
  },
  metaDate: {
    fontSize: 12,
    color: Colors.textDim,
    fontWeight: '500',
  },
  centerLoading: {
    flex: 1,
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  loadingText: {
    color: Colors.textDim,
    fontSize: 13,
    marginTop: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textDim,
    marginTop: 4,
  },
});
