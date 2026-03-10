/**
 * PaywallScreen.tsx
 *
 * Custom BacklogFlow paywall — full-screen modal matching the app's
 * dark-glass design language.
 *
 * Shows three plans:  Monthly · Yearly (recommended) · Lifetime
 * Can be displayed as a modal sheet or a standalone route.
 *
 * Usage (modal):
 *   <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
 *     <PaywallScreen onClose={() => setOpen(false)} />
 *   </Modal>
 *
 * Usage (route):  src: app/paywall.tsx  → `export { default } from '../src/screens/PaywallScreen'`
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePremium } from '../hooks/usePremium';
import { useAppContext } from '../hooks/useAppContext';
import { getOfferings } from '../services/subscriptionService';
import { trackEvent } from '../services/analyticsService';
import { PurchasesPackage } from 'react-native-purchases';

// ─── Plan definitions ─────────────────────────────────────────────────────────
// Falls back to static prices if RC offerings are unavailable.

interface PlanDef {
  id: string;           // RC package identifier
  label: string;
  sublabel: string;
  price: string;        // static fallback
  perMonth?: string;
  badge?: string;
  highlight?: boolean;
}

const PLANS: PlanDef[] = [
  {
    id: 'yearly',
    label: 'Yearly',
    sublabel: 'Best value',
    price: '$249 MXN / year',
    perMonth: '≈ $20.75 MXN/mo',
    badge: 'RECOMMENDED',
    highlight: true,
  },
  {
    id: 'monthly',
    label: 'Monthly',
    sublabel: 'Flexible',
    price: '$30 MXN / month',
  },
  {
    id: 'lifetime',
    label: 'Lifetime',
    sublabel: 'Pay once, own forever',
    price: '$499 MXN',
  },
];

const BENEFITS = [
  { icon: 'sparkles' as const,           text: 'Unlimited AI Picks' },
  { icon: 'analytics' as const,          text: 'Unlimited Purchase Advisor' },
  { icon: 'bar-chart' as const,          text: 'Advanced statistics' },
  { icon: 'color-palette' as const,      text: 'All premium themes' },
  { icon: 'albums' as const,             text: 'Smart collections' },
  { icon: 'cloud-done' as const,         text: 'Automatic cloud sync' },
  { icon: 'star' as const,               text: 'Future premium features' },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onClose?: () => void;
  /** If set, show a contextual message above the plan grid (e.g. "You've used your 2 daily picks"). */
  triggerMessage?: string;
}

export default function PaywallScreen({ onClose, triggerMessage }: Props) {
  const { themeColors } = useAppContext();
  const { purchaseProduct, restorePurchases, loading, isPremium } = usePremium();

  const [selectedPlanId, setSelectedPlanId] = useState<string>('yearly');
  const [packages, setPackages] = useState<Record<string, PurchasesPackage>>({});
  const [fetchingOfferings, setFetchingOfferings] = useState(false);

  // ── Load RC offerings so we show real prices when available ──
  useEffect(() => {
    trackEvent('paywall_opened');
    if (Platform.OS === 'web') return;
    setFetchingOfferings(true);
    getOfferings().then((offerings) => {
      if (!offerings?.current?.availablePackages) return;
      const map: Record<string, PurchasesPackage> = {};
      for (const pkg of offerings.current.availablePackages) {
        // Match by identifier ($rc_monthly, $rc_annual, $rc_lifetime) or custom id
        const rawId = pkg.identifier.toLowerCase();
        if (rawId.includes('month')) map['monthly'] = pkg;
        else if (rawId.includes('annual') || rawId.includes('year')) map['yearly'] = pkg;
        else if (rawId.includes('life')) map['lifetime'] = pkg;
      }
      setPackages(map);
    }).finally(() => setFetchingOfferings(false));
  }, []);

  // ── If user just became premium, close automatically ──
  useEffect(() => {
    if (isPremium && onClose) onClose();
  }, [isPremium]);

  const handlePurchase = async () => {
    const pkg = packages[selectedPlanId];
    if (pkg) {
      // Use specific package if RC is available
      const result = await purchaseProduct();
      if (result.success) onClose?.();
      else if (result.error) Alert.alert('Purchase failed', result.error);
    } else {
      // Fallback: open RC paywall (handles native purchase + error UI)
      const result = await purchaseProduct();
      if (result.success) onClose?.();
    }
  };

  const handleRestore = async () => {
    const result = await restorePurchases();
    if (result.success) {
      Alert.alert('Purchases restored', 'Your BacklogFlow Premium access has been restored.');
      onClose?.();
    } else {
      Alert.alert(
        'Nothing to restore',
        result.error ?? 'No active subscription found for this account.',
      );
    }
  };

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) ?? PLANS[0];
  const rcPackage = packages[selectedPlanId];
  const displayPrice = rcPackage
    ? rcPackage.product.priceString
    : selectedPlan.price;

  return (
    <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
      <LinearGradient
        colors={[themeColors.accent + '22', themeColors.bg, themeColors.bg]}
        style={StyleSheet.absoluteFill}
      />

      {/* Close button */}
      {onClose && (
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color={themeColors.textMuted} />
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Hero ── */}
        <View style={styles.heroSection}>
          <View style={[styles.heroBadge, { backgroundColor: themeColors.accent + '22', borderColor: themeColors.accent + '55' }]}>
            <Ionicons name="star" size={14} color={themeColors.accent} />
            <Text style={[styles.heroBadgeText, { color: themeColors.accent }]}>BacklogFlow Premium</Text>
          </View>
          <Text style={[styles.heroTitle, { color: themeColors.textPrimary }]}>
            Play smarter.{'\n'}Finish more.
          </Text>
          <Text style={[styles.heroSubtitle, { color: themeColors.textMuted }]}>
            Unlock everything BacklogFlow has to offer.
          </Text>
        </View>

        {/* ── Trigger message ── */}
        {triggerMessage && (
          <View style={[styles.triggerBanner, { backgroundColor: themeColors.orange + '18', borderColor: themeColors.orange + '44' }]}>
            <Ionicons name="lock-closed" size={14} color={themeColors.orange} />
            <Text style={[styles.triggerText, { color: themeColors.orange }]}>{triggerMessage}</Text>
          </View>
        )}

        {/* ── Benefits ── */}
        <View style={[styles.benefitsCard, { backgroundColor: themeColors.card, borderColor: themeColors.glassBorder }]}>
          {BENEFITS.map(({ icon, text }) => (
            <View key={text} style={styles.benefitRow}>
              <View style={[styles.benefitIconWrap, { backgroundColor: themeColors.accent + '18' }]}>
                <Ionicons name={icon} size={14} color={themeColors.accent} />
              </View>
              <Text style={[styles.benefitText, { color: themeColors.textSecondary }]}>{text}</Text>
            </View>
          ))}
        </View>

        {/* ── Plan selector ── */}
        <View style={styles.plansSection}>
          {PLANS.map((plan) => {
            const active = selectedPlanId === plan.id;
            const rcPkg = packages[plan.id];
            const price = rcPkg ? rcPkg.product.priceString : plan.price;
            const intro = rcPkg?.product.introPrice?.priceString;

            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    borderColor: active ? themeColors.accent : themeColors.glassBorder,
                    backgroundColor: active ? themeColors.accent + '14' : themeColors.card,
                  },
                ]}
                onPress={() => setSelectedPlanId(plan.id)}
                activeOpacity={0.8}
              >
                {plan.badge && (
                  <View style={[styles.planBadge, { backgroundColor: themeColors.accent }]}>
                    <Text style={styles.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}

                <View style={styles.planRow}>
                  {/* Radio */}
                  <View style={[styles.radio, { borderColor: active ? themeColors.accent : themeColors.glassBorder }]}>
                    {active && <View style={[styles.radioDot, { backgroundColor: themeColors.accent }]} />}
                  </View>

                  {/* Labels */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planLabel, { color: themeColors.textPrimary }]}>{plan.label}</Text>
                    <Text style={[styles.planSublabel, { color: themeColors.textMuted }]}>
                      {intro ? `Free trial: ${intro}` : plan.sublabel}
                    </Text>
                  </View>

                  {/* Price */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.planPrice, { color: active ? themeColors.accent : themeColors.textPrimary }]}>
                      {price}
                    </Text>
                    {plan.perMonth && (
                      <Text style={[styles.planPerMonth, { color: themeColors.textMuted }]}>{plan.perMonth}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── CTA ── */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: themeColors.accent, opacity: loading ? 0.7 : 1 }]}
          onPress={handlePurchase}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="star" size={18} color="#fff" />
              <Text style={styles.ctaBtnText}>
                Get Premium · {displayPrice}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Restore ── */}
        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={loading}>
          <Text style={[styles.restoreText, { color: themeColors.textMuted }]}>
            Restore purchases
          </Text>
        </TouchableOpacity>

        {/* ── Legal ── */}
        <Text style={[styles.legalText, { color: themeColors.textMuted }]}>
          Subscriptions auto-renew unless cancelled 24h before the renewal date.
          Manage or cancel anytime in your device's subscription settings.
          By continuing you agree to our{' '}
          <Text style={{ color: themeColors.accent }}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={{ color: themeColors.accent }}>Privacy Policy</Text>.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 56 },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // ── Hero ──────────────────────────────────────────────────────────
  heroSection: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  heroBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  heroTitle: { fontSize: 34, fontWeight: '900', letterSpacing: -1, textAlign: 'center', lineHeight: 40 },
  heroSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // ── Trigger ───────────────────────────────────────────────────────
  triggerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16,
  },
  triggerText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // ── Benefits ──────────────────────────────────────────────────────
  benefitsCard: {
    borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 20, gap: 10,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  benefitText: { fontSize: 14, flex: 1 },

  // ── Plans ─────────────────────────────────────────────────────────
  plansSection: { gap: 10, marginBottom: 20 },
  planCard: {
    borderRadius: 16, borderWidth: 1.5, padding: 14, overflow: 'hidden',
  },
  planBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, marginBottom: 8,
  },
  planBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  planLabel: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  planSublabel: { fontSize: 11 },
  planPrice: { fontSize: 14, fontWeight: '800' },
  planPerMonth: { fontSize: 10, marginTop: 1 },

  // ── CTA ───────────────────────────────────────────────────────────
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 58, borderRadius: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  ctaBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },

  // ── Restore ───────────────────────────────────────────────────────
  restoreBtn: { alignItems: 'center', paddingVertical: 10 },
  restoreText: { fontSize: 13 },

  // ── Legal ─────────────────────────────────────────────────────────
  legalText: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 8 },
});
