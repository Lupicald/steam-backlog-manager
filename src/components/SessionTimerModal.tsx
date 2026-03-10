import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../hooks/useAppContext';
import { t, Language } from '../i18n';
import { Game } from '../types';
import { logSessionAndUpdateGame } from '../services/gamingSessionService';

interface Props {
  visible: boolean;
  game: Game;
  onClose: (savedMinutes?: number) => void;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function SessionTimerModal({ visible, game, onClose }: Props) {
  const { themeColors, language } = useAppContext();
  const lang = language as Language;

  const [elapsed, setElapsed] = useState(0);   // seconds
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start timer automatically when modal opens
  useEffect(() => {
    if (visible) {
      setElapsed(0);
      setRunning(true);
    } else {
      setRunning(false);
      setElapsed(0);
    }
  }, [visible]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const elapsedMinutes = Math.max(1, Math.round(elapsed / 60));

  const handleEnd = useCallback(() => {
    setRunning(false);
    Alert.alert(
      t('session_end_confirm', lang),
      `${t('session_end_msg', lang)} ${elapsedMinutes} ${t('session_end_msg2', lang)}`,
      [
        {
          text: t('session_cancel_btn', lang),
          onPress: () => setRunning(true),
        },
        {
          text: t('session_save', lang),
          style: 'default',
          onPress: () => {
            logSessionAndUpdateGame(game, elapsedMinutes);
            Alert.alert(
              t('session_saved', lang),
              `${elapsedMinutes} ${t('session_saved_msg', lang)}`
            );
            onClose(elapsedMinutes);
          },
        },
      ]
    );
  }, [lang, elapsedMinutes, game, onClose]);

  const handleDiscard = useCallback(() => {
    setRunning(false);
    Alert.alert(
      t('session_discard', lang),
      t('session_discard_msg', lang),
      [
        { text: t('session_cancel_btn', lang), onPress: () => setRunning(true) },
        { text: t('session_discard', lang), style: 'destructive', onPress: () => onClose() },
      ]
    );
  }, [lang, onClose]);

  // Colour that pulses between accent and green
  const accentColor = themeColors.green;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleDiscard}
    >
      {/* Backdrop */}
      <Pressable style={styles.overlay} onPress={() => {}}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      </Pressable>

      <View style={styles.container}>
        <View style={[styles.sheet, { borderColor: themeColors.glassBorder }]}>
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[accentColor + '20', 'transparent']}
            style={StyleSheet.absoluteFill}
          />

          {/* Handle */}
          <View style={styles.handle} />

          {/* Game title */}
          <Text style={[styles.sessionLabel, { color: themeColors.textMuted }]}>
            {t('session_title', lang).toUpperCase()}
          </Text>
          <Text style={[styles.gameTitle, { color: themeColors.textPrimary }]} numberOfLines={2}>
            {game.title}
          </Text>

          {/* Timer display */}
          <View style={styles.timerWrap}>
            <LinearGradient
              colors={[accentColor + '18', accentColor + '08']}
              style={styles.timerBg}
            />
            {!running && elapsed > 0 && (
              <Text style={[styles.pausedLabel, { color: themeColors.orange }]}>
                {t('session_paused_label', lang)}
              </Text>
            )}
            <Text style={[styles.timerText, { color: running ? accentColor : themeColors.textMuted }]}>
              {formatElapsed(elapsed)}
            </Text>
            <Text style={[styles.elapsedLabel, { color: themeColors.textMuted }]}>
              {t('session_elapsed', lang)}
            </Text>
          </View>

          {/* Play / Pause */}
          <TouchableOpacity
            style={[styles.pauseBtn, { backgroundColor: running ? themeColors.orange + '22' : accentColor + '22', borderColor: running ? themeColors.orange : accentColor }]}
            onPress={() => setRunning((r) => !r)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={running ? 'pause' : 'play'}
              size={28}
              color={running ? themeColors.orange : accentColor}
            />
            <Text style={[styles.pauseBtnText, { color: running ? themeColors.orange : accentColor }]}>
              {running ? t('session_pause', lang) : t('session_resume', lang)}
            </Text>
          </TouchableOpacity>

          {/* End session */}
          <TouchableOpacity
            style={[styles.endBtn, { backgroundColor: accentColor }]}
            onPress={handleEnd}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.endBtnText}>{t('session_end', lang)}</Text>
          </TouchableOpacity>

          {/* Discard link */}
          <TouchableOpacity onPress={handleDiscard} style={styles.discardLink}>
            <Text style={[styles.discardText, { color: themeColors.textMuted }]}>
              {t('session_discard', lang)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    paddingHorizontal: 28,
    paddingBottom: 44,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 99,
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: 24,
  },
  sessionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  timerWrap: {
    width: '100%',
    alignItems: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    paddingVertical: 28,
    marginBottom: 28,
    position: 'relative',
  },
  timerBg: {
    ...StyleSheet.absoluteFillObject,
  },
  pausedLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  timerText: {
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  elapsedLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  pauseBtnText: {
    fontSize: 17,
    fontWeight: '700',
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 56,
    borderRadius: 16,
    marginBottom: 12,
  },
  endBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  discardLink: {
    paddingVertical: 10,
  },
  discardText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
