import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CHALLENGES, UNITS, challengesFor } from '../../content/curriculum';
import { useProgress } from '../../state/ProgressProvider';
import { useAuth } from '../../state/AuthProvider';
import { dateKey, dayCount, shiftDay, streak, totalXP, dueIds } from '../../state/progress';
import { Bar, Brand, Button, Chip, GoalRing, Icon, Page, TraceArt } from '../../ui/components';
import { Avatar } from '../../ui/account';
import { RankCard } from '../../ui/ranks';
import { skillRank } from '../../domain/ranks';
import { dailyPlan } from '../../domain/daily';
import { C, S } from '../../ui/theme';
export default function Today() {
  const { progress } = useProgress(),
    auth = useAuth();
  const today = dateKey(),
    count = dayCount(progress, today),
    completed = Object.keys(progress.skills).length;
  const unit =
    UNITS.find((u) => challengesFor(u.id).some((c) => !progress.skills[c.id])) ?? UNITS[0];
  const unitDone = challengesFor(unit.id).filter((c) => progress.skills[c.id]).length;
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
  const due = dueIds(progress).length;
  const result = progress.assessments[0];
  const daily = dailyPlan(progress, today);
  const reviewCount = daily.filter((q) => q.reason === 'review').length;
  return (
    <Page>
      <View style={S.between}>
        <Brand />
        <View style={[S.row, { gap: 13 }]}>
          <View
            style={[
              S.row,
              {
                gap: 5,
                backgroundColor: C.coralSoft,
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 12,
              },
            ]}
          >
            <Icon name="flame" color={C.coral} size={17} />
            <Text style={{ fontWeight: '800', color: '#B65745', fontSize: 13 }}>
              {streak(progress)}
            </Text>
          </View>
          <Avatar name={auth.user?.name} size={39} onPress={() => router.navigate('/you')} />
        </View>
      </View>
      <View style={{ gap: 9, marginTop: 6 }}>
        <View style={S.between}>
          <Text style={S.eyebrow}>YOUR DAILY DOSE OF AHA</Text>
          <Text style={{ fontSize: 10, color: C.muted }}>
            {new Date().toLocaleDateString('en-CA', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <Text style={[S.title, { fontSize: 34, lineHeight: 39 }]}>
          {auth.user
            ? 'Ready, ' + auth.user.name.split(' ')[0] + '?'
            : 'A little sharper,\none day at a time.'}
        </Text>
        <Text style={[S.text, { fontSize: 13 }]}>
          {count >= 3
            ? 'Daily goal done. Curiosity doesn’t have a limit.'
            : 'A few minutes. A few puzzles. One idea that clicks.'}
        </Text>
      </View>
      <LinearGradient
        colors={['#7962E3', '#5742BB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 27, padding: 23, gap: 19, overflow: 'hidden' }}
      >
        <View
          style={{
            position: 'absolute',
            right: -40,
            top: -60,
            width: 220,
            height: 220,
            borderRadius: 110,
            borderColor: '#AA96FF35',
            borderWidth: 36,
          }}
        />
        <View style={S.between}>
          <View
            style={{
              backgroundColor: '#FFFFFF20',
              paddingVertical: 6,
              paddingHorizontal: 9,
              borderRadius: 9,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 1, color: '#F1EBFF' }}>
              {unitDone ? 'PICK UP WHERE YOU LEFT OFF' : 'YOUR NEXT LESSON'}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: '#E6DCFF' }}>
            UNIT {unit.number.toString().padStart(2, '0')}
          </Text>
        </View>
        <View style={[S.row, { minHeight: 105 }]}>
          <View style={{ flex: 1, gap: 9 }}>
            <Text
              style={{
                color: C.white,
                fontSize: 26,
                lineHeight: 30,
                fontWeight: '800',
                letterSpacing: -0.7,
              }}
            >
              {unit.title}
            </Text>
            <Text style={{ fontSize: 12, lineHeight: 19, color: '#E7DFFF' }}>{unit.subtitle}</Text>
          </View>
          <View style={{ marginRight: -15, marginLeft: 3 }}>
            <TraceArt width={133} />
          </View>
        </View>
        <View style={{ gap: 9 }}>
          <View
            style={{ height: 5, borderRadius: 4, backgroundColor: '#FFFFFF25', overflow: 'hidden' }}
          >
            <View
              style={{
                width: ((unitDone / challengesFor(unit.id).length) * 100 + '%') as `${number}%`,
                height: 5,
                backgroundColor: '#DACAFF',
                borderRadius: 4,
              }}
            />
          </View>
          <View style={S.between}>
            <Text style={{ fontSize: 10, color: '#E9E1FF' }}>
              {unitDone} of {challengesFor(unit.id).length} families explored
            </Text>
            <Text style={{ fontSize: 10, color: '#E9E1FF' }}>Tap. Think. Try.</Text>
          </View>
        </View>
        <Button
          title={unitDone ? 'Continue lesson' : 'Let’s make it click'}
          secondary
          icon="arrow-forward"
          onPress={() => router.push(('/lesson/' + unit.id) as '/lesson/[unit]')}
          style={{ backgroundColor: C.white, borderColor: '#D2C4F4' }}
        />
      </LinearGradient>
      <View style={[S.card, { gap: 18 }]}>
        <View style={[S.row, { gap: 14 }]}>
          <GoalRing value={count / 3} />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={S.sectionTitle}>
              {count >= 3 ? 'Three cheers for your brain.' : 'Your daily three'}
            </Text>
            <Text style={{ fontSize: 12, color: C.muted }}>
              {Math.min(count, 3)} of 3 challenges
              {count >= 3 ? ' · goal reached' : ' · you’ve got this'}
            </Text>
          </View>
          {count >= 3 && <Icon name="sparkles" color="#B58A33" />}
        </View>
        <View style={[S.between, { paddingHorizontal: 4 }]}>
          {days.map((day) => {
            const done = !!progress.days[day]?.length,
              current = day === today;
            return (
              <View
                key={day}
                accessible
                accessibilityLabel={day + (done ? ': practiced' : ': not practiced')}
                style={{ alignItems: 'center', gap: 8 }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: current ? '800' : '500',
                    color: current ? C.purple : C.muted,
                  }}
                >
                  {new Date(day + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'narrow' })}
                </Text>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 11,
                    borderWidth: current ? 1.5 : 0,
                    borderColor: C.purple,
                    backgroundColor: done ? C.purple : current ? C.lavender : '#F0EDF5',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {done ? (
                    <Icon name="checkmark" size={16} color={C.white} />
                  ) : current ? (
                    <View
                      style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.purple }}
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
        <Text style={{ fontSize: 12, lineHeight: 19, color: C.muted }}>
          {reviewCount
            ? `${reviewCount} spaced ${reviewCount === 1 ? 'review' : 'reviews'}, then something new. Fresh variations of ideas that need another look.`
            : 'A short session picked from your learning history. Fresh questions, one idea at a time.'}
        </Text>
        {daily.length > 0 && (
          <Button
            title={
              count >= 3
                ? 'Try another short session'
                : `Start my ${daily.length === 3 ? 'daily three' : 'short session'}`
            }
            icon="arrow-forward"
            onPress={() => router.push('/lesson/daily')}
          />
        )}
      </View>
      <View style={S.between}>
        <Text style={S.sectionTitle}>Find your next small win.</Text>
        <Chip>{totalXP(progress)} XP</Chip>
      </View>
      <View style={[S.row, { gap: 12 }]}>
        {[
          {
            title: 'Mixed practice',
            detail: '5 fresh variations',
            icon: 'shuffle-outline' as const,
            soft: C.lavender,
            color: C.purple,
            route: '/lesson/mixed' as const,
          },
          {
            title: 'Quick review',
            detail: due
              ? due + (due === 1 ? ' family ready' : ' families ready')
              : 'Keep familiar ideas fresh',
            icon: 'refresh-outline' as const,
            soft: C.amberSoft,
            color: '#9A732D',
            route: '/review' as const,
          },
        ].map((item) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            onPress={() => router.push(item.route)}
            style={({ pressed }) => [
              S.card,
              { flex: 1, gap: 12, padding: 17, borderRadius: 21, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <View
              style={{
                backgroundColor: item.soft,
                width: 39,
                height: 39,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={item.icon} color={item.color} />
            </View>
            <View style={{ gap: 5 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink }}>{item.title}</Text>
              <Text style={{ fontSize: 10, lineHeight: 17, color: C.muted }}>{item.detail}</Text>
            </View>
            <Icon name="arrow-forward" size={16} color={item.color} />
          </Pressable>
        ))}
      </View>
      <RankCard
        rank={result ? skillRank(result.score) : null}
        label="MEET YOUR CURRENT FORM"
        value={
          result
            ? result.score + '% on your latest assessment'
            : 'Keyboard Toddler or Big-O Goblin? Find your starting point.'
        }
        onPress={() => router.navigate('/assess')}
      />
      <View style={{ gap: 10 }}>
        <View style={S.between}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.ink }}>Your learning path</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/learn')}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: C.purple }}>
              Explore all units →
            </Text>
          </Pressable>
        </View>
        <Bar value={completed / CHALLENGES.length} />
        <Text style={{ fontSize: 11, color: C.muted }}>
          {completed} of {CHALLENGES.length} question families explored
        </Text>
      </View>
      {!auth.user && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/auth/sign-in?mode=sign-up')}
          style={[S.row, { padding: 17, borderRadius: 20, backgroundColor: '#EEEBF7', gap: 12 }]}
        >
          <View
            style={{
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.white,
              borderRadius: 12,
            }}
          >
            <Icon name="cloud-outline" color={C.purple} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: C.ink }}>
              Your progress deserves a home.
            </Text>
            <Text style={{ fontSize: 11, color: C.muted }}>
              Create an account when you’re ready.
            </Text>
          </View>
          <Icon name="arrow-forward" color={C.purple} size={16} />
        </Pressable>
      )}
    </Page>
  );
}
