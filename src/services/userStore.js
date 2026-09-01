// CinePremium Universal Persistent Storage & User State Store
// Seamlessly saves Likes, Watch Later, Playback Resume Positions & History across restarts

import { cleanMovieTitle } from './engines/universalSniffer.js';

let NativeStorage = null;
try {
  const mod = require('@react-native-async-storage/async-storage');
  NativeStorage = mod?.default || mod;
} catch (e) {
  NativeStorage = null;
}

const memoryStore = new Map();

const StorageEngine = {
  async getItem(key) {
    try {
      if (NativeStorage && typeof NativeStorage.getItem === 'function') {
        const val = await NativeStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
      if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
        return globalThis.localStorage.getItem(key);
      }
    } catch (e) {}
    return memoryStore.get(key) || null;
  },

  async setItem(key, value) {
    try {
      memoryStore.set(key, value);
      if (NativeStorage && typeof NativeStorage.setItem === 'function') {
        await NativeStorage.setItem(key, value);
      }
      if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
        globalThis.localStorage.setItem(key, value);
      }
    } catch (e) {}
  },

  async removeItem(key) {
    try {
      memoryStore.delete(key);
      if (NativeStorage && typeof NativeStorage.removeItem === 'function') {
        await NativeStorage.removeItem(key);
      }
      if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
        globalThis.localStorage.removeItem(key);
      }
    } catch (e) {}
  },
};

const STORAGE_KEYS = {
  LIKES: '@cinepremium_likes_v2',
  WATCH_LATER: '@cinepremium_watchlater_v2',
  HISTORY: '@cinepremium_history_v2',
};

class UserStore {
  constructor() {
    this.likes = new Map();
    this.watchLater = new Map();
    this.history = new Map();
    this.listeners = new Set();
    this.isLoaded = false;

    // Load persisted state from mobile device storage on launch
    this.loadFromStorage();
  }

  async loadFromStorage() {
    try {
      const [likesJson, watchLaterJson, historyJson] = await Promise.all([
        StorageEngine.getItem(STORAGE_KEYS.LIKES),
        StorageEngine.getItem(STORAGE_KEYS.WATCH_LATER),
        StorageEngine.getItem(STORAGE_KEYS.HISTORY),
      ]);

      if (likesJson) {
        const arr = JSON.parse(likesJson);
        if (Array.isArray(arr)) {
          arr.forEach((m) => {
            const id = this.getMovieId(m);
            if (id) this.likes.set(id, m);
          });
        }
      }

      if (watchLaterJson) {
        const arr = JSON.parse(watchLaterJson);
        if (Array.isArray(arr)) {
          arr.forEach((m) => {
            const id = this.getMovieId(m);
            if (id) this.watchLater.set(id, m);
          });
        }
      }

      if (historyJson) {
        const arr = JSON.parse(historyJson);
        if (Array.isArray(arr)) {
          arr.forEach((item) => {
            if (item && item.movie) {
              const id = this.getMovieId(item.movie);
              if (id) this.history.set(id, item);
            }
          });
        }
      }

      this.isLoaded = true;
      this.notify();
    } catch (e) {
      console.log('Error loading user store from storage:', e);
      this.isLoaded = true;
    }
  }

  async saveLikesToStorage() {
    try {
      const arr = Array.from(this.likes.values());
      await StorageEngine.setItem(STORAGE_KEYS.LIKES, JSON.stringify(arr));
    } catch (e) {
      console.log('Error saving likes:', e);
    }
  }

  async saveWatchLaterToStorage() {
    try {
      const arr = Array.from(this.watchLater.values());
      await StorageEngine.setItem(STORAGE_KEYS.WATCH_LATER, JSON.stringify(arr));
    } catch (e) {
      console.log('Error saving watch later:', e);
    }
  }

  async saveHistoryToStorage() {
    try {
      const arr = Array.from(this.history.values());
      await StorageEngine.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(arr));
    } catch (e) {
      console.log('Error saving history:', e);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {}
    });
  }

  normalizeMovie(movie) {
    if (!movie) return null;
    return {
      title: cleanMovieTitle(movie.title) || 'Movie Stream',
      link: movie.link || movie.url || movie.pageUrl || '',
      poster: movie.poster || '',
      quality: movie.quality || 'HD',
      imdb: movie.imdb || '',
      year: movie.year || '',
      duration: movie.duration || '',
      genre: movie.genre || '',
      description: movie.description || '',
      streamUrl: movie.streamUrl || '',
      referer: movie.referer || '',
    };
  }

  getMovieId(movie) {
    if (!movie) return '';
    return movie.link || movie.url || movie.pageUrl || movie.id || movie.streamUrl || movie.title || '';
  }

  // 1. Likes
  toggleLike(movie) {
    if (!movie) return false;
    const norm = this.normalizeMovie(movie);
    const id = this.getMovieId(norm);
    if (!id) return false;

    let result = false;
    if (this.likes.has(id)) {
      this.likes.delete(id);
      result = false;
    } else {
      this.likes.set(id, norm);
      result = true;
    }
    this.saveLikesToStorage();
    this.notify();
    return result;
  }

  isLiked(movie) {
    const id = this.getMovieId(movie);
    return this.likes.has(id);
  }

  getLikes() {
    return Array.from(this.likes.values());
  }

  // 2. Watch Later
  toggleWatchLater(movie) {
    if (!movie) return false;
    const norm = this.normalizeMovie(movie);
    const id = this.getMovieId(norm);
    if (!id) return false;

    let result = false;
    if (this.watchLater.has(id)) {
      this.watchLater.delete(id);
      result = false;
    } else {
      this.watchLater.set(id, norm);
      result = true;
    }
    this.saveWatchLaterToStorage();
    this.notify();
    return result;
  }

  isInWatchLater(movie) {
    const id = this.getMovieId(movie);
    return this.watchLater.has(id);
  }

  getWatchLater() {
    return Array.from(this.watchLater.values());
  }

  // 3. Playback History & Resume Left-Off Position
  savePlaybackPosition(movie, positionMillis, durationMillis) {
    if (!movie || !positionMillis || positionMillis <= 0) return;
    const norm = this.normalizeMovie(movie);
    const id = this.getMovieId(norm);
    if (!id) return;

    this.history.set(id, {
      movie: norm,
      positionMillis,
      durationMillis: durationMillis || 0,
      updatedAt: Date.now(),
    });
    this.saveHistoryToStorage();
    this.notify();
  }

  getPlaybackPosition(movie) {
    const id = this.getMovieId(movie);
    if (!id) return 0;
    const item = this.history.get(id);
    if (item && item.durationMillis > 0 && item.positionMillis / item.durationMillis > 0.95) {
      return 0; // If watched > 95%, restart from 00:00
    }
    return item ? item.positionMillis : 0;
  }

  getHistory() {
    return Array.from(this.history.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  removeHistoryItem(movieIdOrMovie) {
    const id = typeof movieIdOrMovie === 'string' ? movieIdOrMovie : this.getMovieId(movieIdOrMovie);
    if (id && this.history.has(id)) {
      this.history.delete(id);
      this.saveHistoryToStorage();
      this.notify();
    }
  }

  clearHistory() {
    this.history.clear();
    this.saveHistoryToStorage();
    this.notify();
  }
}

export const userStore = new UserStore();
