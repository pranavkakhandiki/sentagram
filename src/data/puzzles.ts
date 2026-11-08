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

/** Editorial order is stable; rewritten entries receive new IDs. */
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
    id: "minute-adjustment", number: 6, title: "A Minute Adjustment", difficulty: "Tricky",
    solution: "The minute hand needed a minute adjustment that took an entire afternoon.",
    explanation: "The clock has a minute hand, but the adjustment is minute: tiny. A small repair takes a very long time.",
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
    id: "cast-of-characters", number: 8, title: "Cast of Characters", difficulty: "Tricky",
    solution: "The fisherman cast in the play couldn't remember a single line.",
    explanation: "Cast initially looks like something a fisherman does. Here it means chosen for a play; his line belongs to a script.",
  }),
  definePuzzle({
    id: 'fine-by-me', number: 9, title: 'Fine by Me', difficulty: 'Tricky',
    solution: 'The judge found the fine print fine and dismissed the fine.',
    explanation: 'Small print, perfectly acceptable, and a financial penalty. The judge has three different kinds of fine on the desk.',
  }),
  definePuzzle({
    id: "second-fiddle", number: 10, title: "Second Fiddle", difficulty: "Thoughtful",
    solution: "Playing second fiddle was the only thing the violinist couldn't stand.",
    explanation: "Second fiddle is both a musical part and a subordinate role. Stand means tolerate, not get to your feet.",
    alternatives: ["The only thing the violinist couldn\u0027t stand was playing second fiddle."],
  }),
  definePuzzle({
    id: 'all-hands-on-deck', number: 11, title: 'All Hands on Deck', difficulty: 'Tricky',
    solution: 'The old man the boats while the young watch.',
    explanation: 'The old are people, and “man” is a verb: they crew the boats. The young are the ones watching.',
    alternatives: ['While the young watch, the old man the boats.'],
  }),
  definePuzzle({
    id: "board-meeting", number: 12, title: "Board Meeting", difficulty: "Tricky",
    solution: "The board voted to board up the school it couldn't afford.",
    explanation: "A governing board votes to close its own school. The second board means cover with wooden planks.",
  }),
  definePuzzle({
    id: "historical-date", number: 13, title: "An Overlooked Date", difficulty: "Thoughtful",
    solution: "The only date the historian couldn't remember was sitting in his lunchbox.",
    explanation: "The historian knows the calendar dates. This overlooked date is a piece of fruit.",
  }),
  definePuzzle({
    id: 'waiting-room', number: 14, title: 'Waiting Room', difficulty: 'Thoughtful',
    solution: 'The patient doctor helped the patient become a little more patient.',
    explanation: 'The doctor is unhurried, the patient is receiving care, and becoming patient takes a little time.',
  }),
  definePuzzle({
    id: "ends-meet", number: 15, title: "Making Ends Meet", difficulty: "Thoughtful",
    solution: "The tailor who couldn't make ends meet started selling shorter trousers.",
    explanation: "Making ends meet means earning enough to get by. A tailor has a rather literal interest in where the ends meet.",
  }),
  definePuzzle({
    id: "sleeping-on-it", number: 16, title: "Sleeping on It", difficulty: "Tricky",
    solution: "The guard caught sleeping on the job woke up without a job.",
    explanation: "Caught sleeping describes the guard; it is not the main action. The sentence only reaches its main verb at woke.",
  }),
  definePuzzle({
    id: "picking-winner", number: 17, title: "Picking a Winner", difficulty: "Thoughtful",
    solution: "The only thing the locksmith couldn't pick was the winning number.",
    explanation: "Picking locks is this person's specialty. Picking the winning lottery number is another matter.",
  }),
  definePuzzle({
    id: "broken-record", number: 18, title: "A Broken Record", difficulty: "Tricky",
    solution: "The record producer refused to record the record breaking in half.",
    explanation: "The first record belongs to music, the second means capture on tape, and the third is the disc that is breaking.",
  }),
  definePuzzle({
    id: "silent-letter", number: 19, title: "Undeliverable", difficulty: "Thoughtful",
    solution: "The letter that the postman couldn't deliver turned out to be silent.",
    explanation: "A postman delivers written messages. A silent letter belongs inside a word, where it is written but never heard.",
  }),
  definePuzzle({
    id: "twelve-months", number: 20, title: "A Long Sentence", difficulty: "Thoughtful",
    solution: "The thief who stole the calendar got twelve months for his trouble.",
    explanation: "Twelve months comes with the stolen calendar—and with the thief's prison sentence.",
  }),
  definePuzzle({
    id: "lost-interest", number: 21, title: "Lost Interest", difficulty: "Thoughtful",
    solution: "The exhausted banker lost interest in the account of the robbery.",
    explanation: "Interest needn't be earned on money, and an account needn't hold it. Here they mean attention and a spoken description.",
  }),
  definePuzzle({
    id: "saw-it-coming", number: 22, title: "Saw It Coming", difficulty: "Tricky",
    solution: "The witness saw the saw that the carpenter claimed was missing.",
    explanation: "The witness saw something; that something was a saw. The claim about it being missing nests inside the sentence.",
  }),
  definePuzzle({
    id: "fair-enough", number: 23, title: "Fair Enough", difficulty: "Thoughtful",
    solution: "The fine for parking at the fair was anything but fair.",
    explanation: "Fine is a penalty, fair is a carnival, and the final fair means reasonable. Anything but supplies the verdict.",
  }),
  definePuzzle({
    id: "know-the-score", number: 24, title: "Know the Score", difficulty: "Tricky",
    solution: "Only the conductor knew the score after the band lost its notes.",
    explanation: "Knowing the score means understanding the situation. A conductor also reads a musical score, while notes can be music or money.",
  }),
  definePuzzle({
    id: "cover-story", number: 25, title: "A Cover Story", difficulty: "Thoughtful",
    solution: "The press refused to cover the story about the missing blanket.",
    explanation: "The press covers a story by reporting it. The missing blanket supplies a different sort of cover.",
  }),
  definePuzzle({
    id: "spring-cleaning", number: 26, title: "Spring Cleaning", difficulty: "Thoughtful",
    solution: "The spring in the mattress made spring cleaning a noisy affair.",
    explanation: "One spring is a coil inside the mattress; the other names a season. The mattress adds a squeak to the cleaning.",
  }),
  definePuzzle({
    id: "leak-investigation", number: 27, title: "A Leak Investigation", difficulty: "Thoughtful",
    solution: "The plumber couldn't find the source of the leak to the press.",
    explanation: "The leak to the press is escaped information. The plumber has brought the wrong kind of expertise.",
  }),
  definePuzzle({
    id: "an-objection", number: 28, title: "An Objection", difficulty: "Tricky",
    solution: "The lawyer objected to the object that had been entered as evidence.",
    explanation: "Objected is a protest; object is a physical thing. The passive clause pins down which object caused the objection.",
  }),
  definePuzzle({
    id: "rise-to-it", number: 29, title: "Rise to the Occasion", difficulty: "Thoughtful",
    solution: "The baker's new assistant couldn't rise to the occasion without yeast.",
    explanation: "Rising to the occasion means meeting a challenge. In this bakery, rising also needs yeast.",
  }),
  definePuzzle({
    id: "a-hard-time", number: 30, title: "A Hard Time", difficulty: "Thoughtful",
    solution: "The dog that swallowed the watch kept giving everyone a hard time.",
    explanation: "A hard time is trouble, but a swallowed watch makes time a physical problem for this dog.",
  }),
  definePuzzle({
    id: "heavy-metal", number: 31, title: "Heavy Metal", difficulty: "Tricky",
    solution: "The lead guitarist refused to play the instrument made of lead.",
    explanation: "Lead describes the principal guitarist, then names a heavy metal. The spelling stays put while the sound changes.",
  }),
  definePuzzle({
    id: "rock-and-roll", number: 32, title: "Rock and Roll", difficulty: "Thoughtful",
    solution: "The only rock the drummer couldn't roll was blocking the driveway.",
    explanation: "Rock and roll is normally a drummer's territory. This rock belongs in a quarry, not a band.",
  }),
  definePuzzle({
    id: "holding-water", number: 33, title: "Holding Water", difficulty: "Thoughtful",
    solution: "The suspect's story wouldn't hold water despite being full of holes.",
    explanation: "A story that doesn't hold water is unconvincing. Its holes are gaps in the account rather than places for water to escape.",
  }),
  definePuzzle({
    id: "a-suit-dismissed", number: 34, title: "A Suit Dismissed", difficulty: "Thoughtful",
    solution: "The judge threw out a suit that still had its price tag.",
    explanation: "A judge usually throws out a lawsuit. The price tag points instead to an unwanted outfit.",
  }),
  definePuzzle({
    id: "a-hard-case", number: 35, title: "A Hard Case", difficulty: "Tricky",
    solution: "The case the detective couldn't crack contained a very stubborn walnut.",
    explanation: "The case looks like an investigation until contained reveals a container. Cracking turns from solving a mystery to opening a shell.",
  }),
  definePuzzle({
    id: "a-sharp-student", number: 36, title: "A Sharp Student", difficulty: "Thoughtful",
    solution: "The sharpest student in the class cut himself on the compass.",
    explanation: "Sharpest describes intelligence, but the compass introduces an actual sharp point.",
  }),
  definePuzzle({
    id: "flat-and-sharp", number: 37, title: "Flat and Sharp", difficulty: "Tricky",
    solution: "The flat above the music shop belonged to a sharp operator.",
    explanation: "Music suggests lowered and raised notes. Here a flat is an apartment and a sharp operator is a shrewd person.",
  }),
  definePuzzle({
    id: "sour-notes", number: 38, title: "Sour Notes", difficulty: "Thoughtful",
    solution: "A string of bad notes finally brought the violinist to court.",
    explanation: "String suggests the instrument, but means a series here. Bad notes might be poor playing—or counterfeit banknotes.",
  }),
  definePuzzle({
    id: "lost-for-words", number: 39, title: "Lost for Words", difficulty: "Thoughtful",
    solution: "The man who swallowed a dictionary couldn't find the right words.",
    explanation: "Finding the right words is usually about expression. This man has made the search uncomfortably literal.",
  }),
  definePuzzle({
    id: "losing-temper", number: 40, title: "Losing His Temper", difficulty: "Tricky",
    solution: "The chef who lost his temper had to start the chocolate again.",
    explanation: "Temper is a mood, but tempering chocolate is also a precise heating and cooling process. Losing it spoils the batch.",
  }),
  definePuzzle({
    id: "a-spectacle", number: 41, title: "A Spectacle", difficulty: "Thoughtful",
    solution: "The optician who lost his glasses made a spectacle of himself.",
    explanation: "Spectacles help you see; making a spectacle of yourself attracts unwanted attention.",
  }),
  definePuzzle({
    id: "missing-the-point", number: 42, title: "Missing the Point", difficulty: "Thoughtful",
    solution: "The psychic who couldn't see the point blamed the blunt pencil.",
    explanation: "Seeing the point usually means understanding. A blunt pencil is missing a physical point, however good the psychic's vision.",
  }),
  definePuzzle({
    id: "a-growing-plot", number: 43, title: "A Growing Plot", difficulty: "Tricky",
    solution: "The gardener's plot to overthrow the king involved planting a few doubts.",
    explanation: "Plot is a conspiracy rather than a patch of earth. Planting doubts is a gardener's unusually political next step.",
  }),
  definePuzzle({
    id: "an-undercover-plant", number: 44, title: "An Undercover Plant", difficulty: "Tricky",
    solution: "The spy planted at the nursery was rooted out by lunchtime.",
    explanation: "A planted spy is placed undercover. Rooted out means discovered and removed, with the nursery supplying the botanical misdirection.",
  }),
  definePuzzle({
    id: "measuring-up", number: 45, title: "Measuring Up", difficulty: "Thoughtful",
    solution: "The company that made rulers couldn't measure up to its rivals.",
    explanation: "Rulers are measuring tools here. Measuring up is about meeting a standard, which this company cannot quite do.",
  }),
  definePuzzle({
    id: "a-right-hand-man", number: 46, title: "A Right-Hand Man", difficulty: "Tricky",
    solution: "The king's right hand man left before the court could hear his case.",
    explanation: "Right hand means trusted assistant; left means departed. Court moves from a royal household toward a legal hearing.",
  }),
  definePuzzle({
    id: "charged-with-battery", number: 47, title: "Charged with Battery", difficulty: "Tricky",
    solution: "The electrician charged with battery claimed he was only checking the terminals.",
    explanation: "Charged with battery sounds like a criminal accusation. The electrician offers an electrical explanation involving a battery's terminals.",
  }),
  definePuzzle({
    id: "another-branch", number: 48, title: "Another Branch", difficulty: "Tricky",
    solution: "The bank teller caught fishing for compliments was transferred to another branch.",
    explanation: "Caught fishing describes the teller; was transferred is the main verb. Fishing and branch briefly suggest a riverbank rather than a bank job.",
  }),
  definePuzzle({
    id: "drawing-the-line", number: 49, title: "Drawing the Line", difficulty: "Tricky",
    solution: "The officer who drew the short straw had to draw the suspect.",
    explanation: "Drawing the short straw means getting the unwanted task. Drawing the suspect calls for a pencil, not a lottery.",
  }),
  definePuzzle({
    id: "drawing-a-blank", number: 50, title: "Drawing a Blank", difficulty: "Thoughtful",
    solution: "The artist who drew a blank sold it as his latest work.",
    explanation: "Drawing a blank means failing to think of anything. An artist can put that blank on sale.",
  }),
];

// Separate from the daily cycle and development collection.
export const specialPuzzle: Puzzle = {
  ...definePuzzle({
    id: 'one-little-question',
    number: 0,
    title: 'One Little Question',
    difficulty: 'Gentle',
    solution: 'Will you be my girlfriend?',
    explanation: '',
  }),
  theme: 'pink',
};

export const puzzleById = new Map(puzzles.map((puzzle) => [puzzle.id, puzzle]));
