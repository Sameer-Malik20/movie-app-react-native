import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export const Header = ({ onSearchPress, onProfilePress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logoImg}
          resizeMode="cover"
        />
        <Text style={styles.brandTitle}>CINE<Text style={styles.brandHighlight}>PREMIUM</Text></Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={onSearchPress} activeOpacity={0.7}>
          <Ionicons name="search" size={20} color={Colors.onSurface} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.avatarBtn} onPress={onProfilePress} activeOpacity={0.7}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.avatarImg}
            resizeMode="cover"
          />
          <View style={styles.vipDot} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(5, 20, 36, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImg: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(160, 120, 255, 0.4)',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  brandHighlight: {
    color: Colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarBtn: {
    position: 'relative',
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  vipDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.background,
  },
});
