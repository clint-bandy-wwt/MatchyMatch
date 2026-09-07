import { useState, useEffect, useCallback } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A']
const POSITIONS = ['South', 'West', 'North', 'East']

// ── Card Utilities ───────────────────────────────────────────────────────────

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

function cardKey(card) {
  return `${card.rank}${card.suit}`
}

function cardValue(card, trump) {
  const rankValues = { 9: 1, 10: 2, J: 3, Q: 4, K: 5, A: 6 }
  
  if (card.suit === trump) {
    if (card.rank === 'J') return 100 // Right bower
    if (card.rank === 'A') return 13
    if (card.rank === 'K') return 12
    if (card.rank === 'Q') return 11
    if (card.rank === '10') return 10
    if (card.rank === '9') return 9
  }
  
  // Left bower (other suit same color as trump)
  if (card.rank === 'J' && sameColor(card.suit, trump)) {
    return 99
  }
  
  return rankValues[card.rank]
}

function sameColor(suit1, suit2) {
  const red = ['♥', '♦']
  const black = ['♠', '♣']
  return (red.includes(suit1) && red.includes(suit2)) || (black.includes(suit1) && black.includes(suit2))
}

function effectiveSuit(card, trump) {
  if (card.rank === 'J' && sameColor(card.suit, trump)) {
    return trump
  }
  return card.suit
}

// ── Trick Logic ──────────────────────────────────────────────────────────────

function trickWinner(trick, trump) {
  if (trick.length === 0) return null
  
  const leadCard = trick[0].card
  const leadSuit = effectiveSuit(leadCard, trump)
  
  let bestIdx = 0
  let bestValue = -1
  
  for (let i = 0; i < trick.length; i++) {
    const card = trick[i].card
    const eSuit = effectiveSuit(card, trump)
    
    if (eSuit === trump && leadSuit !== trump) {
      const val = cardValue(card, trump)
      if (val > bestValue) {
        bestValue = val
        bestIdx = i
      }
    } else if (eSuit === leadSuit) {
      const val = cardValue(card, trump)
      if (val > bestValue) {
        bestValue = val
        bestIdx = i
      }
    }
  }
  
  return trick[bestIdx].position
}

function canPlayCard(card, hand, trick, trump) {
  if (trick.length === 0) return true
  
  const leadCard = trick[0].card
  const leadSuit = effectiveSuit(leadCard, trump)
  const cardSuit = effectiveSuit(card, trump)
  
  const hasSuit = hand.some(c => effectiveSuit(c, trump) === leadSuit)
  
  if (hasSuit) {
    return cardSuit === leadSuit
  }
  
  return true
}

// ── AI Logic ─────────────────────────────────────────────────────────────────

function aiShouldOrderUp(hand, upcard, position, dealer) {
  let trumpCount = 0
  let highCards = 0
  
  const testTrump = upcard.suit
  
  for (const card of hand) {
    const eSuit = effectiveSuit(card, testTrump)
    if (eSuit === testTrump) {
      trumpCount++
      const val = cardValue(card, testTrump)
      if (val >= 11) highCards++
    } else if (card.rank === 'A') {
      highCards++
    }
  }
  
  if ((position + 2) % 4 === dealer && trumpCount >= 2) {
    return true
  }
  
  if (position === dealer && trumpCount >= 1 && highCards >= 1) {
    return true
  }
  
  if (trumpCount >= 3) return true
  if (trumpCount >= 2 && highCards >= 2) return true
  
  return false
}

function aiCallTrump(hand, upcard) {
  const scores = {}
  const excludeSuit = upcard.suit
  
  for (const suit of SUITS) {
    if (suit === excludeSuit) continue
    
    let count = 0
    let high = 0
    
    for (const card of hand) {
      const eSuit = effectiveSuit(card, suit)
      if (eSuit === suit) {
        count++
        const val = cardValue(card, suit)
        if (val >= 11) high++
      }
    }
    
    scores[suit] = count * 10 + high * 5
  }
  
  let best = null
  let bestScore = 20
  
  for (const suit in scores) {
    if (scores[suit] > bestScore) {
      bestScore = scores[suit]
      best = suit
    }
  }
  
  return best
}

function aiPlayCard(hand, trick, trump) {
  const legal = hand.filter(c => canPlayCard(c, hand, trick, trump))
  
  if (legal.length === 0) return hand[0]
  if (legal.length === 1) return legal[0]
  
  if (trick.length === 0) {
    const trumpCards = legal.filter(c => effectiveSuit(c, trump) === trump)
    if (trumpCards.length > 0) {
      return trumpCards.reduce((a, b) => cardValue(a, trump) > cardValue(b, trump) ? a : b)
    }
    return legal.reduce((a, b) => cardValue(a, trump) > cardValue(b, trump) ? a : b)
  }
  
  const currentWinner = trickWinner(trick, trump)
  const myTeam = [0, 2].includes(POSITIONS.indexOf('South')) ? [0, 2] : [1, 3]
  const winnerIdx = POSITIONS.indexOf(currentWinner)
  
  if (myTeam.includes(winnerIdx)) {
    return legal.reduce((a, b) => cardValue(a, trump) < cardValue(b, trump) ? a : b)
  } else {
    const winCard = trick.find(t => t.position === currentWinner).card
    const winValue = cardValue(winCard, trump)
    const beaters = legal.filter(c => cardValue(c, trump) > winValue && effectiveSuit(c, trump) === effectiveSuit(winCard, trump))
    
    if (beaters.length > 0) {
      return beaters.reduce((a, b) => cardValue(a, trump) < cardValue(b, trump) ? a : b)
    }
    
    return legal.reduce((a, b) => cardValue(a, trump) < cardValue(b, trump) ? a : b)
  }
}

function aiDiscard(hand, trump) {
  const nonTrump = hand.filter(c => effectiveSuit(c, trump) !== trump)
  if (nonTrump.length > 0) {
    return nonTrump.reduce((a, b) => cardValue(a, trump) < cardValue(b, trump) ? a : b)
  }
  return hand.reduce((a, b) => cardValue(a, trump) < cardValue(b, trump) ? a : b)
}

// ── Initial State ────────────────────────────────────────────────────────────

function initGame() {
  return {
    phase: 'deal',
    dealer: 0,
    hands: [[], [], [], []],
    upcard: null,
    trump: null,
    caller: null,
    alonePlayer: null,
    trick: [],
    currentPlayer: null,
    tricksWon: [0, 0],
    score: [0, 0],
    message: 'Click Deal to start',
    biddingRound: 1,
    bidHistory: [],
  }
}

function dealHand(state) {
  const deck = shuffleDeck(createDeck())
  const hands = [[], [], [], []]
  
  for (let i = 0; i < 5; i++) {
    for (let p = 0; p < 4; p++) {
      hands[p].push(deck.pop())
    }
  }
  
  const upcard = deck.pop()
  
  return {
    ...state,
    hands,
    upcard,
    phase: 'bid1',
    trump: null,
    caller: null,
    alonePlayer: null,
    trick: [],
    tricksWon: [0, 0],
    currentPlayer: (state.dealer + 1) % 4,
    biddingRound: 1,
    bidHistory: [],
    message: `${POSITIONS[(state.dealer + 1) % 4]}: Order up or pass?`,
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EuchreBoard() {
  const [state, setState] = useState(initGame)
  
  const humanPos = 0
  
  const handleDeal = useCallback(() => {
    setState(s => dealHand(s))
  }, [])
  
  const handleOrderUp = useCallback(() => {
    const alone = window.confirm('Go alone?')
    
    setState(s => {
      const newState = {
        ...s,
        phase: s.currentPlayer === s.dealer ? 'discard' : 'play',
        trump: s.upcard.suit,
        caller: s.currentPlayer,
        alonePlayer: alone ? s.currentPlayer : null,
        currentPlayer: s.currentPlayer === s.dealer ? s.dealer : (s.dealer + 1) % 4,
        message: s.currentPlayer === s.dealer 
          ? 'Dealer: Pick a card to discard'
          : `${POSITIONS[(s.dealer + 1) % 4]} leads`,
        bidHistory: [...s.bidHistory, { position: s.currentPlayer, action: alone ? 'order-alone' : 'order' }],
      }
      
      if (s.currentPlayer === s.dealer) {
        newState.hands = s.hands.map((h, i) => i === s.dealer ? [...h, s.upcard] : h)
      }
      
      return newState
    })
  }, [])
  
  const handlePass = useCallback(() => {
    setState(s => {
      const nextPlayer = (s.currentPlayer + 1) % 4
      const newHistory = [...s.bidHistory, { position: s.currentPlayer, action: 'pass' }]
      
      if (s.biddingRound === 1 && nextPlayer === (s.dealer + 1) % 4) {
        return {
          ...s,
          biddingRound: 2,
          currentPlayer: nextPlayer,
          bidHistory: newHistory,
          message: `${POSITIONS[nextPlayer]}: Call a suit or pass?`,
        }
      } else if (s.biddingRound === 2 && nextPlayer === s.dealer) {
        return {
          ...s,
          currentPlayer: nextPlayer,
          bidHistory: newHistory,
          message: `${POSITIONS[nextPlayer]}: Dealer must call a suit`,
        }
      } else {
        return {
          ...s,
          currentPlayer: nextPlayer,
          bidHistory: newHistory,
          message: `${POSITIONS[nextPlayer]}: ${s.biddingRound === 1 ? 'Order up or pass?' : 'Call a suit or pass?'}`,
        }
      }
    })
  }, [])
  
  const handleCallTrump = useCallback((suit) => {
    const alone = window.confirm('Go alone?')
    
    setState(s => ({
      ...s,
      phase: 'play',
      trump: suit,
      caller: s.currentPlayer,
      alonePlayer: alone ? s.currentPlayer : null,
      currentPlayer: (s.dealer + 1) % 4,
      message: `${POSITIONS[(s.dealer + 1) % 4]} leads`,
      bidHistory: [...s.bidHistory, { position: s.currentPlayer, action: alone ? `call-${suit}-alone` : `call-${suit}` }],
    }))
  }, [])
  
  const handleDiscard = useCallback((card) => {
    setState(s => ({
      ...s,
      phase: 'play',
      hands: s.hands.map((h, i) => i === s.dealer ? h.filter(c => cardKey(c) !== cardKey(card)) : h),
      currentPlayer: (s.dealer + 1) % 4,
      message: `${POSITIONS[(s.dealer + 1) % 4]} leads`,
    }))
  }, [])
  
  const handlePlayCard = useCallback((card) => {
    setState(s => {
      if (!canPlayCard(card, s.hands[humanPos], s.trick, s.trump)) {
        return s
      }
      
      const newTrick = [...s.trick, { position: POSITIONS[humanPos], card }]
      const newHands = s.hands.map((h, i) => i === humanPos ? h.filter(c => cardKey(c) !== cardKey(card)) : h)
      
      return {
        ...s,
        trick: newTrick,
        hands: newHands,
        currentPlayer: (s.currentPlayer + 1) % 4,
      }
    })
  }, [humanPos])
  
  // ── AI Turn ────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (state.currentPlayer === humanPos) return
    if (state.phase === 'deal' || state.phase === 'handEnd' || state.phase === 'gameEnd') return
    
    const timer = setTimeout(() => {
      setState(prevState => {
        const pos = prevState.currentPlayer
        
        // Skip partner if going alone
        if (prevState.alonePlayer !== null) {
          const aloneTeam = prevState.alonePlayer % 2
          const currentTeam = pos % 2
          if (aloneTeam === currentTeam && pos !== prevState.alonePlayer) {
            return {
              ...prevState,
              currentPlayer: (prevState.currentPlayer + 1) % 4,
            }
          }
        }
        
        if (prevState.phase === 'bid1') {
          const decision = aiShouldOrderUp(prevState.hands[pos], prevState.upcard, pos, prevState.dealer)
          if (decision) {
            const alone = false
            
            const newState = {
              ...prevState,
              phase: pos === prevState.dealer ? 'discard' : 'play',
              trump: prevState.upcard.suit,
              caller: pos,
              alonePlayer: alone ? pos : null,
              currentPlayer: pos === prevState.dealer ? pos : (prevState.dealer + 1) % 4,
              message: pos === prevState.dealer 
                ? `${POSITIONS[pos]} picks up and discards`
                : `${POSITIONS[(prevState.dealer + 1) % 4]} leads`,
              bidHistory: [...prevState.bidHistory, { position: pos, action: alone ? 'order-alone' : 'order' }],
            }
            
            if (pos === prevState.dealer) {
              newState.hands = prevState.hands.map((h, i) => i === prevState.dealer ? [...h, prevState.upcard] : h)
            }
            
            return newState
          } else {
            // Pass
            const nextPlayer = (pos + 1) % 4
            const newHistory = [...prevState.bidHistory, { position: pos, action: 'pass' }]
            
            if (prevState.biddingRound === 1 && nextPlayer === (prevState.dealer + 1) % 4) {
              return {
                ...prevState,
                biddingRound: 2,
                currentPlayer: nextPlayer,
                bidHistory: newHistory,
                message: `${POSITIONS[nextPlayer]}: Call a suit or pass?`,
              }
            } else {
              return {
                ...prevState,
                currentPlayer: nextPlayer,
                bidHistory: newHistory,
                message: `${POSITIONS[nextPlayer]}: Order up or pass?`,
              }
            }
          }
        } else if (prevState.phase === 'bid2') {
          const isDealer = pos === prevState.dealer
          const called = aiCallTrump(prevState.hands[pos], prevState.upcard)
          
          if (called || isDealer) {
            const suit = called || SUITS.filter(s => s !== prevState.upcard.suit)[Math.floor(Math.random() * 3)]
            const alone = false
            
            return {
              ...prevState,
              phase: 'play',
              trump: suit,
              caller: pos,
              alonePlayer: alone ? pos : null,
              currentPlayer: (prevState.dealer + 1) % 4,
              message: `${POSITIONS[(prevState.dealer + 1) % 4]} leads`,
              bidHistory: [...prevState.bidHistory, { position: pos, action: alone ? `call-${suit}-alone` : `call-${suit}` }],
            }
          } else {
            // Pass
            const nextPlayer = (pos + 1) % 4
            const newHistory = [...prevState.bidHistory, { position: pos, action: 'pass' }]
            
            if (nextPlayer === prevState.dealer) {
              return {
                ...prevState,
                currentPlayer: nextPlayer,
                bidHistory: newHistory,
                message: `${POSITIONS[nextPlayer]}: Dealer must call a suit`,
              }
            } else {
              return {
                ...prevState,
                currentPlayer: nextPlayer,
                bidHistory: newHistory,
                message: `${POSITIONS[nextPlayer]}: Call a suit or pass?`,
              }
            }
          }
        } else if (prevState.phase === 'discard') {
          const card = aiDiscard(prevState.hands[pos], prevState.trump)
          
          return {
            ...prevState,
            phase: 'play',
            hands: prevState.hands.map((h, i) => i === prevState.dealer ? h.filter(c => cardKey(c) !== cardKey(card)) : h),
            currentPlayer: (prevState.dealer + 1) % 4,
            message: `${POSITIONS[(prevState.dealer + 1) % 4]} leads`,
          }
        } else if (prevState.phase === 'play') {
          const card = aiPlayCard(prevState.hands[pos], prevState.trick, prevState.trump)
          
          const newTrick = [...prevState.trick, { position: POSITIONS[pos], card }]
          const newHands = prevState.hands.map((h, i) => i === pos ? h.filter(c => cardKey(c) !== cardKey(card)) : h)
          
          return {
            ...prevState,
            trick: newTrick,
            hands: newHands,
            currentPlayer: (prevState.currentPlayer + 1) % 4,
          }
        }
        
        return prevState
      })
    }, 800)
    
    return () => clearTimeout(timer)
  }, [state.currentPlayer, state.phase, humanPos])
  
  // ── Trick Complete ─────────────────────────────────────────────────
  
  useEffect(() => {
    if (state.phase !== 'play') return
    
    const expectedTrickSize = state.alonePlayer !== null ? 3 : 4
    if (state.trick.length < expectedTrickSize) return
    
    const winner = trickWinner(state.trick, state.trump)
    const winnerIdx = POSITIONS.indexOf(winner)
    const winnerTeam = winnerIdx % 2
    
    const newTricksWon = [...state.tricksWon]
    newTricksWon[winnerTeam]++
    
    const allHandsEmpty = state.hands.every(h => h.length === 0)
    
    const timer = setTimeout(() => {
      if (allHandsEmpty) {
        const callerTeam = state.caller % 2
        const callerTricks = newTricksWon[callerTeam]
        
        let points = 0
        let msg = ''
        
        if (callerTricks >= 3) {
          if (callerTricks === 5) {
            points = state.alonePlayer !== null ? 4 : 2
            msg = state.alonePlayer !== null ? 'March (alone) - 4 points!' : 'March - 2 points!'
          } else {
            points = 1
            msg = '1 point'
          }
          
          const newScore = [...state.score]
          newScore[callerTeam] += points
          
          if (newScore[callerTeam] >= 10) {
            setState(s => ({
              ...s,
              phase: 'gameEnd',
              score: newScore,
              tricksWon: newTricksWon,
              trick: [],
              message: `Team ${callerTeam === 0 ? 'North/South' : 'East/West'} wins the game!`,
            }))
          } else {
            setState(s => ({
              ...s,
              phase: 'handEnd',
              score: newScore,
              tricksWon: newTricksWon,
              trick: [],
              message: `${POSITIONS[s.caller]} team: ${msg}. Click Deal for next hand.`,
            }))
          }
        } else {
          points = 2
          msg = 'Euchred! 2 points to opponents!'
          
          const newScore = [...state.score]
          newScore[1 - callerTeam] += points
          
          if (newScore[1 - callerTeam] >= 10) {
            setState(s => ({
              ...s,
              phase: 'gameEnd',
              score: newScore,
              tricksWon: newTricksWon,
              trick: [],
              message: `Team ${1 - callerTeam === 0 ? 'North/South' : 'East/West'} wins the game!`,
            }))
          } else {
            setState(s => ({
              ...s,
              phase: 'handEnd',
              score: newScore,
              tricksWon: newTricksWon,
              trick: [],
              message: `${msg} Click Deal for next hand.`,
            }))
          }
        }
      } else {
        setState(s => ({
          ...s,
          trick: [],
          tricksWon: newTricksWon,
          currentPlayer: winnerIdx,
          message: `${winner} won the trick`,
        }))
      }
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [state.trick, state.phase, state.trump, state.hands, state.tricksWon, state.caller, state.alonePlayer, state.score])
  
  const handleNextHand = useCallback(() => {
    setState(s => ({
      ...initGame(),
      dealer: (s.dealer + 1) % 4,
      score: s.score,
      message: 'Click Deal to start',
    }))
  }, [])
  
  const handleNewGame = useCallback(() => {
    setState(initGame())
  }, [])
  
  const humanHand = state.hands[humanPos]
  
  const renderCard = (card, clickable = false, onClick = null) => {
    const isRed = ['♥', '♦'].includes(card.suit)
    const key = cardKey(card)
    
    return (
      <div
        key={key}
        onClick={onClick}
        style={{
          width: 60,
          height: 90,
          background: 'white',
          border: '2px solid #333',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: isRed ? '#dc2626' : '#1f2937',
          cursor: clickable ? 'pointer' : 'default',
          transition: 'transform 0.1s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
        className={clickable ? 'hover:scale-105' : ''}
      >
        <div>{card.rank}</div>
        <div style={{ fontSize: '1.2rem' }}>{card.suit}</div>
      </div>
    )
  }
  
  const renderCardBack = (idx) => (
    <div
      key={`back-${idx}`}
      style={{
        width: 60,
        height: 90,
        background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
        border: '2px solid #1e3a8a',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}
    >
      🂠
    </div>
  )
  
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">♠️ Euchre ♣️</h2>
        <p className="text-sm opacity-80">4-player trick-taking card game · First team to 10 wins</p>
      </div>
      
      {/* Score */}
      <div className="flex gap-6">
        <div className="px-6 py-3 bg-blue-100 dark:bg-blue-900 rounded-xl text-center">
          <div className="text-sm font-semibold opacity-80">North/South</div>
          <div className="text-3xl font-bold">{state.score[0]}</div>
        </div>
        <div className="px-6 py-3 bg-green-100 dark:bg-green-900 rounded-xl text-center">
          <div className="text-sm font-semibold opacity-80">East/West</div>
          <div className="text-3xl font-bold">{state.score[1]}</div>
        </div>
      </div>
      
      {/* Trump & Status */}
      {state.trump && (
        <div className="px-6 py-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
          <span className="font-semibold">Trump: </span>
          <span style={{ fontSize: '1.5rem', color: ['♥', '♦'].includes(state.trump) ? '#dc2626' : '#1f2937' }}>
            {state.trump}
          </span>
          {state.alonePlayer !== null && (
            <span className="ml-3 text-sm font-semibold">({POSITIONS[state.alonePlayer]} going alone)</span>
          )}
        </div>
      )}
      
      {/* Dealer indicator */}
      <div className="text-sm font-semibold opacity-80">
        Dealer: {POSITIONS[state.dealer]}
      </div>
      
      {/* Message */}
      <div className="text-center text-lg font-semibold min-h-[2rem]">
        {state.message}
      </div>
      
      {/* Playing Field */}
      <div className="relative w-full h-96 bg-green-700 rounded-2xl border-4 border-green-900 flex items-center justify-center">
        {/* North */}
        <div className="absolute top-4 flex gap-2">
          {state.hands[2].map((_, idx) => renderCardBack(`north-${idx}`))}
        </div>
        
        {/* East */}
        <div className="absolute right-4 flex flex-col gap-2">
          {state.hands[1].map((_, idx) => renderCardBack(`east-${idx}`))}
        </div>
        
        {/* West */}
        <div className="absolute left-4 flex flex-col gap-2">
          {state.hands[3].map((_, idx) => renderCardBack(`west-${idx}`))}
        </div>
        
        {/* Trick in center */}
        <div className="flex gap-3">
          {state.trick.map(t => (
            <div key={`${t.position}-${cardKey(t.card)}`} className="flex flex-col items-center gap-1">
              {renderCard(t.card)}
              <span className="text-xs text-white font-semibold">{t.position}</span>
            </div>
          ))}
        </div>
        
        {/* Upcard (during bidding) */}
        {(state.phase === 'bid1' || state.phase === 'bid2') && state.upcard && (
          <div className="absolute bottom-4 right-4">
            {renderCard(state.upcard)}
          </div>
        )}
        
        {/* Tricks won */}
        <div className="absolute top-2 left-2 text-white text-xs font-semibold bg-black bg-opacity-50 px-2 py-1 rounded">
          N/S: {state.tricksWon[0]} tricks · E/W: {state.tricksWon[1]} tricks
        </div>
      </div>
      
      {/* Human Hand (South) */}
      <div className="flex flex-col items-center gap-3">
        <div className="text-sm font-semibold">Your Hand (South)</div>
        <div className="flex gap-2 flex-wrap justify-center">
          {humanHand.map(card => {
            const clickable = state.phase === 'play' && state.currentPlayer === humanPos
              && canPlayCard(card, humanHand, state.trick, state.trump)
            const discardable = state.phase === 'discard' && state.currentPlayer === humanPos
            
            return renderCard(
              card,
              clickable || discardable,
              clickable ? () => handlePlayCard(card) : discardable ? () => handleDiscard(card) : null
            )
          })}
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex gap-3 flex-wrap justify-center">
        {state.phase === 'deal' && (
          <button onClick={handleDeal} className="btn-primary">
            Deal Cards
          </button>
        )}
        
        {state.phase === 'bid1' && state.currentPlayer === humanPos && (
          <>
            <button onClick={handleOrderUp} className="btn-primary bg-green-600 hover:bg-green-700">
              Order Up {state.upcard?.suit}
            </button>
            <button onClick={handlePass} className="btn-ghost">
              Pass
            </button>
          </>
        )}
        
        {state.phase === 'bid2' && state.currentPlayer === humanPos && (
          <>
            {SUITS.filter(s => s !== state.upcard?.suit).map(suit => (
              <button
                key={suit}
                onClick={() => handleCallTrump(suit)}
                className="btn-primary"
                style={{ color: ['♥', '♦'].includes(suit) ? '#dc2626' : '#1f2937' }}
              >
                Call {suit}
              </button>
            ))}
            {state.currentPlayer !== state.dealer && (
              <button onClick={handlePass} className="btn-ghost">
                Pass
              </button>
            )}
          </>
        )}
        
        {state.phase === 'handEnd' && (
          <button onClick={handleNextHand} className="btn-primary">
            Next Hand
          </button>
        )}
        
        {state.phase === 'gameEnd' && (
          <button onClick={handleNewGame} className="btn-primary">
            New Game
          </button>
        )}
      </div>
      
      {/* Rules */}
      <details className="w-full max-w-2xl">
        <summary className="cursor-pointer font-semibold text-sm">Rules</summary>
        <div className="mt-2 text-sm space-y-2 opacity-90">
          <p><strong>Objective:</strong> First team to 10 points wins.</p>
          <p><strong>Trump:</strong> One suit is trump. Right bower (J of trump) is highest, then left bower (J of same color), then A-K-Q-10-9 of trump.</p>
          <p><strong>Bidding:</strong> Round 1: order up the upcard or pass. Round 2: call another suit or pass (dealer must call).</p>
          <p><strong>Going Alone:</strong> Caller can go alone; partner sits out. March alone = 4 points, otherwise 1-2 points.</p>
          <p><strong>Play:</strong> Must follow suit. Highest card of led suit wins, unless trump is played.</p>
          <p><strong>Scoring:</strong> 3-4 tricks = 1 point. 5 tricks (march) = 2 points. Fail to win 3 (euchred) = opponents get 2 points.</p>
        </div>
      </details>
    </div>
  )
}
