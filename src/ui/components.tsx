import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { C, mono, S } from './theme';
import { useProgress } from '../state/ProgressProvider';

export function Page({ children }: { children: React.ReactNode }) {
  const { storageNotice } = useProgress();
  return (
    <SafeAreaView style={S.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={S.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {storageNotice && (
          <View style={[styles.notice, { backgroundColor: C.amberSoft }]}>
            <Text accessibilityRole="alert" style={S.text}>
              {storageNotice}
            </Text>
          </View>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Icon({
  name,
  size = 20,
  color = C.ink,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} aria-hidden={true} />;
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondary : styles.primary,
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.8, transform: [{ translateY: 1 }] },
        style,
      ]}
    >
      <Text style={{ color: secondary ? C.ink : C.white, fontWeight: '800', fontSize: 15 }}>
        {title}
      </Text>
      {icon && <Icon name={icon} color={secondary ? C.ink : C.white} size={18} />}
    </Pressable>
  );
}
export function IconButton({
  name,
  onPress,
  label,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Chip({
  children,
  color = C.purple,
  background = C.lavender,
}: {
  children: React.ReactNode;
  color?: string;
  background?: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <Text style={{ fontSize: 11, fontWeight: '800', color }}>{children}</Text>
    </View>
  );
}
export function Bar({
  value,
  color = C.purple,
  height = 6,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  const width = (Math.max(0, Math.min(1, value)) * 100 + '%') as DimensionValue;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(Math.max(0, Math.min(1, value)) * 100),
      }}
      style={{ height, borderRadius: height, backgroundColor: C.line, overflow: 'hidden' }}
    >
      <View style={{ height, width, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}
export function Mark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" aria-hidden={true}>
      <Rect width="36" height="36" rx="11" fill={C.purple} />
      <Path
        d="M13 11L7 18L13 25M23 11L29 18L23 25"
        stroke="white"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M20 11L16 25" stroke={C.amber} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}
export function Brand() {
  return (
    <View style={[S.row, { gap: 9 }]}>
      <Mark />
      <Text style={{ color: C.ink, fontWeight: '800', fontSize: 19, letterSpacing: -0.8 }}>
        tracerace<Text style={{ color: C.purple }}>.</Text>
      </Text>
    </View>
  );
}
export function TraceArt({ width = 170 }: { width?: number }) {
  return (
    <Svg width={width} height={width * 0.86} viewBox="0 0 200 172" aria-hidden={true}>
      <Circle cx="106" cy="82" r="70" fill={C.lavender} />
      <Path
        d="M27 126Q68 154 116 134T183 121"
        stroke="#D9D0F6"
        strokeWidth="1.5"
        strokeDasharray="4 5"
        fill="none"
      />
      <Rect
        x="24"
        y="86"
        width="60"
        height="51"
        rx="13"
        fill={C.white}
        stroke="#DCD4EF"
        strokeWidth="1.5"
        transform="rotate(-9 54 112)"
      />
      <SvgText
        x="39"
        y="117"
        fontSize="22"
        fontFamily="monospace"
        fontWeight="bold"
        fill={C.purple}
      >
        4
      </SvgText>
      <Path
        d="M72 101C98 100 86 66 111 64"
        stroke={C.purple}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M104 59L113 64L106 71"
        stroke={C.purple}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x="111"
        y="36"
        width="64"
        height="68"
        rx="17"
        fill={C.purple}
        transform="rotate(8 143 70)"
      />
      <Path
        d="M128 57L121 64L128 71M157 59L164 66L157 73"
        stroke={C.white}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="137" cy="81" r="2" fill={C.white} />
      <Circle cx="149" cy="83" r="2" fill={C.white} />
      <Rect
        x="108"
        y="119"
        width="60"
        height="28"
        rx="10"
        fill={C.amber}
        transform="rotate(8 138 133)"
      />
      <SvgText x="122" y="138" fill={C.ink} fontSize="12" fontWeight="bold" fontFamily="monospace">
        *p
      </SvgText>
      <Path
        d="M47 35V49M40 42H54M177 108V118M172 113H182"
        stroke={C.coral}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Circle cx="81" cy="26" r="3" fill={C.amber} />
    </Svg>
  );
}
export function GoalRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 23;
  return (
    <View style={{ width: 58, height: 58, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width="58" height="58" style={StyleSheet.absoluteFill} aria-hidden={true}>
        <Circle cx="29" cy="29" r="23" fill="none" stroke={C.lavender} strokeWidth="5" />
        <Circle
          cx="29"
          cy="29"
          r="23"
          fill="none"
          stroke={C.purple}
          strokeWidth="5"
          strokeDasharray={[circumference * Math.min(value, 1), circumference]}
          strokeLinecap="round"
          transform="rotate(-90 29 29)"
        />
      </Svg>
      <Icon name={value >= 1 ? 'checkmark' : 'flash'} color={C.purple} size={22} />
    </View>
  );
}
function ColoredLine({ source }: { source: string }) {
  const pieces = source.split(
    /("(?:\\.|[^"\\])*"|\b(?:int|printf|malloc|free|sizeof|NULL)\b|\b\d+\b|\/\/.*)/g,
  );
  return (
    <Text style={styles.codeText}>
      {pieces.map((p, i) => (
        <Text
          key={i}
          style={{
            color: /^"/.test(p)
              ? '#F4C777'
              : /^(int|sizeof|NULL)$/.test(p)
                ? '#BEA6FF'
                : /^(printf|malloc|free)$/.test(p)
                  ? '#8BCEDD'
                  : /^\d+$/.test(p)
                    ? '#F2A292'
                    : /^\/\//.test(p)
                      ? C.codeMuted
                      : '#F2F0FA',
          }}
        >
          {p}
        </Text>
      ))}
    </Text>
  );
}
export function CodeBlock({
  code,
  line = 0,
  language = 'C',
}: {
  code: string;
  line?: number;
  language?: string;
}) {
  return (
    <View style={styles.code}>
      <View
        style={[
          S.between,
          {
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomColor: '#3D3D55',
            borderBottomWidth: 1,
          },
        ]}
      >
        <View style={[S.row, { gap: 5 }]}>
          {['#DB7969', '#E5B855', '#8A81B5'].map((c) => (
            <View key={c} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
          ))}
        </View>
        <Text style={{ fontFamily: mono, color: C.codeMuted, fontSize: 10 }}>
          {language === 'C' ? 'C · inside main()' : language}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingVertical: 13 }}
      >
        <View style={{ flex: 1, minWidth: '100%' }}>
          {code.split('\n').map((source, i) => (
            <View
              key={i}
              style={[
                S.row,
                {
                  paddingRight: 18,
                  minHeight: 28,
                  backgroundColor: line === i + 1 ? '#43415F' : 'transparent',
                },
              ]}
            >
              <Text
                style={{
                  width: 37,
                  textAlign: 'center',
                  fontFamily: mono,
                  fontSize: 11,
                  color: line === i + 1 ? '#DCCFFF' : '#77778F',
                }}
              >
                {i + 1}
              </Text>
              <ColoredLine source={source} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: C.purple, borderBottomWidth: 3, borderColor: C.purpleDark },
  secondary: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: C.line,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
  },
  chip: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 9, borderRadius: 8 },
  code: { backgroundColor: C.code, borderRadius: 18, overflow: 'hidden' },
  codeText: { fontFamily: mono, fontSize: 12, lineHeight: 26 },
  notice: { padding: 14, borderRadius: 14 },
});
