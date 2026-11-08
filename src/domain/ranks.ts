export type Rank = {
  name: string;
  subtitle: string;
  threshold: number;
  color: string;
  soft: string;
  icon:
    | 'egg-outline'
    | 'game-controller-outline'
    | 'school-outline'
    | 'bug-outline'
    | 'code-slash-outline'
    | 'sparkles-outline'
    | 'planet-outline';
};
export const SKILL_RANKS: Rank[] = [
  {
    name: 'Baby Byte',
    subtitle: 'Every wizard once asked “what’s a variable?”',
    threshold: 0,
    color: '#A57845',
    soft: '#FFF0DE',
    icon: 'egg-outline',
  },
  {
    name: 'Keyboard Toddler',
    subtitle: 'Walking is optional. Curiosity isn’t.',
    threshold: 15,
    color: '#B27346',
    soft: '#FBEBDD',
    icon: 'game-controller-outline',
  },
  {
    name: 'Semicolon Middle Schooler',
    subtitle: 'Still growing. Mostly remembering the semicolon.',
    threshold: 30,
    color: '#2476A0',
    soft: '#E6F1F7',
    icon: 'school-outline',
  },
  {
    name: 'Bug Wrangler',
    subtitle: 'The bugs have started respecting you.',
    threshold: 45,
    color: '#A24D77',
    soft: '#F8E7F0',
    icon: 'bug-outline',
  },
  {
    name: 'Junior SWE Energy',
    subtitle: 'You and the debugger are on speaking terms.',
    threshold: 60,
    color: '#6654D9',
    soft: '#EEEAFD',
    icon: 'code-slash-outline',
  },
  {
    name: 'Big-O Goblin',
    subtitle: 'You see a nested loop and start negotiating.',
    threshold: 75,
    color: '#B27623',
    soft: '#FFF2D8',
    icon: 'sparkles-outline',
  },
  {
    name: 'Compiler Whisperer',
    subtitle: 'The rubber duck asks you for help.',
    threshold: 90,
    color: '#6654D9',
    soft: '#EEEAFD',
    icon: 'planet-outline',
  },
];
export const LEAGUES: Rank[] = [
  {
    name: 'Potato Division',
    subtitle: 'A humble beginning. Excellent potential.',
    threshold: 0,
    color: '#A57845',
    soft: '#FFF0DE',
    icon: 'egg-outline',
  },
  {
    name: 'Keyboard Gremlins',
    subtitle: 'The keys have noticed your presence.',
    threshold: 40,
    color: '#B27346',
    soft: '#FBEBDD',
    icon: 'game-controller-outline',
  },
  {
    name: 'Rubber Duck Council',
    subtitle: 'Quack responsibly.',
    threshold: 120,
    color: '#B27623',
    soft: '#FFF2D8',
    icon: 'school-outline',
  },
  {
    name: 'Semicolon Society',
    subtitle: 'A distinguished collection of tiny wins.',
    threshold: 250,
    color: '#2476A0',
    soft: '#E6F1F7',
    icon: 'code-slash-outline',
  },
  {
    name: 'Merge Conflict Club',
    subtitle: 'Somehow everyone is on the same branch.',
    threshold: 450,
    color: '#A24D77',
    soft: '#F8E7F0',
    icon: 'bug-outline',
  },
  {
    name: 'Big-O Goblin Guild',
    subtitle: 'An unreasonable amount of reasonable practice.',
    threshold: 800,
    color: '#6654D9',
    soft: '#EEEAFD',
    icon: 'sparkles-outline',
  },
  {
    name: 'Production Wizards',
    subtitle: 'The deploy button fears you.',
    threshold: 1200,
    color: '#6654D9',
    soft: '#EEEAFD',
    icon: 'planet-outline',
  },
];
const tier = (ranks: Rank[], value: number) =>
  [...ranks].reverse().find((r) => value >= r.threshold) ?? ranks[0];
export const skillRank = (score: number) => tier(SKILL_RANKS, Math.max(0, Math.min(100, score)));
export const leagueRank = (xp: number) => tier(LEAGUES, Math.max(0, xp));
export const nextRank = (ranks: Rank[], value: number) =>
  ranks.find((r) => r.threshold > value) ?? null;
export function weekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);
