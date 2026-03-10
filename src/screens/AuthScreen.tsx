import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../hooks/useAppContext';
import { COLORS } from '../utils/colors';
import { t } from '../i18n';

type Mode = 'signin' | 'signup';

interface AuthScreenProps {
  onSuccess?: () => void;
  onSkip?: () => void;
}

export default function AuthScreen({ onSuccess, onSkip }: AuthScreenProps) {
  const { signIn, signUp, signInGoogle, authLoading, authError, clearAuthError, language } =
    useAppContext();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const error = localError ?? authError;

  const validate = (): boolean => {
    if (!email.trim() || !password.trim()) {
      setLocalError(t('auth_email_req', language));
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setLocalError(t('auth_email_invalid', language));
      return false;
    }
    if (password.length < 6) {
      setLocalError(t('auth_password_short', language));
      return false;
    }
    if (mode === 'signup' && password !== confirm) {
      setLocalError(t('auth_passwords_mismatch', language));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setLocalError(null);
    clearAuthError();
    setSuccessMsg(null);
    if (!validate()) return;

    if (mode === 'signin') {
      const result = await signIn(email.trim(), password);
      if (!result.error) onSuccess?.();
    } else {
      const result = await signUp(email.trim(), password);
      if (!result.error) {
        setSuccessMsg(t('auth_signup_success', language));
        setMode('signin');
      }
    }
  };

  const handleGoogle = async () => {
    setLocalError(null);
    clearAuthError();
    const result = await signInGoogle();
    if (!result.error) onSuccess?.();
  };

  const toggleMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setLocalError(null);
    clearAuthError();
    setSuccessMsg(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1a0a3a', '#060614']} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / Title */}
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Ionicons name="game-controller" size={32} color={COLORS.accent} />
          </View>
          <Text style={styles.appName}>BacklogFlow</Text>
        </View>
        <Text style={styles.headline}>
          {mode === 'signin' ? t('auth_welcome_back', language) : t('auth_create_account', language)}
        </Text>
        <Text style={styles.sub}>
          {mode === 'signin' ? t('auth_sync_desc', language) : t('auth_backup_desc', language)}
        </Text>

        {/* Card */}
        <View style={styles.card}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.glass }]} />

          {/* Error / Success banners */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={14} color={COLORS.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {successMsg ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.green} />
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* Email */}
          <Field
            label={t('auth_email_label', language)}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Password */}
          <Field
            label={t('auth_password_label', language)}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          {/* Confirm password (sign-up only) */}
          {mode === 'signup' && (
            <Field
              label={t('auth_confirm_label', language)}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              secureTextEntry
            />
          )}

          {/* Primary CTA */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSubmit}
            disabled={authLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentAlt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            {authLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'signin' ? t('auth_sign_in', language) : t('auth_sign_up', language)}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth_or', language)}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogle}
            disabled={authLoading}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google" size={18} color={COLORS.textPrimary} />
            <Text style={styles.googleBtnText}>{t('auth_continue_google', language)}</Text>
          </TouchableOpacity>
        </View>

        {/* Toggle mode */}
        <TouchableOpacity onPress={toggleMode} style={styles.toggleRow}>
          <Text style={styles.toggleText}>
            {mode === 'signin' ? `${t('auth_no_account', language)} ` : `${t('auth_have_account', language)} `}
            <Text style={{ color: COLORS.accent, fontWeight: '700' }}>
              {mode === 'signin' ? t('auth_sign_up', language) : t('auth_sign_in', language)}
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Skip (offline mode) */}
        {onSkip && (
          <TouchableOpacity onPress={onSkip} style={styles.skipRow}>
            <Text style={styles.skipText}>{t('auth_skip', language)}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Field sub-component ──────────────────────────────────────────────────────

function Field(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={props.secureTextEntry}
          keyboardType={props.keyboardType}
          autoCapitalize={props.autoCapitalize ?? 'none'}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  logoIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headline: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  sub: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
    padding: 20,
    gap: 14,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.red + '18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.red + '44',
    padding: 10,
  },
  errorText: { color: COLORS.red, fontSize: 13, flex: 1 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.green + '18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.green + '44',
    padding: 10,
  },
  successText: { color: COLORS.green, fontSize: 13, flex: 1 },
  fieldWrap: { gap: 5 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
    paddingHorizontal: 14,
    height: 46,
    justifyContent: 'center',
  },
  input: { color: COLORS.textPrimary, fontSize: 15 },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.glassBorder },
  dividerText: { color: COLORS.textMuted, fontSize: 12 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
  },
  googleBtnText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  toggleRow: { alignItems: 'center', marginBottom: 12 },
  toggleText: { color: COLORS.textSecondary, fontSize: 14 },
  skipRow: { alignItems: 'center', paddingVertical: 8 },
  skipText: { color: COLORS.textMuted, fontSize: 13 },
});
