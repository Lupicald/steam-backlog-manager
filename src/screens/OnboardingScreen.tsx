import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAppContext } from '../hooks/useAppContext';
import { setSetting } from '../database/queries';
import { t, Language } from '../i18n';
import { TutorialOverlay } from '../components/TutorialOverlay';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DARK = {
  bg: '#0a0a14',
  card: '#12121f',
  accent: '#6366f1',
  violet: '#8b5cf6',
  teal: '#14b8a6',
  orange: '#f97316',
  textPrimary: '#f0f0f0',
  textSecondary: '#a0a0b8',
  textMuted: '#606078',
  glassBorder: '#ffffff18',
};

interface Props {
  onComplete: () => void;
}

// 0: Language, 1: Welcome, 2: Features (core), 3: Features (new), 4: Name, 5: Import, 6: Tour invite
const TOTAL_STEPS = 7;

export default function OnboardingScreen({ onComplete }: Props) {
  const { themeColors } = useAppContext();
  const C = themeColors ?? DARK;

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [playerName, setPlayerName] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateToStep = (next: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(() => setCurrentStep(next), 160);
  };

  const goNext = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      animateToStep(currentStep + 1);
    }
  };

  const handleComplete = async () => {
    setSetting('onboarding_completed', 'true');
    setSetting('player_name', playerName.trim() || 'Player');
    setSetting('app_language', selectedLanguage);
    onComplete();
  };

  const lang = selectedLanguage;

  // ── Step Dots ───────────────────────────────────────────────
  const renderDots = () => {
    if (currentStep === 0) return null;
    return (
      <View style={styles.dotsRow}>
        {Array.from({ length: TOTAL_STEPS - 1 }).map((_, i) => {
          const active = i === currentStep - 1;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: active ? C.accent : DARK.textMuted,
                  width: active ? 20 : 8,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  // ── Step 0: Language ─────────────────────────────────────────
  const renderLanguageStep = () => (
    <View style={styles.stepContainer}>
      <View style={[styles.iconCircle, { backgroundColor: C.accent + '22', borderColor: C.accent + '44' }]}>
        <Ionicons name="globe-outline" size={48} color={C.accent} />
      </View>

      <Text style={[styles.title, { color: C.textPrimary }]}>
        {t('onb_lang_title', lang)}
      </Text>
      <Text style={[styles.subtitle, { color: C.textSecondary }]}>
        {t('onb_lang_subtitle', lang)}
      </Text>

      <View style={styles.langRow}>
        <TouchableOpacity
          style={[
            styles.langCard,
            {
              backgroundColor: selectedLanguage === 'en'
                ? C.accent + '22'
                : C.card,
              borderColor: selectedLanguage === 'en' ? C.accent : DARK.glassBorder,
            },
          ]}
          onPress={() => setSelectedLanguage('en')}
          activeOpacity={0.8}
        >
          <Text style={styles.langFlag}>🇺🇸</Text>
          <Text style={[styles.langLabel, { color: C.textPrimary }]}>
            {t('onb_lang_en', lang)}
          </Text>
          {selectedLanguage === 'en' && (
            <Ionicons name="checkmark-circle" size={20} color={C.accent} style={styles.langCheck} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.langCard,
            {
              backgroundColor: selectedLanguage === 'es'
                ? C.violet + '22'
                : C.card,
              borderColor: selectedLanguage === 'es' ? C.violet : DARK.glassBorder,
            },
          ]}
          onPress={() => setSelectedLanguage('es')}
          activeOpacity={0.8}
        >
          <Text style={styles.langFlag}>🇲🇽</Text>
          <Text style={[styles.langLabel, { color: C.textPrimary }]}>
            {t('onb_lang_es', lang)}
          </Text>
          {selectedLanguage === 'es' && (
            <Ionicons name="checkmark-circle" size={20} color={C.violet} style={styles.langCheck} />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: C.accent }]}
        onPress={goNext}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>{t('onb_lang_continue', lang)}</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Step 1: Welcome ──────────────────────────────────────────
  const renderWelcomeStep = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepContainer}>
        <View style={[styles.iconCircle, { backgroundColor: C.accent + '22', borderColor: C.accent + '44' }]}>
          <Ionicons name="game-controller-outline" size={48} color={C.accent} />
        </View>

        <Text style={[styles.title, { color: C.textPrimary }]}>
          {t('onb_welcome_title', lang)}
        </Text>

        <View style={[styles.bodyCard, { backgroundColor: C.card, borderColor: DARK.glassBorder }]}>
          <Text style={[styles.bodyText, { color: C.textSecondary }]}>
            {t('onb_welcome_body', lang)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: C.accent }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{t('onb_welcome_cta', lang)}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ── Step 2: Features ─────────────────────────────────────────
  const FEATURES = [
    {
      icon: 'sparkles' as const,
      color: C.violet,
      titleKey: 'onb_feat_ai_title' as const,
      descKey: 'onb_feat_ai_desc' as const,
    },
    {
      icon: 'time-outline' as const,
      color: C.teal,
      titleKey: 'onb_feat_hltb_title' as const,
      descKey: 'onb_feat_hltb_desc' as const,
    },
    {
      icon: 'stats-chart-outline' as const,
      color: C.orange,
      titleKey: 'onb_feat_session_title' as const,
      descKey: 'onb_feat_session_desc' as const,
    },
    {
      icon: 'calendar-outline' as const,
      color: C.accent,
      titleKey: 'onb_feat_planner_title' as const,
      descKey: 'onb_feat_planner_desc' as const,
    },
  ];

  const renderFeaturesStep = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepContainer}>
        <Text style={[styles.title, { color: C.textPrimary, marginTop: 8 }]}>
          {t('onb_features_title', lang)}
        </Text>

        <View style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <View
              key={f.titleKey}
              style={[styles.featureCard, { backgroundColor: C.card, borderColor: DARK.glassBorder }]}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: f.color + '22' }]}>
                <Ionicons name={f.icon} size={24} color={f.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureTitle, { color: C.textPrimary }]}>
                  {t(f.titleKey, lang)}
                </Text>
                <Text style={[styles.featureDesc, { color: C.textSecondary }]}>
                  {t(f.descKey, lang)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: C.accent }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{t('onb_features_cta', lang)}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ── Step 3: New Features ─────────────────────────────────────
  const NEW_FEATURES = [
    {
      icon: 'wallet-outline' as const,
      color: C.teal,
      titleKey: 'onb_feat_value_title' as const,
      descKey: 'onb_feat_value_desc' as const,
    },
    {
      icon: 'flame-outline' as const,
      color: '#ff6535',
      titleKey: 'onb_feat_shame_title' as const,
      descKey: 'onb_feat_shame_desc' as const,
    },
    {
      icon: 'cart-outline' as const,
      color: C.orange,
      titleKey: 'onb_feat_advisor_title' as const,
      descKey: 'onb_feat_advisor_desc' as const,
    },
  ];

  const renderNewFeaturesStep = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepContainer}>
        <Text style={[styles.title, { color: C.textPrimary, marginTop: 8 }]}>
          {t('onb_features2_title', lang)}
        </Text>

        <View style={styles.featuresGrid}>
          {NEW_FEATURES.map((f) => (
            <View
              key={f.titleKey}
              style={[styles.featureCard, { backgroundColor: C.card, borderColor: DARK.glassBorder }]}
            >
              <View style={[styles.featureIconWrap, { backgroundColor: f.color + '22' }]}>
                <Ionicons name={f.icon} size={24} color={f.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureTitle, { color: C.textPrimary }]}>
                  {t(f.titleKey, lang)}
                </Text>
                <Text style={[styles.featureDesc, { color: C.textSecondary }]}>
                  {t(f.descKey, lang)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: C.accent }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{t('onb_features2_cta', lang)}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ── Step 4: Player Name ──────────────────────────────────────
  const renderNameStep = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.stepContainer}>
        <View style={[styles.iconCircle, { backgroundColor: C.teal + '22', borderColor: C.teal + '44' }]}>
          <Ionicons name="person-circle-outline" size={48} color={C.teal} />
        </View>

        <Text style={[styles.title, { color: C.textPrimary }]}>
          {t('onb_name_title', lang)}
        </Text>

        <TextInput
          style={[
            styles.nameInput,
            {
              backgroundColor: C.card,
              borderColor: playerName.length > 0 ? C.accent : DARK.glassBorder,
              color: C.textPrimary,
            },
          ]}
          placeholder={t('onb_name_placeholder', lang)}
          placeholderTextColor={DARK.textMuted}
          value={playerName}
          onChangeText={setPlayerName}
          autoCorrect={false}
          autoCapitalize="words"
          maxLength={32}
          returnKeyType="done"
          onSubmitEditing={goNext}
        />

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: C.accent }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{t('onb_name_cta', lang)}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goNext} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: C.textMuted }]}>
            {t('onb_name_skip', lang)}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ── Step 4: Import ───────────────────────────────────────────
  const renderImportStep = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepContainer}>
        <View style={[styles.iconCircle, { backgroundColor: C.orange + '22', borderColor: C.orange + '44' }]}>
          <Ionicons name="cloud-download-outline" size={48} color={C.orange} />
        </View>

        <Text style={[styles.title, { color: C.textPrimary }]}>
          {t('onb_import_title', lang)}
        </Text>

        <View style={[styles.bodyCard, { backgroundColor: C.card, borderColor: DARK.glassBorder }]}>
          <Text style={[styles.bodyText, { color: C.textSecondary }]}>
            {t('onb_import_body', lang)}
          </Text>
        </View>

        {/* Demo: Add Game card */}
        <View style={[styles.demoCard, { backgroundColor: C.card, borderColor: DARK.glassBorder }]}>
          <View style={[styles.demoHeader, { borderBottomColor: DARK.glassBorder }]}>
            <Ionicons name="add-circle-outline" size={18} color={C.accent} />
            <Text style={[styles.demoHeaderText, { color: C.textPrimary }]}>
              {t('onb_import_manual_title', lang)}
            </Text>
          </View>

          {/* Mock search input */}
          <View style={[styles.demoSearchBar, { backgroundColor: DARK.bg, borderColor: C.accent + '55' }]}>
            <Ionicons name="search-outline" size={16} color={DARK.textMuted} />
            <Text style={[styles.demoSearchText, { color: C.accent }]}>
              The Witcher 3
            </Text>
            <View style={[styles.demoCursor, { backgroundColor: C.accent }]} />
          </View>

          {/* Mock suggestion */}
          <View style={[styles.demoSuggestion, { backgroundColor: C.accent + '15', borderColor: C.accent + '33' }]}>
            <View style={[styles.demoGameIcon, { backgroundColor: C.violet + '33' }]}>
              <Ionicons name="game-controller-outline" size={16} color={C.violet} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.demoGameTitle, { color: C.textPrimary }]}>
                The Witcher 3: Wild Hunt
              </Text>
              <Text style={[styles.demoGameMeta, { color: C.textMuted }]}>
                PC  •  ~50h  •  RPG
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={18} color={C.teal} />
          </View>

          <Text style={[styles.demoDesc, { color: C.textSecondary }]}>
            {t('onb_import_manual_desc', lang)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: C.accent }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Ionicons name="play-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.ctaText}>{t('onb_import_cta', lang)}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ── Step 6: Tour invite ──────────────────────────────────────
  const renderTourStep = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepContainer}>
        <View style={[styles.iconCircle, { backgroundColor: C.violet + '22', borderColor: C.violet + '44' }]}>
          <Ionicons name="map-outline" size={48} color={C.violet} />
        </View>

        <Text style={[styles.title, { color: C.textPrimary }]}>
          {t('onb_tour_title', lang)}
        </Text>

        <View style={[styles.bodyCard, { backgroundColor: C.card, borderColor: DARK.glassBorder }]}>
          <Text style={[styles.bodyText, { color: C.textSecondary }]}>
            {t('onb_tour_body', lang)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: C.violet }]}
          onPress={() => setShowTutorial(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="play-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.ctaText}>{t('onb_tour_btn', lang)}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleComplete} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: C.textMuted }]}>
            {t('onb_tour_skip', lang)}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ── Render ───────────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      case 0: return renderLanguageStep();
      case 1: return renderWelcomeStep();
      case 2: return renderFeaturesStep();
      case 3: return renderNewFeaturesStep();
      case 4: return renderNameStep();
      case 5: return renderImportStep();
      case 6: return renderTourStep();
      default: return null;
    }
  };

  return (
    <>
      <LinearGradient
        colors={[DARK.bg, '#0d0d20', DARK.bg]}
        style={styles.root}
      >
        {/* Ambient glow top */}
        <View
          style={[
            styles.ambientGlow,
            { backgroundColor: C.accent + '18' },
          ]}
          pointerEvents="none"
        />

        {/* Step dots */}
        {renderDots()}

        {/* Animated step content */}
        <Animated.View style={[styles.animatedWrapper, { opacity: fadeAnim }]}>
          {renderStep()}
        </Animated.View>
      </LinearGradient>

      <TutorialOverlay
        visible={showTutorial}
        lang={selectedLanguage}
        onClose={() => {
          setShowTutorial(false);
          handleComplete();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  ambientGlow: {
    position: 'absolute',
    top: -80,
    left: SCREEN_WIDTH * 0.1,
    width: SCREEN_WIDTH * 0.8,
    height: 260,
    borderRadius: 130,
    opacity: 0.6,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 56,
    paddingBottom: 4,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  animatedWrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 20,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: -8,
  },
  langRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  langCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  langFlag: {
    fontSize: 40,
  },
  langLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  langCheck: {
    marginTop: 2,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  bodyCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
  },
  featuresGrid: {
    width: '100%',
    gap: 12,
  },
  featureCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  nameInput: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 15,
    fontSize: 17,
    fontWeight: '500',
  },
  demoCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  demoHeaderText: {
    fontSize: 15,
    fontWeight: '700',
  },
  demoSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  demoSearchText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  demoCursor: {
    width: 2,
    height: 18,
    borderRadius: 1,
    opacity: 0.8,
  },
  demoSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  demoGameIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoGameTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  demoGameMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  demoDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
});
