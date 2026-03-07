import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/colors';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  count?: number;
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  iconColor = COLORS.accent,
  action,
  count,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: iconColor + '22' }]}>
            <Ionicons name={icon} size={16} color={iconColor} />
          </View>
        )}
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {count !== undefined && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{count}</Text>
              </View>
            )}
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
          <Text style={styles.action}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: COLORS.accent + '33',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  countText: {
    color: COLORS.violet,
    fontSize: 11,
    fontWeight: '700',
  },
  action: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },
});
