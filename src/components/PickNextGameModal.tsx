import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Recommendation } from '../types';
import { GameCover } from './GameCover';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { formatHLTBTime } from '../utils/formatters';
import { useAppContext } from '../hooks/useAppContext';

const { width } = Dimensions.get('window');

interface PickNextGameModalProps {
  visible: boolean;
  recommendation: Recommendation | null;
  onReroll: (hours?: number) => void;
  onClose: () => void;
}

const SESSION_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '1 Hr', value: 1 },
  { label: '2 Hr', value: 2 },
  { label: '4 Hr', value: 4 },
];

export function PickNextGameModal({
  visible,
  recommendation,
  onReroll,
  onClose,
}: PickNextGameModalProps) {
  const router = useRouter();
  const { themeColors } = useAppContext();
  const styles = getStyles(themeColors);
  const [sessionHours, setSessionHours] = useState<number | undefined>(undefined);

  const handleReroll = () => {
    onReroll(sessionHours);
  };

  const handleOpen = () => {
    onClose();
    if (recommendation) {
      router.push(`/game/${recommendation.game.id}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>

      <View style={styles.container} pointerEvents="box-none">
        <View style={styles.sheet}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[themeColors.accent + '30', themeColors.accent + '10']}
            style={StyleSheet.absoluteFill}
          />

          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="dice" size={22} color={themeColors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Pick My Next Game</Text>
              <Text style={styles.headerSub}>Based on priority, time & habits</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={24} color={themeColors.textMuted} />
            </TouchableOpacity>
          </View>

          {recommendation ? (
            <>
              {/* Game preview */}
              <View style={styles.gamePreview}>
                <GameCover
                  uri={recommendation.game.cover_url}
                  width={width - 80}
                  height={(width - 80) * 0.47}
                  radius={16}
                />
                <View style={styles.gameInfo}>
                  <Text style={styles.gameTitle}>{recommendation.game.title}</Text>

                  <View style={styles.gameBadges}>
                    <StatusBadge status={recommendation.game.status} />
                    <PriorityBadge priority={recommendation.game.priority} />
                  </View>

                  {recommendation.game.hltb_main_story ? (
                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={14} color={themeColors.teal} />
                      <Text style={styles.timeText}>
                        Main story ~{formatHLTBTime(recommendation.game.hltb_main_story)}
                      </Text>
                    </View>
                  ) : null}

                  {/* Reason chip */}
                  <View style={styles.reasonCard}>
                    <Ionicons name="sparkles" size={12} color={themeColors.violet} />
                    <Text style={styles.reasonText}>{recommendation.reason}</Text>
                  </View>
                </View>
              </View>

              {/* Session Mode Toggles */}
              <View style={styles.sessionWrap}>
                <Text style={styles.sessionLabel}>Session Available Time:</Text>
                <View style={styles.sessionChipsRow}>
                  {SESSION_OPTIONS.map(opt => {
                    const isActive = sessionHours === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.label}
                        activeOpacity={0.7}
                        style={[styles.sessionChip, isActive && { backgroundColor: themeColors.accent, borderColor: themeColors.accent }]}
                        onPress={() => {
                          setSessionHours(opt.value);
                          onReroll(opt.value);
                        }}
                      >
                        <Text style={[styles.sessionChipText, isActive && { color: '#fff' }]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.rerollButton} onPress={handleReroll} activeOpacity={0.82}>
                  <Ionicons name="refresh" size={18} color={themeColors.textPrimary} />
                  <Text style={styles.rerollText}>Reroll</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.ctaButton} onPress={handleOpen} activeOpacity={0.85}>
                  <LinearGradient
                    colors={[themeColors.accent, themeColors.violet]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.ctaText}>Let's Play This</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="library-outline" size={48} color={themeColors.textMuted} />
              <Text style={styles.emptyText}>No games to recommend yet.</Text>
              <Text style={styles.emptySubText}>
                Import your Steam library and add some games to your backlog.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (themeColors: any) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: themeColors.glassBorder,
    overflow: 'hidden',
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: themeColors.textMuted,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: 20,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: themeColors.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: themeColors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: themeColors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  gamePreview: {
    gap: 16,
  },
  gameInfo: {
    gap: 10,
  },
  gameTitle: {
    color: themeColors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  gameBadges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    color: themeColors.teal,
    fontSize: 13,
    fontWeight: '600',
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: themeColors.violet + '18',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: themeColors.violet + '33',
  },
  reasonText: {
    color: themeColors.violet,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
  },
  sessionWrap: {
    marginTop: 20,
  },
  sessionLabel: {
    color: themeColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionChipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sessionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: themeColors.glassBorder,
    backgroundColor: themeColors.card,
  },
  sessionChipText: {
    color: themeColors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  ctaButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  rerollButton: {
    width: 118,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColors.glassBorder,
    backgroundColor: themeColors.glass,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rerollText: {
    color: themeColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    color: themeColors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubText: {
    color: themeColors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
