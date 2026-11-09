import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { WRITTEN_TASKS, writtenContext } from '../../../../content/cscb07/written';
import { CSCB07_LESSONS } from '../../../../content/cscb07/lessons';
import { useProgress } from '../../../../state/ProgressProvider';
import type { WrittenReview } from '../../../../domain/course';
import { Button, Chip, CodeBlock, Icon, Page } from '../../../../ui/components';
import {
  CourseBack,
  FoldCode,
  ModelAnswer,
  ReadingReferences,
  Rubric,
  WritingBox,
} from '../../../../ui/course';
import { C, S } from '../../../../ui/theme';

const empty = (): WrittenReview => ({
  answer: '',
  scaffold: 'worked',
  submittedAt: null,
  checks: [],
  rating: 'unreviewed',
  onPaper: false,
});
export default function WrittenPractice() {
  const params = useLocalSearchParams<{ task: string }>();
  const id = Array.isArray(params.task) ? params.task[0] : params.task;
  const task = WRITTEN_TASKS.find((t) => t.id === id);
  const { progress, updateCourse } = useProgress();
  const saved = progress.cscb07.written[id] ?? empty();
  const [notice, setNotice] = useState('');
  if (!task)
    return (
      <Page>
        <CourseBack />
        <Text style={S.title}>Problem not found.</Text>
      </Page>
    );
  const lesson = CSCB07_LESSONS.find((l) => l.id === task.lesson)!;
  const edit = (patch: Partial<WrittenReview>) =>
    updateCourse((p) => ({
      ...p,
      written: { ...p.written, [id]: { ...(p.written[id] ?? empty()), ...patch } },
    }));
  const allChecked = task.rubric.every((_, i) => saved.checks[i]);
  return (
    <Page>
      <CourseBack title="WRITTEN PRACTICE" />
      <Chip>ABOUT {task.minutes} MINUTES · SELF-REVIEW</Chip>
      <Text style={S.title}>{task.title}</Text>
      <Text style={S.text}>{task.prompt}</Text>
      {writtenContext(id) && (
        <FoldCode code={writtenContext(id)!} title="Supplied type / interface context" />
      )}
      <CodeBlock code={task.code} language="Problem statement / C++" />
      <Button
        title={'Review lesson: ' + lesson.title}
        secondary
        onPress={() => router.push(('/course/cscb07/lesson/' + lesson.id) as '/')}
      />
      <ReadingReferences reading={lesson.reading} />
      {!saved.submittedAt && (
        <>
          <Text style={S.sectionTitle}>Choose your support</Text>
          <View style={[S.row, { gap: 6 }]}>
            {(['worked', 'gaps', 'blank'] as const).map((mode) => (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityState={{ selected: saved.scaffold === mode }}
                onPress={() =>
                  edit({
                    scaffold: mode,
                    answer:
                      mode === 'gaps' && !saved.answer
                        ? task.gaps
                        : saved.answer === task.gaps && mode === 'blank'
                          ? ''
                          : saved.answer,
                  })
                }
                style={{
                  flex: 1,
                  padding: 12,
                  minHeight: 46,
                  borderRadius: 12,
                  backgroundColor: saved.scaffold === mode ? C.purple : C.white,
                  borderWidth: 1,
                  borderColor: C.line,
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: '700',
                    color: saved.scaffold === mode ? C.white : C.muted,
                  }}
                >
                  {mode === 'worked'
                    ? 'Worked example'
                    : mode === 'gaps'
                      ? 'Complete gaps'
                      : 'Blank attempt'}
                </Text>
              </Pressable>
            ))}
          </View>
          {saved.scaffold === 'worked' && (
            <View style={[S.card, { gap: 12, backgroundColor: C.lavender }]}>
              <Text style={S.eyebrow}>WORKED EXAMPLE FIRST</Text>
              <Text style={S.text}>{task.worked}</Text>
              <Text style={[S.text, { fontSize: 11 }]}>
                Explain this, then try the gaps and a fresh blank-paper version. This stage is
                supported practice.
              </Text>
            </View>
          )}
          {saved.scaffold === 'gaps' && (
            <CodeBlock code={task.gaps} language="Completion scaffold" />
          )}
          {saved.scaffold === 'blank' && (
            <Text style={S.text}>
              Produce your own answer. Solutions and rubrics appear after submission. Any
              independence rating is your self-report, not automated code grading.
            </Text>
          )}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!saved.onPaper }}
            onPress={() => edit({ onPaper: !saved.onPaper })}
            style={[S.row, { gap: 10, minHeight: 48 }]}
          >
            <Icon name={saved.onPaper ? 'checkbox' : 'square-outline'} color={C.purple} />
            <Text style={[S.text, { flex: 1 }]}>I am writing this attempt on physical paper</Text>
          </Pressable>
          {!saved.onPaper && (
            <WritingBox
              value={saved.answer}
              onChange={(answer) => edit({ answer })}
              label="Your written answer or C++ code"
            />
          )}
          <Button
            title={
              saved.onPaper
                ? 'I finished on paper — reveal review'
                : 'Submit attempt for self-review'
            }
            disabled={!saved.onPaper && !saved.answer.trim()}
            onPress={() => edit({ submittedAt: new Date().toISOString(), rating: 'unreviewed' })}
          />
        </>
      )}
      {saved.submittedAt && (
        <>
          <Chip>ATTEMPT SAVED · NOT AUTOMATICALLY GRADED</Chip>
          <Text style={S.sectionTitle}>Your attempt</Text>
          {saved.onPaper ? (
            <Text style={S.text}>You marked this attempt complete on physical paper.</Text>
          ) : (
            <Text selectable style={[S.text, { color: C.ink }]}>
              {saved.answer}
            </Text>
          )}
          <Text style={S.sectionTitle}>Model answer and explanation</Text>
          <ModelAnswer answer={task.solution} />
          <Rubric
            items={task.rubric}
            checked={saved.checks}
            onChange={(checks) => edit({ checks })}
          />
          <Text style={S.sectionTitle}>Record your own review</Text>
          {(['needs-work', 'supported', 'self-independent'] as const).map((rating) => (
            <Button
              key={rating}
              title={
                (saved.rating === rating ? '✓ ' : '') +
                (rating === 'needs-work'
                  ? 'Needs another attempt'
                  : rating === 'supported'
                    ? 'Solved with support'
                    : 'Self-rated independent on paper')
              }
              secondary
              disabled={
                rating === 'self-independent' && (!allChecked || saved.scaffold !== 'blank')
              }
              onPress={() => edit({ rating })}
            />
          ))}
          <Text style={[S.text, { fontSize: 11 }]}>
            Independent self-rating needs a blank attempt and every rubric point checked. It still
            does not count as automatically verified mastery or league XP.
          </Text>
          <Button
            title="Start a new blank attempt"
            secondary
            onPress={() => {
              edit({
                previousAnswer: saved.answer,
                answer: '',
                onPaper: false,
                scaffold: 'blank',
                submittedAt: null,
                checks: [],
                rating: 'unreviewed',
              });
              setNotice('The previous editor answer is kept below so you can restore it.');
            }}
          />
        </>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" style={S.text}>
          {notice}
        </Text>
      )}
      {saved.previousAnswer && (
        <Button
          title="Restore the previous editor answer"
          secondary
          onPress={() => edit({ answer: saved.previousAnswer, submittedAt: null })}
        />
      )}
      <Text style={[S.text, { fontSize: 11 }]}>
        Valid alternative solutions are accepted through the rubric. A nonempty editor answer is an
        attempt, not proof of correctness. No arbitrary submitted code is executed by the app.
      </Text>
    </Page>
  );
}
