// Guardrail for a whole class of bug, found via a user report on Puppy
// Fetch: "I got a match and it didn't save it." The root cause was data,
// not logic — DOG_PAIRS had four breeds sharing the same emoji, while the
// match check compares `breed`. A hidden card only shows a bone, so once
// flipped the emoji is the only cue a player has to tell entries apart —
// two cards that looked identical could still be ruled "not a match" and
// flip back, which reads exactly like the game failing to save a real
// match.
//
// Every "flip two cards and match by a key" game in this app must keep its
// visual cue (emoji) in 1:1 correspondence with its match key, so a visual
// match is always a real match. This file checks that invariant for all of
// them in one place, so a future content edit can't reintroduce it.
import { DOG_PAIRS } from '../data/puppyFetchData';
import { CARD_SETS } from '../data/memoryCards';
import { CAT_PAIRS } from '../data/catMatchData';
import { CARD_PAIRS } from '../data/flipFlopData';
import { COCKTAILS } from '../data/martiniMatchData';

function expectUniqueEmoji(pairs) {
  const emojis = pairs.map((p) => p.emoji);
  const dupes = emojis.filter((e, i) => emojis.indexOf(e) !== i);
  expect(dupes).toEqual([]); // any entries here are duplicated emoji
}

test('Puppy Fetch: every breed has a unique emoji', () => {
  expectUniqueEmoji(DOG_PAIRS);
});

test('Cat Match: every cat has a unique emoji', () => {
  expectUniqueEmoji(CAT_PAIRS);
});

test('Flip Flop: every fruit has a unique emoji', () => {
  expectUniqueEmoji(CARD_PAIRS);
});

test('Martini Match: every cocktail has a unique emoji', () => {
  expectUniqueEmoji(COCKTAILS);
});

test('Memory: every set\'s cards are unique, and the match key is the emoji itself', () => {
  // MemoryBoard's buildDeck() sets `pairKey: emoji` directly (see
  // memoryCards.js), so it's structurally immune to this bug class as long
  // as that stays true and each set's card list has no accidental repeats.
  for (const set of CARD_SETS) {
    const dupes = set.cards.filter((c, i) => set.cards.indexOf(c) !== i);
    expect(dupes).toEqual([]);
  }
});
