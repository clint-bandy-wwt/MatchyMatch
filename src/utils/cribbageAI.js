/**
 * Cribbage AI Decision Making
 * Implements strategy for card selection and play
 */

import { getValidPlays } from './cribbageRules'
import { scoreHand, scorePeggingPlay } from './cribbageScoring'

/**
 * AI chooses which 2 cards to discard from 6-card hand
 * Strategy: Keep the hand that scores best with average cut cards
 */
export function chooseDiscards(hand, isDealer) {
  if (hand.length !== 6) {
    throw new Error('Must have 6 cards to choose discards')
  }
  
  // Try all possible 2-card discard combinations
  const combinations = getAllTwoCardCombinations(hand)
  let bestDiscard = null
  let bestScore = -Infinity
  
  for (const discard of combinations) {
    const remainingHand = hand.filter(card => 
      !discard.some(d => d.id === card.id)
    )
    
    // Evaluate this keep by simulating with various cut cards
    const evaluationScore = evaluateHand(remainingHand, isDealer)
    
    // If dealer, also consider value of discarded cards to crib
    const cribBonus = isDealer ? evaluateDiscardForCrib(discard) : 0
    const totalScore = evaluationScore + cribBonus
    
    if (totalScore > bestScore) {
      bestScore = totalScore
      bestDiscard = discard
    }
  }
  
  return bestDiscard || combinations[0]
}

/**
 * Get all possible combinations of 2 cards from hand
 */
function getAllTwoCardCombinations(hand) {
  const combinations = []
  
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      combinations.push([hand[i], hand[j]])
    }
  }
  
  return combinations
}

/**
 * Evaluate a 4-card hand by averaging scores with sample cut cards
 */
function evaluateHand(hand, isDealer) {
  // Create sample cut cards (different ranks)
  const sampleCutCards = [
    { rank: '5', suit: 'hearts', value: 5, id: 999 },
    { rank: '10', suit: 'hearts', value: 10, id: 998 },
    { rank: 'A', suit: 'hearts', value: 1, id: 997 },
    { rank: 'K', suit: 'hearts', value: 10, id: 996 },
    { rank: '6', suit: 'diamonds', value: 6, id: 995 },
  ]
  
  let totalScore = 0
  
  for (const cutCard of sampleCutCards) {
    const result = scoreHand(hand, cutCard, false)
    totalScore += result.total
  }
  
  return totalScore / sampleCutCards.length
}

/**
 * Evaluate cards being discarded to crib
 * Fifteens and pairs are valuable in the crib
 */
function evaluateDiscardForCrib(discard) {
  const [card1, card2] = discard
  let bonus = 0
  
  // Pair in crib is good
  if (card1.rank === card2.rank) {
    bonus += 4
  }
  
  // Fifteen in crib is good
  if (card1.value + card2.value === 15) {
    bonus += 3
  }
  
  // Cards that make fifteens easily (5, 10, J, Q, K)
  const fifteenCards = [5, 10]
  if (fifteenCards.includes(card1.value) || fifteenCards.includes(card2.value)) {
    bonus += 1
  }
  
  return bonus
}

/**
 * AI chooses which card to play during pegging
 * Strategy: Balance between scoring and avoiding giving opponent points
 */
export function choosePeggingPlay(hand, playedCards, peggingCount, isDealer) {
  const validPlays = getValidPlays(hand, peggingCount)
  
  if (validPlays.length === 0) {
    return null // Must say "Go"
  }
  
  if (validPlays.length === 1) {
    return validPlays[0]
  }
  
  // Evaluate each valid play
  let bestCard = validPlays[0]
  let bestScore = -Infinity
  
  for (const card of validPlays) {
    let score = 0
    
    // Score this immediate play
    const playScore = scorePeggingPlay(playedCards, card, peggingCount)
    score += playScore.points * 10 // Weight immediate points highly
    
    // Check if this would give us exactly 31
    const newCount = peggingCount + card.value
    if (newCount === 31) {
      score += 20 // Bonus for hitting 31
    }
    
    // Check if this would give us exactly 15
    if (newCount === 15) {
      score += 15 // Bonus for hitting 15
    }
    
    // Avoid giving opponent easy scoring opportunities
    // Avoid leaving count that allows opponent to make 15 or 31
    const countAfter = newCount
    if (countAfter < 31) {
      // Check if opponent could easily make 15 or 31
      const to15 = 15 - countAfter
      const to31 = 31 - countAfter
      
      if (to15 > 0 && to15 <= 10) {
        score -= 5 // Risky - opponent might make 15
      }
      
      if (to31 > 0 && to31 <= 10) {
        score -= 3 // Risky - opponent might make 31
      }
    }
    
    // Avoid playing same rank as last card (gives opponent pair)
    if (playedCards.length > 0) {
      const lastCard = playedCards[playedCards.length - 1].card
      if (card.rank === lastCard.rank) {
        score -= 8 // Penalty for giving opponent a pair
      }
    }
    
    // Prefer keeping low cards for later
    if (validPlays.length > 2) {
      if (card.value <= 3) {
        score -= 2 // Slight penalty for playing low cards early
      }
      if (card.value >= 8) {
        score += 1 // Slight bonus for playing high cards early
      }
    }
    
    if (score > bestScore) {
      bestScore = score
      bestCard = card
    }
  }
  
  return bestCard
}

/**
 * AI evaluates whether to keep or discard specific cards
 * Used for more nuanced decision-making
 */
export function evaluateCard(card, hand, isDealer) {
  let value = 0
  
  // Fives are valuable (make fifteens easily)
  if (card.rank === '5') value += 3
  
  // Face cards and tens are good for fifteens
  if (card.value === 10) value += 2
  
  // Pairs with other cards in hand
  const pairs = hand.filter(c => c.id !== card.id && c.rank === card.rank).length
  value += pairs * 4
  
  // Part of potential runs
  const rankValues = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
    '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
  }
  const cardRankValue = rankValues[card.rank]
  
  // Check for consecutive cards
  const consecutive = hand.filter(c => {
    const otherRank = rankValues[c.rank]
    return Math.abs(otherRank - cardRankValue) === 1
  }).length
  
  if (consecutive >= 2) value += 3 // Potential for runs
  else if (consecutive === 1) value += 1
  
  // Same suit cards (flush potential)
  const sameSuit = hand.filter(c => c.suit === card.suit).length
  if (sameSuit >= 3) value += 2
  
  return value
}

/**
 * Simple difficulty setting (for future enhancement)
 */
export function setAIDifficulty(level) {
  // Easy: More random choices
  // Medium: Balanced strategy (default)
  // Hard: Optimal play
  return level || 'medium'
}

/**
 * Add randomness to AI decisions (for personality)
 */
function addRandomness(choices, randomnessFactor = 0.1) {
  return choices.map(choice => ({
    ...choice,
    score: choice.score + (Math.random() - 0.5) * randomnessFactor * 10
  }))
}

/**
 * AI decision for counting (automatic, no choice needed)
 * Returns formatted announcement of score
 */
export function announceScore(hand, cutCard, isCrib) {
  const result = scoreHand(hand, cutCard, isCrib)
  
  if (result.total === 0) {
    return 'No score'
  }
  
  const reasons = result.breakdown.map(b => b.reason).join(', ')
  return `${result.total} point${result.total !== 1 ? 's' : ''}: ${reasons}`
}
