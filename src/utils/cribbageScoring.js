/**
 * Cribbage Scoring Utilities
 * Handles all scoring logic for hands, pegging, and the crib
 */

import { getCardValue } from './cribbageDeck'

/**
 * Score a hand (4 cards + cut card)
 * Returns { total, breakdown: [{ points, reason }] }
 */
export function scoreHand(hand, cutCard, isCrib = false) {
  const allCards = [...hand, cutCard]
  const breakdown = []
  
  // 1. Fifteens (2 points each)
  const fifteens = findFifteens(allCards)
  if (fifteens > 0) {
    breakdown.push({ points: fifteens * 2, reason: `${fifteens} fifteen${fifteens > 1 ? 's' : ''}` })
  }
  
  // 2. Pairs (2 points each)
  const pairs = findPairs(allCards)
  if (pairs > 0) {
    breakdown.push({ points: pairs * 2, reason: `${pairs} pair${pairs > 1 ? 's' : ''}` })
  }
  
  // 3. Runs (length of run points each)
  const runs = findRuns(allCards)
  if (runs.total > 0) {
    breakdown.push({ points: runs.total, reason: runs.description })
  }
  
  // 4. Flush (4 or 5 points)
  const flush = findFlush(hand, cutCard, isCrib)
  if (flush > 0) {
    breakdown.push({ points: flush, reason: `flush of ${flush}` })
  }
  
  // 5. Nobs (1 point if Jack of same suit as cut card)
  const nobs = findNobs(hand, cutCard)
  if (nobs > 0) {
    breakdown.push({ points: nobs, reason: 'nobs (Jack)' })
  }
  
  const total = breakdown.reduce((sum, item) => sum + item.points, 0)
  
  return { total, breakdown }
}

/**
 * Find all combinations that sum to 15
 * Returns count of fifteens
 */
export function findFifteens(cards) {
  let count = 0
  
  // Check all possible combinations (2^n - 1 non-empty subsets)
  const n = cards.length
  for (let i = 1; i < (1 << n); i++) {
    let sum = 0
    for (let j = 0; j < n; j++) {
      if (i & (1 << j)) {
        sum += cards[j].value
      }
    }
    if (sum === 15) count++
  }
  
  return count
}

/**
 * Find all pairs in the cards
 * Returns count of pairs (pair royal = 3 pairs, double pair royal = 6 pairs)
 */
export function findPairs(cards) {
  let count = 0
  
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (cards[i].rank === cards[j].rank) {
        count++
      }
    }
  }
  
  return count
}

/**
 * Find the longest run(s) in the cards
 * Returns { total: points, description: string }
 */
export function findRuns(cards) {
  // Convert ranks to numeric values for run detection
  const rankValues = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
    '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
  }
  
  const values = cards.map(c => rankValues[c.rank]).sort((a, b) => a - b)
  
  // Check for runs of length 5, 4, then 3
  for (let length = 5; length >= 3; length--) {
    const runs = findRunsOfLength(values, length)
    if (runs.count > 0) {
      return {
        total: runs.count * length,
        description: runs.count > 1 
          ? `${runs.count} runs of ${length}` 
          : `run of ${length}`
      }
    }
  }
  
  return { total: 0, description: '' }
}

/**
 * Helper to find runs of a specific length
 */
function findRunsOfLength(sortedValues, length) {
  if (sortedValues.length < length) return { count: 0 }
  
  // For runs with duplicates, we need to count each combination
  const combinations = getCombinations(sortedValues, length)
  let runCount = 0
  
  for (const combo of combinations) {
    if (isConsecutive(combo)) {
      runCount++
    }
  }
  
  return { count: runCount }
}

/**
 * Get all combinations of n items from array
 */
function getCombinations(arr, n) {
  if (n === 1) return arr.map(x => [x])
  if (n > arr.length) return []
  
  const result = []
  
  function combine(start, combo) {
    if (combo.length === n) {
      result.push([...combo])
      return
    }
    
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i])
      combine(i + 1, combo)
      combo.pop()
    }
  }
  
  combine(0, [])
  return result
}

/**
 * Check if values form a consecutive sequence
 */
function isConsecutive(values) {
  if (values.length < 2) return false
  const sorted = [...values].sort((a, b) => a - b)
  
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      return false
    }
  }
  
  return true
}

/**
 * Find flush in hand
 * In hand: all 4 must be same suit (4 points), or all 5 including cut (5 points)
 * In crib: all 5 must be same suit (5 points only)
 */
export function findFlush(hand, cutCard, isCrib) {
  const handSuit = hand[0].suit
  const allHandSameSuit = hand.every(card => card.suit === handSuit)
  
  if (!allHandSameSuit) return 0
  
  const cutSameSuit = cutCard.suit === handSuit
  
  if (isCrib) {
    // Crib only scores if all 5 cards are same suit
    return cutSameSuit ? 5 : 0
  } else {
    // Regular hand scores 4 for flush in hand, 5 if cut card also matches
    return cutSameSuit ? 5 : 4
  }
}

/**
 * Find "nobs" - Jack of same suit as cut card in hand
 */
export function findNobs(hand, cutCard) {
  const hasNobs = hand.some(card => 
    card.rank === 'J' && card.suit === cutCard.suit
  )
  
  return hasNobs ? 1 : 0
}

/**
 * Score a pegging play
 * Returns { points, reasons: [string] }
 */
export function scorePeggingPlay(playedCards, newCard, peggingCount) {
  const reasons = []
  let points = 0
  
  // Add the new card to played cards
  const allPlayed = [...playedCards.map(p => p.card), newCard]
  const currentCount = peggingCount + newCard.value
  
  // 1. Check for 15 (2 points)
  if (currentCount === 15) {
    points += 2
    reasons.push('fifteen')
  }
  
  // 2. Check for 31 (2 points)
  if (currentCount === 31) {
    points += 2
    reasons.push('thirty-one')
  }
  
  // 3. Check for pairs, pair royal, double pair royal
  // Look at the most recent cards of the same rank
  const pairPoints = scorePeggingPairs(allPlayed)
  if (pairPoints > 0) {
    points += pairPoints
    if (pairPoints === 2) reasons.push('pair')
    else if (pairPoints === 6) reasons.push('pair royal')
    else if (pairPoints === 12) reasons.push('double pair royal')
  }
  
  // 4. Check for runs (must be at least 3 cards)
  const runPoints = scorePeggingRun(allPlayed)
  if (runPoints > 0) {
    points += runPoints
    reasons.push(`run of ${runPoints}`)
  }
  
  return { points, reasons }
}

/**
 * Score pairs during pegging
 * Only the most recent consecutive cards of same rank count
 */
function scorePeggingPairs(playedCards) {
  if (playedCards.length < 2) return 0
  
  const lastCard = playedCards[playedCards.length - 1]
  let matchCount = 1
  
  // Count consecutive cards of same rank going backwards
  for (let i = playedCards.length - 2; i >= 0; i--) {
    if (playedCards[i].rank === lastCard.rank) {
      matchCount++
    } else {
      break
    }
  }
  
  // 2 cards = pair (2 pts), 3 cards = pair royal (6 pts), 4 cards = double pair royal (12 pts)
  if (matchCount === 2) return 2
  if (matchCount === 3) return 6
  if (matchCount === 4) return 12
  
  return 0
}

/**
 * Score runs during pegging
 * Must be at least 3 consecutive cards that form a run
 */
function scorePeggingRun(playedCards) {
  if (playedCards.length < 3) return 0
  
  const rankValues = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
    '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
  }
  
  // Try longest possible run first, working backwards
  for (let length = Math.min(playedCards.length, 7); length >= 3; length--) {
    const lastN = playedCards.slice(-length)
    const values = lastN.map(c => rankValues[c.rank]).sort((a, b) => a - b)
    
    if (isConsecutive(values)) {
      return length
    }
  }
  
  return 0
}

/**
 * Calculate if "Go" should be awarded (1 point)
 * Called when a player cannot play
 */
export function shouldAwardGo(peggingCount) {
  return peggingCount < 31
}

/**
 * Calculate if "Last Card" point should be awarded (1 point)
 * Called when all 8 cards have been played
 */
export function shouldAwardLastCard(playedCards) {
  return playedCards.length === 8
}
