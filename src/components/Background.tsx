import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../utils/colors';

// Three large colour blobs placed behind all content.
// Glass cards use backdropFilter:blur() to frost whatever is behind them,
// making these blobs show as soft glowing colour through the glass.
export function Background() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.base]} pointerEvents="none">
      {/* Forest green — top-left */}
      <View style={[styles.blob, {
        width: 560, height: 560, borderRadius: 280,
        backgroundColor: Colors.blobGreen,
        opacity: 0.75, top: -180, left: -160,
      }]} />
      {/* Amber gold — mid-right */}
      <View style={[styles.blob, {
        width: 380, height: 380, borderRadius: 190,
        backgroundColor: Colors.blobGold,
        opacity: 0.45, top: 280, right: -100,
      }]} />
      {/* Deep teal — bottom-left */}
      <View style={[styles.blob, {
        width: 460, height: 460, borderRadius: 230,
        backgroundColor: Colors.blobTeal,
        opacity: 0.55, bottom: -100, left: -60,
      }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: Colors.background, overflow: 'hidden' },
  blob: { position: 'absolute' },
});
