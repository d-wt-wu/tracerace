import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useLeague } from '../../state/LeagueProvider';
import { useAuth } from '../../state/AuthProvider';
import { leagueRank, skillRank, LEAGUES, SKILL_RANKS, nextRank } from '../../domain/ranks';
import { Button, Chip, Icon, Page } from '../../ui/components';
import { RankBadge, RankCard, RankLadder } from '../../ui/ranks';
import { C, S } from '../../ui/theme';
export default function Rankings() {
  const league = useLeague();
  const auth = useAuth();
  const params = useLocalSearchParams<{ board?: string }>();
  const kind = params.board === 'skills' ? 'skills' : 'weekly';
  const [alias, setAlias] = useState(''),
    [ladder, setLadder] = useState(false),
    [refreshing, setRefreshing] = useState(false);
  const joined = !!league.identity?.active,
    board = league.boards?.[kind];
  const xp = league.boards?.weekly.me?.xp ?? 0,
    score = league.boards?.skills.me?.score ?? null;
  const rank =
    kind === 'weekly'
      ? joined && !league.boards
        ? null
        : leagueRank(xp)
      : score === null
        ? null
        : skillRank(score);
  const next = nextRank(
    kind === 'weekly' ? LEAGUES : SKILL_RANKS,
    kind === 'weekly' ? xp : (score ?? 0),
  );
  return (
    <Page>
      <View style={{ gap: 9, marginTop: 8 }}>
        <Text style={S.eyebrow}>FRIENDLY COMPETITION. QUESTIONABLE TITLES.</Text>
        <Text style={S.title}>Climb the weird{'\n'}little ladder.</Text>
        <Text style={S.text}>
          Practice your way up the weekly league. Test your way up the skill board.
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          padding: 5,
          backgroundColor: C.lavender,
          borderRadius: 15,
          gap: 4,
        }}
      >
        {(['weekly', 'skills'] as const).map((tab) => (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: kind === tab }}
            aria-selected={kind === tab}
            onPress={() => {
              router.setParams({ board: tab });
              setLadder(false);
            }}
            style={{
              flex: 1,
              minHeight: 42,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 11,
              backgroundColor: kind === tab ? C.white : 'transparent',
            }}
          >
            <Text
              style={{ fontWeight: '800', fontSize: 12, color: kind === tab ? C.purple : C.muted }}
            >
              {tab === 'weekly' ? 'Weekly league' : 'Skill board'}
            </Text>
          </Pressable>
        ))}
      </View>
      <RankCard
        rank={rank}
        label={
          kind === 'weekly'
            ? joined
              ? 'YOUR LEAGUE THIS WEEK'
              : 'YOUR FIRST LEAGUE'
            : 'LATEST VERIFIED ASSESSMENT'
        }
        value={
          kind === 'weekly'
            ? joined
              ? !league.boards
                ? 'Waiting for verified standings.'
                : xp +
                  ' league XP · ' +
                  (board?.me ? '#' + board.me.rank + ' of ' + board.total : 'loading your place')
              : 'The potato believes in you.'
            : score === null
              ? joined && !league.boards
                ? 'Load rankings to see your latest verified assessment.'
                : 'Take a ranked assessment to enter this board.'
              : score + '% weighted score · ' + rank?.subtitle
        }
        next={
          next && (!joined || !!league.boards) && (kind === 'weekly' || score !== null)
            ? {
                title:
                  next.threshold -
                  (kind === 'weekly' ? xp : score!) +
                  (kind === 'weekly' ? ' XP to ' : ' percentage points to ') +
                  next.name,
                value:
                  ((kind === 'weekly' ? xp : score!) - (rank?.threshold ?? 0)) /
                  (next.threshold - (rank?.threshold ?? 0)),
              }
            : undefined
        }
      />
      {!auth.user && (
        <View style={[S.card, { gap: 12 }]}>
          <Text style={S.sectionTitle}>Your rank, wherever you practice.</Text>
          <Text style={S.text}>
            An account keeps your verified rankings with you. Guest nicknames still work on this
            device.
          </Text>
          <Button
            title="Sign in or create an account"
            secondary
            onPress={() => router.push('/auth/sign-in')}
          />
        </View>
      )}
      {auth.user && !auth.profile && (
        <Button
          title="Finish setting up your profile"
          onPress={() => router.push('/account/setup')}
        />
      )}
      {!joined && (!auth.user || !!auth.profile) && (
        <View style={[S.card, { gap: 14 }]}>
          <View style={[S.row, { gap: 8 }]}>
            <Icon name="people-outline" color={C.purple} />
            <Text style={S.sectionTitle}>
              {league.identity ? 'Back for another round?' : 'Join with a nickname.'}
            </Text>
          </View>
          <Text style={[S.text, { fontSize: 12, lineHeight: 20 }]}>
            Your nickname, weekly XP, and latest ranked assessment score will be visible to other
            players. Pick a nickname you’re happy to share.
          </Text>
          <TextInput
            accessibilityLabel="League nickname"
            placeholder={league.identity?.alias ?? 'e.g. StackGoblin'}
            placeholderTextColor={C.muted}
            value={alias}
            onChangeText={setAlias}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              minHeight: 52,
              borderColor: C.line,
              borderWidth: 1.5,
              borderRadius: 13,
              paddingHorizontal: 14,
              color: C.ink,
              fontSize: 15,
              backgroundColor: C.bg,
            }}
          />
          <Button
            title={league.busy ? 'Joining…' : 'Enter the Potato Division'}
            disabled={!league.ready || league.busy || (alias.trim().length < 2 && !league.identity)}
            onPress={() => {
              void league.join(alias.trim() || league.identity!.alias);
            }}
            icon="arrow-forward"
          />
          <Text style={{ color: C.muted, fontSize: 10, lineHeight: 17 }}>
            {auth.user
              ? 'Your rankings belong to your account. You can hide them at any time.'
              : 'This guest ticket belongs to this device. Sign in to keep your rankings across devices.'}{' '}
            Practice works without joining.
          </Text>
        </View>
      )}
      {league.error && (
        <View style={{ backgroundColor: C.amberSoft, padding: 15, borderRadius: 15 }}>
          <Text accessibilityRole="alert" style={[S.text, { color: '#886729', fontSize: 12 }]}>
            {league.error}
          </Text>
        </View>
      )}
      {joined && (
        <View style={{ gap: 14 }}>
          <View style={S.between}>
            <Text style={S.sectionTitle}>
              {kind === 'weekly' ? 'This week’s humans' : 'The skill board'}
            </Text>
            <Chip>
              {board?.total ?? '…'} {board?.total === 1 ? 'PLAYER' : 'PLAYERS'}
            </Chip>
          </View>
          {kind === 'weekly' && (
            <Text style={{ color: C.muted, fontSize: 11 }}>
              Week of {league.boards?.week ?? '…'} · resets Monday at 00:00 UTC
            </Text>
          )}
          {board?.rows.length ? (
            <View style={[S.card, { padding: 0, overflow: 'hidden' }]}>
              {board.rows.map((row, i) => {
                const mine = row.id === league.identity?.id,
                  rowRank = kind === 'weekly' ? leagueRank(row.xp) : skillRank(row.score ?? 0);
                return (
                  <View
                    key={row.id}
                    style={[
                      S.row,
                      {
                        gap: 11,
                        padding: 14,
                        backgroundColor: mine ? C.lavender : C.white,
                        borderTopWidth: i ? 1 : 0,
                        borderTopColor: C.line,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        width: 25,
                        color: row.rank <= 3 ? '#AC7B24' : C.muted,
                        fontWeight: '800',
                        fontSize: 17,
                      }}
                    >
                      {row.rank}
                    </Text>
                    <RankBadge rank={rowRank} size={30} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: C.ink, fontSize: 13, fontWeight: '800' }}>
                        {row.alias}
                        {mine ? ' · you' : ''}
                      </Text>
                      <Text style={{ color: C.muted, fontSize: 10 }}>{rowRank.name}</Text>
                    </View>
                    <Text
                      style={{ color: mine ? C.purple : C.ink, fontSize: 13, fontWeight: '800' }}
                    >
                      {kind === 'weekly' ? row.xp + ' XP' : row.score + '%'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[S.card, { gap: 13 }]}>
              <Text style={S.sectionTitle}>
                {!board
                  ? 'Loading verified standings…'
                  : kind === 'skills'
                    ? 'An empty throne.'
                    : 'Finding your league…'}
              </Text>
              <Text style={S.text}>
                {!board
                  ? 'Your rankings have not loaded yet. Refresh to try again.'
                  : kind === 'skills'
                    ? 'Finish a ranked assessment to be the first name on this board.'
                    : 'Refresh to load the latest standings.'}
              </Text>
              {kind === 'skills' && board && (
                <Button title="Take the assessment" onPress={() => router.navigate('/assess')} />
              )}
            </View>
          )}
          {board?.me && !board.rows.some((row) => row.id === board.me!.id) && (
            <Text style={S.text}>
              Your place: #{board.me.rank} ·{' '}
              {kind === 'weekly' ? board.me.xp + ' XP' : board.me.score + '%'}.
            </Text>
          )}
          <Button
            title={refreshing ? 'Refreshing…' : 'Refresh rankings'}
            secondary
            disabled={refreshing}
            onPress={() => {
              setRefreshing(true);
              void league.refresh().finally(() => setRefreshing(false));
            }}
            icon="refresh-outline"
          />
          {league.boards && (
            <Text style={{ color: C.muted, fontSize: 10, textAlign: 'center' }}>
              Updated{' '}
              {new Date(league.boards.fetchedAt).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              · equal scores share a place · top 50 shown
            </Text>
          )}
        </View>
      )}
      <View style={[S.card, { gap: 11 }]}>
        <Text style={S.sectionTitle}>
          {kind === 'weekly' ? 'Practice earns your place.' : 'A snapshot, with a silly hat.'}
        </Text>
        <Text style={[S.text, { fontSize: 12, lineHeight: 20 }]}>
          {kind === 'weekly'
            ? 'New family: 20 XP, or 10 with help. A fresh variant: 5 XP, or 2 with help. The same variant earns XP once per UTC day. League XP is capped at 500 per day.'
            : 'The skill board uses your latest server-graded assessment. Easy answers earn 1 point, medium 2, and hard 3. Practice XP doesn’t affect your skill score.'}
        </Text>
        <Text style={{ color: C.muted, fontSize: 11, lineHeight: 18 }}>
          {kind === 'weekly'
            ? 'Weekly XP determines your league title. The week starts fresh; your assessment rank stays.'
            : '18 questions across six areas are a practice snapshot, with curated difficulty and playful titles.'}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setLadder(!ladder)}
        style={[S.between, { minHeight: 44 }]}
      >
        <Text style={{ color: C.purple, fontWeight: '800', fontSize: 13 }}>
          {ladder ? 'Hide the ridiculous titles' : 'See all the ridiculous titles'}
        </Text>
        <Icon name={ladder ? 'chevron-up' : 'chevron-down'} color={C.purple} size={17} />
      </Pressable>
      {ladder && (
        <RankLadder
          ranks={kind === 'weekly' ? LEAGUES : SKILL_RANKS}
          value={kind === 'weekly' ? (joined ? xp : null) : score}
          suffix={kind === 'weekly' ? ' XP' : '%'}
        />
      )}
      {joined && (
        <Pressable
          accessibilityRole="button"
          disabled={league.busy}
          onPress={() => {
            void league.setVisible(false);
          }}
          style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: C.muted, fontSize: 11 }}>Hide my public ranking</Text>
        </Pressable>
      )}
    </Page>
  );
}
