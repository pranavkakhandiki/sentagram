# Sentagram

A simple word-ordering game. Tap words into a sentence; drag one placed word onto another to swap them.

React, TypeScript, Vite, and hand-written CSS. Eight curated puzzles. No accounts, backend, runtime APIs, timers, daily schedule, or analytics. Fonts are bundled locally, so playing does not depend on a font service.

## Run locally

Use Node.js **22.12+ (22 LTS)** or **24 LTS**.

```sh
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://127.0.0.1:5173`. For testing on a phone on the same network, run `npm run dev -- --host 0.0.0.0` and open your computer's network address on that phone.

```sh
npm test          # puzzle integrity, state, persistence, sharing, and React interactions
npm run build    # strict TypeScript check and production build
npm run preview  # serve the production build locally
```

For reproducible installs after cloning, use `npm ci` with the included lockfile.

## Edit or add puzzles

Edit **`src/data/puzzles.ts`**. Each `definePuzzle` entry contains the stable ID, number, internal title, difficulty, canonical sentence, hint, explanation, optional proper-noun positions, and optional accepted alternatives.

```ts
definePuzzle({
  id: 'a-new-perspective',
  number: 9,
  title: 'A New Perspective',
  difficulty: 'Thoughtful', // Gentle | Thoughtful | Tricky
  solution: 'Your carefully authored sentence goes here.',
  hint: 'A helpful nudge that leaves room for discovery.',
  explanation: 'Explain the wordplay after the puzzle is complete.',
  // properNouns: [0, 4], // zero-based word positions, including names/months
  // alternatives: ['Another authored ordering using exactly the same words.'],
}),
```

Use unique IDs and puzzle numbers. Keep existing IDs stable: local progress is keyed by puzzle ID, and individual tile IDs include the puzzle ID and original word position. If you substantially rewrite an existing puzzle, give it a new ID so old tile arrangements are not interpreted as the new content.

The helper derives distinct tile objects and a seeded Fisher–Yates word-bank shuffle. Duplicate labels remain separate objects; their IDs never depend on the shuffled order. Run `npm test` after editing: the suite checks every puzzle and authored alternative, including its exact tile inventory.

Authored capitalization stays in the data. The bank lowercases ordinary words so a sentence-initial capital cannot reveal the first tile. Set `properNouns` for meaningful capitals such as Rose, May, March, and June. The construction area capitalizes its first word automatically. Identically labeled ordinary tiles are interchangeable for validation.

`parseSentence` separates commas, outer quotation marks/parentheses, and terminal punctuation from words, while retaining internal apostrophes and hyphens. `SentenceFormat` stores punctuation by position, including separate formatting for each alternative; punctuation never becomes a selectable tile. Final punctuation appears once every word is placed. The checker compares only the canonical sentence and manually authored alternatives. It does not judge arbitrary English grammar.

## Interaction

Tap a bank tile to append it; tap any placed tile to return it. Drag a placed tile onto another to exchange exactly those two positions, including across wrapped lines. A highlighted target previews the swap. Releasing outside a tile, pressing Escape, or canceling the pointer leaves the arrangement unchanged. Swaps are undoable and saved just like taps. Pointer Events support mouse, pen, and touch without adding a drag library; scroll normally outside the placed tiles.

The play screen displays only the puzzle number, difficulty, tiles, and controls. Puzzle titles remain in the data as editorial metadata. The visual identity uses bold sans-serif lettering, flat yellow and lavender word tiles, pill-shaped controls, and a white canvas. Proper-noun capitals stay visible even in the bolder tile treatment.

## Source layout

| Location                       | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `src/data/puzzles.ts`          | Curated content and sentence parsing                     |
| `src/game/types.ts`            | Puzzle, sentence formatting, and progress models         |
| `src/game/shuffle.ts`          | Deterministic shuffling                                  |
| `src/game/validation.ts`       | Accepted sentences and display capitalization            |
| `src/game/state.ts`            | Pure game reducer and undo history                       |
| `src/game/storage.ts`          | Versioned, validated persistence repository              |
| `src/game/share.ts`            | Spoiler-free results and native/clipboard sharing        |
| `src/hooks/useSentenceSwap.ts` | Mouse, touch, and pen drag gestures                      |
| `src/hooks/useGame.ts`         | React state and persistence connection                   |
| `src/components/`              | Board, tiles, controls, dialogs, collection, and results |
| `src/styles.css`               | Visual tokens, responsive styles, and reduced motion     |
| `src/test/`                    | Vitest and Testing Library checks                        |

`useGame` accepts a `ProgressRepository`, giving future synchronized progress a boundary without coupling it to UI components. Daily selection, accounts, streaks, and analytics are intentionally outside this version.

## Progress and replay

Progress lives in this browser's localStorage under `sentagram.progress.v1`. Existing progress from `sensemaker.progress.v1` is automatically restored after the rename; the original record is retained. It includes the active puzzle, each arrangement, undo history, solved/revealed status, checks, incorrect checks, and hint usage. Unknown versions and corrupt records recover safely. If storage is blocked, the game continues and shows a small saving notice. Nothing is sent to a server.

The puzzle menu switches puzzles without losing your place. Solved and revealed puzzles offer **Replay**, which resets that puzzle's arrangement, status, attempts, and hint usage. Revealed puzzles are marked separately and do not count toward solved totals. Once the collection is complete, the next action returns to the puzzle menu.

Result sharing tries the native Web Share API, then the clipboard. If neither is available, a selectable result provides a manual fallback. Canceling a native share sheet leaves the clipboard alone. Results include no solution words.

The interface uses semantic buttons, visible focus styles, native modal dialogs with focus containment and Escape handling, polite screen-reader announcements, touch targets, safe-area padding, and reduced-motion support. Keyboard users can Tab between tiles and use Enter/Space to place or return them. Alt + Left/Right (or Up/Down) swaps the focused word with a neighbor while keeping focus on that same tile.

## Publish with GitHub Pages

The included `.github/workflows/deploy.yml` tests, builds, and deploys the site when you push to `main`. It can also be run manually from the repository's Actions tab.

1. Open your GitHub repository's **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Commit and push the deployment files to `main`.
4. Open **Actions → Deploy Sentagram to GitHub Pages** and wait for a successful run. Its deployment link opens the live game.

For `pranavkakhandiki/sentagram`, the project URL is `https://pranavkakhandiki.github.io/sentagram/`.

The workflow sets `GITHUB_PAGES_BASE` from the repository name, so JavaScript, styles, fonts, and the favicon resolve under the project URL. Local development continues to use `/`. GitHub supplies the deployment token; no personal access token or repository secret is needed for this workflow.

To reproduce the Pages build locally:

```sh
GITHUB_PAGES_BASE=/sentagram/ npm run build
GITHUB_PAGES_BASE=/sentagram/ npm run preview
```

Open the preview URL with `/sentagram/` appended. For a root-level Pages site or a custom domain, set `GITHUB_PAGES_BASE` to `/` in the workflow.

## Other static hosts

To use another static hosting service:

- **Vercel:** import the repository, choose the Vite preset, use `npm run build`, and publish `dist`.
- **Netlify:** use `npm run build` as the build command and `dist` as the publish directory.
- **Other static hosts:** upload the contents of `dist` after building.

There are no server requirements. This is a single page, so no routing rewrite is needed. Root-level hosts use the default build with no environment variables. For hosting under a subdirectory, set `GITHUB_PAGES_BASE` to that path when building; the favicon follows the configured base automatically. Native sharing and clipboard features generally require HTTPS or localhost.

DM Sans is included through Fontsource under the SIL Open Font License. Its license is retained in `public/fonts/` and included in the production build.
