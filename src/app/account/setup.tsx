import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '../../state/AuthProvider';
import { useLeague } from '../../state/LeagueProvider';
import { useAccountSync } from '../../state/AccountSyncProvider';
import { useProgress } from '../../state/ProgressProvider';
import { AppHeader, Avatar, CheckRow, Field, Notice } from '../../ui/account';
import { Button, Page } from '../../ui/components';
import { C, S } from '../../ui/theme';
export default function Setup() {
  const auth = useAuth(),
    league = useLeague(),
    sync = useAccountSync();
  const { progress } = useProgress();
  const params = useLocalSearchParams<{ import?: string }>();
  const [alias, setAlias] = useState(
    league.guestIdentity?.alias ||
      auth.user?.name
        .replace(/[^A-Za-z0-9 _-]/g, '')
        .trim()
        .slice(0, 20) ||
      'CodeExplorer',
  );
  const [keep, setKeep] = useState(params.import === '1'),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const hasPractice =
    !!Object.keys(progress.skills).length ||
    !!progress.assessments.length ||
    !!Object.keys(progress.cscb07.concepts).length ||
    !!Object.keys(progress.cscb07.written).length ||
    !!Object.keys(progress.cscb07.papers).length;
  const finish = async () => {
    if (!sync.ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      const claimed = await auth.createProfile(
        alias,
        visible,
        keep && !hasPractice ? league.guestIdentity?.token : undefined,
      );
      if (claimed) await league.forgetGuest();
      if (keep && !hasPractice) await sync.importGuest();
      await sync.syncNow();
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };
  if (!auth.user)
    return (
      <Page>
        <AppHeader back title="Your account" />
        <Notice>Sign in to finish setting up your profile.</Notice>
        <Button title="Sign in" onPress={() => router.replace('/auth/sign-in')} />
      </Page>
    );
  return (
    <Page>
      <AppHeader back title="Make yourself at home" />
      <View style={{ alignItems: 'center', gap: 18, paddingVertical: 16 }}>
        <Avatar name={auth.user.name} size={88} />
        <View style={{ gap: 8, alignItems: 'center' }}>
          <Text style={[S.title, { textAlign: 'center' }]}>
            Hey, {auth.user.name.split(' ')[0]}.
          </Text>
          <Text style={[S.text, { textAlign: 'center', maxWidth: 310 }]}>
            A name for the leaderboard. A little space for your progress.
          </Text>
        </View>
      </View>
      <View style={[S.card, { gap: 18 }]}>
        <Field
          label="Your public nickname"
          value={alias}
          onChangeText={setAlias}
          maxLength={20}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="e.g. StackGoblin"
        />
        <CheckRow
          checked={visible}
          onPress={() => setVisible(!visible)}
          title="Join the public rankings"
          detail="Share your nickname, weekly XP and latest ranked assessment score. You can hide them anytime."
        />
      </View>
      {!hasPractice && (
        <View style={[S.card, { padding: 17 }]}>
          <CheckRow
            checked={keep}
            onPress={() => setKeep(!keep)}
            title="Bring my guest practice with me"
            detail="Keep this device’s completed lessons, XP and assessment history. Your guest save stays on this device too."
          />
        </View>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      <Button
        title={busy ? 'Saving your spot…' : 'Let’s do this'}
        icon="arrow-forward"
        disabled={busy || !sync.ready || !league.ready || alias.trim().length < 2}
        onPress={() => {
          void finish();
        }}
      />
      <Text style={{ fontSize: 11, lineHeight: 19, textAlign: 'center', color: C.muted }}>
        Your email stays private. Rankings are optional.
      </Text>
    </Page>
  );
}
