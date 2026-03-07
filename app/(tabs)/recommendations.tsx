import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { GlassCard } from '../../src/components/GlassCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { GameCard } from '../../src/components/GameCard';
import { useAppContext } from '../../src/hooks/useAppContext';
import {
    BacklogMission,
    DailyPick,
    Recommendation,
    RecommendationGoal,
    RecommendationMood,
    SmartCollection,
    TasteProfile,
    VersusPair,
    WeeklyPlan,
} from '../../src/types';
import {
    getBacklogMissions,
    getDailyPick,
    getRecommendations,
    getSmartCollections,
    getTasteProfile,
    getVersusPair,
    getWeeklyPlan,
    recordVersusChoice,
} from '../../src/services/recommendationService';

const SESSION_OPTIONS = [
    { label: 'Any', value: undefined },
    { label: '1h', value: 1 },
    { label: '2h', value: 2 },
    { label: '4h', value: 4 },
];

const MOOD_OPTIONS: { label: string; value: RecommendationMood }[] = [
    { label: 'Balanced', value: 'balanced' },
    { label: 'Advance', value: 'advance' },
    { label: 'Short', value: 'short' },
    { label: 'Chill', value: 'chill' },
    { label: 'Resume', value: 'resume' },
    { label: 'Finish', value: 'finish' },
];

const GOAL_OPTIONS: { label: string; value: RecommendationGoal }[] = [
    { label: 'Any Goal', value: 'none' },
    { label: 'Finish Today', value: 'finish_today' },
    { label: '1-2 Sessions', value: 'two_sessions' },
    { label: 'Bite Size', value: 'bite_size' },
];

export default function RecommendationsScreen() {
    const router = useRouter();
    const { themeColors } = useAppContext();
    const [focusMode, setFocusMode] = useState(false);
    const [sessionHours, setSessionHours] = useState<number | undefined>(undefined);
    const [mood, setMood] = useState<RecommendationMood>('balanced');
    const [goal, setGoal] = useState<RecommendationGoal>('none');
    const [recs, setRecs] = useState<Recommendation[]>([]);
    const [dailyPick, setDailyPick] = useState<DailyPick | null>(null);
    const [missions, setMissions] = useState<BacklogMission[]>([]);
    const [collections, setCollections] = useState<SmartCollection[]>([]);
    const [tasteProfile, setTasteProfile] = useState<TasteProfile | null>(null);
    const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
    const [versus, setVersus] = useState<VersusPair | null>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [focusMode, sessionHours, mood, goal])
    );

    const loadData = () => {
        setLoading(true);
        setRecs(
            getRecommendations({
                mode: focusMode ? 'focus' : 'balanced',
                availableTimeHours: sessionHours,
                mood,
                goal,
                limit: 6,
            })
        );
        setDailyPick(getDailyPick());
        setMissions(getBacklogMissions());
        setCollections(getSmartCollections());
        setTasteProfile(getTasteProfile());
        setWeeklyPlan(getWeeklyPlan(sessionHours ? sessionHours * 4 : 7));
        setVersus(getVersusPair());
        setLoading(false);
    };

    const pickVersus = (rec: Recommendation) => {
        recordVersusChoice(rec);
        loadData();
    };

    return (
        <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
            <LinearGradient colors={[themeColors.bg, themeColors.card]} style={StyleSheet.absoluteFill} />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: themeColors.textPrimary }]}>AI Picker</Text>
                    <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>
                        Intent-driven picks, daily hooks, missions and smart backlog routes
                    </Text>
                </View>

                {dailyPick && (
                    <View style={styles.section}>
                        <SectionHeader title="Daily Pick" icon="flash" iconColor={themeColors.teal} />
                        <TouchableOpacity onPress={() => router.push(`/game/${dailyPick.recommendation.game.id}`)} activeOpacity={0.82}>
                            <GlassCard padding={18} radius={20} borderColor={themeColors.teal} style={{ overflow: 'hidden' }}>
                                <LinearGradient
                                    colors={[themeColors.teal + '22', themeColors.blue + '10']}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={styles.dailyHeader}>
                                    <View style={[styles.dailyIcon, { backgroundColor: themeColors.teal + '22' }]}>
                                        <Ionicons name="flash" size={20} color={themeColors.teal} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.dailyTitle, { color: themeColors.textPrimary }]}>
                                            {dailyPick.recommendation.game.title}
                                        </Text>
                                        <Text style={[styles.dailySubtitle, { color: themeColors.textSecondary }]}>
                                            {dailyPick.recommendation.reason}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.badgeRow}>
                                    {dailyPick.recommendation.badges.map((badge) => (
                                        <View key={badge} style={[styles.smallBadge, { borderColor: themeColors.teal + '55', backgroundColor: themeColors.teal + '14' }]}>
                                            <Text style={[styles.smallBadgeText, { color: themeColors.teal }]}>{badge}</Text>
                                        </View>
                                    ))}
                                </View>
                                <Text style={[styles.dailyStreak, { color: themeColors.teal }]}>{dailyPick.subtitle}</Text>
                            </GlassCard>
                        </TouchableOpacity>
                    </View>
                )}

                {tasteProfile && (
                    <View style={styles.section}>
                        <SectionHeader title="Taste Profile" icon="sparkles" iconColor={themeColors.orange} />
                        <GlassCard padding={18}>
                            <Text style={[styles.profileTitle, { color: themeColors.textPrimary }]}>{tasteProfile.title}</Text>
                            <Text style={[styles.profileSummary, { color: themeColors.textSecondary }]}>{tasteProfile.summary}</Text>
                            <View style={styles.badgeRow}>
                                {tasteProfile.tags.map((tag) => (
                                    <View key={tag} style={[styles.smallBadge, { borderColor: themeColors.glassBorder, backgroundColor: themeColors.card }]}>
                                        <Text style={[styles.smallBadgeText, { color: themeColors.textPrimary }]}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        </GlassCard>
                    </View>
                )}

                <View style={styles.section}>
                    <GlassCard padding={20} style={styles.focusSwitchCard}>
                        <View style={styles.focusTextWrap}>
                            <Text style={[styles.focusTitle, { color: themeColors.textPrimary }]}>Focus Mode</Text>
                            <Text style={[styles.focusSubtitle, { color: themeColors.textMuted }]}>
                                Prefer shorter games you can close faster
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
                    <GlassCard padding={20}>
                        <Text style={[styles.filterLabel, { color: themeColors.textMuted }]}>Mood / Intent</Text>
                        <View style={styles.sessionChips}>
                            {MOOD_OPTIONS.map((option) => {
                                const active = mood === option.value;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.sessionChip,
                                            {
                                                backgroundColor: active ? themeColors.accent : themeColors.card,
                                                borderColor: active ? themeColors.accent : themeColors.glassBorder,
                                            },
                                        ]}
                                        onPress={() => setMood(option.value)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.sessionChipText, { color: active ? '#fff' : themeColors.textPrimary }]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </GlassCard>
                </View>

                <View style={styles.section}>
                    <GlassCard padding={20}>
                        <Text style={[styles.filterLabel, { color: themeColors.textMuted }]}>Session Goal</Text>
                        <View style={styles.sessionChips}>
                            {GOAL_OPTIONS.map((option) => {
                                const active = goal === option.value;
                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.sessionChip,
                                            {
                                                backgroundColor: active ? themeColors.orange : themeColors.card,
                                                borderColor: active ? themeColors.orange : themeColors.glassBorder,
                                            },
                                        ]}
                                        onPress={() => setGoal(option.value)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.sessionChipText, { color: active ? '#fff' : themeColors.textPrimary }]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </GlassCard>
                </View>

                <View style={styles.section}>
                    <GlassCard padding={20}>
                        <Text style={[styles.filterLabel, { color: themeColors.textMuted }]}>Session Time</Text>
                        <View style={styles.sessionChips}>
                            {SESSION_OPTIONS.map((option) => {
                                const active = sessionHours === option.value;
                                return (
                                    <TouchableOpacity
                                        key={option.label}
                                        style={[
                                            styles.sessionChip,
                                            {
                                                backgroundColor: active ? themeColors.violet : themeColors.card,
                                                borderColor: active ? themeColors.violet : themeColors.glassBorder,
                                            },
                                        ]}
                                        onPress={() => setSessionHours(option.value)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[styles.sessionChipText, { color: active ? '#fff' : themeColors.textPrimary }]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </GlassCard>
                </View>

                {missions.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader title="Backlog Missions" icon="flag" iconColor={themeColors.green} />
                        {missions.map((mission) => (
                            <TouchableOpacity
                                key={mission.id}
                                activeOpacity={mission.gameId ? 0.82 : 1}
                                onPress={() => mission.gameId ? router.push(`/game/${mission.gameId}`) : undefined}
                            >
                                <GlassCard padding={16} style={styles.missionCard}>
                                    <Text style={[styles.missionTitle, { color: themeColors.textPrimary }]}>{mission.title}</Text>
                                    <Text style={[styles.missionDesc, { color: themeColors.textSecondary }]}>{mission.description}</Text>
                                </GlassCard>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {versus && (
                    <View style={styles.section}>
                        <SectionHeader title="Versus Picker" icon="git-compare" iconColor={themeColors.accent} />
                        <GlassCard padding={18}>
                            <Text style={[styles.versusPrompt, { color: themeColors.textPrimary }]}>{versus.prompt}</Text>
                            <View style={styles.versusRow}>
                                {[versus.left, versus.right].map((rec) => (
                                    <TouchableOpacity
                                        key={rec.game.id}
                                        style={[styles.versusCard, { borderColor: themeColors.glassBorder, backgroundColor: themeColors.card }]}
                                        onPress={() => pickVersus(rec)}
                                        activeOpacity={0.82}
                                    >
                                        <Text style={[styles.versusTitle, { color: themeColors.textPrimary }]} numberOfLines={2}>
                                            {rec.game.title}
                                        </Text>
                                        <Text style={[styles.versusReason, { color: themeColors.textSecondary }]} numberOfLines={3}>
                                            {rec.reason}
                                        </Text>
                                        <View style={[styles.pickButton, { backgroundColor: themeColors.accent }]}>
                                            <Text style={styles.pickButtonText}>Pick This</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </GlassCard>
                    </View>
                )}

                {collections.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader title="Smart Collections" icon="albums" iconColor={themeColors.blue} />
                        {collections.map((collection) => (
                            <GlassCard key={collection.id} padding={18} style={styles.collectionCard}>
                                <Text style={[styles.collectionTitle, { color: themeColors.textPrimary }]}>{collection.title}</Text>
                                <Text style={[styles.collectionDesc, { color: themeColors.textSecondary }]}>{collection.description}</Text>
                                {collection.games.map((gameRec) => (
                                    <TouchableOpacity key={gameRec.game.id} onPress={() => router.push(`/game/${gameRec.game.id}`)} activeOpacity={0.82}>
                                        <View style={[styles.collectionItem, { borderTopColor: themeColors.glassBorder }]}>
                                            <Text style={[styles.collectionGame, { color: themeColors.textPrimary }]} numberOfLines={1}>
                                                {gameRec.game.title}
                                            </Text>
                                            <Text style={[styles.collectionMeta, { color: themeColors.textMuted }]}>{gameRec.reason}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </GlassCard>
                        ))}
                    </View>
                )}

                {weeklyPlan && weeklyPlan.items.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader title="Weekly Plan" icon="calendar" iconColor={themeColors.violet} />
                        <GlassCard padding={18}>
                            <Text style={[styles.planSummary, { color: themeColors.textSecondary }]}>{weeklyPlan.summary}</Text>
                            {weeklyPlan.items.map((item) => (
                                <TouchableOpacity key={item.label + item.recommendation.game.id} onPress={() => router.push(`/game/${item.recommendation.game.id}`)} activeOpacity={0.82}>
                                    <View style={[styles.planRow, { borderTopColor: themeColors.glassBorder }]}>
                                        <Text style={[styles.planLabel, { color: themeColors.violet }]}>{item.label}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.planTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
                                                {item.recommendation.game.title}
                                            </Text>
                                            <Text style={[styles.planNote, { color: themeColors.textMuted }]}>{item.note}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </GlassCard>
                    </View>
                )}

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
                        recs.map((rec) => (
                            <View key={rec.game.id} style={styles.recWrapper}>
                                <View style={[styles.reasonCard, { backgroundColor: themeColors.card, borderColor: themeColors.glassBorder }]}>
                                    <Ionicons name="sparkles" size={14} color={themeColors.violet} />
                                    <View style={styles.reasonContent}>
                                        <View style={styles.badgeRow}>
                                            {rec.badges.map((badge) => (
                                                <View key={badge} style={[styles.smallBadge, { borderColor: themeColors.accent + '55', backgroundColor: themeColors.accent + '12' }]}>
                                                    <Text style={[styles.smallBadgeText, { color: themeColors.accent }]}>{badge}</Text>
                                                </View>
                                            ))}
                                        </View>
                                        <Text style={[styles.reasonText, { color: themeColors.textPrimary }]}>
                                            {rec.reason}
                                        </Text>
                                        {rec.whyNot ? (
                                            <Text style={[styles.whyNotText, { color: themeColors.textMuted }]}>
                                                Why not #1: {rec.whyNot}
                                            </Text>
                                        ) : null}
                                    </View>
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
    subtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },
    section: { marginBottom: 24 },
    dailyHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    dailyIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    dailyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    dailySubtitle: { fontSize: 13, lineHeight: 18 },
    dailyStreak: { fontSize: 12, fontWeight: '800', marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    profileTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
    profileSummary: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
    focusSwitchCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    focusTextWrap: { flex: 1 },
    focusTitle: { fontSize: 16, fontWeight: '700' },
    focusSubtitle: { fontSize: 12, marginTop: 2 },
    filterLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    sessionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sessionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
    sessionChipText: { fontSize: 13, fontWeight: '700' },
    badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 },
    smallBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    smallBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    missionCard: { marginBottom: 10 },
    missionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 5 },
    missionDesc: { fontSize: 13, lineHeight: 19 },
    versusPrompt: { fontSize: 16, fontWeight: '800', marginBottom: 14 },
    versusRow: { flexDirection: 'row', gap: 12 },
    versusCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 14 },
    versusTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
    versusReason: { fontSize: 12, lineHeight: 18, marginBottom: 14 },
    pickButton: { height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    pickButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    collectionCard: { marginBottom: 12 },
    collectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    collectionDesc: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
    collectionItem: { paddingTop: 10, marginTop: 10, borderTopWidth: 1 },
    collectionGame: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
    collectionMeta: { fontSize: 12, lineHeight: 17 },
    planSummary: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
    planRow: { flexDirection: 'row', gap: 12, paddingTop: 12, marginTop: 12, borderTopWidth: 1 },
    planLabel: { width: 34, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    planTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
    planNote: { fontSize: 12, lineHeight: 17 },
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
    reasonContent: { flex: 1, gap: 8 },
    reasonText: { fontSize: 12, fontWeight: '600', lineHeight: 18, flex: 1 },
    whyNotText: { fontSize: 11, lineHeight: 16 },
});
