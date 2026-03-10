/**
 * usePremium.ts
 *
 * Convenience hook for subscription state and actions.
 * Abstracts RevenueCat details so feature screens stay clean.
 *
 * Usage:
 *   const { isPremium, purchaseProduct, restorePurchases } = usePremium();
 */

import { useAppContext } from './useAppContext';
import { trackEvent } from '../services/analyticsService';

export interface UsePremiumResult {
  /** True when the user has an active "premium" entitlement. */
  isPremium: boolean;
  /** Whether a purchase / restore operation is in progress. */
  loading: boolean;
  /**
   * Present the RevenueCat Paywall.
   * Resolves after the sheet is dismissed.
   * Returns { success } — true if the user became premium.
   */
  purchaseProduct: () => Promise<{ success: boolean; error: string | null }>;
  /**
   * Restore previous purchases (no paywall UI — direct RC call).
   */
  restorePurchases: () => Promise<{ success: boolean; error: string | null }>;
  /**
   * Open the RevenueCat Customer Center (manage / cancel subscription).
   */
  openCustomerCenter: () => Promise<void>;
}

export function usePremium(): UsePremiumResult {
  const {
    isPremium,
    subscriptionLoading,
    purchasePremium,
    restorePremium,
    showCustomerCenter,
  } = useAppContext();

  const purchaseProduct = async (): Promise<{ success: boolean; error: string | null }> => {
    trackEvent('paywall_opened');
    const result = await purchasePremium();
    if (result.success) {
      trackEvent('subscription_started');
    }
    return result;
  };

  const restorePurchases = async (): Promise<{ success: boolean; error: string | null }> => {
    const result = await restorePremium();
    if (result.success) {
      trackEvent('subscription_restored');
    }
    return result;
  };

  return {
    isPremium,
    loading: subscriptionLoading,
    purchaseProduct,
    restorePurchases,
    openCustomerCenter: showCustomerCenter,
  };
}
