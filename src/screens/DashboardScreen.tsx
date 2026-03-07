import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useGames } from '../../src/hooks/useGames';
import { useRecommendation } from '../../src/hooks/useRecommendation';
import { GameCard } from '../../src/components/GameCard';
import { GameCover } from '../../src/components/GameCover';
import { StatCard } from '../../src/components/StatCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { PickNextGameModal } from '../../src/components/PickNextGameModal';
import { GlassCard } from '../../src/components/GlassCard';
import { formatBacklogHours } from '../../src/utils/formatters';
import { useAppContext } from '../../src/hooks/useAppContext';
import { getTopRecommendations } from '../../src/services/recommendationService';
import { useRouter } from 'expo-router';


export default function DashboardScreen() {
  const router = useRouter();
  const { games, stats, refresh, setStatus, getByStatus } = useGames();
  const { recommendation, refresh: refreshRec, reroll } = useRecommendation();
  const { themeColors, isPremium } = useAppContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [topRecs, setTopRecs] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshRec();
      if (isPremium) {
        setTopRecs(getTopRecommendations());
      }
    }, [refresh, refreshRec, isPremium])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  };

  const playing = getByStatus('playing');
  const upNext = getByStatus('up_next');
  const paused = getByStatus('paused');

  return (
    <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Hero gradient background */}
      <LinearGradient
        colors={[themeColors.bg, themeColors.card]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 0.5 }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: themeColors.textPrimary }]}>Steam Backlog</Text>
            <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
              {stats
                ? `${stats.total} games · ${formatBacklogHours(stats.total_hours_remaining)} remaining`
                : 'Loading your library…'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={styles.pickBtn}
              onPress={() => router.push('/share' as any)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[themeColors.teal, themeColors.blue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="share-social" size={18} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickBtn}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[themeColors.accent, themeColors.violet]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="dice" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Backlog countdown banner */}
        {stats && stats.total_hours_remaining > 0 && (
          <View style={[styles.banner, { borderColor: themeColors.glassBorder }]}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={[themeColors.accent + '22', themeColors.orange + '10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="hourglass-outline" size={20} color={themeColors.orange} />
            <Text style={[styles.bannerText, { color: themeColors.textSecondary }]}>
              Your backlog will take{' '}
              <Text style={{ color: themeColors.orange, fontWeight: '800' }}>
                {formatBacklogHours(stats.total_hours_remaining)}
              </Text>{' '}
              to finish
            </Text>
          </View>
        )}

        {/* --- Premium Widget Top Row --- */}
        {isPremium && topRecs.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="AI Recommended Next" icon="sparkles" iconColor={themeColors.orange} />
            <TouchableOpacity onPress={() => router.push(`/game/${topRecs[0].game.id}`)} activeOpacity={0.8} style={{ position: 'relative', marginTop: 12 }}>
              <View style={[styles.premiumBadgeRow, { backgroundColor: themeColors.accent, zIndex: 10 }]}>
                <Text style={styles.premiumBadgeText}>Match {topRecs[0].score}%</Text>
              </View>
              <GlassCard padding={16} radius={16} borderColor={themeColors.accent} intensity={30}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <GameCover uri={topRecs[0].game.cover_url} width={80} height={110} radius={12} />
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={[styles.recTitle, { color: themeColors.textPrimary }]} numberOfLines={2}>
                      {topRecs[0].game.title}
                    </Text>
                    <Text style={[styles.recReason, { color: themeColors.textSecondary }]}>
                      {topRecs[0].reason}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard
                label="Total Games"
                value={stats.total}
                icon="library"
                color={themeColors.accent}
              />
              <StatCard
                label="Playing"
                value={stats.playing}
                icon="play-circle"
                color={themeColors.green}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                label="Up Next"
                value={stats.up_next}
                icon="bookmark"
                color={themeColors.blue}
              />
              <StatCard
                label="HLTB Met"
                value={stats.hltb_target_met}
                icon="checkmark-done-circle"
                color={themeColors.orange}
                subtitle={`${stats.completed} completed`}
              />
            </View>
          </View>
        )}

        {/* Currently Playing */}
        {playing.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Currently Playing"
              icon="play-circle"
              iconColor={themeColors.green}
              count={playing.length}
            />
            {playing.map((g) => (
              <GameCard
                key={g.id}
                game={g}
                onStatusChange={setStatus}
              />
            ))}
          </View>
        )}

        {/* Up Next */}
        {upNext.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Up Next"
              icon="bookmark"
              iconColor={themeColors.blue}
              count={upNext.length}
              action={{
                label: 'See all',
                onPress: () => { },
              }}
            />
            {upNext.slice(0, 5).map((g) => (
              <GameCard
                key={g.id}
                game={g}
                onStatusChange={setStatus}
              />
            ))}
          </View>
        )}

        {/* Paused */}
        {paused.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title="Paused"
              icon="pause-circle"
              iconColor={themeColors.violet}
              count={paused.length}
            />
            {paused.slice(0, 3).map((g) => (
              <GameCard key={g.id} game={g} onStatusChange={setStatus} compact />
            ))}
          </View>
        )}

        {/* Empty state */}
        {games.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="cloud-download-outline" size={56} color={themeColors.textMuted} />
            <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No games yet</Text>
            <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
              Go to Settings and import your Steam library to get started.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <PickNextGameModal
        visible={modalVisible}
        recommendation={recommendation}
        onReroll={reroll}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 3,
  },
  pickBtn: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    marginBottom: 20,
  },
  bannerText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  statsGrid: {
    gap: 10,
    marginBottom: 28,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  section: {
    marginBottom: 28,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  premiumBadgeRow: {
    position: 'absolute',
    top: -10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    elevation: 5,
  },
  premiumBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  recTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  recReason: { fontSize: 12, lineHeight: 18 },
});
