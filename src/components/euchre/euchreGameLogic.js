// Euchre game logic - pure functions for game rules and card comparison

function getOpposite(suit) {
  if (suit === '♠') return '♣'
  if (suit === '♣') return '♠'
  if (suit === '♦') return '♥'
  if (suit === '♥') return '♦'
  return suit
}

export function isLeftBower(card, trump) {
  return card.rank === 'J' && card.suit === getOpposite(trump)
}

export function isRightBower(card, trump) {
  return card.rank === 'J' && card.suit === trump
}

export function getEffectiveSuit(card, trump) {
  // Left bower counts as trump suit
  if (isLeftBower(card, trump)) return trump
  return card.suit
}

export function getCardValue(card, trump) {
  // Higher value = stronger card
  const effSuit = getEffectiveSuit(card, trump)
  if (effSuit !== trump) {
    const vals = { A: 6, K: 5, Q: 4, J: 3, '10': 2, '9': 1 }
    return vals[card.rank] || 0
  }
  // Trump suit: Right bower=9, Left bower=8, A=7, K=6, Q=5, (J=4 for non-bower), 10=3, 9=2
  if (isRightBower(card, trump)) return 9
  if (isLeftBower(card, trump)) return 8
  const vals = { A: 7, K: 6, Q: 5, J: 4, '10': 3, '9': 2 }
  return vals[card.rank] || 0
}

export function cardKey(card) {
  return `${card.rank}${card.suit}`
}

export function canPlayCard(card, hand, trump, leadSuit) {
  if (!leadSuit) return true
  
  const effSuit = getEffectiveSuit(card, trump)
  if (effSuit === leadSuit) return true
  
  const hasSuit = hand.some(c => getEffectiveSuit(c, trump) === leadSuit)
  return !hasSuit
}

export function getWinningCard(trick, trump, leadSuit) {
  if (trick.length === 0) return null
  
  let winner = trick[0].card  
  let winnerValue = getCardValue(winner, trump)
  let winnerEffSuit = getEffectiveSuit(winner, trump)
  
  for (const { card } of trick.slice(1)) {
    const effSuit = getEffectiveSuit(card, trump)
    const value = getCardValue(card, trump)
    
    // Trump always beats non-trump
    if (effSuit === trump && winnerEffSuit !== trump) {
      winner = card
      winnerValue = value
      winnerEffSuit = effSuit
    } else if (effSuit === trump && winnerEffSuit === trump && value > winnerValue) {
      // Both trump - higher value wins
      winner = card
      winnerValue = value
    } else if (winnerEffSuit !== trump && effSuit === leadSuit && (winnerEffSuit !== leadSuit || value > winnerValue)) {
      // Non-trump: lead suit beats off-suit, or higher lead suit value
      if (winnerEffSuit !== leadSuit || value > winnerValue) {
        winner = card
        winnerValue = value
        winnerEffSuit = effSuit
      }
    }
  }
  
  return winner
}
