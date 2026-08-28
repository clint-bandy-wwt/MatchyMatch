import { useState, useEffect, useRef } from 'react'
import { 
  isLeftBower, 
  isRightBower, 
  getEffectiveSuit, 
  getCardValue, 
  cardKey, 
  canPlayCard, 
  getWinningCard,
  calculateHandScore,
  getActivePlayers,
  getNextActivePlayer,
  getFirstPlayer
} from './euchreGameLogic'

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

// ── AI Logic ─────────────────────────────────────────────────────────────────

function aiDecideBid(hand, upCard, position, dealer, round) {
  // Simple AI bidding strategy
  if (round === 1) {
    const trump = upCard.suit
    const trumpCards = hand.filter(c => getEffectiveSuit(c, trump) === trump)
    const hasRightBower = trumpCards.some(c => isRightBower(c, trump))
    const hasLeftBower = trumpCards.some(c => isLeftBower(c, trump))
    
    if (position === dealer) {
      if (trumpCards.length >= 2 || hasRightBower || hasLeftBower) {
        return { action: 'orderUp' }
      }
    } else {
      if (trumpCards.length >= 3 || (hasRightBower && hasLeftBower)) {
        return { action: 'orderUp' }
      }
    }
    return { action: 'pass' }
  } else {
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
      if (!bestSuit) bestSuit = SUITS.find(s => s !== forbidden)
      return { action: 'callTrump', suit: bestSuit }
    } else {
      if (bestCount >= 3) {
        return { action: 'callTrump', suit: bestSuit }
      }
      return { action: 'pass' }
    }
  }
}

function aiChooseDiscard(hand, trump) {
  const nonTrump = hand.filter(c => getEffectiveSuit(c, trump) !== trump)
  if (nonTrump.length > 0) {
    return nonTrump.reduce((lowest, card) =>
      getCardValue(card, trump) < getCardValue(lowest, trump) ? card : lowest
    )
  }
  return hand.reduce((lowest, card) =>
    getCardValue(card, trump) < getCardValue(lowest, trump) ? card : lowest
  )
}

function aiPlayCard(hand, trick, trump, leadSuit) {
  const playable = hand.filter(card => canPlayCard(card, hand, trump, leadSuit))
  
  if (playable.length === 0) return hand[0]
  if (playable.length === 1) return playable[0]
  
  if (trick.length === 0) {
    return playable.reduce((best, card) => 
      getCardValue(card, trump) > getCardValue(best, trump) ? card : best
    )
  }
  
  const currentWinner = getWinningCard(trick, trump, leadSuit)
  const canWin = playable.filter(c => 
    getEffectiveSuit(c, trump) === leadSuit &&
    getCardValue(c, trump) > getCardValue(currentWinner, trump)
  )
  
  if (canWin.length > 0) {
    return canWin.reduce((best, card) =>
      getCardValue(card, trump) < getCardValue(best, trump) ? card : best
    )
  }
  
  return playable.reduce((best, card) =>
    getCardValue(card, trump) < getCardValue(best, trump) ? card : best
  )
}

function initGame() {
  return {
    phase: 'deal',
    dealer: 0,
    currentPlayer: 1,
    hands: [[], [], [], []],
    upCard: null,
    trump: null,
    maker: null,
    goingAlone: false,
    bidPasses: 0,
    currentTrick: [],
    tricksWon: [0, 0],
    scores: [0, 0],
    message: '',
    handNumber: 1,
  }
}

// ── Component ────────────────────────────────────────────────────────────────

function dealInitialHand() {
  const deck = shuffle(createDeck())
  const hands = [[], [], [], []]
  let idx = 0
  for (let round = 0; round < 2; round++) {
    for (let player = 0; player < 4; player++) {
      const dealTo = (player + 1) % 4
      const count = round === 0 ? (player < 2 ? 3 : 2) : (player < 2 ? 2 : 3)
      hands[dealTo].push(...deck.slice(idx, idx + count))
      idx += count
    }
  }
  const upCard = deck[idx]
  return { hands, upCard }
}

export default function EuchreBoard() {
  const aiTimeoutRef = useRef(null)
  
  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current)
    }
  }, [])
  
  const [game, setGame] = useState(() => {
    const { hands, upCard } = dealInitialHand()
    return {
      ...initGame(),
      phase: 'bidRound1',
      hands,
      upCard,
      currentPlayer: 1,
      message: 'West to bid',
    }
  })
  
  const processAIBid = (g) => {
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
        return {
          ...g,
          phase: 'bidRound2',
          currentPlayer: nextPlayer,
          bidPasses: 0,
          message: `${POSITIONS[nextPlayer]} to call trump`,
        }
      } else if (g.phase === 'bidRound2' && newPasses === 3 && g.dealer !== 0) {
        // Dealer is stuck - AI dealer must call trump
        const finalDec = aiDecideBid(g.hands[g.dealer], g.upCard, g.dealer, g.dealer, 2)
        return {
          ...g,
          phase: 'play',
          trump: finalDec.suit,
          maker: g.dealer,
          goingAlone: false,  // AI never goes alone
          currentPlayer: getFirstPlayer(g.dealer, g.dealer, false),
          message: `${POSITIONS[g.dealer]} called ${SUIT_NAMES[finalDec.suit]}`,
        }
      } else if (g.phase === 'bidRound2' && newPasses === 3 && g.dealer === 0) {
        // Human dealer is stuck - keep them as current player to show buttons
        return {
          ...g,
          currentPlayer: 0,
          bidPasses: newPasses,
          message: 'You must call trump (dealer stuck)',
        }
      } else {
        return {
          ...g,
          currentPlayer: nextPlayer,
          bidPasses: newPasses,
          message: `${POSITIONS[nextPlayer]} to bid`,
        }
      }
    } else if (decision.action === 'orderUp') {
      const trump = g.upCard.suit
      const newHands = g.hands.map((hand, i) => 
        i === g.dealer ? [...hand, g.upCard] : hand
      )
      
      return {
        ...g,
        phase: 'discard',
        trump,
        maker: g.currentPlayer,
        hands: newHands,
        currentPlayer: g.dealer,
        message: g.dealer === 0 ? 'Choose a card to discard' : `${POSITIONS[g.currentPlayer]} ordered up ${SUIT_NAMES[trump]}`,
      }
    } else if (decision.action === 'callTrump') {
      return {
        ...g,
        phase: 'play',
        trump: decision.suit,
        maker: g.currentPlayer,
        goingAlone: false,  // AI never goes alone
        currentPlayer: getFirstPlayer(g.dealer, g.currentPlayer, false),
        message: `${POSITIONS[g.currentPlayer]} called ${SUIT_NAMES[decision.suit]}`,
      }
    }
    return g
  }
  
  const processAIDiscard = (g) => {
    const toDiscard = aiChooseDiscard(g.hands[g.currentPlayer], g.trump)
    const newHand = g.hands[g.currentPlayer].filter(c => cardKey(c) !== cardKey(toDiscard))
    const newHands = [...g.hands]
    newHands[g.currentPlayer] = newHand
    
    return {
      ...g,
      phase: 'play',
      hands: newHands,
      currentPlayer: getFirstPlayer(g.dealer, g.maker, g.goingAlone),
      message: `${POSITIONS[getFirstPlayer(g.dealer, g.maker, g.goingAlone)]} leads`,
    }
  }
  
  const processAIPlay = (g) => {
    const leadSuit = g.currentTrick.length > 0 
      ? getEffectiveSuit(g.currentTrick[0].card, g.trump)
      : null
    
    const card = aiPlayCard(g.hands[g.currentPlayer], g.currentTrick, g.trump, leadSuit)
    const newHand = g.hands[g.currentPlayer].filter(c => cardKey(c) !== cardKey(card))
    const newHands = [...g.hands]
    newHands[g.currentPlayer] = newHand
    
    const newTrick = [...g.currentTrick, { player: g.currentPlayer, card }]
    const expectedTrickSize = g.goingAlone ? 3 : 4
    
    if (newTrick.length === expectedTrickSize) {
      // Trick is complete
      const leadSuitFinal = getEffectiveSuit(newTrick[0].card, g.trump)
      const winningCard = getWinningCard(newTrick, g.trump, leadSuitFinal)
      const winner = newTrick.find(t => cardKey(t.card) === cardKey(winningCard)).player
      const winnerTeam = PARTNERSHIPS[0].includes(winner) ? 0 : 1
      
      const newTricksWon = [...g.tricksWon]
      newTricksWon[winnerTeam]++
      
      // Check if all active players have played all cards
      const activePlayers = getActivePlayers(g.maker, g.goingAlone)
      const allPlayed = activePlayers.every(p => newHands[p].length === 0)
      
      if (allPlayed) {
        const makerTeam = PARTNERSHIPS[0].includes(g.maker) ? 0 : 1
        const scoreResult = calculateHandScore(makerTeam, newTricksWon, g.goingAlone)
        const newScores = [...g.scores]
        newScores[scoreResult.team] += scoreResult.points
        
        const gameOver = newScores[0] >= 10 || newScores[1] >= 10
        
        return {
          ...g,
          phase: gameOver ? 'gameEnd' : 'handEnd',
          hands: newHands,
          currentTrick: [],
          tricksWon: newTricksWon,
          scores: newScores,
          message: `Hand over: ${
            scoreResult.team === 0 ? 'N/S' : 'E/W'
          } won ${newTricksWon[scoreResult.team]} tricks and scored ${
            scoreResult.points
          } point${scoreResult.points !== 1 ? 's' : ''}`,
        }
      } else {
        return {
          ...g,
          hands: newHands,
          currentTrick: [],
          tricksWon: newTricksWon,
          currentPlayer: winner,
          message: `${POSITIONS[winner]} won the trick`,
        }
      }
    } else {
      const nextPlayer = getNextActivePlayer(g.currentPlayer, g.maker, g.goingAlone)
      return {
        ...g,
        hands: newHands,
        currentTrick: newTrick,
        currentPlayer: nextPlayer,
        message: nextPlayer === 0 ? 'Your turn' : `${POSITIONS[nextPlayer]} to play`,
      }
    }
  }
  
  const processAITurn = () => {
    setGame(g => {
      if (g.currentPlayer === 0) return g
      
      if (g.phase === 'bidRound1' || g.phase === 'bidRound2') {
        return processAIBid(g)
      } else if (g.phase === 'discard') {
        return processAIDiscard(g)
      } else if (g.phase === 'play') {
        return processAIPlay(g)
      }
      return g
    })
  }
  
  // AI turn handler
  useEffect(() => {
    if (game.currentPlayer === 0) return
    if (game.phase === 'handEnd' || game.phase === 'gameEnd' || game.phase === 'deal') return
    
    const delay = game.phase === 'play' && game.currentTrick.length === 0 ? 1200 : 800
    
    aiTimeoutRef.current = setTimeout(() => {
      processAITurn()
    }, delay)
    
    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current)
    }
  }, [game.currentPlayer, game.phase, game.currentTrick.length, processAITurn])
  
  const handleBid = (action, suit = null, alone = false) => {
    setGame(g => {
      if (g.currentPlayer !== 0) return g
      
      if (action === 'pass') {
        const nextPlayer = (g.currentPlayer + 1) % 4
        const newPasses = g.bidPasses + 1
        
        if (g.phase === 'bidRound1' && nextPlayer === (g.dealer + 1) % 4) {
          return {
            ...g,
            phase: 'bidRound2',
            currentPlayer: nextPlayer,
            bidPasses: 0,
            message: `${POSITIONS[nextPlayer]} to call trump`,
          }
        } else if (g.phase === 'bidRound2' && newPasses === 3 && g.dealer === 0) {
          // Human is dealer and stuck - keep them as current player to show buttons
          return {
            ...g,
            currentPlayer: 0,
            bidPasses: newPasses,
            message: 'You must call trump (dealer stuck)',
          }
        } else {
          return {
            ...g,
            currentPlayer: nextPlayer,
            bidPasses: newPasses,
            message: `${POSITIONS[nextPlayer]} to bid`,
          }
        }
      } else if (action === 'orderUp') {
        const trump = g.upCard.suit
        const newHands = g.hands.map((hand, i) => 
          i === g.dealer ? [...hand, g.upCard] : hand
        )
        
        return {
          ...g,
          phase: 'discard',
          trump,
          maker: 0,
          goingAlone: alone,
          hands: newHands,
          currentPlayer: g.dealer,
          message: g.dealer === 0 ? 'Choose a card to discard' : `You ordered up ${SUIT_NAMES[trump]}${alone ? ' (going alone)' : ''}`,
        }
      } else if (action === 'callTrump') {
        return {
          ...g,
          phase: 'play',
          trump: suit,
          maker: 0,
          goingAlone: alone,
          currentPlayer: getFirstPlayer(g.dealer, 0, alone),
          message: `You called ${SUIT_NAMES[suit]}${alone ? ' (going alone)' : ''}`,
        }
      }
      
      return g
    })
  }
  
  const handleDiscard = (card) => {
    setGame(g => {
      if (g.phase !== 'discard' || g.currentPlayer !== 0) return g
      
      const newHand = g.hands[0].filter(c => cardKey(c) !== cardKey(card))
      const newHands = [...g.hands]
      newHands[0] = newHand
      
      return {
        ...g,
        phase: 'play',
        hands: newHands,
        currentPlayer: getFirstPlayer(g.dealer, g.maker, g.goingAlone),
        message: `${POSITIONS[getFirstPlayer(g.dealer, g.maker, g.goingAlone)]} leads`,
      }
    })
  }
  
  const handlePlayCard = (card) => {
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
      const expectedTrickSize = g.goingAlone ? 3 : 4
      
      if (newTrick.length === expectedTrickSize) {
        // Trick is complete
        const leadSuitFinal = getEffectiveSuit(newTrick[0].card, g.trump)
        const winningCard = getWinningCard(newTrick, g.trump, leadSuitFinal)
        const winner = newTrick.find(t => cardKey(t.card) === cardKey(winningCard)).player
        const winnerTeam = PARTNERSHIPS[0].includes(winner) ? 0 : 1
        
        const newTricksWon = [...g.tricksWon]
        newTricksWon[winnerTeam]++
        
        // Check if all active players have played all cards
        const activePlayers = getActivePlayers(g.maker, g.goingAlone)
        const allPlayed = activePlayers.every(p => newHands[p].length === 0)
        
        if (allPlayed) {
          const makerTeam = PARTNERSHIPS[0].includes(g.maker) ? 0 : 1
          const scoreResult = calculateHandScore(makerTeam, newTricksWon, g.goingAlone)
          const newScores = [...g.scores]
          newScores[scoreResult.team] += scoreResult.points
          
          const gameOver = newScores[0] >= 10 || newScores[1] >= 10
          
          return {
            ...g,
            phase: gameOver ? 'gameEnd' : 'handEnd',
            hands: newHands,
            currentTrick: [],
            tricksWon: newTricksWon,
            scores: newScores,
          message: `Hand over: ${
            scoreResult.team === 0 ? 'N/S' : 'E/W'
          } won ${newTricksWon[scoreResult.team]} tricks and scored ${
            scoreResult.points
          } point${scoreResult.points !== 1 ? 's' : ''}`,
          }
        } else {
          return {
            ...g,
            hands: newHands,
            currentTrick: [],
            tricksWon: newTricksWon,
            currentPlayer: winner,
            message: `${POSITIONS[winner]} won the trick`,
          }
        }
      } else {
        const nextPlayer = getNextActivePlayer(g.currentPlayer, g.maker, g.goingAlone)
        return {
          ...g,
          hands: newHands,
          currentTrick: newTrick,
          currentPlayer: nextPlayer,
          message: nextPlayer === 0 ? 'Your turn' : `${POSITIONS[nextPlayer]} to play`,
        }
      }
    })
  }
  
  const startNewHand = () => {
    const nextDealer = (game.dealer + 1) % 4
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
    
    setGame({
      ...initGame(),
      dealer: nextDealer,
      scores: game.scores,
      handNumber: game.handNumber + 1,
      phase: 'bidRound1',
      hands,
      upCard,
      currentPlayer: firstBidder,
      message: `${POSITIONS[firstBidder]} to bid`,
    })
  }
  
  const myTeam = 0
  const theirTeam = 1
  
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">♠ Euchre ♥</h2>
        <p className="text-sm opacity-70">
          24-card trick-taking game • First team to 10 points wins
        </p>
      </div>
      
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
      
      <div className="text-center font-medium text-lg" style={{ minHeight: '1.75rem' }}>
        {game.message}
      </div>
      
      {(game.phase === 'bidRound1' || game.phase === 'bidRound2') && game.upCard && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs uppercase opacity-60">Up Card</div>
          <Card card={game.upCard} faceUp />
        </div>
      )}
      
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
                onClick={() => handleBid('orderUp', null, true)}
                className="btn-primary bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded font-bold"
              >
                Go Alone!
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
                <div key={suit} className="flex gap-2">
                  <button
                    onClick={() => handleBid('callTrump', suit)}
                    className="btn-primary bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    style={{ color: SUIT_COLORS[suit] === 'red' ? '#fca5a5' : 'white' }}
                  >
                    Call {SUIT_NAMES[suit]} {suit}
                  </button>
                  <button
                    onClick={() => handleBid('callTrump', suit, true)}
                    className="btn-primary bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm font-bold"
                  >
                    Alone
                  </button>
                </div>
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
                onClick={() => window.location.reload()}
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
