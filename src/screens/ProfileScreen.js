import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userStore } from '../services/userStore';
import { getSiteDomain, setSiteDomain, providerManager, PROVIDER_PRESETS, cleanMovieTitle } from '../services/api';
import { Colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

// In-memory cache to preserve active tab (History | Likes | Watch Later) across back navigation
let cachedProfileTab = 'history';

export const ProfileScreen = ({ onPlayMovie, onMovieSelect }) => {
  const { isDark, colors, setTheme } = useTheme();
  const [siteUrl, setSiteUrl] = useState(getSiteDomain());
  const [activeTab, setActiveTabState] = useState(cachedProfileTab); // 'history' | 'likes' | 'watchLater'

  const setActiveTab = (tab) => {
    cachedProfileTab = tab;
    setActiveTabState(tab);
  };
  const [selectedProviderId, setSelectedProviderId] = useState(providerManager.getActiveProvider().id);

  const [historyList, setHistoryList] = useState(userStore.getHistory());
  const [likesList, setLikesList] = useState(userStore.getLikes());
  const [watchLaterList, setWatchLaterList] = useState(userStore.getWatchLater());

  useEffect(() => {
    const update = () => {
      setHistoryList(userStore.getHistory());
      setLikesList(userStore.getLikes());
      setWatchLaterList(userStore.getWatchLater());
    };

    const unsubscribe = userStore.subscribe(update);
    return () => unsubscribe();
  }, []);

  const handleSelectProvider = (preset) => {
    setSelectedProviderId(preset.id);
    if (preset.id !== 'custom') {
      if (typeof providerManager.setProvider === 'function') {
        providerManager.setProvider(preset.id);
      } else if (typeof providerManager.setActiveProvider === 'function') {
        providerManager.setActiveProvider(preset.id);
      }
      setSiteUrl(preset.defaultUrl);
      Alert.alert('Provider Activated', `Switched streaming provider to ${preset.name}`);
    }
  };

  const handleSaveCustomDomain = () => {
    if (!siteUrl || !siteUrl.trim().startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid website URL starting with https:// or http://');
      return;
    }
    setSiteDomain(siteUrl.trim());
    if (typeof providerManager.setProvider === 'function') {
      providerManager.setProvider('custom', siteUrl.trim());
    } else if (typeof providerManager.setActiveProvider === 'function') {
      providerManager.setActiveProvider('custom', siteUrl.trim());
    }
    setSelectedProviderId('custom');
    Alert.alert('Custom Site Connected', `Universal Sniffer Engine is now active for ${siteUrl.trim()}`);
  };

  // Instant history deletion without confirmation dialog
  const handleClearHistory = () => {
    if (historyList.length === 0) return;
    userStore.clearHistory();
  };

  const handleDeleteHistoryItem = (movie) => {
    userStore.removeHistoryItem(movie);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 70 : 0}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
        <Image
          source={require('../../assets/icon.png')}
          style={[styles.avatar, { borderColor: colors.primary }]}
          resizeMode="cover"
        />
        <Text style={[styles.userName, { color: colors.onSurface }]}>VIP Cinema Member</Text>
        <Text style={[styles.userEmail, { color: colors.textDim }]}>adfree.vip@cinepremium.stream</Text>

        <View style={[styles.tierPill, { backgroundColor: colors.primaryContainer }]}>
          <Ionicons name="sparkles" size={14} color="#ffffff" />
          <Text style={styles.tierText}>UNIVERSAL STREAM ENGINE READY</Text>
        </View>
      </View>

      {/* Library Tabs (History, Likes, Watch Later) */}
      <View style={styles.tabNavRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="time"
            size={16}
            color={activeTab === 'history' ? Colors.primary : Colors.textDim}
          />
          <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
            History ({historyList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'likes' && styles.tabBtnActive]}
          onPress={() => setActiveTab('likes')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="heart"
            size={16}
            color={activeTab === 'likes' ? '#ef4444' : Colors.textDim}
          />
          <Text style={[styles.tabBtnText, activeTab === 'likes' && styles.tabBtnTextActive]}>
            Liked ({likesList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'watchLater' && styles.tabBtnActive]}
          onPress={() => setActiveTab('watchLater')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="bookmark"
            size={16}
            color={activeTab === 'watchLater' ? Colors.primary : Colors.textDim}
          />
          <Text style={[styles.tabBtnText, activeTab === 'watchLater' && styles.tabBtnTextActive]}>
            Watch Later ({watchLaterList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section Header with Clear Button */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeading}>
          {activeTab === 'history'
            ? 'Playback History & Resume'
            : activeTab === 'likes'
            ? 'Liked Movies & Favorites'
            : 'Saved Watch Later'}
        </Text>

        {activeTab === 'history' && historyList.length > 0 && (
          <TouchableOpacity
            style={styles.clearHeaderBtn}
            onPress={handleClearHistory}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={14} color={Colors.red} />
            <Text style={styles.clearHeaderText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Contents */}
      <View style={styles.listSection}>
        {activeTab === 'history' && (
          <>
            {historyList.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="time-outline" size={38} color={Colors.textDim} />
                <Text style={styles.emptyTitle}>No watch history yet</Text>
                <Text style={styles.emptySub}>
                  Movies you play are automatically saved to device storage and remember your exact resume position.
                </Text>
              </View>
            ) : (
              historyList.map((item, idx) => {
                const m = item.movie;
                const progressPct = item.durationMillis > 0 ? Math.min((item.positionMillis / item.durationMillis) * 100, 100) : 0;
                return (
                  <View key={m.link || idx} style={styles.historyItem}>
                    <TouchableOpacity
                      style={styles.itemClickArea}
                      onPress={() => (onPlayMovie ? onPlayMovie(m) : onMovieSelect && onMovieSelect(m))}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: m.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200' }} style={styles.itemThumb} />
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle} numberOfLines={2}>{cleanMovieTitle(m.title) || 'Movie Stream'}</Text>
                        <Text style={styles.resumeInfoText}>
                          Left off at: <Text style={{ color: '#ffffff', fontWeight: '700' }}>{formatTime(item.positionMillis)}</Text>
                        </Text>
                        <View style={styles.historyProgressTrack}>
                          <View style={[styles.historyProgressFill, { width: `${progressPct}%` }]} />
                        </View>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.itemPlayBtn}
                        onPress={() => (onPlayMovie ? onPlayMovie(m) : onMovieSelect && onMovieSelect(m))}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="play" size={16} color="#ffffff" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.itemDeleteBtn}
                        onPress={() => handleDeleteHistoryItem(m)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {activeTab === 'likes' && (
          <>
            {likesList.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="heart-outline" size={38} color={Colors.textDim} />
                <Text style={styles.emptyTitle}>No liked movies yet</Text>
                <Text style={styles.emptySub}>Tap the heart icon on any movie to add to your favorites.</Text>
              </View>
            ) : (
              likesList.map((m, idx) => (
                <View key={m.link || idx} style={styles.historyItem}>
                  <TouchableOpacity
                    style={styles.itemClickArea}
                    onPress={() => (onMovieSelect ? onMovieSelect(m) : onPlayMovie && onPlayMovie(m))}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: m.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200' }} style={styles.itemThumb} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={2}>{cleanMovieTitle(m.title) || 'Movie Stream'}</Text>
                      <Text style={styles.genreSubText}>{m.genre || 'Hindi Dubbed • Action Cinema'}</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.itemPlayBtn}
                      onPress={() => (onPlayMovie ? onPlayMovie(m) : onMovieSelect && onMovieSelect(m))}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="play" size={16} color="#ffffff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.itemDeleteBtn}
                      onPress={() => userStore.toggleLike(m)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.textDim} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'watchLater' && (
          <>
            {watchLaterList.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="bookmark-outline" size={38} color={Colors.textDim} />
                <Text style={styles.emptyTitle}>Watch Later is empty</Text>
                <Text style={styles.emptySub}>Save movies you want to watch later for quick access.</Text>
              </View>
            ) : (
              watchLaterList.map((m, idx) => (
                <View key={m.link || idx} style={styles.historyItem}>
                  <TouchableOpacity
                    style={styles.itemClickArea}
                    onPress={() => (onMovieSelect ? onMovieSelect(m) : onPlayMovie && onPlayMovie(m))}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: m.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200' }} style={styles.itemThumb} />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={2}>{cleanMovieTitle(m.title) || 'Movie Stream'}</Text>
                      <Text style={styles.genreSubText}>{m.genre || 'Hindi Dubbed • Action Cinema'}</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.itemPlayBtn}
                      onPress={() => (onPlayMovie ? onPlayMovie(m) : onMovieSelect && onMovieSelect(m))}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="play" size={16} color="#ffffff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.itemDeleteBtn}
                      onPress={() => userStore.toggleWatchLater(m)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color={Colors.textDim} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </View>

      {/* Multi-Source Provider & Universal Sniffer Settings */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="layers-outline" size={16} color={Colors.primary} /> Active Streaming Provider
        </Text>
        <Text style={styles.sectionDesc}>
          Select a pre-configured movie source or switch to Universal Sniffer for custom sites.
        </Text>

        {/* Source Presets */}
        <View style={styles.providerGrid}>
          {PROVIDER_PRESETS.map((preset) => {
            const isActive = selectedProviderId === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[styles.providerCard, isActive && styles.providerCardActive]}
                onPress={() => handleSelectProvider(preset)}
                activeOpacity={0.8}
              >
                <View style={styles.providerHeader}>
                  <Text style={[styles.providerName, isActive && styles.providerNameActive]}>
                    {preset.name}
                  </Text>
                  <View style={[styles.providerBadge, isActive && styles.providerBadgeActive]}>
                    <Text style={[styles.providerBadgeText, isActive && styles.providerBadgeTextActive]}>
                      {preset.badge}
                    </Text>
                  </View>
                </View>
                <Text style={styles.providerDesc} numberOfLines={2}>{preset.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom URL Input for Custom/Universal Site */}
        {selectedProviderId === 'custom' && (
          <View style={styles.customUrlWrap}>
            <Text style={styles.customInputLabel}>Custom Movie Website URL:</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={siteUrl}
                onChangeText={setSiteUrl}
                placeholder="https://example-movies.to"
                placeholderTextColor={Colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCustomDomain} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* App Appearance / Theme Mode (Dark & Light) */}
      <View style={[styles.sectionCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant, marginTop: 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
          <Ionicons name="color-palette-outline" size={16} color={colors.primary} /> App Appearance
        </Text>
        <Text style={[styles.sectionDesc, { color: colors.textDim }]}>
          Switch between Dark OLED Mode for cinema immersion and Light Mode for daytime clarity.
        </Text>

        <View style={styles.themeGrid}>
          {/* Dark Mode Card */}
          <TouchableOpacity
            style={[
              styles.themeOptionCard,
              {
                backgroundColor: isDark ? (isDark ? 'rgba(208, 188, 255, 0.12)' : colors.surfaceContainerHighest) : colors.surfaceContainerLow,
                borderColor: isDark ? colors.primary : colors.outlineVariant,
              },
              isDark && styles.themeOptionCardActive,
            ]}
            onPress={() => setTheme('dark')}
            activeOpacity={0.8}
          >
            <View style={styles.themeOptionHeader}>
              <View style={[styles.themeIconCircle, { backgroundColor: 'rgba(208, 188, 255, 0.18)' }]}>
                <Ionicons name="moon" size={20} color={isDark ? colors.primary : colors.textDim} />
              </View>
              {isDark && (
                <View style={[styles.themeActiveDot, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={11} color="#ffffff" />
                </View>
              )}
            </View>
            <Text style={[styles.themeOptionTitle, { color: colors.onSurface }, isDark && { color: colors.primary, fontWeight: '800' }]}>
              Dark Mode
            </Text>
            <Text style={[styles.themeOptionSubtitle, { color: colors.textDim }]}>
              OLED cinematic navy
            </Text>
          </TouchableOpacity>

          {/* Light Mode Card */}
          <TouchableOpacity
            style={[
              styles.themeOptionCard,
              {
                backgroundColor: !isDark ? 'rgba(124, 58, 237, 0.1)' : colors.surfaceContainerLow,
                borderColor: !isDark ? colors.primary : colors.outlineVariant,
              },
              !isDark && styles.themeOptionCardActive,
            ]}
            onPress={() => setTheme('light')}
            activeOpacity={0.8}
          >
            <View style={styles.themeOptionHeader}>
              <View style={[styles.themeIconCircle, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                <Ionicons name="sunny" size={20} color={!isDark ? '#fbbf24' : colors.textDim} />
              </View>
              {!isDark && (
                <View style={[styles.themeActiveDot, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={11} color="#ffffff" />
                </View>
              )}
            </View>
            <Text style={[styles.themeOptionTitle, { color: colors.onSurface }, !isDark && { color: colors.primary, fontWeight: '800' }]}>
              Light Mode
            </Text>
            <Text style={[styles.themeOptionSubtitle, { color: colors.textDim }]}>
              Clean bright slate
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 220 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 180,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: Colors.surfaceContainer,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.textDim,
    marginBottom: 12,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tabNavRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainer,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(208, 188, 255, 0.15)',
    borderColor: Colors.primary,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textDim,
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  clearHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearHeaderText: {
    color: Colors.red,
    fontSize: 11,
    fontWeight: '700',
  },
  listSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textDim,
    textAlign: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemClickArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemThumb: {
    width: 54,
    height: 72,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  resumeInfoText: {
    fontSize: 11,
    color: Colors.primary,
    marginBottom: 6,
  },
  genreSubText: {
    fontSize: 11,
    color: Colors.textDim,
  },
  historyProgressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  historyProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    marginHorizontal: 20,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 11,
    color: Colors.textDim,
    lineHeight: 16,
    marginBottom: 14,
  },
  providerGrid: {
    gap: 10,
    marginBottom: 12,
  },
  providerCard: {
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  providerCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(208, 188, 255, 0.12)',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  providerNameActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  providerBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  providerBadgeActive: {
    backgroundColor: Colors.primaryContainer,
  },
  providerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textDim,
  },
  providerBadgeTextActive: {
    color: '#ffffff',
  },
  providerDesc: {
    fontSize: 11,
    color: Colors.textDim,
    lineHeight: 15,
  },
  customUrlWrap: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  customInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveBtn: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  themeOptionCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  themeOptionCardActive: {
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  themeOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  themeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeActiveDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  themeOptionSubtitle: {
    fontSize: 10,
    fontWeight: '500',
  },
});
