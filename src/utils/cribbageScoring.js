/**
 * Cribbage Scoring Engine
 * 
 * Complete implementation of all cribbage scoring rules for both
 * hand counting and pegging (play) phases.
 * 
 * Card Format:
 * {
 *   suit: 'hearts' | 'diamonds' | 'clubs' | 'spades',
 *   rank: 'A' | '2' | '3' | ... | 'K',
 *   value: number,  // For counting: A=1, 2-9=face, 10/J/Q/K=10
 *   id: string
 * }
 */

// Rank order for run detection
const RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Get numeric rank index for run detection
 */
function getRankIndex(rank) {
  return RANK_ORDER.indexOf(rank);
}

/**
 * Check if a set of cards forms a consecutive run
 */
function isConsecutiveRun(cards) {
  if (cards.length < 3) return false;
  
  const indices = cards.map(c => getRankIndex(c.rank)).sort((a, b) => a - b);
  
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) {
      return false;
    }
  }
  
  return true;
}

/**
 * Find all combinations of cards that sum to 15
 * Uses recursive backtracking to find all subsets
 * 
 * @param {Array} cards - Array of card objects
 * @returns {Array<{cards: Array, points: number}>} All fifteens found
 */
export function findAllFifteens(cards) {
  const fifteens = [];
  
  function findCombinations(index, current, sum) {
    if (sum === 15 && current.length > 0) {
      fifteens.push({
        cards: [...current],
        points: 2
      });
      return;
    }
    
    if (sum > 15 || index >= cards.length) {
      return;
    }
    
    // Include current card
    findCombinations(
      index + 1,
      [...current, cards[index]],
      sum + cards[index].value
    );
    
    // Exclude current card
    findCombinations(index + 1, current, sum);
  }
  
  findCombinations(0, [], 0);
  return fifteens;
}

/**
 * Find all pairs (and higher multiples) in a set of cards
 * Three of a kind = 3 pairs = 6 points
 * Four of a kind = 6 pairs = 12 points
 * 
 * @param {Array} cards - Array of card objects
 * @returns {Array<{cards: Array, points: number}>} All pairs found
 */
export function findPairs(cards) {
  const pairs = [];
  
  // Compare each card with every other card
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (cards[i].rank === cards[j].rank) {
        pairs.push({
          cards: [cards[i], cards[j]],
          points: 2
        });
      }
    }
  }
  
  return pairs;
}

/**
 * Find all runs (3+ consecutive ranks) in a set of cards
 * Handles duplicate ranks by finding all possible run combinations
 * 
 * Example: 5-5-6-7 creates TWO runs of 3 (5-6-7 and 5-6-7)
 * 
 * @param {Array} cards - Array of card objects
 * @returns {Array<{cards: Array, points: number}>} All runs found
 */
export function findRuns(cards) {
  if (cards.length < 3) return [];
  
  const runs = [];
  const maxLength = cards.length;
  
  // Try to find the longest runs first
  for (let length = maxLength; length >= 3; length--) {
    const combinations = getCombinations(cards, length);
    
    for (const combo of combinations) {
      if (isConsecutiveRun(combo)) {
        runs.push({
          cards: combo,
          points: length
        });
      }
    }
    
    // If we found runs of this length, don't look for shorter ones
    // (in standard cribbage, you count the longest runs only)
    if (runs.length > 0) {
      break;
    }
  }
  
  return runs;
}

/**
 * Get all combinations of specified length from an array
 */
function getCombinations(arr, length) {
  if (length === 1) return arr.map(item => [item]);
  if (length > arr.length) return [];
  
  const combinations = [];
  
  function combine(start, current) {
    if (current.length === length) {
      combinations.push([...current]);
      return;
    }
    
    for (let i = start; i < arr.length; i++) {
      combine(i + 1, [...current, arr[i]]);
    }
  }
  
  combine(0, []);
  return combinations;
}

/**
 * Check for flush (all cards same suit)
 * Hand: 4 cards same suit = 4 points, 5 with cut = 5 points
 * Crib: All 5 cards (including cut) must match = 5 points
 * 
 * @param {Array} hand - 4 cards in hand
 * @param {Object} cutCard - The cut card
 * @param {boolean} isCrib - Whether this is the crib
 * @returns {Object|null} {points, cards} or null
 */
export function checkFlush(hand, cutCard, isCrib) {
  if (hand.length !== 4) return null;
  
  const handSuit = hand[0].suit;
  const allHandSameSuit = hand.every(card => card.suit === handSuit);
  
  if (!allHandSameSuit) return null;
  
  // For crib, all 5 cards must match
  if (isCrib) {
    if (cutCard.suit === handSuit) {
      return {
        points: 5,
        cards: [...hand, cutCard]
      };
    }
    return null;
  }
  
  // For hand, 4 matching = 4 points, 5 matching = 5 points
  if (cutCard.suit === handSuit) {
    return {
      points: 5,
      cards: [...hand, cutCard]
    };
  }
  
  return {
    points: 4,
    cards: hand
  };
}

/**
 * Check for nobs (Jack in hand matching cut card suit)
 * 
 * @param {Array} hand - 4 cards in hand
 * @param {Object} cutCard - The cut card
 * @returns {Object|null} {points: 1, card} or null
 */
export function checkNobs(hand, cutCard) {
  const jack = hand.find(card => 
    card.rank === 'J' && card.suit === cutCard.suit
  );
  
  if (jack) {
    return {
      points: 1,
      card: jack
    };
  }
  
  return null;
}

/**
 * Score a complete hand (used during counting phase)
 * Finds all scoring combinations: fifteens, pairs, runs, flush, nobs
 * 
 * @param {Array} hand - 4 cards in hand
 * @param {Object} cutCard - The cut card
 * @param {boolean} isCrib - Whether this is the crib
 * @returns {Object} {total: number, breakdown: Array<{type, points, cards}>}
 */
export function scoreHand(hand, cutCard, isCrib = false) {
  const allCards = [...hand, cutCard];
  const breakdown = [];
  let total = 0;
  
  // Find all fifteens
  const fifteens = findAllFifteens(allCards);
  fifteens.forEach(fifteen => {
    breakdown.push({
      type: 'fifteen',
      points: fifteen.points,
      cards: fifteen.cards
    });
    total += fifteen.points;
  });
  
  // Find all pairs
  const pairs = findPairs(allCards);
  pairs.forEach(pair => {
    breakdown.push({
      type: 'pair',
      points: pair.points,
      cards: pair.cards
    });
    total += pair.points;
  });
  
  // Find runs
  const runs = findRuns(allCards);
  runs.forEach(run => {
    breakdown.push({
      type: 'run',
      points: run.points,
      cards: run.cards
    });
    total += run.points;
  });
  
  // Check for flush
  const flush = checkFlush(hand, cutCard, isCrib);
  if (flush) {
    breakdown.push({
      type: 'flush',
      points: flush.points,
      cards: flush.cards
    });
    total += flush.points;
  }
  
  // Check for nobs (only in hand, not in crib)
  if (!isCrib) {
    const nobs = checkNobs(hand, cutCard);
    if (nobs) {
      breakdown.push({
        type: 'nobs',
        points: nobs.points,
        cards: [nobs.card]
      });
      total += nobs.points;
    }
  } else {
    // Nobs CAN be scored in the crib
    const nobs = checkNobs(hand, cutCard);
    if (nobs) {
      breakdown.push({
        type: 'nobs',
        points: nobs.points,
        cards: [nobs.card]
      });
      total += nobs.points;
    }
  }
  
  return { total, breakdown };
}

/**
 * Check if the count equals 15 during pegging
 * 
 * @param {number} count - Current count
 * @returns {Object|null} {points: 2, reason} or null
 */
export function checkPeggingFifteen(count) {
  if (count === 15) {
    return {
      points: 2,
      reason: 'Fifteen for 2'
    };
  }
  return null;
}

/**
 * Check if the count equals 31 during pegging
 * 
 * @param {number} count - Current count
 * @returns {Object|null} {points: 2, reason} or null
 */
export function checkPeggingThirtyOne(count) {
  if (count === 31) {
    return {
      points: 2,
      reason: 'Thirty-one for 2'
    };
  }
  return null;
}

/**
 * Check for pairs during pegging (last 2, 3, or 4 cards same rank)
 * Pair = 2 points
 * Three of a kind = 6 points
 * Four of a kind = 12 points
 * 
 * @param {Array} playedCards - Cards played in order
 * @returns {Object|null} {points, reason} or null
 */
export function checkPeggingPair(playedCards) {
  if (playedCards.length < 2) return null;
  
  const lastCard = playedCards[playedCards.length - 1];
  const prevCard = playedCards[playedCards.length - 2];
  
  if (lastCard.rank !== prevCard.rank) return null;
  
  // Check how many cards in a row have the same rank
  let count = 2;
  for (let i = playedCards.length - 3; i >= 0; i--) {
    if (playedCards[i].rank === lastCard.rank) {
      count++;
    } else {
      break;
    }
  }
  
  if (count === 2) {
    return { points: 2, reason: 'Pair for 2' };
  } else if (count === 3) {
    return { points: 6, reason: 'Three of a kind for 6' };
  } else if (count === 4) {
    return { points: 12, reason: 'Four of a kind for 12' };
  }
  
  return null;
}

/**
 * Check for runs during pegging
 * Must be 3+ consecutive ranks in any order
 * Example: 7-5-6 is a run of 3
 * 
 * @param {Array} playedCards - Cards played in order
 * @returns {Object|null} {points, reason} or null
 */
export function checkPeggingRun(playedCards) {
  if (playedCards.length < 3) return null;
  
  // Try runs from longest possible down to 3
  const maxLength = Math.min(7, playedCards.length); // Max run is 7 (7-8-9-10-J-Q-K)
  
  for (let length = maxLength; length >= 3; length--) {
    const recentCards = playedCards.slice(-length);
    
    if (isConsecutiveRun(recentCards)) {
      return {
        points: length,
        reason: `Run of ${length} for ${length}`
      };
    }
  }
  
  return null;
}

/**
 * Score a single card play during pegging
 * Checks for: fifteens, thirty-one, pairs, runs
 * Does NOT check for go or last card (those are game state dependent)
 * 
 * @param {Array} playedCards - All cards played in current sequence (before count reset)
 * @param {Object} newCard - The card just played
 * @returns {Object|null} {points, reason} or null if no points scored
 */
export function scorePeggingPlay(playedCards, newCard) {
  const allCards = [...playedCards, newCard];
  const currentCount = allCards.reduce((sum, card) => sum + card.value, 0);
  
  // Check for 31 (takes precedence)
  const thirtyOne = checkPeggingThirtyOne(currentCount);
  if (thirtyOne) return thirtyOne;
  
  // Check for 15
  const fifteen = checkPeggingFifteen(currentCount);
  if (fifteen) {
    // Also check for other scoring (pairs, runs) with 15
    const pair = checkPeggingPair(allCards);
    const run = checkPeggingRun(allCards);
    
    if (pair) {
      return {
        points: fifteen.points + pair.points,
        reason: `${fifteen.reason} and ${pair.reason}`
      };
    }
    if (run) {
      return {
        points: fifteen.points + run.points,
        reason: `${fifteen.reason} and ${run.reason}`
      };
    }
    
    return fifteen;
  }
  
  // Check for pairs (pair, three of a kind, four of a kind)
  const pair = checkPeggingPair(allCards);
  if (pair) {
    // Also check for runs with pairs
    const run = checkPeggingRun(allCards);
    if (run) {
      return {
        points: pair.points + run.points,
        reason: `${pair.reason} and ${run.reason}`
      };
    }
    return pair;
  }
  
  // Check for runs
  const run = checkPeggingRun(allCards);
  if (run) return run;
  
  // No points scored
  return null;
}

/**
 * Utility function to create a test card
 * For testing purposes
 */
export function createCard(rank, suit) {
  const values = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 10, 'Q': 10, 'K': 10
  };
  
  return {
    rank,
    suit,
    value: values[rank],
    id: `${rank}-${suit}`
  };
}

// Export all functions
export default {
  scoreHand,
  scorePeggingPlay,
  findAllFifteens,
  findPairs,
  findRuns,
  checkFlush,
  checkNobs,
  checkPeggingPair,
  checkPeggingRun,
  checkPeggingFifteen,
  checkPeggingThirtyOne,
  createCard
};
