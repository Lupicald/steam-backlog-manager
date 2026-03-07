import * as SQLite from 'expo-sqlite';
import { getChallengesForMonth, upsertChallenge } from '../database/queries';
import { BacklogChallenge, Game } from '../types';

export async function getCurrentMonthChallenges(): Promise<BacklogChallenge[]> {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let challenges = getChallengesForMonth(monthYear);

    // Create default challenges if none exist
    if (challenges.length === 0) {
        const defaultChallenges: Omit<BacklogChallenge, 'id'>[] = [
            { type: 'games_completed', target: 3, progress: 0, status: 'active', month_year: monthYear },
            { type: 'hours_played', target: 30, progress: 0, status: 'active', month_year: monthYear },
            { type: 'hltb_target_met', target: 2, progress: 0, status: 'active', month_year: monthYear }
        ];

        for (const c of defaultChallenges) {
            upsertChallenge(c.type, c.target, c.progress, c.status, c.month_year);
        }

        challenges = getChallengesForMonth(monthYear);
    }

    return challenges as any;
}

export async function updateChallengeProgress(type: string, amount: number) {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const challenges = getChallengesForMonth(monthYear);

    let challenge: any = challenges.find((c: any) => c.type === type);
    if (!challenge || challenge.status !== 'active') return;

    const newProgress = Math.min(challenge.progress + amount, challenge.target);
    const newStatus = newProgress >= challenge.target ? 'completed' : 'active';

    upsertChallenge(
        challenge.type,
        challenge.target,
        newProgress,
        newStatus,
        challenge.month_year
    );
}

export function evaluateGameCompletion(game: Game) {
    if (game.status === 'completed') {
        updateChallengeProgress('games_completed', 1);

        // If we have HLTB data, check if we beat the target
        if (game.hltb_main_story && game.playtime_minutes > 0) {
            // HLTB is hours, playtime is minutes
            const hltbMinutes = game.hltb_main_story * 60;
            if (game.playtime_minutes <= hltbMinutes) {
                updateChallengeProgress('hltb_target_met', 1);
            }
        }
    }
}

export function evaluateGamingSession(durationMinutes: number) {
    const hours = durationMinutes / 60;
    updateChallengeProgress('hours_played', hours);
}
