import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { CSCB07_LESSONS, COURSE_TITLE, COURSE_SCOPE } from '../../../content/cscb07/lessons';
import { CSCB07_FAMILIES } from '../../../content/cscb07';
import { WRITTEN_TASKS } from '../../../content/cscb07/written';
import { conceptProgress, conceptStatus, coursePlan, readyForLesson } from '../../../domain/course';
import { useProgress } from '../../../state/ProgressProvider';
import { Bar, Button, Chip, Icon, Page } from '../../../ui/components';
import { ReadingReferences } from '../../../ui/course';
import { C, S } from '../../../ui/theme';

export default function CourseHome() {
  const { progress, updateCourse, storageNotice } = useProgress();
  const course = progress.cscb07,
    plan = coursePlan(course);
  const [view, setView] = useState<'today' | 'lessons' | 'written'>('today');
  const [budget, setBudget] = useState(String(course.budget));
  useEffect(() => {
    if (!course.startedDay) updateCourse((p) => ({ ...p, startedDay: coursePlan(p).today }));
  }, [course.startedDay, updateCourse]);
  const done = CSCB07_LESSONS.filter((l) => conceptProgress(course, l.id).completedAt).length;
  const secure = CSCB07_LESSONS.filter(
    (l) => conceptStatus(conceptProgress(course, l.id)) === 'secure',
  ).length;
  const next =
    plan.newLessons.find((l) => readyForLesson(course, l.id)) ??
    (!plan.isWarmup ? plan.remaining.find((l) => readyForLesson(course, l.id)) : undefined);
  const open = (id: string, review = false) =>
    router.push(('/course/cscb07/lesson/' + id + (review ? '?review=1' : '')) as '/');
  return (
    <Page>
      <View style={S.between}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/')}
          style={[S.row, { minHeight: 44, gap: 8 }]}
        >
          <Icon name="arrow-back" color={C.purple} size={18} />
          <Text style={{ fontSize: 12, color: C.purple, fontWeight: '700' }}>TraceRace</Text>
        </Pressable>
        <Chip>COURSE PACK · C++20</Chip>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={S.eyebrow}>PAPER EXAM · NOVEMBER 13, 2026</Text>
        <Text style={[S.title, { fontSize: 30, lineHeight: 36 }]}>{COURSE_TITLE}</Text>
        <Text style={S.text}>
          Start with the basics. Learn an example, try a fresh one, then retrieve it later without
          help.
        </Text>
      </View>
      {storageNotice && (
        <Text accessibilityRole="alert" style={[S.text, { color: C.coral }]}>
          {storageNotice}
        </Text>
      )}
      <View style={[S.card, { gap: 12 }]}>
        <View style={S.between}>
          <Text style={S.sectionTitle}>{done}/24 lessons practiced</Text>
          <Chip>{secure} secure</Chip>
        </View>
        <Bar value={done / 24} />
        <Text style={[S.text, { fontSize: 11 }]}>
          Secure means fresh independently checked answers plus a later successful retrieval (at
          least four hours later or on another day). It is a study signal, not a predicted exam
          grade. Written self-reviews stay separate.
        </Text>
        <Text style={[S.text, { fontSize: 11 }]}>
          {CSCB07_FAMILIES.length} reusable question families · 96 initial lesson practice items ·
          12 longer tasks · 2 paper sets
        </Text>
      </View>
      <View style={[S.row, { gap: 7 }]}>
        {(['today', 'lessons', 'written'] as const).map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityState={{ selected: view === v }}
            onPress={() => setView(v)}
            style={{
              flex: 1,
              minHeight: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: view === v ? C.purple : C.white,
              borderWidth: 1,
              borderColor: C.line,
            }}
          >
            <Text
              style={{ fontWeight: '700', fontSize: 12, color: view === v ? C.white : C.muted }}
            >
              {v === 'today' ? 'Today' : v === 'lessons' ? 'All lessons' : 'Write & paper'}
            </Text>
          </Pressable>
        ))}
      </View>
      {view === 'today' && (
        <>
          <View style={[S.card, { gap: 14, backgroundColor: C.lavender }]}>
            <Text style={S.eyebrow}>
              {plan.today} · STARTED {plan.start}
            </Text>
            <Text style={S.sectionTitle}>
              {plan.isWarmup
                ? 'Retrieval warm-up and your error list'
                : 'Your next step, from your actual progress'}
            </Text>
            <Text style={S.text}>
              {plan.isWarmup
                ? 'Use about 20 minutes for signatures, ownership sketches, iterator operations, and your most common errors. Official exam duration and complete official coverage have not been supplied.'
                : next
                  ? `Next: ${next.title}. Its prerequisites are ready. New work follows values → aliases and lifetime → ownership → iteration.`
                  : 'Your planned lessons are practiced. Use the reviews and written problems below; the coverage checklist remains available.'}
            </Text>
            {plan.due[0] && (
              <Button
                title={'Recall first: ' + plan.due[0].title}
                onPress={() =>
                  open(plan.due[0].id, !!conceptProgress(course, plan.due[0].id).completedAt)
                }
              />
            )}
            {next && (
              <Button
                title={'Continue: ' + next.title}
                onPress={() => open(next.id)}
                icon="arrow-forward"
              />
            )}
            <Text style={[S.text, { fontSize: 12 }]}>
              {plan.suggestedMinutes} focused minutes suggested today; breaks are extra.{' '}
              {plan.remaining.length} lessons remain.
            </Text>
            {!plan.isWarmup && (
              <Text style={[S.text, { fontSize: 11 }]}>
                The listed lessons, written tasks, reading, and retrieval estimate about{' '}
                {plan.estimatedToday} minutes. Use remaining budget for fresh repair practice. This
                estimate adjusts as you finish work.
              </Text>
            )}
            {!plan.isWarmup && plan.extraMinutes > 0 && (
              <Text accessibilityRole="alert" style={[S.text, { color: '#986220', fontSize: 12 }]}>
                Estimated remaining core work exceeds your remaining daily budget by about{' '}
                {plan.extraMinutes} minutes. Add focused time and repair the earliest missing
                prerequisite first; the uncovered topics remain on the checklist.
              </Text>
            )}
          </View>
          <View style={[S.card, { gap: 10 }]}>
            <Text style={S.sectionTitle}>Your daily budget</Text>
            <View style={[S.row, { gap: 12 }]}>
              <TextInput
                accessibilityLabel="Focused study minutes per day"
                keyboardType="number-pad"
                value={budget}
                onChangeText={setBudget}
                maxLength={3}
                style={{
                  borderWidth: 1,
                  borderColor: C.line,
                  borderRadius: 10,
                  padding: 12,
                  color: C.ink,
                  backgroundColor: C.white,
                  width: 90,
                }}
              />
              <Button
                title="Save minutes"
                secondary
                onPress={() => {
                  const n = Number(budget);
                  if (Number.isInteger(n) && n >= 30 && n <= 480)
                    updateCourse((p) => ({ ...p, budget: n }));
                  else setBudget(String(course.budget));
                }}
              />
            </View>
            <Text style={[S.text, { fontSize: 11 }]}>
              30–480 minutes. Begin with 180. Suggested split: 15–20 minutes retrieval, short
              lessons and source reading, longer written work, then error repair. Thursday adds a
              chosen 90-minute paper session; Friday is a short warm-up.
            </Text>
          </View>
          <Text style={S.sectionTitle}>Retrieval due · {plan.due.length}</Text>
          {!plan.due.length && (
            <Text style={S.text}>
              No retrieval is due yet. Supported or incorrect answers return after about 20 minutes;
              independent answers are scheduled again later. No earlier day is assumed complete.
            </Text>
          )}
          {plan.due.map((l) => (
            <View key={l.id} style={[S.card, { gap: 9 }]}>
              <Text style={S.sectionTitle}>{l.title}</Text>
              <Text style={[S.text, { fontSize: 12 }]}>
                {conceptProgress(course, l.id).incorrect} incorrect attempts ·{' '}
                {conceptProgress(course, l.id).hints} hints used
              </Text>
              <Button title={'Review ' + l.title} secondary onPress={() => open(l.id, true)} />
            </View>
          ))}
          {!plan.isWarmup && (
            <>
              <Text style={S.sectionTitle}>Learning and reading today</Text>
              {plan.newLessons.map((l) => (
                <View key={l.id} style={[S.card, { gap: 9 }]}>
                  <Text style={S.sectionTitle}>{l.title}</Text>
                  <Text style={[S.text, { fontSize: 12 }]}>
                    {l.objective} About {l.minutes} minutes for the lesson; allow extra reading and
                    written-practice time.
                  </Text>
                  <ReadingReferences reading={l.reading} />
                  <Button
                    title={readyForLesson(course, l.id) ? 'Open lesson' : 'Prerequisite first'}
                    secondary
                    disabled={!readyForLesson(course, l.id)}
                    onPress={() => open(l.id)}
                  />
                </View>
              ))}
            </>
          )}
          {!plan.isWarmup && (
            <>
              <Text style={S.sectionTitle}>Written work today</Text>
              {plan.writtenToday.map((t) => (
                <View key={t.id} style={[S.card, { gap: 10 }]}>
                  <Text style={S.sectionTitle}>{t.title}</Text>
                  <Text style={[S.text, { fontSize: 12 }]}>
                    About {t.minutes} minutes. Work through the matching lesson first, then fade
                    from the example to gaps and a blank answer.
                  </Text>
                  <Button
                    title={'Write: ' + t.title}
                    secondary
                    onPress={() => router.push(('/course/cscb07/written/' + t.id) as '/')}
                  />
                </View>
              ))}
            </>
          )}
          <Text style={S.sectionTitle}>Your error list</Text>
          {CSCB07_LESSONS.filter((l) => conceptProgress(course, l.id).misconceptions.length).map(
            (l) => (
              <View key={l.id} style={[S.card, { gap: 8 }]}>
                <Text style={{ fontWeight: '700', color: C.ink }}>{l.title}</Text>
                <Text style={[S.text, { fontSize: 12 }]}>
                  {conceptProgress(course, l.id).incorrect} incorrect attempts;{' '}
                  {conceptProgress(course, l.id).independent} independent checked successes.{' '}
                  {conceptStatus(conceptProgress(course, l.id)) === 'secure'
                    ? 'Later retrieval succeeded.'
                    : 'Another fresh or delayed attempt is still needed.'}
                </Text>
                <Button
                  title="Repair this idea"
                  secondary
                  onPress={() => open(l.id, !!conceptProgress(course, l.id).completedAt)}
                />
              </View>
            ),
          )}
          {!course.attempts.some((a) => !a.correct) && (
            <Text style={S.text}>
              Errors will appear here after a checked attempt. Nothing has been pre-filled.
            </Text>
          )}
          <Button
            title={
              plan.paperSuggested ? 'Start paper practice A' : 'Open written and paper practice'
            }
            secondary
            onPress={() =>
              plan.paperSuggested
                ? router.push('/course/cscb07/paper?set=a' as '/')
                : setView('written')
            }
          />
        </>
      )}
      {view === 'lessons' && (
        <>
          <Text style={S.sectionTitle}>The complete coverage checklist</Text>
          <Text style={S.text}>
            Monday: 1–7. Tuesday: 8–14. Wednesday: 15–21. Thursday: 22–24, review, and paper
            practice. Your saved attempts determine what actually counts as done.
          </Text>
          {CSCB07_LESSONS.map((l, i) => {
            const c = conceptProgress(course, l.id),
              ready = readyForLesson(course, l.id);
            return (
              <View key={l.id} style={[S.card, { gap: 10 }]}>
                <View style={S.between}>
                  <Text style={[S.eyebrow, { color: C.purple }]}>
                    LESSON {i + 1} · DAY {l.day}
                  </Text>
                  <Chip>{conceptStatus(c)}</Chip>
                </View>
                <Text style={S.sectionTitle}>{l.title}</Text>
                <Text style={[S.text, { fontSize: 12 }]}>{l.objective}</Text>
                <ReadingReferences reading={l.reading} />
                <Text style={[S.text, { fontSize: 11 }]}>
                  {c.attempts} attempts · {c.incorrect} incorrect · {c.hints} hints ·{' '}
                  {c.independent} independent · {c.delayed} delayed
                </Text>
                <Button
                  title={
                    c.completedAt
                      ? 'Reopen lesson'
                      : ready
                        ? 'Learn this idea'
                        : 'Finish the previous lesson first'
                  }
                  secondary
                  disabled={!ready && !c.completedAt}
                  onPress={() => open(l.id)}
                />
              </View>
            );
          })}
        </>
      )}
      {view === 'written' && (
        <>
          <Text style={S.sectionTitle}>From worked example to blank paper</Text>
          <Text style={S.text}>
            Long answers are reviewed with a rubric. There is no server compiler or AI grader
            judging arbitrary submitted code. Self-reported success is kept distinct from checked
            short answers.
          </Text>
          {WRITTEN_TASKS.map((t, i) => (
            <View key={t.id} style={[S.card, { gap: 10 }]}>
              <Text style={S.eyebrow}>
                WRITTEN {i + 1} · ABOUT {t.minutes} MINUTES
              </Text>
              <Text style={S.sectionTitle}>{t.title}</Text>
              <Text style={[S.text, { fontSize: 11 }]}>
                {course.written[t.id]?.submittedAt
                  ? 'Attempt saved · ' + course.written[t.id].rating.replaceAll('-', ' ')
                  : 'Not attempted'}
              </Text>
              <Button
                title={'Open ' + t.title}
                secondary
                onPress={() => router.push(('/course/cscb07/written/' + t.id) as '/')}
              />
            </View>
          ))}
          {(['a', 'b'] as const).map((set) => (
            <View key={set} style={[S.card, { gap: 10, backgroundColor: C.lavender }]}>
              <Text style={S.sectionTitle}>Mixed paper practice {set.toUpperCase()}</Text>
              <Text style={[S.text, { fontSize: 12 }]}>
                Eight mixed problems. No hints, choices, or solutions during the attempt. Default 90
                minutes is a practice choice, not the official exam duration; you can change it.
              </Text>
              <Button
                title={'Open paper set ' + set.toUpperCase()}
                onPress={() => router.push(('/course/cscb07/paper?set=' + set) as '/')}
              />
            </View>
          ))}
        </>
      )}
      <View style={[S.card, { gap: 10 }]}>
        <Text style={S.sectionTitle}>Working scope and sources</Text>
        <Text style={[S.text, { fontSize: 12 }]}>{COURSE_SCOPE}</Text>
        <Text style={[S.text, { fontSize: 11 }]}>
          Original learning/practice material aligned to your privately supplied Fall 2026 notes and
          two study guides. It is not an official course product or a set of past exam questions.
          UML, inheritance, protected access, slicing, virtual methods, and polymorphism are outside
          this pack.
        </Text>
      </View>
    </Page>
  );
}
