import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../src/components/GlassCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { calculateCompletionTimeline, PlannerSimulation } from '../../src/services/plannerService';
import { getBacklogStats } from '../../src/database/queries';
import { useAppContext } from '../../src/hooks/useAppContext';
import { BacklogStats } from '../../src/types';
import { useFocusEffect } from 'expo-router';

export default function PlannerScreen() {
    const { themeColors, isPremium } = useAppContext();
    const [hoursPerDay, setHoursPerDay] = useState('2');
    const [simulation, setSimulation] = useState<PlannerSimulation | null>(null);
    const [stats, setStats] = useState<BacklogStats | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            setStats(getBacklogStats());
            updateSimulation(parseFloat(hoursPerDay) || 2);
        }, [])
    );

    const updateSimulation = (hours: number) => {
        if (hours > 0) {
            setSimulation(calculateCompletionTimeline(hours));
        }
    };

    const handleApplySim = () => {
        const hours = parseFloat(hoursPerDay);
        if (!isNaN(hours) && hours > 0) {
            updateSimulation(hours);
        }
    };

    if (!isPremium) {
        return (
            <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
                <LinearGradient colors={[themeColors.bg, themeColors.card]} style={StyleSheet.absoluteFill} />
                <View style={styles.premiumLock}>
                    <Ionicons name="lock-closed" size={48} color={themeColors.accent} />
                    <Text style={[styles.premiumTitle, { color: themeColors.textPrimary }]}>Premium Feature</Text>
                    <Text style={[styles.premiumSubtitle, { color: themeColors.textSecondary }]}>
                        Smart Backlog Planner is explicitly available to premium members. Upgrade in Settings!
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
            <LinearGradient colors={[themeColors.bg, themeColors.card]} style={StyleSheet.absoluteFill} />

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: themeColors.textPrimary }]}>Smart Planner</Text>
                    <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
                        Estimate your backlog completion timeline
                    </Text>
                </View>

                <View style={styles.section}>
                    <SectionHeader title="Simulation Engine" icon="calculator" iconColor={themeColors.teal} />
                    <GlassCard padding={20}>
                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                            How many hours do you plan to play per day?
                        </Text>
                        <View style={styles.inputRow}>
                            <TextInput
                                style={[styles.input, { color: themeColors.textPrimary, borderColor: themeColors.glassBorder, backgroundColor: themeColors.glass }]}
                                value={hoursPerDay}
                                onChangeText={setHoursPerDay}
                                keyboardType="numeric"
                                maxLength={4}
                            />
                            <TouchableOpacity
                                style={[styles.simButton, { backgroundColor: themeColors.accent }]}
                                onPress={handleApplySim}
                            >
                                <Text style={styles.simButtonText}>Simulate</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </View>

                {stats && simulation && (
                    <View style={styles.section}>
                        <SectionHeader title="Projections" icon="calendar" iconColor={themeColors.violet} />
                        <GlassCard padding={20}>
                            <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>
                                {stats.total_hours_remaining} hrs
                            </Text>
                            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>
                                Estimated Total Remaining Time
                            </Text>

                            <View style={[styles.divider, { backgroundColor: themeColors.glassBorder }]} />

                            <Text style={[styles.statValue, { color: themeColors.accent, fontSize: 32 }]}>
                                {simulation.monthsToComplete.toFixed(1)} months
                            </Text>
                            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>
                                To clear your entire backlog
                            </Text>

                            <View style={[styles.divider, { backgroundColor: themeColors.glassBorder }]} />

                            <Text style={[styles.statValue, { color: themeColors.green, fontSize: 22 }]}>
                                {simulation.estimatedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </Text>
                            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>
                                Target Completion Date
                            </Text>
                        </GlassCard>
                    </View>
                )}

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
    label: { fontSize: 13, marginBottom: 12, fontWeight: '500' },
    inputRow: { flexDirection: 'row', gap: 12 },
    input: {
        flex: 1, height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 18, fontWeight: '700'
    },
    simButton: {
        paddingHorizontal: 24, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center'
    },
    simButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    statValue: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
    statLabel: { fontSize: 12 },
    divider: { height: 1, width: '100%', marginVertical: 16 },
    premiumLock: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    premiumTitle: { fontSize: 24, fontWeight: '800', marginTop: 16, marginBottom: 8 },
    premiumSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
