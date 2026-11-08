import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CHALLENGES } from '../../content/curriculum';
import { useAuth } from '../../state/AuthProvider';
import { useAccountSync } from '../../state/AccountSyncProvider';
import { useProgress } from '../../state/ProgressProvider';
import { streak, totalXP } from '../../state/progress';
import { AppHeader, Avatar, Notice, SettingsRow } from '../../ui/account';
import { Bar, Button, Chip, Icon, IconButton, Page } from '../../ui/components';
import { RankCard } from '../../ui/ranks';
import { skillRank } from '../../domain/ranks';
import { C, S } from '../../ui/theme';
export default function You() {
  const auth = useAuth(),
    sync = useAccountSync();
  const { progress } = useProgress();
  const completed = Object.keys(progress.skills).length;
  const attempts = Object.values(progress.skills).reduce((sum, s) => sum + s.solves, 0);
  const independent = Object.values(progress.skills).reduce((sum, s) => sum + s.firstTry, 0);
  const result = progress.assessments[0];
  const milestones = [
    {
      title: 'First aha',
      detail: 'Complete a question',
      icon: 'bulb-outline' as const,
      done: completed > 0,
    },
    {
      title: 'On a roll',
      detail: 'Practice 3 days in a row',
      icon: 'flame-outline' as const,
      done: streak(progress) >= 3,
    },
    {
      title: 'Know your level',
      detail: 'Finish an assessment',
      icon: 'ribbon-outline' as const,
      done: !!result,
    },
  ];
  return (
    <Page>
      <AppHeader
        action={
          <IconButton
            name="settings-outline"
            label="Open settings"
            onPress={() => router.push('/account/settings')}
          />
        }
      />
      <LinearGradient
        colors={['#31244F', '#544078']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 24, borderRadius: 27, gap: 19, overflow: 'hidden' }}
      >
        <View
          style={{
            position: 'absolute',
            right: -38,
            top: -40,
            width: 170,
            height: 170,
            borderWidth: 30,
            borderColor: '#B79BE918',
            borderRadius: 85,
          }}
        />
        <View style={[S.row, { gap: 16 }]}>
          <Avatar name={auth.user?.name} size={68} dark />
          <View style={{ flex: 1, gap: 7 }}>
            <Text style={{ fontSize: 25, fontWeight: '800', color: C.white, letterSpacing: -0.6 }}>
              {auth.user?.name || 'Your little corner.'}
            </Text>
            <Text style={{ fontSize: 12, color: '#D9CEE9' }}>
              {auth.user ? auth.profile?.alias || 'Getting your profile ready' : 'Guest explorer'}
            </Text>
          </View>
        </View>
        <View style={[S.row, { gap: 7 }]}>
          <Icon
            name={auth.user ? 'cloud-outline' : 'phone-portrait-outline'}
            size={14}
            color="#E6DAF8"
          />
          <Text style={{ fontSize: 11, color: '#E6DAF8' }}>
            {!auth.user
              ? 'Saved on this device'
              : sync.status === 'saved'
                ? 'Account sync is on'
                : sync.status === 'saving'
                  ? 'Saving your practice…'
                  : sync.status === 'conflict'
                    ? 'A save needs your attention'
                    : sync.status === 'loading'
                      ? 'Checking your account save…'
                      : 'Offline · device save is safe'}
          </Text>
        </View>
      </LinearGradient>
      {!auth.user && (
        <View style={[S.card, { gap: 13 }]}>
          <View style={S.between}>
            <View style={{ backgroundColor: C.lavender, padding: 10, borderRadius: 13 }}>
              <Icon name="bookmark-outline" color={C.purple} />
            </View>
            <Chip>TAKE IT WITH YOU</Chip>
          </View>
          <Text style={[S.sectionTitle, { fontSize: 21 }]}>Keep the momentum.</Text>
          <Text style={S.text}>
            An account keeps your lessons, streak and rank ready on your next device.
          </Text>
          <Button
            title="Create a free account"
            icon="arrow-forward"
            onPress={() => router.push('/auth/sign-in?mode=sign-up')}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/auth/sign-in')}
            style={{ alignItems: 'center', minHeight: 38, justifyContent: 'center' }}
          >
            <Text style={{ color: C.purple, fontSize: 12, fontWeight: '700' }}>
              Already have an account? Sign in
            </Text>
          </Pressable>
        </View>
      )}
      <View style={[S.row, { gap: 10 }]}>
        {[
          {
            value: String(totalXP(progress)),
            label: 'TOTAL XP',
            icon: 'flash' as const,
            color: C.purple,
            soft: C.lavender,
          },
          {
            value: String(streak(progress)),
            label: 'DAY STREAK',
            icon: 'flame' as const,
            color: C.coral,
            soft: C.coralSoft,
          },
          {
            value: String(completed),
            label: 'FAMILIES',
            icon: 'checkmark-circle' as const,
            color: '#A57726',
            soft: C.amberSoft,
          },
        ].map((stat) => (
          <View
            key={stat.label}
            style={[
              S.card,
              {
                flex: 1,
                alignItems: 'center',
                gap: 10,
                paddingHorizontal: 8,
                paddingVertical: 18,
                borderRadius: 20,
              },
            ]}
          >
            <View style={{ backgroundColor: stat.soft, padding: 8, borderRadius: 12 }}>
              <Icon name={stat.icon} color={stat.color} size={19} />
            </View>
            <Text style={{ color: C.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.7 }}>
              {stat.value}
            </Text>
            <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.7, color: C.muted }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
      <RankCard
        rank={result ? skillRank(result.score) : null}
        label="YOUR CURRENT FORM"
        value={
          result
            ? result.score + '% on your latest assessment'
            : 'Your first skill title is 18 questions away.'
        }
        onPress={() => router.navigate('/assess')}
      />
      <View style={{ gap: 14 }}>
        <View style={S.between}>
          <Text style={S.sectionTitle}>Small wins, collected.</Text>
          <Text style={{ fontSize: 11, color: C.muted }}>
            {milestones.filter((m) => m.done).length}/{milestones.length}
          </Text>
        </View>
        <View style={[S.row, { gap: 10 }]}>
          {milestones.map((m) => (
            <View
              key={m.title}
              accessibilityLabel={m.title + ': ' + (m.done ? 'earned' : 'not earned yet')}
              style={[
                S.card,
                {
                  flex: 1,
                  padding: 12,
                  gap: 10,
                  alignItems: 'center',
                  backgroundColor: m.done ? C.white : '#F2EFF7',
                  borderStyle: m.done ? 'solid' : 'dashed',
                },
              ]}
            >
              <View
                style={{
                  width: 43,
                  height: 43,
                  borderRadius: 15,
                  backgroundColor: m.done ? C.amberSoft : '#E7E2EE',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={m.icon} color={m.done ? '#9D7123' : '#9B94AA'} size={22} />
              </View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: m.done ? C.ink : C.muted,
                  textAlign: 'center',
                }}
              >
                {m.title}
              </Text>
              <Text style={{ fontSize: 9, lineHeight: 14, color: C.muted, textAlign: 'center' }}>
                {m.detail}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={[S.card, { gap: 13 }]}>
        <View style={S.between}>
          <Text style={S.sectionTitle}>Your practice, so far</Text>
          <Icon name="analytics-outline" color={C.purple} />
        </View>
        <Bar value={completed / CHALLENGES.length} />
        <Text style={S.text}>
          {completed} of {CHALLENGES.length} question families explored.
        </Text>
        <View style={{ height: 1, backgroundColor: C.line }} />
        <Text style={{ fontSize: 12, color: C.muted, lineHeight: 20 }}>
          {attempts
            ? independent + ' of ' + attempts + ' completed attempts solved independently.'
            : 'Your first challenge is a good place to start.'}
        </Text>
      </View>
      {sync.status === 'conflict' && (
        <Notice>
          Another device has a newer save. Open Settings to choose which progress to keep.
        </Notice>
      )}
      <View style={[S.card, { padding: 0 }]}>
        <SettingsRow
          icon="options-outline"
          title="Make it yours"
          detail="Profile, sync, privacy and preferences."
          onPress={() => router.push('/account/settings')}
        />
        <SettingsRow
          icon="shield-checkmark-outline"
          title="Your data, explained"
          detail="A quick read. No fine-print maze."
          onPress={() => router.push('/account/privacy')}
          last
        />
      </View>
      <Text style={{ textAlign: 'center', fontSize: 11, color: C.muted, paddingBottom: 4 }}>
        Made by Wentao Wu · TraceRace 0.4
      </Text>
    </Page>
  );
}
