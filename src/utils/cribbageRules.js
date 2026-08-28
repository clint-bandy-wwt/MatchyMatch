/**
 * Cribbage Game Rules and Validation Logic
 * 
 * This module handles game rules, turn management, and validation
 * for the Cribbage card game implementation.
 * 
 * Card Format:
 * {
 *   suit: 'hearts' | 'diamonds' | 'clubs' | 'spades',
 *   rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K',
 *   value: number (1-10 for pegging, where face cards = 10),
 *   id: string (unique identifier)
 * }
 */

/**
 * HELPER FUNCTIONS
 */

/**
 * Get the pegging value of a card (used for counting to 31)
 * Ace = 1, 2-9 = face value, 10/J/Q/K = 10
 * 
 * @param {Object} card - Card object with rank and value
 * @returns {number} - Pegging value (1-10)
 */
function getCardPeggingValue(card) {
  // If card already has a value property, use it
  if (card.value !== undefined) {
    return card.value;
  }
  
  // Otherwise calculate from rank
  const rank = card.rank;
  if (rank === 'A') return 1;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return parseInt(rank, 10);
}

/**
 * PEGGING VALIDATION FUNCTIONS
 */

/**
 * Validate if a card can be played during pegging phase
 * Rule: Card value + current count must not exceed 31
 * 
 * @param {Object} card - Card to validate
 * @param {number} currentCount - Current pegging count (0-31)
 * @param {Array} playedCards - Cards played this round (optional, for future extensions)
 * @returns {boolean} - True if card can be played
 */
export function validatePeggingPlay(card, currentCount) {
  if (!card) return false;
  
  const cardValue = getCardPeggingValue(card);
  const newCount = currentCount + cardValue;
  
  // Card is valid if it doesn't exceed 31
  return newCount <= 31;
}

/**
 * Check if player can play any card from their hand
 * Used to determine "Go" situations
 * 
 * @param {Array} hand - Player's current hand
 * @param {number} currentCount - Current pegging count
 * @returns {boolean} - True if at least one card can be played
 */
export function canPlayAnyCard(hand, currentCount) {
  if (!hand || hand.length === 0) return false;
  
  return hand.some(card => validatePeggingPlay(card, currentCount));
}

/**
 * Get all valid cards that can be played from a hand
 * 
 * @param {Array} hand - Player's current hand
 * @param {number} currentCount - Current pegging count
 * @returns {Array} - Array of cards that can be played
 */
export function getValidPlays(hand, currentCount) {
  if (!hand || hand.length === 0) return [];
  
  return hand.filter(card => validatePeggingPlay(card, currentCount));
}

/**
 * Determine if the count should reset to 0
 * Resets when:
 * - Count reaches exactly 31
 * - Both players can't play (Go situation)
 * 
 * @param {Array} playedCardsThisRound - Cards played since last reset
 * @param {number} currentCount - Current pegging count
 * @returns {boolean} - True if count should reset
 */
export function shouldResetCount(playedCardsThisRound, currentCount) {
  // Reset if count is exactly 31
  if (currentCount === 31) return true;
  
  // Reset if we've played cards but count is 0 (already reset)
  // This is a no-op check but kept for clarity
  if (currentCount === 0 && playedCardsThisRound.length > 0) return false;
  
  // Otherwise, caller should check if both players can't play
  // That logic is in determineNextPlayer
  return false;
}

/**
 * TURN MANAGEMENT FUNCTIONS
 */

/**
 * Determine who plays next based on current game situation
 * Handles "Go" logic and turn alternation
 * 
 * @param {string} currentPlayer - 'player' or 'ai'
 * @param {Object} situation - Game situation
 *   - canCurrentPlay: boolean (can current player play a card?)
 *   - canOpponentPlay: boolean (can opponent play a card?)
 *   - count: number (current pegging count)
 *   - phase: string (current game phase)
 * @returns {string} - 'player' or 'ai' (who plays next)
 */
export function determineNextPlayer(currentPlayer, situation) {
  const { canCurrentPlay, canOpponentPlay, phase } = situation;
  
  // During pegging phase
  if (phase === 'pegging') {
    // If current player can play, they must play
    if (canCurrentPlay) {
      return currentPlayer;
    }
    
    // Current player can't play - opponent gets to continue if they can
    if (canOpponentPlay) {
      return currentPlayer === 'player' ? 'ai' : 'player';
    }
    
    // Neither can play - this is the end of pegging for this count
    // The player who played last (not current) gets to lead next
    // But if no one can play, we need to handle that at a higher level
    return null; // Signals pegging round is over
  }
  
  // For other phases, alternate turns
  return currentPlayer === 'player' ? 'ai' : 'player';
}

/**
 * Check if the given card is the last card to be played in pegging
 * 
 * @param {Array} playerHand - Player's remaining hand
 * @param {Array} aiHand - AI's remaining hand
 * @param {Array} playedCards - Cards already played in pegging
 * @returns {boolean} - True if this is the last card
 */
export function isLastCard(playerHand, aiHand) {
  // Last card is when only 1 card remains between both hands
  const totalRemainingCards = (playerHand?.length || 0) + (aiHand?.length || 0);
  return totalRemainingCards === 1;
}

/**
 * GAME STATE FUNCTIONS
 */

/**
 * Check if the game is over and determine winner
 * Game ends when a player reaches 121 points
 * 
 * @param {number} playerScore - Player's current score
 * @param {number} aiScore - AI's current score
 * @returns {Object} - { isOver: boolean, winner: 'player'|'ai'|null }
 */
export function isGameOver(playerScore, aiScore) {
  const playerWins = playerScore >= 121;
  const aiWins = aiScore >= 121;
  
  if (playerWins) {
    return { isOver: true, winner: 'player' };
  }
  
  if (aiWins) {
    return { isOver: true, winner: 'ai' };
  }
  
  return { isOver: false, winner: null };
}

/**
 * Determine the next game phase based on current phase and game state
 * 
 * Phase flow:
 * dealing → discard → cut → pegging → counting → dealing (or gameover)
 * 
 * @param {string} currentPhase - Current game phase
 * @param {Object} gameState - Current game state
 *   - playerScore: number
 *   - aiScore: number
 *   - cribReady: boolean (have both players discarded?)
 *   - cutCardReady: boolean (has cut card been revealed?)
 *   - peggingComplete: boolean (are all cards played?)
 *   - countingComplete: boolean (have all hands been counted?)
 * @returns {string} - Next phase name
 */
export function getNextPhase(currentPhase, gameState) {
  const {
    playerScore = 0,
    aiScore = 0,
    cribReady = false,
    cutCardReady = false,
    peggingComplete = false,
    countingComplete = false
  } = gameState;
  
  // Check for game over at any point
  const gameOver = isGameOver(playerScore, aiScore);
  if (gameOver.isOver) {
    return 'gameover';
  }
  
  switch (currentPhase) {
    case 'dealing':
      // After dealing, players must discard
      return 'discard';
      
    case 'discard':
      // After both players discard to crib, cut the deck
      if (cribReady) {
        return 'cut';
      }
      return 'discard'; // Wait for both players to discard
      
    case 'cut':
      // After cut card is revealed, begin pegging
      if (cutCardReady) {
        return 'pegging';
      }
      return 'cut'; // Wait for cut
      
    case 'pegging':
      // After all cards are played, count hands
      if (peggingComplete) {
        return 'counting';
      }
      return 'pegging'; // Continue pegging
      
    case 'counting':
      // After counting all hands, check for winner
      if (countingComplete) {
        const gameOverCheck = isGameOver(playerScore, aiScore);
        if (gameOverCheck.isOver) {
          return 'gameover';
        }
        // Otherwise start new round
        return 'dealing';
      }
      return 'counting'; // Continue counting
      
    case 'gameover':
      return 'gameover'; // Stay in game over
      
    default:
      // Default to dealing for unknown states
      return 'dealing';
  }
}

/**
 * Determine who is the dealer for a given round
 * Dealer alternates each round
 * 
 * @param {number} roundNumber - Current round number (1-indexed)
 * @returns {string} - 'player' or 'ai'
 */
export function determineDealer(roundNumber) {
  // Round 1: player is dealer
  // Round 2: ai is dealer
  // Round 3: player is dealer
  // etc.
  return roundNumber % 2 === 1 ? 'player' : 'ai';
}

/**
 * VALIDATION HELPER FUNCTIONS
 */

/**
 * Validate a discard selection
 * Players must discard exactly 2 cards from their 6-card hand
 * 
 * @param {Array} selectedCards - Cards selected for discard
 * @param {Array} hand - Player's full hand
 * @returns {boolean} - True if valid discard
 */
export function isValidDiscard(selectedCards, hand) {
  // Must select exactly 2 cards
  if (!selectedCards || selectedCards.length !== 2) {
    return false;
  }
  
  // Must have a 6-card hand
  if (!hand || hand.length !== 6) {
    return false;
  }
  
  // All selected cards must be in the hand
  return selectedCards.every(card => 
    hand.some(handCard => handCard.id === card.id)
  );
}

/**
 * Check if a player has won the game
 * Winning score is 121 points
 * 
 * @param {number} score - Player's current score
 * @returns {boolean} - True if score >= 121
 */
export function hasWon(score) {
  return score >= 121;
}

/**
 * ADDITIONAL HELPER FUNCTIONS
 */

/**
 * Calculate the new count after playing a card
 * 
 * @param {Object} card - Card being played
 * @param {number} currentCount - Current pegging count
 * @returns {number} - New count
 */
export function calculateNewCount(card, currentCount) {
  return currentCount + getCardPeggingValue(card);
}

/**
 * Check if count has reached exactly 31
 * 
 * @param {number} count - Current pegging count
 * @returns {boolean} - True if count is 31
 */
export function isThirtyOne(count) {
  return count === 31;
}

/**
 * Check if count has reached 15
 * Used for scoring 2 points during pegging
 * 
 * @param {number} count - Current pegging count
 * @returns {boolean} - True if count is 15
 */
export function isFifteen(count) {
  return count === 15;
}

/**
 * Validate game phase transition
 * 
 * @param {string} currentPhase - Current phase
 * @param {string} nextPhase - Proposed next phase
 * @returns {boolean} - True if transition is valid
 */
export function isValidPhaseTransition(currentPhase, nextPhase) {
  const validTransitions = {
    'dealing': ['discard'],
    'discard': ['cut'],
    'cut': ['pegging'],
    'pegging': ['counting'],
    'counting': ['dealing', 'gameover'],
    'gameover': ['gameover']
  };
  
  const allowedNextPhases = validTransitions[currentPhase] || [];
  return allowedNextPhases.includes(nextPhase);
}

/**
 * Get the non-dealer player
 * 
 * @param {string} dealer - 'player' or 'ai'
 * @returns {string} - 'player' or 'ai' (the non-dealer)
 */
export function getNonDealer(dealer) {
  return dealer === 'player' ? 'ai' : 'player';
}

/**
 * Validate that a hand has the correct number of cards for its phase
 * 
 * @param {Array} hand - Player's hand
 * @param {string} phase - Current game phase
 * @returns {boolean} - True if hand size is valid for phase
 */
export function isValidHandSize(hand, phase) {
  if (!hand) return false;
  
  switch (phase) {
    case 'discard':
      return hand.length === 6; // Before discarding
    case 'cut':
    case 'pegging':
    case 'counting':
      return hand.length === 4; // After discarding
    default:
      return true; // Don't validate for other phases
  }
}

/**
 * Export all functions for testing and external use
 */
export default {
  // Pegging validation
  validatePeggingPlay,
  canPlayAnyCard,
  getValidPlays,
  shouldResetCount,
  
  // Turn management
  determineNextPlayer,
  isLastCard,
  
  // Game state
  isGameOver,
  getNextPhase,
  determineDealer,
  
  // Validation helpers
  isValidDiscard,
  hasWon,
  
  // Additional helpers
  calculateNewCount,
  isThirtyOne,
  isFifteen,
  isValidPhaseTransition,
  getNonDealer,
  isValidHandSize
};
