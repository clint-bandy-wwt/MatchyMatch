// src/data/canastaData.js

/**
 * Card ranks and their point values
 */
export const CARD_VALUES = {
  JOKER: 50,
  A: 20,
  '2': 20,
  K: 10,
  Q: 10,
  J: 10,
  '10': 10,
  '9': 10,
  '8': 10,
  '7': 5,
  '6': 5,
  '5': 5,
  '4': 5,
  '3': 5,
}

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades']
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

/**
 * Scoring constants
 */
export const SCORING = {
  NATURAL_CANASTA: 500,
  MIXED_CANASTA: 300,
  RED_3: 100,
  ALL_RED_3S: 800,
  GOING_OUT: 100,
  CONCEALED_GOING_OUT: 200,
  CANASTA_SIZE: 7,
}

/**
 * Minimum meld requirements based on score
 */
export const MINIMUM_MELD_REQUIREMENTS = [
  { minScore: 3000, minPoints: 120 },
  { minScore: 1500, minPoints: 90 },
  { minScore: 0, minPoints: 50 },
  { minScore: -Infinity, minPoints: 15 },
]

/**
 * Get minimum meld requirement for a given score
 */
export function getMinimumMeldRequirement(score) {
  for (const req of MINIMUM_MELD_REQUIREMENTS) {
    if (score >= req.minScore) {
      return req.minPoints
    }
  }
  return 15
}

/**
 * Create a full Canasta deck (2 standard decks + 4 jokers)
 */
export function createDeck() {
  const cards = []
  let id = 0

  // Add 4 jokers
  for (let i = 0; i < 4; i++) {
    cards.push({
      id: `joker-${id++}`,
      rank: 'JOKER',
      suit: 'joker',
      value: CARD_VALUES.JOKER,
      isWild: true,
      isRed3: false,
    })
  }

  // Add 2 standard decks
  for (let deckNum = 0; deckNum < 2; deckNum++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const isRed3 = rank === '3' && (suit === 'hearts' || suit === 'diamonds')
        cards.push({
          id: `${suit}-${rank}-${deckNum}-${id++}`,
          rank,
          suit,
          value: CARD_VALUES[rank],
          isWild: rank === '2',
          isRed3,
        })
      }
    }
  }

  return cards
}

/**
 * Shuffle an array using Fisher-Yates algorithm
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
 * Check if a card is a black 3
 */
export function isBlack3(card) {
  return card.rank === '3' && (card.suit === 'clubs' || card.suit === 'spades')
}

/**
 * Calculate the point value of a set of cards
 */
export function calculateCardPoints(cards) {
  return cards.reduce((sum, card) => sum + card.value, 0)
}

/**
 * Check if a meld is valid
 * - Must have at least 3 cards
 * - Must have at least 2 natural cards
 * - Cannot have more than 3 wild cards
 * - All natural cards must be same rank
 */
export function isValidMeld(cards) {
  if (cards.length < 3) return false

  const naturalCards = cards.filter((c) => !c.isWild)
  const wildCards = cards.filter((c) => c.isWild)

  // Must have at least 2 natural cards
  if (naturalCards.length < 2) return false

  // Cannot have more than 3 wild cards
  if (wildCards.length > 3) return false

  // All natural cards must be same rank
  const firstRank = naturalCards[0].rank
  if (!naturalCards.every((c) => c.rank === firstRank)) return false

  // Cannot meld 3s
  if (firstRank === '3') return false

  return true
}

/**
 * Check if a meld is a canasta (7+ cards)
 */
export function isCanasta(cards) {
  return cards.length >= SCORING.CANASTA_SIZE
}

/**
 * Check if a canasta is natural (no wild cards)
 */
export function isNaturalCanasta(cards) {
  return isCanasta(cards) && cards.every((c) => !c.isWild)
}

/**
 * Get the rank of a meld (rank of natural cards)
 */
export function getMeldRank(cards) {
  const naturalCard = cards.find((c) => !c.isWild)
  return naturalCard ? naturalCard.rank : null
}

/**
 * Check if cards can be added to an existing meld
 */
export function canAddToMeld(meld, cardsToAdd) {
  const meldRank = getMeldRank(meld.cards)
  const combinedCards = [...meld.cards, ...cardsToAdd]

  // Check if combined meld would be valid
  if (!isValidMeld(combinedCards)) return false

  // Check if new cards match the meld rank
  const naturalCardsToAdd = cardsToAdd.filter((c) => !c.isWild)
  if (naturalCardsToAdd.length > 0) {
    if (!naturalCardsToAdd.every((c) => c.rank === meldRank)) return false
  }

  return true
}

/**
 * Check if player can pick up the discard pile
 */
export function canPickUpDiscardPile(topCard, playerHand, playerMelds, isFrozen) {
  // Cannot pick up if pile is empty
  if (!topCard) return false

  // Cannot pick up wild cards or black 3s
  if (topCard.isWild || isBlack3(topCard)) return false

  // If frozen, must have 2 natural cards matching top card
  if (isFrozen) {
    const matchingCards = playerHand.filter(
      (c) => !c.isWild && c.rank === topCard.rank
    )
    return matchingCards.length >= 2
  }

  // If not frozen, can pick up with 2 matching cards OR 1 matching card + existing meld
  const matchingCards = playerHand.filter(
    (c) => !c.isWild && c.rank === topCard.rank
  )

  if (matchingCards.length >= 2) return true

  // Check if player has existing meld of that rank
  const existingMeld = playerMelds.find((m) => getMeldRank(m.cards) === topCard.rank)
  return matchingCards.length >= 1 && existingMeld !== undefined
}

/**
 * Check if player can go out
 * - Must have at least one canasta
 * - Must be able to meld or discard all remaining cards
 */
export function canGoOut(playerHand, playerMelds) {
  // Must have at least one canasta
  const hasCanasta = playerMelds.some((m) => isCanasta(m.cards))
  if (!hasCanasta) return false

  // Must have 1 or fewer cards in hand (the last card to discard)
  return playerHand.length <= 1
}

/**
 * Calculate final score for a player
 */
export function calculateScore(melds, red3Count, cardsInHand, wentOut, concealed) {
  let score = 0

  // Add meld points
  for (const meld of melds) {
    score += calculateCardPoints(meld.cards)

    // Add canasta bonuses
    if (isCanasta(meld.cards)) {
      score += isNaturalCanasta(meld.cards)
        ? SCORING.NATURAL_CANASTA
        : SCORING.MIXED_CANASTA
    }
  }

  // Add red 3 bonuses
  if (red3Count === 4) {
    score += SCORING.ALL_RED_3S
  } else {
    score += red3Count * SCORING.RED_3
  }

  // Subtract red 3s if no melds
  if (melds.length === 0 && red3Count > 0) {
    score -= red3Count * SCORING.RED_3
  }

  // Add going out bonus
  if (wentOut) {
    score += concealed ? SCORING.CONCEALED_GOING_OUT : SCORING.GOING_OUT
  }

  // Subtract cards left in hand
  score -= calculateCardPoints(cardsInHand)

  return score
}
