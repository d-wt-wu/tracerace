import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { authClient } from '../../lib/auth-client';
import { request } from '../../lib/api';
import { Button, Mark, Page } from '../../ui/components';
import { Notice } from '../../ui/account';
import { C, S } from '../../ui/theme';
import type { AccountProfile } from '../../domain/account';
export default function Callback() {
  const params = useLocalSearchParams<{ error?: string }>();
  const [error, setError] = useState<string | null>(
    params.error ? 'Sign-in didn’t finish. Please try again.' : null,
  );
  useEffect(() => {
    let alive = true;
    if (params.error) return;
    (async () => {
      try {
        const session = await authClient.getSession({ fetchOptions: { cache: 'no-store' } });
        if (!session.data?.user)
          throw new Error('Your session could not be restored. Please sign in again.');
        const result = await request<{ profile: AccountProfile | null }>('/api/account/profile');
        if (alive) router.replace(result.profile ? '/' : '/account/setup?import=1');
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Sign-in could not be completed.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.error]);
  return (
    <Page>
      <View style={{ alignItems: 'center', gap: 22, paddingVertical: 70 }}>
        <Mark size={64} />
        <Text style={S.title}>Getting your spot ready.</Text>
        {error ? (
          <>
            <Notice kind="error">{error}</Notice>
            <Button title="Back to sign in" onPress={() => router.replace('/auth/sign-in')} />
          </>
        ) : (
          <ActivityIndicator color={C.purple} accessibilityLabel="Finishing sign in" />
        )}
      </View>
    </Page>
  );
}
