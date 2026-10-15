import { deterministicShuffle } from '../game/shuffle';
import type { AcceptedSentence, Difficulty, Puzzle } from '../game/types';

interface PuzzleDefinition {
  id: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  solution: string;
  /** Zero-based positions of proper nouns; ordinary sentence capitals are hidden. */
  properNouns?: number[];
  hint: string;
  explanation: string;
  alternatives?: string[];
}

/** Punctuation belongs to sentence positions, never to a draggable/selectable tile. */
export function parseSentence(sentence: string): AcceptedSentence {
  const parts = sentence.trim().split(/\s+/);
  const before: Record<number, string> = {};
  const after: Record<number, string> = {};
  let ending = '.';
  const words = parts.map((part, index) => {
    const prefix = part.match(/^[“"(]+/)?.[0];
    const suffix = part.match(/[,.;:!?…”")]+$/)?.[0];
    if (prefix) before[index] = prefix;
    if (suffix) {
      if (index === parts.length - 1) ending = suffix;
      else after[index] = suffix;
    }
    return part.slice(prefix?.length ?? 0, suffix ? -suffix.length : undefined);
  });
  return { words, format: { before, after, ending } };
}

function definePuzzle(definition: PuzzleDefinition): Puzzle {
  const sentence = parseSentence(definition.solution);
  const solutionTokens = sentence.words.map((text, index) => ({
    id: `${definition.id}-word-${index}`,
    text,
    preserveCase: definition.properNouns?.includes(index) ?? false,
  }));
  return {
    id: definition.id,
    number: definition.number,
    title: definition.title,
    difficulty: definition.difficulty,
    solutionTokens,
    wordBank: deterministicShuffle(solutionTokens, definition.id),
    format: sentence.format,
    hint: definition.hint,
    explanation: definition.explanation,
    alternativeSolutions: definition.alternatives?.map(parseSentence),
  };
}

/** Add a definition here. Keep published IDs stable to preserve saved progress. */
export const puzzles: Puzzle[] = [
  definePuzzle({
    id: 'a-windy-day',
    number: 1,
    title: 'A Windy Day',
    difficulty: 'Gentle',
    solution: 'The wind made it hard to wind the kite string.',
    hint: 'One word is both a moving breeze and a twisting action.',
    explanation:
      'A word with a change of direction: the first “wind” is moving air; the second means to coil or wrap. Same spelling, different meanings—and different sounds.',
  }),
  definePuzzle({
    id: 'the-sporting-disaster',
    number: 2,
    title: 'The Sporting Disaster',
    difficulty: 'Gentle',
    solution: 'The match was canceled when a match set the scoreboard on fire.',
    hint: 'A big sporting event meets a very small fire starter.',
    explanation:
      'A match ends a match. One is a sporting contest; the other is the little stick that starts a fire. An unfortunate meeting of meanings.',
    alternatives: ['A match was canceled when the match set the scoreboard on fire.'],
  }),
  definePuzzle({
    id: 'the-flower-garden',
    number: 3,
    title: 'The Flower Garden',
    difficulty: 'Thoughtful',
    solution: 'Rose rose early to pick a rose before the garden opened.',
    properNouns: [0],
    hint: 'A person’s name, an action, and a flower share a spelling.',
    explanation:
      'Rose is a person, “rose” means got up, and a rose is a flower. Three roles for one little word, all before the garden even opens.',
    alternatives: ['Before the garden opened, Rose rose early to pick a rose.'],
  }),
  definePuzzle({
    id: 'the-musician',
    number: 4,
    title: 'The Musician',
    difficulty: 'Gentle',
    solution: 'The bass player put his bass down to catch a bass.',
    hint: 'Someone swaps a low note for a fishing line.',
    explanation:
      'The first two instances of “bass” belong to music; the third is a fish. The musical bass rhymes with “face”; the fish rhymes with “mass.”',
    alternatives: ['The bass player put down his bass to catch a bass.'],
  }),
  definePuzzle({
    id: 'keeping-watch',
    number: 5,
    title: 'Keeping Watch',
    difficulty: 'Thoughtful',
    solution: 'The watchmaker watched his watch while the guard kept watch.',
    hint: 'One person checks the time while another stays alert.',
    explanation:
      'A watchmaker makes timepieces, watched means observed, a watch tells time, and keeping watch means staying alert. A whole sentence keeping an eye on one word.',
    alternatives: ['While the guard kept watch, the watchmaker watched his watch.'],
  }),
  definePuzzle({
    id: 'two-busy-months',
    number: 6,
    title: 'Two Busy Months',
    difficulty: 'Tricky',
    solution: 'May may march in March while June may dance in June.',
    properNouns: [0, 4, 6, 10],
    hint: 'Two people, two months, and two things they might do. Mind the capitals.',
    explanation:
      'May and June are both people and months. Lowercase “may” expresses possibility, while “march” is an action and “March” is a month. The capitals do a little extra work here.',
    alternatives: ['June may dance in June while May may march in March.'],
  }),
  definePuzzle({
    id: 'the-mayors-gift',
    number: 7,
    title: 'The Mayor’s Gift',
    difficulty: 'Thoughtful',
    solution: 'The present mayor asked the student to present a present at lunch.',
    hint: 'A current official asks someone to give a gift.',
    explanation:
      '“Present” means current, to formally give something, and a gift. Three meanings arrive at the same lunch—and each has its own place in the sentence.',
    alternatives: ['At lunch, the present mayor asked the student to present a present.'],
  }),
  definePuzzle({
    id: 'the-baseball-game',
    number: 8,
    title: 'The Baseball Game',
    difficulty: 'Thoughtful',
    solution: 'The bat flew past the bat while the batter waited to bat.',
    hint: 'A winged visitor interrupts a turn at the plate.',
    explanation:
      'One bat is a flying mammal, another is a piece of sporting equipment, and “to bat” means to take a swing. A small creature makes a big entrance.',
    alternatives: ['While the batter waited to bat, the bat flew past the bat.'],
  }),
];

export const puzzleById = new Map(puzzles.map((puzzle) => [puzzle.id, puzzle]));
