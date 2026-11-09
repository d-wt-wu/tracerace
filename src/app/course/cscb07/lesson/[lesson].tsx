import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { CSCB07_LESSONS } from '../../../../content/cscb07/lessons';
import { LIST_CPP, NODE_CPP } from '../../../../content/cscb07/models';
import { makeQuestion } from '../../../../content/bank';
import {
  advanceCourseQuestion,
  beginCourseSession,
  conceptProgress,
  finishCourseSession,
  logCourseHint,
  readyForLesson,
  recordCourseAnswer,
  updateConcept,
} from '../../../../domain/course';
import { useProgress } from '../../../../state/ProgressProvider';
import { Bar, Button, Chip, CodeBlock, Page } from '../../../../ui/components';
import { CourseBack, FoldCode, ReadingReferences } from '../../../../ui/course';
import { DifficultyTag } from '../../../../ui/ranks';
import { C, S, mono } from '../../../../ui/theme';

export default function CourseLessonPage() {
  const params = useLocalSearchParams<{ lesson: string; review?: string }>();
  const id = Array.isArray(params.lesson) ? params.lesson[0] : params.lesson;
  const l = CSCB07_LESSONS.find((x) => x.id === id);
  const { progress, updateCourse, solve, storageNotice } = useProgress();
  const c = conceptProgress(progress.cscb07, id),
    session = c.session;
  const [step, setStep] = useState(0),
    [showWorked, setShowWorked] = useState(false),
    [error, setError] = useState('');
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    if (params.review === '1' && c.completedAt && !session)
      updateCourse((p) =>
        beginCourseSession(p, id, 'review', Math.floor(Math.random() * 0x100000000)),
      );
  }, [id, params.review, c.completedAt, session, updateCourse]);
  if (!l)
    return (
      <Page>
        <CourseBack />
        <Text style={S.title}>Lesson not found.</Text>
      </Page>
    );
  const ready = readyForLesson(progress.cscb07, id);
  const start = (review = false) => {
    setError('');
    setShowWorked(false);
    updateCourse((p) => {
      const read = updateConcept(p, id, (old) => ({
        ...old,
        readAt: old.readAt ?? new Date().toISOString(),
      }));
      return beginCourseSession(
        read,
        id,
        review ? 'review' : 'learn',
        Math.floor(Math.random() * 0x100000000),
      );
    });
  };
  const mutateSession = (answer: string) =>
    updateCourse((p) =>
      updateConcept(p, id, (old) =>
        old.session ? { ...old, session: { ...old.session, answer } } : old,
      ),
    );
  const finish = (next = false) => {
    try {
      updateCourse((p) => finishCourseSession(p, id));
      const after = CSCB07_LESSONS[CSCB07_LESSONS.findIndex((x) => x.id === id) + 1];
      router.replace(
        (next && after ? '/course/cscb07/lesson/' + after.id : '/course/cscb07') as '/',
      );
    } catch {
      setError(
        'One fresh checked answer without a hint is still needed. Start another lesson attempt and try the independent questions without support.',
      );
    }
  };
  if (!session)
    return (
      <Page>
        <CourseBack title={'LESSON ' + (CSCB07_LESSONS.indexOf(l) + 1) + ' / 24'} />
        <Text style={S.title}>{l.title}</Text>
        <Text style={S.text}>{l.objective}</Text>
        <Chip>ABOUT {l.minutes} MINUTES · TEACH, THEN TRY</Chip>
        {!ready && !c.completedAt && (
          <View style={[S.card, { gap: 10, backgroundColor: C.amberSoft }]}>
            <Text style={S.sectionTitle}>Build the prerequisite first</Text>
            <Text style={S.text}>
              This lesson uses ideas from{' '}
              {CSCB07_LESSONS.find((x) => x.id === l.prerequisites[0])?.title}. Reading remains
              available; start the practice after that lesson.
            </Text>
            <Button
              title="Open prerequisite"
              onPress={() => router.replace(('/course/cscb07/lesson/' + l.prerequisites[0]) as '/')}
            />
          </View>
        )}
        <View style={[S.card, { gap: 12 }]}>
          <Text style={S.sectionTitle}>Words you need here</Text>
          {l.vocabulary.map(([term, meaning]) => (
            <View key={term} style={{ gap: 3 }}>
              <Text style={{ color: C.purple, fontSize: 13, fontWeight: '800' }}>{term}</Text>
              <Text style={[S.text, { fontSize: 13 }]}>{meaning}</Text>
            </View>
          ))}
        </View>
        <Text style={S.sectionTitle}>Worked example</Text>
        <Text style={[S.text, { fontSize: 11 }]}>
          Assume standard C++20 I/O/utility declarations. Complete class or helper definitions are
          provided below when needed. Course module syntax is taught separately.
        </Text>
        {l.example.prelude && (
          <FoldCode code={l.example.prelude} title="Definitions used by this example" />
        )}
        <CodeBlock code={l.example.code} language="C++20 example" />
        <View style={[S.card, { gap: 13, backgroundColor: C.lavender }]}>
          <Text style={S.eyebrow}>
            WALKTHROUGH · {step + 1} / {l.example.steps.length}
          </Text>
          <Text style={[S.text, { color: C.ink }]}>{l.example.steps[step].text}</Text>
          {l.example.steps[step].diagram && (
            <CodeBlock code={l.example.steps[step].diagram!} language="Ownership / value sketch" />
          )}
          <View style={{ gap: 12 }}>
            <Button
              title="Previous step"
              secondary
              disabled={!step}
              onPress={() => setStep((i) => i - 1)}
            />
            <Button
              title={
                step === l.example.steps.length - 1 ? 'Walkthrough complete' : 'Next statement'
              }
              disabled={step === l.example.steps.length - 1}
              onPress={() => setStep((i) => i + 1)}
            />
          </View>
        </View>
        <ReadingReferences reading={l.reading} />
        <Text style={[S.text, { fontSize: 12 }]}>
          Next: two guided checks, then two fresh independent examples. Use hints whenever you need
          them; supported answers are recorded separately. Unlimited repair practice stays
          available.
        </Text>
        <Button
          title={
            c.completedAt ? 'Practice this lesson again' : 'I studied the example — guided practice'
          }
          disabled={(!ready && !c.completedAt) || step < l.example.steps.length - 1}
          onPress={() => start(false)}
          icon="arrow-forward"
        />
        {c.completedAt && (
          <Button title="Fresh retrieval practice" secondary onPress={() => start(true)} />
        )}
        {l.written && (
          <Button
            title="Longer written / coding problem"
            secondary
            onPress={() => router.push(('/course/cscb07/written/' + l.written) as '/')}
          />
        )}
        <Text style={[S.text, { fontSize: 11 }]}>
          Reading alone does not mark this concept secure. You need independently checked fresh
          answers and a successful later retrieval.
        </Text>
      </Page>
    );
  const total = session.mode === 'learn' ? 4 : 2;
  if (session.index >= total)
    return (
      <Page>
        <CourseBack />
        <Chip>PRACTICE SEQUENCE COMPLETE</Chip>
        <Text style={S.title}>Keep the explanation with the answer.</Text>
        <Text style={S.text}>
          {c.supported} supported successes · {c.independent} independent checked successes ·{' '}
          {c.delayed} later retrieval successes.
        </Text>
        <Text style={S.text}>
          This concept will return for retrieval. “Secure” needs at least two different
          independently correct examples plus a later success; finishing one session is not enough.
        </Text>
        {error && (
          <Text accessibilityRole="alert" style={[S.text, { color: C.coral }]}>
            {error}
          </Text>
        )}
        <Button title="Save and return to Today" onPress={() => finish()} />
        <Button title="Save and open next lesson" secondary onPress={() => finish(true)} />
        <Button title="Try another fresh lesson attempt" secondary onPress={() => start(false)} />
        {l.written && (
          <Button
            title="Practise writing it from memory"
            secondary
            onPress={() => router.push(('/course/cscb07/written/' + l.written) as '/')}
          />
        )}
      </Page>
    );
  const q = makeQuestion(session.family, session.seed);
  const guided = session.mode === 'learn' && session.index < 2;
  const short =
    !guided &&
    ((q.data?.cpp as { kind?: string } | undefined)?.kind === 'run' ||
      /^-?\d+(\s+-?\d+)*$/.test(q.expected));
  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ');
  const check = () => {
    if (!session.answer.trim() || session.checked) return;
    const correct = short
      ? normalize(session.answer) === normalize(q.expected)
      : session.answer === q.expected;
    if (correct) solve(q, guided || session.hinted || session.wrong);
    updateCourse((p) => recordCourseAnswer(p, id, q.id, q.variantId, correct));
  };
  const context = [LIST_CPP, NODE_CPP].find((code) => q.code.startsWith(code));
  const code = context ? q.code.slice(context.length).trim() : q.code;
  return (
    <Page>
      <CourseBack title={l.title} />
      <View style={S.between}>
        <Chip>
          {guided ? 'GUIDED' : 'INDEPENDENT'} · {session.index + 1}/{total}
        </Chip>
        <DifficultyTag level={q.difficulty} />
      </View>
      <Bar value={(session.index + Number(session.checked)) / total} />
      <Text style={[S.title, { fontSize: 27, lineHeight: 33 }]}>{q.title}</Text>
      <Text style={S.text}>{q.prompt}</Text>
      {storageNotice && (
        <Text accessibilityRole="alert" style={[S.text, { color: C.coral }]}>
          {storageNotice}
        </Text>
      )}
      {context && <FoldCode code={context} title="Complete List / Node definition" />}
      <CodeBlock code={code} language={q.language} />
      {guided && (
        <View style={[S.card, { gap: 7, backgroundColor: C.lavender }]}>
          <Text style={S.eyebrow}>GUIDED SUPPORT</Text>
          <Text style={S.text}>{q.hint}</Text>
          <Text style={[S.text, { fontSize: 11 }]}>
            This answer is recorded as supported, even if correct.
          </Text>
        </View>
      )}
      {short ? (
        <View style={{ gap: 9 }}>
          <Text style={{ color: C.ink, fontWeight: '700', fontSize: 12 }}>
            Produce the output without choices
          </Text>
          <TextInput
            accessibilityLabel="Independent output answer"
            value={session.answer}
            onChangeText={mutateSession}
            editable={!session.checked}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={1000}
            placeholder="Output, with spaces between values"
            placeholderTextColor={C.muted}
            style={{
              padding: 16,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.line,
              backgroundColor: C.white,
              color: C.ink,
              fontFamily: mono,
              fontSize: 15,
            }}
          />
          <Text style={[S.text, { fontSize: 11 }]}>
            The final output is automatically checked. Practise the explanation separately on paper.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 9 }}>
          {q.choices.map((choice, i) => (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityLabel={'Answer ' + choice.label}
              accessibilityState={{
                checked: session.answer === choice.value,
                disabled: session.checked,
              }}
              disabled={session.checked}
              onPress={() => mutateSession(choice.value)}
              style={[
                S.row,
                {
                  gap: 12,
                  padding: 15,
                  minHeight: 56,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: session.answer === choice.value ? C.purple : C.line,
                  backgroundColor: session.answer === choice.value ? C.lavender : C.white,
                },
              ]}
            >
              <Text style={{ fontWeight: '800', color: C.purple }}>
                {String.fromCharCode(65 + i)}
              </Text>
              <Text style={{ flex: 1, color: C.ink, fontSize: 14, lineHeight: 22 }}>
                {choice.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {!guided && !session.checked && (
        <Button
          title={session.hinted ? 'Hint used — this answer is supported' : 'A small hint'}
          secondary
          onPress={() => updateCourse((p) => logCourseHint(p, id))}
        />
      )}
      {session.hinted && !guided && !session.checked && (
        <Text style={[S.text, { color: '#8C661E' }]}>{q.hint}</Text>
      )}
      {session.wrong && !session.checked && (
        <View
          accessibilityLiveRegion="polite"
          style={[S.card, { gap: 10, backgroundColor: C.coralSoft }]}
        >
          <Text style={{ fontWeight: '800', color: '#A44C3D' }}>Revisit: {q.title}</Text>
          <Text style={S.text}>{q.hint}</Text>
          <Text style={[S.text, { fontSize: 12 }]}>
            Use the relevant statement or ownership arrow to check your reasoning. Retrying this
            same item counts as supported; a fresh example gives you another independent
            opportunity.
          </Text>
          <Button
            title="Show the worked explanation"
            secondary
            onPress={() => {
              updateCourse((p) => logCourseHint(p, id));
              setShowWorked(true);
            }}
          />
          {showWorked && <Text style={S.text}>{q.explanation}</Text>}
          <Button
            title="Repair with a fresh example"
            secondary
            onPress={() => {
              setShowWorked(false);
              updateCourse((p) => advanceCourseQuestion(p, id, true));
            }}
          />
        </View>
      )}
      {session.checked && (
        <View
          accessibilityLiveRegion="polite"
          style={[S.card, { gap: 10, backgroundColor: C.lavender }]}
        >
          <Text style={{ color: C.purple, fontWeight: '800' }}>Checked answer: correct</Text>
          <Text style={S.text}>{q.explanation}</Text>
          <Text style={[S.text, { fontSize: 11 }]}>
            {guided || session.hinted
              ? 'Supported practice recorded.'
              : 'This fresh answer was checked without a hint.'}{' '}
            Written work is not automatically graded and is tracked separately.
          </Text>
        </View>
      )}
      <Button
        title={session.checked ? 'Continue' : 'Check answer'}
        disabled={!session.answer.trim()}
        onPress={() =>
          session.checked ? updateCourse((p) => advanceCourseQuestion(p, id)) : check()
        }
        icon={session.checked ? 'arrow-forward' : undefined}
      />
      <Text style={[S.text, { fontSize: 11 }]}>
        Completed answers are saved immediately. Correct output or choices earn existing local
        practice XP; private course mastery and self-review are separate from server-verified league
        scores.
      </Text>
    </Page>
  );
}
