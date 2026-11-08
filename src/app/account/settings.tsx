import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { router } from 'expo-router';
import { Modal, ScrollView, Switch, Text, View } from 'react-native';
import { useAuth } from '../../state/AuthProvider';
import { useAccountSync, accountProgressKey } from '../../state/AccountSyncProvider';
import { useLeague } from '../../state/LeagueProvider';
import { useProgress } from '../../state/ProgressProvider';
import { authClient } from '../../lib/auth-client';
import { request } from '../../lib/api';
import { AppHeader, Avatar, Field, Notice, SettingsRow } from '../../ui/account';
import { Button, Page } from '../../ui/components';
import { C, S } from '../../ui/theme';
export default function Settings() {
  const auth = useAuth(),
    sync = useAccountSync(),
    league = useLeague();
  const { progress, toggleHaptics, reset, undoReset, canUndo } = useProgress();
  const [name, setName] = useState(auth.user?.name || ''),
    [alias, setAlias] = useState<string | null>(null);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'reset' | 'delete' | null>(null),
    [confirmation, setConfirmation] = useState(''),
    [password, setPassword] = useState('');
  const publicAlias = alias ?? auth.profile?.alias ?? '';
  const task = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const saveProfile = () =>
    task(async () => {
      if (name.trim().length < 2 || name.trim().length > 60)
        throw new Error('Use a display name between 2 and 60 characters.');
      if (auth.profile && !/^[A-Za-z0-9 _-]{2,20}$/.test(publicAlias.trim()))
        throw new Error(
          'Use a nickname with 2–20 letters, numbers, spaces, underscores or dashes.',
        );
      const updated = await authClient.updateUser({ name: name.trim() });
      if (updated.error) throw new Error(updated.error.message);
      if (auth.profile)
        await request('/api/me', {
          method: 'PATCH',
          body: { alias: publicAlias.trim(), active: auth.profile.active },
        });
      await auth.refreshSession();
      await auth.refreshProfile();
      setNotice('Profile updated.');
    });
  const signOut = () =>
    task(async () => {
      await sync.syncNow();
      await auth.signOut();
      router.replace('/');
    });
  const confirm = () =>
    task(async () => {
      if (dialog === 'reset') {
        await reset();
        setDialog(null);
        return;
      }
      if (dialog !== 'delete' || confirmation !== 'DELETE' || !auth.user) return;
      const id = auth.user.id;
      const result = await authClient.deleteUser(password ? { password } : {});
      if (result.error)
        throw new Error(result.error.message || 'Sign in again, then retry deleting your account.');
      const prefix = accountProgressKey(id);
      const keys = (await AsyncStorage.getAllKeys()).filter(
        (k) => k === prefix || k.startsWith(prefix + '/'),
      );
      await AsyncStorage.multiRemove(keys);
      setPassword('');
      setDialog(null);
      await auth.refreshSession();
      router.replace('/');
    });
  return (
    <Page>
      <AppHeader back title="Settings" />
      {auth.user ? (
        <>
          <View style={[S.row, { gap: 15, paddingVertical: 8 }]}>
            <Avatar name={auth.user.name} size={58} />
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={S.sectionTitle}>{auth.user.name}</Text>
              <Text style={{ fontSize: 12, color: C.muted }}>{auth.user.email}</Text>
            </View>
          </View>
          <View style={[S.card, { gap: 17 }]}>
            <Text style={S.sectionTitle}>Your profile</Text>
            <Field label="Display name" value={name} onChangeText={setName} maxLength={60} />
            {auth.profile ? (
              <Field
                label="Public nickname"
                value={publicAlias}
                onChangeText={setAlias}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : (
              <Button
                title="Finish setting up your profile"
                secondary
                onPress={() => router.push('/account/setup')}
              />
            )}
            <Button
              title={busy ? 'Saving…' : 'Save changes'}
              secondary
              disabled={busy}
              onPress={() => {
                void saveProfile();
              }}
            />
          </View>
          <View style={{ gap: 10 }}>
            <Text style={S.eyebrow}>PRACTICE, SAVED</Text>
            <View style={[S.card, { padding: 0 }]}>
              <SettingsRow
                icon="cloud-done-outline"
                title={
                  sync.status === 'saved'
                    ? 'Account sync is on'
                    : sync.status === 'saving'
                      ? 'Saving your practice…'
                      : sync.status === 'conflict'
                        ? 'Two saves need your attention'
                        : sync.status === 'loading'
                          ? 'Checking your account save…'
                          : 'Saved on this device'
                }
                detail={
                  sync.lastSynced
                    ? 'Last account save: ' + new Date(sync.lastSynced).toLocaleString()
                    : auth.user
                      ? 'Your account keeps a backup of completed practice.'
                      : 'Guest practice stays on this device.'
                }
                onPress={() => {
                  void sync.syncNow();
                }}
              />
              <SettingsRow
                icon="people-outline"
                title="Public rankings"
                detail="Your nickname, XP and latest ranked score."
                last
                right={
                  <Switch
                    accessibilityLabel="Show me on public rankings"
                    value={!!auth.profile?.active}
                    disabled={!auth.profile || league.busy}
                    onValueChange={(value) => {
                      void league.setVisible(value);
                    }}
                    trackColor={{ false: '#D9D4E3', true: C.purple }}
                    thumbColor={C.white}
                  />
                }
              />
            </View>
          </View>
          {sync.notice && (
            <Notice kind={sync.status === 'conflict' ? 'info' : 'error'}>{sync.notice}</Notice>
          )}
          {sync.status === 'conflict' && (
            <View style={[S.card, { gap: 12 }]}>
              <Text style={S.sectionTitle}>Choose your progress</Text>
              <Text style={S.text}>
                Use the account save on this device, or replace it with this device’s current
                progress. A previous copy is kept locally.
              </Text>
              <Button
                title="Use the account save"
                onPress={() => {
                  void sync.useAccountSave();
                }}
              />
              <Button
                title="Replace account save with this device"
                secondary
                onPress={() => {
                  void sync.keepDeviceSave();
                }}
              />
            </View>
          )}
        </>
      ) : (
        <View style={[S.card, { gap: 13 }]}>
          <Text style={S.sectionTitle}>Keep your progress with you.</Text>
          <Text style={S.text}>
            Create an account to back up your practice and return on another device.
          </Text>
          <Button
            title="Create an account"
            onPress={() => router.push('/auth/sign-in?mode=sign-up')}
          />
        </View>
      )}
      <View style={{ gap: 10 }}>
        <Text style={S.eyebrow}>THE LITTLE THINGS</Text>
        <View style={[S.card, { padding: 0 }]}>
          <SettingsRow
            icon="phone-portrait-outline"
            title="Answer haptics"
            detail="A small tap when an answer clicks. On supported phones."
            right={
              <Switch
                accessibilityLabel="Answer haptics"
                value={progress.haptics}
                onValueChange={toggleHaptics}
                trackColor={{ false: '#D9D4E3', true: C.purple }}
                thumbColor={C.white}
              />
            }
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            title="Your data & privacy"
            detail="What’s saved, what’s shared, and your controls."
            onPress={() => router.push('/account/privacy')}
            last
          />
        </View>
      </View>
      {error && <Notice kind="error">{error}</Notice>}
      {notice && <Notice kind="success">{notice}</Notice>}
      {auth.notice && <Notice>{auth.notice}</Notice>}
      {auth.user && (
        <Button
          title={busy ? 'One moment…' : 'Sign out'}
          secondary
          onPress={() => {
            void signOut();
          }}
          disabled={busy}
        />
      )}
      <View style={[S.card, { padding: 0 }]}>
        <SettingsRow
          icon="refresh-outline"
          title="Reset practice progress"
          detail={
            auth.user
              ? 'Clears this account’s practice save. Verified rankings stay.'
              : 'A fresh start for guest practice on this device.'
          }
          onPress={() => setDialog('reset')}
          last={!auth.user}
        />
        {auth.user && (
          <SettingsRow
            icon="trash-outline"
            title="Delete account"
            detail="Permanently remove your account and rankings."
            destructive
            last
            onPress={() => {
              setConfirmation('');
              setPassword('');
              setDialog('delete');
            }}
          />
        )}
      </View>
      {canUndo && (
        <Button
          title="Restore the previous practice save"
          secondary
          onPress={() => {
            void undoReset();
          }}
        />
      )}
      <Text style={{ color: C.muted, fontSize: 11, textAlign: 'center', paddingVertical: 8 }}>
        TraceRace 0.4 · Made by Wentao Wu
      </Text>
      <Modal
        transparent
        visible={!!dialog}
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setDialog(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#19152B80',
            padding: 24,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ScrollView
            style={{ maxHeight: '90%', width: '100%', maxWidth: 410 }}
            contentContainerStyle={[S.card, { gap: 18, padding: 25 }]}
            keyboardShouldPersistTaps="handled"
            accessibilityViewIsModal
          >
            <Text style={S.sectionTitle}>
              {dialog === 'delete' ? 'Delete your account?' : 'A fresh start?'}
            </Text>
            <Text style={S.text}>
              {dialog === 'delete'
                ? 'Your account, cloud practice and ranking records will be permanently removed. Your original guest save stays on this device. Type DELETE to confirm.'
                : 'This clears your practice XP, streak, reviews and local assessment history. A previous practice save is kept for restore. Verified ranking records stay unchanged.'}
            </Text>
            {dialog === 'delete' && (
              <>
                <Field
                  label="Type DELETE"
                  value={confirmation}
                  onChangeText={setConfirmation}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                {auth.capabilities?.email && (
                  <Field
                    label="Password (for email accounts)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="current-password"
                  />
                )}
                <Text style={{ fontSize: 11, color: C.muted, lineHeight: 18 }}>
                  For Google accounts, sign in again first if your session is no longer recent.
                </Text>
              </>
            )}
            {error && <Notice kind="error">{error}</Notice>}
            <Button
              title={
                busy
                  ? 'One moment…'
                  : dialog === 'delete'
                    ? 'Permanently delete my account'
                    : 'Reset practice progress'
              }
              disabled={busy || (dialog === 'delete' && confirmation !== 'DELETE')}
              onPress={() => {
                void confirm();
              }}
              style={
                dialog === 'delete'
                  ? { backgroundColor: '#B34B3A', borderColor: '#913D2E' }
                  : undefined
              }
            />
            <Button
              title="Keep things as they are"
              secondary
              disabled={busy}
              onPress={() => setDialog(null)}
            />
          </ScrollView>
        </View>
      </Modal>
    </Page>
  );
}
