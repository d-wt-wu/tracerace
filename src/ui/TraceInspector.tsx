import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Trace } from '../engine/c';
import { C, mono, S } from './theme';
import { Icon } from './components';

export function TraceInspector({
  trace,
  step,
  onStep,
  onClose,
}: {
  trace: Trace;
  step: number;
  onStep: (delta: -1 | 1) => void;
  onClose: () => void;
}) {
  const snapshot = trace.steps[step];
  const fault = trace.fault && step === trace.steps.length - 1;
  return (
    <View style={[S.card, { gap: 15, backgroundColor: '#F5F1FD', borderColor: '#DFD7F3' }]}>
      <View style={S.between}>
        <View style={{ gap: 5 }}>
          <Text style={[S.sectionTitle, { fontSize: 15 }]}>Follow the code</Text>
          <Text style={{ color: C.purple, fontSize: 10, fontWeight: '700' }}>
            STEP {step} / {trace.steps.length - 1}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close code trace"
          onPress={onClose}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="close" size={18} color={C.purple} />
        </Pressable>
      </View>
      <Text accessibilityLiveRegion="polite" style={[S.text, { color: fault ? '#A54C41' : C.ink }]}>
        {snapshot.note}
      </Text>
      {snapshot.variables.length === 0 ? (
        <Text style={S.text}>Run the first line to create a variable.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={S.eyebrow}>VARIABLES</Text>
          {snapshot.variables.map((v) => (
            <View key={v.name} style={[S.between, { gap: 12 }]}>
              <Text style={{ fontFamily: mono, color: C.ink, fontSize: 13 }}>
                {v.type} <Text style={{ fontWeight: '800' }}>{v.name}</Text>
              </Text>
              <Text style={{ fontFamily: mono, fontWeight: '700', color: C.purple, fontSize: 13 }}>
                {v.target ? '→ ' : ''}
                {v.value}
              </Text>
            </View>
          ))}
        </View>
      )}
      {snapshot.memory.length > 0 && (
        <View style={{ gap: 10 }}>
          <Text style={S.eyebrow}>INT STORAGE</Text>
          {snapshot.memory.map((block) => (
            <View key={block.id} style={{ gap: 6, opacity: block.freed ? 0.55 : 1 }}>
              <Text style={{ color: C.muted, fontSize: 11 }}>
                {block.label} · {block.space}
                {block.freed ? ' · released' : ''}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 2 }}>
                  {block.cells.map((cell) => {
                    const target = snapshot.variables.find((v) => v.target === cell.address);
                    return (
                      <View
                        key={cell.address}
                        style={{ alignItems: 'center', minWidth: 66, gap: 4 }}
                      >
                        <View
                          style={{
                            width: 66,
                            minHeight: 42,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 10,
                            backgroundColor: target ? C.purple : C.white,
                            borderWidth: 1,
                            borderColor: target ? C.purple : C.line,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: mono,
                              fontWeight: '800',
                              color: target ? C.white : C.ink,
                              textDecorationLine: block.freed ? 'line-through' : 'none',
                            }}
                          >
                            {cell.value}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: mono, fontSize: 9, color: C.muted }}>
                          {cell.address}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ))}
        </View>
      )}
      {!!snapshot.output && (
        <View style={{ gap: 5 }}>
          <Text style={S.eyebrow}>OUTPUT SO FAR</Text>
          <Text selectable style={{ fontFamily: mono, color: C.ink }}>
            {snapshot.output}
          </Text>
        </View>
      )}
      <View style={[S.row, { gap: 10 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous trace step"
          accessibilityState={{ disabled: step === 0 }}
          disabled={step === 0}
          onPress={() => onStep(-1)}
          style={{
            height: 44,
            width: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            backgroundColor: C.white,
            opacity: step === 0 ? 0.35 : 1,
          }}
        >
          <Icon name="arrow-back" color={C.purple} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next trace step"
          accessibilityState={{ disabled: step === trace.steps.length - 1 }}
          disabled={step === trace.steps.length - 1}
          onPress={() => onStep(1)}
          style={{
            height: 44,
            flex: 1,
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            backgroundColor: C.purple,
            opacity: step === trace.steps.length - 1 ? 0.35 : 1,
          }}
        >
          <Text style={{ color: C.white, fontWeight: '700', fontSize: 13 }}>Next line</Text>
          <Icon name="arrow-forward" size={16} color={C.white} />
        </Pressable>
      </View>
      <Text style={{ color: C.muted, fontSize: 10, lineHeight: 15 }}>
        A teaching model: addresses are illustrative, ints are 32-bit, and allocations are assumed
        to succeed.
      </Text>
    </View>
  );
}
