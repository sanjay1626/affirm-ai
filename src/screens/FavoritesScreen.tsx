import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Share, Alert, StatusBar,
} from 'react-native';
import { getFavorites, removeFromFavorites } from '../services/affirmationService';
import { Background } from '../components/Background';
import { Glass } from '../utils/glass';
import { Colors } from '../utils/colors';
import { Spacing, Radius } from '../utils/spacing';

interface Favorite {
  id: string;
  affirmation_id: string;
  affirmation_text: string;
  created_at: string;
}

export function FavoritesScreen() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getFavorites();
    setFavorites(data as Favorite[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = (item: Favorite) => {
    Alert.alert(
      'Remove',
      'Remove this affirmation from your saved collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          await removeFromFavorites(item.affirmation_id);
          await load();
        }},
      ]
    );
  };

  const handleShare = async (text: string) => {
    await Share.share({ message: `"${text}"\n\n— Saved from AffirmAI` });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <Background />
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.screenTitle}>Saved</Text>
            <Text style={styles.screenSubtitle}>
              {favorites.length > 0
                ? `${favorites.length} saved affirmation${favorites.length !== 1 ? 's' : ''}`
                : 'Your saved affirmations will appear here.'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={[styles.emptyState, Glass.card]}>
              <View style={styles.emptyOrb}>
                <Text style={styles.emptyOrbHeart}>♡</Text>
              </View>
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptyText}>
                Tap the heart on any affirmation to save it here.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.card, Glass.card]}>
            <Text style={styles.quoteDecor}>"</Text>
            <Text style={styles.affirmText}>{item.affirmation_text}</Text>
            <Text style={styles.savedDate}>
              Saved {new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item.affirmation_text)}>
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleRemove(item)}>
                <Text style={[styles.actionText, styles.removeText]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  listHeader: { paddingTop: Spacing.lg, marginBottom: Spacing.lg },
  screenTitle: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  screenSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  emptyState: {
    paddingVertical: Spacing.xxl, alignItems: 'center',
    gap: Spacing.sm, borderRadius: Radius.xl, marginTop: Spacing.md,
  },
  emptyOrb: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(212,168,67,0.10)',
    borderWidth: 1, borderColor: 'rgba(212,168,67,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyOrbHeart: { fontSize: 26, color: Colors.accent },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21 },

  card: { borderRadius: Radius.xl, padding: Spacing.lg },
  quoteDecor: {
    fontSize: 48, lineHeight: 38,
    color: 'rgba(212,168,67,0.45)',
    fontFamily: 'Georgia', marginBottom: -Spacing.xs,
  },
  affirmText: {
    fontSize: 17, fontWeight: '400', lineHeight: 27,
    color: Colors.textPrimary, fontStyle: 'italic', marginBottom: Spacing.sm,
  },
  savedDate: { fontSize: 11, color: Colors.textMuted, marginBottom: Spacing.md, letterSpacing: 0.2 },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: Spacing.sm,
  },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs },
  actionDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  actionText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  removeText: { color: Colors.error },
});
