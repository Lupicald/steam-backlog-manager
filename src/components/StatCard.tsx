import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/colors';

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
  color = COLORS.accent,
  gradient,
  subtitle,
}: StatCardProps) {
  const gradientColors = gradient ?? ([color + '30', color + '10'] as const);

  return (
    <View style={styles.wrapper}>
      <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={gradientColors as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.iconBg, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
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
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 4,
  },
});
