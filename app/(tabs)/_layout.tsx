import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../src/hooks/useAppContext';
import { t } from '../../src/i18n';

function TabBarBackground() {
  const { themeColors } = useAppContext();
  return (
    <BlurView
      intensity={50}
      tint="dark"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: `${themeColors.bg}CC`, borderTopWidth: 1, borderColor: themeColors.glassBorder },
        ]}
      />
    </BlurView>
  );
}

export default function TabLayout() {
  const { themeColors, language } = useAppContext();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColors.accent,
        tabBarInactiveTintColor: themeColors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab_dash', language),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t('tab_lib', language),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recommendations"
        options={{
          title: t('tab_ai', language),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: t('tab_plan', language),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tab_stats', language),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tab_set', language),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
