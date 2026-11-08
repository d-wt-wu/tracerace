import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { makeQuestion, TOPICS } from '../../../content/bank';
import { skillRank } from '../../../domain/ranks';
import { useProgress } from '../../../state/ProgressProvider';
import { Bar, Button, Chip, CodeBlock, Icon, IconButton, Page } from '../../../ui/components';
import { DifficultyTag, RankBadge } from '../../../ui/ranks';
import { C, S } from '../../../ui/theme';
export default function AssessmentResultPage() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { progress } = useProgress();
  const [review, setReview] = useState(false),
    [open, setOpen] = useState<number | null>(null);
  const result = progress.assessments.find((r) => r.id === id);
  if (!result)
    return (
      <Page>
        <Text style={S.title}>This result isn’t here.</Text>
        <Text style={S.text}>Your recent assessments are saved on this device.</Text>
        <Button title="Go to assessments" onPress={() => router.replace('/assess')} />
      </Page>
    );
  const rank = skillRank(result.score),
    weakest = [...result.topics].sort((a, b) => a.earned / a.max - b.earned / b.max)[0];
  const unit = weakest.topic === 'c' ? 'values' : weakest.topic;
  return (
    <Page>
      <View style={S.between}>
        <IconButton
          name="close"
          label="Back to assessments"
          onPress={() => router.replace('/assess')}
        />
        <Chip>{result.ranked ? 'SERVER-GRADED' : 'ON THIS DEVICE'}</Chip>
      </View>
      <View style={{ alignItems: 'center', gap: 14, paddingVertical: 9 }}>
        <RankBadge rank={rank} size={112} />
        <Text style={[S.eyebrow, { color: rank.color }]}>YOUR CURRENT FORM</Text>
        <Text style={[S.title, { textAlign: 'center' }]}>{rank.name}</Text>
        <Text style={[S.text, { textAlign: 'center', maxWidth: 310 }]}>{rank.subtitle}</Text>
      </View>
      <View style={[S.card, S.row, { gap: 20 }]}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ fontSize: 40, fontWeight: '800', color: rank.color, letterSpacing: -1.5 }}>
            {result.score}%
          </Text>
          <Text style={{ color: C.muted, fontSize: 11 }}>weighted score</Text>
        </View>
        <View style={{ width: 1, height: 53, backgroundColor: C.line }} />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={{ color: C.ink, fontWeight: '800', fontSize: 18 }}>
            {result.correct}/18 correct
          </Text>
          <Text style={{ color: C.muted, fontSize: 11 }}>
            {result.earned}/{result.max} weighted points
          </Text>
        </View>
      </View>
      <View style={{ gap: 16 }}>
        <Text style={S.sectionTitle}>What’s clicking. What’s next.</Text>
        {result.topics.map((topic) => (
          <View key={topic.topic} style={{ gap: 8 }}>
            <View style={S.between}>
              <Text style={{ color: C.ink, fontWeight: '700', fontSize: 12 }}>
                {TOPICS.find((t) => t.id === topic.topic)?.title}
              </Text>
              <Text style={{ color: C.muted, fontSize: 11 }}>
                {topic.earned}/{topic.max} pts · {topic.correct}/{topic.total} correct
              </Text>
            </View>
            <Bar value={topic.earned / topic.max} color={topic.earned >= 4 ? C.purple : C.amber} />
          </View>
        ))}
      </View>
      <Button
        title={'Practice ' + TOPICS.find((t) => t.id === weakest.topic)?.short}
        onPress={() => router.push(('/lesson/' + unit) as '/lesson/[unit]')}
        icon="arrow-forward"
      />
      <Text style={{ color: C.muted, fontSize: 11, lineHeight: 19 }}>
        This is a snapshot across these six topics. Three questions per topic can suggest where to
        practice next. The title comes from this attempt, and can change with a later assessment.
      </Text>
      {result.ranked && (
        <Button
          title="See my place on the skill board"
          secondary
          onPress={() => router.replace('/ranks?board=skills')}
        />
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => setReview(!review)}
        style={[S.between, { minHeight: 44 }]}
      >
        <Text style={{ fontSize: 14, color: C.purple, fontWeight: '800' }}>
          {review ? 'Hide the answer review' : 'See what happened in all 18 questions'}
        </Text>
        <Icon name={review ? 'chevron-up' : 'chevron-down'} color={C.purple} size={17} />
      </Pressable>
      {review && (
        <View style={{ gap: 10 }}>
          {result.refs.map((ref, i) => {
            const q = makeQuestion(ref.id, ref.seed),
              right = q.expected === result.answers[i];
            const selected =
              result.answers[i] === '__skip__'
                ? 'Not sure yet'
                : q.choices.find((c) => c.value === result.answers[i])?.label;
            return (
              <View key={i} style={[S.card, { padding: 16, gap: 13 }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={'Review question ' + (i + 1) + ': ' + q.title}
                  onPress={() => setOpen(open === i ? null : i)}
                  style={[S.row, { minHeight: 44, gap: 10 }]}
                >
                  <Icon
                    name={right ? 'checkmark-circle' : 'ellipse-outline'}
                    color={right ? C.purple : C.coral}
                    size={21}
                  />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ fontWeight: '800', fontSize: 13, color: C.ink }}>
                      {i + 1}. {q.title}
                    </Text>
                    <DifficultyTag level={q.difficulty} />
                  </View>
                  <Icon
                    name={open === i ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={C.muted}
                  />
                </Pressable>
                {open === i && (
                  <>
                    <Text style={S.text}>{q.prompt}</Text>
                    <CodeBlock code={q.code} language={q.language} />
                    <Text style={{ fontSize: 12, color: C.muted }}>Your answer: {selected}</Text>
                    <Text style={{ fontSize: 13, color: C.purple, fontWeight: '800' }}>
                      Answer: {q.choices.find((c) => c.value === q.expected)?.label}
                    </Text>
                    <Text style={[S.text, { fontSize: 12 }]}>{q.explanation}</Text>
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}
      <Button title="Back to assessments" secondary onPress={() => router.replace('/assess')} />
    </Page>
  );
}
