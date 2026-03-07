import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '../utils/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'dark' | 'light' | 'default';
  padding?: number;
  radius?: number;
  borderColor?: string;
}

export function GlassCard({
  children,
  style,
  intensity = 20,
  tint = 'dark',
  padding = 16,
  radius = 20,
  borderColor = COLORS.glassBorder,
}: GlassCardProps) {
  return (
    <View
      style={[
        styles.wrapper,
        { borderRadius: radius, borderColor },
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, backgroundColor: COLORS.glass },
        ]}
      />
      <View style={{ padding, borderRadius: radius, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
