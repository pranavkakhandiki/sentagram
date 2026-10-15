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
export function acceptedSentence(
  puzzle: Puzzle,
  selectedIds: readonly string[],
): AcceptedSentence | null {
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
  return (
    candidates.find(
      (candidate) =>
        candidate.words.length === chosen.length &&
        chosen.every((token, index) => {
          if (!token) return false;
          const expected = candidate.words[index];
          return token.preserveCase
            ? token.text === expected
            : token.text.toLocaleLowerCase('en') === expected.toLocaleLowerCase('en');
        }),
    ) ?? null
  );
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
