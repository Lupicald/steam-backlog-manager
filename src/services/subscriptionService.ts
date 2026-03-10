/**
 * subscriptionService.ts
 *
 * RevenueCat-backed subscription management for MILS / BacklogFlow.
 * Entitlement: "premium" (BacklogFlow Premium)
 * Products:    monthly | yearly | lifetime
 *
 * Architecture:
 *  - RevenueCat is the source of truth for entitlement.
 *  - Local SQLite acts as a synchronous cache so the rest of the app
 *    can read `is_premium` without async calls.
 *  - Call initializeSubscriptions() once at app startup (AppProvider).
 *  - Call syncEntitlementToSettings() after any purchase/restore to
 *    keep the cache fresh.
 */

import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import { setSetting, getSetting } from '../database/queries';
import { RC_ANDROID_API_KEY, RC_IOS_API_KEY, RC_ENTITLEMENT_ID } from '../config/revenuecat';

/** The RevenueCat entitlement identifier configured in the RC dashboard. */
export const ENTITLEMENT_ID = RC_ENTITLEMENT_ID;

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PremiumStatus = 'active' | 'expired' | 'unknown';
export type PremiumProvider = 'revenuecat' | 'none';

export interface EntitlementState {
  isPremium: boolean;
  status: PremiumStatus;
  expirationAt: string | null;
}

// ─── Initialization ───────────────────────────────────────────────────────────

/**
 * Configure the RevenueCat SDK and sync entitlement from the server.
 * Must be called once during app startup before any other RC methods.
 */
export async function initializeSubscriptions(): Promise<void> {
  if (!isNative) return;

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({
    apiKey: Platform.OS === 'ios' ? RC_IOS_API_KEY : RC_ANDROID_API_KEY,
  });

  // Warm the local cache on startup.
  await syncEntitlementToSettings();
}

// ─── Entitlement state ────────────────────────────────────────────────────────

/**
 * Synchronous read from the local SQLite cache.
 * Fast and safe to call anywhere without awaiting.
 */
export function getEntitlementState(): EntitlementState {
  const isPremium = getSetting('is_premium') === 'true';
  const expirationAt = getSetting('premium_expiration_at') || null;

  let status: PremiumStatus = 'unknown';
  if (isPremium) {
    if (expirationAt) {
      status = new Date(expirationAt) > new Date() ? 'active' : 'expired';
    } else {
      status = 'active'; // lifetime — no expiry
    }
  }

  return { isPremium, status, expirationAt };
}

/**
 * Fetch CustomerInfo from RevenueCat and persist to local DB.
 * Call after any purchase, restore, or on app foreground.
 */
export async function syncEntitlementToSettings(): Promise<void> {
  if (!isNative) return;
  try {
    const info = await Purchases.getCustomerInfo();
    _applyCustomerInfo(info);
  } catch (e) {
    console.warn('[RevenueCat] syncEntitlement failed:', e);
  }
}

// ─── Offerings ────────────────────────────────────────────────────────────────

/**
 * Fetch the current RevenueCat offerings.
 * Returns null on web or on error.
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  if (!isNative) return null;
  try {
    return await Purchases.getOfferings();
  } catch (e) {
    console.warn('[RevenueCat] getOfferings failed:', e);
    return null;
  }
}

// ─── Customer Info ────────────────────────────────────────────────────────────

/**
 * Fetch fresh CustomerInfo from RevenueCat.
 * Returns null on web or on error.
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isNative) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.warn('[RevenueCat] getCustomerInfo failed:', e);
    return null;
  }
}

// ─── Purchases ────────────────────────────────────────────────────────────────

/**
 * Purchase a specific package from an Offering.
 * Syncs the result to the local cache.
 */
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<{ success: boolean; error: string | null }> {
  if (!isNative) return { success: false, error: 'Not supported on this platform.' };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    _applyCustomerInfo(customerInfo);
    return {
      success: !!customerInfo.entitlements.active[ENTITLEMENT_ID],
      error: null,
    };
  } catch (e: any) {
    if (e.userCancelled) return { success: false, error: null };
    return { success: false, error: e.message ?? 'Purchase failed.' };
  }
}

/**
 * Restore previously purchased subscriptions / lifetime purchases.
 * Syncs the result to the local cache.
 */
export async function restorePurchases(): Promise<{ success: boolean; error: string | null }> {
  if (!isNative) return { success: false, error: 'Not supported on this platform.' };
  try {
    const info = await Purchases.restorePurchases();
    _applyCustomerInfo(info);
    const isPremium = !!info.entitlements.active[ENTITLEMENT_ID];
    return {
      success: isPremium,
      error: isPremium ? null : 'No active subscription found.',
    };
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Restore failed.' };
  }
}

// ─── Customer Info Listener ───────────────────────────────────────────────────

/**
 * Register a listener that fires whenever RevenueCat pushes a
 * CustomerInfo update (e.g. after a subscription renews server-side).
 * Returns a cleanup function — call it in useEffect cleanup.
 */
export function addCustomerInfoListener(
  listener: (info: CustomerInfo) => void,
): () => void {
  if (!isNative) return () => {};
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Write CustomerInfo to the local SQLite cache. */
function _applyCustomerInfo(info: CustomerInfo): void {
  const entitlement = info.entitlements.active[ENTITLEMENT_ID];
  const isPremium = !!entitlement;
  setSetting('is_premium', isPremium ? 'true' : 'false');
  setSetting('premium_expiration_at', entitlement?.expirationDate ?? '');
}
