/**
 * Cribbage Deck Utilities
 * Card data structures and deck management for Cribbage game
 */

import { shuffleArray } from './gameHelpers.js';

// Suit definitions
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

// Rank definitions
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Suit symbols for display
const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

// Suit names for readable strings
const SUIT_NAMES = {
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
  spades: 'Spades'
};

// Rank names for readable strings
const RANK_NAMES = {
  A: 'Ace',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  J: 'Jack',
  Q: 'Queen',
  K: 'King'
};

/**
 * Get the Cribbage counting value for a card
 * Aces = 1, Face cards (J, Q, K) = 10, Number cards = face value
 * @param {Object} card - Card object with rank property
 * @returns {number} - Counting value (1-10)
 */
export function getCardValue(card) {
  const rank = card.rank;
  
  // Aces are worth 1
  if (rank === 'A') {
    return 1;
  }
  
  // Face cards (J, Q, K) are worth 10
  if (rank === 'J' || rank === 'Q' || rank === 'K') {
    return 10;
  }
  
  // Number cards are worth their face value
  return parseInt(rank);
}

/**
 * Get the numeric rank of a card for comparison and sorting
 * A=1, 2=2, ..., 10=10, J=11, Q=12, K=13
 * @param {Object} card - Card object with rank property
 * @returns {number} - Numeric rank (1-13)
 */
export function getCardRank(card) {
  const rank = card.rank;
  
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  
  return parseInt(rank);
}

/**
 * Create a complete standard 52-card deck
 * @returns {Array} - Array of 52 card objects
 */
export function createDeck() {
  const deck = [];
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const card = {
        suit,
        rank,
        value: getCardValue({ rank }),
        id: `${rank}${suit.charAt(0).toUpperCase()}`  // e.g., 'AH' for Ace of Hearts
      };
      deck.push(card);
    }
  }
  
  return deck;
}

/**
 * Shuffle a deck using Fisher-Yates algorithm
 * Returns a new shuffled array without modifying the original
 * @param {Array} deck - Array of card objects to shuffle
 * @returns {Array} - New shuffled array
 */
export function shuffleDeck(deck) {
  return shuffleArray(deck);
}

/**
 * Deal hands from a deck
 * @param {Array} deck - Array of card objects
 * @param {number} handSize - Number of cards per hand
 * @returns {Object} - Object with playerHand, aiHand, and remainingDeck
 */
export function dealHands(deck, handSize) {
  // Create a copy to avoid modifying the original deck
  const deckCopy = [...deck];
  
  // Deal player hand
  const playerHand = deckCopy.splice(0, handSize);
  
  // Deal AI hand
  const aiHand = deckCopy.splice(0, handSize);
  
  // Remaining cards stay in the deck
  const remainingDeck = deckCopy;
  
  return {
    playerHand,
    aiHand,
    remainingDeck
  };
}

/**
 * Sort a hand of cards by rank (lowest to highest)
 * @param {Array} cards - Array of card objects
 * @returns {Array} - New sorted array
 */
export function sortHand(cards) {
  return [...cards].sort((a, b) => {
    return getCardRank(a) - getCardRank(b);
  });
}

/**
 * Convert a card object to a readable string
 * @param {Object} card - Card object with rank and suit
 * @returns {string} - Readable string like "Ace of Hearts"
 */
export function cardToString(card) {
  const rankName = RANK_NAMES[card.rank];
  const suitName = SUIT_NAMES[card.suit];
  return `${rankName} of ${suitName}`;
}

/**
 * Get the suit symbol for a card
 * @param {Object} card - Card object with suit property
 * @returns {string} - Suit symbol (♥, ♦, ♣, ♠)
 */
export function getSuitSymbol(card) {
  return SUIT_SYMBOLS[card.suit];
}

/**
 * Check if a card is a face card (J, Q, K)
 * @param {Object} card - Card object with rank property
 * @returns {boolean} - True if face card
 */
export function isFaceCard(card) {
  return card.rank === 'J' || card.rank === 'Q' || card.rank === 'K';
}

/**
 * Check if a card is an Ace
 * @param {Object} card - Card object with rank property
 * @returns {boolean} - True if Ace
 */
export function isAce(card) {
  return card.rank === 'A';
}
