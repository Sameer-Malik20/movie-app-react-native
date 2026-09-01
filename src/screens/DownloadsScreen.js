import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Switch
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export const DownloadsScreen = ({ onPlayMovie }) => {
  const [wifiOnly, setWifiOnly] = useState(true);
  const [smartDownload, setSmartDownload] = useState(true);
  const [downloadedMovies, setDownloadedMovies] = useState([]);

  const handleDelete = (id) => {
    setDownloadedMovies(prev => prev.filter(m => m.id !== id));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Downloads</Text>
        <Text style={styles.headerSub}>Watch offline without internet or buffer</Text>
      </View>

      {/* Storage Meter Bar */}
      <View style={styles.storageCard}>
        <View style={styles.storageHeader}>
          <View style={styles.storageInfo}>
            <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary} />
            <Text style={styles.storageTitle}>Device Storage</Text>
          </View>
          <Text style={styles.storageStats}>
            {downloadedMovies.length === 0 ? '0.0 GB of 128 GB' : `${(downloadedMovies.length * 1.5).toFixed(1)} GB of 128 GB`}
          </Text>
        </View>

        <View style={styles.storageBarBg}>
          <View
            style={[
              styles.storageBarFill,
              { width: downloadedMovies.length === 0 ? '0%' : `${Math.min(downloadedMovies.length * 2, 100)}%` }
            ]}
          />
        </View>
        <Text style={styles.storageFootnote}>
          {downloadedMovies.length === 0 ? 'No offline media stored' : `${downloadedMovies.length} offline movies stored`}
        </Text>
      </View>

      {/* Downloaded Movies List */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Downloaded Content ({downloadedMovies.length})</Text>

        {downloadedMovies.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cloud-download-outline" size={44} color={Colors.textDim} />
            <Text style={styles.emptyTitle}>No downloaded movies yet</Text>
            <Text style={styles.emptySub}>Download your favorite movies to watch anywhere offline.</Text>
          </View>
        ) : (
          downloadedMovies.map((item) => (
            <View key={item.id} style={styles.downloadItem}>
              <Image source={{ uri: item.poster }} style={styles.itemThumb} />

              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <View style={styles.metaBadgeRow}>
                  <View style={styles.qualityTag}>
                    <Text style={styles.qualityTagText}>{item.quality}</Text>
                  </View>
                  <Text style={styles.itemMeta}>{item.size} • {item.duration}</Text>
                </View>
              </View>

              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.playActionBtn}
                  onPress={() => onPlayMovie(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="play" size={16} color="#ffffff" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteActionBtn}
                  onPress={() => handleDelete(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.red} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Smart Download Preferences */}
      <View style={styles.prefSection}>
        <Text style={styles.sectionTitle}>Download Preferences</Text>

        <View style={styles.prefRow}>
          <View>
            <Text style={styles.prefLabel}>Wi-Fi Only Downloads</Text>
            <Text style={styles.prefDesc}>Save cellular mobile data</Text>
          </View>
          <Switch
            value={wifiOnly}
            onValueChange={setWifiOnly}
            trackColor={{ false: Colors.surfaceContainerHighest, true: Colors.primaryContainer }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.prefRow}>
          <View>
            <Text style={styles.prefLabel}>Smart Offline Cache</Text>
            <Text style={styles.prefDesc}>Pre-buffers next recommendations</Text>
          </View>
          <Switch
            value={smartDownload}
            onValueChange={setSmartDownload}
            trackColor={{ false: Colors.surfaceContainerHighest, true: Colors.primaryContainer }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
  },
  storageCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  storageStats: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  storageBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceContainerHighest,
    overflow: 'hidden',
    marginBottom: 8,
  },
  storageBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  storageFootnote: {
    fontSize: 11,
    color: Colors.textDim,
  },
  listSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 14,
  },
  downloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  itemThumb: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qualityTag: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  qualityTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
  },
  itemMeta: {
    fontSize: 11,
    color: Colors.textDim,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textDim,
    textAlign: 'center',
    marginTop: 4,
  },
  prefSection: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  prefLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  prefDesc: {
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 2,
  },
});
