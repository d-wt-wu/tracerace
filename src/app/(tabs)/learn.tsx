import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { CHALLENGES, UNITS, challengesFor, type Difficulty } from '../../content/curriculum';
import { dueIds } from '../../state/progress';
import { useProgress } from '../../state/ProgressProvider';
import { Bar, Button, Chip, Icon, Page } from '../../ui/components';
import { C, S } from '../../ui/theme';
export default function Learn() {
  const { progress } = useProgress();
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const core = CHALLENGES.filter((q) => q.topic !== 'cscb07');
  const completed = core.filter((q) => progress.skills[q.id]).length,
    due = dueIds(progress).length;
  const filter = difficulty === 'all' ? '' : '?difficulty=' + difficulty;
  return (
    <Page>
      <View style={{ gap: 9, marginTop: 8 }}>
        <Text style={S.eyebrow}>THE LEARNING PATH</Text>
        <Text style={S.title}>More ways{'\n'}to make it click.</Text>
        <Text style={S.text}>
          {core.length} core question families. Changing inputs, different answer positions, and a
          reason to come back.
        </Text>
      </View>
      <View style={[S.between, { gap: 10 }]}>
        <Chip>
          {completed}/{core.length} CORE FAMILIES SOLVED
        </Chip>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/review')}
          style={[S.row, { minHeight: 44, gap: 5 }]}
        >
          <Icon name="repeat-outline" color={C.purple} size={17} />
          <Text style={{ color: C.purple, fontWeight: '800', fontSize: 12 }}>
            {due ? due + ' due' : 'Review'}
          </Text>
        </Pressable>
      </View>
      <View style={[S.card, { gap: 12, backgroundColor: C.lavender }]}>
        <Chip>CSCB07 MIDTERM COURSE</Chip>
        <Text style={S.sectionTitle}>Learn first. Then test it from memory.</Text>
        <Text style={[S.text, { fontSize: 12 }]}>
          C++ foundations through iterators, with prerequisites, worked examples, written tasks, and
          two paper sets.
        </Text>
        <Button
          title="Open the 24-lesson course"
          onPress={() => router.push('/course/cscb07' as '/')}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 7 }}>
        {(['all', 'easy', 'medium', 'hard'] as const).map((level) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: difficulty === level }}
            aria-pressed={difficulty === level}
            key={level}
            onPress={() => setDifficulty(level)}
            style={{
              flex: 1,
              minHeight: 42,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: difficulty === level ? C.purple : C.white,
              borderColor: difficulty === level ? C.purple : C.line,
              borderWidth: 1,
            }}
          >
            <Text
              style={{
                color: difficulty === level ? C.white : C.muted,
                fontSize: 11,
                fontWeight: '800',
                textTransform: 'capitalize',
              }}
            >
              {level}
            </Text>
          </Pressable>
        ))}
      </View>
      <Button
        title="Shuffle five fresh variants"
        icon="shuffle-outline"
        onPress={() => router.push(('/lesson/mixed' + filter) as '/lesson/[unit]')}
      />
      <View>
        {UNITS.filter((u) => !u.id.startsWith('b07-')).map((unit, i) => {
          const all = challengesFor(unit.id),
            questions = all.filter((q) => difficulty === 'all' || q.difficulty === difficulty);
          if (!questions.length) return null;
          const solved = all.filter((c) => progress.skills[c.id]).length;
          const counts = {
            easy: questions.filter((q) => q.difficulty === 'easy').length,
            medium: questions.filter((q) => q.difficulty === 'medium').length,
            hard: questions.filter((q) => q.difficulty === 'hard').length,
          };
          return (
            <View key={unit.id}>
              {i > 0 && (
                <View
                  style={{
                    height: 19,
                    borderLeftWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: '#DCD5E8',
                    marginLeft: 32,
                  }}
                />
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  'Unit ' +
                  unit.number +
                  ': ' +
                  unit.title +
                  ', ' +
                  questions.length +
                  ' question families'
                }
                onPress={() => router.push(('/lesson/' + unit.id + filter) as '/lesson/[unit]')}
                style={({ pressed }) => [
                  S.card,
                  { gap: 14, borderRadius: 23, padding: 18, opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <View style={[S.row, { gap: 14 }]}>
                  <View
                    style={{
                      width: 49,
                      height: 54,
                      borderRadius: 16,
                      backgroundColor: unit.soft,
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: [{ rotate: i % 2 ? '4deg' : '-4deg' }],
                    }}
                  >
                    <Icon
                      name={solved === all.length ? 'checkmark-circle-outline' : unit.icon}
                      color={unit.color}
                      size={26}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={[S.eyebrow, { fontSize: 9, color: unit.color }]}>
                      UNIT {unit.number} · {questions.length}{' '}
                      {difficulty === 'all' ? 'FAMILIES' : difficulty.toUpperCase()}
                    </Text>
                    <Text style={[S.sectionTitle, { fontSize: 17 }]}>{unit.title}</Text>
                    <Text style={{ fontSize: 11, color: C.muted, lineHeight: 17 }}>
                      {unit.subtitle}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={16} color={C.muted} />
                </View>
                <Text style={{ color: C.muted, fontSize: 10 }}>
                  {Object.entries(counts)
                    .filter(([, count]) => count)
                    .map(([level, count]) => count + ' ' + level)
                    .join(' · ')}
                </Text>
                <View style={[S.row, { gap: 12 }]}>
                  <View style={{ flex: 1 }}>
                    <Bar value={solved / all.length} color={unit.color} height={5} />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: unit.color }}>
                    {solved}/{all.length}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
      <Text style={{ color: C.muted, fontSize: 11, lineHeight: 19 }}>
        A family teaches one idea through variants. Difficulty is curated. Short or fixed-concept
        questions can repeat; repeating the same variant doesn’t earn extra XP that day.
      </Text>
    </Page>
  );
}
