import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from 'expo-router';
import { useGames } from '../../src/hooks/useGames';
import { GameCard } from '../../src/components/GameCard';
import { COLORS } from '../../src/utils/colors';
import { Game, GameStatus, STATUS_CONFIG } from '../../src/types';

const FILTER_TABS: { key: GameStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'playing', label: 'Playing' },
  { key: 'up_next', label: 'Up Next' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
  { key: 'abandoned', label: 'Abandoned' },
  { key: 'not_started', label: 'Not Started' },
];

export default function LibraryScreen() {
  const { games, refresh, setStatus, search } = useGames();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<GameStatus | 'all'>('all');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const filtered: Game[] = (() => {
    let list = query.trim() ? search(query) : games;
    if (filter !== 'all') list = list.filter((g) => g.status === filter);
    return list;
  })();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0d0d24', '#0a0a14']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>{filtered.length} games</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.glass }]} />
        <Ionicons name="search" size={17} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search games…"
          placeholderTextColor={COLORS.textMuted}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <FlatList
        horizontal
        data={FILTER_TABS}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabList}
        renderItem={({ item }) => {
          const active = filter === item.key;
          const color =
            item.key === 'all'
              ? COLORS.accent
              : STATUS_CONFIG[item.key as GameStatus]?.color ?? COLORS.accent;

          return (
            <TouchableOpacity
              onPress={() => setFilter(item.key)}
              style={[
                styles.tab,
                active && {
                  backgroundColor: color + '22',
                  borderColor: color + '55',
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? color : COLORS.textMuted },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Game list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <GameCard game={item} onStatusChange={setStatus} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="game-controller-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No games found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  searchWrap: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  tabList: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
});
