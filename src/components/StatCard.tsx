import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../hooks/useAppContext';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  gradient?: readonly [string, string];
  subtitle?: string;
}

export function StatCard({
  label,
  value,
  icon,
  color,
  gradient,
  subtitle,
}: StatCardProps) {
  const { themeColors } = useAppContext();
  const finalColor = color || themeColors.accent;
  const gradientColors = gradient ?? ([finalColor + '30', finalColor + '10'] as const);

  return (
    <View style={[styles.wrapper, { borderColor: themeColors.glassBorder }]}>
      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={gradientColors as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.iconBg, { backgroundColor: finalColor + '22' }]}>
        <Ionicons name={icon} size={20} color={finalColor} />
      </View>
      <Text style={[styles.value, { color: themeColors.textPrimary }]}>{value}</Text>
      <Text style={[styles.label, { color: themeColors.textSecondary }]}>{label}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    minHeight: 110,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 10,
    marginTop: 4,
  },
});
