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

/**
 * Stable daily slots; revisions get new IDs so old tile orders cannot become new guesses.
 * Editorial bar: grammar must do the work, not a familiar idiom or a movable punchline.
 * Prefer one natural reading; accept defensible alternate orders with their own punctuation.
 */
export const puzzles: Puzzle[] = [
  definePuzzle({
    id: "cotton-and-clothing",
    number: 1,
    title: "Made of This",
    difficulty: "Tricky",
    solution: "The cotton clothing is made of needs plenty of sunshine.",
    explanation: "Cotton is the subject and needs is the main verb. Clothing is made of describes the cotton; cotton clothing is the tempting false start.",
  }),
  definePuzzle({
    id: "a-horse-raced",
    number: 2,
    title: "Past the Barn",
    difficulty: "Tricky",
    solution: "The horse raced past the barn broke its leg.",
    explanation: "Raced past the barn describes a horse that someone raced. Broke is the main verb, not raced.",
    alternatives: [
      "Raced past the barn, the horse broke its leg.",
    ],
  }),
  definePuzzle({
    id: "a-pressed-rose",
    number: 3,
    title: "Between the Pages",
    difficulty: "Tricky",
    solution: "The rose Rose forgot she'd pressed had stained the dictionary.",
    properNouns: [2],
    explanation: "Rose is a person; the rose is a flower. The flower she forgot pressing has left a mark in the book.",
  }),
  definePuzzle({
    id: "paid-to-keep-watch",
    number: 4,
    title: "Night Shift",
    difficulty: "Tricky",
    solution: "The man she'd paid to keep watch slept through the alarm.",
    explanation: "She had paid the man to keep watch, but slept is the main verb. The person hired to stay alert has missed the alarm.",
  }),
  definePuzzle({
    id: "a-dog-walked",
    number: 5,
    title: "Outside the Shop",
    difficulty: "Tricky",
    solution: "The dog he'd walked past the butcher's shop belonged to a vegetarian.",
    explanation: "He had walked the dog past the shop. Belonged supplies the main verb, while the dog and its owner have rather different interests in the shop.",
  }),
  definePuzzle({
    id: "evidence-for-the-defence",
    number: 6,
    title: "Exhibit A",
    difficulty: "Tricky",
    solution: "The evidence the detective thought would convict him proved his innocence.",
    explanation: "The evidence is doing two jobs: it is what the detective thought would convict him, and what actually proved his innocence.",
  }),
  definePuzzle({
    id: "the-mayors-missing-present",
    number: 7,
    title: "An Empty Ceremony",
    difficulty: "Tricky",
    solution: "The present the present mayor was asked to present had gone missing.",
    explanation: "A gift, the current mayor, and the act of formally giving: three meanings of present. Had gone missing is the main action, with the mayor inside the description of the gift.",
  }),
  definePuzzle({
    id: "reported-missing",
    number: 8,
    title: "Still Here",
    difficulty: "Tricky",
    solution: "The man reported missing claimed he had never gone anywhere.",
    explanation: "Reported missing describes the man, rather than something he reported. His claim is that there was no disappearance at all.",
    alternatives: [
      "Reported missing, the man claimed he had never gone anywhere.",
    ],
  }),
  definePuzzle({
    id: "an-impossible-view",
    number: 9,
    title: "An Impossible View",
    difficulty: "Tricky",
    solution: "What she said she'd seen couldn't have been visible from the window.",
    explanation: "What she said she had seen is the entire subject. Could not have been visible supplies the main verb, casting doubt on her account.",
    alternatives: [
      "From the window, what she said she'd seen couldn't have been visible.",
    ],
  }),
  definePuzzle({
    id: "wear-and-wears",
    number: 10,
    title: "Fashion Fatigue",
    difficulty: "Thoughtful",
    solution: "The clothes the model wears wear out her patience.",
    explanation: "Wears belongs to the model, but wear belongs to the clothes. The clothes are wearing out patience, rather than fabric.",
  }),
  definePuzzle({
    id: "the-old-crew",
    number: 11,
    title: "Experienced Hands",
    difficulty: "Tricky",
    solution: "The old man the boats nobody else knows how to handle.",
    explanation: "The old means older people, and man means crew. Nobody else knows how to handle describes the boats; there is no old man sailing alone.",
  }),
  definePuzzle({
    id: "filed-under-fiction",
    number: 12,
    title: "A Strange Classification",
    difficulty: "Tricky",
    solution: "Why the dictionary was filed under fiction remained a mystery.",
    explanation: "The entire question beginning with why is the subject of remained. The mystery is the classification, not a fictional dictionary.",
  }),
  definePuzzle({
    id: "a-date-carved-in-stone",
    number: 13,
    title: "A Lasting Impression",
    difficulty: "Thoughtful",
    solution: "The date the prisoner scratched into the wall outlasted his sentence.",
    explanation: "The date is a mark on the wall, and the sentence is a prison term. The inscription lasts longer than the imprisonment.",
  }),
  definePuzzle({
    id: "the-patient-kept-waiting",
    number: 14,
    title: "An Unpaid Appointment",
    difficulty: "Tricky",
    solution: "The patient she'd kept waiting refused to pay for the appointment.",
    explanation: "She had kept the patient waiting. Refused is the main verb, and patient is the person receiving care rather than a description of their mood.",
  }),
  definePuzzle({
    id: "an-admission-from-the-tailor",
    number: 15,
    title: "An Alteration",
    difficulty: "Tricky",
    solution: "The suit the tailor admitted shrinking hadn't belonged to him.",
    explanation: "The suit is the subject of had not belonged. The tailor admitted shrinking it, which makes the ownership rather important.",
  }),
  definePuzzle({
    id: "the-sleeping-guard",
    number: 16,
    title: "Eyes Open",
    difficulty: "Tricky",
    solution: "The guard found sleeping denied ever closing his eyes.",
    explanation: "Found sleeping describes how the guard was discovered. Denied is what he did next, despite the evidence.",
    alternatives: [
      "Found sleeping, the guard denied ever closing his eyes.",
    ],
  }),
  definePuzzle({
    id: "a-key-inside-the-safe",
    number: 17,
    title: "An Inside Job",
    difficulty: "Thoughtful",
    solution: "How the key ended up inside the locked safe puzzled everyone.",
    explanation: "How the key ended up there is the whole subject of puzzled. Locked belongs to the safe, which makes the location of the key a problem.",
  }),
  definePuzzle({
    id: "a-record-nobody-expected",
    number: 18,
    title: "An Unexpected Hit",
    difficulty: "Thoughtful",
    solution: "The record nobody expected to sell broke every sales record.",
    explanation: "The first record is a release nobody expected to sell. The last is a best-ever sales figure, which that release beats.",
  }),
  definePuzzle({
    id: "a-stamp-inside-the-letter",
    number: 19,
    title: "Ready to Post",
    difficulty: "Tricky",
    solution: "The letter he was about to post contained the stamp he'd lost.",
    explanation: "Was about to post describes the letter; had lost describes the stamp. Contained is the main verb, and the missing stamp is inside the very thing that needs it.",
  }),
  definePuzzle({
    id: "an-unexpected-part",
    number: 20,
    title: "An Unfamiliar Role",
    difficulty: "Tricky",
    solution: "The actress told she'd won the part couldn't remember auditioning.",
    explanation: "Told she had won describes the actress receiving news. Could not remember is the main action; she is not telling someone else about winning.",
    alternatives: [
      "Told she'd won the part, the actress couldn't remember auditioning.",
    ],
  }),
  definePuzzle({
    id: "the-right-answer-for-whom",
    number: 21,
    title: "The Right Answer",
    difficulty: "Tricky",
    solution: "Whether the answer was right depended on who had asked the question.",
    explanation: "Whether the answer was right is the subject of depended. Who had asked the question completes on: correctness here depends on the questioner.",
  }),
  definePuzzle({
    id: "a-borrowed-saw",
    number: 22,
    title: "Whose Tool?",
    difficulty: "Tricky",
    solution: "The saw the carpenter forgot he'd borrowed belonged to his apprentice.",
    explanation: "Saw is a tool here. The carpenter forgot he had borrowed it, and belonged supplies the main verb and the real owner.",
  }),
  definePuzzle({
    id: "a-parrots-costly-vocabulary",
    number: 23,
    title: "Words Picked Up",
    difficulty: "Thoughtful",
    solution: "What the parrot learned to say cost its owner his job.",
    explanation: "What the parrot learned to say is the whole subject of cost. Its refers to the bird; his refers to its owner, whose job the bird's vocabulary has cost him.",
  }),
  definePuzzle({
    id: "the-conductor-on-the-stand",
    number: 24,
    title: "Called to the Stand",
    difficulty: "Tricky",
    solution: "The conductor asked to take the stand brought a baton.",
    explanation: "Asked to take the stand describes someone summoned to testify. A conductor has apparently prepared for a different sort of stand.",
    alternatives: [
      "Asked to take the stand, the conductor brought a baton.",
    ],
  }),
  definePuzzle({
    id: "a-press-that-wouldnt-print",
    number: 25,
    title: "Out of Circulation",
    difficulty: "Tricky",
    solution: "The press he bought to print money wouldn't print anything.",
    explanation: "Press is a machine, not the news media. Print money describes its intended use; would not print anything describes its actual performance.",
  }),
  definePuzzle({
    id: "a-spring-wound",
    number: 26,
    title: "Built to Last",
    difficulty: "Tricky",
    solution: "The spring the watchmaker wound was meant to last a lifetime.",
    explanation: "Wound is the past tense of wind, not an injury. Spring is the mechanism being wound, and last means endure.",
  }),
  definePuzzle({
    id: "the-leak-that-cost-an-election",
    number: 27,
    title: "A Damaging Leak",
    difficulty: "Tricky",
    solution: "The leak the plumber denied causing cost him the election.",
    explanation: "Denied causing describes the leak, which is the subject of cost. A plumber is an awkward person to be accused of a leak, especially during an election.",
  }),
  definePuzzle({
    id: "an-incriminating-object",
    number: 28,
    title: "An Object of Dispute",
    difficulty: "Tricky",
    solution: "The object the lawyer objected to incriminated his client.",
    explanation: "Object is a thing; objected is a protest. To finishes the description of the object, and incriminated supplies the main verb and a reason for the objection.",
  }),
  definePuzzle({
    id: "the-complex-houses",
    number: 29,
    title: "Room to Learn",
    difficulty: "Tricky",
    solution: "The complex houses students who can't afford a deposit.",
    explanation: "Complex is a housing development, not an adjective. Houses is the verb: the complex provides accommodation for students.",
  }),
  definePuzzle({
    id: "a-coach-under-the-bridge",
    number: 30,
    title: "A Tight Fit",
    difficulty: "Thoughtful",
    solution: "The coach the team hired couldn't fit under the bridge.",
    explanation: "Coach is a vehicle rather than a trainer. The team hired it, but the bridge is too low for it.",
    alternatives: [
      "Under the bridge, the coach the team hired couldn't fit.",
    ],
  }),
  definePuzzle({
    id: "lead-in-the-curtain",
    number: 31,
    title: "A Weighty Production",
    difficulty: "Tricky",
    solution: "The lead used to weight the curtain cracked the stage.",
    explanation: "Lead is the metal, and weight is a verb. Used to weight describes the lead rather than introducing a past habit.",
    alternatives: [
      "Used to weight the curtain, the lead cracked the stage.",
    ],
  }),
  definePuzzle({
    id: "a-prize-rock",
    number: 32,
    title: "Between Art and a Door",
    difficulty: "Tricky",
    solution: "The rock holding the door open had won the sculpture prize.",
    explanation: "Holding the door open describes the rock. Had won is the main action: the doorstop is an award-winning sculpture.",
    alternatives: [
      "Holding the door open, the rock had won the sculpture prize.",
    ],
  }),
  definePuzzle({
    id: "a-story-that-couldnt-happen",
    number: 33,
    title: "An Impossible Account",
    difficulty: "Tricky",
    solution: "The story the suspect stuck to couldn't have happened.",
    explanation: "Stuck to belongs to the description of the story. Could not have happened is the verdict on that account.",
  }),
  definePuzzle({
    id: "which-twin-told-the-truth",
    number: 34,
    title: "A Pair of Accounts",
    difficulty: "Tricky",
    solution: "Nobody could tell which of the twins had told the truth.",
    explanation: "Tell means determine; told means stated. Which of the twins had told the truth is the question nobody could settle.",
    alternatives: [
      "Which of the twins had told the truth, nobody could tell.",
    ],
  }),
  definePuzzle({
    id: "a-case-that-wont-stay-shut",
    number: 35,
    title: "An Open Case",
    difficulty: "Tricky",
    solution: "The case the detective closed refused to stay shut.",
    explanation: "Closed first suggests a finished investigation. Refused to stay shut instead points to a troublesome container.",
  }),
  definePuzzle({
    id: "the-magicians-box",
    number: 36,
    title: "An Escape Problem",
    difficulty: "Tricky",
    solution: "The box the magician put himself in couldn't be opened.",
    explanation: "The box is the subject of could not be opened. The magician put himself in it, rather than opening it for somebody else.",
  }),
  definePuzzle({
    id: "a-flat-with-a-piano",
    number: 37,
    title: "Moving In",
    difficulty: "Thoughtful",
    solution: "The flat the pianist rented came with a piano nobody could move.",
    explanation: "Flat is an apartment, not a musical note. Came with is the main verb, and nobody could move describes the piano.",
  }),
  definePuzzle({
    id: "awarded-the-lead",
    number: 38,
    title: "An Unreadable Part",
    difficulty: "Tricky",
    solution: "The actor they'd awarded the lead couldn't read the sheet music.",
    explanation: "They had awarded the actor the main role. Could not read is the main action, and sheet music reveals the problem with their choice.",
  }),
  definePuzzle({
    id: "the-translators-omissions",
    number: 39,
    title: "Left Unsaid",
    difficulty: "Tricky",
    solution: "The words the translator left out couldn't have been ruder.",
    explanation: "Left out finishes the description of the words. Could not have been ruder describes those omitted words, not the translator.",
  }),
  definePuzzle({
    id: "melting-the-evidence",
    number: 40,
    title: "Melting Evidence",
    difficulty: "Tricky",
    solution: "Melting the chocolate he'd stolen ruined the chef's defence.",
    explanation: "Melting is the subject, not a description attached to chocolate. Had stolen describes the chocolate, and ruined is the main verb.",
  }),
  definePuzzle({
    id: "calling-the-waiter",
    number: 41,
    title: "On First-Name Terms",
    difficulty: "Tricky",
    solution: "Calling the waiter by name didn't make the soup arrive any sooner.",
    explanation: "Calling the waiter by name is the subject. Make is followed by the soup arrive, not arrives: knowing the waiter's name has not sped up lunch.",
  }),
  definePuzzle({
    id: "what-she-meant-by-left",
    number: 42,
    title: "A Different Left",
    difficulty: "Tricky",
    solution: "What she meant by left wasn't a direction at all.",
    explanation: "Left can mean departed or remaining. What she meant by left is the whole subject; the word need not point anywhere.",
    alternatives: [
      "What she meant by left wasn't at all a direction.",
    ],
  }),
  definePuzzle({
    id: "plants-off-the-menu",
    number: 43,
    title: "Off the Menu",
    difficulty: "Tricky",
    solution: "The plants the man was eating were meant for decoration.",
    explanation: "Were agrees with plants, not man. The man was eating them, but they were intended as decorations.",
  }),
  definePuzzle({
    id: "waiting-out-the-guarantee",
    number: 44,
    title: "A Long Wait",
    difficulty: "Thoughtful",
    solution: "The time spent waiting for a refund outlasted the guarantee.",
    explanation: "Spent waiting for a refund describes the time. Outlasted is the main verb: the wait has exceeded the guarantee period.",
    alternatives: [
      "Spent waiting for a refund, the time outlasted the guarantee.",
    ],
  }),
  definePuzzle({
    id: "the-kings-ruler",
    number: 45,
    title: "Drawing a Boundary",
    difficulty: "Tricky",
    solution: "The ruler the king used to draw the border had been stolen.",
    explanation: "Ruler is a measuring tool. Used to draw describes what the king did with it, rather than introducing something he did habitually.",
  }),
  definePuzzle({
    id: "the-voiceless-man",
    number: 46,
    title: "A Quiet Interview",
    difficulty: "Thoughtful",
    solution: "The man the police wanted to question had lost his voice.",
    explanation: "The man is the subject of had lost. The police wanted to question him, but his voice is missing at an inconvenient moment.",
  }),
  definePuzzle({
    id: "an-uninsured-short",
    number: 47,
    title: "A Short Explanation",
    difficulty: "Tricky",
    solution: "The short the electrician caused wasn't covered by his insurance.",
    explanation: "Short is a short circuit, not an adjective. The electrician caused it, and the insurance does not cover the damage.",
  }),
  definePuzzle({
    id: "a-self-made-missing-poster",
    number: 48,
    title: "A Prepared Disappearance",
    difficulty: "Tricky",
    solution: "The man the poster described as missing had printed it himself.",
    explanation: "Described as missing belongs to the description of the man. Had printed is the main action, and himself identifies the person behind the poster.",
  }),
  definePuzzle({
    id: "an-unsigned-portrait",
    number: 49,
    title: "An Unwilling Signature",
    difficulty: "Thoughtful",
    solution: "The portrait the artist refused to sign looked exactly like her.",
    explanation: "The portrait is the subject of looked. The artist refused to sign it, despite the resemblance.",
  }),
  definePuzzle({
    id: "an-erased-prizewinner",
    number: 50,
    title: "A Vanishing Winner",
    difficulty: "Tricky",
    solution: "The drawing the artist rubbed out had won first prize.",
    explanation: "Rubbed out describes the drawing; had won is the main verb. The erased work was already a prizewinner.",
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
