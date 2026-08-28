/**
 * Cribbage Deck Utilities
 * Handles deck creation, shuffling, dealing, and card management
 */

// Cribbage uses a standard 52-card deck
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

/**
 * Get the numeric value of a card for counting (A=1, face cards=10)
 */
export function getCardValue(rank) {
  if (rank === 'A') return 1
  if (['J', 'Q', 'K'].includes(rank)) return 10
  return parseInt(rank, 10)
}

/**
 * Get the point value of a card for pegging (A=1, all others=pip value, face=10)
 */
export function getCardPeggingValue(rank) {
  return getCardValue(rank)
}

/**
 * Create a new 52-card deck
 * Returns array of card objects: { suit, rank, value, id }
 */
export function createDeck() {
  const deck = []
  let id = 0
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        value: getCardValue(rank),
        id: id++,
      })
    }
  }
  
  return deck
}

/**
 * Shuffle a deck using Fisher-Yates algorithm
 */
export function shuffleDeck(deck) {
  const shuffled = [...deck]
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  return shuffled
}

/**
 * Deal hands to players
 * Returns { playerHand, aiHand, remainingDeck }
 */
export function dealHands(deck, cardsPerHand = 6) {
  const shuffled = shuffleDeck(deck)
  
  const playerHand = shuffled.slice(0, cardsPerHand)
  const aiHand = shuffled.slice(cardsPerHand, cardsPerHand * 2)
  const remainingDeck = shuffled.slice(cardsPerHand * 2)
  
  return {
    playerHand: sortHand(playerHand),
    aiHand: sortHand(aiHand),
    remainingDeck,
  }
}

/**
 * Sort a hand by suit and rank for easier viewing
 * Order: suits (hearts, diamonds, clubs, spades), then by rank within suit
 */
export function sortHand(hand) {
  const suitOrder = { hearts: 0, diamonds: 1, clubs: 2, spades: 3 }
  const rankOrder = {
    A: 1,
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    J: 11,
    Q: 12,
    K: 13,
  }
  
  return [...hand].sort((a, b) => {
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit]
    }
    return rankOrder[a.rank] - rankOrder[b.rank]
  })
}

/**
 * Cut the deck - takes the top card from remaining deck
 */
export function cutDeck(deck) {
  if (deck.length === 0) {
    throw new Error('Cannot cut empty deck')
  }
  
  return {
    cutCard: deck[0],
    remainingDeck: deck.slice(1),
  }
}

/**
 * Format card for display (e.g., "A♥", "10♠")
 */
export function formatCard(card) {
  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  }
  
  return `${card.rank}${suitSymbols[card.suit]}`
}

/**
 * Check if two cards are equal
 */
export function cardsEqual(card1, card2) {
  if (!card1 || !card2) return false
  return card1.id === card2.id
}

/**
 * Remove a card from a hand
 */
export function removeCardFromHand(hand, cardToRemove) {
  return hand.filter((card) => !cardsEqual(card, cardToRemove))
}

/**
 * Get a specific card from the deck by suit and rank
 */
export function getCard(deck, suit, rank) {
  return deck.find((card) => card.suit === suit && card.rank === rank)
}
