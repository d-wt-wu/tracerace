import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { authClient } from '../../lib/auth-client';
import { AppHeader, Field, Notice } from '../../ui/account';
import { Button, Page } from '../../ui/components';
import { S } from '../../ui/theme';
export default function ResetPassword() {
  const { token, error: linkError } = useLocalSearchParams<{ token?: string; error?: string }>();
  const [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!token || linkError)
        throw new Error('This reset link has expired. Request a new one from sign in.');
      const result = await authClient.resetPassword({ token, newPassword: password });
      if (result.error) throw new Error(result.error.message);
      setPassword('');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your password could not be changed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <AppHeader back title="Reset password" />
      <Text style={S.title}>{done ? 'You’re all set.' : 'A fresh start.'}</Text>
      <Text style={S.text}>
        {done
          ? 'Sign in with your new password.'
          : 'Choose a password with at least 10 characters.'}
      </Text>
      {done ? (
        <Button title="Back to sign in" onPress={() => router.replace('/auth/sign-in')} />
      ) : (
        <>
          <Field
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={128}
          />
          {error && <Notice kind="error">{error}</Notice>}
          <Button
            title={busy ? 'Updating…' : 'Save new password'}
            onPress={() => {
              void submit();
            }}
            disabled={busy || password.length < 10 || !token || !!linkError}
          />
          {(!token || !!linkError) && (
            <Notice kind="error">
              This reset link is invalid or expired. Request a new one from sign in.
            </Notice>
          )}
        </>
      )}
    </Page>
  );
}
