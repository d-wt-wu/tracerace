import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { paperProblems, writtenContext } from '../../../content/cscb07/written';
import { useProgress } from '../../../state/ProgressProvider';
import type { PaperRun } from '../../../domain/course';
import { Button, Chip, CodeBlock, Icon, Page } from '../../../ui/components';
import { CourseBack, FoldCode, ModelAnswer, Rubric, WritingBox } from '../../../ui/course';
import { C, S } from '../../../ui/theme';

export default function PaperPractice() {
  const params = useLocalSearchParams<{ set?: string }>();
  const set = params.set === 'b' ? 'b' : 'a';
  const problems = useMemo(() => paperProblems(set), [set]);
  const { progress, updateCourse } = useProgress();
  const run = progress.cscb07.papers[set];
  const [minutes, setMinutes] = useState(String(run?.minutes ?? 90));
  const [onPaper, setOnPaper] = useState(run?.onPaper ?? false);
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!run || run.submittedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [run?.startedAt, run?.submittedAt, run]);
  const edit = (patch: Partial<PaperRun>) =>
    updateCourse((p) => ({ ...p, papers: { ...p.papers, [set]: { ...p.papers[set], ...patch } } }));
  const elapsed = run ? Math.max(0, Math.floor((now - Date.parse(run.startedAt)) / 1000)) : 0;
  const left = run ? Math.max(0, run.minutes * 60 - elapsed) : 0;
  const entered = run ? problems.filter((p) => run.answers[p.id]?.trim()).length : 0;
  const chooseMinutes = () => {
    const n = Number(minutes);
    if (!Number.isInteger(n) || n < 5 || n > 240) {
      setNotice('Choose 5–240 practice minutes.');
      return;
    }
    if (run) edit({ minutes: n });
    setNotice('');
  };
  return (
    <Page>
      <CourseBack title={'PAPER PRACTICE ' + set.toUpperCase()} />
      <Text style={S.title}>A blank page.{'\n'}A mixed set.</Text>
      <Text style={S.text}>
        Eight problems covering the reported midterm boundary. Work without hints, answer choices,
        or model solutions, then review the reasoning. This is original practice, not a past exam.
      </Text>
      <View style={[S.card, { gap: 12, backgroundColor: C.lavender }]}>
        <Text style={S.sectionTitle}>Choose the practice duration</Text>
        <Text style={[S.text, { fontSize: 12 }]}>
          90 minutes is a chosen practice preset. The official exam duration has not been supplied.
          The timer is advisory; your answers are never discarded when it reaches zero.
        </Text>
        <View style={[S.row, { gap: 12 }]}>
          <TextInput
            accessibilityLabel="Paper practice minutes"
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            maxLength={3}
            style={{
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: C.line,
              color: C.ink,
              backgroundColor: C.white,
              width: 90,
            }}
          />
          {run && !run.submittedAt && (
            <Button title="Update duration" secondary onPress={chooseMinutes} />
          )}
        </View>
        {!run && (
          <>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: onPaper }}
              onPress={() => setOnPaper(!onPaper)}
              style={[S.row, { gap: 10, minHeight: 44 }]}
            >
              <Icon name={onPaper ? 'checkbox' : 'square-outline'} color={C.purple} />
              <Text style={[S.text, { flex: 1 }]}>Use physical paper instead of the editor</Text>
            </Pressable>
            <Button
              title="Begin closed-book practice"
              onPress={() => {
                const n = Number(minutes);
                if (!Number.isInteger(n) || n < 5 || n > 240) {
                  setNotice('Choose 5–240 practice minutes.');
                  return;
                }
                updateCourse((p) => ({
                  ...p,
                  papers: {
                    ...p.papers,
                    [set]: {
                      minutes: n,
                      startedAt: new Date().toISOString(),
                      submittedAt: null,
                      onPaper,
                      answers: {},
                      checks: {},
                    },
                  },
                }));
              }}
            />
          </>
        )}
        {run && !run.submittedAt && (
          <>
            <Text
              accessibilityLiveRegion="none"
              style={{ fontSize: 28, fontWeight: '800', color: C.purple }}
            >
              {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} remaining
            </Text>
            <Text style={[S.text, { fontSize: 11 }]}>
              {left
                ? 'The clock continues across refresh or reopening.'
                : 'Practice time reached. Finish or submit when ready; your attempt is kept.'}
            </Text>
          </>
        )}
      </View>
      {notice && (
        <Text accessibilityRole="alert" style={[S.text, { color: C.coral }]}>
          {notice}
        </Text>
      )}
      {!run && (
        <Text style={S.text}>
          Questions open after you begin. Answers and rubrics stay hidden until you submit or mark
          your physical-paper attempt complete.
        </Text>
      )}
      {run &&
        problems.map((p, i) => (
          <View key={p.id} style={[S.card, { gap: 14 }]}>
            <Text style={S.eyebrow}>
              PROBLEM {i + 1} / {problems.length}
            </Text>
            <Text style={S.sectionTitle}>{p.title}</Text>
            <Text style={S.text}>{p.prompt}</Text>
            {writtenContext(p.id) && (
              <FoldCode code={writtenContext(p.id)!} title="Supplied type / interface context" />
            )}
            <CodeBlock code={p.code} language="Paper question / C++" />
            {!run.submittedAt && !run.onPaper && (
              <WritingBox
                label={'Paper answer ' + (i + 1)}
                value={run.answers[p.id] ?? ''}
                onChange={(answer) => edit({ answers: { ...run.answers, [p.id]: answer } })}
              />
            )}
            {run.submittedAt && (
              <>
                <Text style={S.eyebrow}>YOUR ATTEMPT</Text>
                <Text selectable style={S.text}>
                  {run.onPaper
                    ? 'Marked complete on physical paper.'
                    : run.answers[p.id] || 'Not answered.'}
                </Text>
                <Text style={S.sectionTitle}>Model and explanation</Text>
                <ModelAnswer answer={p.solution} />
                {p.autoExpected && /^-?\d+(\s+-?\d+)*$/.test(run.answers[p.id]?.trim() ?? '') && (
                  <Text style={[S.text, { color: C.purple, fontSize: 12 }]}>
                    {run.answers[p.id].trim().replace(/\s+/g, ' ') === p.autoExpected
                      ? 'Final values match the checked template; the explanation still needs self-review.'
                      : 'The final values differ from the checked template. Review the explanation and retry a fresh example.'}
                  </Text>
                )}
                <Rubric
                  items={p.rubric}
                  checked={run.checks[p.id] ?? []}
                  onChange={(checks) => edit({ checks: { ...run.checks, [p.id]: checks } })}
                />
              </>
            )}
          </View>
        ))}
      {run && !run.submittedAt && (
        <>
          <Text style={S.text}>
            {run.onPaper
              ? 'Confirm that you have finished your physical-paper attempt before revealing any answers.'
              : `${entered}/${problems.length} editor responses entered. Unanswered items remain unanswered; entered text is not automatically correct.`}
          </Text>
          <Button
            title={
              run.onPaper
                ? 'I finished on paper — reveal solutions'
                : 'Submit the paper attempt — reveal solutions'
            }
            disabled={!run.onPaper && entered === 0}
            onPress={() => edit({ submittedAt: new Date().toISOString() })}
          />
        </>
      )}
      {run?.submittedAt && (
        <View style={[S.card, { gap: 10 }]}>
          <Chip>ATTEMPT SAVED</Chip>
          <Text style={S.text}>
            This set is ready for self-review. There is no invented exam percentage or automatic
            grading of arbitrary code. Record mistakes against the rubrics and revisit the
            corresponding lessons.
          </Text>
          <Text style={[S.text, { fontSize: 11 }]}>
            Self-checks do not award league XP or verified concept mastery.
          </Text>
        </View>
      )}
    </Page>
  );
}
