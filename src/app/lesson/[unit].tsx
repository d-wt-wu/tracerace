import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CHALLENGES,
  UNITS,
  challengesFor,
  correctChoice,
  type Challenge,
} from '../../content/curriculum';
import { traceProgram } from '../../engine/c';
import { freshVariant, selectPractice } from '../../content/bank';
import { useLeague } from '../../state/LeagueProvider';
import { DifficultyTag } from '../../ui/ranks';
import type { GradeReceipt } from '../../domain/league';
import { useProgress } from '../../state/ProgressProvider';
import { dueIds } from '../../state/progress';
import { dailyQuestions } from '../../domain/daily';
import { Bar, Button, Chip, CodeBlock, Icon, IconButton, TraceArt } from '../../ui/components';
import { TraceInspector } from '../../ui/TraceInspector';
import { C, S } from '../../ui/theme';

export default function Lesson() {
  const params = useLocalSearchParams<{ unit: string; difficulty?: string }>();
  const unitId = Array.isArray(params.unit) ? params.unit[0] : params.unit;
  const difficulty = ['easy', 'medium', 'hard'].includes(params.difficulty ?? '')
    ? params.difficulty
    : undefined;
  return (
    <LessonSession
      key={unitId + ':' + (difficulty ?? 'all')}
      unitId={unitId}
      difficulty={difficulty}
    />
  );
}
function LessonSession({ unitId, difficulty }: { unitId: string; difficulty?: string }) {
  const { progress, storageNotice } = useProgress();
  const { ready, practice } = useLeague();
  const snapshot = useRef(progress);
  const [seed] = useState(() => Math.floor(Math.random() * 0x100000000));
  const [questions, setQuestions] = useState<Challenge[]>([]),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const p = snapshot.current;
    const recent = p.rewards.slice(-80).map((r) => r.variantId);
    let all =
      unitId === 'review'
        ? (dueIds(p).length ? dueIds(p) : Object.keys(p.skills))
            .map((id) => CHALLENGES.find((c) => c.id === id))
            .filter((q): q is Challenge => !!q)
        : unitId === 'mixed'
          ? CHALLENGES
          : challengesFor(unitId);
    all = all.filter((q) => !difficulty || q.difficulty === difficulty);
    const remaining = all.filter((q) => !p.skills[q.id]);
    const selected =
      unitId === 'daily'
        ? dailyQuestions(p)
        : unitId === 'mixed'
          ? selectPractice(
              all.map((q) => q.id),
              seed,
              recent,
              5,
            )
          : (remaining.length ? remaining : all)
              .slice(0, unitId === 'review' ? 8 : 5)
              .map((q, i) => freshVariant(q.id, (seed + i * 2654435761) >>> 0, recent));
    const request = selected.length ? practice(selected.map((q) => q.id)) : Promise.resolve(null);
    request.then((remote) => {
      if (alive) {
        setQuestions(remote ?? selected);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [unitId, difficulty, seed, ready, practice]);
  const unit = UNITS.find((u) => u.id === unitId);
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<{ xp: number; first: boolean }[]>([]);
  if (loading)
    return (
      <SafeAreaView style={S.screen}>
        <View style={[S.content, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={C.purple} />
          <Text style={S.text}>Preparing fresh questions…</Text>
        </View>
      </SafeAreaView>
    );
  if (!questions.length)
    return (
      <SafeAreaView style={S.screen}>
        <View style={[S.content, { flex: 1, justifyContent: 'center' }]}>
          <Text style={S.title}>Nothing here yet.</Text>
          <Text style={S.text}>Pick a unit from the learning path to get started.</Text>
          <Button title="Back to learning" onPress={() => router.replace('/learn')} />
        </View>
      </SafeAreaView>
    );
  if (index >= questions.length)
    return (
      <SafeAreaView style={S.screen}>
        <ScrollView
          contentContainerStyle={[
            S.content,
            { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 35 },
          ]}
        >
          <TraceArt width={220} />
          <Chip>LESSON COMPLETE</Chip>
          <Text style={[S.title, { textAlign: 'center' }]}>
            That’s one more{'\n'}thing that clicks.
          </Text>
          <Text style={[S.text, { textAlign: 'center' }]}>
            {scores.filter((s) => s.first).length} of {questions.length} solved without help.{'\n'}
            Every attempt moved you forward.
          </Text>
          <View style={[S.card, S.between, { width: '100%', paddingHorizontal: 28 }]}>
            <View style={{ gap: 7 }}>
              <Text style={S.eyebrow}>THIS LESSON</Text>
              <Text style={{ fontSize: 30, fontWeight: '800', color: C.purple }}>
                +{scores.reduce((n, s) => n + s.xp, 0)} XP
              </Text>
            </View>
            <View style={{ backgroundColor: C.amberSoft, padding: 16, borderRadius: 18 }}>
              <Icon name="sparkles" color="#B4842F" size={26} />
            </View>
          </View>
          <Text style={{ fontSize: 12, color: C.muted, textAlign: 'center', lineHeight: 20 }}>
            {storageNotice
              ? storageNotice
              : 'Progress is kept on this device. Your next refresher will appear in Review.'}
          </Text>
          <Button
            title="Back to Today"
            icon="arrow-forward"
            onPress={() => router.replace('/')}
            style={{ alignSelf: 'stretch' }}
          />
          <Button
            title="Explore the learning path"
            secondary
            onPress={() => router.replace('/learn')}
            style={{ alignSelf: 'stretch' }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  return (
    <ChallengeScreen
      key={questions[index].id}
      challenge={questions[index]}
      number={index + 1}
      total={questions.length}
      title={
        unit?.title ??
        (unitId === 'daily'
          ? 'Your daily three'
          : unitId === 'mixed'
            ? 'A little of everything'
            : 'A second look')
      }
      color={unit?.color ?? C.purple}
      onContinue={(xp, first) => {
        setScores((previous) => [...previous, { xp, first }]);
        setIndex((i) => i + 1);
      }}
    />
  );
}
function ChallengeScreen({
  challenge,
  number,
  total,
  title,
  color,
  onContinue,
}: {
  challenge: Challenge;
  number: number;
  total: number;
  title: string;
  color: string;
  onContinue: (xp: number, first: boolean) => void;
}) {
  const { progress, solve, storageNotice } = useProgress();
  const league = useLeague();
  const [checking, setChecking] = useState(false),
    [receipt, setReceipt] = useState<GradeReceipt | null>(null);
  const checkingRef = useRef(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<'answering' | 'wrong' | 'correct'>('answering');
  const [assisted, setAssisted] = useState(false),
    [showHint, setShowHint] = useState(false),
    [showTrace, setShowTrace] = useState(false);
  const [step, setStep] = useState(0),
    [earned, setEarned] = useState(0);
  const checked = useRef(false),
    advanced = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const toggleTrace = () => {
    if (status !== 'correct') setAssisted(true);
    setShowTrace(!showTrace);
    if (!showTrace) scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const trace = useMemo(
    () => (challenge.mode === 'trace' ? traceProgram(challenge.code) : null),
    [challenge.code, challenge.mode],
  );
  const correct = useMemo(() => correctChoice(challenge), [challenge]);
  const check = async () => {
    if (!selected || checked.current || checkingRef.current || status === 'correct') return;
    checkingRef.current = true;
    setChecking(true);
    if (selected === correct.value) {
      checked.current = true;
      setEarned(solve(challenge, assisted));
      setStatus('correct');
      if (progress.haptics && Platform.OS !== 'web')
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined,
        );
    } else {
      setStatus('wrong');
      setAssisted(true);
    }
    const saved = await league.grade(challenge, selected, assisted);
    setReceipt(saved);
    checkingRef.current = false;
    setChecking(false);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
  };
  return (
    <SafeAreaView style={S.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 13, gap: 12 }}>
        <View style={[S.row, { gap: 14 }]}>
          <IconButton
            name="close"
            label="Leave lesson; completed answers stay saved"
            onPress={() => router.replace('/learn')}
          />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ fontWeight: '800', color: C.ink, fontSize: 13 }}>{title}</Text>
            <Text style={{ color: C.muted, fontSize: 10 }}>
              CHALLENGE {number} OF {total}
            </Text>
          </View>
          <DifficultyTag level={challenge.difficulty} />
        </View>
        <Bar value={(number - (status === 'correct' ? 0 : 1)) / total} color={color} height={7} />
      </View>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 13,
          paddingBottom: 25,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {storageNotice && (
          <Text accessibilityRole="alert" style={[S.text, { color: C.coral }]}>
            {storageNotice}
          </Text>
        )}
        <View style={{ gap: 8 }}>
          <Text style={[S.eyebrow, { color }]}>PREDICT · TAP · UNDERSTAND</Text>
          <Text style={[S.title, { fontSize: 27, lineHeight: 33 }]}>{challenge.title}</Text>
          <Text style={[S.text, { color: C.ink, fontSize: 15 }]}>{challenge.prompt}</Text>
        </View>
        <CodeBlock
          code={challenge.code}
          language={challenge.language}
          line={showTrace && trace ? trace.steps[step].line : 0}
        />
        {showTrace && trace && (
          <TraceInspector
            trace={trace}
            step={step}
            onStep={(delta) =>
              setStep((previous) => Math.max(0, Math.min(trace.steps.length - 1, previous + delta)))
            }
            onClose={() => setShowTrace(false)}
          />
        )}
        {!showTrace && (
          <>
            <View style={{ gap: 10 }}>
              {challenge.choices.map((choice, i) => {
                const chosen = choice.value === selected,
                  right = status === 'correct' && chosen;
                const wrong = status === 'wrong' && chosen;
                return (
                  <Pressable
                    key={choice.value}
                    accessibilityRole="radio"
                    aria-checked={chosen}
                    accessibilityState={{ checked: chosen, disabled: status === 'correct' }}
                    accessibilityLabel={'Answer ' + choice.label}
                    disabled={status === 'correct'}
                    onPress={() => {
                      setSelected(choice.value);
                      setStatus('answering');
                    }}
                    style={({ pressed }) => ({
                      minHeight: 59,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderBottomWidth: 3,
                      borderColor: wrong ? '#D58D80' : chosen ? C.purple : C.line,
                      backgroundColor: wrong ? C.coralSoft : chosen ? C.lavender : C.white,
                      padding: 11,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 13,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        backgroundColor: chosen ? C.purple : '#F3F0F5',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {right ? (
                        <Icon name="checkmark" color={C.white} size={18} />
                      ) : (
                        <Text
                          style={{
                            color: chosen ? C.white : C.muted,
                            fontWeight: '700',
                            fontSize: 12,
                          }}
                        >
                          {String.fromCharCode(65 + i)}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        color: C.ink,
                        fontSize: 15,
                        fontWeight: chosen ? '800' : '600',
                      }}
                    >
                      {choice.label}
                    </Text>
                    {chosen && !right && (
                      <Icon
                        name={wrong ? 'close-circle-outline' : 'radio-button-on'}
                        color={wrong ? '#AC5748' : C.purple}
                        size={19}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
            {status !== 'correct' && (
              <View style={S.between}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setShowHint(!showHint);
                    setAssisted(true);
                  }}
                  style={[S.row, { gap: 6, minHeight: 44 }]}
                >
                  <Icon name="bulb-outline" color={C.muted} size={17} />
                  <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>
                    {showHint ? 'Hide hint' : 'A little hint'}
                  </Text>
                </Pressable>
                {challenge.mode === 'trace' && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={toggleTrace}
                    style={[S.row, { gap: 6, minHeight: 44 }]}
                  >
                    <Icon name="git-branch-outline" color={C.purple} size={17} />
                    <Text style={{ color: C.purple, fontSize: 12, fontWeight: '800' }}>
                      {showTrace ? 'Hide trace' : 'Trace the code'}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
            {showHint && status !== 'correct' && (
              <View style={{ backgroundColor: C.amberSoft, borderRadius: 14, padding: 15 }}>
                <Text style={[S.text, { color: '#886729', fontSize: 13 }]}>{challenge.hint}</Text>
              </View>
            )}
            {status === 'wrong' && (
              <View
                accessibilityLiveRegion="polite"
                style={{ padding: 17, borderRadius: 16, backgroundColor: C.coralSoft, gap: 5 }}
              >
                <Text style={{ color: '#A44C3D', fontSize: 15, fontWeight: '800' }}>
                  Not quite. Take another look.
                </Text>
                <Text style={{ color: '#8F635B', fontSize: 13, lineHeight: 21 }}>
                  {challenge.hint}
                </Text>
              </View>
            )}
            {status === 'correct' && (
              <View
                accessibilityLiveRegion="polite"
                style={{ padding: 19, borderRadius: 18, backgroundColor: C.lavender, gap: 11 }}
              >
                <View style={S.between}>
                  <View style={[S.row, { gap: 7 }]}>
                    <Icon name="checkmark-circle" color={C.purple} />
                    <Text style={{ color: C.purple, fontSize: 16, fontWeight: '800' }}>
                      That’s it!
                    </Text>
                  </View>
                  <Text style={{ color: C.purple, fontWeight: '800', fontSize: 12 }}>
                    {earned ? '+' + earned + ' XP' : 'GOOD PRACTICE'}
                  </Text>
                </View>
                <Text style={{ color: C.ink, fontSize: 13, lineHeight: 22 }}>
                  {challenge.explanation}
                </Text>
                {challenge.mode === 'trace' && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={toggleTrace}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text style={{ color: C.purple, fontWeight: '800', fontSize: 12 }}>
                      {showTrace ? 'Hide the step-by-step trace ↑' : 'See the step-by-step trace →'}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
            {challenge.rankTicket && status === 'correct' && !checking && (
              <Text style={{ fontSize: 11, color: receipt ? C.purple : C.coral, lineHeight: 18 }}>
                {receipt
                  ? '+' +
                    receipt.xp +
                    ' league XP' +
                    (receipt.capped
                      ? ' · daily league cap reached'
                      : receipt.alreadySolved
                        ? ' · this variant was already counted today'
                        : '')
                  : 'Saved on this device. League XP could not be confirmed.'}
              </Text>
            )}
            {!challenge.rankTicket && league.identity?.active && (
              <Text style={{ fontSize: 10, color: C.muted }}>
                This lesson is on-device only. League XP needs an online lesson.
              </Text>
            )}
            <Button
              title={
                checking
                  ? 'Checking your answer…'
                  : status === 'correct'
                    ? number === total
                      ? 'Finish lesson'
                      : 'Continue'
                    : 'Check answer'
              }
              disabled={checking || (status !== 'correct' && (!selected || status === 'wrong'))}
              icon={status === 'correct' ? 'arrow-forward' : undefined}
              onPress={
                status === 'correct'
                  ? () => {
                      if (!advanced.current) {
                        advanced.current = true;
                        onContinue(earned, !assisted);
                      }
                    }
                  : () => {
                      void check();
                    }
              }
            />
            <Text style={{ fontSize: 10, color: C.muted, textAlign: 'center', lineHeight: 16 }}>
              {status === 'correct'
                ? 'Understanding it matters more than getting it first try.'
                : assisted
                  ? progress.skills[challenge.id]
                    ? 'A fresh variant earns 2 XP with help; the same variant earns none today.'
                    : 'Hints help you learn. A new family earns 10 XP with help.'
                  : 'No timer. Give yourself a moment to think.'}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
