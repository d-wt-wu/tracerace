import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { CHALLENGES } from '../../content/curriculum';
import { useProgress } from '../../state/ProgressProvider';
import { dueIds } from '../../state/progress';
import { Button, Chip, Icon, Page, TraceArt } from '../../ui/components';
import { C, S } from '../../ui/theme';

export default function Review() {
  const { progress } = useProgress();
  const due = dueIds(progress),
    learned = Object.keys(progress.skills);
  const next = Object.values(progress.skills)
    .map((s) => s.due)
    .sort()[0];
  return (
    <Page>
      <View style={{ gap: 9, marginTop: 8 }}>
        <Text style={S.eyebrow}>MAKE IT STICK</Text>
        <Text style={S.title}>A second look.</Text>
        <Text style={S.text}>
          A little review goes a long way. Revisit what you’ve learned before it gets fuzzy.
        </Text>
      </View>
      <View style={[S.card, { gap: 19, alignItems: 'center', paddingVertical: 27 }]}>
        <TraceArt width={190} />
        <Chip>
          {due.length
            ? due.length + ' READY TO REVIEW'
            : learned.length
              ? 'ALL CAUGHT UP'
              : 'YOUR REVIEW SHELF'}
        </Chip>
        <Text style={[S.sectionTitle, { fontSize: 23, textAlign: 'center' }]}>
          {due.length
            ? 'Let’s connect those dots.'
            : learned.length
              ? 'Give your brain a breather.'
              : 'Learn it. Then keep it.'}
        </Text>
        <Text style={[S.text, { textAlign: 'center', maxWidth: 320 }]}>
          {due.length
            ? 'These challenges are ready for another go. Take your time and see what you remember.'
            : learned.length
              ? 'Nothing is due yet. Your first reviews arrive ' +
                new Date(next + 'T12:00:00').toLocaleDateString('en-CA', {
                  month: 'short',
                  day: 'numeric',
                }) +
                '.'
              : 'Finish a few challenges and they’ll come back here, right when a refresher helps.'}
        </Text>
        <Button
          title={
            due.length
              ? 'Review ' + due.length + ' challenges'
              : learned.length
                ? 'Practice what I know'
                : 'Try your first lesson'
          }
          icon="arrow-forward"
          onPress={() =>
            router.push(due.length || learned.length ? '/lesson/review' : '/lesson/values')
          }
          style={{ alignSelf: 'stretch' }}
        />
      </View>
      <View style={{ gap: 16 }}>
        <Text style={S.sectionTitle}>How review works</Text>
        {[
          [
            'repeat-outline',
            'Return, don’t restart.',
            'Reviews space out as you get comfortable: 1, 3, 7, then 14 days.',
          ],
          [
            'bulb-outline',
            'A hint is part of learning.',
            'If you need help, we’ll bring that idea back sooner.',
          ],
          [
            'sparkles-outline',
            'Understanding over grinding.',
            'Fresh review variants earn 5 XP, or 2 with help. The same variant counts once per day.',
          ],
        ].map(([icon, title, copy]) => (
          <View key={title} style={[S.row, { gap: 13, alignItems: 'flex-start' }]}>
            <View style={{ backgroundColor: C.lavender, padding: 10, borderRadius: 13 }}>
              <Icon name={icon as 'repeat-outline'} color={C.purple} size={19} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.ink }}>{title}</Text>
              <Text style={[S.text, { fontSize: 12, lineHeight: 19 }]}>{copy}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={{ color: C.muted, fontSize: 11 }}>
        {learned.length} of {CHALLENGES.length} question families on your shelf.
      </Text>
    </Page>
  );
}
