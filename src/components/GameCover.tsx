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
import { useAppContext } from '../hooks/useAppContext';

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
  const { themeColors } = useAppContext();

  return (
    <View
      style={[styles.wrapper, { width, height, borderRadius: radius, backgroundColor: themeColors.card }, style]}
    >
      {error ? (
        <View style={[styles.placeholder, { borderRadius: radius, backgroundColor: themeColors.card }]}>
          <Ionicons name="game-controller" size={28} color={themeColors.textMuted} />
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
            <View style={[StyleSheet.absoluteFill, styles.loader, { borderRadius: radius, backgroundColor: themeColors.card }]}>
              <ActivityIndicator color={themeColors.accent} size="small" />
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
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
