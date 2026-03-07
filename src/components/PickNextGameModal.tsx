import React from 'react';
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
import { COLORS } from '../utils/colors';

const { width } = Dimensions.get('window');

interface PickNextGameModalProps {
  visible: boolean;
  recommendation: Recommendation | null;
  onReroll: () => void;
  onClose: () => void;
}

export function PickNextGameModal({
  visible,
  recommendation,
  onReroll,
  onClose,
}: PickNextGameModalProps) {
  const router = useRouter();

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
            colors={[COLORS.accent + '30', COLORS.accentAlt + '10']}
            style={StyleSheet.absoluteFill}
          />

          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="dice" size={22} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Pick My Next Game</Text>
              <Text style={styles.headerSub}>Based on priority, time & habits</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={24} color={COLORS.textMuted} />
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
                      <Ionicons name="time-outline" size={14} color={COLORS.cyan} />
                      <Text style={styles.timeText}>
                        Main story ~{formatHLTBTime(recommendation.game.hltb_main_story)}
                      </Text>
                    </View>
                  ) : null}

                  {/* Reason chip */}
                  <View style={styles.reasonChip}>
                    <Ionicons name="sparkles" size={12} color={COLORS.violet} />
                    <Text style={styles.reasonText}>{recommendation.reason}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.rerollButton} onPress={onReroll} activeOpacity={0.82}>
                  <Ionicons name="refresh" size={18} color={COLORS.textPrimary} />
                  <Text style={styles.rerollText}>Reroll</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.ctaButton} onPress={handleOpen} activeOpacity={0.85}>
                  <LinearGradient
                    colors={[COLORS.accent, COLORS.accentAlt]}
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
              <Ionicons name="library-outline" size={48} color={COLORS.textMuted} />
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

const styles = StyleSheet.create({
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
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.textMuted,
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
    backgroundColor: COLORS.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    color: COLORS.textMuted,
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
    color: COLORS.textPrimary,
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
    color: COLORS.cyan,
    fontSize: 13,
    fontWeight: '600',
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.violet + '18',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.violet + '33',
  },
  reasonText: {
    color: COLORS.violet,
    fontSize: 12,
    fontWeight: '500',
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
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rerollText: {
    color: COLORS.textPrimary,
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
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
