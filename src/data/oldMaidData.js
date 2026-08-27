// src/data/oldMaidData.js
/**
 * Old Maid game logic.
 * 
 * Rules:
 * - Standard 52-card deck with one Queen removed (51 cards total)
 * - Deal all cards between two players
 * - Immediately discard all pairs from each hand
 * - Players alternate drawing one card blindly from opponent's hand
 * - Discard any new pair formed
 * - Player left holding the unmatched Queen loses
 */

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/**
 * Create a standard 52-card deck with one Queen removed.
 * @returns {Array} Array of card objects
 */
export function createDeck() {
  const deck = [];
  let id = 0;
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: id++, rank, suit });
    }
  }
  
  // Remove one Queen (Queen of Spades)
  const queenOfSpadesIndex = deck.findIndex(
    card => card.rank === 'Q' && card.suit === 'spades'
  );
  deck.splice(queenOfSpadesIndex, 1);
  
  return deck;
}

/**
 * Shuffle an array using Fisher-Yates algorithm.
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
export function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deal cards alternately between two players.
 * @param {Array} deck - Shuffled deck
 * @returns {Object} Object with playerHand and opponentHand arrays
 */
export function dealCards(deck) {
  const playerHand = [];
  const opponentHand = [];
  
  deck.forEach((card, index) => {
    if (index % 2 === 0) {
      playerHand.push(card);
    } else {
      opponentHand.push(card);
    }
  });
  
  return { playerHand, opponentHand };
}

/**
 * Find and remove all pairs from a hand.
 * A pair is two cards with the same rank.
 * @param {Array} hand - Array of cards
 * @returns {Object} Object with newHand and pairs arrays
 */
export function removePairs(hand) {
  const newHand = [...hand];
  const pairs = [];
  
  // Group cards by rank
  const rankGroups = {};
  newHand.forEach((card, index) => {
    if (!rankGroups[card.rank]) {
      rankGroups[card.rank] = [];
    }
    rankGroups[card.rank].push({ card, index });
  });
  
  // Find pairs and mark for removal
  const indicesToRemove = new Set();
  Object.entries(rankGroups).forEach(([, cards]) => {
    // Remove pairs (2 at a time)
    for (let i = 0; i + 1 < cards.length; i += 2) {
      pairs.push([cards[i].card, cards[i + 1].card]);
      indicesToRemove.add(cards[i].index);
      indicesToRemove.add(cards[i + 1].index);
    }
  });
  
  // Remove cards in reverse order to maintain indices
  const filteredHand = newHand.filter((_, index) => !indicesToRemove.has(index));
  
  return { newHand: filteredHand, pairs };
}

/**
 * Draw a card from opponent's hand at the specified index.
 * @param {Array} opponentHand - Opponent's hand
 * @param {number} index - Index of card to draw
 * @returns {Object} Object with drawnCard and remainingHand
 */
export function drawCard(opponentHand, index) {
  const newHand = [...opponentHand];
  const drawnCard = newHand.splice(index, 1)[0];
  return { drawnCard, remainingHand: newHand };
}

/**
 * Check if a drawn card forms a pair with any card in hand.
 * @param {Array} hand - Current hand
 * @param {Object} drawnCard - Card that was drawn
 * @returns {Object} Object with hasPair, newHand, and pair (if found)
 */
export function checkForPair(hand, drawnCard) {
  const matchIndex = hand.findIndex(card => card.rank === drawnCard.rank);
  
  if (matchIndex !== -1) {
    const newHand = [...hand];
    const matchedCard = newHand.splice(matchIndex, 1)[0];
    return {
      hasPair: true,
      newHand,
      pair: [matchedCard, drawnCard]
    };
  }
  
  return {
    hasPair: false,
    newHand: [...hand, drawnCard],
    pair: null
  };
}

/**
 * Check if the game is over (one or both players have no cards).
 * @param {Array} playerHand - Player's hand
 * @param {Array} opponentHand - Opponent's hand
 * @returns {Object} Object with isOver and winner ('player', 'opponent', or null)
 */
export function checkGameOver(playerHand, opponentHand) {
  if (playerHand.length === 0 && opponentHand.length === 0) {
    // This shouldn't happen in Old Maid (one card should remain)
    return { isOver: true, winner: null };
  }
  
  if (playerHand.length === 0) {
    // Player has no cards, opponent has the Old Maid
    return { isOver: true, winner: 'player' };
  }
  
  if (opponentHand.length === 0) {
    // Opponent has no cards, player has the Old Maid
    return { isOver: true, winner: 'opponent' };
  }
  
  return { isOver: false, winner: null };
}

/**
 * AI chooses a random card index from player's hand.
 * @param {number} handSize - Size of player's hand
 * @returns {number} Random index
 */
export function aiChooseCard(handSize) {
  return Math.floor(Math.random() * handSize);
}

/**
 * Get card display name.
 * @param {Object} card - Card object
 * @returns {string} Display name like "A♥" or "10♠"
 */
export function getCardDisplay(card) {
  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };
  return `${card.rank}${suitSymbols[card.suit]}`;
}

/**
 * Get suit color for styling.
 * @param {string} suit - Card suit
 * @returns {string} 'red' or 'black'
 */
export function getSuitColor(suit) {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}
