export type Difficulty = 'Gentle' | 'Thoughtful' | 'Tricky';

export interface WordToken {
  id: string;
  /** Authored capitalization is retained, even when the bank displays lowercase. */
  text: string;
  preserveCase: boolean;
}

export interface SentenceFormat {
  before?: Record<number, string>;
  after?: Record<number, string>;
  ending: string;
}

export interface AcceptedSentence {
  words: string[];
  format: SentenceFormat;
}

export interface Puzzle {
  id: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  solutionTokens: WordToken[];
  wordBank: WordToken[];
  format: SentenceFormat;
  explanation: string;
  alternativeSolutions?: AcceptedSentence[];
}

export type PuzzleStatus = 'playing' | 'solved' | 'revealed';

export interface PuzzleProgress {
  selectedIds: string[];
  history: string[][];
  status: PuzzleStatus;
  /** Full tile orders, captured before a failed third guess reveals the answer. */
  guesses: string[][];
}

export interface SavedProgress {
  version: 2;
  day: string;
  daily: PuzzleProgress;
  devMode: boolean;
  practicePuzzleId: string | null;
  practice: Record<string, PuzzleProgress>;
}
