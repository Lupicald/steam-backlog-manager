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
import { GlassCard } from '../../src/components/GlassCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { COLORS } from '../../src/utils/colors';

export default function SettingsScreen() {
  const [steamId, setSteamId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [importing, setImporting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
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
    const { enriched, failed } = await batchEnrichHLTB((done, total) => {
      setProgress({ done, total });
    });
    setEnriching(false);
    setProgress(null);
    Alert.alert(
      'HLTB Sync Done',
      `Enriched ${enriched} games.${failed > 0 ? ` ${failed} not found.` : ''}`
    );
  };

  const progressPct =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#000010', '#0a0a14']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Configure your Steam library</Text>
        </View>

        {/* Steam config */}
        <View style={styles.section}>
          <SectionHeader title="Steam Account" icon="logo-steam" iconColor={COLORS.blue} />
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

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Import */}
        <View style={styles.section}>
          <SectionHeader title="Library Import" icon="cloud-download" iconColor={COLORS.teal} />
          <GlassCard padding={16}>
            <Text style={styles.helpText}>
              Fetch your Steam game library using the Steam Web API. Your profile and
              game details must be set to{' '}
              <Text style={{ color: COLORS.green }}>Public</Text>.
            </Text>

            {/* Progress bar */}
            {(importing || enriching) && progress && (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPct}%` as any },
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
                    ? { borderColor: COLORS.red + '55', backgroundColor: COLORS.red + '11' }
                    : { borderColor: COLORS.green + '55', backgroundColor: COLORS.green + '11' },
                ]}
              >
                <Ionicons
                  name={importResult.startsWith('Error') ? 'close-circle' : 'checkmark-circle'}
                  size={14}
                  color={importResult.startsWith('Error') ? COLORS.red : COLORS.green}
                />
                <Text
                  style={[
                    styles.resultText,
                    { color: importResult.startsWith('Error') ? COLORS.red : COLORS.green },
                  ]}
                >
                  {importResult}
                </Text>
              </View>
            )}

            <ActionButton
              label="Import Steam Library"
              icon="download-outline"
              color={COLORS.teal}
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
            iconColor={COLORS.violet}
          />
          <GlassCard padding={16}>
            <Text style={styles.helpText}>
              Fetch estimated completion times for all games in your library that
              don't have HLTB data yet.
            </Text>

            {enriching && progress && (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progressPct}%` as any, backgroundColor: COLORS.violet },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {progress.done} / {progress.total}
                </Text>
              </View>
            )}

            <ActionButton
              label="Sync HLTB Data"
              icon="sync-outline"
              color={COLORS.violet}
              loading={enriching}
              onPress={handleEnrichHLTB}
            />
          </GlassCard>
        </View>

        {/* About */}
        <View style={styles.section}>
          <SectionHeader title="About" icon="information-circle" iconColor={COLORS.accent} />
          <GlassCard padding={16}>
            <InfoRow label="Version" value="1.0.0" />
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

function FieldLabel({ label, hint, hintLink }: { label: string; hint?: string; hintLink?: string }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint && (
        <TouchableOpacity
          disabled={!hintLink}
          onPress={() => hintLink && Linking.openURL(hintLink)}
        >
          <Text style={[styles.fieldHint, hintLink && { color: COLORS.accent }]}>{hint}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function InputField(props: React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputWrap}>
      <TextInput
        style={styles.input}
        placeholderTextColor={COLORS.textMuted}
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
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingTop: 60, paddingHorizontal: 20 },
  header: { marginBottom: 24 },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 2 },
  section: { marginBottom: 24 },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  fieldHint: { color: COLORS.textMuted, fontSize: 11 },
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  input: { color: COLORS.textPrimary, fontSize: 14 },
  saveBtn: {
    marginTop: 16,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  helpText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  progressWrap: { marginBottom: 12, gap: 4 },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.glassMedium,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: COLORS.teal,
  },
  progressLabel: { color: COLORS.textMuted, fontSize: 11, textAlign: 'right' },
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
    borderBottomColor: COLORS.glassBorder,
  },
  infoLabel: { color: COLORS.textSecondary, fontSize: 13 },
  infoValue: { color: COLORS.textMuted, fontSize: 13 },
});
