import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button, CodeBlock, Icon, IconButton } from './components';
import { C, S, mono } from './theme';
import type { Reading } from '../content/cscb07/lessons';

export function CourseBack({ title = 'CSCB07' }: { title?: string }) {
  return (
    <View style={[S.row, { gap: 12 }]}>
      <IconButton
        name="arrow-back"
        label="Back to CSCB07 course"
        onPress={() => router.replace('/course/cscb07' as '/')}
      />
      <Text style={[S.eyebrow, { flex: 1 }]}>{title}</Text>
    </View>
  );
}
export function ReadingReferences({ reading }: { reading: Reading[] }) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: show }}
        onPress={() => setShow(!show)}
        style={[S.between, { minHeight: 44 }]}
      >
        <Text style={{ fontSize: 12, color: C.purple, fontWeight: '700' }}>
          Optional reading references
        </Text>
        <Icon name={show ? 'chevron-up' : 'chevron-down'} color={C.purple} size={17} />
      </Pressable>
      {show && (
        <View style={{ gap: 9 }}>
          {reading.map((r, i) => (
            <View key={i}>
              <Text style={{ color: C.ink, fontWeight: '700', fontSize: 12 }}>
                Lecture {r.lecture} · PDF {r.pages.includes('–') ? 'pages' : 'page'} {r.pages}
              </Text>
              {r.note && <Text style={[S.text, { fontSize: 11 }]}>{r.note}</Text>}
            </View>
          ))}
          <Text style={[S.text, { fontSize: 11 }]}>
            Use your own lecture PDFs. Their private files are not published with this app. These
            references use PDF page numbers.
          </Text>
        </View>
      )}
    </View>
  );
}
export function FoldCode({
  code,
  title = 'Complete class/function context',
}: {
  code: string;
  title?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ gap: 10 }}>
      <Button
        title={(show ? 'Hide: ' : 'Show: ') + title}
        secondary
        onPress={() => setShow(!show)}
      />
      {show && <CodeBlock code={code} language="C++20 context" />}
    </View>
  );
}
export function WritingBox({
  value,
  onChange,
  label = 'Your answer',
  placeholder = 'Write your answer here, or work on paper.',
  minHeight = 180,
  disabled = false,
}: {
  value: string;
  onChange: (s: string) => void;
  label?: string;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: '700', fontSize: 12, color: C.ink }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={4000}
        editable={!disabled}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        textAlignVertical="top"
        style={{
          minHeight,
          padding: 16,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.line,
          color: C.ink,
          backgroundColor: C.white,
          fontFamily: mono,
          fontSize: 13,
          lineHeight: 22,
        }}
      />
      <Text style={{ color: C.muted, fontSize: 10 }}>
        {value.length}/4000 characters · saved with your course progress
      </Text>
    </View>
  );
}
export function Rubric({
  items,
  checked,
  onChange,
}: {
  items: string[];
  checked: boolean[];
  onChange: (items: boolean[]) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={S.sectionTitle}>Self-review rubric</Text>
      <Text style={[S.text, { fontSize: 12 }]}>
        Check what your answer demonstrates. Valid alternative code is welcome. These marks are
        self-reported and earn no verified correctness or league XP.
      </Text>
      {items.map((item, i) => (
        <Pressable
          key={i}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!checked[i] }}
          onPress={() => onChange(items.map((_, j) => (j === i ? !checked[j] : !!checked[j])))}
          style={[
            S.row,
            {
              minHeight: 48,
              gap: 11,
              alignItems: 'flex-start',
              padding: 10,
              backgroundColor: C.white,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 12,
            },
          ]}
        >
          <Icon name={checked[i] ? 'checkbox' : 'square-outline'} size={20} color={C.purple} />
          <Text style={[S.text, { fontSize: 12, flex: 1 }]}>{item}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ModelAnswer({ answer }: { answer: string }) {
  return (
    <View style={{ gap: 14 }}>
      {answer.split('\n\n').map((block, i) =>
        /[{};]/.test(block) && block.includes('\n') ? (
          <CodeBlock key={i} code={block} language="Reference answer" />
        ) : (
          <Text key={i} selectable style={[S.text, { fontSize: 13, color: C.ink }]}>
            {block}
          </Text>
        ),
      )}
    </View>
  );
}
