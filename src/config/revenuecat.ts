/**
 * revenuecat.ts
 *
 * RevenueCat configuration constants.
 *
 * ⚠️  Before publishing to production:
 *    1. Go to RevenueCat Dashboard → Apps → BacklogFlow (Android)
 *    2. Copy the Google Play API key (starts with "goog_" for Android or "appl_" for iOS)
 *    3. Replace the value below (or wire it through expo-constants / env vars)
 *
 * The current key is a TEST key — safe for internal testing, but
 * billing will not be active for real users until swapped.
 */

export const RC_ANDROID_API_KEY = 'goog_IvHJULqJCHsOQPJkLzMuYfLhkFx';
export const RC_IOS_API_KEY = 'test_IRoJyPXslDGSoKPAztkeEHieVlp';

/** The entitlement identifier configured in the RevenueCat dashboard. */
export const RC_ENTITLEMENT_ID = 'premium';

/**
 * Product identifiers — must match exactly what is set up in
 * Google Play Console → Subscriptions / In-app products.
 */
export const RC_PRODUCTS = {
  MONTHLY: 'backlogflow_premium_monthly',
  YEARLY: 'backlogflow_premium_yearly',
  LIFETIME: 'backlogflow_premium_lifetime',
} as const;
