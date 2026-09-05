import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import YoutubePlayer from 'react-native-youtube-iframe';
import { extractYouTubeId } from '../services/youtubeService';
import { Colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

export const MiniPlayer = ({
  media,
  isPlaying,
  progress = 0, // 0 to 1
  onExpand,
  onTogglePlay,
  onClose,
}) => {
  const { isDark, colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const ytVideoId =
    media?.videoId ||
    extractYouTubeId(media?.streamUrl) ||
    extractYouTubeId(media?.link) ||
    extractYouTubeId(media?.url);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!media) return null;

  const title = media.title || 'Playing Video';
  const subtitle = media.channel || media.genre || (ytVideoId ? 'YouTube VIP' : 'Movie Stream');
  const thumbnail = media.poster || media.thumbnail || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
          backgroundColor: isDark ? 'rgba(18, 33, 49, 0.96)' : 'rgba(255, 255, 255, 0.98)',
          borderColor: colors.outlineVariant,
          shadowColor: isDark ? '#000000' : '#94a3b8',
        },
      ]}
    >
      {/* Tap to expand full screen */}
      <TouchableOpacity
        style={styles.touchArea}
        onPress={onExpand}
        activeOpacity={0.92}
      >
        {/* Left Live Video Thumbnail with PiP Playback */}
        <View style={styles.thumbnailBox}>
          {ytVideoId ? (
            <View style={styles.miniVideoContainer} pointerEvents="none">
              <YoutubePlayer
                height={50}
                width={86}
                play={isPlaying}
                forceAndroidAutoplay={true}
                videoId={ytVideoId}
                initialPlayerParams={{
                  controls: false,
                  rel: false,
                  modestbranding: true,
                  playsinline: true,
                  autoplay: true,
                }}
                webViewProps={{
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserAction: false,
                  androidLayerType: 'hardware',
                }}
              />
            </View>
          ) : media.streamUrl ? (
            <Video
              style={styles.miniVideo}
              source={{ uri: media.streamUrl }}
              shouldPlay={isPlaying}
              isMuted={false}
              resizeMode={ResizeMode.COVER}
            />
          ) : (
            <Image source={{ uri: thumbnail }} style={styles.thumbnail} resizeMode="cover" />
          )}

          {ytVideoId && (
            <View style={styles.miniYtBadge} pointerEvents="none">
              <Ionicons name="logo-youtube" size={10} color="#FF0000" />
            </View>
          )}
        </View>

        {/* Center: Title & Subtitle */}
        <View style={styles.metaContainer}>
          <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.subRow}>
            <Text style={[styles.subText, { color: colors.textDim }]} numberOfLines={1}>
              {subtitle}
            </Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>PiP</Text>
            </View>
          </View>
        </View>

        {/* Controls: Play/Pause and Close */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onTogglePlay}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={22}
              color={colors.onSurface}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.closeBtn]}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={20} color={colors.textDim} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Mini Progress Track at bottom */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${Math.min(100, Math.max(0, progress * 100))}%` }]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 82 : 72,
    left: 12,
    right: 12,
    height: 64,
    backgroundColor: 'rgba(11, 23, 38, 0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 16,
    overflow: 'hidden',
    zIndex: 9999,
  },
  touchArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  thumbnailBox: {
    width: 86,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniVideoContainer: {
    width: 86,
    height: 50,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniVideo: {
    width: '100%',
    height: '100%',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  miniYtBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 3,
    padding: 1.5,
  },
  metaContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subText: {
    fontSize: 11,
    color: Colors.textDim,
    maxWidth: width * 0.38,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.16)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginLeft: 8,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FF0000',
    marginRight: 3,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF453A',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  closeBtn: {
    backgroundColor: 'transparent',
  },
  progressTrack: {
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF0000',
  },
});
