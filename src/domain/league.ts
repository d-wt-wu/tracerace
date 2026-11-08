export type PlayerIdentity = {
  id: string;
  alias: string;
  token: string;
  active: boolean;
  account?: boolean;
};
export type BoardRow = {
  id: string;
  alias: string;
  rank: number;
  xp: number;
  score: number | null;
};
export type Board = { rows: BoardRow[]; me: BoardRow | null; total: number };
export type Boards = {
  week: string;
  resetsAt: string;
  fetchedAt: string;
  weekly: Board;
  skills: Board;
};
export type GradeReceipt = {
  correct: boolean;
  xp: number;
  capped: boolean;
  alreadySolved: boolean;
};
