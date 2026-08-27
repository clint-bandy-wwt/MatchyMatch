// src/data/pokerCards.js
/**
 * Playing card data and utilities for poker-style games
 */

export const SUITS = {
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
  SPADES: '♠',
};

export const RANKS = {
  TWO: { value: 2, display: '2' },
  THREE: { value: 3, display: '3' },
  FOUR: { value: 4, display: '4' },
  FIVE: { value: 5, display: '5' },
  SIX: { value: 6, display: '6' },
  SEVEN: { value: 7, display: '7' },
  EIGHT: { value: 8, display: '8' },
  NINE: { value: 9, display: '9' },
  TEN: { value: 10, display: '10' },
  JACK: { value: 11, display: 'J' },
  QUEEN: { value: 12, display: 'Q' },
  KING: { value: 13, display: 'K' },
  ACE: { value: 14, display: 'A' }, // Aces high
};

/**
 * Create a standard 52-card deck
 * @returns {Array} Array of card objects
 */
export function createDeck() {
  const deck = [];
  const suits = Object.values(SUITS);
  const ranks = Object.values(RANKS);

  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      deck.push({
        suit,
        rank: rank.display,
        value: rank.value,
        id: `${rank.display}${suit}`,
      });
    });
  });

  return deck;
}

/**
 * Shuffle a deck of cards using Fisher-Yates algorithm
 * @param {Array} deck - The deck to shuffle
 * @returns {Array} Shuffled deck
 */
export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Sort a hand of cards by value (aces high)
 * @param {Array} hand - Array of card objects
 * @returns {Array} Sorted hand
 */
export function sortHand(hand) {
  return [...hand].sort((a, b) => b.value - a.value);
}

/**
 * Deal cards from a deck
 * @param {Array} deck - The deck to deal from
 * @param {number} count - Number of cards to deal
 * @returns {Object} Object with dealtCards and remainingDeck
 */
export function dealCards(deck, count) {
  const dealtCards = deck.slice(0, count);
  const remainingDeck = deck.slice(count);
  return { dealtCards, remainingDeck };
}

/**
 * Evaluate a poker hand (simplified)
 * @param {Array} hand - Array of 5 card objects
 * @returns {Object} Hand evaluation with rank and name
 */
export function evaluateHand(hand) {
  if (hand.length !== 5) return { rank: 0, name: 'Invalid Hand' };

  const sorted = sortHand(hand);
  const values = sorted.map((c) => c.value);
  const suits = sorted.map((c) => c.suit);

  // Check for flush
  const isFlush = suits.every((s) => s === suits[0]);

  // Check for straight
  const isStraight =
    values[0] - values[4] === 4 &&
    new Set(values).size === 5;

  // Count value frequencies
  const valueCounts = {};
  values.forEach((v) => {
    valueCounts[v] = (valueCounts[v] || 0) + 1;
  });
  const counts = Object.values(valueCounts).sort((a, b) => b - a);

  // Evaluate hand
  if (isStraight && isFlush) {
    if (values[0] === 14) return { rank: 10, name: 'Royal Flush' };
    return { rank: 9, name: 'Straight Flush' };
  }
  if (counts[0] === 4) return { rank: 8, name: 'Four of a Kind' };
  if (counts[0] === 3 && counts[1] === 2) return { rank: 7, name: 'Full House' };
  if (isFlush) return { rank: 6, name: 'Flush' };
  if (isStraight) return { rank: 5, name: 'Straight' };
  if (counts[0] === 3) return { rank: 4, name: 'Three of a Kind' };
  if (counts[0] === 2 && counts[1] === 2) return { rank: 3, name: 'Two Pair' };
  if (counts[0] === 2) return { rank: 2, name: 'One Pair' };
  return { rank: 1, name: 'High Card' };
}
