import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/colors';

interface GameCoverProps {
  uri: string;
  width?: number;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function GameCover({
  uri,
  width = 120,
  height = 56,
  radius = 12,
  style,
}: GameCoverProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View
      style={[styles.wrapper, { width, height, borderRadius: radius }, style]}
    >
      {error ? (
        <View style={[styles.placeholder, { borderRadius: radius }]}>
          <Ionicons name="game-controller" size={28} color={COLORS.textMuted} />
        </View>
      ) : (
        <>
          <Image
            source={{ uri }}
            style={[styles.image, { borderRadius: radius }]}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
            resizeMode="cover"
          />
          {loading && (
            <View style={[StyleSheet.absoluteFill, styles.loader, { borderRadius: radius }]}>
              <ActivityIndicator color={COLORS.accent} size="small" />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    backgroundColor: COLORS.bgTertiary,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgTertiary,
  },
  loader: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgTertiary,
  },
});
