import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Platform, PLATFORM_CONFIG, ImportPlatform } from '../types';

interface PlatformBadgeProps {
  platform: Platform;
  size?: 'sm' | 'md';
}

export function PlatformBadge({ platform, size = 'md' }: PlatformBadgeProps) {
  const config = PLATFORM_CONFIG[platform as ImportPlatform];
  if (!config) return null;

  const isSmall = size === 'sm';
  const color = config.color;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + '22', borderColor: color + '55' },
        isSmall && styles.badgeSm,
      ]}
    >
      <Ionicons
        name={config.icon as keyof typeof Ionicons.glyphMap}
        size={isSmall ? 10 : 12}
        color={color}
        style={styles.icon}
      />
      <Text style={[styles.label, { color }, isSmall && styles.labelSm]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  badgeSm: {
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  labelSm: {
    fontSize: 11,
  },
});
