import { useState, useEffect, useCallback } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♦', '♣']
const SUIT_NAMES = { '♠': 'Spades', '♥': 'Hearts', '♦': 'Diamonds', '♣': 'Clubs' }
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A']
const PLAYERS = ['South', 'West', 'North', 'East']

// Euchre uses partnerships: North-South vs East-West
const PARTNERSHIPS = {
  South: 'North',
  North: 'South',
  East: 'West',
  West: 'East',
}

// ── Deck & Card Utilities ────────────────────────────────────────────────────

function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

function shuffleDeck(deck) {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getCardKey(card) {
  return `${card.rank}${card.suit}`
}

// ── Trump & Bower Logic ──────────────────────────────────────────────────────

function getLeftBowerSuit(trumpSuit) {
  // Left bower is the Jack of the same color
  if (trumpSuit === '♠') return '♣'
  if (trumpSuit === '♣') return '♠'
  if (trumpSuit === '♥') return '♦'
  if (trumpSuit === '♦') return '♥'
  return null
}

function isRightBower(card, trumpSuit) {
  return card.rank === 'J' && card.suit === trumpSuit
}

function isLeftBower(card, trumpSuit) {
  const leftSuit = getLeftBowerSuit(trumpSuit)
  return card.rank === 'J' && card.suit === leftSuit
}

function getEffectiveSuit(card, trumpSuit) {
  // Left bower counts as trump suit
  if (isLeftBower(card, trumpSuit)) return trumpSuit
  return card.suit
}

function getCardStrength(card, trumpSuit, ledSuit) {
  const effectiveSuit = getEffectiveSuit(card, trumpSuit)
  
  // Right bower is strongest
  if (isRightBower(card, trumpSuit)) return 1000
  
  // Left bower is second strongest
  if (isLeftBower(card, trumpSuit)) return 900
  
  // Trump cards
  if (effectiveSuit === trumpSuit) {
    const rankValue = { 'A': 80, 'K': 70, 'Q': 60, '10': 50, '9': 40 }[card.rank] || 0
    return 800 + rankValue
  }
  
  // Led suit (non-trump)
  if (effectiveSuit === ledSuit) {
    const rankValue = { 'A': 50, 'K': 40, 'Q': 30, 'J': 25, '10': 20, '9': 10 }[card.rank] || 0
    return 100 + rankValue
  }
  
  // Other suits (can't win)
  return 0
}

function canPlayCard(card, hand, ledSuit, trumpSuit) {
  if (!ledSuit) return true // Leading, can play anything
  
  const effectiveSuit = getEffectiveSuit(card, trumpSuit)
  
  // Must follow led suit if possible
  const hasLedSuit = hand.some(c => getEffectiveSuit(c, trumpSuit) === ledSuit)
  
  if (!hasLedSuit) return true // Can play anything if can't follow
  
  return effectiveSuit === ledSuit
}

// ── AI Logic ─────────────────────────────────────────────────────────────────

function aiShouldOrderUp(hand, upcard) {
  const trumpSuit = upcard.suit
  let trumpCount = 0
  let bowers = 0
  
  for (const card of hand) {
    const effectiveSuit = getEffectiveSuit(card, trumpSuit)
    if (effectiveSuit === trumpSuit) {
      trumpCount++
      if (isRightBower(card, trumpSuit) || isLeftBower(card, trumpSuit)) {
        bowers++
      }
    }
  }
  
  // Order up if we have 2+ trump including a bower, or 3+ trump
  if (bowers >= 1 && trumpCount >= 2) return true
  if (trumpCount >= 3) return true
  
  return false
}

function aiShouldCallTrump(hand, position, upcard) {
  const upcardSuit = upcard.suit
  const otherSuits = SUITS.filter(s => s !== upcardSuit)
  
  let bestSuit = null
  let bestScore = 0
  
  for (const suit of otherSuits) {
    let trumpCount = 0
    let bowers = 0
    
    for (const card of hand) {
      const effectiveSuit = getEffectiveSuit(card, suit)
      if (effectiveSuit === suit) {
        trumpCount++
        if (isRightBower(card, suit) || isLeftBower(card, suit)) {
          bowers++
        }
      }
    }
    
    const score = trumpCount * 10 + bowers * 20
    if (score > bestScore) {
      bestScore = score
      bestSuit = suit
    }
  }
  
  // Call trump if we have decent strength (2+ trump with bower, or 3+ trump)
  if (bestScore >= 30) return bestSuit
  
  return null
}

function aiChooseCard(hand, ledSuit, trumpSuit, cardsInTrick, currentWinner) {
  const playable = hand.filter(c => canPlayCard(c, hand, ledSuit, trumpSuit))
  
  if (playable.length === 0) return hand[0]
  
  // If leading, play highest trump or highest card
  if (!ledSuit) {
    const trumpCards = playable.filter(c => getEffectiveSuit(c, trumpSuit) === trumpSuit)
    if (trumpCards.length > 0) {
      return trumpCards.reduce((best, card) => 
        getCardStrength(card, trumpSuit, null) > getCardStrength(best, trumpSuit, null) ? card : best
      )
    }
    return playable.reduce((best, card) => 
      getCardStrength(card, trumpSuit, null) > getCardStrength(best, trumpSuit, null) ? card : best
    )
  }
  
  // If partner is winning, play low
  const partnerIndex = (PLAYERS.indexOf(currentWinner) + 2) % 4
  const isPartnerWinning = PLAYERS[partnerIndex] === currentWinner
  
  if (isPartnerWinning && cardsInTrick.length >= 2) {
    return playable.reduce((lowest, card) => 
      getCardStrength(card, trumpSuit, ledSuit) < getCardStrength(lowest, trumpSuit, ledSuit) ? card : lowest
    )
  }
  
  // Try to win the trick
  const currentBestStrength = cardsInTrick.length > 0 
    ? Math.max(...cardsInTrick.map(c => getCardStrength(c.card, trumpSuit, ledSuit)))
    : 0
  
  const winners = playable.filter(c => getCardStrength(c, trumpSuit, ledSuit) > currentBestStrength)
  
  if (winners.length > 0) {
    // Play lowest winning card
    return winners.reduce((best, card) => 
      getCardStrength(card, trumpSuit, ledSuit) < getCardStrength(best, trumpSuit, ledSuit) ? card : best
    )
  }
  
  // Can't win, play lowest card
  return playable.reduce((lowest, card) => 
    getCardStrength(card, trumpSuit, ledSuit) < getCardStrength(lowest, trumpSuit, ledSuit) ? card : lowest
  )
}

function aiDiscardCard(hand, trumpSuit) {
  // Discard lowest non-trump card
  const nonTrump = hand.filter(c => getEffectiveSuit(c, trumpSuit) !== trumpSuit)
  
  if (nonTrump.length > 0) {
    return nonTrump.reduce((lowest, card) => 
      getCardStrength(card, trumpSuit, null) < getCardStrength(lowest, trumpSuit, null) ? card : lowest
    )
  }
  
  // All trump, discard lowest
  return hand.reduce((lowest, card) => 
    getCardStrength(card, trumpSuit, null) < getCardStrength(lowest, trumpSuit, null) ? card : lowest
  )
}

// ── Initialize Game State ────────────────────────────────────────────────────

function initGame() {
  return {
    phase: 'idle', // idle, dealing, bidding, dealer-discard, playing, trick-complete, hand-complete
    dealer: 0, // index in PLAYERS
    turn: 0, // current player index
    hands: { South: [], West: [], North: [], East: [] },
    upcard: null,
    trumpSuit: null,
    trumpCaller: null,
    goingAlone: false,
    alonePlayer: null,
    currentTrick: [],
    ledSuit: null,
    tricksWon: { South: 0, West: 0, North: 0, East: 0 },
    scores: { NS: 0, EW: 0 },
    message: 'Press Deal to start a new hand',
    biddingRound: 1, // 1 = order up round, 2 = call trump round
    bidHistory: [],
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EuchreBoard() {
  const [state, setState] = useState(initGame)
  const [selectedCard, setSelectedCard] = useState(null)

  // ── Deal Cards ───────────────────────────────────────────────────────────────
  
  const dealCards = useCallback(() => {
    const deck = shuffleDeck(createDeck())
    const hands = { South: [], West: [], North: [], East: [] }
    
    // Deal 5 cards to each player (2-3-2 or 3-2-3 pattern, but we'll do 5 at once)
    let idx = 0
    for (let i = 0; i < 5; i++) {
      for (const player of PLAYERS) {
        hands[player].push(deck[idx++])
      }
    }
    
    const upcard = deck[20]
    
    setState({
      ...initGame(),
      phase: 'bidding',
      dealer: (state.dealer + 1) % 4,
      turn: (state.dealer + 1) % 4, // Player left of dealer starts bidding
      hands,
      upcard,
      scores: state.scores,
      biddingRound: 1,
      bidHistory: [],
      message: `${PLAYERS[(state.dealer + 1) % 4]} bids first. Order up ${upcard.rank}${upcard.suit}?`,
    })
  }, [state.dealer, state.scores])

  // ── Bidding Actions ──────────────────────────────────────────────────────────
  
  const orderUp = useCallback(() => {
    if (state.phase !== 'bidding' || state.biddingRound !== 1) return
    
    const dealerPlayer = PLAYERS[state.dealer]
    
    setState(prev => ({
      ...prev,
      phase: 'dealer-discard',
      trumpSuit: prev.upcard.suit,
      trumpCaller: PLAYERS[prev.turn],
      message: `${PLAYERS[prev.turn]} ordered up ${SUIT_NAMES[prev.upcard.suit]}! ${dealerPlayer}, discard a card.`,
      bidHistory: [...prev.bidHistory, { player: PLAYERS[prev.turn], action: 'order-up' }],
      hands: {
        ...prev.hands,
        [dealerPlayer]: [...prev.hands[dealerPlayer], prev.upcard],
      },
    }))
  }, [state.phase, state.biddingRound, state.dealer])

  const passBid = useCallback(() => {
    if (state.phase !== 'bidding') return
    
    const nextTurn = (state.turn + 1) % 4
    const newBidHistory = [...state.bidHistory, { player: PLAYERS[state.turn], action: 'pass' }]
    
    // All passed in round 1, move to round 2
    if (state.biddingRound === 1 && newBidHistory.filter(b => b.action === 'pass').length === 4) {
      setState(prev => ({
        ...prev,
        turn: (prev.dealer + 1) % 4,
        biddingRound: 2,
        message: `${PLAYERS[(prev.dealer + 1) % 4]}, call trump (not ${SUIT_NAMES[prev.upcard.suit]})`,
        bidHistory: newBidHistory,
      }))
      return
    }
    
    // Dealer must call in round 2 (stick the dealer)
    if (state.biddingRound === 2 && state.turn === state.dealer) {
      const otherSuits = SUITS.filter(s => s !== state.upcard.suit)
      const calledSuit = otherSuits[Math.floor(Math.random() * otherSuits.length)]
      
      setState(prev => ({
        ...prev,
        phase: 'playing',
        trumpSuit: calledSuit,
        trumpCaller: PLAYERS[prev.dealer],
        turn: (prev.dealer + 1) % 4,
        message: `${PLAYERS[prev.dealer]} was stuck and called ${SUIT_NAMES[calledSuit]}. ${PLAYERS[(prev.dealer + 1) % 4]} leads.`,
        bidHistory: [...newBidHistory, { player: PLAYERS[prev.dealer], action: `call-${calledSuit}` }],
      }))
      return
    }
    
    setState(prev => ({
      ...prev,
      turn: nextTurn,
      message: prev.biddingRound === 1 
        ? `${PLAYERS[nextTurn]}, order up ${prev.upcard.rank}${prev.upcard.suit}?`
        : `${PLAYERS[nextTurn]}, call trump (not ${SUIT_NAMES[prev.upcard.suit]})`,
      bidHistory: newBidHistory,
    }))
  }, [state.phase, state.turn, state.dealer, state.biddingRound, state.bidHistory, state.upcard])

  const callTrump = useCallback((suit) => {
    if (state.phase !== 'bidding' || state.biddingRound !== 2) return
    if (suit === state.upcard.suit) return // Can't call upcard suit in round 2
    
    setState(prev => ({
      ...prev,
      phase: 'playing',
      trumpSuit: suit,
      trumpCaller: PLAYERS[prev.turn],
      turn: (prev.dealer + 1) % 4,
      message: `${PLAYERS[prev.turn]} called ${SUIT_NAMES[suit]}. ${PLAYERS[(prev.dealer + 1) % 4]} leads.`,
      bidHistory: [...prev.bidHistory, { player: PLAYERS[prev.turn], action: `call-${suit}` }],
    }))
  }, [state.phase, state.biddingRound, state.upcard])

  // ── Dealer Discard ───────────────────────────────────────────────────────────
  
  const discardCard = useCallback((card) => {
    if (state.phase !== 'dealer-discard') return
    
    const dealerPlayer = PLAYERS[state.dealer]
    const newHand = state.hands[dealerPlayer].filter(c => getCardKey(c) !== getCardKey(card))
    
    setState(prev => ({
      ...prev,
      phase: 'playing',
      turn: (prev.dealer + 1) % 4,
      hands: {
        ...prev.hands,
        [dealerPlayer]: newHand,
      },
      message: `${PLAYERS[(prev.dealer + 1) % 4]} leads.`,
    }))
  }, [state.phase, state.dealer, state.hands])

  // ── Play Card ────────────────────────────────────────────────────────────────
  
  const playCard = useCallback((card) => {
    if (state.phase !== 'playing') return
    
    const currentPlayer = PLAYERS[state.turn]
    
    // Check if card is playable
    if (!canPlayCard(card, state.hands[currentPlayer], state.ledSuit, state.trumpSuit)) {
      setState(prev => ({ ...prev, message: 'Must follow suit if possible!' }))
      return
    }
    
    const newHand = state.hands[currentPlayer].filter(c => getCardKey(c) !== getCardKey(card))
    const newTrick = [...state.currentTrick, { player: currentPlayer, card }]
    const newLedSuit = state.ledSuit || getEffectiveSuit(card, state.trumpSuit)
    
    setSelectedCard(null)
    
    // Trick is complete after 4 cards
    if (newTrick.length === 4) {
      // Determine winner
      const winner = newTrick.reduce((best, entry) => {
        const bestStrength = getCardStrength(best.card, state.trumpSuit, newLedSuit)
        const entryStrength = getCardStrength(entry.card, state.trumpSuit, newLedSuit)
        return entryStrength > bestStrength ? entry : best
      }).player
      
      const newTricksWon = { ...state.tricksWon, [winner]: state.tricksWon[winner] + 1 }
      
      setState(prev => ({
        ...prev,
        hands: { ...prev.hands, [currentPlayer]: newHand },
        currentTrick: newTrick,
        phase: 'trick-complete',
        tricksWon: newTricksWon,
        message: `${winner} wins the trick!`,
      }))
      
      // Check if hand is complete (all 5 tricks played)
      setTimeout(() => {
        const totalTricks = Object.values(newTricksWon).reduce((a, b) => a + b, 0)
        
        if (totalTricks === 5) {
          // Calculate scores
          const nsTricks = newTricksWon.South + newTricksWon.North
          const ewTricks = newTricksWon.West + newTricksWon.East
          
          const callerTeam = ['North', 'South'].includes(state.trumpCaller) ? 'NS' : 'EW'
          const callerTricks = callerTeam === 'NS' ? nsTricks : ewTricks
          
          let points = 0
          let handMessage = ''
          
          if (callerTricks === 5) {
            points = 2 // March
            handMessage = `${callerTeam} marched! +2 points`
          } else if (callerTricks >= 3) {
            points = 1
            handMessage = `${callerTeam} made it! +1 point`
          } else {
            // Euchred
            const defenderTeam = callerTeam === 'NS' ? 'EW' : 'NS'
            setState(prev => ({
              ...prev,
              phase: 'hand-complete',
              scores: { ...prev.scores, [defenderTeam]: prev.scores[defenderTeam] + 2 },
              message: `${callerTeam} was euchred! ${defenderTeam} gets +2 points`,
            }))
            return
          }
          
          const newScores = { ...state.scores, [callerTeam]: state.scores[callerTeam] + points }
          
          setState(prev => ({
            ...prev,
            phase: 'hand-complete',
            scores: newScores,
            message: handMessage + (newScores.NS >= 10 || newScores.EW >= 10 ? ' - GAME OVER!' : ''),
          }))
        } else {
          // Next trick, winner leads
          const winnerIndex = PLAYERS.indexOf(winner)
          setState(prev => ({
            ...prev,
            phase: 'playing',
            turn: winnerIndex,
            currentTrick: [],
            ledSuit: null,
            message: `${winner} leads.`,
          }))
        }
      }, 2000)
      
    } else {
      // Continue trick
      const nextTurn = (state.turn + 1) % 4
      setState(prev => ({
        ...prev,
        hands: { ...prev.hands, [currentPlayer]: newHand },
        currentTrick: newTrick,
        turn: nextTurn,
        ledSuit: newLedSuit,
        message: `${PLAYERS[nextTurn]}'s turn`,
      }))
    }
  }, [state])

  // ── AI Turn ──────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (state.phase === 'bidding' && PLAYERS[state.turn] !== 'South') {
      const timer = setTimeout(() => {
        if (state.biddingRound === 1) {
          const shouldOrder = aiShouldOrderUp(state.hands[PLAYERS[state.turn]], state.upcard, state.turn, state.dealer)
          if (shouldOrder) {
            orderUp()
          } else {
            passBid()
          }
        } else {
          const calledSuit = aiShouldCallTrump(state.hands[PLAYERS[state.turn]], state.turn, state.upcard)
          if (calledSuit) {
            callTrump(calledSuit)
          } else {
            passBid()
          }
        }
      }, 800)
      return () => clearTimeout(timer)
    }
    
    if (state.phase === 'dealer-discard' && PLAYERS[state.dealer] !== 'South') {
      const timer = setTimeout(() => {
        const cardToDiscard = aiDiscardCard(state.hands[PLAYERS[state.dealer]], state.trumpSuit)
        discardCard(cardToDiscard)
      }, 800)
      return () => clearTimeout(timer)
    }
    
    if (state.phase === 'playing' && PLAYERS[state.turn] !== 'South') {
      const timer = setTimeout(() => {
        const currentPlayer = PLAYERS[state.turn]
        const card = aiChooseCard(
          state.hands[currentPlayer],
          state.ledSuit,
          state.trumpSuit,
          state.currentTrick,
          state.currentTrick.length > 0 ? state.currentTrick[state.currentTrick.length - 1].player : null
        )
        playCard(card)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [state, orderUp, passBid, callTrump, discardCard, playCard])

  // ── Render ───────────────────────────────────────────────────────────────────
  
  const canDeal = state.phase === 'idle' || state.phase === 'hand-complete'
  const isHumanTurn = PLAYERS[state.turn] === 'South'
  const humanHand = state.hands.South || []

  const renderCard = (card, clickable = false, onClick = null, small = false) => {
    const isRed = card.suit === '♥' || card.suit === '♦'
    const isSelected = selectedCard && getCardKey(selectedCard) === getCardKey(card)
    
    return (
      <div
        key={getCardKey(card)}
        onClick={clickable ? onClick : undefined}
        className={`${small ? 'w-12 h-16' : 'w-16 h-24'} bg-white rounded-lg shadow-lg flex flex-col items-center justify-center border-2 ${
          isSelected ? 'border-blue-500 -translate-y-2' : 'border-gray-300'
        } ${clickable ? 'cursor-pointer hover:border-blue-400 hover:-translate-y-1 transition-all' : ''}`}
        style={{ color: isRed ? '#dc2626' : '#1f2937' }}
      >
        <div className={`${small ? 'text-xl' : 'text-3xl'} font-bold`}>{card.rank}</div>
        <div className={`${small ? 'text-2xl' : 'text-4xl'}`}>{card.suit}</div>
      </div>
    )
  }

  const renderCardBack = (small = false) => (
    <div
      className={`${small ? 'w-12 h-16' : 'w-16 h-24'} bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg shadow-lg border-2 border-blue-900 flex items-center justify-center`}
    >
      <div className="text-white text-2xl">🂠</div>
    </div>
  )

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">♠ ♥ Euchre ♦ ♣</h2>
        <p className="text-sm opacity-75">
          Partnerships: North-South vs East-West • First to 10 points wins
        </p>
      </div>

      {/* Scores */}
      <div className="flex gap-8 items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-500">{state.scores.NS}</div>
          <div className="text-sm font-semibold">North-South</div>
        </div>
        <div className="text-2xl opacity-50">vs</div>
        <div className="text-center">
          <div className="text-4xl font-bold text-red-500">{state.scores.EW}</div>
          <div className="text-sm font-semibold">East-West</div>
        </div>
      </div>

      {/* Game Message */}
      <div className="text-center px-4 py-2 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 rounded-lg min-h-[3rem] flex items-center justify-center">
        <p className="text-sm font-medium">{state.message}</p>
      </div>

      {/* Game Area */}
      <div className="relative w-full max-w-4xl aspect-[4/3] bg-gradient-to-br from-green-700 to-green-900 rounded-3xl shadow-2xl p-8">
        {/* North Player (Top) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="text-white font-semibold text-sm">North (Partner)</div>
          <div className="flex gap-1">
            {state.hands.North.map(() => renderCardBack(true))}
          </div>
          <div className="text-white text-xs">Tricks: {state.tricksWon.North}</div>
        </div>

        {/* West Player (Left) */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
          <div className="text-white font-semibold text-sm">West</div>
          <div className="flex gap-1">
            {state.hands.West.map(() => renderCardBack(true))}
          </div>
          <div className="text-white text-xs">Tricks: {state.tricksWon.West}</div>
        </div>

        {/* East Player (Right) */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
          <div className="text-white font-semibold text-sm">East</div>
          <div className="flex gap-1">
            {state.hands.East.map(() => renderCardBack(true))}
          </div>
          <div className="text-white text-xs">Tricks: {state.tricksWon.East}</div>
        </div>

        {/* Center Area - Upcard or Current Trick */}
        <div className="absolute inset-0 flex items-center justify-center">
          {state.phase === 'bidding' && state.upcard && (
            <div className="flex flex-col items-center gap-2">
              <div className="text-white text-sm font-semibold">Upcard</div>
              {renderCard(state.upcard, false, null, false)}
            </div>
          )}
          
          {state.trumpSuit && state.phase !== 'bidding' && state.currentTrick.length === 0 && (
            <div className="text-white text-center">
              <div className="text-2xl mb-2">{state.trumpSuit}</div>
              <div className="text-sm font-semibold">Trump: {SUIT_NAMES[state.trumpSuit]}</div>
            </div>
          )}

          {state.currentTrick.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {state.currentTrick.map((entry, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="text-white text-xs font-semibold">{entry.player}</div>
                  {renderCard(entry.card, false, null, true)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* South Player (Bottom - Human) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="text-white text-xs">Tricks: {state.tricksWon.South}</div>
          <div className="flex gap-2">
            {humanHand.map(card => {
              const clickable = 
                (state.phase === 'playing' && isHumanTurn && canPlayCard(card, humanHand, state.ledSuit, state.trumpSuit)) ||
                (state.phase === 'dealer-discard' && state.dealer === 0)
              
              return renderCard(
                card,
                clickable,
                () => {
                  if (state.phase === 'playing') {
                    setSelectedCard(card)
                    playCard(card)
                  } else if (state.phase === 'dealer-discard') {
                    discardCard(card)
                  }
                },
                false
              )
            })}
          </div>
          <div className="text-white font-semibold text-sm">You (South)</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 flex-wrap justify-center">
        {canDeal && (
          <button
            onClick={dealCards}
            className="btn-primary px-6 py-3 text-lg font-semibold"
          >
            {state.phase === 'idle' ? '🎴 Deal' : '🎴 Next Hand'}
          </button>
        )}

        {state.phase === 'bidding' && isHumanTurn && state.biddingRound === 1 && (
          <>
            <button onClick={orderUp} className="btn-primary px-6 py-3">
              Order Up {state.upcard.suit}
            </button>
            <button onClick={passBid} className="btn-ghost px-6 py-3">
              Pass
            </button>
          </>
        )}

        {state.phase === 'bidding' && isHumanTurn && state.biddingRound === 2 && (
          <>
            {SUITS.filter(s => s !== state.upcard.suit).map(suit => (
              <button key={suit} onClick={() => callTrump(suit)} className="btn-primary px-4 py-2">
                Call {suit} {SUIT_NAMES[suit]}
              </button>
            ))}
            <button onClick={passBid} className="btn-ghost px-6 py-3">
              Pass
            </button>
          </>
        )}
      </div>

      {/* Game Over */}
      {(state.scores.NS >= 10 || state.scores.EW >= 10) && (
        <div className="text-center">
          <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
            🏆 {state.scores.NS >= 10 ? 'North-South' : 'East-West'} Wins!
          </h3>
        </div>
      )}
    </div>
  )
}
