import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { makeQuestion, TOPICS } from '../../content/bank';
import { gradeAssessment, type AssessmentDraft } from '../../domain/assessment';
import { useProgress } from '../../state/ProgressProvider';
import { useLeague } from '../../state/LeagueProvider';
import { Bar, Button, CodeBlock, Icon, IconButton } from '../../ui/components';
import { DifficultyTag } from '../../ui/ranks';
import { C, S } from '../../ui/theme';
export default function AssessmentRun() {
  const { progress, answerAssessment, saveAssessment, storageNotice } = useProgress(),
    league = useLeague();
  const draft = progress.assessmentDraft;
  const [index, setIndex] = useState(() => {
    const i = draft?.answers.findIndex((a) => a === null) ?? 0;
    return i < 0 ? 17 : i;
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const guard = useRef(false),
    scroll = useRef<ScrollView>(null);
  if (!draft)
    return (
      <SafeAreaView style={S.screen}>
        <View style={[S.content, { flex: 1, justifyContent: 'center' }]}>
          <Text style={S.title}>Ready when you are.</Text>
          <Text style={S.text}>Start an assessment to find your current skill rank.</Text>
          <Button title="Go to assessments" onPress={() => router.replace('/assess')} />
        </View>
      </SafeAreaView>
    );
  const question = makeQuestion(draft.refs[index].id, draft.refs[index].seed),
    selected = draft.answers[index];
  const finish = async (current: AssessmentDraft, local = false) => {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError(null);
    try {
      const result =
        current.remoteId && !local
          ? await league.finish(current)
          : gradeAssessment(current.refs, current.answers as string[], current.id);
      saveAssessment(result);
      router.replace(('/assessment/result/' + result.id) as '/assessment/result/[id]');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your result could not be checked.');
    } finally {
      guard.current = false;
      setBusy(false);
    }
  };
  const advance = (value?: string) => {
    if (busy) return;
    const current = value
      ? { ...draft, answers: draft.answers.map((a, i) => (i === index ? value : a)) }
      : draft;
    if (value) answerAssessment(index, value);
    if (index === 17) {
      void finish(current);
    } else {
      setIndex((i) => i + 1);
      scroll.current?.scrollTo({ y: 0, animated: false });
    }
  };
  return (
    <SafeAreaView style={S.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 13, gap: 12 }}>
        <View style={[S.row, { gap: 12 }]}>
          <IconButton
            name="close"
            label="Save assessment and exit"
            onPress={() => router.replace('/assess')}
          />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: C.ink, fontWeight: '800', fontSize: 13 }}>
              Find your current form
            </Text>
            <Text style={{ color: C.muted, fontSize: 10 }}>
              QUESTION {index + 1} OF 18 · {draft.remoteId ? 'RANKED' : 'ON DEVICE'}
            </Text>
          </View>
          <DifficultyTag level={question.difficulty} />
        </View>
        <Bar value={draft.answers.filter((a) => a !== null).length / 18} />
      </View>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 14, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {storageNotice && (
          <Text accessibilityRole="alert" style={{ color: C.coral, fontSize: 12 }}>
            {storageNotice}
          </Text>
        )}
        <View style={{ gap: 8 }}>
          <Text style={[S.eyebrow, { color: C.purple }]}>
            {TOPICS.find((t) => t.id === question.topic)?.title}
          </Text>
          <Text style={[S.title, { fontSize: 27, lineHeight: 33 }]}>{question.title}</Text>
          <Text style={[S.text, { color: C.ink, fontSize: 15 }]}>{question.prompt}</Text>
        </View>
        <CodeBlock code={question.code} language={question.language} />
        <View style={{ gap: 10 }}>
          {question.choices.map((choice, i) => {
            const chosen = selected === choice.value;
            return (
              <Pressable
                key={choice.value}
                accessibilityRole="radio"
                accessibilityLabel={'Answer ' + choice.label}
                aria-checked={chosen}
                accessibilityState={{ checked: chosen, disabled: busy }}
                disabled={busy}
                onPress={() => answerAssessment(index, choice.value)}
                style={{
                  minHeight: 59,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderBottomWidth: 3,
                  borderColor: chosen ? C.purple : C.line,
                  backgroundColor: chosen ? C.lavender : C.white,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 29,
                    height: 29,
                    borderRadius: 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: chosen ? C.purple : '#F3F0F5',
                  }}
                >
                  <Text
                    style={{ color: chosen ? C.white : C.muted, fontWeight: '800', fontSize: 12 }}
                  >
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text
                  style={{
                    flex: 1,
                    color: C.ink,
                    fontWeight: chosen ? '800' : '600',
                    fontSize: 14,
                  }}
                >
                  {choice.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {busy ? (
          <View style={[S.row, { gap: 10, justifyContent: 'center', padding: 20 }]}>
            <ActivityIndicator color={C.purple} />
            <Text style={S.text}>Checking your 18 answers…</Text>
          </View>
        ) : (
          <Button
            title={index === 17 ? 'Meet my skill rank' : 'Next question'}
            disabled={selected === null}
            onPress={() => advance()}
            icon="arrow-forward"
          />
        )}
        {error && (
          <View style={{ gap: 12, backgroundColor: C.amberSoft, borderRadius: 15, padding: 16 }}>
            <Text accessibilityRole="alert" style={S.text}>
              {error}
            </Text>
            <Button
              title="Save a device-only result"
              secondary
              onPress={() => {
                void finish(draft, true);
              }}
            />
          </View>
        )}
        <View style={S.between}>
          {index > 0 ? (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                setIndex((i) => i - 1);
                scroll.current?.scrollTo({ y: 0, animated: false });
              }}
              style={[S.row, { minHeight: 44, gap: 5 }]}
            >
              <Icon name="arrow-back" color={C.muted} size={16} />
              <Text style={{ color: C.muted, fontSize: 12 }}>Previous</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => advance('__skip__')}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ color: C.muted, fontSize: 12 }}>I don’t know yet</Text>
          </Pressable>
        </View>
        <Text style={{ color: C.muted, fontSize: 10, textAlign: 'center', lineHeight: 17 }}>
          No hints during the assessment. Explanations arrive with your result.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
