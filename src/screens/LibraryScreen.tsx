import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
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
import { priorityWeight } from '../../src/utils/formatters';

const FILTER_TABS: { key: GameStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'playing', label: 'Playing' },
  { key: 'up_next', label: 'Up Next' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Completed' },
  { key: 'abandoned', label: 'Abandoned' },
  { key: 'not_started', label: 'Not Started' },
];

type SortMode =
  | 'priority_high'
  | 'priority_low'
  | 'hltb_met'
  | 'shortest'
  | 'longest'
  | 'recently_played'
  | 'least_recently_played'
  | 'alphabetical_asc'
  | 'alphabetical_desc';
type ShortMode = 'all' | 'under_5' | 'under_10';

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'priority_high', label: 'High priority' },
  { key: 'priority_low', label: 'Low priority' },
  { key: 'hltb_met', label: 'HLTB met' },
  { key: 'shortest', label: 'Shortest' },
  { key: 'longest', label: 'Longest' },
  { key: 'recently_played', label: 'Recently played' },
  { key: 'least_recently_played', label: 'Oldest played' },
  { key: 'alphabetical_asc', label: 'A-Z' },
  { key: 'alphabetical_desc', label: 'Z-A' },
];

const SHORT_OPTIONS: { key: ShortMode; label: string }[] = [
  { key: 'all', label: 'All lengths' },
  { key: 'under_5', label: 'Under 5h' },
  { key: 'under_10', label: 'Under 10h' },
];

export default function LibraryScreen() {
  const { games, refresh, setStatus, search } = useGames();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<GameStatus | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('priority_high');
  const [shortMode, setShortMode] = useState<ShortMode>('all');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const filtered: Game[] = (() => {
    let list = query.trim() ? search(query) : games;
    if (filter !== 'all') list = list.filter((g) => g.status === filter);

    if (shortMode !== 'all') {
      const maxSeconds = shortMode === 'under_5' ? 5 * 3600 : 10 * 3600;
      list = list.filter((g) => g.hltb_main_story !== null && g.hltb_main_story <= maxSeconds);
    }

    return [...list].sort((a, b) => compareGames(a, b, sortMode));
  })();

  const renderFilters = () => (
    <View style={styles.filterBlock}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabList}
        style={styles.tabScroller}
      >
        {FILTER_TABS.map((item) => {
          const active = filter === item.key;
          const color =
            item.key === 'all'
              ? COLORS.accent
              : STATUS_CONFIG[item.key as GameStatus]?.color ?? COLORS.accent;

          return (
            <TouchableOpacity
              key={item.key}
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
                  { color: active ? color : COLORS.textSecondary },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.controlSection}>
        <Text style={styles.controlTitle}>Sort backlog</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlList}>
          {SORT_OPTIONS.map((item) => {
            const active = sortMode === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setSortMode(item.key)}
                style={[styles.controlChip, active && styles.controlChipActive]}
                activeOpacity={0.75}
              >
                <Text style={[styles.controlChipText, active && styles.controlChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.controlSection}>
        <Text style={styles.controlTitle}>Short games mode</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controlList}>
          {SHORT_OPTIONS.map((item) => {
            const active = shortMode === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setShortMode(item.key)}
                style={[styles.controlChip, active && styles.shortChipActive]}
                activeOpacity={0.75}
              >
                <Text style={[styles.controlChipText, active && styles.controlChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

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

      {/* Game list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderFilters}
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

function compareGames(a: Game, b: Game, sortMode: SortMode): number {
  switch (sortMode) {
    case 'alphabetical_asc':
      return a.title.localeCompare(b.title);
    case 'alphabetical_desc':
      return b.title.localeCompare(a.title);
    case 'shortest': {
      const aDuration = a.hltb_main_story ?? Number.MAX_SAFE_INTEGER;
      const bDuration = b.hltb_main_story ?? Number.MAX_SAFE_INTEGER;
      if (aDuration !== bDuration) return aDuration - bDuration;
      return a.title.localeCompare(b.title);
    }
    case 'longest': {
      const aDuration = a.hltb_main_story ?? -1;
      const bDuration = b.hltb_main_story ?? -1;
      if (aDuration !== bDuration) return bDuration - aDuration;
      return a.title.localeCompare(b.title);
    }
    case 'recently_played': {
      const aTime = a.last_played ? new Date(a.last_played).getTime() : 0;
      const bTime = b.last_played ? new Date(b.last_played).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.title.localeCompare(b.title);
    }
    case 'least_recently_played': {
      const aTime = a.last_played ? new Date(a.last_played).getTime() : 0;
      const bTime = b.last_played ? new Date(b.last_played).getTime() : 0;
      if (aTime !== bTime) return aTime - bTime;
      return a.title.localeCompare(b.title);
    }
    case 'hltb_met': {
      const aMet = a.hltb_main_story !== null && a.playtime_minutes * 60 >= a.hltb_main_story ? 1 : 0;
      const bMet = b.hltb_main_story !== null && b.playtime_minutes * 60 >= b.hltb_main_story ? 1 : 0;
      if (aMet !== bMet) return bMet - aMet;
      const aRemaining = a.hltb_main_story !== null ? Math.max(0, a.hltb_main_story - a.playtime_minutes * 60) : Number.MAX_SAFE_INTEGER;
      const bRemaining = b.hltb_main_story !== null ? Math.max(0, b.hltb_main_story - b.playtime_minutes * 60) : Number.MAX_SAFE_INTEGER;
      if (aRemaining !== bRemaining) return aRemaining - bRemaining;
      return a.title.localeCompare(b.title);
    }
    case 'priority_low': {
      const priorityDelta = priorityWeight(a.priority) - priorityWeight(b.priority);
      if (priorityDelta !== 0) return priorityDelta;
      return a.title.localeCompare(b.title);
    }
    case 'priority_high':
    default: {
      const priorityDelta = priorityWeight(b.priority) - priorityWeight(a.priority);
      if (priorityDelta !== 0) return priorityDelta;
      const durationDelta = (a.hltb_main_story ?? Number.MAX_SAFE_INTEGER) - (b.hltb_main_story ?? Number.MAX_SAFE_INTEGER);
      if (durationDelta !== 0) return durationDelta;
      return a.title.localeCompare(b.title);
    }
  }
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
    paddingRight: 28,
    marginBottom: 12,
  },
  tabScroller: {
    maxHeight: 54,
  },
  filterBlock: {
    marginBottom: 10,
  },
  tab: {
    minWidth: 92,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  controlSection: {
    marginBottom: 12,
  },
  controlTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  controlList: {
    paddingHorizontal: 20,
    gap: 8,
    paddingRight: 28,
  },
  controlChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlChipActive: {
    backgroundColor: COLORS.accent + '18',
    borderColor: COLORS.accent + '55',
  },
  shortChipActive: {
    backgroundColor: COLORS.cyan + '12',
    borderColor: COLORS.cyan + '55',
  },
  controlChipText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  controlChipTextActive: {
    color: COLORS.textPrimary,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 4,
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
