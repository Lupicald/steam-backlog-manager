import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useGames } from '../../src/hooks/useGames';
import { GameCover } from '../../src/components/GameCover';
import { StatusBadge } from '../../src/components/StatusBadge';
import { PriorityBadge } from '../../src/components/PriorityBadge';
import { GlassCard } from '../../src/components/GlassCard';
import { enrichGameWithHLTB } from '../../src/services/howLongToBeatService';
import {
  formatMinutes,
  formatHLTBTime,
  formatLastPlayed,
} from '../../src/utils/formatters';
import { COLORS } from '../../src/utils/colors';
import { Game, GameStatus, GamePriority, STATUS_CONFIG, PRIORITY_CONFIG } from '../../src/types';

const { width } = Dimensions.get('window');
const COVER_HEIGHT = width * 0.52;

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getById, setStatus, setPriority, setProgress, setNotes, remove, refresh } =
    useGames();

  const [game, setGame] = useState<Game | null>(null);
  const [notes, setNotesLocal] = useState('');
  const [fetching, setFetching] = useState(false);

  const load = useCallback(() => {
    const g = getById(Number(id));
    setGame(g);
    setNotesLocal(g?.notes ?? '');
  }, [id, getById]);

  useEffect(() => {
    refresh();
    load();
  }, [load]);

  const handleStatusChange = (status: GameStatus) => {
    if (!game) return;
    setStatus(game.id, status);
    setGame((g) => (g ? { ...g, status } : g));
  };

  const handlePriorityChange = (priority: GamePriority) => {
    if (!game) return;
    setPriority(game.id, priority);
    setGame((g) => (g ? { ...g, priority } : g));
  };

  const handleProgressChange = (value: number) => {
    if (!game) return;
    const pct = Math.round(value);
    setProgress(game.id, pct);
    setGame((g) => (g ? { ...g, progress_percentage: pct } : g));
  };

  const handleSaveNotes = () => {
    if (!game) return;
    setNotes(game.id, notes);
  };

  const handleFetchHLTB = async () => {
    if (!game) return;
    setFetching(true);
    const ok = await enrichGameWithHLTB(game.id);
    setFetching(false);
    refresh();
    load();
    if (!ok) Alert.alert('Not found', 'Could not find this game on HowLongToBeat.');
  };

  const handleDelete = () => {
    Alert.alert('Remove Game', 'Remove this game from your backlog?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (game) remove(game.id);
          router.back();
        },
      },
    ]);
  };

  if (!game) {
    return (
      <View style={styles.root}>
        <Text style={{ color: COLORS.textMuted, padding: 20 }}>Game not found.</Text>
      </View>
    );
  }

  const statusConfig = STATUS_CONFIG[game.status];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover hero */}
        <View style={styles.heroWrap}>
          <GameCover
            uri={game.cover_url}
            width={width}
            height={COVER_HEIGHT}
            radius={0}
          />
          <LinearGradient
            colors={['transparent', COLORS.bg]}
            style={styles.heroFade}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          {/* Delete button */}
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="trash-outline" size={18} color={COLORS.red} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Title + badges */}
          <Text style={styles.title}>{game.title}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge status={game.status} />
            <PriorityBadge priority={game.priority} />
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="game-controller-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{formatMinutes(game.playtime_minutes)} played</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{formatLastPlayed(game.last_played ? new Date(game.last_played).getTime() / 1000 : null)}</Text>
            </View>
          </View>

          {/* HLTB card */}
          <GlassCard style={styles.card} padding={16}>
            <View style={styles.cardHeader}>
              <Ionicons name="hourglass-outline" size={16} color={COLORS.cyan} />
              <Text style={styles.cardTitle}>HowLongToBeat</Text>
              <TouchableOpacity
                onPress={handleFetchHLTB}
                disabled={fetching}
                style={styles.refreshBtn}
              >
                <Ionicons
                  name={fetching ? 'sync' : 'refresh'}
                  size={15}
                  color={COLORS.accent}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.hltbRow}>
              <HLTBStat label="Main Story" value={formatHLTBTime(game.hltb_main_story)} color={COLORS.blue} />
              <HLTBStat label="Extra" value={formatHLTBTime(game.hltb_extra)} color={COLORS.teal} />
              <HLTBStat label="Completionist" value={formatHLTBTime(game.hltb_completionist)} color={COLORS.violet} />
            </View>
          </GlassCard>

          {/* Progress */}
          <GlassCard style={styles.card} padding={16}>
            <View style={styles.cardHeader}>
              <Ionicons name="bar-chart-outline" size={16} color={COLORS.green} />
              <Text style={styles.cardTitle}>Progress</Text>
              <Text style={styles.progressPct}>{game.progress_percentage}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${game.progress_percentage}%` as any,
                    backgroundColor: statusConfig.color,
                  },
                ]}
              />
            </View>
            <Slider
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={game.progress_percentage}
              onSlidingComplete={handleProgressChange}
              minimumTrackTintColor={COLORS.accent}
              maximumTrackTintColor={COLORS.glassBorder}
              thumbTintColor={COLORS.accent}
              style={{ marginTop: 8 }}
            />
          </GlassCard>

          {/* Status selector */}
          <GlassCard style={styles.card} padding={16}>
            <View style={styles.cardHeader}>
              <Ionicons name="layers-outline" size={16} color={COLORS.yellow} />
              <Text style={styles.cardTitle}>Status</Text>
            </View>
            <View style={styles.selectorGrid}>
              {(Object.keys(STATUS_CONFIG) as GameStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const active = game.status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => handleStatusChange(s)}
                    style={[
                      styles.selectorBtn,
                      { borderColor: active ? cfg.color : COLORS.glassBorder },
                      active && { backgroundColor: cfg.color + '22' },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={cfg.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={active ? cfg.color : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        styles.selectorLabel,
                        { color: active ? cfg.color : COLORS.textMuted },
                      ]}
                    >
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>

          {/* Priority selector */}
          <GlassCard style={styles.card} padding={16}>
            <View style={styles.cardHeader}>
              <Ionicons name="flag-outline" size={16} color={COLORS.orange} />
              <Text style={styles.cardTitle}>Priority</Text>
            </View>
            <View style={styles.priorityRow}>
              {(Object.keys(PRIORITY_CONFIG) as GamePriority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                const active = game.priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => handlePriorityChange(p)}
                    style={[
                      styles.priorityBtn,
                      { borderColor: active ? cfg.color : COLORS.glassBorder },
                      active && { backgroundColor: cfg.color + '22' },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={cfg.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={active ? cfg.color : COLORS.textMuted}
                    />
                    <Text
                      style={[
                        styles.selectorLabel,
                        { color: active ? cfg.color : COLORS.textMuted },
                      ]}
                    >
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>

          {/* Notes */}
          <GlassCard style={styles.card} padding={16}>
            <View style={styles.cardHeader}>
              <Ionicons name="create-outline" size={16} color={COLORS.violet} />
              <Text style={styles.cardTitle}>Notes</Text>
              <TouchableOpacity onPress={handleSaveNotes} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotesLocal}
              multiline
              numberOfLines={4}
              placeholder="Add notes, thoughts, or reminders…"
              placeholderTextColor={COLORS.textMuted}
            />
          </GlassCard>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}

function HLTBStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.hltbStat}>
      <Text style={[styles.hltbValue, { color }]}>{value}</Text>
      <Text style={styles.hltbLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  heroWrap: { position: 'relative' },
  heroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: COLORS.textMuted, fontSize: 12 },
  card: { marginBottom: 14 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  refreshBtn: { padding: 4 },
  hltbRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  hltbStat: { alignItems: 'center', gap: 4 },
  hltbValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  hltbLabel: { color: COLORS.textMuted, fontSize: 11 },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.glassMedium,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  progressPct: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
  selectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectorLabel: { fontSize: 12, fontWeight: '600' },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  notesInput: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: COLORS.accent + '22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  saveBtnText: { color: COLORS.accent, fontSize: 12, fontWeight: '700' },
});
