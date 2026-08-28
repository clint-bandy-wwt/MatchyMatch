/**
 * Cribbage Rules and Validation
 * Enforces game rules and provides validation functions
 */

/**
 * Validate if a card can be played during pegging
 * Returns true if the card's value + current count <= 31
 */
export function validatePeggingPlay(card, peggingCount) {
  return peggingCount + card.value <= 31
}

/**
 * Check if a player can play any card from their hand
 */
export function canPlayAnyCard(hand, peggingCount) {
  return hand.some(card => validatePeggingPlay(card, peggingCount))
}

/**
 * Get all valid plays from a hand given the current pegging count
 */
export function getValidPlays(hand, peggingCount) {
  return hand.filter(card => validatePeggingPlay(card, peggingCount))
}

/**
 * Check if the game is over (someone reached 121 points)
 */
export function isGameOver(playerScore, aiScore) {
  return playerScore >= 121 || aiScore >= 121
}

/**
 * Get the winner of the game
 */
export function getWinner(playerScore, aiScore) {
  if (playerScore >= 121) return 'player'
  if (aiScore >= 121) return 'ai'
  return null
}

/**
 * Determine who should be dealer for first round (or use passed value)
 */
export function determineDealer(preferredDealer = null) {
  if (preferredDealer) return preferredDealer
  return Math.random() < 0.5 ? 'player' : 'ai'
}

/**
 * Get the non-dealer (opponent of current dealer)
 */
export function getNonDealer(dealer) {
  return dealer === 'player' ? 'ai' : 'player'
}

/**
 * Switch dealer for next round
 */
export function switchDealer(currentDealer) {
  return currentDealer === 'player' ? 'ai' : 'player'
}

/**
 * Validate discard selection (must be exactly 2 cards)
 */
export function validateDiscardSelection(selectedCards) {
  return selectedCards.length === 2
}

/**
 * Get the next phase of the game based on current phase and conditions
 */
export function getNextPhase(currentPhase, conditions = {}) {
  const { 
    allCardsPlayed = false, 
    gameOver = false,
    discardComplete = false,
    cutComplete = false,
    countingComplete = false,
  } = conditions
  
  if (gameOver) return 'gameover'
  
  switch (currentPhase) {
    case 'dealing':
      return 'discard'
    
    case 'discard':
      return discardComplete ? 'cut' : 'discard'
    
    case 'cut':
      return cutComplete ? 'pegging' : 'cut'
    
    case 'pegging':
      return allCardsPlayed ? 'counting' : 'pegging'
    
    case 'counting':
      return countingComplete ? 'dealing' : 'counting'
    
    case 'gameover':
      return 'gameover'
    
    default:
      return 'dealing'
  }
}

/**
 * Check if it's time to reset the pegging count to 0
 * This happens when count reaches 31 or when both players say "Go"
 */
export function shouldResetPeggingCount(peggingCount, bothPlayersPassedOrCantPlay) {
  return peggingCount === 31 || bothPlayersPassedOrCantPlay
}

/**
 * Check if the pegging round is complete (all 8 cards played)
 */
export function isPeggingComplete(playerHandSize, aiHandSize) {
  return playerHandSize === 0 && aiHandSize === 0
}

/**
 * Validate that the crib has exactly 4 cards
 */
export function validateCrib(crib) {
  return crib.length === 4
}

/**
 * Get the first player to peg (non-dealer goes first)
 */
export function getFirstPegger(dealer) {
  return getNonDealer(dealer)
}

/**
 * Get the order for counting hands
 * Non-dealer counts first, then dealer, then dealer counts crib
 */
export function getCountingOrder(dealer) {
  const nonDealer = getNonDealer(dealer)
  return [
    { player: nonDealer, isCrib: false },
    { player: dealer, isCrib: false },
    { player: dealer, isCrib: true },
  ]
}

/**
 * Check if a card is a Jack (for "two for his heels" on cut)
 */
export function isJack(card) {
  return card.rank === 'J'
}

/**
 * Validate a hand size at different stages of the game
 */
export function validateHandSize(hand, expectedSize) {
  return hand.length === expectedSize
}

/**
 * Check if player has made a valid selection for discard
 */
export function isValidDiscardSelection(selectedCards, hand) {
  if (selectedCards.length !== 2) return false
  
  // Check that all selected cards are actually in the hand
  return selectedCards.every(selectedCard =>
    hand.some(handCard => handCard.id === selectedCard.id)
  )
}

/**
 * Get the scoring order for a specific counting step
 */
export function getCountingStep(countingIndex) {
  const steps = [
    { player: 'nonDealer', type: 'hand', description: 'Non-dealer\'s hand' },
    { player: 'dealer', type: 'hand', description: 'Dealer\'s hand' },
    { player: 'dealer', type: 'crib', description: 'Dealer\'s crib' },
  ]
  
  return steps[countingIndex] || null
}

/**
 * Calculate skunks (special win conditions)
 * Regular win: 121+ points
 * Skunk: opponent has less than 91 points
 * Double skunk: opponent has less than 61 points
 */
export function getWinType(winnerScore, loserScore) {
  if (loserScore < 61) return 'double-skunk'
  if (loserScore < 91) return 'skunk'
  return 'regular'
}

/**
 * Check if pegging action is valid
 */
export function isValidPeggingAction(action, hand, peggingCount) {
  if (action.type === 'play') {
    const card = action.card
    return validatePeggingPlay(card, peggingCount) &&
           hand.some(h => h.id === card.id)
  }
  
  if (action.type === 'go') {
    return !canPlayAnyCard(hand, peggingCount)
  }
  
  return false
}

/**
 * Constants for game configuration
 */
export const GAME_CONFIG = {
  WINNING_SCORE: 121,
  CARDS_PER_HAND: 6,
  CARDS_TO_DISCARD: 2,
  CRIB_SIZE: 4,
  MAX_PEGGING_COUNT: 31,
  CARDS_AFTER_DISCARD: 4,
}

/**
 * Phase names for reference
 */
export const PHASES = {
  DEALING: 'dealing',
  DISCARD: 'discard',
  CUT: 'cut',
  PEGGING: 'pegging',
  COUNTING: 'counting',
  GAMEOVER: 'gameover',
}

/**
 * Player identifiers
 */
export const PLAYERS = {
  PLAYER: 'player',
  AI: 'ai',
}
