// ── Constants ────────────────────────────────────────────────────────────────

export const SUITS = ['♠', '♣', '♥', '♦']

// ── Euchre Logic ─────────────────────────────────────────────────────────────

export function getEffectiveRankSuit(card, trump) {
  if (!trump) return { rank: card.rank, suit: card.suit }
  
  // Right bower (J of trump suit)
  if (card.rank === 'J' && card.suit === trump) {
    return { rank: 'RB', suit: trump }
  }
  
  // Left bower (J of same color)
  const leftBowerSuit = getLeftBowerSuit(trump)
  if (card.rank === 'J' && card.suit === leftBowerSuit) {
    return { rank: 'LB', suit: trump }
  }
  
  return { rank: card.rank, suit: card.suit }
}

function getLeftBowerSuit(trump) {
  if (trump === '♠') return '♣'
  if (trump === '♣') return '♠'
  if (trump === '♥') return '♦'
  if (trump === '♦') return '♥'
  return null
}

function cardValue(card, trump, ledSuit) {
  const effective = getEffectiveRankSuit(card, trump)
  
  // Right bower is highest
  if (effective.rank === 'RB') return 100
  
  // Left bower is second highest
  if (effective.rank === 'LB') return 99
  
  // Trump suit cards
  if (effective.suit === trump) {
    const trumpOrder = { 'A': 98, 'K': 97, 'Q': 96, '10': 95, '9': 94 }
    return trumpOrder[effective.rank] || 0
  }
  
  // Led suit cards
  if (effective.suit === ledSuit) {
    const ledOrder = { 'A': 20, 'K': 19, 'Q': 18, 'J': 17, '10': 16, '9': 15 }
    return ledOrder[effective.rank] || 0
  }
  
  // Off-suit cards have no value
  return 0
}

export function whoWinsTrick(trick, trump) {
  if (trick.length === 0) return null
  
  const ledSuit = getEffectiveRankSuit(trick[0].card, trump).suit
  let winningIndex = 0
  let highestValue = cardValue(trick[0].card, trump, ledSuit)
  
  for (let i = 1; i < trick.length; i++) {
    const value = cardValue(trick[i].card, trump, ledSuit)
    if (value > highestValue) {
      highestValue = value
      winningIndex = i
    }
  }
  
  return trick[winningIndex].position
}

// ── AI Logic ─────────────────────────────────────────────────────────────────

export function aiShouldOrderUp(hand, upCard, position, dealer) {
  const suit = upCard.suit
  const trumpCards = hand.filter(c => {
    const eff = getEffectiveRankSuit(c, suit)
    return eff.suit === suit
  })
  
  // Count strong trump cards (bowers, A, K)
  const strongTrump = trumpCards.filter(c => {
    const eff = getEffectiveRankSuit(c, suit)
    return eff.rank === 'RB' || eff.rank === 'LB' || c.rank === 'A' || c.rank === 'K'
  })
  
  // Dealer is more aggressive since they get to swap a card
  if (position === dealer) {
    // Dealer orders up with 1+ strong trump or 2+ trump total
    if (strongTrump.length >= 1 || trumpCards.length >= 2) {
      return 'orderUp'
    }
  } else {
    // Non-dealer needs a stronger hand: 2+ strong trump or 3+ trump total
    if (strongTrump.length >= 2 || trumpCards.length >= 3) {
      return 'orderUp'
    }
  }
  
  return 'pass'
}

export function aiShouldCallTrump(hand, upCardSuit) {
  // Try each suit except the up card suit
  const suits = SUITS.filter(s => s !== upCardSuit)
  
  for (const suit of suits) {
    const trumpCards = hand.filter(c => {
      const eff = getEffectiveRankSuit(c, suit)
      return eff.suit === suit
    })
    
    const strongTrump = trumpCards.filter(c => {
      const eff = getEffectiveRankSuit(c, suit)
      return eff.rank === 'RB' || eff.rank === 'LB' || c.rank === 'A' || c.rank === 'K'
    })
    
    // Call it if we have 2+ strong trump
    if (strongTrump.length >= 2) {
      return suit
    }
  }
  
  return null
}

export function aiMustCallTrump(hand, upCardSuit) {
  // Dealer is stuck - must call trump. Pick the best available suit.
  const suits = SUITS.filter(s => s !== upCardSuit)
  
  let bestSuit = suits[0]
  let bestScore = -1
  
  for (const suit of suits) {
    const trumpCards = hand.filter(c => {
      const eff = getEffectiveRankSuit(c, suit)
      return eff.suit === suit
    })
    
    const strongTrump = trumpCards.filter(c => {
      const eff = getEffectiveRankSuit(c, suit)
      return eff.rank === 'RB' || eff.rank === 'LB' || c.rank === 'A' || c.rank === 'K'
    })
    
    // Call it if we have 2+ strong trump
    const score = trumpCards.length * 10 + strongTrump.length
    if (score > bestScore) {
      bestScore = score
      bestSuit = suit
    }
  }
  
  // Return the suit with most trump and strongest cards
  return bestSuit
}
