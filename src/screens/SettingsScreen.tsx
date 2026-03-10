import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Linking,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { importSteamLibrary } from '../services/steamService';
import { batchEnrichHLTB } from '../services/howLongToBeatService';
import { batchEnrichPrices } from '../services/steamPriceService';
import { getSetting, setSetting, convertAllGamePrices, deleteAllLocalData } from '../database/queries';
import { getToken, setToken, clearTokens } from '../services/secureTokenService';
import { exportData, importData } from '../services/cloudSyncService';
import * as DocumentPicker from 'expo-document-picker';
import { GlassCard } from '../components/GlassCard';
import { SectionHeader } from '../components/SectionHeader';
import { LibraryManager } from '../components/LibraryManager';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { useAppContext } from '../hooks/useAppContext';
import { Theme } from '../types';
import { t, Language } from '../i18n';
import AuthScreen from '../screens/AuthScreen';

export default function SettingsScreen() {
  const { theme, themeColors, setTheme, isPremium, purchasePremium, restorePremium, showCustomerCenter, subscriptionLoading, isAuthenticated, user, signOut } = useAppContext();
  const { language = 'en', setLanguage } = useAppContext() as unknown as { language: Language, setLanguage: (l: Language) => void };
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [steamId, setSteamId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [importing, setImporting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [hltbProgress, setHltbProgress] = useState<{
    done: number;
    total: number;
    currentTitle: string;
    enriched: number;
    notFound: number;
    failed: number;
  } | null>(null);
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [priceProgress, setPriceProgress] = useState<{
    done: number;
    total: number;
    currentTitle: string;
    enriched: number;
    notFound: number;
    failed: number;
  } | null>(null);
  const [currency, setCurrency] = useState<'usd' | 'mxn'>('usd');
  const [importResult, setImportResult] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSteamId(getSetting('steam_id'));
      setCurrency((getSetting('currency') as 'usd' | 'mxn') || 'usd');

      // Load API key from secure storage
      getToken('steam', 'api_key').then(key => {
        if (key) setApiKey(key);
      });
    }, [])
  );

  const handleSave = () => {
    setSetting('steam_id', steamId.trim());
    setSetting('currency', currency);

    // Save API key to secure storage
    if (apiKey.trim()) {
      setToken('steam', 'api_key', apiKey.trim());
    } else {
      clearTokens('steam'); // Or create a specific removeToken function if needed, clearing all for steam is fine for now as it's the only one
    }

    Alert.alert(t('alert_saved', language), t('alert_saved_msg', language));
  };

  const handleImport = async () => {
    if (!steamId.trim()) {
      Alert.alert(t('alert_missing_steam', language), t('alert_missing_steam_msg', language));
      return;
    }
    setImporting(true);
    setImportResult(null);
    setProgress(null);

    // Prevent screen from sleeping during long sync
    await activateKeepAwakeAsync();

    const result = await importSteamLibrary(steamId.trim(), apiKey.trim(), (done, total) => {
      setProgress({ done, total });
    });

    setImporting(false);
    setProgress(null);
    deactivateKeepAwake();

    if (result.errors.length > 0) {
      setImportResult(`${t('sync_err_generic', language)}: ${result.errors[0]}`);
    } else {
      setImportResult(
        `${t('sync_imported_games', language)} ${result.imported} ${t('lib_games', language)}. ${result.skipped > 0 ? `(${result.skipped} ${t('sync_skipped_games', language)})` : ''}`
      );
    }
  };

  const handleEnrichHLTB = async () => {
    setEnriching(true);
    setProgress(null);
    setHltbProgress(null);

    // Prevent screen from sleeping during HLTB sync
    await activateKeepAwakeAsync();

    const result = await batchEnrichHLTB((next) => {
      setHltbProgress(next);
    });

    setEnriching(false);
    setProgress(null);
    setHltbProgress(null);
    deactivateKeepAwake();

    Alert.alert(
      t('alert_hltb_done', language),
      result.stoppedEarly
        ? `${t('sync_done_success', language)} ${result.enriched} ${t('sync_done_successfully', language)}, ${result.notFound} ${t('sync_done_not_found', language)} ${t('auth_or', language)} ${result.failed} ${t('sync_done_errors', language)}. ${t('sync_done_last_err', language)}: ${result.lastErrorMessage ?? t('eb_unknown', language)}`
        : `${t('sync_done_success', language)} ${result.enriched} ${t('sync_done_successfully', language)} ${t('auth_or', language)} ${result.notFound} ${t('sync_done_not_found', language)}.${result.failed > 0 ? ` ${result.failed} ${t('sync_done_errors', language)}.` : ''}`
    );
  };

  const handleEnrichPrices = async () => {
    setFetchingPrices(true);
    setPriceProgress(null);

    await activateKeepAwakeAsync();

    const result = await batchEnrichPrices((next) => {
      setPriceProgress(next);
    });

    setFetchingPrices(false);
    setPriceProgress(null);
    deactivateKeepAwake();

    Alert.alert(
      t('alert_prices_done', language),
      result.stoppedEarly
        ? `${t('sync_done_success', language)} ${result.enriched} ${t('sync_done_successfully', language)}, ${result.notFound} ${t('sync_done_not_found', language)}. ${t('sync_done_last_err', language)}: ${result.lastErrorMessage ?? t('eb_unknown', language)}`
        : `${t('sync_done_success', language)} ${result.enriched} ${t('sync_done_successfully', language)}. (${result.notFound} ${t('sync_done_free', language)}).`
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      t('set_delete_all_confirm_title', language),
      t('set_delete_all_confirm_msg', language),
      [
        { text: t('mgm_cancel', language), style: 'cancel' },
        {
          text: t('set_delete_all_btn', language),
          style: 'destructive',
          onPress: () => {
            try {
              deleteAllLocalData();
              Alert.alert(t('set_delete_all', language), t('set_delete_all_done', language));
              // Trigger full re-mount by resetting onboarding flag (handled by RootLayout)
              setSetting('onboarding_completed', 'false');
              setSetting('auth_prompted', 'false');
            } catch (e) {
              Alert.alert(t('sync_err_generic', language), t('sync_err_erase', language));
            }
          },
        },
      ]
    );
  };

  const handleCurrencyChange = (newCurrency: 'usd' | 'mxn') => {
    if (newCurrency === currency) return;

    if (fetchingPrices) {
      Alert.alert(
        t('set_currency_warn_scan', language),
        t('set_currency_warn_scan_msg', language)
      );
      return;
    }

    Alert.alert(
      t('set_currency_change_title', language),
      t('set_currency_change_msg', language),
      [
        { text: t('share_back', language), style: 'cancel' },
        {
          text: t('set_currency_convert', language),
          style: 'destructive',
          onPress: () => {
            const multiplier = newCurrency === 'mxn' ? 20.3 : (1 / 20.3);
            convertAllGamePrices(multiplier);
            setCurrency(newCurrency);
            setSetting('currency', newCurrency);
          }
        }
      ]
    );
  };

  const handleExportBackup = async () => {
    try {
      const path = await exportData();
      Alert.alert(t('alert_export_ok', language), `Data exported to ${path}`);
    } catch (e) {
      Alert.alert(t('alert_export_fail', language), t('alert_export_fail_msg', language));
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const path = result.assets[0].uri;
      const success = await importData(path);
      if (success) {
        Alert.alert(t('alert_import_ok', language), t('alert_import_ok_msg', language));
      } else {
        Alert.alert(t('alert_import_fail', language), t('alert_import_fail_msg', language));
      }
    } catch (e) {
      Alert.alert(t('alert_import_fail', language), t('alert_import_fail_msg', language));
    }
  };

  const progressPct =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <View style={[styles.root, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[themeColors.bg, themeColors.card]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>{t('set_title', language)}</Text>
          <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>{t('set_subtitle', language)}</Text>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <SectionHeader title={t('set_account', language)} icon="person-circle-outline" iconColor={themeColors.teal} />
          <GlassCard padding={16}>
            {isAuthenticated ? (
              <View style={styles.accountRow}>
                <View style={[styles.accountAvatar, { backgroundColor: themeColors.teal + '22' }]}>
                  <Ionicons name="person" size={20} color={themeColors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accountEmail, { color: themeColors.textPrimary }]} numberOfLines={1}>
                    {user?.email ?? ''}
                  </Text>
                  <Text style={[styles.accountSub, { color: themeColors.teal }]}>
                    {t('set_account_signed_in_as', language)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      t('set_account_sign_out_confirm', language),
                      t('set_account_sign_out_msg', language),
                      [
                        { text: language === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
                        { text: t('set_account_sign_out', language), style: 'destructive', onPress: signOut },
                      ]
                    )
                  }
                  style={[styles.signOutBtn, { borderColor: themeColors.red + '55', backgroundColor: themeColors.red + '11' }]}
                >
                  <Text style={[styles.signOutText, { color: themeColors.red }]}>{t('set_account_sign_out', language)}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={[styles.helpText, { marginBottom: 12 }]}>{t('set_account_sign_in_desc', language)}</Text>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: themeColors.teal + '44', backgroundColor: themeColors.teal + '16' }]}
                  onPress={() => setAuthModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add-outline" size={16} color={themeColors.teal} />
                  <Text style={[styles.actionBtnText, { color: themeColors.teal }]}>{t('set_account_sign_in_btn', language)}</Text>
                </TouchableOpacity>
              </>
            )}
          </GlassCard>
        </View>

        {/* Auth Modal */}
        <Modal visible={authModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAuthModalVisible(false)}>
          <AuthScreen onSuccess={() => setAuthModalVisible(false)} onSkip={() => setAuthModalVisible(false)} />
        </Modal>

        {/* Premium Lock */}
        {!isPremium && (
          <View style={styles.section}>
            <GlassCard padding={20} intensity={30} borderColor={themeColors.accent} style={{ overflow: 'hidden' }}>
              <LinearGradient colors={[`${themeColors.accent}33`, 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={styles.premiumHeader}>
                <Ionicons name="star" size={24} color={themeColors.accent} />
                <Text style={[styles.premiumTitle, { color: themeColors.textPrimary }]}>{t('set_premium_title', language)}</Text>
              </View>
              <Text style={[styles.premiumDesc, { color: themeColors.textSecondary }]}>
                {t('set_premium_desc', language)}
              </Text>
              <TouchableOpacity style={[styles.unlockBtn, { backgroundColor: themeColors.accent }]} onPress={purchasePremium} disabled={subscriptionLoading}>
                {subscriptionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.unlockBtnText}>{t('ai_subscribe', language)}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.restoreBtn]} onPress={restorePremium} disabled={subscriptionLoading}>
                <Text style={[styles.restoreBtnText, { color: themeColors.textMuted }]}>{t('set_restore', language)}</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        )}

        {/* Manage Subscription (premium users) */}
        {isPremium && (
          <View style={styles.section}>
            <GlassCard padding={16} intensity={20} borderColor={themeColors.accent + '44'}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Ionicons name="star" size={18} color={themeColors.accent} />
                <Text style={[styles.fieldLabel, { color: themeColors.accent, fontSize: 15 }]}>
                  {language === 'es' ? 'BacklogFlow Premium Activo' : 'BacklogFlow Premium Active'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: themeColors.accent + '44', backgroundColor: themeColors.accent + '16' }]}
                onPress={showCustomerCenter}
                activeOpacity={0.8}
              >
                <Ionicons name="settings-outline" size={16} color={themeColors.accent} />
                <Text style={[styles.actionBtnText, { color: themeColors.accent }]}>
                  {language === 'es' ? 'Gestionar Suscripción' : 'Manage Subscription'}
                </Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        )}

        {/* Theme Settings */}
        {isPremium && (
          <View style={styles.section}>
            <SectionHeader title={t('set_app_theme', language)} icon="color-palette" iconColor={themeColors.violet} />
            <GlassCard padding={16}>
              <View style={styles.themeGrid}>
                {['dark', 'light', 'cyberpunk', 'neon', 'oled', 'retro', 'ps_blue'].map((tName) => {
                  const active = theme === tName;
                  return (
                    <TouchableOpacity
                      key={tName}
                      style={[
                        styles.themeItem,
                        { borderColor: active ? themeColors.accent : themeColors.glassBorder },
                        active && { backgroundColor: themeColors.accent + '22' }
                      ]}
                      onPress={() => setTheme(tName as Theme)}
                    >
                      <Text style={[styles.themeLabel, { color: active ? themeColors.accent : themeColors.textMuted }]}>
                        {tName.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </GlassCard>
          </View>
        )}

        {/* Language */}
        <View style={styles.section}>
          <GlassCard padding={16}>
            <View style={[styles.row, { borderBottomColor: themeColors.glassBorder }]}>
              <Text style={[styles.rowLabel, { color: themeColors.textPrimary }]}>
                {t('set_language', language)}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['en', 'es'] as const).map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    onPress={() => setLanguage(lang)}
                    style={[
                      styles.langBtn,
                      {
                        backgroundColor: language === lang ? themeColors.accent : themeColors.card,
                        borderColor: themeColors.glassBorder,
                      }
                    ]}
                  >
                    <Text style={{ color: language === lang ? '#fff' : themeColors.textPrimary, fontWeight: '700', fontSize: 13 }}>
                      {lang === 'en' ? 'EN' : 'ES'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Cloud Sync */}
        {isPremium && (
          <View style={styles.section}>
            <SectionHeader title={t('set_cloud_sync', language)} icon="cloud-done-outline" iconColor={themeColors.teal} />
            <GlassCard padding={16}>
              <Text style={styles.helpText}>
                {t('set_cloud_desc', language)}
              </Text>
              <View style={{ gap: 10 }}>
                <ActionButton
                  label={t('set_export_backup', language)}
                  icon="arrow-down-circle-outline"
                  color={themeColors.blue}
                  loading={false}
                  onPress={handleExportBackup}
                />
                <ActionButton
                  label={t('set_import_backup', language)}
                  icon="arrow-up-circle-outline"
                  color={themeColors.teal}
                  loading={false}
                  onPress={handleImportBackup}
                />
              </View>
            </GlassCard>
          </View>
        )}

        {/* Game Libraries (GOG, Epic, Steam status) */}
        <View style={styles.section}>
          <LibraryManager />
        </View>

        {/* Steam config */}
        <View style={styles.section}>
          <SectionHeader title={t('set_steam_account', language)} icon="logo-steam" iconColor={themeColors.blue} />
          <GlassCard padding={16}>
            <FieldLabel
              label={t('set_steam_id_label', language)}
              hint={t('set_steam_id_hint', language)}
            />
            <InputField
              value={steamId}
              onChangeText={setSteamId}
              placeholder="76561198xxxxxxxxx"
              autoCapitalize="none"
            />

            <View style={{ height: 14 }} />

            <FieldLabel
              label={t('set_api_key_label', language)}
              hint={t('set_api_key_hint', language)}
              hintLink="https://steamcommunity.com/dev/apikey"
            />
            <InputField
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              autoCapitalize="none"
              secureTextEntry
            />

            <View style={{ height: 14 }} />

            <FieldLabel
              label={t('set_currency_label', language)}
              hint={t('set_currency_hint', language)}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => handleCurrencyChange('usd')}
                style={[
                  styles.langBtn,
                  { backgroundColor: currency === 'usd' ? themeColors.accent : 'transparent', borderColor: themeColors.glassBorder }
                ]}
              >
                <Text style={{ color: currency === 'usd' ? '#fff' : themeColors.textPrimary, fontWeight: '700' }}>USD</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleCurrencyChange('mxn')}
                style={[
                  styles.langBtn,
                  { backgroundColor: currency === 'mxn' ? themeColors.accent : 'transparent', borderColor: themeColors.glassBorder }
                ]}
              >
                <Text style={{ color: currency === 'mxn' ? '#fff' : themeColors.textPrimary, fontWeight: '700' }}>MXN</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: themeColors.accent }]} onPress={handleSave} activeOpacity={0.8}>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>{t('set_save_settings', language)}</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Import */}
        <View style={styles.section}>
          <SectionHeader title={t('set_steam_import', language)} icon="cloud-download" iconColor={themeColors.teal} />
          <GlassCard padding={16}>
            <Text style={styles.helpText}>
              {t('set_steam_help', language)}{' '}<Text style={{ color: themeColors.green }}>{t('set_steam_public', language)}</Text>.
            </Text>
            <Text style={[styles.helpText, { marginTop: 6, color: themeColors.teal }]}>
              {t('set_steam_reimport_hint', language)}
            </Text>

            {/* Progress bar */}
            {(importing || enriching) && progress && (
              <View style={styles.progressWrap}>
                <View style={[styles.progressTrack, { backgroundColor: themeColors.glassBorder }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPct}%`, backgroundColor: themeColors.teal },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {progress.done} / {progress.total}
                </Text>
              </View>
            )}

            {importResult && (
              <View
                style={[
                  styles.resultChip,
                  importResult.startsWith('Error')
                    ? { borderColor: themeColors.red + '55', backgroundColor: themeColors.red + '11' }
                    : { borderColor: themeColors.green + '55', backgroundColor: themeColors.green + '11' },
                ]}
              >
                <Ionicons
                  name={importResult.startsWith('Error') ? 'close-circle' : 'checkmark-circle'}
                  size={14}
                  color={importResult.startsWith('Error') ? themeColors.red : themeColors.green}
                />
                <Text
                  style={[
                    styles.resultText,
                    { color: importResult.startsWith('Error') ? themeColors.red : themeColors.green },
                  ]}
                >
                  {importResult}
                </Text>
              </View>
            )}

            <ActionButton
              label={t('set_steam_import_btn', language)}
              icon="refresh-outline"
              color={themeColors.teal}
              loading={importing}
              onPress={handleImport}
            />
          </GlassCard>
        </View>

        {/* HLTB */}
        <View style={styles.section}>
          <SectionHeader
            title={t('set_hltb', language)}
            icon="time"
            iconColor={themeColors.violet}
          />
          <GlassCard padding={16}>
            <Text style={styles.helpText}>
              {t('set_hltb_help', language)}
            </Text>

            {enriching && hltbProgress && (
              <View style={styles.progressWrap}>
                <View style={[styles.progressTrack, { backgroundColor: themeColors.glassBorder }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round((hltbProgress.done / hltbProgress.total) * 100)}%`,
                        backgroundColor: themeColors.violet,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
                  {hltbProgress.currentTitle}
                </Text>
                <Text style={[styles.progressLabel, { color: themeColors.textMuted }]}>
                  {hltbProgress.done} / {hltbProgress.total} {t('set_processed', language)} · {hltbProgress.total - hltbProgress.done} {t('set_remaining_count', language)}
                </Text>
                <Text style={[styles.progressLabel, { color: themeColors.textMuted }]}>
                  {hltbProgress.enriched} {t('set_successful', language)} · {hltbProgress.notFound} {t('set_not_found', language)} · {hltbProgress.failed} {t('set_errors', language)}
                </Text>
              </View>
            )}

            <ActionButton
              label={t('set_sync_hltb', language)}
              icon="sync-outline"
              color={themeColors.violet}
              loading={enriching}
              onPress={handleEnrichHLTB}
            />
          </GlassCard>
        </View>

        {/* Library Value */}
        <View style={styles.section}>
          <SectionHeader
            title={t('lbl_library_value', language)}
            icon="cash-outline"
            iconColor={themeColors.green}
          />
          <GlassCard padding={16}>
            <Text style={styles.helpText}>
              {t('set_library_value_help', language)}
            </Text>

            {fetchingPrices && priceProgress && (
              <View style={styles.progressWrap}>
                <View style={[styles.progressTrack, { backgroundColor: themeColors.glassBorder }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round((priceProgress.done / priceProgress.total) * 100)}%`,
                        backgroundColor: themeColors.green,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
                  {priceProgress.currentTitle}
                </Text>
                <Text style={[styles.progressLabel, { color: themeColors.textMuted }]}>
                  {priceProgress.done} / {priceProgress.total} {t('set_processed', language)}
                </Text>
                <Text style={[styles.progressLabel, { color: themeColors.textMuted }]}>
                  {priceProgress.enriched} {t('set_successful', language)} · {priceProgress.notFound} {t('set_not_found', language)}
                </Text>
              </View>
            )}

            <ActionButton
              label={t('set_library_value', language)}
              icon="sync-outline"
              color={themeColors.green}
              loading={fetchingPrices}
              onPress={handleEnrichPrices}
            />
          </GlassCard>
        </View>

        {/* About */}
        <View style={styles.section}>
          <SectionHeader title={t('set_about', language)} icon="information-circle" iconColor={themeColors.accent} />

          <GlassCard padding={16}>
            <InfoRow label={t('set_version', language)} value="1.0.0" />
            <InfoRow label={t('set_developer', language)} value="BacklogFlow / MILS" />
            <InfoRow label={t('set_built_with', language)} value="React Native + Expo" />
            <InfoRow label={t('set_storage', language)} value="Offline-first SQLite" />
          </GlassCard>

          <TouchableOpacity
            style={[styles.tourBtn, { backgroundColor: themeColors.violet + '22', borderColor: themeColors.violet + '55' }]}
            onPress={() => setShowTutorial(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={18} color={themeColors.violet} />
            <Text style={[styles.tourBtnText, { color: themeColors.violet }]}>
              {language === 'es' ? 'Tour de la App' : 'App Tour'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subscription & Legal */}
        <View style={styles.section}>
          <SectionHeader
            title={language === 'es' ? 'Suscripción y Legal' : 'Subscription & Legal'}
            icon="document-text-outline"
            iconColor={themeColors.teal}
          />
          <GlassCard padding={16}>
            {/* Restore purchases — always visible so users can reclaim access */}
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: themeColors.teal + '44', backgroundColor: themeColors.teal + '16', marginBottom: 10 }]}
              onPress={async () => {
                const result = await restorePremium();
                if (result.success) {
                  Alert.alert(
                    language === 'es' ? 'Compras restauradas' : 'Purchases restored',
                    language === 'es' ? 'Tu acceso Premium ha sido restaurado.' : 'Your Premium access has been restored.',
                  );
                } else {
                  Alert.alert(
                    language === 'es' ? 'Sin compras' : 'Nothing to restore',
                    result.error ?? (language === 'es' ? 'No se encontró suscripción activa.' : 'No active subscription found.'),
                  );
                }
              }}
              disabled={subscriptionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-circle-outline" size={16} color={themeColors.teal} />
              <Text style={[styles.actionBtnText, { color: themeColors.teal }]}>
                {subscriptionLoading
                  ? (language === 'es' ? 'Restaurando…' : 'Restoring…')
                  : (language === 'es' ? 'Restaurar compras' : 'Restore purchases')}
              </Text>
            </TouchableOpacity>

            {/* Legal links */}
            {[
              {
                label: language === 'es' ? 'Política de Privacidad' : 'Privacy Policy',
                icon: 'shield-checkmark-outline' as const,
                url: 'https://www.notion.so/BacklogFlow-Privacy-Policy-31ed90ccdf658095b9e6ce948d38b762',
              },
              {
                label: language === 'es' ? 'Términos de Servicio' : 'Terms of Service',
                icon: 'document-text-outline' as const,
                url: 'https://backlogflow.app/terms',
              },
              {
                label: language === 'es' ? 'Términos de Suscripción' : 'Subscription Terms',
                icon: 'card-outline' as const,
                url: 'https://backlogflow.app/subscription-terms',
              },
            ].map(({ label, icon, url }) => (
              <TouchableOpacity
                key={label}
                style={[styles.legalRow, { borderTopColor: themeColors.glassBorder }]}
                onPress={() => Linking.openURL(url)}
                activeOpacity={0.7}
              >
                <Ionicons name={icon} size={15} color={themeColors.textMuted} />
                <Text style={[styles.legalRowText, { color: themeColors.textSecondary }]}>{label}</Text>
                <Ionicons name="chevron-forward" size={13} color={themeColors.textMuted} />
              </TouchableOpacity>
            ))}

            <Text style={[styles.helpText, { marginTop: 12, fontSize: 11, lineHeight: 17 }]}>
              {language === 'es'
                ? 'Las suscripciones se renuevan automáticamente salvo que se cancelen 24h antes del período de renovación. Gestiona tu suscripción en los ajustes de tu dispositivo.'
                : 'Subscriptions auto-renew unless cancelled 24 h before the renewal date. Manage your subscription in your device settings.'}
            </Text>
          </GlassCard>
        </View>

        {/* Privacy & Data */}
        <View style={styles.section}>
          <SectionHeader title={t('set_privacy_title', language)} icon="shield-checkmark-outline" iconColor={themeColors.teal} />
          <GlassCard padding={16}>
            <Text style={[styles.helpText, { lineHeight: 22 }]}>
              {(t('set_privacy_body', language) as string)}
            </Text>
            <Text style={[styles.helpText, { marginTop: 10, color: themeColors.textMuted, fontSize: 11 }]}>
              {t('set_privacy_updated', language)}
            </Text>
          </GlassCard>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <SectionHeader title={t('set_danger_zone', language)} icon="warning-outline" iconColor={themeColors.red} />
          <GlassCard padding={16}>
            <Text style={[styles.helpText, { color: themeColors.textSecondary }]}>
              {t('set_delete_all_desc', language)}
            </Text>
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: themeColors.red + '66', backgroundColor: themeColors.red + '15' }]}
              onPress={handleDeleteAll}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color={themeColors.red} />
              <Text style={[styles.deleteBtnText, { color: themeColors.red }]}>
                {t('set_delete_all', language)}
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TutorialOverlay visible={showTutorial} onClose={() => setShowTutorial(false)} />
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ label, hint, hintLink }: { label: string; hint?: string; hintLink?: string; }) {
  const { themeColors } = useAppContext();
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>{label}</Text>
      {hint && (
        <TouchableOpacity
          disabled={!hintLink}
          onPress={() => hintLink && Linking.openURL(hintLink)}
        >
          <Text style={[styles.fieldHint, { color: themeColors.textMuted }, hintLink ? { color: themeColors.accent } : undefined]}>{hint}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function InputField(props: React.ComponentProps<typeof TextInput>) {
  const { themeColors } = useAppContext();
  return (
    <View style={[styles.inputWrap, { borderColor: themeColors.glassBorder, backgroundColor: themeColors.glass }]}>
      <TextInput
        style={[styles.input, { color: themeColors.textPrimary }]}
        placeholderTextColor={themeColors.textMuted}
        {...props}
      />
    </View>
  );
}

function ActionButton({
  label,
  icon,
  color,
  loading,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  loading: boolean;
  onPress: () => void;
}) {
  const { language = 'en' } = useAppContext() as any;
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { borderColor: color + '44', backgroundColor: color + '16' }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <Ionicons name={icon} size={16} color={color} />
      )}
      <Text style={[styles.actionBtnText, { color }]}>{loading ? t('set_working', language) : label}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { themeColors } = useAppContext();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>{value}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 60, paddingHorizontal: 20 },
  header: { marginBottom: 24 },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: { fontSize: 13, marginTop: 2 },
  section: { marginBottom: 24 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  fieldHint: { fontSize: 11 },
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  input: { fontSize: 14 },
  saveBtn: {
    marginTop: 16,
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
    color: '#88a'
  },
  progressWrap: { marginBottom: 12, gap: 4 },
  progressTrack: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressLabel: { fontSize: 11, textAlign: 'right' },
  resultChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  resultText: { fontSize: 13, flex: 1 },
  actionBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  accountEmail: { fontSize: 14, fontWeight: '600' },
  accountSub: { fontSize: 12, marginTop: 1 },
  signOutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  signOutText: { fontSize: 13, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13 },
  premiumHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  premiumTitle: { fontSize: 20, fontWeight: '800' },
  premiumDesc: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  unlockBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  unlockBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  restoreBtn: { alignItems: 'center', paddingVertical: 10 },
  restoreBtnText: { fontSize: 13 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeItem: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  themeLabel: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0 },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  langBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  tourBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 12, height: 46, borderRadius: 12, borderWidth: 1,
  },
  tourBtnText: { fontSize: 14, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 12, height: 48, borderRadius: 12, borderWidth: 1,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '700' },
  legalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderTopWidth: 1,
  },
  legalRowText: { flex: 1, fontSize: 13 },
});
