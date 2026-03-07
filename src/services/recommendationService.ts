import { getCandidatesForRecommendation } from '../database/queries';
import { Game, Recommendation } from '../types';

/**
 * Advanced Recommendation Engine.
 * 
 * Factors:
 * 1. Priority (High/Medium/Low)
 * 2. Completion Time (Shorter = higher score)
 * 3. Recent play (Started games get a boost if played recently)
 * 4. Stale progress (Started but abandoned/paused)
 */
export function getTopRecommendations(availableTimeHours?: number): Recommendation[] {
    const candidates = getCandidatesForRecommendation();
    console.log(`\n[AI Picker Logger] Analyzed ${candidates.length} candidate games.`);

    let filtered = candidates;

    // ----- Session Mode Filter -----
    if (availableTimeHours) {
        filtered = candidates.filter(game => {
            const hltbSeconds = game.hltb_main_story || game.hltb_completionist || 0;
            const hltbHours = hltbSeconds / 3600;
            const playedHours = game.playtime_minutes / 60;
            // Only count games with known HLTB
            if (hltbHours === 0) return false;

            const remainingHours = Math.max(0, hltbHours - playedHours);
            return remainingHours > 0 && remainingHours <= (availableTimeHours * 5);
        });
        console.log(`[AI Picker Logger] Session Mode (${availableTimeHours}h): Filtered out ${candidates.length - filtered.length} games. Remaining: ${filtered.length}`);
    }

    const scored: Recommendation[] = filtered.map((game) => {
        let score = 0;
        let reasons: string[] = [];

        // 1. Priority Score
        let priorityMultiplier = 0;
        if (game.priority === 'high') priorityMultiplier = 3;
        else if (game.priority === 'medium') priorityMultiplier = 2;
        else if (game.priority === 'low') priorityMultiplier = 1;

        const priorityScore = priorityMultiplier * 30;
        score += priorityScore;
        if (game.priority === 'high') reasons.push('High priority');

        // 2. Playtime & Completion ratio
        const playedHours = game.playtime_minutes / 60;
        const hltbSeconds = game.hltb_main_story || game.hltb_completionist || 0;
        const hltbHours = hltbSeconds > 0 ? hltbSeconds / 3600 : 0;

        let shortGameBonus = 0;
        let unfinishedBonus = 0;

        if (hltbHours > 0) {
            shortGameBonus = (1 / hltbHours) * 40;
            score += shortGameBonus;

            if (hltbHours <= 10) {
                reasons.push('Short game');
            }

            const progress = playedHours / hltbHours;
            unfinishedBonus = progress * 20;
            score += unfinishedBonus;

            if (progress > 0) {
                reasons.push('You already started it');
            }
        }

        // 3. Inactivity Bonus
        let inactivityBonus = 0;
        if (game.last_played) {
            const lastPlayedDate = new Date(game.last_played);
            const daysSince = Math.max(0, (Date.now() - lastPlayedDate.getTime()) / (1000 * 60 * 60 * 24));
            inactivityBonus = daysSince * 0.2;
            score += inactivityBonus;

            if (daysSince > 45) {
                reasons.push('Long time since last played');
            }
        }

        if (reasons.length === 0) {
            reasons.push('Solid choice for your backlog');
        }

        console.log(`[AI Picker Logger] [${game.title}] Final Score: ${score.toFixed(1)} -> (Priority: ${priorityScore}, Short: ${shortGameBonus.toFixed(1)}, Unfinished: ${unfinishedBonus.toFixed(1)}, Inactivity: ${inactivityBonus.toFixed(1)})`);

        const reason = 'Why this game?\n' + reasons.slice(0, 3).map(r => `✔ ${r}`).join('\n');

        return { game, score, reason };
    });

    const top3 = scored.sort((a, b) => b.score - a.score).slice(0, 3);
    console.log(`[AI Picker Logger] Top 3 Winners: ${top3.map(t => t.game.title).join(', ')}\n`);

    return top3;
}

export function getFocusModeRecommendations(): Recommendation[] {
    const candidates = getCandidatesForRecommendation();

    // Filter only games shorter than 10 hours (36000 seconds)
    const filtered = candidates.filter(g => {
        const hltbSeconds = g.hltb_main_story ? g.hltb_main_story : g.hltb_completionist || 0;
        return hltbSeconds > 0 && hltbSeconds <= 36000;
    });

    // We can just reuse getTopRecommendations logic but strictly mapped to the filtered list
    // To save duplicate code, we could refactor, but for now we apply the exact same logic.
    return getTopRecommendations().filter(r => filtered.some(f => f.id === r.game.id)).slice(0, 3);
}
