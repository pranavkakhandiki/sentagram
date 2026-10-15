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
  hint?: string;
  explanation: string;
  alternativeSolutions?: AcceptedSentence[];
}

export type PuzzleStatus = 'playing' | 'solved' | 'revealed';

export interface PuzzleProgress {
  selectedIds: string[];
  history: string[][];
  status: PuzzleStatus;
  attempts: number;
  incorrectChecks: number;
  hintUsed: boolean;
}

export interface SavedProgress {
  version: 1;
  activePuzzleId: string;
  puzzles: Record<string, PuzzleProgress>;
}
