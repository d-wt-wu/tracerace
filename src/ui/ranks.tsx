import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Difficulty } from '../content/curriculum';
import type { Rank } from '../domain/ranks';
import { Icon, Bar } from './components';
import { C, S } from './theme';

export function DifficultyTag({ level }: { level: Difficulty }) {
  const colors = {
    easy: ['#2476A0', '#E6F1F7'],
    medium: ['#94651F', '#FFF2D8'],
    hard: ['#A24D77', '#F8E7F0'],
  }[level];
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 7,
        backgroundColor: colors[1],
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{ color: colors[0], fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}
      >
        {level}
      </Text>
    </View>
  );
}
export function RankBadge({ rank, size = 84 }: { rank: Rank | null; size?: number }) {
  const color = rank?.color ?? C.purple,
    soft = rank?.soft ?? C.lavender;
  return (
    <View
      style={{ width: size, height: size * 1.12, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg
        aria-hidden
        width={size}
        height={size * 1.12}
        viewBox="0 0 100 112"
        style={{ position: 'absolute' }}
      >
        <Path
          d="M50 4L93 21V59Q93 88 50 107Q7 88 7 59V21Z"
          fill={soft}
          stroke={color}
          strokeWidth="2"
        />
        <Path
          d="M50 11L86 26V58Q86 82 50 99Q14 82 14 58V26Z"
          fill="none"
          stroke={color}
          opacity=".18"
          strokeWidth="1.5"
        />
      </Svg>
      <Icon name={rank?.icon ?? 'help-outline'} color={color} size={size * 0.43} />
    </View>
  );
}
export function RankCard({
  rank,
  label,
  value,
  next,
  onPress,
}: {
  rank: Rank | null;
  label: string;
  value?: string;
  next?: { title: string; value: number };
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={[S.card, { gap: 15 }]}
    >
      <View style={[S.row, { gap: 18 }]}>
        <RankBadge rank={rank} size={65} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={[S.eyebrow, { fontSize: 9 }]}>{label}</Text>
          <Text
            style={{
              fontSize: 20,
              lineHeight: 25,
              fontWeight: '800',
              letterSpacing: -0.6,
              color: C.ink,
            }}
          >
            {rank?.name ?? 'Still a mystery'}
          </Text>
          <Text style={{ fontSize: 12, lineHeight: 18, color: C.muted }}>
            {value ?? rank?.subtitle ?? 'Take the assessment to meet your rank.'}
          </Text>
        </View>
        {onPress && <Icon name="chevron-forward" size={16} color={C.muted} />}
      </View>
      {next && (
        <View style={{ gap: 8 }}>
          <Bar value={next.value} color={rank?.color} />
          <Text style={{ fontSize: 10, color: C.muted }}>{next.title}</Text>
        </View>
      )}
    </Pressable>
  );
}
export function RankLadder({
  ranks,
  value,
  suffix,
}: {
  ranks: Rank[];
  value: number | null;
  suffix: string;
}) {
  return (
    <View style={{ gap: 10 }}>
      {ranks.map((rank, index) => {
        const active =
          value !== null &&
          value >= rank.threshold &&
          (index === ranks.length - 1 || value < ranks[index + 1].threshold);
        return (
          <View
            key={rank.name}
            style={[
              S.row,
              {
                padding: 13,
                gap: 12,
                borderRadius: 17,
                backgroundColor: active ? rank.soft : C.white,
                borderWidth: active ? 1.5 : 1,
                borderColor: active ? rank.color : C.line,
              },
            ]}
          >
            <RankBadge rank={rank} size={37} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: C.ink, fontWeight: '800', fontSize: 13 }}>{rank.name}</Text>
              <Text style={{ color: C.muted, fontSize: 10 }}>
                {rank.threshold}
                {suffix}
                {active ? ' · you are here' : ''}
              </Text>
            </View>
            {active && <Icon name="checkmark-circle" color={rank.color} size={21} />}
          </View>
        );
      })}
    </View>
  );
}
