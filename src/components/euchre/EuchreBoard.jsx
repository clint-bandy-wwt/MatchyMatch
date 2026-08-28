/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/preserve-manual-memoization */
/* eslint-disable react-hooks/immutability */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react'

// ── Card & Deck Setup ────────────────────────────────────────────────────────
const SUITS = ['♠', '♣', '♥', '♦']
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A']
const POSITIONS = ['South', 'West', 'North', 'East']

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

// ── Euchre Logic ─────────────────────────────────────────────────────────────

function getEffectiveRankSuit(card, trump) {
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

function whoWinsTrick(trick, trump) {
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

function canPlayCard(card, hand, ledSuit, trump) {
  if (!ledSuit) return true // Leading, can play anything
  
  const effective = getEffectiveRankSuit(card, trump)
  
  // Must follow suit if possible
  const hasLedSuit = hand.some(c => {
    const eff = getEffectiveRankSuit(c, trump)
    return eff.suit === ledSuit
  })
  
  if (!hasLedSuit) return true // Can't follow suit, can play anything
  
  return effective.suit === ledSuit
}

// ── AI Logic ─────────────────────────────────────────────────────────────────

function aiShouldOrderUp(hand, upCard, position, dealer) {
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
  
  // Order up if we have 2+ strong trump or 3+ trump total
  if (strongTrump.length >= 2 || trumpCards.length >= 3) {
    return position === dealer ? 'orderUp' : 'orderUp'
  }
  
  return 'pass'
}

function aiShouldCallTrump(hand, upCardSuit) {
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

function aiMustCallTrump(hand, upCardSuit) {
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

function aiPlayCard(hand, currentTrick, trump) {
  const ledSuit = currentTrick.length > 0 ? getEffectiveRankSuit(currentTrick[0].card, trump).suit : null
  const playableCards = hand.filter(c => canPlayCard(c, hand, ledSuit, trump))
  
  if (playableCards.length === 0) return hand[0]
  
  // If leading, play highest trump or highest card
  if (!ledSuit) {
    const trumpCards = playableCards.filter(c => getEffectiveRankSuit(c, trump).suit === trump)
    if (trumpCards.length > 0) {
      return trumpCards.reduce((best, c) => 
        cardValue(c, trump, null) > cardValue(best, trump, null) ? c : best
      )
    }
    return playableCards.reduce((best, c) => 
      cardValue(c, trump, ledSuit) > cardValue(best, trump, ledSuit) ? c : best
    )
  }
  
  // Try to win the trick if possible
  const currentWinner = whoWinsTrick(currentTrick, trump)
  const winningCard = currentTrick.find(t => t.position === currentWinner)?.card
  const winningValue = winningCard ? cardValue(winningCard, trump, ledSuit) : 0
  
  const winningCards = playableCards.filter(c => cardValue(c, trump, ledSuit) > winningValue)
  if (winningCards.length > 0) {
    // Play lowest winning card
    return winningCards.reduce((best, c) => 
      cardValue(c, trump, ledSuit) < cardValue(best, trump, ledSuit) ? c : best
    )
  }
  
  // Can't win, dump lowest card
  return playableCards.reduce((best, c) => 
    cardValue(c, trump, ledSuit) < cardValue(best, trump, ledSuit) ? c : best
  )
}

function aiDiscard(hand, trump) {
  // Discard lowest non-trump card, or lowest trump if all trump
  const nonTrump = hand.filter(c => getEffectiveRankSuit(c, trump).suit !== trump)
  if (nonTrump.length > 0) {
    return nonTrump.reduce((best, c) => 
      cardValue(c, trump, null) < cardValue(best, trump, null) ? c : best
    )
  }
  return hand.reduce((best, c) => 
    cardValue(c, trump, null) < cardValue(best, trump, null) ? c : best
  )
}

// ── Game State ───────────────────────────────────────────────────────────────

function initGame() {
  return {
    phase: 'deal', // deal, bidding1, bidding2, discard, playing, trickEnd, handEnd, gameEnd
    dealer: 0, // Index in POSITIONS
    hands: { South: [], West: [], North: [], East: [] },
    currentTrick: [],
    trickWinner: null,
    tricksWon: { 'N/S': 0, 'E/W': 0 },
    scores: { 'N/S': 0, 'E/W': 0 },
    trump: null,
    upCard: null,
    maker: null, // Who called trump
    goingAlone: false,
    alonePlayer: null,
    currentPlayer: 1, // Position index
    biddingRound: 1,
    passCount: 0,
    dealerStuckCount: 0,
    message: 'Dealing...',
    waitingForAI: false,
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EuchreBoard() {
  const [state, setState] = useState(initGame)
  
  // Helper function - defined before use
  const getTeam = (position) => {
    return position === 'North' || position === 'South' ? 'N/S' : 'E/W'
  }
  
  // Deal cards
  useEffect(() => {
    if (state.phase === 'deal') {
      const deck = shuffleDeck(createDeck())
      const hands = { South: [], West: [], North: [], East: [] }
      
      // Deal 5 cards to each player (2-3-2 or 3-2-3 pattern)
      let deckIndex = 0
      for (let round = 0; round < 2; round++) {
        for (let i = 0; i < 4; i++) {
          const pos = POSITIONS[(state.dealer + 1 + i) % 4]
          const count = round === 0 ? (i % 2 === 0 ? 3 : 2) : (i % 2 === 0 ? 2 : 3)
          for (let j = 0; j < count; j++) {
            hands[pos].push(deck[deckIndex++])
          }
        }
      }
      
      const upCard = deck[deckIndex]
      
      setState({
        ...state,
        hands,
        upCard,
        phase: 'bidding1',
        currentPlayer: (state.dealer + 1) % 4,
        message: `${upCard.rank}${upCard.suit} is turned up. ${POSITIONS[(state.dealer + 1) % 4]} to bid.`,
        passCount: 0,
        waitingForAI: POSITIONS[(state.dealer + 1) % 4] !== 'South',
      })
    }
  }, [state.phase])
  
  // AI bidding and playing
  useEffect(() => {
    if (state.waitingForAI) {
      const timer = setTimeout(() => {
        const position = POSITIONS[state.currentPlayer]
        
        if (state.phase === 'bidding1') {
          const decision = aiShouldOrderUp(state.hands[position], state.upCard, position, POSITIONS[state.dealer])
          handleBidDecision(decision === 'orderUp' ? 'orderUp' : 'pass')
        } else if (state.phase === 'bidding2') {
          const trumpSuit = aiShouldCallTrump(state.hands[position], state.upCard.suit)
          if (trumpSuit) {
            handleCallTrump(trumpSuit)
          } else {
            // If this is the dealer, they MUST call trump (can't pass)
            if (state.currentPlayer === state.dealer) {
              const forcedSuit = aiMustCallTrump(state.hands[position], state.upCard.suit)
              handleCallTrump(forcedSuit)
            } else {
              handleBidDecision('pass')
            }
          }
        } else if (state.phase === 'discard') {
          const cardToDiscard = aiDiscard(state.hands[position], state.trump)
          handleDiscard(cardToDiscard)
        } else if (state.phase === 'playing') {
          const cardToPlay = aiPlayCard(state.hands[position], state.currentTrick, state.trump)
          handlePlayCard(cardToPlay, position)
        }
      }, 800)
      
      return () => clearTimeout(timer)
    }
  }, [state.waitingForAI, state.currentPlayer, state.phase])
  
  const handleBidDecision = useCallback((decision) => {
    const position = POSITIONS[state.currentPlayer]
    
    if (state.phase === 'bidding1') {
      if (decision === 'orderUp') {
        const maker = getTeam(position)
        setState({
          ...state,
          trump: state.upCard.suit,
          maker,
          phase: 'discard',
          currentPlayer: state.dealer,
          message: `${position} orders up ${state.upCard.suit}. ${POSITIONS[state.dealer]} discards.`,
          waitingForAI: POSITIONS[state.dealer] !== 'South',
        })
      } else {
        const newPassCount = state.passCount + 1
        if (newPassCount === 4) {
          // All passed, move to round 2
          setState({
            ...state,
            phase: 'bidding2',
            currentPlayer: (state.dealer + 1) % 4,
            passCount: 0,
            message: `All pass. ${POSITIONS[(state.dealer + 1) % 4]} to call trump.`,
            waitingForAI: POSITIONS[(state.dealer + 1) % 4] !== 'South',
          })
        } else {
          const nextPlayer = (state.currentPlayer + 1) % 4
          setState({
            ...state,
            currentPlayer: nextPlayer,
            passCount: newPassCount,
            message: `${position} passes. ${POSITIONS[nextPlayer]} to bid.`,
            waitingForAI: POSITIONS[nextPlayer] !== 'South',
          })
        }
      }
    } else if (state.phase === 'bidding2') {
      if (decision === 'pass') {
        const newPassCount = state.passCount + 1
        if (state.currentPlayer === state.dealer) {
          // Dealer must call trump (stick the dealer)
          // For human dealer, just update message; for AI dealer, handled in useEffect
          if (POSITIONS[state.dealer] === 'South') {
            setState({
              ...state,
              message: `Dealer must call trump. Choose a suit.`,
              waitingForAI: false,
            })
          }
          // AI dealer will be forced to call in the useEffect above
        } else {
          const nextPlayer = (state.currentPlayer + 1) % 4
          setState({
            ...state,
            currentPlayer: nextPlayer,
            passCount: newPassCount,
            message: `${position} passes. ${POSITIONS[nextPlayer]} to call trump.`,
            waitingForAI: POSITIONS[nextPlayer] !== 'South',
          })
        }
      }
    }
  }, [state])
  
  const handleCallTrump = useCallback((suit) => {
    const position = POSITIONS[state.currentPlayer]
    const maker = getTeam(position)
    
    setState({
      ...state,
      trump: suit,
      maker,
      phase: 'playing',
      currentPlayer: (state.dealer + 1) % 4,
      currentTrick: [],
      message: `${position} calls ${suit}. ${POSITIONS[(state.dealer + 1) % 4]} leads.`,
      waitingForAI: POSITIONS[(state.dealer + 1) % 4] !== 'South',
    })
  }, [state])
  
  const handleDiscard = useCallback((card) => {
    const position = POSITIONS[state.currentPlayer]
    const newHand = state.hands[position].filter(c => c !== card)
    newHand.push(state.upCard)
    
    setState({
      ...state,
      hands: { ...state.hands, [position]: newHand },
      phase: 'playing',
      currentPlayer: (state.dealer + 1) % 4,
      currentTrick: [],
      message: `${POSITIONS[(state.dealer + 1) % 4]} leads.`,
      waitingForAI: POSITIONS[(state.dealer + 1) % 4] !== 'South',
    })
  }, [state])
  
  const handlePlayCard = useCallback((card, playerPos) => {
    const position = playerPos || POSITIONS[state.currentPlayer]
    const newHand = state.hands[position].filter(c => c !== card)
    const newTrick = [...state.currentTrick, { position, card }]
    
    if (newTrick.length === 4) {
      // Trick is complete
      const winner = whoWinsTrick(newTrick, state.trump)
      const winningTeam = getTeam(winner)
      const newTricksWon = { ...state.tricksWon, [winningTeam]: state.tricksWon[winningTeam] + 1 }
      
      // Check if hand is over
      if (newHand.length === 0) {
        const makerTricks = newTricksWon[state.maker]
        
        let points = 0
        let scoringTeam = null
        
        if (makerTricks >= 3) {
          scoringTeam = state.maker
          points = makerTricks === 5 ? 2 : 1
          if (state.goingAlone && makerTricks === 5) points = 4
        } else {
          scoringTeam = state.maker === 'N/S' ? 'E/W' : 'N/S'
          points = 2 // Euchred
        }
        
        const newScores = { ...state.scores, [scoringTeam]: state.scores[scoringTeam] + points }
        
        if (newScores[scoringTeam] >= 10) {
          setState({
            ...state,
            hands: { ...state.hands, [position]: newHand },
            currentTrick: newTrick,
            trickWinner: winner,
            tricksWon: newTricksWon,
            scores: newScores,
            phase: 'gameEnd',
            message: `${scoringTeam} wins the game! Final score: N/S ${newScores['N/S']}, E/W ${newScores['E/W']}`,
          })
        } else {
          setState({
            ...state,
            hands: { ...state.hands, [position]: newHand },
            currentTrick: newTrick,
            trickWinner: winner,
            tricksWon: newTricksWon,
            scores: newScores,
            phase: 'handEnd',
            message: `Hand over. ${scoringTeam} scores ${points} point${points > 1 ? 's' : ''}. Score: N/S ${newScores['N/S']}, E/W ${newScores['E/W']}`,
          })
        }
      } else {
        setState({
          ...state,
          hands: { ...state.hands, [position]: newHand },
          currentTrick: newTrick,
          trickWinner: winner,
          tricksWon: newTricksWon,
          phase: 'trickEnd',
          message: `${winner} wins the trick.`,
        })
      }
    } else {
      const nextPlayer = (state.currentPlayer + 1) % 4
      setState({
        ...state,
        hands: { ...state.hands, [position]: newHand },
        currentTrick: newTrick,
        currentPlayer: nextPlayer,
        message: `${POSITIONS[nextPlayer]} to play.`,
        waitingForAI: POSITIONS[nextPlayer] !== 'South',
      })
    }
  }, [state])
  
  const handleNextTrick = useCallback(() => {
    const winnerIndex = POSITIONS.indexOf(state.trickWinner)
    setState({
      ...state,
      currentTrick: [],
      currentPlayer: winnerIndex,
      phase: 'playing',
      message: `${state.trickWinner} leads.`,
      waitingForAI: state.trickWinner !== 'South',
    })
  }, [state])
  
  const handleNextHand = useCallback(() => {
    const newDealer = (state.dealer + 1) % 4
    setState({
      ...initGame(),
      dealer: newDealer,
      scores: state.scores,
    })
  }, [state])
  
  const handleNewGame = useCallback(() => {
    setState(initGame())
  }, [])
  const ledSuit = state.currentTrick.length > 0 ? getEffectiveRankSuit(state.currentTrick[0].card, state.trump).suit : null
  
  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold mb-2">Euchre</h2>
        <p className="text-sm opacity-75">{state.message}</p>
      </div>
      
      {/* Scores */}
      <div className="flex justify-center gap-8 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold">N/S</div>
          <div className="text-4xl font-bold text-blue-600">{state.scores['N/S']}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">E/W</div>
          <div className="text-4xl font-bold text-red-600">{state.scores['E/W']}</div>
        </div>
      </div>
      
      {/* Game info */}
      {state.trump && (
        <div className="text-center mb-4">
          <span className="text-lg">Trump: <span className="text-2xl font-bold">{state.trump}</span></span>
          {state.maker && <span className="ml-4">Maker: {state.maker}</span>}
          <span className="ml-4">Tricks: N/S {state.tricksWon['N/S']} - E/W {state.tricksWon['E/W']}</span>
        </div>
      )}
      
      {/* Bidding UI */}
      {(state.phase === 'bidding1' || state.phase === 'bidding2') && state.currentPlayer === 0 && (
        <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
          <p className="text-center mb-3 font-semibold">Your turn to bid</p>
          {state.phase === 'bidding1' && (
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleBidDecision('orderUp')}
                className="btn-primary px-4 py-2"
              >
                Order Up {state.upCard.suit}
              </button>
              <button
                onClick={() => handleBidDecision('pass')}
                className="btn-secondary px-4 py-2"
              >
                Pass
              </button>
            </div>
          )}
          {state.phase === 'bidding2' && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm">Choose trump suit (not {state.upCard.suit}){state.currentPlayer === state.dealer ? ' - Dealer must call' : ''}:</p>
              <div className="flex gap-3">
                {SUITS.filter(s => s !== state.upCard.suit).map(suit => (
                  <button
                    key={suit}
                    onClick={() => handleCallTrump(suit)}
                    className="btn-primary px-6 py-2 text-2xl"
                  >
                    {suit}
                  </button>
                ))}
              </div>
              {state.currentPlayer !== state.dealer && (
                <button
                  onClick={() => handleBidDecision('pass')}
                  className="btn-secondary px-4 py-2"
                >
                  Pass
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Discard UI */}
      {state.phase === 'discard' && state.currentPlayer === 0 && (
        <div className="mb-6 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
          <p className="text-center mb-3 font-semibold">Choose a card to discard (you'll get {state.upCard.rank}{state.upCard.suit})</p>
        </div>
      )}
      
      {/* Playing field */}
      <div className="mb-6 relative" style={{ height: '400px' }}>
        {/* North player */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
          <div className="text-center mb-2">
            <span className="font-semibold">North</span>
            {POSITIONS[state.currentPlayer] === 'North' && <span className="ml-2 text-green-600">●</span>}
          </div>
          <div className="flex gap-1">
            {state.hands.North.map((card, i) => (
              <div key={i} className="w-12 h-16 bg-blue-200 dark:bg-blue-800 rounded border border-gray-400 flex items-center justify-center text-xs">
                🂠
              </div>
            ))}
          </div>
        </div>
        
        {/* West player */}
        <div className="absolute top-1/2 left-0 transform -translate-y-1/2">
          <div className="text-center mb-2">
            <span className="font-semibold">West</span>
            {POSITIONS[state.currentPlayer] === 'West' && <span className="ml-2 text-green-600">●</span>}
          </div>
          <div className="flex flex-col gap-1">
            {state.hands.West.map((card, i) => (
              <div key={i} className="w-12 h-16 bg-blue-200 dark:bg-blue-800 rounded border border-gray-400 flex items-center justify-center text-xs">
                🂠
              </div>
            ))}
          </div>
        </div>
        
        {/* East player */}
        <div className="absolute top-1/2 right-0 transform -translate-y-1/2">
          <div className="text-center mb-2">
            <span className="font-semibold">East</span>
            {POSITIONS[state.currentPlayer] === 'East' && <span className="ml-2 text-green-600">●</span>}
          </div>
          <div className="flex flex-col gap-1">
            {state.hands.East.map((card, i) => (
              <div key={i} className="w-12 h-16 bg-blue-200 dark:bg-blue-800 rounded border border-gray-400 flex items-center justify-center text-xs">
                🂠
              </div>
            ))}
          </div>
        </div>
        
        {/* Center - Current trick */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {state.upCard && !state.trump && (
            <div className="mb-2">
              <div className="text-center text-sm mb-1">Up Card:</div>
              <Card card={state.upCard} />
            </div>
          )}
          {state.currentTrick.length > 0 && (
            <div className="flex gap-2 items-center justify-center flex-wrap">
              {state.currentTrick.map((play, i) => (
                <div key={i} className="text-center">
                  <Card card={play.card} />
                  <div className="text-xs mt-1">{play.position[0]}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* South player (human) */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
          <div className="text-center mb-2">
            <span className="font-semibold text-blue-600">South (You)</span>
            {POSITIONS[state.currentPlayer] === 'South' && <span className="ml-2 text-green-600">●</span>}
          </div>
          <div className="flex gap-2">
            {state.hands.South.map((card, i) => (
              <button
                key={i}
                onClick={() => {
                  if (state.phase === 'playing' && state.currentPlayer === 0) {
                    if (canPlayCard(card, state.hands.South, ledSuit, state.trump)) {
                      handlePlayCard(card, 'South')
                    } else {
                      alert('You must follow suit!')
                    }
                  } else if (state.phase === 'discard' && state.currentPlayer === 0) {
                    handleDiscard(card)
                  }
                }}
                disabled={
                  (state.phase === 'playing' && (state.currentPlayer !== 0 || !canPlayCard(card, state.hands.South, ledSuit, state.trump))) ||
                  (state.phase !== 'playing' && state.phase !== 'discard')
                }
                className={`transition-transform hover:scale-105 ${
                  state.phase === 'playing' && state.currentPlayer === 0 && canPlayCard(card, state.hands.South, ledSuit, state.trump)
                    ? 'cursor-pointer'
                    : state.phase === 'discard' && state.currentPlayer === 0
                    ? 'cursor-pointer'
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <Card card={card} />
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-center gap-3 mt-6">
        {state.phase === 'trickEnd' && (
          <button onClick={handleNextTrick} className="btn-primary px-6 py-2">
            Next Trick
          </button>
        )}
        {state.phase === 'handEnd' && (
          <button onClick={handleNextHand} className="btn-primary px-6 py-2">
            Next Hand
          </button>
        )}
        {state.phase === 'gameEnd' && (
          <button onClick={handleNewGame} className="btn-primary px-6 py-2">
            New Game
          </button>
        )}
        {state.phase !== 'deal' && state.phase !== 'gameEnd' && (
          <button onClick={handleNewGame} className="btn-secondary px-4 py-2">
            Restart
          </button>
        )}
      </div>
      
      {/* Rules */}
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
        <h3 className="font-bold mb-2">How to Play Euchre:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>4 players in 2 partnerships: North/South vs East/West (you are South)</li>
          <li>24-card deck: 9, 10, J, Q, K, A in each suit</li>
          <li>Bidding: Order up the turned-up card or pass, then call a different trump</li>
          <li>Bowers: Jack of trump (right bower) is highest, Jack of same color (left bower) is second</li>
          <li>Win 3+ tricks to score: 1 point for 3-4 tricks, 2 points for all 5 tricks</li>
          <li>Euchred: If makers fail to win 3 tricks, opponents score 2 points</li>
          <li>First team to 10 points wins!</li>
        </ul>
      </div>
    </div>
  )
}

function Card({ card }) {
  const isRed = card.suit === '♥' || card.suit === '♦'
  return (
    <div 
      className={`w-16 h-24 bg-white rounded border-2 border-gray-400 flex flex-col items-center justify-center font-bold text-2xl shadow-md ${
        isRed ? 'text-red-600' : 'text-black'
      }`}
    >
      <div>{card.rank}</div>
      <div>{card.suit}</div>
    </div>
  )
}
