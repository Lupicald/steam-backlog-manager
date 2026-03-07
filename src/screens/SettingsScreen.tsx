import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { importSteamLibrary } from '../../src/services/steamService';
import { batchEnrichHLTB } from '../../src/services/howLongToBeatService';
import { getSetting, setSetting } from '../../src/database/queries';
import { exportData, importData } from '../../src/services/cloudSyncService';
import * as DocumentPicker from 'expo-document-picker';
import { GlassCard } from '../../src/components/GlassCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { useAppContext } from '../../src/hooks/useAppContext';
import { Theme } from '../../src/types';

export default function SettingsScreen() {
  const { theme, themeColors, setTheme, isPremium, unlockPremium } = useAppContext();
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
  const [importResult, setImportResult] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSteamId(getSetting('steam_id'));
      setApiKey(getSetting('steam_api_key'));
    }, [])
  );

  const handleSave = () => {
    setSetting('steam_id', steamId.trim());
    setSetting('steam_api_key', apiKey.trim());
    Alert.alert('Saved', 'Steam settings saved.');
  };

  const handleImport = async () => {
    if (!steamId.trim()) {
      Alert.alert('Missing SteamID', 'Enter your SteamID or profile URL first.');
      return;
    }
    setImporting(true);
    setImportResult(null);
    setProgress(null);

    const result = await importSteamLibrary(steamId.trim(), apiKey.trim(), (done, total) => {
      setProgress({ done, total });
    });

    setImporting(false);
    setProgress(null);

    if (result.errors.length > 0) {
      setImportResult(`Error: ${result.errors[0]}`);
    } else {
      setImportResult(
        `Imported ${result.imported} games. ${result.skipped > 0 ? `(${result.skipped} skipped)` : ''}`
      );
    }
  };

  const handleEnrichHLTB = async () => {
    setEnriching(true);
    setProgress(null);
    setHltbProgress(null);
    const result = await batchEnrichHLTB((next) => {
      setHltbProgress(next);
    });
    setEnriching(false);
    setProgress(null);
    setHltbProgress(null);
    Alert.alert(
      'HLTB Sync Done',
      result.stoppedEarly
        ? `Synced ${result.enriched} successfully, ${result.notFound} not found and ${result.failed} request errors. Last error: ${result.lastErrorMessage ?? 'Unknown error'}`
        : `Synced ${result.enriched} successfully and ${result.notFound} were not found.${result.failed > 0 ? ` ${result.failed} request errors.` : ''}`
    );
  };

  const handleExportBackup = async () => {
    try {
      const path = await exportData();
      Alert.alert('Backup Exported', `Data exported to ${path}`);
    } catch (e) {
      Alert.alert('Export Failed', 'An error occurred while creating the backup.');
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const path = result.assets[0].uri;
      const success = await importData(path);
      if (success) {
        Alert.alert('Backup Imported', 'Data successfully imported from backup.');
      } else {
        Alert.alert('Import Failed', 'Failed to import backup data.');
      }
    } catch (e) {
      Alert.alert('Import Failed', 'An error occurred while importing the backup.');
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
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: themeColors.textMuted }]}>Configure your GameStack experience</Text>
        </View>

        {/* Premium Lock */}
        {!isPremium && (
          <View style={styles.section}>
            <GlassCard padding={20} intensity={30} borderColor={themeColors.accent} style={{ overflow: 'hidden' }}>
              <LinearGradient colors={[`${themeColors.accent}33`, 'transparent']} style={StyleSheet.absoluteFill} />
              <View style={styles.premiumHeader}>
                <Ionicons name="star" size={24} color={themeColors.accent} />
                <Text style={[styles.premiumTitle, { color: themeColors.textPrimary }]}>GameStack Pro</Text>
              </View>
              <Text style={[styles.premiumDesc, { color: themeColors.textSecondary }]}>
                Unlock the Smart Planner, AI Recommend Engine, advanced stats charts, and premium UI Themes.
              </Text>
              <TouchableOpacity style={[styles.unlockBtn, { backgroundColor: themeColors.accent }]} onPress={unlockPremium}>
                <Text style={styles.unlockBtnText}>Unlock for $300 MXN / Lifetime</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        )}

        {/* Theme Settings */}
        {isPremium && (
          <View style={styles.section}>
            <SectionHeader title="App Theme" icon="color-palette" iconColor={themeColors.violet} />
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

        {/* Cloud Sync */}
        {isPremium && (
          <View style={styles.section}>
            <SectionHeader title="Cloud Sync" icon="cloud-done-outline" iconColor={themeColors.teal} />
            <GlassCard padding={16}>
              <Text style={styles.helpText}>
                Backup your library offline locally or upload it to your preferred cloud drive.
              </Text>
              <View style={{ gap: 10 }}>
                <ActionButton
                  label="Export Backup"
                  icon="arrow-down-circle-outline"
                  color={themeColors.blue}
                  loading={false}
                  onPress={handleExportBackup}
                />
                <ActionButton
                  label="Import Backup"
                  icon="arrow-up-circle-outline"
                  color={themeColors.teal}
                  loading={false}
                  onPress={handleImportBackup}
                />
              </View>
            </GlassCard>
          </View>
        )}

        {/* Steam config */}
        <View style={styles.section}>
          <SectionHeader title="Steam Account" icon="logo-steam" iconColor={themeColors.blue} />
          <GlassCard padding={16}>
            <FieldLabel
              label="SteamID or Profile URL"
              hint="Your 17-digit SteamID or steam profile URL"
            />
            <InputField
              value={steamId}
              onChangeText={setSteamId}
              placeholder="76561198xxxxxxxxx"
              autoCapitalize="none"
            />

            <View style={{ height: 14 }} />

            <FieldLabel
              label="Steam API Key"
              hint="Get yours at steamcommunity.com/dev/apikey"
              hintLink="https://steamcommunity.com/dev/apikey"
            />
            <InputField
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              autoCapitalize="none"
              secureTextEntry
            />

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: themeColors.accent }]} onPress={handleSave} activeOpacity={0.8}>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Import */}
        <View style={styles.section}>
          <SectionHeader title="Library Import" icon="cloud-download" iconColor={themeColors.teal} />
          <GlassCard padding={16}>
            <Text style={styles.helpText}>
              Fetch your Steam game library using the Steam Web API. Your profile and
              game details must be set to{' '}
              <Text style={{ color: themeColors.green }}>Public</Text>.
            </Text>

            {/* Progress bar */}
            {(importing || enriching) && progress && (
              <View style={styles.progressWrap}>
                <View style={[styles.progressTrack, { backgroundColor: themeColors.glassBorder }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPct}%` as any, backgroundColor: themeColors.teal },
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
              label="Import Steam Library"
              icon="download-outline"
              color={themeColors.teal}
              loading={importing}
              onPress={handleImport}
            />
          </GlassCard>
        </View>

        {/* HLTB */}
        <View style={styles.section}>
          <SectionHeader
            title="HowLongToBeat"
            icon="time"
            iconColor={themeColors.violet}
          />
          <GlassCard padding={16}>
            <Text style={styles.helpText}>
              Fetch estimated completion times for all games in your library that
              don't have HLTB data yet.
            </Text>

            {enriching && hltbProgress && (
              <View style={styles.progressWrap}>
                <View style={[styles.progressTrack, { backgroundColor: themeColors.glassBorder }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round((hltbProgress.done / hltbProgress.total) * 100)}%` as any,
                        backgroundColor: themeColors.violet,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
                  {hltbProgress.currentTitle}
                </Text>
                <Text style={[styles.progressLabel, { color: themeColors.textMuted }]}>
                  {hltbProgress.done} / {hltbProgress.total} processed · {hltbProgress.total - hltbProgress.done} remaining
                </Text>
                <Text style={[styles.progressLabel, { color: themeColors.textMuted }]}>
                  {hltbProgress.enriched} successful · {hltbProgress.notFound} not found · {hltbProgress.failed} errors
                </Text>
              </View>
            )}

            <ActionButton
              label="Sync HLTB Data"
              icon="sync-outline"
              color={themeColors.violet}
              loading={enriching}
              onPress={handleEnrichHLTB}
            />
          </GlassCard>
        </View>

        {/* About */}
        <View style={styles.section}>
          <SectionHeader title="About" icon="information-circle" iconColor={themeColors.accent} />

          <GlassCard padding={16}>
            <InfoRow label="Version" value="1.0.0" />
            <InfoRow label="Developer" value="MILS" />
            <InfoRow label="Built with" value="React Native + Expo" />
            <InfoRow label="Storage" value="Offline-first SQLite" />
          </GlassCard>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
      <Text style={[styles.actionBtnText, { color }]}>{loading ? 'Working…' : label}</Text>
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
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeItem: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  themeLabel: { fontSize: 12, fontWeight: '700' },
});
