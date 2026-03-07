import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../src/hooks/useAppContext';
import { useGames } from '../src/hooks/useGames';

export default function ShareProfileScreen() {
    const { themeColors, isPremium } = useAppContext();
    const { games, stats, loading, refresh } = useGames();
    const viewShotRef = useRef<ViewShot>(null);
    const [sharing, setSharing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    if (loading || !stats) {
        return (
            <View style={[styles.root, { backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={themeColors.accent} />
            </View>
        );
    }

    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    const handleShare = async () => {
        if (!viewShotRef.current?.capture) return;
        setSharing(true);
        try {
            const uri = await viewShotRef.current.capture();
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    dialogTitle: 'Share your GameStack Profile',
                    mimeType: 'image/png'
                });
            } else {
                Alert.alert('Sharing Unavailable', 'Sharing is not supported on this device.');
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to generate shareable image.');
            console.error(e);
        } finally {
            setSharing(false);
        }
    };

    return (
        <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
            <LinearGradient colors={[themeColors.bg, themeColors.card]} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: themeColors.textPrimary }]}>Share Profile</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* The card to be captured */}
                <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
                    <View style={[styles.cardContainer, { backgroundColor: themeColors.bg }]}>
                        <LinearGradient
                            colors={[themeColors.card, `${themeColors.accent}33`]}
                            style={styles.cardGradient}
                        />

                        <View style={styles.profileHeader}>
                            <View style={[styles.avatar, { backgroundColor: themeColors.accent + '22', borderColor: themeColors.accent }]}>
                                <Ionicons name="game-controller" size={32} color={themeColors.accent} />
                            </View>
                            <View>
                                <Text style={[styles.playerName, { color: themeColors.textPrimary }]}>
                                    GameStack Player
                                </Text>
                                {isPremium && (
                                    <View style={[styles.proBadge, { backgroundColor: themeColors.accent }]}>
                                        <Text style={styles.proText}>PRO</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.statsGrid}>
                            <View style={[styles.statBox, { backgroundColor: themeColors.glassBorder }]}>
                                <Text style={[styles.statValue, { color: themeColors.accent }]}>{stats.completed}</Text>
                                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Completed</Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: themeColors.glassBorder }]}>
                                <Text style={[styles.statValue, { color: themeColors.green }]}>{stats.total}</Text>
                                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Total Games</Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: themeColors.glassBorder }]}>
                                <Text style={[styles.statValue, { color: themeColors.violet }]}>{stats.total_playtime_hours}h</Text>
                                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Playtime</Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: themeColors.glassBorder }]}>
                                <Text style={[styles.statValue, { color: themeColors.orange }]}>{stats.total_hours_remaining}h</Text>
                                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Est. Left</Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: themeColors.glassBorder }]}>
                                <Text style={[styles.statValue, { color: themeColors.teal }]}>{completionRate}%</Text>
                                <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Win Rate</Text>
                            </View>
                        </View>

                        <View style={styles.footer}>
                            <Text style={[styles.footerText, { color: themeColors.textMuted }]}>
                                Generated with GameStack
                            </Text>
                        </View>
                    </View>
                </ViewShot>

                <TouchableOpacity
                    style={[styles.shareBtn, { backgroundColor: themeColors.accent }]}
                    onPress={handleShare}
                    disabled={sharing}
                >
                    {sharing ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="share-social" size={20} color="#fff" />
                            <Text style={styles.shareText}>Share Image</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        zIndex: 10,
    },
    backBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    title: { fontSize: 20, fontWeight: '700' },
    scroll: { padding: 20 },
    cardContainer: {
        borderRadius: 24,
        overflow: 'hidden',
        padding: 24,
        position: 'relative',
        marginBottom: 24,
    },
    cardGradient: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.5,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 32,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playerName: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
    },
    proBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    proText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 32,
    },
    statBox: {
        width: '30%',
        paddingVertical: 14,
        paddingHorizontal: 6,
        borderRadius: 16,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    footerText: {
        fontSize: 12,
        fontWeight: '500',
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 56,
        borderRadius: 16,
    },
    shareText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    }
});
