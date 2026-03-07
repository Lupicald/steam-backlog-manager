import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../hooks/useAppContext';

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
  iconColor,
  action,
  count,
}: SectionHeaderProps) {
  const { themeColors } = useAppContext();
  const finalIconColor = iconColor || themeColors.accent;

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: finalIconColor + '22' }]}>
            <Ionicons name={icon} size={16} color={finalIconColor} />
          </View>
        )}
        <View>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>{title}</Text>
            {count !== undefined && (
              <View style={[styles.countBadge, { backgroundColor: themeColors.accent + '33' }]}>
                <Text style={[styles.countText, { color: themeColors.violet }]}>{count}</Text>
              </View>
            )}
          </View>
          {subtitle ? <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>{subtitle}</Text> : null}
        </View>
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
          <Text style={[styles.action, { color: themeColors.accent }]}>{action.label}</Text>
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
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  action: {
    fontSize: 13,
    fontWeight: '600',
  },
});
