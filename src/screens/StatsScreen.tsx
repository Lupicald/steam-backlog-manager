import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useGames } from '../../src/hooks/useGames';
import { StatCard } from '../../src/components/StatCard';
import { GlassCard } from '../../src/components/GlassCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { COLORS } from '../../src/utils/colors';
import { formatBacklogHours } from '../../src/utils/formatters';

const DAILY_PLAY_SCENARIOS = [1, 2, 3];

export default function StatsScreen() {
  const { stats, refresh } = useGames();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const completionRate =
    stats && stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

  const backlogRate =
    stats && stats.total > 0
      ? Math.round(((stats.total - stats.completed) / stats.total) * 100)
      : 0;

  const statusBreakdown = stats
    ? [
        { label: 'Playing', value: stats.playing, color: COLORS.green },
        { label: 'Up Next', value: stats.up_next, color: COLORS.blue },
        { label: 'Paused', value: stats.paused, color: COLORS.yellow },
        { label: 'Completed', value: stats.completed, color: COLORS.purple },
        { label: 'Abandoned', value: stats.abandoned, color: COLORS.red },
        { label: 'Not Started', value: stats.not_started, color: COLORS.textMuted },
      ]
    : [];

  const realisticBacklog = stats
    ? DAILY_PLAY_SCENARIOS.map((hoursPerDay) => ({
        hoursPerDay,
        label: formatBacklogDuration(stats.total_hours_remaining, hoursPerDay),
      }))
    : [];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0a001a', '#0a0a14']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Statistics</Text>
          <Text style={styles.subtitle}>Your backlog at a glance</Text>
        </View>

        {/* Big stats */}
        {stats && (
          <>
            {/* Backlog countdown */}
            <GlassCard style={styles.countdown} padding={20}>
              <LinearGradient
                colors={[COLORS.accent + '25', COLORS.cyan + '10']}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="hourglass" size={28} color={COLORS.cyan} />
              <Text style={styles.countdownHours}>
                {formatBacklogHours(stats.total_hours_remaining)}
              </Text>
              <Text style={styles.countdownLabel}>estimated to finish your backlog</Text>
            </GlassCard>

            <View style={styles.section}>
              <SectionHeader
                title="Realistic Pace"
                icon="calendar"
                iconColor={COLORS.cyan}
              />
              <GlassCard padding={16}>
                {realisticBacklog.map((item) => (
                  <View key={item.hoursPerDay} style={styles.realisticRow}>
                    <Text style={styles.realisticLabel}>At {item.hoursPerDay}h/day</Text>
                    <Text style={styles.realisticValue}>{item.label}</Text>
                  </View>
                ))}
              </GlassCard>
            </View>

            {/* Four stat cards */}
            <View style={styles.row}>
              <StatCard
                label="Total Games"
                value={stats.total}
                icon="library"
                color={COLORS.accent}
              />
              <StatCard
                label="Playtime"
                value={`${stats.total_playtime_hours}h`}
                icon="game-controller"
                color={COLORS.teal}
              />
            </View>
            <View style={[styles.row, { marginTop: 10 }]}>
              <StatCard
                label="Completed"
                value={`${completionRate}%`}
                icon="checkmark-circle"
                color={COLORS.purple}
                subtitle={`${stats.completed} of ${stats.total}`}
              />
              <StatCard
                label="Backlog"
                value={`${backlogRate}%`}
                icon="archive"
                color={COLORS.rose}
                subtitle={`${stats.total - stats.completed} remaining`}
              />
            </View>

            <View style={styles.section}>
              <SectionHeader
                title="HLTB Progress"
                icon="checkmark-done-circle"
                iconColor={COLORS.green}
              />
              <GlassCard padding={16}>
                <View style={styles.realisticRow}>
                  <Text style={styles.realisticLabel}>HLTB target met</Text>
                  <Text style={styles.realisticValue}>{stats.hltb_target_met} games</Text>
                </View>
                <View style={styles.realisticRow}>
                  <Text style={styles.realisticLabel}>Ready to finish now</Text>
                  <Text style={styles.realisticValue}>{stats.hltb_ready_to_finish} games</Text>
                </View>
                <View style={styles.realisticRow}>
                  <Text style={styles.realisticLabel}>Excluded from calculator</Text>
                  <Text style={styles.realisticValue}>{stats.excluded_from_backlog} games</Text>
                </View>
              </GlassCard>
            </View>

            {/* Status breakdown */}
            <View style={styles.section}>
              <SectionHeader
                title="By Status"
                icon="pie-chart"
                iconColor={COLORS.accent}
              />
              <GlassCard padding={16}>
                {statusBreakdown.map((item) => (
                  <View key={item.label} style={styles.breakdownRow}>
                    <View style={[styles.dot, { backgroundColor: item.color }]} />
                    <Text style={styles.breakdownLabel}>{item.label}</Text>
                    <View style={styles.breakdownBarWrap}>
                      <View
                        style={[
                          styles.breakdownBar,
                          {
                            width: stats.total > 0
                              ? `${Math.round((item.value / stats.total) * 100)}%` as any
                              : '0%',
                            backgroundColor: item.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.breakdownValue, { color: item.color }]}>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </GlassCard>
            </View>
          </>
        )}

        {!stats && (
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No data yet</Text>
            <Text style={styles.emptySubText}>
              Import your Steam library to see statistics.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function formatBacklogDuration(totalHours: number, hoursPerDay: number): string {
  if (totalHours <= 0 || hoursPerDay <= 0) {
    return 'Done';
  }

  const totalDays = totalHours / hoursPerDay;
  const years = totalDays / 365;

  if (years >= 1) {
    const roundedYears = Math.round(years * 10) / 10;
    return `${roundedYears} years`;
  }

  const months = totalDays / 30;
  if (months >= 1) {
    const roundedMonths = Math.round(months * 10) / 10;
    return `${roundedMonths} months`;
  }

  return `${Math.ceil(totalDays)} days`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingTop: 60, paddingHorizontal: 20 },
  header: { marginBottom: 24 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  countdown: {
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    gap: 8,
  },
  countdownHours: {
    color: COLORS.textPrimary,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
  },
  countdownLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', gap: 10 },
  section: { marginTop: 24 },
  realisticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  realisticLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  realisticValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    width: 90,
  },
  breakdownBarWrap: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.glassMedium,
    borderRadius: 99,
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    borderRadius: 99,
    minWidth: 4,
    opacity: 0.8,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  emptySubText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
