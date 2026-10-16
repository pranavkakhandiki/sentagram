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
    explanation:
      'A word with a change of direction: the first “wind” is moving air; the second means to coil or wrap. Same spelling, different meanings—and different sounds.',
  }),
  definePuzzle({
    id: 'the-sporting-disaster',
    number: 2,
    title: 'The Sporting Disaster',
    difficulty: 'Gentle',
    solution: 'The match was canceled when a match set the scoreboard on fire.',
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
    explanation:
      'One bat is a flying mammal, another is a piece of sporting equipment, and “to bat” means to take a swing. A small creature makes a big entrance.',
    alternatives: ['While the batter waited to bat, the bat flew past the bat.'],
  }),
  definePuzzle({
    id: 'fine-by-me', number: 9, title: 'Fine by Me', difficulty: 'Tricky',
    solution: 'The judge found the fine print fine and dismissed the fine.',
    explanation: 'Small print, perfectly acceptable, and a financial penalty. The judge has three different kinds of fine on the desk.',
  }),
  definePuzzle({
    id: 'second-thoughts', number: 10, title: 'Second Thoughts', difficulty: 'Thoughtful',
    solution: 'The second hand stopped for a second on the second clock.',
    explanation: 'One second tells time, one second measures it, and the last second puts the clocks in order.',
    alternatives: ['The second hand on the second clock stopped for a second.'],
  }),
  definePuzzle({
    id: 'all-hands-on-deck', number: 11, title: 'All Hands on Deck', difficulty: 'Tricky',
    solution: 'The old man the boats while the young watch.',
    explanation: 'The old are people, and “man” is a verb: they crew the boats. The young are the ones watching.',
    alternatives: ['While the young watch, the old man the boats.'],
  }),
  definePuzzle({
    id: 'making-dough', number: 12, title: 'Making Dough', difficulty: 'Gentle',
    solution: 'The baker kneaded dough while the banker needed dough.',
    explanation: 'Both are working for their dough. The baker needs flour; the banker would prefer cash.',
    alternatives: ['While the banker needed dough, the baker kneaded dough.'],
  }),
  definePuzzle({
    id: 'an-open-secret', number: 13, title: 'An Open Secret', difficulty: 'Gentle',
    solution: 'The locksmith found the key to success under the mat.',
    explanation: 'The key to success turns out to be an actual key. The locksmith knew where to look.',
    alternatives: ['Under the mat, the locksmith found the key to success.'],
  }),
  definePuzzle({
    id: 'waiting-room', number: 14, title: 'Waiting Room', difficulty: 'Thoughtful',
    solution: 'The patient doctor helped the patient become a little more patient.',
    explanation: 'The doctor is unhurried, the patient is receiving care, and becoming patient takes a little time.',
  }),
  definePuzzle({
    id: 'field-work', number: 15, title: 'Field Work', difficulty: 'Gentle',
    solution: 'The scarecrow won an award for being outstanding in his field.',
    explanation: 'An exceptional worker—or simply someone out standing in a field. Either way, the scarecrow earned it.',
  }),
  definePuzzle({
    id: 'a-shoe-in', number: 16, title: 'A Shoe-in', difficulty: 'Thoughtful',
    solution: 'The sole survivor lost the sole of his shoe.',
    explanation: 'The only survivor has a shoe with no bottom. “Sole” takes care of both details.',
  }),
  definePuzzle({
    id: 'on-the-right-track', number: 17, title: 'On the Right Track', difficulty: 'Thoughtful',
    solution: 'The train conductor tried to train his dog on the train.',
    explanation: 'The conductor works on a train, trains a dog, and does both on a train. A very busy commute.',
    alternatives: ['On the train, the train conductor tried to train his dog.'],
  }),
  definePuzzle({
    id: 'flying-fruit', number: 18, title: 'Flying Fruit', difficulty: 'Tricky',
    solution: 'Time flies like an arrow but fruit flies like a banana.',
    explanation: 'Time moves like an arrow. Fruit flies, the insects, prefer a banana. The second “flies” and “like” quietly change their jobs.',
    alternatives: ['Fruit flies like a banana but time flies like an arrow.'],
  }),
  definePuzzle({
    id: 'just-desserts', number: 19, title: 'Just Desserts', difficulty: 'Tricky',
    solution: 'The waiter refused to desert his dessert in the desert.',
    explanation: 'He will not abandon his pudding in the sand. A single extra s separates dessert from a very dry afternoon.',
    alternatives: ['In the desert, the waiter refused to desert his dessert.'],
  }),
  definePuzzle({
    id: 'a-moving-ceremony', number: 20, title: 'A Moving Ceremony', difficulty: 'Thoughtful',
    solution: 'The wedding was so moving that even the cake was in tiers.',
    explanation: 'The guests are in tears. The cake is in tiers. It must have been a lovely ceremony.',
  }),
];

export const puzzleById = new Map(puzzles.map((puzzle) => [puzzle.id, puzzle]));
