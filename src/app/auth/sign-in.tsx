import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { authClient } from '../../lib/auth-client';
import { request } from '../../lib/api';
import { API_URL } from '../../config/api';
import { googleRedirectURL } from '../../domain/oauth';
import { useAuth } from '../../state/AuthProvider';
import { Button, Icon, Mark, Page } from '../../ui/components';
import { AppHeader, Field, GoogleButton, Notice } from '../../ui/account';
import { C, S } from '../../ui/theme';
export default function SignIn() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'reset'>(
    params.mode === 'sign-up' ? 'sign-up' : 'sign-in',
  );
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false),
    [googleBusy, setGoogleBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState<string | null>(null);
  const auth = useAuth();
  const emailEnabled = auth.capabilities?.email === true;
  const callback = () =>
    Platform.OS === 'web' ? window.location.origin + '/auth/callback' : 'tracerace://auth/callback';
  const changeMode = (next: typeof mode) => {
    setMode(next);
    setError(null);
    setMessage(null);
    setPassword('');
  };
  const submit = async () => {
    if (busy || googleBusy) return;
    if (!emailEnabled) return;
    setError(null);
    setMessage(null);
    const mail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'reset' && !auth.capabilities?.recovery) {
      setError(
        'Recovery emails aren’t enabled in this preview yet. You can still sign in with your current password.',
      );
      return;
    }
    if (mode !== 'reset' && (password.length < 10 || password.length > 128)) {
      setError('Use a password between 10 and 128 characters.');
      return;
    }
    if (mode === 'sign-up' && (name.trim().length < 2 || name.trim().length > 60)) {
      setError('Add a name between 2 and 60 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'reset') {
        const result = await authClient.requestPasswordReset({
          email: mail,
          redirectTo:
            Platform.OS === 'web'
              ? window.location.origin + '/auth/reset-password'
              : 'tracerace://auth/reset-password',
        });
        if (result.error) throw new Error(result.error.message);
        setMessage('If an account uses that email, a password-reset link is on its way.');
        return;
      }
      const result =
        mode === 'sign-up'
          ? await authClient.signUp.email({
              name: name.trim(),
              email: mail,
              password,
              callbackURL: callback(),
            })
          : await authClient.signIn.email({ email: mail, password, callbackURL: callback() });
      if (result.error)
        throw new Error(result.error.message || 'Please check your email and password.');
      setPassword('');
      if (mode === 'sign-up' && auth.capabilities?.verification) {
        setMessage('Check your inbox to verify your email, then return here to sign in.');
        return;
      }
      await auth.refreshSession();
      router.replace(mode === 'sign-up' ? '/account/setup?import=1' : '/auth/callback');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const google = async () => {
    setError(null);
    setMessage(null);
    if (!auth.capabilities?.google) {
      setMessage(
        'Google sign-in isn’t connected in this preview yet. You can create an account with email below.',
      );
      return;
    }
    setGoogleBusy(true);
    try {
      if (Platform.OS === 'web') {
        const result = await request<{ url: string }>('/api/auth/sign-in/social', {
          method: 'POST',
          body: {
            provider: 'google',
            callbackURL: callback(),
            errorCallbackURL: callback(),
            disableRedirect: true,
          },
        });
        window.location.assign(googleRedirectURL(result.url, API_URL));
        return;
      }
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: callback(),
        errorCallbackURL: callback(),
      });
      if (result.error) throw new Error(result.error.message);
      await auth.refreshSession();
      router.replace('/auth/callback');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in was cancelled. Please try again.');
    } finally {
      setGoogleBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Page>
        <AppHeader back title="Your TraceRace account" action={<Mark size={30} />} />
        <LinearGradient
          colors={['#EEE8FF', '#F8F5FF']}
          style={{ padding: 24, borderRadius: 25, gap: 14, overflow: 'hidden' }}
        >
          <View
            style={{
              position: 'absolute',
              right: -20,
              top: -25,
              width: 144,
              height: 144,
              borderRadius: 72,
              borderWidth: 25,
              borderColor: '#E4DAFC80',
            }}
          />
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 15,
              backgroundColor: C.purple,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              name={mode === 'reset' ? 'key-outline' : 'bookmark-outline'}
              color={C.white}
              size={23}
            />
          </View>
          <Text
            style={{
              fontSize: 30,
              lineHeight: 35,
              fontWeight: '800',
              letterSpacing: -1,
              color: C.ink,
              maxWidth: 290,
            }}
          >
            {mode === 'sign-up'
              ? 'Keep your\nlittle wins.'
              : mode === 'reset'
                ? 'A fresh\npassword.'
                : 'Back for your\nnext aha.'}
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 21, color: '#70658F', maxWidth: 300 }}>
            {mode === 'reset'
              ? 'We’ll help you get back to your practice.'
              : 'Your lessons, streak, and ranks. Ready when you are.'}
          </Text>
        </LinearGradient>
        {mode !== 'reset' && (
          <>
            <View style={{ gap: 10 }}>
              <GoogleButton
                onPress={() => {
                  void google();
                }}
                loading={googleBusy}
                disabled={busy || !auth.capabilities?.google}
              />
              {auth.capabilities && !auth.capabilities.google && (
                <Text style={{ fontSize: 10, color: C.muted, textAlign: 'center' }}>
                  {emailEnabled
                    ? 'Google connection pending · email accounts work now'
                    : 'Google is temporarily unavailable. Guest practice still works.'}
                </Text>
              )}
            </View>
            {emailEnabled && (
              <>
                <View style={[S.row, { gap: 14 }]}>
                  <View style={{ height: 1, backgroundColor: C.line, flex: 1 }} />
                  <Text style={{ color: C.muted, fontSize: 11 }}>or continue with email</Text>
                  <View style={{ height: 1, backgroundColor: C.line, flex: 1 }} />
                </View>
                <View style={[S.row, { padding: 4, backgroundColor: '#EEEBF4', borderRadius: 14 }]}>
                  {(['sign-in', 'sign-up'] as const).map((tab) => (
                    <Pressable
                      key={tab}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: mode === tab }}
                      aria-selected={mode === tab}
                      onPress={() => changeMode(tab)}
                      disabled={busy || googleBusy}
                      style={{
                        flex: 1,
                        minHeight: 42,
                        borderRadius: 11,
                        backgroundColor: mode === tab ? C.white : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: '700',
                          fontSize: 13,
                          color: mode === tab ? C.ink : C.muted,
                        }}
                      >
                        {tab === 'sign-in' ? 'Sign in' : 'Create account'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </>
        )}
        {emailEnabled ? (
          <View style={{ gap: 18 }}>
            {mode === 'sign-up' && (
              <Field
                label="Your name"
                placeholder="What should we call you?"
                value={name}
                onChangeText={setName}
                textContentType="name"
                autoComplete="name"
                maxLength={60}
                editable={!busy}
              />
            )}
            <Field
              label="Email address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
              maxLength={254}
              editable={!busy}
              onSubmitEditing={() => {
                if (mode === 'reset') void submit();
              }}
            />
            {mode !== 'reset' && (
              <Field
                label="Password"
                placeholder={mode === 'sign-up' ? 'At least 10 characters' : 'Your password'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={128}
                editable={!busy}
                onSubmitEditing={() => {
                  void submit();
                }}
                returnKeyType="go"
              />
            )}
            {mode === 'sign-in' && (
              <Pressable
                accessibilityRole="button"
                onPress={() => changeMode('reset')}
                style={{ alignSelf: 'flex-end', minHeight: 30, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: C.purple }}>
                  Forgot password?
                </Text>
              </Pressable>
            )}
            {error && <Notice kind="error">{error}</Notice>}
            {message && <Notice kind="info">{message}</Notice>}
            {!auth.capabilities && auth.notice && (
              <>
                <Notice kind="error">{auth.notice}</Notice>
                <Button
                  title="Retry account connection"
                  secondary
                  disabled={busy}
                  onPress={() => {
                    void auth.refreshCapabilities();
                  }}
                />
              </>
            )}
            <Button
              title={
                busy
                  ? 'One moment…'
                  : mode === 'sign-up'
                    ? 'Create my account'
                    : mode === 'reset'
                      ? 'Send reset link'
                      : 'Sign in'
              }
              onPress={() => {
                void submit();
              }}
              disabled={busy || googleBusy || !auth.capabilities?.email}
              icon="arrow-forward"
            />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={[S.text, { textAlign: 'center' }]}>
              Continue with Google to back up your practice, or try the beta as a guest.
            </Text>
            {error && <Notice kind="error">{error}</Notice>}
            {message && <Notice kind="info">{message}</Notice>}
            {!auth.capabilities && auth.notice && (
              <>
                <Notice kind="error">{auth.notice}</Notice>
                <Button
                  title="Retry account connection"
                  secondary
                  onPress={() => {
                    void auth.refreshCapabilities();
                  }}
                />
              </>
            )}
          </View>
        )}
        {mode === 'reset' ? (
          <Button title="Back to sign in" secondary onPress={() => changeMode('sign-in')} />
        ) : (
          <>
            <Text style={{ fontSize: 11, lineHeight: 19, color: C.muted, textAlign: 'center' }}>
              No account needed to give it a try.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/')}
              style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: C.purple, fontSize: 13, fontWeight: '800' }}>
                Keep practicing as a guest
              </Text>
            </Pressable>
          </>
        )}
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/account/privacy')}
          style={{ alignItems: 'center', minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: C.muted, fontSize: 11, textDecorationLine: 'underline' }}>
            How your data is used
          </Text>
        </Pressable>
      </Page>
    </KeyboardAvoidingView>
  );
}
