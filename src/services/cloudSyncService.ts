import * as FileSystem from 'expo-file-system';
import { getDatabase } from '../database/schema';

// This is a mocked cloud backup. In a real application, this would sync with a backend server like Firebase or Supabase.

export const exportData = async (): Promise<string> => {
    try {
        const db = getDatabase();
        // getAllSync returns an array of rows
        const rows = db.getAllSync('SELECT * FROM games;');
        const backupData = JSON.stringify(rows);
        const path = `${FileSystem.documentDirectory}backup_${Date.now()}.json`;
        await FileSystem.writeAsStringAsync(path, backupData);
        return path;
    } catch (e) {
        console.error('Failed to export backup', e);
        throw e;
    }
};

export const importData = async (backupPath: string): Promise<boolean> => {
    try {
        const fileContent = await FileSystem.readAsStringAsync(backupPath);
        const data = JSON.parse(fileContent);

        const db = getDatabase();
        // A robust solution would handle conflicts (e.g., upsert based on SteamAppId or existing ID)

        // Execute inserts within a transaction for performance
        db.withTransactionSync(() => {
            const statement = db.prepareSync(
                `INSERT OR REPLACE INTO games (id, steam_app_id, title, cover_url, status, priority, platform, playtime_minutes, hltb_main_story, hltb_completionist, hltb_extra, last_played, added_at, notes, progress_percentage, sort_order, exclude_from_backlog)
                 VALUES ($id, $steam_app_id, $title, $cover_url, $status, $priority, $platform, $playtime_minutes, $hltb_main_story, $hltb_completionist, $hltb_extra, $last_played, $added_at, $notes, $progress_percentage, $sort_order, $exclude_from_backlog)`
            );

            try {
                for (const game of data) {
                    statement.executeSync({
                        $id: game.id,
                        $steam_app_id: game.steam_app_id,
                        $title: game.title,
                        $cover_url: game.cover_url,
                        $status: game.status,
                        $priority: game.priority,
                        $platform: game.platform ?? 'steam',
                        $playtime_minutes: game.playtime_minutes ?? 0,
                        $hltb_main_story: game.hltb_main_story ?? null,
                        $hltb_completionist: game.hltb_completionist ?? null,
                        $hltb_extra: game.hltb_extra ?? null,
                        $last_played: game.last_played ?? null,
                        $added_at: game.added_at,
                        $notes: game.notes ?? '',
                        $progress_percentage: game.progress_percentage ?? 0,
                        $sort_order: game.sort_order ?? 0,
                        $exclude_from_backlog: game.exclude_from_backlog ?? 0
                    });
                }
            } finally {
                statement.finalizeSync();
            }
        });

        return true;
    } catch (e) {
        console.error('Failed to import backup', e);
        return false;
    }
};
