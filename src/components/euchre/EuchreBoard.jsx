import { useState, useEffect, useCallback, useRef } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────

const SUITS = ['♠', '♣', '♥', '♦']
const SUIT_NAMES = { '♠': 'Spades', '♣': 'Clubs', '♥': 'Hearts', '♦': 'Diamonds' }
const SUIT_COLORS = { '♠': 'black', '♣': 'black', '♥': 'red', '♦': 'red' }
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A']

// Positions: 0=South(human), 1=West, 2=North, 3=East
const POSITIONS = ['South', 'West', 'North', 'East']
const PARTNERSHIPS = { 0: [0, 2], 1: [1, 3] } // N/S vs E/W

// ── Deck & Card Logic ────────────────────────────────────────────────────────

function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

function shuffle(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function getOpposite(suit) {
  if (suit === '♠') return '♣'
  if (suit === '♣') return '♠'
  if (suit === '♥') return '♦'
  return '♥'
}

function isLeftBower(card, trump) {
  return card.rank === 'J' && card.suit === getOpposite(trump)
}

function isRightBower(card, trump) {
  return card.rank === 'J' && card.suit === trump
}

function getEffectiveSuit(card, trump) {
  // Left bower counts as trump suit
  if (isLeftBower(card, trump)) return trump
  return card.suit
}

function getCardValue(card, trump) {
  // Higher value = stronger card
  const effSuit = getEffectiveSuit(card, trump)
  if (effSuit !== trump) {
    // Non-trump: A=6, K=5, Q=4, J=3, 10=2, 9=1
    const vals = { A: 6, K: 5, Q: 4, J: 3, '10': 2, '9': 1 }
    return vals[card.rank] || 0
  }
  // Trump suit: Right bower=9, Left bower=8, A=7, K=6, Q=5, (J=4 for non-bower), 10=3, 9=2
  if (isRightBower(card, trump)) return 9
  if (isLeftBower(card, trump)) return 8
  const vals = { A: 7, K: 6, Q: 5, J: 4, '10': 3, '9': 2 }
  return vals[card.rank] || 0
}

function cardKey(card) {
  return `${card.rank}${card.suit}`
}

// ── AI Logic ─────────────────────────────────────────────────────────────────

function aiDecideBid(hand, upCard, position, dealer, round) {
  // Simple AI bidding strategy
  // Round 1: Order up if dealer and have 2+ trump, or if strong hand
  // Round 2: Call trump if have strong suit
  
  if (round === 1) {
    const trump = upCard.suit
    const trumpCards = hand.filter(c => getEffectiveSuit(c, trump) === trump)
    const hasRightBower = trumpCards.some(c => isRightBower(c, trump))
    const hasLeftBower = trumpCards.some(c => isLeftBower(c, trump))
    
    if (position === dealer) {
      // Dealer: order up if 2+ trump or has bower
      if (trumpCards.length >= 2 || hasRightBower || hasLeftBower) {
        return { action: 'orderUp', alone: false }
      }
    } else {
      // Non-dealer: order up if 3+ trump or has both bowers
      if (trumpCards.length >= 3 || (hasRightBower && hasLeftBower)) {
        return { action: 'orderUp', alone: false }
      }
    }
    return { action: 'pass' }
  } else {
    // Round 2: Call trump from strongest suit (not upCard suit)
    const forbidden = upCard.suit
    let bestSuit = null
    let bestCount = 0
    
    for (const suit of SUITS) {
      if (suit === forbidden) continue
      const suitCards = hand.filter(c => getEffectiveSuit(c, suit) === suit)
      if (suitCards.length > bestCount) {
        bestCount = suitCards.length
        bestSuit = suit
      }
    }
    
    if (position === dealer) {
      // Dealer must call something (stick the dealer rule)
      if (!bestSuit) bestSuit = SUITS.find(s => s !== forbidden)
      return { action: 'callTrump', suit: bestSuit, alone: false }
    } else {
      // Non-dealer: call if 3+ cards in suit
      if (bestCount >= 3) {
        return { action: 'callTrump', suit: bestSuit, alone: false }
      }
      return { action: 'pass' }
    }
  }
}

function aiChooseDiscard(hand, trump) {
  // Discard lowest non-trump card, or lowest trump if all trump
  const nonTrump = hand.filter(c => getEffectiveSuit(c, trump) !== trump)
  if (nonTrump.length > 0) {
    let lowest = nonTrump[0]
    let lowestVal = getCardValue(lowest, trump)
    for (const card of nonTrump) {
      const val = getCardValue(card, trump)
      if (val < lowestVal) {
        lowestVal = val
        lowest = card
      }
    }
    return lowest
  }
  // All trump: discard lowest
  let lowest = hand[0]
  let lowestVal = getCardValue(lowest, trump)
  for (const card of hand) {
    const val = getCardValue(card, trump)
    if (val < lowestVal) {
      lowestVal = val
      lowest = card
    }
  }
  return lowest
}

function aiPlayCard(hand, trick, trump, leadSuit) {
  // Simple AI card play
  const playable = hand.filter(card => canPlayCard(card, hand, trump, leadSuit))
  
  if (playable.length === 0) return hand[0] // Shouldn't happen
  if (playable.length === 1) return playable[0]
  
  // If leading, play highest trump or highest card
  if (trick.length === 0) {
    return playable.reduce((best, card) => 
      getCardValue(card, trump) > getCardValue(best, trump) ? card : best
    )
  }
  
  // If following, try to win or dump lowest
  const currentWinner = getWinningCard(trick, trump, leadSuit)
  const canWin = playable.filter(c => 
    getEffectiveSuit(c, trump) === leadSuit &&
    getCardValue(c, trump) > getCardValue(currentWinner, trump)
  )
  
  if (canWin.length > 0) {
    // Win with lowest winning card
    return canWin.reduce((best, card) =>
      getCardValue(card, trump) < getCardValue(best, trump) ? card : best
    )
  }
  
  // Can't win: dump lowest card
  return playable.reduce((best, card) =>
    getCardValue(card, trump) < getCardValue(best, trump) ? card : best
  )
}

function canPlayCard(card, hand, trump, leadSuit) {
  if (!leadSuit) return true // Leading: can play any card
  
  const effSuit = getEffectiveSuit(card, trump)
  if (effSuit === leadSuit) return true // Can always follow suit
  
  // Check if we have any cards of lead suit
  const hasSuit = hand.some(c => getEffectiveSuit(c, trump) === leadSuit)
  return !hasSuit // Can only play off-suit if we don't have lead suit
}

function getWinningCard(trick, trump, leadSuit) {
  if (trick.length === 0) return null
  
  let winner = trick[0].card
  let winnerValue = getCardValue(winner, trump)
  let winnerSuit = getEffectiveSuit(winner, trump)
  
  for (let i = 1; i < trick.length; i++) {
    const card = trick[i].card
    const suit = getEffectiveSuit(card, trump)
    const value = getCardValue(card, trump)
    
    // Trump beats non-trump
    if (suit === trump && winnerSuit !== trump) {
      winner = card
      winnerValue = value
      winnerSuit = suit
    } else if (suit === trump && winnerSuit === trump) {
      // Both trump: higher wins
      if (value > winnerValue) {
        winner = card
        winnerValue = value
        winnerSuit = suit
      }
    } else if (winnerSuit !== trump && suit === leadSuit && winnerSuit !== leadSuit) {
      // Winner is off-suit, this card follows lead suit
      winner = card
      winnerValue = value
      winnerSuit = suit
    } else if (suit === leadSuit && winnerSuit === leadSuit) {
      // Both follow lead suit: higher wins
      if (value > winnerValue) {
        winner = card
        winnerValue = value
        winnerSuit = suit
      }
    }
  }
  
  return winner
}

// ── State Management ─────────────────────────────────────────────────────────

function initGame() {
  return {
    phase: 'deal', // 'deal' | 'bidRound1' | 'bidRound2' | 'discard' | 'play' | 'handEnd' | 'gameEnd'
    dealer: 0,
    currentPlayer: 1, // Player whose turn it is
    hands: [[], [], [], []], // Cards for each player
    upCard: null,
    trump: null,
    maker: null, // Position that called trump
    goingAlone: false,
    alonePlayer: null,
    bidPasses: 0,
    currentTrick: [], // [{ player, card }, ...]
    trickLeader: null,
    tricksWon: [0, 0], // Tricks won by each team this hand
    scores: [0, 0], // Game score for each team
    message: '',
    handNumber: 1,
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EuchreBoard() {
  const [game, setGame] = useState(initGame)
  const timeoutRef = useRef(null)
  const [needsInitialDeal, setNeedsInitialDeal] = useState(true)
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])
  
  const aiTakeTurn = useCallback(() => {
    setGame(g => {
      if (g.currentPlayer === 0) return g // Human's turn, don't AI
      
      if (g.phase === 'bidRound1' || g.phase === 'bidRound2') {
        const decision = aiDecideBid(
          g.hands[g.currentPlayer],
          g.upCard,
          g.currentPlayer,
          g.dealer,
          g.phase === 'bidRound1' ? 1 : 2
        )
        
        if (decision.action === 'pass') {
          const nextPlayer = (g.currentPlayer + 1) % 4
          const newPasses = g.bidPasses + 1
          
          if (g.phase === 'bidRound1' && nextPlayer === (g.dealer + 1) % 4) {
            // End of round 1, start round 2
            const newState = {
              ...g,
              phase: 'bidRound2',
              currentPlayer: nextPlayer,
              bidPasses: 0,
              message: `${POSITIONS[nextPlayer]} to call trump`,
            }
            
            if (nextPlayer !== 0) {
              timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
            }
            return newState
          } else if (g.phase === 'bidRound2' && newPasses === 3) {
            // Dealer must call (stick the dealer)
            const finalDecision = aiDecideBid(
              g.hands[g.dealer],
              g.upCard,
              g.dealer,
              g.dealer,
              2
            )
            
            const trump = finalDecision.suit
            const newState = {
              ...g,
              phase: 'play',
              trump,
              maker: g.dealer,
              currentPlayer: (g.dealer + 1) % 4,
              trickLeader: (g.dealer + 1) % 4,
              message: `${POSITIONS[g.dealer]} called ${SUIT_NAMES[trump]}. ${POSITIONS[(g.dealer + 1) % 4]} leads`,
            }
            
            if ((g.dealer + 1) % 4 !== 0) {
              timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
            }
            return newState
          } else {
            const newState = {
              ...g,
              currentPlayer: nextPlayer,
              bidPasses: newPasses,
              message: `${POSITIONS[g.currentPlayer]} passes. ${POSITIONS[nextPlayer]} to bid`,
            }
            
            if (nextPlayer !== 0) {
              timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
            }
            return newState
          }
        } else if (decision.action === 'orderUp') {
          const trump = g.upCard.suit
          const newHands = [...g.hands]
          newHands[g.dealer].push(g.upCard)
          
          const newState = {
            ...g,
            phase: 'discard',
            trump,
            maker: g.currentPlayer,
            hands: newHands,
            currentPlayer: g.dealer,
            message: `${POSITIONS[g.currentPlayer]} ordered up ${SUIT_NAMES[trump]}. ${POSITIONS[g.dealer]} to discard`,
          }
          
          if (g.dealer !== 0) {
            timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
          }
          return newState
        } else if (decision.action === 'callTrump') {
          const trump = decision.suit
          const newState = {
            ...g,
            phase: 'play',
            trump,
            maker: g.currentPlayer,
            currentPlayer: (g.dealer + 1) % 4,
            trickLeader: (g.dealer + 1) % 4,
            message: `${POSITIONS[g.currentPlayer]} called ${SUIT_NAMES[trump]}. ${POSITIONS[(g.dealer + 1) % 4]} leads`,
          }
          
          if ((g.dealer + 1) % 4 !== 0) {
            timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
          }
          return newState
        }
      } else if (g.phase === 'discard') {
        const toDiscard = aiChooseDiscard(g.hands[g.currentPlayer], g.trump)
        const newHand = g.hands[g.currentPlayer].filter(c => cardKey(c) !== cardKey(toDiscard))
        const newHands = [...g.hands]
        newHands[g.currentPlayer] = newHand
        
        const firstPlayer = (g.dealer + 1) % 4
        const newState = {
          ...g,
          phase: 'play',
          hands: newHands,
          currentPlayer: firstPlayer,
          trickLeader: firstPlayer,
          message: `${POSITIONS[g.currentPlayer]} discarded. ${POSITIONS[firstPlayer]} leads`,
        }
        
        if (firstPlayer !== 0) {
          timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
        }
        return newState
      } else if (g.phase === 'play') {
        const leadSuit = g.currentTrick.length > 0 
          ? getEffectiveSuit(g.currentTrick[0].card, g.trump)
          : null
        
        const card = aiPlayCard(g.hands[g.currentPlayer], g.currentTrick, g.trump, leadSuit)
        const newHand = g.hands[g.currentPlayer].filter(c => cardKey(c) !== cardKey(card))
        const newHands = [...g.hands]
        newHands[g.currentPlayer] = newHand
        
        const newTrick = [...g.currentTrick, { player: g.currentPlayer, card }]
        
        if (newTrick.length === 4) {
          // Trick complete
          const leadSuitFinal = getEffectiveSuit(newTrick[0].card, g.trump)
          const winningCard = getWinningCard(newTrick, g.trump, leadSuitFinal)
          const winner = newTrick.find(t => cardKey(t.card) === cardKey(winningCard)).player
          const winnerTeam = PARTNERSHIPS[0].includes(winner) ? 0 : 1
          
          const newTricksWon = [...g.tricksWon]
          newTricksWon[winnerTeam]++
          
          const allPlayed = newHands.every(h => h.length === 0)
          
          if (allPlayed) {
            // Hand over
            const makerTeam = PARTNERSHIPS[0].includes(g.maker) ? 0 : 1
            const makerTricks = newTricksWon[makerTeam]
            let points = 0
            
            if (makerTricks >= 3) {
              points = makerTricks === 5 ? 2 : 1
            } else {
              // Euchred: other team gets 2 points
              const otherTeam = makerTeam === 0 ? 1 : 0
              const newScores = [...g.scores]
              newScores[otherTeam] += 2
              
              const gameOver = newScores[0] >= 10 || newScores[1] >= 10
              
              return {
                ...g,
                phase: gameOver ? 'gameEnd' : 'handEnd',
                hands: newHands,
                currentTrick: [],
                tricksWon: newTricksWon,
                scores: newScores,
                message: `Euchred! ${makerTeam === 0 ? 'East/West' : 'North/South'} wins 2 points`,
              }
            }
            
            const newScores = [...g.scores]
            newScores[makerTeam] += points
            
            const gameOver = newScores[0] >= 10 || newScores[1] >= 10
            
            return {
              ...g,
              phase: gameOver ? 'gameEnd' : 'handEnd',
              hands: newHands,
              currentTrick: [],
              tricksWon: newTricksWon,
              scores: newScores,
              message: `${makerTeam === 0 ? 'North/South' : 'East/West'} wins ${points} point(s)`,
            }
          } else {
            // Next trick
            const newState = {
              ...g,
              hands: newHands,
              currentTrick: [],
              tricksWon: newTricksWon,
              currentPlayer: winner,
              trickLeader: winner,
              message: `${POSITIONS[winner]} won the trick`,
            }
            
            if (winner !== 0) {
              timeoutRef.current = setTimeout(() => aiTakeTurn(), 1200)
            }
            return newState
          }
        } else {
          // Trick continues
          const nextPlayer = (g.currentPlayer + 1) % 4
          const newState = {
            ...g,
            hands: newHands,
            currentTrick: newTrick,
            currentPlayer: nextPlayer,
            message: nextPlayer === 0 ? 'Your turn' : `${POSITIONS[nextPlayer]} to play`,
          }
          
          if (nextPlayer !== 0) {
            timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
          }
          return newState
        }
      }
      
      return g
    })
  }, [])
  
  const dealHand = useCallback(() => {
    setGame(g => {
      const deck = shuffle(createDeck())
      const hands = [[], [], [], []]
      
      // Deal 5 cards to each player (2-3-2 or 3-2-3 pattern)
      let idx = 0
      for (let round = 0; round < 2; round++) {
        for (let player = 0; player < 4; player++) {
          const dealTo = (g.dealer + 1 + player) % 4
          const count = round === 0 ? (player < 2 ? 3 : 2) : (player < 2 ? 2 : 3)
          hands[dealTo].push(...deck.slice(idx, idx + count))
          idx += count
        }
      }
      
      const upCard = deck[idx]
      const firstBidder = (g.dealer + 1) % 4
      
      const newState = {
        ...g,
        phase: 'bidRound1',
        hands,
        upCard,
        currentPlayer: firstBidder,
        bidPasses: 0,
        currentTrick: [],
        tricksWon: [0, 0],
        trump: null,
        maker: null,
        goingAlone: false,
        alonePlayer: null,
        message: `${POSITIONS[firstBidder]} to bid`,
      }
      
      // AI bids immediately if not human
      if (firstBidder !== 0) {
        timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
      }
      
      return newState
    })
  }, [aiTakeTurn])
  
  const startNewHand = useCallback(() => {
    setGame(g => {
      const nextDealer = (g.dealer + 1) % 4
      const deck = shuffle(createDeck())
      const hands = [[], [], [], []]
      
      let idx = 0
      for (let round = 0; round < 2; round++) {
        for (let player = 0; player < 4; player++) {
          const dealTo = (nextDealer + 1 + player) % 4
          const count = round === 0 ? (player < 2 ? 3 : 2) : (player < 2 ? 2 : 3)
          hands[dealTo].push(...deck.slice(idx, idx + count))
          idx += count
        }
      }
      
      const upCard = deck[idx]
      const firstBidder = (nextDealer + 1) % 4
      
      const newState = {
        ...initGame(),
        dealer: nextDealer,
        scores: g.scores,
        handNumber: g.handNumber + 1,
        phase: 'bidRound1',
        hands,
        upCard,
        currentPlayer: firstBidder,
        message: `${POSITIONS[firstBidder]} to bid`,
      }
      
      // Trigger AI if not human
      if (firstBidder !== 0) {
        timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
      }
      
      return newState
    })
  }, [aiTakeTurn])
  
  const handleBid = useCallback((action, suit = null) => {
    setGame(g => {
      if (g.currentPlayer !== 0) return g // Not human's turn
      
      if (action === 'pass') {
        const nextPlayer = (g.currentPlayer + 1) % 4
        const newPasses = g.bidPasses + 1
        
        if (g.phase === 'bidRound1' && nextPlayer === (g.dealer + 1) % 4) {
          // End of round 1
          const newState = {
            ...g,
            phase: 'bidRound2',
            currentPlayer: nextPlayer,
            bidPasses: 0,
            message: `${POSITIONS[nextPlayer]} to call trump`,
          }
          
          if (nextPlayer !== 0) {
            timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
          }
          return newState
        } else if (g.phase === 'bidRound2' && newPasses === 3) {
          // Dealer stuck
          const trump = SUITS.find(s => s !== g.upCard.suit)
          return {
            ...g,
            phase: 'play',
            trump,
            maker: g.dealer,
            currentPlayer: (g.dealer + 1) % 4,
            trickLeader: (g.dealer + 1) % 4,
            message: `${POSITIONS[g.dealer]} stuck with ${SUIT_NAMES[trump]}`,
          }
        } else {
          const newState = {
            ...g,
            currentPlayer: nextPlayer,
            bidPasses: newPasses,
            message: `${POSITIONS[nextPlayer]} to bid`,
          }
          
          if (nextPlayer !== 0) {
            timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
          }
          return newState
        }
      } else if (action === 'orderUp') {
        const trump = g.upCard.suit
        const newHands = [...g.hands]
        newHands[g.dealer].push(g.upCard)
        
        const newState = {
          ...g,
          phase: 'discard',
          trump,
          maker: 0,
          hands: newHands,
          currentPlayer: g.dealer,
          message: `You ordered up ${SUIT_NAMES[trump]}. ${POSITIONS[g.dealer]} to discard`,
        }
        
        if (g.dealer !== 0) {
          timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
        }
        return newState
      } else if (action === 'callTrump') {
        const newState = {
          ...g,
          phase: 'play',
          trump: suit,
          maker: 0,
          currentPlayer: (g.dealer + 1) % 4,
          trickLeader: (g.dealer + 1) % 4,
          message: `You called ${SUIT_NAMES[suit]}. ${POSITIONS[(g.dealer + 1) % 4]} leads`,
        }
        
        if ((g.dealer + 1) % 4 !== 0) {
          timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
        }
        return newState
      }
      
      return g
    })
  }, [aiTakeTurn])
  
  const handleDiscard = useCallback((card) => {
    setGame(g => {
      if (g.phase !== 'discard' || g.currentPlayer !== 0) return g
      
      const newHand = g.hands[0].filter(c => cardKey(c) !== cardKey(card))
      const newHands = [...g.hands]
      newHands[0] = newHand
      
      const firstPlayer = (g.dealer + 1) % 4
      const newState = {
        ...g,
        phase: 'play',
        hands: newHands,
        currentPlayer: firstPlayer,
        trickLeader: firstPlayer,
        message: `${POSITIONS[firstPlayer]} leads`,
      }
      
      if (firstPlayer !== 0) {
        timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
      }
      return newState
    })
  }, [aiTakeTurn])
  
  const handlePlayCard = useCallback((card) => {
    setGame(g => {
      if (g.phase !== 'play' || g.currentPlayer !== 0) return g
      
      const leadSuit = g.currentTrick.length > 0
        ? getEffectiveSuit(g.currentTrick[0].card, g.trump)
        : null
      
      if (!canPlayCard(card, g.hands[0], g.trump, leadSuit)) {
        return { ...g, message: 'Must follow suit!' }
      }
      
      const newHand = g.hands[0].filter(c => cardKey(c) !== cardKey(card))
      const newHands = [...g.hands]
      newHands[0] = newHand
      
      const newTrick = [...g.currentTrick, { player: 0, card }]
      
      if (newTrick.length === 4) {
        // Trick complete
        const leadSuitFinal = getEffectiveSuit(newTrick[0].card, g.trump)
        const winningCard = getWinningCard(newTrick, g.trump, leadSuitFinal)
        const winner = newTrick.find(t => cardKey(t.card) === cardKey(winningCard)).player
        const winnerTeam = PARTNERSHIPS[0].includes(winner) ? 0 : 1
        
        const newTricksWon = [...g.tricksWon]
        newTricksWon[winnerTeam]++
        
        const allPlayed = newHands.every(h => h.length === 0)
        
        if (allPlayed) {
          // Hand over
          const makerTeam = PARTNERSHIPS[0].includes(g.maker) ? 0 : 1
          const makerTricks = newTricksWon[makerTeam]
          let points = 0
          
          if (makerTricks >= 3) {
            points = makerTricks === 5 ? 2 : 1
          } else {
            // Euchred
            const otherTeam = makerTeam === 0 ? 1 : 0
            const newScores = [...g.scores]
            newScores[otherTeam] += 2
            
            const gameOver = newScores[0] >= 10 || newScores[1] >= 10
            
            return {
              ...g,
              phase: gameOver ? 'gameEnd' : 'handEnd',
              hands: newHands,
              currentTrick: [],
              tricksWon: newTricksWon,
              scores: newScores,
              message: `Euchred! ${makerTeam === 0 ? 'East/West' : 'North/South'} wins 2 points`,
            }
          }
          
          const newScores = [...g.scores]
          newScores[makerTeam] += points
          
          const gameOver = newScores[0] >= 10 || newScores[1] >= 10
          
          return {
            ...g,
            phase: gameOver ? 'gameEnd' : 'handEnd',
            hands: newHands,
            currentTrick: [],
            tricksWon: newTricksWon,
            scores: newScores,
            message: `${makerTeam === 0 ? 'North/South' : 'East/West'} wins ${points} point(s)`,
          }
        } else {
          // Next trick
          const newState = {
            ...g,
            hands: newHands,
            currentTrick: [],
            tricksWon: newTricksWon,
            currentPlayer: winner,
            trickLeader: winner,
            message: `${POSITIONS[winner]} won the trick`,
          }
          
          if (winner !== 0) {
            timeoutRef.current = setTimeout(() => aiTakeTurn(), 1200)
          }
          return newState
        }
      } else {
        // Trick continues
        const nextPlayer = (g.currentPlayer + 1) % 4
        const newState = {
          ...g,
          hands: newHands,
          currentTrick: newTrick,
          currentPlayer: nextPlayer,
          message: nextPlayer === 0 ? 'Your turn' : `${POSITIONS[nextPlayer]} to play`,
        }
        
        if (nextPlayer !== 0) {
          timeoutRef.current = setTimeout(() => aiTakeTurn(), 800)
        }
        return newState
      }
    })
  }, [aiTakeTurn])
  
  // Initial deal on mount
  useEffect(() => {
    if (needsInitialDeal) {
      setNeedsInitialDeal(false)
      // Small delay before initial deal
      timeoutRef.current = setTimeout(() => {
        dealHand()
      }, 100)
    }
  }, [needsInitialDeal, dealHand])
  
  const myTeam = 0 // N/S
  const theirTeam = 1 // E/W
  
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">♠ Euchre ♥</h2>
        <p className="text-sm opacity-70">
          24-card trick-taking game • First team to 10 points wins
        </p>
      </div>
      
      {/* Score Display */}
      <div className="flex gap-8 items-center">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-500">{game.scores[myTeam]}</div>
          <div className="text-xs uppercase opacity-60">North/South</div>
          <div className="text-xs opacity-40">(You & AI)</div>
        </div>
        <div className="text-2xl opacity-30">vs</div>
        <div className="text-center">
          <div className="text-3xl font-bold text-red-500">{game.scores[theirTeam]}</div>
          <div className="text-xs uppercase opacity-60">East/West</div>
          <div className="text-xs opacity-40">(AI & AI)</div>
        </div>
      </div>
      
      {/* Game Info */}
      <div className="flex gap-6 text-sm">
        {game.trump && (
          <div>
            <span className="opacity-60">Trump: </span>
            <span className="font-bold" style={{ color: SUIT_COLORS[game.trump] }}>
              {SUIT_NAMES[game.trump]} {game.trump}
            </span>
          </div>
        )}
        {game.phase === 'play' && (
          <div>
            <span className="opacity-60">Tricks: </span>
            <span className="font-bold">N/S {game.tricksWon[0]} – {game.tricksWon[1]} E/W</span>
          </div>
        )}
        <div>
          <span className="opacity-60">Dealer: </span>
          <span className="font-bold">{POSITIONS[game.dealer]}</span>
        </div>
      </div>
      
      {/* Message */}
      <div className="text-center font-medium text-lg" style={{ minHeight: '1.75rem' }}>
        {game.message}
      </div>
      
      {/* Up Card (during bidding) */}
      {(game.phase === 'bidRound1' || game.phase === 'bidRound2') && game.upCard && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs uppercase opacity-60">Up Card</div>
          <Card card={game.upCard} faceUp />
        </div>
      )}
      
      {/* Current Trick */}
      {game.phase === 'play' && game.currentTrick.length > 0 && (
        <div className="flex gap-4 items-center">
          {game.currentTrick.map((t, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Card card={t.card} faceUp />
              <div className="text-xs opacity-60">{POSITIONS[t.player]}</div>
            </div>
          ))}
        </div>
      )}
      
      {/* Player Hand */}
      {game.hands[0].length > 0 && (
        <div className="flex flex-col items-center gap-3">
          <div className="text-sm uppercase opacity-60">Your Hand</div>
          <div className="flex gap-2 flex-wrap justify-center">
            {game.hands[0].map((card, i) => {
              const leadSuit = game.currentTrick.length > 0
                ? getEffectiveSuit(game.currentTrick[0].card, game.trump)
                : null
              const playable = game.phase === 'play' && game.currentPlayer === 0
                ? canPlayCard(card, game.hands[0], game.trump, leadSuit)
                : false
              const clickable = 
                (game.phase === 'play' && game.currentPlayer === 0) ||
                (game.phase === 'discard' && game.currentPlayer === 0)
              
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (game.phase === 'play') handlePlayCard(card)
                    else if (game.phase === 'discard') handleDiscard(card)
                  }}
                  disabled={!clickable || (game.phase === 'play' && !playable)}
                  className="transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Card card={card} faceUp />
                </button>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Bidding Controls */}
      {(game.phase === 'bidRound1' || game.phase === 'bidRound2') && game.currentPlayer === 0 && (
        <div className="flex gap-3 flex-wrap justify-center">
          {game.phase === 'bidRound1' && (
            <>
              <button
                onClick={() => handleBid('orderUp')}
                className="btn-primary bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
              >
                Order Up {game.upCard && SUIT_NAMES[game.upCard.suit]}
              </button>
              <button
                onClick={() => handleBid('pass')}
                className="btn-ghost px-6 py-2 rounded"
              >
                Pass
              </button>
            </>
          )}
          {game.phase === 'bidRound2' && (
            <>
              {SUITS.filter(s => s !== game.upCard.suit).map(suit => (
                <button
                  key={suit}
                  onClick={() => handleBid('callTrump', suit)}
                  className="btn-primary bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  style={{ color: SUIT_COLORS[suit] === 'red' ? '#fca5a5' : 'white' }}
                >
                  Call {SUIT_NAMES[suit]} {suit}
                </button>
              ))}
              {game.currentPlayer !== game.dealer && (
                <button
                  onClick={() => handleBid('pass')}
                  className="btn-ghost px-6 py-2 rounded"
                >
                  Pass
                </button>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Hand End / Game End */}
      {(game.phase === 'handEnd' || game.phase === 'gameEnd') && (
        <div className="flex flex-col items-center gap-4 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {game.phase === 'gameEnd' ? (
            <>
              <div className="text-2xl font-bold">
                {game.scores[myTeam] >= 10 ? '🎉 You Win!' : '😔 You Lose'}
              </div>
              <div className="text-sm">
                Final Score: N/S {game.scores[0]} – {game.scores[1]} E/W
              </div>
              <button
                onClick={() => {
                  setGame(initGame())
                  setNeedsInitialDeal(true)
                }}
                className="btn-primary bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
              >
                New Game
              </button>
            </>
          ) : (
            <>
              <div className="text-xl font-bold">Hand Over</div>
              <div className="text-sm">{game.message}</div>
              <div className="text-sm">Score: N/S {game.scores[0]} – {game.scores[1]} E/W</div>
              <button
                onClick={startNewHand}
                className="btn-primary bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
              >
                Next Hand
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Card Component ───────────────────────────────────────────────────────────

function Card({ card, faceUp = true }) {
  if (!faceUp) {
    return (
      <div
        className="card-back"
        style={{
          width: 60,
          height: 84,
          borderRadius: 6,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: '2px solid rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    )
  }
  
  const color = SUIT_COLORS[card.suit]
  
  return (
    <div
      className="card"
      style={{
        width: 60,
        height: 84,
        borderRadius: 6,
        background: 'white',
        border: '2px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div>{card.rank}</div>
      <div style={{ fontSize: '1.25rem' }}>{card.suit}</div>
    </div>
  )
}
