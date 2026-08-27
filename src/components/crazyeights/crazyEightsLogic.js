// ── Crazy Eights Game Logic ────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

/**
 * Build a standard 52-card deck
 * @returns {Array<{suit: string, rank: string}>}
 */
export function buildDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
    }
  }
  return deck
}

/**
 * Shuffle a deck using Fisher-Yates algorithm
 * @param {Array<{suit: string, rank: string}>} deck
 * @returns {Array<{suit: string, rank: string}>}
 */
export function shuffle(deck) {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Deal cards to players
 * @param {Array<{suit: string, rank: string}>} deck
 * @param {number} numPlayers
 * @param {number} cardsPerPlayer
 * @returns {{hands: Array<Array<{suit: string, rank: string}>>, drawPile: Array<{suit: string, rank: string}>}}
 */
export function deal(deck, numPlayers, cardsPerPlayer) {
  const hands = Array.from({ length: numPlayers }, () => [])
  let drawPile = [...deck]
  
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < numPlayers; p++) {
      if (drawPile.length > 0) {
        hands[p].push(drawPile.shift())
      }
    }
  }
  
  return { hands, drawPile }
}

/**
 * Check if a card can be played on the discard pile
 * @param {{suit: string, rank: string}} card
 * @param {{suit: string, rank: string}} topCard
 * @param {string} activeSuit - The current suit (may differ if an 8 was played)
 * @returns {boolean}
 */
export function canPlay(card, topCard, activeSuit) {
  // Eights are always wild
  if (card.rank === '8') {
    return true
  }
  
  // Must match rank or active suit
  return card.rank === topCard.rank || card.suit === activeSuit
}

/**
 * AI chooses a card to play
 * @param {Array<{suit: string, rank: string}>} hand
 * @param {{suit: string, rank: string}} topCard
 * @param {string} activeSuit
 * @returns {{suit: string, rank: string}|null}
 */
export function chooseAiCard(hand, topCard, activeSuit) {
  // First try to play a non-eight
  const playableNonEight = hand.find(
    (card) => card.rank !== '8' && canPlay(card, topCard, activeSuit)
  )
  if (playableNonEight) {
    return playableNonEight
  }
  
  // Then try an eight
  const eight = hand.find((card) => card.rank === '8')
  if (eight) {
    return eight
  }
  
  // No playable card
  return null
}

/**
 * Choose the best suit for AI when playing an eight
 * @param {Array<{suit: string, rank: string}>} hand
 * @returns {string}
 */
export function chooseSuitForAi(hand) {
  const suitCounts = {}
  for (const card of hand) {
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1
  }
  
  // Return the suit with the most cards
  let maxCount = 0
  let bestSuit = SUITS[0]
  for (const [suit, count] of Object.entries(suitCounts)) {
    if (count > maxCount) {
      maxCount = count
      bestSuit = suit
    }
  }
  
  return bestSuit
}

/**
 * Get the next player index
 * @param {number} current
 * @param {number} numPlayers
 * @returns {number}
 */
export function nextPlayer(current, numPlayers) {
  return (current + 1) % numPlayers
}

/**
 * Check if a player has won (hand is empty)
 * @param {Array<{suit: string, rank: string}>} hand
 * @returns {boolean}
 */
export function hasWon(hand) {
  return hand.length === 0
}

/**
 * Reshuffle the discard pile back into the draw pile
 * @param {Array<{suit: string, rank: string}>} discardPile
 * @param {Array<{suit: string, rank: string}>} drawPile
 * @returns {{newDrawPile: Array<{suit: string, rank: string}>, newDiscardPile: Array<{suit: string, rank: string}>}}
 */
export function reshuffleDiscard(discardPile, drawPile) {
  if (discardPile.length === 0) {
    return { newDrawPile: drawPile, newDiscardPile: discardPile }
  }
  
  // Keep the top card of discard
  const topCard = discardPile[discardPile.length - 1]
  const cardsToReshuffle = discardPile.slice(0, -1)
  
  // Shuffle and add to draw pile
  const shuffledCards = shuffle(cardsToReshuffle)
  const newDrawPile = [...drawPile, ...shuffledCards]
  const newDiscardPile = [topCard]
  
  return { newDrawPile, newDiscardPile }
}

/**
 * Draw a card from the draw pile, reshuffling if needed
 * @param {Array<{suit: string, rank: string}>} drawPile
 * @param {Array<{suit: string, rank: string}>} discardPile
 * @returns {{card: {suit: string, rank: string}|null, newDrawPile: Array, newDiscardPile: Array}}
 */
export function drawCard(drawPile, discardPile) {
  let newDrawPile = [...drawPile]
  let newDiscardPile = [...discardPile]
  
  // If draw pile is empty, reshuffle discard
  if (newDrawPile.length === 0) {
    const reshuffled = reshuffleDiscard(newDiscardPile, newDrawPile)
    newDrawPile = reshuffled.newDrawPile
    newDiscardPile = reshuffled.newDiscardPile
  }
  
  // If still empty after reshuffle, no card available
  if (newDrawPile.length === 0) {
    return { card: null, newDrawPile, newDiscardPile }
  }
  
  const card = newDrawPile.shift()
  return { card, newDrawPile, newDiscardPile }
}

/**
 * Get legal cards from a hand
 * @param {Array<{suit: string, rank: string}>} hand
 * @param {{suit: string, rank: string}} topCard
 * @param {string} activeSuit
 * @returns {Array<{suit: string, rank: string}>}
 */
export function getLegalCards(hand, topCard, activeSuit) {
  return hand.filter((card) => canPlay(card, topCard, activeSuit))
}
