/**
 * Cribbage AI Strategy Engine
 * 
 * Implements AI decision-making for all phases of cribbage:
 * - Discard selection (choosing 2 cards to put in crib from 6-card hand)
 * - Pegging play selection (choosing which card to play during pegging)
 * 
 * Supports three difficulty levels: easy, medium, hard
 */

import { getCardRank, createDeck } from './cribbageDeck.js';
import {
  scoreHand,
  checkPeggingPair,
  checkPeggingRun,
  checkPeggingFifteen,
  checkPeggingThirtyOne
} from './cribbageScoring.js';

// ============================================================================
// MAIN AI FUNCTIONS
// ============================================================================

/**
 * Choose which 2 cards to discard to the crib from a 6-card hand
 * 
 * @param {Array} hand - 6 cards in hand
 * @param {boolean} isDealer - Whether AI is the dealer (gets the crib)
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {Array} - [Card, Card] to discard to crib
 */
export function chooseDiscards(hand, isDealer, difficulty = 'medium') {
  if (hand.length !== 6) {
    throw new Error('Hand must contain exactly 6 cards for discard selection');
  }

  // Easy: Random valid discard
  if (difficulty === 'easy') {
    return chooseRandomDiscards(hand);
  }

  // Medium: Evaluate all options, pick best expected value
  if (difficulty === 'medium') {
    return chooseMediumDiscards(hand, isDealer);
  }

  // Hard: Advanced evaluation with card tracking
  if (difficulty === 'hard') {
    return chooseHardDiscards(hand, isDealer);
  }

  // Default to medium
  return chooseMediumDiscards(hand, isDealer);
}

/**
 * Choose which card to play during the pegging phase
 * 
 * @param {Array} hand - Cards remaining in AI's hand
 * @param {Array} playedCards - Cards played so far in current sequence
 * @param {number} currentCount - Current count (sum of played cards)
 * @param {boolean} isDealer - Whether AI is the dealer
 * @param {string} difficulty - 'easy', 'medium', or 'hard'
 * @returns {Object|null} - Card to play, or null if can't play
 */
export function choosePeggingPlay(hand, playedCards, currentCount, isDealer, difficulty = 'medium') {
  // Find all valid plays (cards that don't exceed 31)
  const validPlays = hand.filter(card => currentCount + card.value <= 31);

  if (validPlays.length === 0) {
    return null; // Can't play any card
  }

  // Easy: Random valid play
  if (difficulty === 'easy') {
    return validPlays[Math.floor(Math.random() * validPlays.length)];
  }

  // Medium: Evaluate each play, pick best
  if (difficulty === 'medium') {
    return chooseMediumPeggingPlay(validPlays, playedCards, currentCount, isDealer);
  }

  // Hard: Advanced pegging with look-ahead
  if (difficulty === 'hard') {
    return chooseHardPeggingPlay(validPlays, playedCards, currentCount, isDealer);
  }

  // Default to medium
  return chooseMediumPeggingPlay(validPlays, playedCards, currentCount, isDealer);
}

// ============================================================================
// DISCARD SELECTION - EASY DIFFICULTY
// ============================================================================

/**
 * Choose random discards (easy difficulty)
 */
function chooseRandomDiscards(hand) {
  const shuffled = [...hand].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

// ============================================================================
// DISCARD SELECTION - MEDIUM DIFFICULTY
// ============================================================================

/**
 * Choose discards using basic evaluation (medium difficulty)
 * Evaluates all 15 possible 4-card keeps and picks the best
 */
function chooseMediumDiscards(hand, isDealer) {
  const allCombinations = getAllKeepCombinations(hand);
  let bestScore = -Infinity;
  let bestDiscards = null;

  for (const { keep, discard } of allCombinations) {
    // Estimate the value of keeping these 4 cards
    const keepValue = estimateHandScore(keep);

    // Estimate the value of the crib with these 2 discards
    const cribValue = estimateCribValue(discard, isDealer);

    // Total value: hand value + crib value (positive if dealer, negative if not)
    const totalValue = keepValue + cribValue;

    if (totalValue > bestScore) {
      bestScore = totalValue;
      bestDiscards = discard;
    }
  }

  return bestDiscards;
}

// ============================================================================
// DISCARD SELECTION - HARD DIFFICULTY
// ============================================================================

/**
 * Choose discards with advanced evaluation (hard difficulty)
 * Considers cut card probabilities and more sophisticated crib analysis
 */
function chooseHardDiscards(hand, isDealer) {
  const allCombinations = getAllKeepCombinations(hand);
  let bestScore = -Infinity;
  let bestDiscards = null;

  // Sample multiple cut cards for more accurate estimation
  const sampleSize = 10;

  for (const { keep, discard } of allCombinations) {
    let totalKeepValue = 0;

    // Simulate with multiple possible cut cards
    for (let i = 0; i < sampleSize; i++) {
      const cutCard = getRandomCutCard(hand);
      const { total } = scoreHand(keep, cutCard, false);
      totalKeepValue += total;
    }

    const avgKeepValue = totalKeepValue / sampleSize;

    // Advanced crib estimation
    const cribValue = estimateAdvancedCribValue(discard, isDealer);

    const totalValue = avgKeepValue + cribValue;

    if (totalValue > bestScore) {
      bestScore = totalValue;
      bestDiscards = discard;
    }
  }

  return bestDiscards;
}

// ============================================================================
// PEGGING SELECTION - MEDIUM DIFFICULTY
// ============================================================================

/**
 * Choose pegging play using basic evaluation (medium difficulty)
 */
function chooseMediumPeggingPlay(validPlays, playedCards, currentCount, isDealer) {
  let bestScore = -Infinity;
  let bestCard = validPlays[0];

  for (const card of validPlays) {
    const score = evaluatePeggingPlay(card, {
      playedCards,
      count: currentCount,
      isDealer
    });

    if (score > bestScore) {
      bestScore = score;
      bestCard = card;
    }
  }

  return bestCard;
}

// ============================================================================
// PEGGING SELECTION - HARD DIFFICULTY
// ============================================================================

/**
 * Choose pegging play with advanced evaluation (hard difficulty)
 * Includes look-ahead and opponent hand deduction
 */
function chooseHardPeggingPlay(validPlays, playedCards, currentCount, isDealer) {
  let bestScore = -Infinity;
  let bestCard = validPlays[0];

  for (const card of validPlays) {
    // Base evaluation
    let score = evaluatePeggingPlay(card, {
      playedCards,
      count: currentCount,
      isDealer
    });

    // Add look-ahead penalty/bonus
    const newCount = currentCount + card.value;
    
    // Bonus for getting close to 31 (opponent may not be able to play)
    if (newCount >= 25 && newCount < 31) {
      score += (newCount - 25) * 0.5;
    }

    // Penalty for leaving count at dangerous values
    if (newCount === 5 || newCount === 21) {
      score -= 2; // Opponent can easily make 15 or 31
    }

    if (score > bestScore) {
      bestScore = score;
      bestCard = card;
    }
  }

  return bestCard;
}

// ============================================================================
// EVALUATION FUNCTIONS
// ============================================================================

/**
 * Evaluate the scoring potential of a card play during pegging
 * 
 * @param {Object} card - Card to play
 * @param {Object} situation - {playedCards, count, isDealer}
 * @returns {number} - Score value of playing this card
 */
export function evaluatePeggingPlay(card, situation) {
  const { playedCards, count } = situation;
  const newCount = count + card.value;
  const newPlayedCards = [...playedCards, card];

  let score = 0;

  // Check for immediate scoring
  const fifteen = checkPeggingFifteen(newCount);
  if (fifteen) {
    score += fifteen.points;
  }

  const thirtyOne = checkPeggingThirtyOne(newCount);
  if (thirtyOne) {
    score += thirtyOne.points;
  }

  const pair = checkPeggingPair(newPlayedCards);
  if (pair) {
    score += pair.points;
  }

  const run = checkPeggingRun(newPlayedCards);
  if (run) {
    score += run.points;
  }

  // Defensive considerations
  if (wouldGiveOpponentPoints(card, playedCards, count)) {
    score -= 3; // Penalty for setting up opponent
  }

  // Strategic value: prefer middle cards early, high cards late
  const cardRank = getCardRank(card);
  if (playedCards.length < 2) {
    // Early: prefer middle cards (5-9)
    if (cardRank >= 5 && cardRank <= 9) {
      score += 0.5;
    }
  } else if (playedCards.length >= 4) {
    // Late: prefer playing high cards to avoid getting stuck
    if (card.value === 10) {
      score += 0.5;
    }
  }

  return score;
}

/**
 * Check if playing this card would enable opponent to score easily
 * 
 * @param {Object} card - Card to play
 * @param {Array} playedCards - Cards already played
 * @param {number} count - Current count
 * @returns {boolean} - True if it would give opponent easy scoring
 */
export function wouldGiveOpponentPoints(card, playedCards, count) {
  const newCount = count + card.value;

  // Would leave count at 5 (opponent can make 15 with 10)
  if (newCount === 5) return true;

  // Would leave count at 10 (opponent can make 15 with 5)
  if (newCount === 10) return true;

  // Would leave count at 21 (opponent can make 31 with 10)
  if (newCount === 21) return true;

  // Would create a pair opportunity (playing same rank as last card)
  if (playedCards.length > 0) {
    const lastCard = playedCards[playedCards.length - 1];
    if (card.rank === lastCard.rank) {
      return true; // Opponent can triple it
    }
  }

  // Would extend a run opportunity
  if (playedCards.length >= 2) {
    const recent = playedCards.slice(-2);
    const ranks = [...recent.map(c => getCardRank(c)), getCardRank(card)].sort((a, b) => a - b);
    
    // Check if these form 2/3 of a consecutive sequence
    if (ranks.length === 3) {
      const isConsecutive = ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;
      if (isConsecutive) return true;
    }
  }

  return false;
}

/**
 * Estimate the expected scoring value of a 4-card hand
 * Averages the score over a sample of possible cut cards
 * 
 * @param {Array} cards - 4 cards to evaluate
 * @returns {number} - Average expected score
 */
export function estimateHandScore(cards) {
  if (cards.length !== 4) return 0;

  let totalScore = 0;
  const sampleSize = 8; // Sample 8 random cut cards

  for (let i = 0; i < sampleSize; i++) {
    const cutCard = getRandomCutCard(cards);
    const { total } = scoreHand(cards, cutCard, false);
    totalScore += total;
  }

  return totalScore / sampleSize;
}

/**
 * Estimate the expected value of 2 cards in the crib
 * Positive if dealer (you get it), negative if not (opponent gets it)
 * 
 * @param {Array} cards - 2 cards being discarded to crib
 * @param {boolean} isDealer - Whether AI is the dealer
 * @returns {number} - Expected crib value (positive/negative)
 */
function estimateCribValue(cards, isDealer) {
  if (cards.length !== 2) return 0;

  // Basic crib value estimation
  let value = 0;

  // Check for pairs (good for crib)
  if (cards[0].rank === cards[1].rank) {
    value += 4; // Pair is worth at least 2, likely more in crib
  }

  // Check for fifteens
  if (cards[0].value + cards[1].value === 15) {
    value += 3; // Fifteen is worth 2, plus potential for more
  }

  // Check for close ranks (run potential)
  const rank1 = getCardRank(cards[0]);
  const rank2 = getCardRank(cards[1]);
  const rankDiff = Math.abs(rank1 - rank2);
  
  if (rankDiff === 1 || rankDiff === 2) {
    value += 2; // Good run potential
  }

  // Favor 5s in crib (make 15 with 10s)
  if (cards[0].rank === '5' || cards[1].rank === '5') {
    value += 1.5;
  }

  // Favor face cards and 10s (make 15 with 5s)
  const faceCount = cards.filter(c => c.value === 10).length;
  value += faceCount * 1;

  // Avoid low cards in crib (less scoring potential)
  const lowCount = cards.filter(c => c.value <= 3).length;
  value -= lowCount * 0.5;

  // If not dealer, negate the value (it's bad to give opponent a good crib)
  return isDealer ? value : -value * 1.5; // Weight against helping opponent more
}

/**
 * Advanced crib value estimation (used in hard difficulty)
 */
function estimateAdvancedCribValue(cards, isDealer) {
  if (cards.length !== 2) return 0;

  let totalValue = 0;
  const sampleSize = 5;

  // Simulate with multiple possible opponent discards
  for (let i = 0; i < sampleSize; i++) {
    const opponentDiscard1 = getRandomCutCard(cards);
    const opponentDiscard2 = getRandomCutCard([...cards, opponentDiscard1]);
    const cutCard = getRandomCutCard([...cards, opponentDiscard1, opponentDiscard2]);

    const cribHand = [...cards, opponentDiscard1, opponentDiscard2];
    const { total } = scoreHand(cribHand, cutCard, true);
    totalValue += total;
  }

  const avgValue = totalValue / sampleSize;

  // If not dealer, negate and weight more heavily
  return isDealer ? avgValue : -avgValue * 1.3;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all possible 4-card keeps and 2-card discards from a 6-card hand
 * Returns all 15 combinations (6 choose 4 = 15)
 * 
 * @param {Array} hand - 6 cards
 * @returns {Array} - Array of {keep: [4 cards], discard: [2 cards]}
 */
export function getAllKeepCombinations(hand) {
  if (hand.length !== 6) return [];

  const combinations = [];

  // Generate all combinations of 4 cards from 6
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      // i and j are the indices to DISCARD
      const discard = [hand[i], hand[j]];
      const keep = hand.filter((_, idx) => idx !== i && idx !== j);
      
      combinations.push({ keep, discard });
    }
  }

  return combinations;
}

/**
 * Get a random cut card that's not in the given cards
 * Simulates drawing from the remaining deck
 * 
 * @param {Array} excludeCards - Cards to exclude from selection
 * @returns {Object} - Random card
 */
function getRandomCutCard(excludeCards) {
  const fullDeck = createDeck();
  const excludeIds = new Set(excludeCards.map(c => c.id));
  
  const availableCards = fullDeck.filter(c => !excludeIds.has(c.id));
  
  if (availableCards.length === 0) {
    // Fallback: return any card from full deck
    return fullDeck[Math.floor(Math.random() * fullDeck.length)];
  }

  return availableCards[Math.floor(Math.random() * availableCards.length)];
}

/**
 * Get all cards in the deck that match certain criteria
 * Used for probability calculations
 * 
 * @param {function} predicate - Function to test cards
 * @returns {Array} - Matching cards
 */
export function getMatchingCards(predicate) {
  const deck = createDeck();
  return deck.filter(predicate);
}

/**
 * Calculate the probability of drawing a card that makes 15
 * Used for advanced strategy
 * 
 * @param {number} currentValue - Current value in hand/play
 * @param {Array} excludeCards - Cards already accounted for
 * @returns {number} - Probability (0-1)
 */
export function calculateFifteenProbability(currentValue, excludeCards) {
  const needed = 15 - currentValue;
  if (needed <= 0 || needed > 10) return 0;

  const fullDeck = createDeck();
  const excludeIds = new Set(excludeCards.map(c => c.id));
  const availableCards = fullDeck.filter(c => !excludeIds.has(c.id));

  const matchingCards = availableCards.filter(c => c.value === needed);

  return matchingCards.length / availableCards.length;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  chooseDiscards,
  choosePeggingPlay,
  evaluatePeggingPlay,
  estimateHandScore,
  wouldGiveOpponentPoints,
  getAllKeepCombinations,
  calculateFifteenProbability,
  getMatchingCards
};
