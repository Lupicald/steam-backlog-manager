import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Game, GameStatus, STATUS_CONFIG } from '../types';
import { GameCover } from './GameCover';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import {
  formatMinutes,
  formatHLTBTime,
  formatRemainingTime,
  getRemainingMinutes,
  truncate,
} from '../utils/formatters';
import { COLORS } from '../utils/colors';

interface GameCardProps {
  game: Game;
  onStatusChange?: (id: number, status: GameStatus) => void;
  compact?: boolean;
}

const STATUS_CYCLE: GameStatus[] = [
  'not_started',
  'up_next',
  'playing',
  'paused',
  'completed',
  'abandoned',
];

export function GameCard({ game, onStatusChange, compact = false }: GameCardProps) {
  const router = useRouter();
  const statusConfig = STATUS_CONFIG[game.status];

  const cycleStatus = useCallback(() => {
    const current = STATUS_CYCLE.indexOf(game.status);
    const next = STATUS_CYCLE[(current + 1) % STATUS_CYCLE.length];
    onStatusChange?.(game.id, next);
  }, [game.id, game.status, onStatusChange]);

  const openDetail = () => router.push(`/game/${game.id}`);

  const progressWidth = `${Math.min(100, game.progress_percentage)}%`;
  const remainingMinutes = getRemainingMinutes(game.hltb_main_story, game.playtime_minutes);

  if (compact) {
    return (
      <TouchableOpacity onPress={openDetail} activeOpacity={0.8} style={styles.compactWrapper}>
        <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.glass }]} />
        <GameCover uri={game.cover_url} width={90} height={50} radius={10} />
        <View style={styles.compactInfo}>
          <Text style={styles.compactTitle} numberOfLines={1}>
            {truncate(game.title, 28)}
          </Text>
          <StatusBadge status={game.status} size="sm" />
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={openDetail} activeOpacity={0.82} style={styles.wrapper}>
      {/* Glass background */}
      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[statusConfig.color + '18', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.glass }]} />

      {/* Content row */}
      <View style={styles.row}>
        {/* Cover */}
        <GameCover uri={game.cover_url} width={112} height={62} radius={12} />

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {game.title}
          </Text>

          <View style={styles.badges}>
            <StatusBadge status={game.status} size="sm" />
            <PriorityBadge priority={game.priority} size="sm" />
          </View>

          <View style={styles.meta}>
            {game.hltb_main_story ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
                <Text style={styles.metaText}>
                  {formatHLTBTime(game.hltb_main_story)}
                </Text>
              </View>
            ) : null}
            {game.playtime_minutes > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="game-controller-outline" size={11} color={COLORS.textMuted} />
                <Text style={styles.metaText}>
                  {formatMinutes(game.playtime_minutes)} played
                </Text>
              </View>
            ) : null}
            {remainingMinutes !== null ? (
              <View style={styles.metaItem}>
                <Ionicons name="hourglass-outline" size={11} color={COLORS.cyan} />
                <Text style={[styles.metaText, styles.remainingText]}>
                  {formatRemainingTime(game.hltb_main_story, game.playtime_minutes)} left
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Quick action */}
        <TouchableOpacity
          onPress={cycleStatus}
          style={styles.statusBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View
            style={[styles.statusDot, { backgroundColor: statusConfig.color + '33' }]}
          >
            <Ionicons
              name={statusConfig.icon as keyof typeof Ionicons.glyphMap}
              size={16}
              color={statusConfig.color}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      {game.progress_percentage > 0 && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: progressWidth as any, backgroundColor: statusConfig.color },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    gap: 12,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 19,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  remainingText: {
    color: COLORS.cyan,
  },
  statusBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statusDot: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.glassMedium,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    opacity: 0.8,
  },
  // Compact variant
  compactWrapper: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
    marginBottom: 8,
  },
  compactInfo: {
    flex: 1,
    gap: 4,
  },
  compactTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
});
