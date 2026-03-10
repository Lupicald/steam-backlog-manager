import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../hooks/useAppContext';
import { PLATFORM_CONFIG, ImportPlatform } from '../types';

interface ConsentScreenProps {
  platform: ImportPlatform;
  onAccept: () => void;
  onCancel: () => void;
}

export function ConsentScreen({ platform, onAccept, onCancel }: ConsentScreenProps) {
  const { themeColors } = useAppContext();
  const config = PLATFORM_CONFIG[platform];

  const bullets = [
    `Your credentials are entered directly on ${config.label}'s official website`,
    'Your login session stays on your device only',
    `BacklogFlow is not affiliated with ${config.label}`,
    'We never see, store, or transmit your password',
    'You can disconnect anytime from Settings',
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: themeColors.accent + '22' }]}>
        <Ionicons name="shield-checkmark-outline" size={48} color={themeColors.accent} />
      </View>

      <Text style={[styles.title, { color: themeColors.textPrimary }]}>Privacy Notice</Text>
      <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
        Before connecting your {config.label} account
      </Text>

      <View style={styles.bulletList}>
        {bullets.map((text, i) => (
          <View key={i} style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={16} color={themeColors.green} />
            <Text style={[styles.bulletText, { color: themeColors.textSecondary }]}>{text}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.disclaimer, { backgroundColor: themeColors.glass, borderColor: themeColors.glassBorder }]}>
        <Ionicons name="information-circle-outline" size={14} color={themeColors.textMuted} />
        <Text style={[styles.disclaimerText, { color: themeColors.textMuted }]}>
          This app is an independent project. All trademarks belong to their respective owners.
        </Text>
      </View>

      <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
        <LinearGradient
          colors={[themeColors.accent, themeColors.violet]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="shield-checkmark" size={18} color="#fff" />
        <Text style={styles.acceptText}>I Understand, Continue</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Text style={[styles.cancelText, { color: themeColors.textMuted }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  bulletList: {
    alignSelf: 'stretch',
    gap: 10,
    marginVertical: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingRight: 8,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignSelf: 'stretch',
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  acceptBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
    alignSelf: 'stretch',
    marginTop: 4,
  },
  acceptText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 14,
  },
});
