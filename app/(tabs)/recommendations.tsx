import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../src/components/GlassCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { getTopRecommendations, getFocusModeRecommendations } from '../../src/services/recommendationService';
import { useAppContext } from '../../src/hooks/useAppContext';
import { Recommendation } from '../../src/types';
import { useFocusEffect } from 'expo-router';
import { GameCard } from '../../src/components/GameCard';

export default function RecommendationsScreen() {
    const { themeColors } = useAppContext();
    const [focusMode, setFocusMode] = useState(false);
    const [recs, setRecs] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        React.useCallback(() => {
            loadRecs(focusMode);
        }, [focusMode])
    );

    const loadRecs = (focus: boolean) => {
        setLoading(true);
        setTimeout(() => { // Simulate thought process for polish
            if (focus) {
                setRecs(getFocusModeRecommendations());
            } else {
                setRecs(getTopRecommendations());
            }
            setLoading(false);
        }, 400);
    };

    return (
        <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
            <LinearGradient colors={[themeColors.bg, themeColors.card]} style={StyleSheet.absoluteFill} />

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: themeColors.textPrimary }]}>AI Picker</Text>
                    <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
                        Smart recommendations for your next session
                    </Text>
                </View>

                <View style={styles.section}>
                    <GlassCard padding={20} style={styles.focusSwitchCard}>
                        <View style={styles.focusTextWrap}>
                            <Text style={[styles.focusTitle, { color: themeColors.textPrimary }]}>Focus Mode</Text>
                            <Text style={[styles.focusSubtitle, { color: themeColors.textMuted }]}>
                                Only games under 10 hours
                            </Text>
                        </View>
                        <Switch
                            value={focusMode}
                            onValueChange={setFocusMode}
                            trackColor={{ false: themeColors.glassBorder, true: themeColors.accent }}
                            thumbColor={themeColors.textPrimary}
                        />
                    </GlassCard>
                </View>

                <View style={styles.section}>
                    <SectionHeader title="Top Picks" icon="sparkles" iconColor={themeColors.orange} />

                    {loading ? (
                        <ActivityIndicator size="large" color={themeColors.orange} style={{ marginTop: 40 }} />
                    ) : recs.length === 0 ? (
                        <GlassCard padding={20}>
                            <Text style={{ color: themeColors.textMuted, textAlign: 'center' }}>
                                Not enough games in your backlog to make recommendations.
                            </Text>
                        </GlassCard>
                    ) : (
                        recs.map((rec, index) => (
                            <View key={rec.game.id} style={styles.recWrapper}>
                                <View style={[styles.reasonCard, { backgroundColor: themeColors.card, borderColor: themeColors.glassBorder }]}>
                                    <Ionicons name="sparkles" size={14} color={themeColors.violet} />
                                    <Text style={[styles.reasonText, { color: themeColors.textPrimary }]}>
                                        {rec.reason}
                                    </Text>
                                </View>
                                <GameCard game={rec.game} />
                            </View>
                        ))
                    )}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingTop: 60, paddingHorizontal: 20 },
    header: { marginBottom: 24 },
    title: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
    subtitle: { fontSize: 14, marginTop: 4 },
    section: { marginBottom: 24 },
    focusSwitchCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    focusTextWrap: { flex: 1 },
    focusTitle: { fontSize: 16, fontWeight: '700' },
    focusSubtitle: { fontSize: 12, marginTop: 2 },
    recWrapper: { marginBottom: 20 },
    reasonCard: {
        alignSelf: 'stretch',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: -12,
        marginHorizontal: 12,
        zIndex: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    reasonText: { fontSize: 12, fontWeight: '600', lineHeight: 18, flex: 1 },
});
