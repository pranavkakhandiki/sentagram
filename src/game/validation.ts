import type { AcceptedSentence, Puzzle, SentenceFormat, WordToken } from './types';

export function bankLabel(token: WordToken): string {
  return token.preserveCase ? token.text : token.text.toLocaleLowerCase('en');
}

export function sentenceLabel(token: WordToken, position: number): string {
  const word = bankLabel(token);
  return position === 0 ? word.charAt(0).toLocaleUpperCase('en') + word.slice(1) : word;
}

/** IDs establish tile integrity; visible words establish sentence correctness.
 * This accepts interchangeable duplicates without erasing meaningful capitals.
 */
export function evaluateGuess(
  puzzle: Puzzle,
  selectedIds: readonly string[],
): { correct: boolean; oneSwapAway: boolean; positions: boolean[]; sentence: AcceptedSentence } | null {
  if (
    selectedIds.length !== puzzle.solutionTokens.length ||
    new Set(selectedIds).size !== selectedIds.length
  )
    return null;
  const tokens = new Map(puzzle.solutionTokens.map((token) => [token.id, token]));
  const chosen = selectedIds.map((id) => tokens.get(id));
  if (chosen.some((token) => !token)) return null;
  const candidates = [
    { words: puzzle.solutionTokens.map((token) => token.text), format: puzzle.format },
    ...(puzzle.alternativeSolutions ?? []),
  ];
  function matches(token: WordToken | undefined, expected: string) {
    return Boolean(token && (token.preserveCase ? token.text === expected
      : token.text.toLocaleLowerCase('en') === expected.toLocaleLowerCase('en')));
  }
  const ranked = candidates.map((sentence) => {
    const positions = chosen.map((token, index) => matches(token, sentence.words[index]));
    const wrong = positions.flatMap((right, index) => right ? [] : [index]);
    const oneSwapAway = wrong.length === 2 &&
      matches(chosen[wrong[0]], sentence.words[wrong[1]]) &&
      matches(chosen[wrong[1]], sentence.words[wrong[0]]);
    return { sentence, positions, correct: wrong.length === 0, oneSwapAway, score: chosen.length - wrong.length };
  }).sort((a, b) => b.score - a.score);
  return ranked[0];
}

export function acceptedSentence(puzzle: Puzzle, selectedIds: readonly string[]): AcceptedSentence | null {
  const result = evaluateGuess(puzzle, selectedIds);
  return result?.correct ? result.sentence : null;
}

export function formatSentence(tokens: readonly WordToken[], format: SentenceFormat): string {
  return (
    tokens
      .map(
        (token, index) =>
          `${format.before?.[index] ?? ''}${sentenceLabel(token, index)}${format.after?.[index] ?? ''}`,
      )
      .join(' ') + format.ending
  );
}
