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
import { StatCard } from '../../src/components/StatCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { PickNextGameModal } from '../../src/components/PickNextGameModal';
import { COLORS } from '../../src/utils/colors';
import { formatBacklogHours } from '../../src/utils/formatters';


export default function DashboardScreen() {
  const { games, stats, refresh, setStatus, getByStatus } = useGames();
  const { recommendation, refresh: refreshRec, reroll } = useRecommendation();
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshRec();
    }, [refresh, refreshRec])
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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Hero gradient background */}
      <LinearGradient
        colors={['#1a0a3a', '#0a0a14']}
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
            tintColor={COLORS.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Steam Backlog</Text>
            <Text style={styles.subtitle}>
              {stats
                ? `${stats.total} games · ${formatBacklogHours(stats.total_hours_remaining)} remaining`
                : 'Loading your library…'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.pickBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentAlt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="dice" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Backlog countdown banner */}
        {stats && stats.total_hours_remaining > 0 && (
          <View style={styles.banner}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={[COLORS.accent + '22', COLORS.cyan + '10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="hourglass-outline" size={20} color={COLORS.cyan} />
            <Text style={styles.bannerText}>
              Your backlog will take{' '}
              <Text style={{ color: COLORS.cyan, fontWeight: '800' }}>
                {formatBacklogHours(stats.total_hours_remaining)}
              </Text>{' '}
              to finish
            </Text>
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
                color={COLORS.accent}
              />
              <StatCard
                label="Playing"
                value={stats.playing}
                icon="play-circle"
                color={COLORS.green}
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                label="Up Next"
                value={stats.up_next}
                icon="bookmark"
                color={COLORS.blue}
              />
              <StatCard
                label="HLTB Met"
                value={stats.hltb_target_met}
                icon="checkmark-done-circle"
                color={COLORS.cyan}
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
              iconColor={COLORS.green}
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
              iconColor={COLORS.blue}
              count={upNext.length}
              action={{
                label: 'See all',
                onPress: () => {},
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
              iconColor={COLORS.yellow}
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
            <Ionicons name="cloud-download-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No games yet</Text>
            <Text style={styles.emptyText}>
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
    backgroundColor: COLORS.bg,
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
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: COLORS.textMuted,
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
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    marginBottom: 20,
  },
  bannerText: {
    color: COLORS.textSecondary,
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
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
