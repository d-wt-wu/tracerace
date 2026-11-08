import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProgressProvider, useProgress } from '../state/ProgressProvider';
import { C } from '../ui/theme';
import { LeagueProvider } from '../state/LeagueProvider';
import { AuthProvider, useAuth } from '../state/AuthProvider';
import {
  AccountSyncProvider,
  accountProgressKey,
  useAccountSync,
} from '../state/AccountSyncProvider';

function Routes() {
  const { loaded } = useProgress();
  const auth = useAuth(),
    sync = useAccountSync();
  if (!loaded || (auth.user && !sync.ready))
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.purple} accessibilityLabel="Loading your progress" />
      </View>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.bg },
        animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
      }}
    />
  );
}
function AccountShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (!auth.ready)
    return (
      <View
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}
      >
        <ActivityIndicator color={C.purple} accessibilityLabel="Restoring your account" />
      </View>
    );
  const key = auth.user ? accountProgressKey(auth.user.id) : '@tracerace/progress/v1';
  return (
    <ProgressProvider key={key} storageKey={key}>
      <AccountSyncProvider>{children}</AccountSyncProvider>
    </ProgressProvider>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AccountShell>
          <LeagueProvider>
            <StatusBar style="dark" />
            <View style={{ flex: 1, backgroundColor: C.outer }}>
              <View
                style={{
                  flex: 1,
                  width: '100%',
                  maxWidth: 520,
                  alignSelf: 'center',
                  backgroundColor: C.bg,
                  borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
                  borderRightWidth: Platform.OS === 'web' ? 1 : 0,
                  borderColor: C.line,
                }}
              >
                <Routes />
              </View>
            </View>
          </LeagueProvider>
        </AccountShell>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
