import { useState } from 'react';
import { router } from 'expo-router';
import { Modal, Pressable, Text, View } from 'react-native';
import { TOPICS } from '../../content/bank';
import { newDraft } from '../../domain/assessment';
import { SKILL_RANKS, skillRank } from '../../domain/ranks';
import { useProgress } from '../../state/ProgressProvider';
import { useLeague } from '../../state/LeagueProvider';
import { Button, Chip, Icon, Page, Bar } from '../../ui/components';
import { RankCard, RankLadder } from '../../ui/ranks';
import { C, S } from '../../ui/theme';
export default function Assess() {
  const { progress, startAssessment } = useProgress(),
    league = useLeague();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [ladder, setLadder] = useState(false),
    [replace, setReplace] = useState(false);
  const last = progress.assessments[0],
    draft = progress.assessmentDraft,
    answered = draft?.answers.filter((a) => a !== null).length ?? 0;
  const start = async (local = false) => {
    setBusy(true);
    setError(null);
    setReplace(false);
    try {
      const remote = local ? null : await league.assessment();
      startAssessment(remote ?? newDraft(Math.floor(Math.random() * 0x100000000)));
      router.push('/assessment/run');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The assessment could not start.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page>
      <View style={[S.card, { gap: 10, backgroundColor: C.lavender }]}>
        <Text style={[S.text, { fontSize: 12 }]}>
          This is the general CS skill check. The CSCB07 midterm course has its own prerequisite
          path, written work, and paper practice.
        </Text>
        <Button
          title="Open CSCB07 midterm practice"
          secondary
          onPress={() => router.push('/course/cscb07' as '/')}
        />
      </View>
      <View style={{ gap: 9, marginTop: 8 }}>
        <Text style={S.eyebrow}>A SKILL CHECK, WITH PERSONALITY</Text>
        <Text style={S.title}>Meet your{'\n'}current form.</Text>
        <Text style={S.text}>Keyboard Toddler? Big-O Goblin? Let’s see what’s clicking today.</Text>
      </View>
      <RankCard
        rank={last ? skillRank(last.score) : null}
        label={last ? 'YOUR LATEST SKILL RANK' : 'YOUR SKILL RANK'}
        value={
          last
            ? last.score + '% weighted score · ' + last.correct + '/18 correct'
            : 'Unassessed. A perfectly good place to start.'
        }
        onPress={
          last
            ? () => router.push(('/assessment/result/' + last.id) as '/assessment/result/[id]')
            : undefined
        }
      />
      <View style={[S.card, { gap: 17 }]}>
        <View style={S.between}>
          <Text style={S.sectionTitle}>
            {draft ? 'Your attempt is waiting.' : 'A little of everything.'}
          </Text>
          <Chip>
            {draft?.remoteId
              ? 'RANKED'
              : league.identity?.active
                ? 'RANKED AVAILABLE'
                : 'ON DEVICE'}
          </Chip>
        </View>
        <View style={[S.row, { gap: 12 }]}>
          {[
            ['18', 'questions'],
            ['6', 'topic areas'],
            ['3', 'difficulties'],
          ].map(([n, label]) => (
            <View
              key={label}
              style={{
                flex: 1,
                gap: 5,
                backgroundColor: C.bg,
                padding: 12,
                borderRadius: 13,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 25, fontWeight: '800', color: C.purple }}>{n}</Text>
              <Text style={{ fontSize: 10, color: C.muted }}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={[S.text, { fontSize: 12, lineHeight: 20 }]}>
          One easy, medium, and hard question in each area. Inputs and answer positions change each
          time. Take your time; answers are explained after you finish.
        </Text>
        {draft && (
          <View style={{ gap: 9 }}>
            <Bar value={answered / 18} />
            <Text style={{ color: C.muted, fontSize: 12 }}>
              {answered}/18 answers saved · resume whenever you like
            </Text>
          </View>
        )}
        <Button
          title={
            busy ? 'Preparing your questions…' : draft ? 'Resume assessment' : 'Find my skill rank'
          }
          disabled={busy || !league.ready}
          onPress={
            draft
              ? () => router.push('/assessment/run')
              : () => {
                  void start();
                }
          }
          icon="arrow-forward"
        />
        {draft && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setReplace(true)}
            style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text style={{ color: C.muted, fontSize: 12 }}>Start a fresh assessment</Text>
          </Pressable>
        )}
        {error && (
          <>
            <Text accessibilityRole="alert" style={[S.text, { color: '#A7782F', fontSize: 12 }]}>
              {error}
            </Text>
            <Button
              title="Start a device-only assessment"
              secondary
              disabled={busy}
              onPress={() => {
                void start(true);
              }}
            />
          </>
        )}
      </View>
      <Text style={S.sectionTitle}>What’s in the mix</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {TOPICS.map((topic) => (
          <Chip key={topic.id}>{topic.title}</Chip>
        ))}
      </View>
      <View style={[S.row, { gap: 12, alignItems: 'flex-start', paddingHorizontal: 3 }]}>
        <Icon name="bulb-outline" color={C.purple} />
        <Text style={[S.text, { flex: 1, fontSize: 12, lineHeight: 20 }]}>
          Easy = 1 point, medium = 2, hard = 3. The title reflects this short assessment across
          these six areas. Titles are for fun; difficulty is curated rather than calibrated.
        </Text>
      </View>
      {!league.identity?.active && (
        <Button
          title="Join the league for a ranked assessment"
          secondary
          onPress={() => router.navigate('/ranks')}
        />
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => setLadder(!ladder)}
        style={[S.between, { minHeight: 44 }]}
      >
        <Text style={{ color: C.purple, fontSize: 13, fontWeight: '800' }}>
          {ladder ? 'Hide the skill ladder' : 'From Baby Byte to Compiler Whisperer'}
        </Text>
        <Icon name={ladder ? 'chevron-up' : 'chevron-down'} color={C.purple} size={17} />
      </Pressable>
      {ladder && <RankLadder ranks={SKILL_RANKS} value={last?.score ?? null} suffix="%" />}
      {!!progress.assessments.length && (
        <View style={{ gap: 12 }}>
          <Text style={S.sectionTitle}>Your recent forms</Text>
          {progress.assessments.slice(0, 5).map((result) => (
            <Pressable
              accessibilityRole="button"
              key={result.id}
              onPress={() =>
                router.push(('/assessment/result/' + result.id) as '/assessment/result/[id]')
              }
              style={[S.card, S.between, { padding: 16 }]}
            >
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ fontWeight: '800', color: C.ink, fontSize: 13 }}>
                  {skillRank(result.score).name}
                </Text>
                <Text style={{ color: C.muted, fontSize: 10 }}>
                  {new Date(result.date).toLocaleDateString()} ·{' '}
                  {result.ranked ? 'server-graded' : 'on device'}
                </Text>
              </View>
              <Text style={{ fontWeight: '800', color: C.purple }}>{result.score}%</Text>
              <Icon name="chevron-forward" color={C.muted} size={16} />
            </Pressable>
          ))}
        </View>
      )}
      <Modal
        transparent
        visible={replace}
        onRequestClose={() => setReplace(false)}
        animationType="fade"
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#24243D70',
            padding: 28,
          }}
        >
          <View style={[S.card, { width: '100%', maxWidth: 390, gap: 18 }]}>
            <Text style={S.sectionTitle}>Replace this unfinished attempt?</Text>
            <Text style={S.text}>
              Your finished assessments stay in your history. The current unfinished answers will be
              replaced.
            </Text>
            <Button
              title="Start a fresh attempt"
              onPress={() => {
                void start();
              }}
            />
            <Button title="Keep my current attempt" secondary onPress={() => setReplace(false)} />
          </View>
        </View>
      </Modal>
    </Page>
  );
}
