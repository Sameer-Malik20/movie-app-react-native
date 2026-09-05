import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MovieCard } from '../components/MovieCard';
import { fetchExploreMovies, searchMoviesApi } from '../services/api';
import { Colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40 - 14) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.48;

// In-memory cache to preserve search query and search results when navigating back from Movie Details
let globalDiscoverCache = {
  query: '',
  category: 'latest',
  movies: [],
};

export const DiscoverScreen = ({ onMovieSelect, initialCategory = 'latest' }) => {
  const { isDark, colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState(globalDiscoverCache.query);
  const [selectedCategory, setSelectedCategory] = useState(
    globalDiscoverCache.query ? globalDiscoverCache.category : (initialCategory || 'latest')
  );
  const [movies, setMovies] = useState(globalDiscoverCache.movies);
  const [loading, setLoading] = useState(false);

  const categories = [
    { key: 'latest', label: 'All' },
    { key: 'bollywood', label: 'Bollywood' },
    { key: 'dual-audio', label: 'Dual Audio' },
    { key: 'hollywood', label: 'Hollywood' },
    { key: 'top-rated', label: 'Top Rated' }
  ];

  const loadCategory = async (cat) => {
    setSelectedCategory(cat);
    setSearchQuery('');
    globalDiscoverCache.query = '';
    globalDiscoverCache.category = cat;
    setLoading(true);
    try {
      const data = await fetchExploreMovies(cat);
      setMovies(data);
      globalDiscoverCache.movies = data;
    } catch (e) {
      console.log('Explore error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (text) => {
    setSearchQuery(text);
    globalDiscoverCache.query = text;
    if (!text.trim()) {
      loadCategory(selectedCategory);
      return;
    }

    setLoading(true);
    try {
      const results = await searchMoviesApi(text.trim());
      setMovies(results);
      globalDiscoverCache.movies = results;
    } catch (e) {
      console.log('Search error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCategory && initialCategory !== 'latest' && initialCategory !== globalDiscoverCache.category) {
      loadCategory(initialCategory);
    } else if (globalDiscoverCache.movies.length === 0) {
      loadCategory(selectedCategory);
    }
  }, [initialCategory]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar Input */}
      <View style={styles.searchHeader}>
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textDim} />
          <TextInput
            style={[styles.searchInput, { color: colors.onSurface }]}
            placeholder="Search movie or paste link..."
            placeholderTextColor={colors.textDim}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter Chips */}
      {!searchQuery && (
        <View style={styles.chipsRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.chipsContent}
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item.key;
              return (
                <TouchableOpacity
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.primaryContainer : colors.surfaceContainerLow,
                      borderColor: isSelected ? colors.primary : colors.outlineVariant,
                    },
                  ]}
                  onPress={() => loadCategory(item.key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? '#ffffff' : colors.textDim },
                      isSelected && styles.chipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Movie Results Grid */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.centerText}>Searching cinema collection...</Text>
        </View>
      ) : movies.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="film-outline" size={48} color={Colors.textDim} />
          <Text style={styles.centerText}>No movies found</Text>
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item, index) => item.link || index.toString()}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridColumnWrapper}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <MovieCard
              movie={item}
              onPress={onMovieSelect}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
            />
          )}
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
  searchHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 2,
  },
  chipsRow: {
    marginVertical: 8,
  },
  chipsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipActive: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  gridContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 110,
  },
  gridColumnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  centerText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
});
