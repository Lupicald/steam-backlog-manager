import { getSetting, setSetting } from '../database/queries';

export function isPremiumUser(): boolean {
    return getSetting('is_premium') === 'true';
}

export function unlockPremium(): void {
    setSetting('is_premium', 'true');
}

export function lockPremium(): void {
    setSetting('is_premium', 'false');
}
