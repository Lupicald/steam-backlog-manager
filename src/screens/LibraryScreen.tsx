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
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useGames } from '../../src/hooks/useGames';
import { GameCard } from '../../src/components/GameCard';
import { useAppContext } from '../../src/hooks/useAppContext';
import { Game, GameStatus, Platform as GamePlatform } from '../../src/types';
import { priorityWeight } from '../../src/utils/formatters';
import { ManualGameModal } from '../components/ManualGameModal';
import { t, Language } from '../../src/i18n';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type PlatformMode = 'all' | GamePlatform;

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

function getFilterTabs(lang: Language): { key: GameStatus | 'all'; label: string }[] {
  return [
    { key: 'all', label: t('lib_tab_all', lang) },
    { key: 'playing', label: t('lib_tab_playing', lang) },
    { key: 'up_next', label: t('lib_tab_up_next', lang) },
    { key: 'paused', label: t('lib_tab_paused', lang) },
    { key: 'completed', label: t('lib_tab_completed', lang) },
    { key: 'abandoned', label: t('lib_tab_abandoned', lang) },
    { key: 'not_started', label: t('lib_tab_not_started', lang) },
  ];
}

function getSortOptions(lang: Language): { key: SortMode; label: string }[] {
  return [
    { key: 'priority_high', label: t('sort_priority_high', lang) },
    { key: 'priority_low', label: t('sort_priority_low', lang) },
    { key: 'hltb_met', label: t('sort_hltb', lang) },
    { key: 'shortest', label: t('sort_shortest', lang) },
    { key: 'longest', label: t('sort_longest', lang) },
    { key: 'recently_played', label: t('sort_recent', lang) },
    { key: 'least_recently_played', label: t('sort_oldest', lang) },
    { key: 'alphabetical_asc', label: t('sort_az', lang) },
    { key: 'alphabetical_desc', label: t('sort_za', lang) },
  ];
}

function getShortOptions(lang: Language): { key: ShortMode; label: string }[] {
  return [
    { key: 'all', label: t('lib_short_all', lang) },
    { key: 'under_5', label: t('lib_short_5', lang) },
    { key: 'under_10', label: t('lib_short_10', lang) },
  ];
}

function getPlatformOptions(lang: Language): { key: PlatformMode; label: string }[] {
  return [
    { key: 'all', label: t('lib_all', lang) },
    { key: 'steam', label: 'Steam' },
    { key: 'gog', label: 'GOG' },
    { key: 'epic', label: 'Epic' },
    { key: 'playstation', label: 'PlayStation' },
    { key: 'xbox', label: 'Xbox' },
    { key: 'nintendo', label: 'Nintendo' },
    { key: 'other', label: 'Other' },
  ];
}

export default function LibraryScreen() {
  const { themeColors, language } = useAppContext();
  const { games, refresh, search, setStatus } = useGames();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<GameStatus | 'all'>('all');
  const [platformMode, setPlatformMode] = useState<PlatformMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('priority_high');
  const [shortMode, setShortMode] = useState<ShortMode>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);

  const FILTER_TABS = getFilterTabs(language);
  const SORT_OPTIONS = getSortOptions(language);
  const SHORT_OPTIONS = getShortOptions(language);
  const PLATFORM_OPTIONS = getPlatformOptions(language);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFiltersOpen((v) => !v);
  };

  const clearFilters = () => {
    setPlatformMode('all');
    setSortMode('priority_high');
    setShortMode('all');
  };

  const hasActiveFilters = platformMode !== 'all' || sortMode !== 'priority_high' || shortMode !== 'all';

  const filtered: Game[] = (() => {
    let list = query.trim() ? search(query) : games;
    if (filter !== 'all') list = list.filter((g) => g.status === filter);
    if (platformMode !== 'all') list = list.filter((g) => g.platform === platformMode);
    if (shortMode !== 'all') {
      const maxSeconds = shortMode === 'under_5' ? 5 * 3600 : 10 * 3600;
      list = list.filter((g) => g.hltb_main_story !== null && g.hltb_main_story <= maxSeconds);
    }
    return [...list].sort((a, b) => compareGames(a, b, sortMode));
  })();

  const activeChips: string[] = [];
  if (platformMode !== 'all') activeChips.push(platformMode.toUpperCase());
  if (sortMode !== 'priority_high') activeChips.push(SORT_OPTIONS.find((s) => s.key === sortMode)?.label ?? sortMode);
  if (shortMode !== 'all') activeChips.push(SHORT_OPTIONS.find((s) => s.key === shortMode)?.label ?? shortMode);

  return (
    <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[themeColors.bg, themeColors.card]} style={StyleSheet.absoluteFill} />

      {/* Fixed header */}
      <View style={styles.headerWrap}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>{t('lib_title', language)}</Text>
            <Text style={[styles.gameCount, { color: themeColors.textMuted }]}>
              {filtered.length} {filtered.length === 1 ? t('lib_game', language) : t('lib_games', language)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: themeColors.accent }]}
            onPress={() => setManualModalOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>{t('lib_add_game', language)}</Text>
          </TouchableOpacity>
        </View>

        {/* Search + Filter toggle row */}
        <View style={styles.searchRow}>
          <View style={[styles.searchWrap, { borderColor: themeColors.glassBorder, backgroundColor: themeColors.glass }]}>
            <Ionicons name="search" size={16} color={themeColors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: themeColors.textPrimary }]}
              placeholder={t('lib_search', language)}
              placeholderTextColor={themeColors.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color={themeColors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.filterToggleBtn,
              {
                borderColor: filtersOpen || hasActiveFilters ? themeColors.accent : themeColors.glassBorder,
                backgroundColor: filtersOpen || hasActiveFilters ? themeColors.accent + '22' : themeColors.glass,
              },
            ]}
            onPress={toggleFilters}
            activeOpacity={0.8}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={filtersOpen || hasActiveFilters ? themeColors.accent : themeColors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Collapsible filter panel */}
        {filtersOpen && (
          <View style={[styles.filterPanel, { backgroundColor: themeColors.card, borderColor: themeColors.glassBorder }]}>
            {/* Platform */}
            <Text style={[styles.filterSectionLabel, { color: themeColors.textMuted }]}>{t('lib_platform', language)}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <View style={styles.chipRow}>
                {PLATFORM_OPTIONS.map((opt) => {
                  const active = platformMode === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.chip, { borderColor: active ? themeColors.accent : themeColors.glassBorder, backgroundColor: active ? themeColors.accent + '22' : 'transparent' }]}
                      onPress={() => setPlatformMode(opt.key)}
                    >
                      <Text style={[styles.chipText, { color: active ? themeColors.accent : themeColors.textSecondary }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Sort */}
            <Text style={[styles.filterSectionLabel, { color: themeColors.textMuted }]}>{t('lib_sort', language)}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <View style={styles.chipRow}>
                {SORT_OPTIONS.map((opt) => {
                  const active = sortMode === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.chip, { borderColor: active ? themeColors.violet : themeColors.glassBorder, backgroundColor: active ? themeColors.violet + '22' : 'transparent' }]}
                      onPress={() => setSortMode(opt.key)}
                    >
                      <Text style={[styles.chipText, { color: active ? themeColors.violet : themeColors.textSecondary }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Duration */}
            <Text style={[styles.filterSectionLabel, { color: themeColors.textMuted }]}>{t('lib_duration', language)}</Text>
            <View style={styles.chipRow}>
              {SHORT_OPTIONS.map((opt) => {
                const active = shortMode === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.chip, { borderColor: active ? themeColors.teal : themeColors.glassBorder, backgroundColor: active ? themeColors.teal + '22' : 'transparent' }]}
                    onPress={() => setShortMode(opt.key)}
                  >
                    <Text style={[styles.chipText, { color: active ? themeColors.teal : themeColors.textSecondary }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <View style={styles.activeChipsRow}>
            {activeChips.map((chip) => (
              <View key={chip} style={[styles.activeChip, { borderColor: themeColors.accent + '55', backgroundColor: themeColors.accent + '14' }]}>
                <Text style={[styles.activeChipText, { color: themeColors.accent }]}>{chip}</Text>
              </View>
            ))}
            <TouchableOpacity onPress={clearFilters} style={[styles.clearBtn, { borderColor: themeColors.glassBorder }]}>
              <Text style={[styles.clearBtnText, { color: themeColors.textMuted }]}>{t('lib_clear', language)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabList}
          style={styles.tabScroller}
        >
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? themeColors.accent : themeColors.glass,
                    borderColor: active ? themeColors.accent : themeColors.glassBorder,
                  },
                ]}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, { color: active ? '#fff' : themeColors.textSecondary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Games list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <GameCard game={item} onStatusChange={setStatus} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="game-controller-outline" size={48} color={themeColors.textMuted} />
            <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>{t('lib_empty_title', language)}</Text>
            <Text style={[styles.emptySubtitle, { color: themeColors.textMuted }]}>
              {query ? t('lib_empty_search', language) : t('lib_empty_add', language)}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
      <ManualGameModal
        visible={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onGameAdded={() => { refresh(); }}
      />
    </View>
  );
}

function compareGames(a: Game, b: Game, mode: SortMode): number {
  switch (mode) {
    case 'priority_high':
      return priorityWeight(b.priority) - priorityWeight(a.priority) || a.title.localeCompare(b.title);
    case 'priority_low':
      return priorityWeight(a.priority) - priorityWeight(b.priority) || a.title.localeCompare(b.title);
    case 'hltb_met': {
      const aPlayedSec = (a.playtime_minutes ?? 0) * 60;
      const bPlayedSec = (b.playtime_minutes ?? 0) * 60;
      const aMet = a.hltb_main_story !== null && aPlayedSec >= a.hltb_main_story ? 1 : 0;
      const bMet = b.hltb_main_story !== null && bPlayedSec >= b.hltb_main_story ? 1 : 0;
      if (bMet !== aMet) return bMet - aMet;
      if (aMet && bMet) return bPlayedSec - aPlayedSec;
      return a.title.localeCompare(b.title);
    }
    case 'shortest':
      return (a.hltb_main_story ?? Infinity) - (b.hltb_main_story ?? Infinity);
    case 'longest':
      return (b.hltb_main_story ?? 0) - (a.hltb_main_story ?? 0);
    case 'recently_played': {
      const da = a.last_played ? new Date(a.last_played).getTime() : 0;
      const db2 = b.last_played ? new Date(b.last_played).getTime() : 0;
      return db2 - da;
    }
    case 'least_recently_played': {
      const da = a.last_played ? new Date(a.last_played).getTime() : Infinity;
      const db2 = b.last_played ? new Date(b.last_played).getTime() : Infinity;
      return da - db2;
    }
    case 'alphabetical_asc':
      return a.title.localeCompare(b.title);
    case 'alphabetical_desc':
      return b.title.localeCompare(a.title);
    default:
      return 0;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  gameCount: { fontSize: 12, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterToggleBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 4,
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 6,
  },
  chipScroll: { marginBottom: 4 },
  chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'nowrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  activeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  activeChipText: { fontSize: 11, fontWeight: '700' },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  clearBtnText: { fontSize: 11, fontWeight: '600' },
  tabScroller: { marginBottom: 4 },
  tabList: { gap: 6, paddingVertical: 4 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: { fontSize: 12, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 18 },
});
