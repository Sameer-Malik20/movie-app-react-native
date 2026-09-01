import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  ActivityIndicator,
  Modal,
  StatusBar,
  Linking,
  Alert,
  BackHandler,
  ScrollView,
  PanResponder,
  Animated,
  Pressable,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { userStore } from '../services/userStore';
import { cleanMovieTitle } from '../services/api';
import { Colors } from '../theme/colors';

export const VideoPlayer = ({ streamUrl, title, referer, movie, onClose }) => {
  const videoRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const singleTapTimerRef = useRef(null);
  const lastTapRef = useRef({ time: 0, x: 0 });
  const hudTimeoutRef = useRef(null);
  const lastSavedTimeRef = useRef(0);

  const movieObj = movie || { link: streamUrl, title: title || 'Movie Stream', streamUrl };

  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [resizeMode, setResizeMode] = useState(ResizeMode.CONTAIN);
  const [selectedQuality, setSelectedQuality] = useState('Auto (Adaptive)');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Resume Playback Toast Badge
  const [resumeToast, setResumeToast] = useState(null);
  const resumeToastAnim = useRef(new Animated.Value(0)).current;

  // Like & Watch Later states
  const [isLiked, setIsLiked] = useState(userStore.isLiked(movieObj));
  const [inWatchLater, setInWatchLater] = useState(userStore.isInWatchLater(movieObj));

  // Volume & Brightness states (PlayIt / MX Player)
  const [volume, setVolume] = useState(1.0); // 0.0 to 1.0
  const [brightness, setBrightness] = useState(0.85); // 0.1 to 1.0
  const [activeGesture, setActiveGesture] = useState(null); // 'volume' | 'brightness' | 'seek' | null
  const [gestureValue, setGestureValue] = useState(0); // percentage (0-100) or seek delta

  // YouTube Double-Tap Animation state
  const [doubleTapSide, setDoubleTapSide] = useState(null); // 'left' | 'right' | null
  const doubleTapOpacity = useRef(new Animated.Value(0)).current;

  // PlayIt / MX Player Drag Seek state
  const [dragTargetMillis, setDragTargetMillis] = useState(0);
  const [dragDeltaSeconds, setDragDeltaSeconds] = useState(0);

  const initialTouchRef = useRef({
    x: 0,
    y: 0,
    isRightSide: false,
    initialVolume: 1.0,
    initialBrightness: 0.85,
    initialPosition: 0,
    gestureType: null,
  });

  // Keep latest state and handlers in refs for PanResponder closures
  const handleSeekRef = useRef(null);
  const toggleControlsRef = useRef(null);

  const stateRef = useRef({
    positionMillis: 0,
    durationMillis: 0,
    isPlaying: false,
    volume: 1.0,
    brightness: 0.85,
    dimensions: Dimensions.get('window'),
  });

  useEffect(() => {
    stateRef.current = {
      positionMillis,
      durationMillis,
      isPlaying,
      volume,
      brightness,
      dimensions,
    };
  }, [positionMillis, durationMillis, isPlaying, volume, brightness, dimensions]);

  const activeStream = streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

  // 1. Lock screen to 16:9 landscape cinema mode on open, unlock on exit
  useEffect(() => {
    let isMounted = true;

    async function setLandscapeMode() {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        if (isMounted) setIsLandscape(true);
      } catch (e) {
        console.log('Orientation lock error:', e.message);
      }
    }

    setLandscapeMode();

    const dimSubscription = Dimensions.addEventListener('change', ({ window }) => {
      if (isMounted) {
        setDimensions(window);
        setIsLandscape(window.width > window.height);
      }
    });

    return () => {
      isMounted = false;
      dimSubscription?.remove();
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => { });
    };
  }, []);

  // 2. Hardware Back Button Handling (Prevents closing entire app)
  useEffect(() => {
    const onBackPress = () => {
      if (showSettingsModal) {
        setShowSettingsModal(false);
        return true;
      }
      handleClose();
      return true;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [showSettingsModal]);

  // 3. Auto Resume Playback Position from userStore
  useEffect(() => {
    const savedPos = userStore.getPlaybackPosition(movieObj);
    if (savedPos && savedPos > 5000) {
      setTimeout(async () => {
        if (videoRef.current) {
          try {
            await videoRef.current.setPositionAsync(savedPos, {
              toleranceMillisBefore: 500,
              toleranceMillisAfter: 500,
            });
            setPositionMillis(savedPos);

            // Show Resume Notification Toast
            const formatted = formatTime(savedPos);
            setResumeToast(`Resumed from ${formatted}`);
            Animated.timing(resumeToastAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              setTimeout(() => {
                Animated.timing(resumeToastAnim, {
                  toValue: 0,
                  duration: 400,
                  useNativeDriver: true,
                }).start(() => setResumeToast(null));
              }, 2500);
            });
          } catch (e) {
            console.log('Resume seek error:', e.message);
          }
        }
      }, 800);
    }
  }, []);

  // Auto-hide controls after 4 seconds of inactivity
  const resetControlsTimer = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  }, []);

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimer]);

  const handleClose = async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.pauseAsync().catch(() => { });
      }
      // Save final playback position on exit
      if (stateRef.current.positionMillis > 0) {
        userStore.savePlaybackPosition(
          movieObj,
          stateRef.current.positionMillis,
          stateRef.current.durationMillis
        );
      }
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => { });

      // Restore phone's original brightness
      try {
        brightnessManager.restore(originalBrightnessRef.current);
      } catch (e) { }
    } catch (e) { }
    onClose();
  };

  // Reliable Single Tap Controls Toggle
  const toggleControls = useCallback(() => {
    setShowControls((prev) => {
      const next = !prev;
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (next) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 4000);
      }
      return next;
    });
  }, []);
  toggleControlsRef.current = toggleControls;

  const handleToggleLike = () => {
    const next = userStore.toggleLike(movieObj);
    setIsLiked(next);
  };

  const handleToggleWatchLater = () => {
    const next = userStore.toggleWatchLater(movieObj);
    setInWatchLater(next);
  };

  const handlePlayPause = async () => {
    resetControlsTimer();
    if (!videoRef.current) return;
    try {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await videoRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (e) {
      console.log('Play/Pause error:', e.message);
    }
  };

  // Fixed Seek with seamless auto-resume, accurate live position and zero stalling
  const handleSeek = async (offsetMillis) => {
    resetControlsTimer();
    if (!videoRef.current) return;
    try {
      let currentPos = stateRef.current.positionMillis || 0;
      let dur = stateRef.current.durationMillis || 0;

      // Query live player status for exact current timestamp
      try {
        const status = await videoRef.current.getStatusAsync();
        if (status && status.isLoaded) {
          if (typeof status.positionMillis === 'number') {
            currentPos = status.positionMillis;
          }
          if (typeof status.durationMillis === 'number' && status.durationMillis > 0) {
            dur = status.durationMillis;
          }
        }
      } catch (e) { }

      const newPos = Math.max(0, dur > 0 ? Math.min(currentPos + offsetMillis, dur) : currentPos + offsetMillis);
      stateRef.current.positionMillis = newPos;
      setPositionMillis(newPos);

      await videoRef.current.setPositionAsync(newPos, {
        toleranceMillisBefore: 500,
        toleranceMillisAfter: 500,
      });
      await videoRef.current.playAsync().catch(() => { });
      setIsPlaying(true);
    } catch (e) {
      console.log('Seek error:', e.message);
    }
  };
  handleSeekRef.current = handleSeek;

  // Trigger YouTube-style Double Tap feedback (+10s or -10s)
  const triggerDoubleTapAnimation = (side) => {
    setDoubleTapSide(side);
    doubleTapOpacity.setValue(1);
    Animated.timing(doubleTapOpacity, {
      toValue: 0,
      duration: 650,
      useNativeDriver: true,
    }).start(() => {
      setDoubleTapSide(null);
    });
  };

  // Fixed Scrub bar with immediate playback resume
  const handleProgressBarPress = async (evt) => {
    resetControlsTimer();
    if (!videoRef.current || !durationMillis) return;
    const { locationX } = evt.nativeEvent;
    const barWidth = Math.max(dimensions.width - 120, 200);
    const percentage = Math.max(0, Math.min(locationX / barWidth, 1));
    const targetPos = Math.floor(percentage * durationMillis);
    try {
      setPositionMillis(targetPos);
      await videoRef.current.setPositionAsync(targetPos, {
        toleranceMillisBefore: 500,
        toleranceMillisAfter: 500,
      });
      await videoRef.current.playAsync();
      setIsPlaying(true);
    } catch (e) {
      console.log('Seek bar error:', e.message);
    }
  };

  const toggleMute = async () => {
    resetControlsTimer();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    try {
      await videoRef.current.setIsMutedAsync(nextMuted);
      setIsMuted(nextMuted);
    } catch (e) { }
  };

  const toggleOrientation = async () => {
    resetControlsTimer();
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsLandscape(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsLandscape(true);
      }
    } catch (e) {
      console.log('Orientation toggle error:', e.message);
    }
  };

  const toggleResizeMode = () => {
    resetControlsTimer();
    setResizeMode(prev => prev === ResizeMode.CONTAIN ? ResizeMode.COVER : ResizeMode.CONTAIN);
  };

  // Accurate Real-time Playback & Buffering Handler
  const handlePlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.log('Playback error:', status.error);
        setHasError(true);
        setErrorMessage(status.error);
        setIsBuffering(false);
      }
      return;
    }

    if (status.isPlaying) {
      setIsBuffering(false);
      setIsPlaying(true);
    } else if (status.isBuffering) {
      setIsBuffering(true);
      setIsPlaying(false);
    } else {
      setIsBuffering(false);
      setIsPlaying(false);
    }

    const pos = status.positionMillis || 0;
    const dur = status.durationMillis || 0;

    // Immediately sync stateRef for panResponder, seek, and gestures
    stateRef.current.positionMillis = pos;
    stateRef.current.durationMillis = dur;
    stateRef.current.isPlaying = status.isPlaying;

    setPositionMillis(pos);
    setDurationMillis(dur);

    // Periodically save resume position in history (every 5 seconds)
    const now = Date.now();
    if (now - lastSavedTimeRef.current > 5000 && pos > 0) {
      lastSavedTimeRef.current = now;
      userStore.savePlaybackPosition(movieObj, pos, dur);
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
      setShowControls(true);
      setIsBuffering(false);
    }
  };

  const handleVideoError = (error) => {
    console.log('Video Playback Error:', error);
    setHasError(true);
    setIsBuffering(false);
    setErrorMessage(typeof error === 'string' ? error : 'Playback stream error occurred');
  };

  const handleRetry = async () => {
    setHasError(false);
    setIsBuffering(true);
    if (videoRef.current) {
      try {
        await videoRef.current.unloadAsync();
        await videoRef.current.loadAsync(
          {
            uri: activeStream,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              ...(referer ? { 'Referer': referer } : {})
            },
            overrideFileExtensionAndroid: 'm3u8'
          },
          { shouldPlay: true },
          true
        );
        setIsPlaying(true);
      } catch (e) {
        console.log('Retry error:', e.message);
      }
    }
  };

  const openInBrowserFallback = async () => {
    try {
      const supported = await Linking.canOpenURL(activeStream);
      if (supported) {
        await Linking.openURL(activeStream);
      } else {
        Alert.alert('Stream Link', activeStream);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open external stream');
    }
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

  // 3. PanResponder for All Video Gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;
      },
      onPanResponderGrant: (evt) => {
        const touchX = evt.nativeEvent.pageX;
        const touchY = evt.nativeEvent.pageY;
        const screenWidth = stateRef.current.dimensions.width;

        initialTouchRef.current = {
          x: touchX,
          y: touchY,
          isRightSide: touchX > screenWidth / 2,
          initialVolume: stateRef.current.volume,
          initialBrightness: stateRef.current.brightness,
          initialPosition: stateRef.current.positionMillis,
          gestureType: null,
        };

        if (hudTimeoutRef.current) {
          clearTimeout(hudTimeoutRef.current);
          hudTimeoutRef.current = null;
        }
      },
      onPanResponderMove: (_, gestureState) => {
        const { dx, dy } = gestureState;
        const { isRightSide, initialVolume, initialBrightness, initialPosition } = initialTouchRef.current;
        const { dimensions: dims, durationMillis: dur } = stateRef.current;

        // Determine gesture type once movement passes threshold
        if (!initialTouchRef.current.gestureType) {
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
            initialTouchRef.current.gestureType = 'seek';
          } else if (Math.abs(dy) >= Math.abs(dx) && Math.abs(dy) > 8) {
            initialTouchRef.current.gestureType = isRightSide ? 'volume' : 'brightness';
          }
        }

        const gesture = initialTouchRef.current.gestureType;

        if (gesture === 'seek') {
          const duration = dur || 1800000;
          const swipeScale = Math.max(60000, Math.min(180000, duration * 0.1));
          const seekOffset = (dx / dims.width) * swipeScale;
          const target = Math.max(0, Math.min(initialPosition + seekOffset, duration));
          const deltaSec = Math.round(seekOffset / 1000);

          setActiveGesture('seek');
          setDragTargetMillis(target);
          setDragDeltaSeconds(deltaSec);
        } else if (gesture === 'volume') {
          // Right Side Vertical Swipe = Volume Control
          const delta = -dy / (dims.height * 0.65);
          const newVol = Math.max(0, Math.min(initialVolume + delta, 1.0));

          setVolume(newVol);
          setActiveGesture('volume');
          setGestureValue(Math.round(newVol * 100));

          if (videoRef.current) {
            videoRef.current.setVolumeAsync(newVol).catch(() => { });
          }
        } else if (gesture === 'brightness') {
          // Left Side Vertical Swipe = Video Screen Brightness Control
          const delta = -dy / (dims.height * 0.65);
          const newBri = Math.max(0.1, Math.min(initialBrightness + delta, 1.0));

          setBrightness(newBri);
          setActiveGesture('brightness');
          setGestureValue(Math.round(newBri * 100));
        }
      },
      onPanResponderRelease: async (evt, gestureState) => {
        const gesture = initialTouchRef.current.gestureType;
        initialTouchRef.current.gestureType = null; // Always reset gesture type immediately

        if (gesture === 'seek') {
          const duration = stateRef.current.durationMillis || 1800000;
          const swipeScale = Math.max(60000, Math.min(180000, duration * 0.1));
          const seekOffset = (gestureState.dx / stateRef.current.dimensions.width) * swipeScale;
          const target = Math.max(0, Math.min(initialTouchRef.current.initialPosition + seekOffset, duration));

          setActiveGesture(null);
          if (videoRef.current) {
            try {
              setPositionMillis(target);
              await videoRef.current.setPositionAsync(target, {
                toleranceMillisBefore: 500,
                toleranceMillisAfter: 500,
              });
              await videoRef.current.playAsync();
              setIsPlaying(true);
            } catch (e) {
              console.log('Seek commit error:', e.message);
            }
          }
          return;
        }

        if (gesture === 'volume' || gesture === 'brightness') {
          // Instantly remove Volume/Brightness HUD on finger lift
          setActiveGesture(null);
          return;
        }

        // Tap Detection (finger didn't drag/swipe)
        const now = Date.now();
        const touchX = evt.nativeEvent.pageX;
        const screenWidth = stateRef.current.dimensions.width;
        const isRightHalf = touchX > screenWidth / 2;

        if (
          now - lastTapRef.current.time < 280 &&
          Math.abs(touchX - lastTapRef.current.x) < screenWidth * 0.4
        ) {
          // Double Tap Triggered
          if (singleTapTimerRef.current) {
            clearTimeout(singleTapTimerRef.current);
            singleTapTimerRef.current = null;
          }

          if (isRightHalf) {
            if (handleSeekRef.current) handleSeekRef.current(10000);
            triggerDoubleTapAnimation('right');
          } else {
            if (handleSeekRef.current) handleSeekRef.current(-10000);
            triggerDoubleTapAnimation('left');
          }

          lastTapRef.current = { time: 0, x: 0 };
        } else {
          // Single Tap Candidate
          lastTapRef.current = { time: now, x: touchX };
          if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);

          singleTapTimerRef.current = setTimeout(() => {
            if (toggleControlsRef.current) toggleControlsRef.current();
            singleTapTimerRef.current = null;
          }, 280);
        }
      },
      onPanResponderTerminate: () => {
        initialTouchRef.current.gestureType = null;
        setActiveGesture(null);
      },
    })
  ).current;

  const progressPercent = durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;
  const dragProgressPercent = durationMillis > 0 ? (dragTargetMillis / durationMillis) * 100 : 0;

  const getVolumeIcon = () => {
    if (volume === 0 || isMuted) return 'volume-mute';
    if (volume < 0.35) return 'volume-low';
    if (volume < 0.7) return 'volume-medium';
    return 'volume-high';
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={styles.videoWrapper} {...panResponder.panHandlers}>
        {/* Native 16:9 Movie Cinema Video Player */}
        <Video
          ref={videoRef}
          style={styles.video}
          source={{
            uri: activeStream,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              ...(referer ? { 'Referer': referer } : {})
            },
            overrideFileExtensionAndroid: 'm3u8'
          }}
          rate={playbackRate}
          isMuted={isMuted}
          volume={volume}
          resizeMode={resizeMode}
          shouldPlay={true}
          isLooping={false}
          useNativeControls={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={handleVideoError}
        />

        {/* Real-time Brightness Dimmer Overlay */}
        <View
          style={[styles.brightnessDimmer, { opacity: Math.max(0, 1 - brightness) }]}
          pointerEvents="none"
        />

        {/* Resume Position Toast Notification */}
        {resumeToast && (
          <Animated.View
            style={[
              styles.resumeToastBadge,
              { opacity: resumeToastAnim, transform: [{ translateY: resumeToastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
            ]}
            pointerEvents="none"
          >
            <Ionicons name="time" size={16} color={Colors.primary} />
            <Text style={styles.resumeToastText}>{resumeToast}</Text>
          </Animated.View>
        )}

        {/* YouTube-Style Double Tap Left Ripple Effect (-10s) */}
        {doubleTapSide === 'left' && (
          <Animated.View
            style={[
              styles.doubleTapOverlay,
              styles.doubleTapLeft,
              { opacity: doubleTapOpacity },
            ]}
            pointerEvents="none"
          >
            <View style={styles.doubleTapBadge}>
              <Ionicons name="play-back" size={32} color="#ffffff" />
              <Text style={styles.doubleTapText}>10 seconds</Text>
            </View>
          </Animated.View>
        )}

        {/* YouTube-Style Double Tap Right Ripple Effect (+10s) */}
        {doubleTapSide === 'right' && (
          <Animated.View
            style={[
              styles.doubleTapOverlay,
              styles.doubleTapRight,
              { opacity: doubleTapOpacity },
            ]}
            pointerEvents="none"
          >
            <View style={styles.doubleTapBadge}>
              <Ionicons name="play-forward" size={32} color="#ffffff" />
              <Text style={styles.doubleTapText}>10 seconds</Text>
            </View>
          </Animated.View>
        )}

        {/* PlayIt / MX Player Volume HUD (Right Swipe Up/Down) */}
        {activeGesture === 'volume' && (
          <View style={styles.gestureHudCard} pointerEvents="none">
            <Ionicons name={getVolumeIcon()} size={28} color="#38bdf8" />
            <Text style={styles.gestureHudTitle}>Volume</Text>
            <Text style={styles.gestureHudPercent}>{gestureValue}%</Text>
            <View style={styles.gestureProgressTrack}>
              <View style={[styles.gestureProgressFill, { width: `${gestureValue}%`, backgroundColor: '#38bdf8' }]} />
            </View>
          </View>
        )}

        {/* PlayIt / MX Player Brightness HUD (Left Swipe Up/Down) */}
        {activeGesture === 'brightness' && (
          <View style={styles.gestureHudCard} pointerEvents="none">
            <Ionicons name="sunny" size={28} color="#fbbf24" />
            <Text style={styles.gestureHudTitle}>Brightness</Text>
            <Text style={styles.gestureHudPercent}>{gestureValue}%</Text>
            <View style={styles.gestureProgressTrack}>
              <View style={[styles.gestureProgressFill, { width: `${gestureValue}%`, backgroundColor: '#fbbf24' }]} />
            </View>
          </View>
        )}

        {/* PlayIt / MX Player Finger Swipe Drag Seek HUD */}
        {activeGesture === 'seek' && (
          <View style={styles.dragSeekHud} pointerEvents="none">
            <View style={styles.dragSeekHeader}>
              <Ionicons
                name={dragDeltaSeconds >= 0 ? 'play-forward' : 'play-back'}
                size={22}
                color={dragDeltaSeconds >= 0 ? '#38bdf8' : '#fbbf24'}
              />
              <Text
                style={[
                  styles.dragSeekDelta,
                  { color: dragDeltaSeconds >= 0 ? '#38bdf8' : '#fbbf24' },
                ]}
              >
                {dragDeltaSeconds >= 0 ? `+${dragDeltaSeconds}s` : `${dragDeltaSeconds}s`}
              </Text>
            </View>

            <Text style={styles.dragSeekTime}>
              {formatTime(dragTargetMillis)} / {durationMillis > 0 ? formatTime(durationMillis) : 'LIVE'}
            </Text>

            <View style={styles.dragSeekTrack}>
              <View style={[styles.dragSeekFill, { width: `${dragProgressPercent}%` }]} />
            </View>
          </View>
        )}

        {/* Buffering Indicator - ONLY show when not playing AND actively buffering */}
        {isBuffering && !isPlaying && !hasError && !activeGesture && (
          <View style={styles.bufferingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.bufferingText}>Buffering VIP Stream...</Text>
          </View>
        )}

        {/* Error Recovery Overlay */}
        {hasError && (
          <View style={styles.errorOverlay}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.red} />
            <Text style={styles.errorTitle}>Stream Connection Interrupted</Text>
            <Text style={styles.errorSub}>Could not load the direct media stream.</Text>
            <View style={styles.errorBtnRow}>
              <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
                <Ionicons name="refresh" size={18} color="#ffffff" />
                <Text style={styles.retryText}>Retry Playback</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.externalBtn} onPress={openInBrowserFallback} activeOpacity={0.8}>
                <Ionicons name="open-outline" size={18} color={Colors.primary} />
                <Text style={styles.externalText}>Open External</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Touch Overlay Cinema Controls */}
        {showControls && !hasError && (
          <View style={styles.controlsOverlay} pointerEvents="box-none">
            {/* Top Navigation Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.controlIconBtn}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>

              <View style={styles.titleContainer}>
                <Text style={styles.movieTitle} numberOfLines={1}>
                  {cleanMovieTitle(title) || 'CinePremium VIP Stream'}
                </Text>
                <View style={styles.adFreeBadge}>
                  <Text style={styles.adFreeText}>⚡ 0 ADS • VIP STREAM</Text>
                </View>
              </View>

              <View style={styles.topRightActions}>
                {/* Like Button in Player */}
                <TouchableOpacity
                  style={styles.controlIconBtn}
                  onPress={handleToggleLike}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={20}
                    color={isLiked ? '#ef4444' : '#ffffff'}
                  />
                </TouchableOpacity>

                {/* Watch Later Button in Player */}
                <TouchableOpacity
                  style={styles.controlIconBtn}
                  onPress={handleToggleWatchLater}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={inWatchLater ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={inWatchLater ? Colors.primary : '#ffffff'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlIconBtn}
                  onPress={toggleOrientation}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isLandscape ? 'phone-portrait-outline' : 'phone-landscape-outline'}
                    size={20}
                    color="#ffffff"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlIconBtn}
                  onPress={toggleResizeMode}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={resizeMode === ResizeMode.CONTAIN ? 'aspect-ratio' : 'fit-screen'}
                    size={20}
                    color="#ffffff"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlIconBtn}
                  onPress={() => {
                    resetControlsTimer();
                    setShowSettingsModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="settings-outline" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Center Controls (Rewind 10s, Play/Pause, Forward 10s) */}
            <View style={styles.centerControlRow}>
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => handleSeek(-10000)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="replay-10" size={38} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mainPlayBtn}
                onPress={handlePlayPause}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={40}
                  color="#ffffff"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => handleSeek(10000)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="forward-10" size={38} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Bottom Bar: Timeline, Timestamps, Mute */}
            <View style={styles.bottomBar}>
              {/* Progress Bar Track */}
              <TouchableOpacity
                style={styles.progressBarWrapper}
                onPress={handleProgressBarPress}
                activeOpacity={0.9}
              >
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                  <View style={[styles.progressThumb, { left: `${progressPercent}%` }]} />
                </View>
              </TouchableOpacity>

              {/* Bottom Row Actions */}
              <View style={styles.bottomMetaRow}>
                <Text style={styles.timeText}>
                  {formatTime(positionMillis)} / {durationMillis > 0 ? formatTime(durationMillis) : 'LIVE'}
                </Text>

                <View style={styles.bottomRightActions}>
                  <View style={styles.qualityTagSmall}>
                    <Text style={styles.qualityTagTextSmall}>{selectedQuality.split(' ')[0]}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.bottomIconBtn}
                    onPress={toggleMute}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isMuted ? 'volume-mute' : 'volume-high'}
                      size={22}
                      color="#ffffff"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Stream Preferences Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowSettingsModal(false)}
        >
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCardLandscape,
                {
                  width: Math.min(dimensions.width * 0.88, 560),
                  maxHeight: Math.min(dimensions.height * 0.9, 320),
                },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleGroup}>
                  <Ionicons name="settings" size={16} color={Colors.primary} />
                  <Text style={styles.modalTitle}>Stream Preferences</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowSettingsModal(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Landscape 2-Column Content */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.modalColumnsWrap}>
                  {/* Column 1: Video Quality */}
                  <View style={styles.modalColumn}>
                    <Text style={styles.modalSectionLabel}>Video Quality</Text>
                    {['Auto (Adaptive)', '4K Ultra HD', '1080p Full HD', '720p HD'].map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={[
                          styles.qualityOption,
                          selectedQuality === q && styles.qualityOptionActive,
                        ]}
                        onPress={() => {
                          setSelectedQuality(q);
                          setShowSettingsModal(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.qualityText,
                            selectedQuality === q && styles.qualityTextActive,
                          ]}
                        >
                          {q}
                        </Text>
                        {selectedQuality === q && (
                          <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Column 2: Speed & External Playback */}
                  <View style={styles.modalColumn}>
                    <Text style={styles.modalSectionLabel}>Playback Speed</Text>
                    <View style={styles.speedRow}>
                      {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                        <TouchableOpacity
                          key={rate}
                          style={[
                            styles.speedChip,
                            playbackRate === rate && styles.speedChipActive,
                          ]}
                          onPress={async () => {
                            setPlaybackRate(rate);
                            if (videoRef.current) {
                              await videoRef.current.setRateAsync(rate, true);
                            }
                            setShowSettingsModal(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.speedText,
                              playbackRate === rate && styles.speedTextActive,
                            ]}
                          >
                            {rate}x
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.modalSectionLabel, { marginTop: 10 }]}>External Stream</Text>
                    <TouchableOpacity
                      style={styles.externalFallbackRow}
                      onPress={() => {
                        setShowSettingsModal(false);
                        openInBrowserFallback();
                      }}
                      activeOpacity={0.7}
                    >
                      <Feather name="external-link" size={14} color={Colors.primary} />
                      <Text style={styles.externalFallbackText}>Open in External Player</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 9999,
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  brightnessDimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 1,
  },
  resumeToastBadge: {
    position: 'absolute',
    top: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(5, 20, 36, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  resumeToastText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  doubleTapOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '45%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  doubleTapLeft: {
    left: 0,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 100,
  },
  doubleTapRight: {
    right: 0,
    borderTopLeftRadius: 100,
    borderBottomLeftRadius: 100,
  },
  doubleTapBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 4,
  },
  doubleTapText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  gestureHudCard: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 22, 38, 0.94)',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(160, 120, 255, 0.4)',
    minWidth: 160,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 20,
    gap: 4,
  },
  gestureHudTitle: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  gestureHudPercent: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  gestureProgressTrack: {
    width: 120,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  gestureProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  dragSeekHud: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 22, 38, 0.94)',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(160, 120, 255, 0.4)',
    minWidth: 200,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 20,
  },
  dragSeekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dragSeekDelta: {
    fontSize: 18,
    fontWeight: '800',
  },
  dragSeekTime: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
  },
  dragSeekTrack: {
    width: 160,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  dragSeekFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    zIndex: 15,
  },
  bufferingText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 20, 36, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 10,
    zIndex: 30,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 12,
    color: Colors.textDim,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  externalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(208, 188, 255, 0.12)',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  externalText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 14,
    zIndex: 25,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  movieTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  adFreeBadge: {
    marginTop: 2,
  },
  adFreeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  controlIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 50,
  },
  skipBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPlayBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomBar: {
    width: '100%',
  },
  progressBarWrapper: {
    paddingVertical: 8,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    marginLeft: -6,
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  bottomRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qualityTagSmall: {
    backgroundColor: 'rgba(208, 188, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qualityTagTextSmall: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  bottomIconBtn: {
    padding: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCardLandscape: {
    backgroundColor: '#0a1626',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(160, 120, 255, 0.25)',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    paddingTop: 12,
  },
  modalColumnsWrap: {
    flexDirection: 'row',
    gap: 20,
  },
  modalColumn: {
    flex: 1,
  },
  modalSectionLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  qualityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  qualityOptionActive: {
    backgroundColor: 'rgba(160, 120, 255, 0.15)',
    borderWidth: 0.5,
    borderColor: Colors.primary,
  },
  qualityText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  qualityTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  speedRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  speedChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  speedChipActive: {
    backgroundColor: Colors.primaryContainer,
  },
  speedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  speedTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  externalFallbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(208, 188, 255, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(208, 188, 255, 0.2)',
  },
  externalFallbackText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
});
