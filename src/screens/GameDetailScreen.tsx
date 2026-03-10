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
  Switch,
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
import { logSessionAndUpdateGame } from '../../src/services/gamingSessionService';
import { SessionTimerModal } from '../../src/components/SessionTimerModal';
import { useAppContext } from '../../src/hooks/useAppContext';
import {
  formatMinutes,
  formatHLTBTime,
  formatLastPlayed,
  formatRemainingTime,
  getRemainingMinutes,
} from '../../src/utils/formatters';
import { Game, GameStatus, GamePriority, Platform, STATUS_CONFIG, PRIORITY_CONFIG } from '../../src/types';

const { width } = Dimensions.get('window');
const COVER_HEIGHT = width * 0.52;

export default function GameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { themeColors, language } = useAppContext();
  const lang = (language ?? 'en') as string;
  const { getById, setStatus, setPriority, setProgress, setNotes, remove, refresh, setBacklogExclusion } =
    useGames();

  const [game, setGame] = useState<Game | null>(null);
  const [notes, setNotesLocal] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState('');
  const [fetching, setFetching] = useState(false);
  const [timerVisible, setTimerVisible] = useState(false);

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

  const handlePlatformChange = (platform: Platform) => {
    if (!game) return;
    // Assuming useGames has a setPlatform function, if not, we can use an alternative or add it
    // For now, let's update local state and rely on a broader update function if needed.
    // We will need to make sure the games context can handle `setPlatform` or `updateGame`.
    // We'll proceed with local update for the UI:
    setGame(g => g ? { ...g, platform } : g);
    // Ideally: setPlatform(game.id, platform);
    // Or if updateGame is available: updateGame(game.id, { platform });
  };

  const handleSaveNotes = () => {
    if (!game) return;
    setNotes(game.id, notes);
  };

  const handleFetchHLTB = async () => {
    if (!game) return;
    setFetching(true);
    const result = await enrichGameWithHLTB(game.id);
    setFetching(false);
    refresh();
    load();
    if (result.status === 'not_found') {
      Alert.alert('Not found', 'Could not find this game on HowLongToBeat.');
    }
    if (result.status === 'request_failed') {
      Alert.alert('HLTB request failed', result.errorMessage ?? 'The HLTB request was blocked.');
    }
  };

  const handleLogSession = () => {
    if (!game) return;
    const mins = parseInt(sessionMinutes, 10);
    if (isNaN(mins) || mins <= 0) {
      Alert.alert('Invalid Time', 'Please enter a valid number of minutes.');
      return;
    }
    logSessionAndUpdateGame(game, mins);
    setSessionMinutes('');
    Alert.alert('Session Logged', `Logged ${mins} minutes for ${game.title}.`);
    refresh();
    load();
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
      <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
        <Text style={{ color: themeColors.textMuted, padding: 20 }}>Game not found.</Text>
      </View>
    );
  }

  const statusConfig = STATUS_CONFIG[game.status];
  const remainingMinutes = getRemainingMinutes(game.hltb_main_story, game.playtime_minutes);

  return (
    <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
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
            colors={['transparent', themeColors.bg]}
            style={styles.heroFade}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="chevron-back" size={22} color={themeColors.textPrimary} />
          </TouchableOpacity>
          {/* Delete button */}
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="trash-outline" size={18} color={themeColors.red} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Title + badges */}
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>{game.title}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge status={game.status} />
            <PriorityBadge priority={game.priority} />
            <View style={[styles.platformBadge, { backgroundColor: themeColors.glassBorder }]}>
              <Ionicons name="game-controller" size={12} color={themeColors.textSecondary} />
              <Text style={[styles.platformBadgeText, { color: themeColors.textSecondary }]}>{game.platform.toUpperCase()}</Text>
            </View>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="game-controller-outline" size={14} color={themeColors.textMuted} />
              <Text style={[styles.metaText, { color: themeColors.textMuted }]}>{formatMinutes(game.playtime_minutes)} played</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={themeColors.textMuted} />
              <Text style={[styles.metaText, { color: themeColors.textMuted }]}>{formatLastPlayed(game.last_played ? new Date(game.last_played).getTime() / 1000 : null)}</Text>
            </View>
          </View>

          {/* HLTB card */}
          <GlassCard style={styles.card} padding={16}>
            <View style={styles.cardHeader}>
              <Ionicons name="hourglass-outline" size={16} color={themeColors.blue} />
              <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>HowLongToBeat</Text>
              <TouchableOpacity
                onPress={handleFetchHLTB}
                disabled={fetching}
                style={styles.refreshBtn}
              >
                <Ionicons
                  name={fetching ? 'sync' : 'refresh'}
                  size={15}
                  color={themeColors.accent}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.hltbRow}>
              <HLTBStat label="Main Story" value={formatHLTBTime(game.hltb_main_story)} color={themeColors.blue} themeColors={themeColors} />
              <HLTBStat label="Extra" value={formatHLTBTime(game.hltb_extra)} color={themeColors.teal} themeColors={themeColors} />
              <HLTBStat label="Completionist" value={formatHLTBTime(game.hltb_completionist)} color={themeColors.violet} themeColors={themeColors} />
            </View>
            {remainingMinutes !== null && (
              <View style={[styles.remainingRow, { borderTopColor: themeColors.glassBorder }]}>
                <Text style={[styles.remainingLabel, { color: themeColors.textSecondary }]}>Remaining</Text>
                <Text style={[styles.remainingValue, { color: themeColors.blue }]}>
                  {formatRemainingTime(game.hltb_main_story, game.playtime_minutes)}
                </Text>
              </View>
            )}
          </GlassCard>

          {/* ── Start Playing button ── */}
          <TouchableOpacity
            style={[styles.startPlayingBtn, { backgroundColor: themeColors.green }]}
            onPress={() => setTimerVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="play-circle" size={22} color="#fff" />
            <Text style={styles.startPlayingText}>
              {lang === 'es' ? '¡Empezar a Jugar!' : 'Start Playing!'}
            </Text>
          </TouchableOpacity>

          {/* Log Session */}
          <GlassCard style={styles.card} padding={16}>
            <View style={styles.cardHeader}>
              <Ionicons name="game-controller" size={16} color={themeColors.accent} />
              <Text style={styles.cardTitle}>Log Gaming Session</Text>
            </View>
            <View style={styles.sessionRow}>
              <TextInput
                style={[styles.sessionInput, { color: themeColors.textPrimary, borderColor: themeColors.glassBorder }]}
                placeholder="Minutes played"
                placeholderTextColor={themeColors.textMuted}
                keyboardType="numeric"
                value={sessionMinutes}
                onChangeText={setSessionMinutes}
              />
              <TouchableOpacity style={[styles.sessionBtn, { backgroundColor: themeColors.accent }]} onPress={handleLogSession}>
                <Text style={styles.sessionBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Progress */}
          <GlassCard style={styles.card} padding={16}>
            <View style={styles.cardHeader}>
              <Ionicons name="bar-chart-outline" size={16} color={themeColors.green} />
              <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>Progress</Text>
              <Text style={[styles.progressPct, { color: themeColors.accent }]}>{game.progress_percentage}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: themeColors.glassBorder }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${game.progress_percentage}%` as any,
                    backgroundColor: statusConfig.color, // Status color doesn't change by theme usually, but we could if we want
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
              minimumTrackTintColor={themeColors.accent}
              maximumTrackTintColor={themeColors.glassBorder}
              thumbTintColor={themeColors.accent}
              style={{ marginTop: 8 }}
            />
          </GlassCard>

          <GlassCard style={styles.card} padding={16}>
            <View style={styles.cardHeader}>
              <Ionicons name="calculator-outline" size={16} color={themeColors.blue} />
              <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>Backlog Calculator</Text>
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={[styles.toggleTitle, { color: themeColors.textPrimary }]}>Exclude from total backlog hours</Text>
                <Text style={[styles.toggleSubtitle, { color: themeColors.textMuted }]}>
                  Hide this game from the finish-time estimate without deleting it.
                </Text>
              </View>
              <Switch
                value={game.exclude_from_backlog === 1}
                onValueChange={(value) => {
                  setBacklogExclusion(game.id, value);
                  setGame((current) => (current ? { ...current, exclude_from_backlog: value ? 1 : 0 } : current));
                }}
                trackColor={{ false: themeColors.glassBorder, true: themeColors.blue + '88' }}
                thumbColor={game.exclude_from_backlog === 1 ? themeColors.blue : themeColors.textPrimary}
              />
            </View>
          </GlassCard>

          {/* Status selector */}
          <GlassCard style={styles.card} padding={16}>
            <View style={styles.cardHeader}>
              <Ionicons name="layers-outline" size={16} color={themeColors.orange} />
              <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>Status</Text>
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
                      { borderColor: active ? cfg.color : themeColors.glassBorder },
                      active && { backgroundColor: cfg.color + '22' },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={cfg.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={active ? cfg.color : themeColors.textMuted}
                    />
                    <Text
                      style={[
                        styles.selectorLabel,
                        { color: active ? cfg.color : themeColors.textMuted },
                      ]}
                    >
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>

          {/* Platform selector */}
          <GlassCard style={styles.card} padding={16}>
            <View style={styles.cardHeader}>
              <Ionicons name="laptop-outline" size={16} color={themeColors.blue} />
              <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>Platform</Text>
            </View>
            <View style={styles.selectorGrid}>
              {(['steam', 'playstation', 'xbox', 'nintendo', 'emulator', 'other'] as Platform[]).map((p) => {
                const active = game.platform === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => handlePlatformChange(p)}
                    style={[
                      styles.selectorBtn,
                      { borderColor: active ? themeColors.blue : themeColors.glassBorder },
                      active && { backgroundColor: themeColors.blue + '22' },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.selectorLabel,
                        { color: active ? themeColors.blue : themeColors.textMuted },
                      ]}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassCard>

          {/* Priority selector */}
          <GlassCard style={styles.card} padding={16}>
            <View style={styles.cardHeader}>
              <Ionicons name="flag-outline" size={16} color={themeColors.orange} />
              <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>Priority</Text>
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
                      { borderColor: active ? cfg.color : themeColors.glassBorder },
                      active && { backgroundColor: cfg.color + '22' },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={cfg.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={active ? cfg.color : themeColors.textMuted}
                    />
                    <Text
                      style={[
                        styles.selectorLabel,
                        { color: active ? cfg.color : themeColors.textMuted },
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
              <Ionicons name="create-outline" size={16} color={themeColors.violet} />
              <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>Notes</Text>
              <TouchableOpacity onPress={handleSaveNotes} style={[styles.saveBtn, { backgroundColor: themeColors.accent + '22' }]}>
                <Text style={[styles.saveBtnText, { color: themeColors.accent }]}>Save</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.notesInput, { color: themeColors.textPrimary }]}
              value={notes}
              onChangeText={setNotesLocal}
              multiline
              numberOfLines={4}
              placeholder="Add notes, thoughts, or reminders…"
              placeholderTextColor={themeColors.textMuted}
            />
          </GlassCard>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <SessionTimerModal
        visible={timerVisible}
        game={game}
        onClose={(savedMinutes) => {
          setTimerVisible(false);
          if (savedMinutes) {
            refresh();
            load();
          }
        }}
      />
    </View>
  );
}

function HLTBStat({ label, value, color, themeColors }: { label: string; value: string; color: string; themeColors: any }) {
  return (
    <View style={styles.hltbStat}>
      <Text style={[styles.hltbValue, { color }]}>{value}</Text>
      <Text style={[styles.hltbLabel, { color: themeColors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  platformBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12 },
  card: { marginBottom: 14 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  refreshBtn: { padding: 4 },
  hltbRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  remainingRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remainingLabel: {
    fontSize: 13,
  },
  remainingValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  hltbStat: { alignItems: 'center', gap: 4 },
  hltbValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  hltbLabel: { fontSize: 11 },
  progressTrack: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  progressPct: { fontSize: 14, fontWeight: '700' },
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  toggleInfo: {
    flex: 1,
    gap: 4,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },
  notesInput: {
    fontSize: 14,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  saveBtnText: { fontSize: 12, fontWeight: '700' },
  sessionRow: { flexDirection: 'row', gap: 12 },
  sessionInput: {
    flex: 1, height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 14
  },
  sessionBtn: { paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sessionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  startPlayingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    marginBottom: 14,
  },
  startPlayingText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});
