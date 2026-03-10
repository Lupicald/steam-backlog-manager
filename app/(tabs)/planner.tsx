import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../src/components/GlassCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { calculateCompletionTimeline, PlannerSimulation } from '../../src/services/plannerService';
import { getBacklogStats } from '../../src/database/queries';
import { useAppContext } from '../../src/hooks/useAppContext';
import { t } from '../../src/i18n';
import { BacklogStats } from '../../src/types';
import { useFocusEffect, useRouter } from 'expo-router';

export default function PlannerScreen() {
    const { themeColors, language } = useAppContext();
    const router = useRouter();
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

    return (
        <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
            <LinearGradient colors={[themeColors.bg, themeColors.card]} style={StyleSheet.absoluteFill} />

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: themeColors.textPrimary }]}>{t('plan_page_title', language)}</Text>
                    <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
                        {t('plan_subtitle', language)}
                    </Text>
                </View>

                <View style={styles.section}>
                    <SectionHeader title={t('plan_sim_engine', language)} icon="calculator" iconColor={themeColors.teal} />
                    <GlassCard padding={20}>
                        <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                            {t('plan_hours_label', language)}
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
                                <Text style={styles.simButtonText}>{t('plan_simulate', language)}</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </View>

                {stats && simulation && (
                    <View style={styles.section}>
                        <SectionHeader title={t('plan_projections', language)} icon="calendar" iconColor={themeColors.violet} />
                        <GlassCard padding={20}>
                            <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>
                                {stats.total_hours_remaining} {t('plan_hrs', language)}
                            </Text>
                            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>
                                {t('plan_total_remaining', language)}
                            </Text>

                            <View style={[styles.divider, { backgroundColor: themeColors.glassBorder }]} />

                            <Text style={[styles.statValue, { color: themeColors.accent, fontSize: 32 }]}>
                                {simulation.monthsToComplete.toFixed(1)} {t('plan_months', language)}
                            </Text>
                            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>
                                {t('plan_clear_backlog', language)}
                            </Text>

                            <View style={[styles.divider, { backgroundColor: themeColors.glassBorder }]} />

                            <Text style={[styles.statValue, { color: themeColors.green, fontSize: 22 }]}>
                                {simulation.estimatedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </Text>
                            <Text style={[styles.statLabel, { color: themeColors.textMuted }]}>
                                {t('plan_target_date', language)}
                            </Text>
                        </GlassCard>
                    </View>
                )}

                {/* Purchase Advisor card */}
                <View style={styles.section}>
                    <SectionHeader title={t('pa_card_title', language)} icon="cart" iconColor="#a855f7" />
                    <TouchableOpacity
                        onPress={() => router.push('/purchase-advisor' as any)}
                        activeOpacity={0.85}
                    >
                        <GlassCard padding={20} borderColor="#a855f744" style={{ overflow: 'hidden' }}>
                            <LinearGradient
                                colors={['#a855f714', '#7c3aed10']}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#a855f733', alignItems: 'center', justifyContent: 'center' }}>
                                    <Ionicons name="help-circle" size={28} color="#a855f7" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.advisorTitle, { color: themeColors.textPrimary }]}>
                                        {t('pa_card_title', language)}
                                    </Text>
                                    <Text style={[styles.advisorDesc, { color: themeColors.textMuted }]}>
                                        {t('pa_card_desc', language)}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#a855f7" />
                            </View>
                            <TouchableOpacity
                                style={styles.advisorBtn}
                                onPress={() => router.push('/purchase-advisor' as any)}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={['#a855f7', '#7c3aed']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                />
                                <Ionicons name="analytics" size={16} color="#fff" />
                                <Text style={styles.advisorBtnText}>{t('pa_card_btn', language)}</Text>
                            </TouchableOpacity>
                        </GlassCard>
                    </TouchableOpacity>
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
    advisorTitle: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
    advisorDesc: { fontSize: 12, lineHeight: 17 },
    advisorBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 42,
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 14,
    },
    advisorBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
