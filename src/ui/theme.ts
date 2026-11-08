import { Platform, StyleSheet } from 'react-native';
export const C = {
  bg: '#F9F7FC',
  ink: '#24243D',
  muted: '#726C83',
  line: '#E7E1F0',
  purple: '#6654D9',
  purpleDark: '#4D3DB2',
  lavender: '#EEEAFD',
  amber: '#F5B849',
  amberSoft: '#FFF2D8',
  coral: '#DB715F',
  coralSoft: '#FCECE7',
  white: '#FFFFFF',
  code: '#25253D',
  codeMuted: '#9494B3',
  outer: '#ECE8F3',
};
export const mono = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
export const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 24, paddingTop: 19, paddingBottom: 32, gap: 22 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, color: C.muted },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -1.15, color: C.ink },
  text: { fontSize: 14, lineHeight: 22, color: C.muted },
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 22,
    padding: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4, color: C.ink },
  divider: { height: 1, backgroundColor: C.line },
});
