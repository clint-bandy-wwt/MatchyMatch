import { useState, useEffect, useCallback, useRef } from 'react'

// ── Card and Deck utilities ──────────────────────────────────────────

const SUITS = ['♠', '♣', '♥', '♦']
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A']
const SUIT_NAMES = { '♠': 'Spades', '♣': 'Clubs', '♥': 'Hearts', '♦': 'Diamonds' }
const SUIT_COLORS = { '♠': 'black', '♣': 'black', '♥': 'red', '♦': 'red' }

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

// BUG FIX 1: Add trump tier to cardValue so trump always beats non-trump
export function cardValue(card, trump) {
  if (!trump) return 0
  
  const isTrump = effectiveSuit(card, trump) === trump
  
  // Right bower (trump jack) = highest
  if (card.rank === 'J' && card.suit === trump) return 1000 + 11
  
  // Left bower (same color jack) = second highest
  const otherSuit = trump === '♠' ? '♣' : trump === '♣' ? '♠' : trump === '♥' ? '♦' : '♥'
  if (card.rank === 'J' && card.suit === otherSuit) return 1000 + 10
  
  // Trump cards get 1000+ base value
  if (isTrump) {
    const vals = { 'A': 6, 'K': 5, 'Q': 4, '10': 3, '9': 2 }
    return 1000 + (vals[card.rank] || 0)
  }
  
  // Non-trump cards (no 1000 base)
  const vals = { 'A': 6, 'K': 5, 'Q': 4, 'J': 3, '10': 2, '9': 1 }
  return vals[card.rank] || 0
}

export function effectiveSuit(card, trump) {
  // Left bower counts as trump suit
  if (card.rank === 'J') {
    const otherSuit = trump === '♠' ? '♣' : trump === '♣' ? '♠' : trump === '♥' ? '♦' : '♥'
    if (card.suit === otherSuit) return trump
  }
  return card.suit
}

export function canFollow(hand, leadSuit, trump) {
  return hand.some(c => effectiveSuit(c, trump) === leadSuit)
}

// ── AI Logic ──────────────────────────────────────────────────────────

function aiDecideBid(hand, turnedCard, position, dealer, passed) {
  // Simple heuristic: count trump cards and high cards
  const trumpSuit = turnedCard.suit
  let trumpCount = 0
  let highCards = 0
  
  for (const card of hand) {
    const eff = effectiveSuit(card, trumpSuit)
    if (eff === trumpSuit) {
      trumpCount++
      if (card.rank === 'J' && card.suit === trumpSuit) highCards += 2 // Right bower
      else if (card.rank === 'J') highCards += 2 // Left bower
      else if (card.rank === 'A' || card.rank === 'K') highCards++
    } else if (card.rank === 'A') {
      highCards++
    }
  }
  
  // Dealer is more likely to pick up
  const threshold = position === dealer ? 2.5 : 3
  const score = trumpCount + highCards / 2
  
  return score >= threshold
}

function aiChooseTrump(hand, turnedSuit) {
  // Count strength in each suit
  const scores = {}
  for (const suit of SUITS) {
    if (suit === turnedSuit) continue // Can't choose turned-up suit in second round
    
    let count = 0
    let strength = 0
    for (const card of hand) {
      const eff = effectiveSuit(card, suit)
      if (eff === suit) {
        count++
        if (card.rank === 'J' && card.suit === suit) strength += 3
        else if (card.rank === 'J') strength += 2.5
        else if (card.rank === 'A') strength += 2
        else if (card.rank === 'K') strength += 1.5
        else strength += 1
      }
    }
    scores[suit] = count + strength
  }
  
  // Choose best suit
  let best = null
  let bestScore = 2 // Minimum threshold
  for (const [suit, score] of Object.entries(scores)) {
    if (score > bestScore) {
      best = suit
      bestScore = score
    }
  }
  
  return best
}

// BUG FIX 7: Don't mutate state - copy arrays before sorting
function aiPlayCard(hand, trick, trump, position, partnerPosition) {
  if (trick.length === 0) {
    // Lead: play highest trump or highest card
    const trumpCards = hand.filter(c => effectiveSuit(c, trump) === trump)
    if (trumpCards.length > 0) {
      const sorted = [...trumpCards].sort((a, b) => cardValue(b, trump) - cardValue(a, trump))
      return sorted[0]
    }
    const sorted = [...hand].sort((a, b) => cardValue(b, trump) - cardValue(a, trump))
    return sorted[0]
  }
  
  const leadCard = trick[0].card
  const leadSuit = effectiveSuit(leadCard, trump)
  const mustFollow = canFollow(hand, leadSuit, trump)
  
  let playable = mustFollow 
    ? hand.filter(c => effectiveSuit(c, trump) === leadSuit)
    : hand
  
  // Determine if partner is winning - BUG FIX 1: Compare card values properly
  let partnerWinning = false
  if (trick.length >= 2) {
    const winningCard = trick.reduce((best, t) => {
      // With trump tier, cardValue comparison just works
      return cardValue(t.card, trump) > cardValue(best.card, trump) ? t : best
    }, trick[0])
    partnerWinning = winningCard.position === partnerPosition
  }
  
  if (partnerWinning) {
    // Partner winning: play lowest card
    const sorted = [...playable].sort((a, b) => cardValue(a, trump) - cardValue(b, trump))
    return sorted[0]
  } else {
    // Try to win: play lowest winning card, or highest card if can't win
    const currentBest = trick.reduce((best, t) => {
      return cardValue(t.card, trump) > cardValue(best.card, trump) ? t : best
    }, trick[0])
    
    const winning = playable.filter(c => cardValue(c, trump) > cardValue(currentBest.card, trump))
    
    if (winning.length > 0) {
      const sorted = [...winning].sort((a, b) => cardValue(a, trump) - cardValue(b, trump))
      return sorted[0]
    } else {
      const sorted = [...playable].sort((a, b) => cardValue(a, trump) - cardValue(b, trump))
      return sorted[0]
    }
  }
}

// ── Card component ────────────────────────────────────────────────────

function Card({ card, onClick, disabled, small }) {
  const color = SUIT_COLORS[card.suit]
  const size = small ? 'text-sm' : 'text-base'
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative ${size} font-bold transition-all duration-200`}
      style={{
        width: small ? 50 : 70,
        height: small ? 70 : 98,
        borderRadius: 8,
        background: 'white',
        border: '2px solid #ddd',
        color: color === 'red' ? '#e31c79' : '#1c0087',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transform: disabled ? 'scale(1)' : 'scale(1)',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-8px)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
        }
      }}
    >
      <span>{card.rank}</span>
      <span style={{ fontSize: small ? '1.2rem' : '1.5rem' }}>{card.suit}</span>
    </button>
  )
}

function CardBack({ small }) {
  return (
    <div
      style={{
        width: small ? 50 : 70,
        height: small ? 70 : 98,
        borderRadius: 8,
        background: 'linear-gradient(140deg, #1629b4 0%, #8212c4 100%)',
        border: '2px solid #4e4f5f',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: small ? '1rem' : '1.5rem',
      }}
    >
      🃏
    </div>
  )
}

// ── Main Euchre Board ─────────────────────────────────────────────────

const POSITIONS = ['South', 'West', 'North', 'East']
const POSITION_LABELS = { South: '👤 You', West: '🤖 West', North: '🤖 North', East: '🤖 East' }

export default function EuchreBoard() {
  const [gamePhase, setGamePhase] = useState('deal') // 'deal' | 'bid1' | 'bid2' | 'play' | 'handOver'  | 'dealerDiscard'
  const [hands, setHands] = useState({ South: [], West: [], North: [], East: [] })
  const [turnedCard, setTurnedCard] = useState(null)
  const [dealer, setDealer] = useState('South')
  const [trump, setTrump] = useState(null)
  const [maker, setMaker] = useState(null)
  const [currentPlayer, setCurrentPlayer] = useState('West')
  const [trick, setTrick] = useState([])
  const [tricksWon, setTricksWon] = useState({ 'N-S': 0, 'E-W': 0 })
  const [score, setScore] = useState({ 'N-S': 0, 'E-W': 0 })
  const [message, setMessage] = useState('')
  const [bidPasses, setBidPasses] = useState([])
  const [lastWinner, setLastWinner] = useState(null)
  
  // BUG FIX 6: Use ref to force redeal
  const dealCountRef = useRef(0)

  // BUG FIX 2 & 3: Use refs for current trick/hands to avoid stale closures
  const trickRef = useRef(trick)
  const handsRef = useRef(hands)
  
  useEffect(() => {
    trickRef.current = trick
  }, [trick])
  
  useEffect(() => {
    handsRef.current = hands
  }, [hands])

  const dealCards = useCallback(() => {
    const deck = shuffleDeck(createDeck())
    const newHands = { South: [], West: [], North: [], East: [] }
    
    // Deal 5 cards to each player
    let idx = 0
    for (let i = 0; i < 5; i++) {
      for (const pos of POSITIONS) {
        newHands[pos].push(deck[idx++])
      }
    }
    
    const turned = deck[idx]
    
    setHands(newHands)
    setTurnedCard(turned)
    setTrick([])
    setTricksWon({ 'N-S': 0, 'E-W': 0 })
    setTrump(null)
    setMaker(null)
    setBidPasses([])
    setLastWinner(null)
    
    // Next player after dealer starts bidding
    const dealerIdx = POSITIONS.indexOf(dealer)
    const nextIdx = (dealerIdx + 1) % 4
    setCurrentPlayer(POSITIONS[nextIdx])
    setGamePhase('bid1')
    setMessage('Bidding round 1: Order up or pass')
  }, [dealer, dealCountRef.current])

  useEffect(() => {
    if (gamePhase === 'deal') {
      dealCards()
    }
  }, [gamePhase, dealCards])

  // Trigger AI bidding when needed
  useEffect(() => {
    if (gamePhase !== 'bid1' && gamePhase !== 'bid2') return
    if (currentPlayer === 'South') return
    if (!turnedCard) return
    
    const timer = setTimeout(() => {
      if (gamePhase === 'bid1') {
        aiBid1(currentPlayer)
      } else if (gamePhase === 'bid2') {
        aiBid2(currentPlayer)
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [gamePhase, currentPlayer, turnedCard])

  const nextPosition = (pos) => {
    const idx = POSITIONS.indexOf(pos)
    return POSITIONS[(idx + 1) % 4]
  }

  const partnership = (pos) => {
    return pos === 'North' || pos === 'South' ? 'N-S' : 'E-W'
  }

  // BUG FIX 4: Add dealer discard handler
  const handleDealerDiscard = (card) => {
    if (dealer !== 'South') return
    
    const hand = hands.South
    const newHand = hand.filter(c => cardKey(c) !== cardKey(card))
    setHands({ ...hands, South: newHand })
    
    // Start play
    const dealerIdx = POSITIONS.indexOf(dealer)
    const leadIdx = (dealerIdx + 1) % 4
    setCurrentPlayer(POSITIONS[leadIdx])
    setGamePhase('play')
    setMessage(`${SUIT_NAMES[trump]} is trump. ${POSITION_LABELS[POSITIONS[leadIdx]]} leads.`)
    
    if (POSITIONS[leadIdx] !== 'South') {
      setTimeout(() => aiPlay(POSITIONS[leadIdx]), 1000)
    }
  }

  const handleBid = (orderUp) => {
    if (currentPlayer !== 'South') return
    
    if (orderUp) {
      setTrump(turnedCard.suit)
      setMaker(currentPlayer)
      
      // Dealer picks up the turned card
      const dealerHand = [...hands[dealer]]
      dealerHand.push(turnedCard)
      setHands({ ...hands, [dealer]: dealerHand })
      setTurnedCard(null)
      
      // BUG FIX 4: If human is dealer, go to discard phase
      if (dealer === 'South') {
        setGamePhase('dealerDiscard')
        setMessage('You picked up the card. Discard one card.')
      } else {
        // Start play
        const dealerIdx = POSITIONS.indexOf(dealer)
        const leadIdx = (dealerIdx + 1) % 4
        setCurrentPlayer(POSITIONS[leadIdx])
        setGamePhase('play')
        setMessage(`${SUIT_NAMES[turnedCard.suit]} is trump. ${POSITION_LABELS[POSITIONS[leadIdx]]} leads.`)
        
        if (POSITIONS[leadIdx] !== 'South') {
          setTimeout(() => aiPlay(POSITIONS[leadIdx]), 1000)
        }
      }
    } else {
      setBidPasses([...bidPasses, currentPlayer])
      const next = nextPosition(currentPlayer)
      
      if (bidPasses.length + 1 === 4) {
        // All passed on round 1, start round 2
        setGamePhase('bid2')
        const dealerIdx = POSITIONS.indexOf(dealer)
        const nextIdx = (dealerIdx + 1) % 4
        setCurrentPlayer(POSITIONS[nextIdx])
        setBidPasses([])
        setMessage('Bidding round 2: Name trump or pass')
      } else {
        setCurrentPlayer(next)
      }
    }
  }

  const handleNameTrump = (suit) => {
    if (currentPlayer !== 'South' || !suit) return
    
    setTrump(suit)
    setMaker(currentPlayer)
    
    const dealerIdx = POSITIONS.indexOf(dealer)
    const leadIdx = (dealerIdx + 1) % 4
    setCurrentPlayer(POSITIONS[leadIdx])
    setGamePhase('play')
    setMessage(`${SUIT_NAMES[suit]} is trump. ${POSITION_LABELS[POSITIONS[leadIdx]]} leads.`)
    
    if (POSITIONS[leadIdx] !== 'South') {
      setTimeout(() => aiPlay(POSITIONS[leadIdx]), 1000)
    }
  }

  const aiBid1 = (position) => {
    const hand = hands[position]
    const decide = aiDecideBid(hand, turnedCard, position, dealer, bidPasses)
    
    if (decide) {
      setTrump(turnedCard.suit)
      setMaker(position)
      
      // Dealer picks up
      const dealerHand = [...hands[dealer]]
      dealerHand.push(turnedCard)
      
      // Dealer discards lowest card
      let newDealerHand = dealerHand
      if (dealer !== 'South') {
        const sorted = [...dealerHand].sort((a, b) => cardValue(a, turnedCard.suit) - cardValue(b, turnedCard.suit))
        newDealerHand = sorted.slice(1)
      }
      
      setHands({ ...hands, [dealer]: newDealerHand })
      setTurnedCard(null)
      
      // BUG FIX 4: If human is dealer, go to discard phase
      if (dealer === 'South') {
        setGamePhase('dealerDiscard')
        setMessage(`${POSITION_LABELS[position]} orders up. You must discard one card.`)
      } else {
        const dealerIdx = POSITIONS.indexOf(dealer)
        const leadIdx = (dealerIdx + 1) % 4
        setCurrentPlayer(POSITIONS[leadIdx])
        setGamePhase('play')
        setMessage(`${POSITION_LABELS[position]} orders up. ${SUIT_NAMES[turnedCard.suit]} is trump.`)
        
        if (POSITIONS[leadIdx] !== 'South') {
          setTimeout(() => aiPlay(POSITIONS[leadIdx]), 1500)
        }
      }
    } else {
      setBidPasses([...bidPasses, position])
      const next = nextPosition(position)
      
      if (bidPasses.length + 1 === 4) {
        setGamePhase('bid2')
        const dealerIdx = POSITIONS.indexOf(dealer)
        const nextIdx = (dealerIdx + 1) % 4
        setCurrentPlayer(POSITIONS[nextIdx])
        setBidPasses([])
        setMessage('All passed. Bidding round 2: Name trump or pass')
      } else {
        setCurrentPlayer(next)
      }
    }
  }

  const aiBid2 = (position) => {
    const hand = hands[position]
    const chosen = aiChooseTrump(hand, turnedCard ? turnedCard.suit : null)
    
    if (chosen) {
      setTrump(chosen)
      setMaker(position)
      
      const dealerIdx = POSITIONS.indexOf(dealer)
      const leadIdx = (dealerIdx + 1) % 4
      setCurrentPlayer(POSITIONS[leadIdx])
      setGamePhase('play')
      setMessage(`${POSITION_LABELS[position]} names ${SUIT_NAMES[chosen]} as trump.`)
      
      if (POSITIONS[leadIdx] !== 'South') {
        setTimeout(() => aiPlay(POSITIONS[leadIdx]), 1500)
      }
    } else {
      setBidPasses([...bidPasses, position])
      const next = nextPosition(position)
      
      // BUG FIX 5: Check bidPasses for bid2, not bid1 logic
      if (bidPasses.length + 1 === 4) {
        // All passed, redeal
        setMessage('All passed. Redealing...')
        setTimeout(() => {
          const nextDealer = nextPosition(dealer)
          setDealer(nextDealer)
          dealCountRef.current++
          setGamePhase('deal')
        }, 2000)
      } else {
        setCurrentPlayer(next)
      }
    }
  }

  const handlePlayCard = (card) => {
    if (currentPlayer !== 'South' || gamePhase !== 'play') return
    
    const hand = hands.South
    if (!hand.some(c => cardKey(c) === cardKey(card))) return
    
    // Check if must follow suit
    if (trick.length > 0) {
      const leadCard = trick[0].card
      const leadSuit = effectiveSuit(leadCard, trump)
      if (canFollow(hand, leadSuit, trump)) {
        const cardSuit = effectiveSuit(card, trump)
        if (cardSuit !== leadSuit) {
          setMessage('❌ Must follow suit!')
          setTimeout(() => setMessage(''), 1500)
          return
        }
      }
    }
    
    const newHand = hand.filter(c => cardKey(c) !== cardKey(card))
    setHands({ ...hands, South: newHand })
    
    // BUG FIX 2: Update trick state before setTimeout
    const newTrick = [...trick, { position: 'South', card }]
    setTrick(newTrick)
    
    if (newTrick.length === 4) {
      // Trick complete - pass newTrick directly
      setTimeout(() => resolveTrick(newTrick), 1500)
    } else {
      const next = nextPosition(currentPlayer)
      setCurrentPlayer(next)
      // BUG FIX 2: aiPlay will use ref to get current trick
      setTimeout(() => aiPlay(next), 1000)
    }
  }

  const aiPlay = (position) => {
    // BUG FIX 2 & 3: Use refs to get current state
    const currentHands = handsRef.current
    const currentTrick = trickRef.current
    
    const hand = currentHands[position]
    if (!hand || hand.length === 0) return
    
    const partnerPos = position === 'North' || position === 'South' ? (position === 'North' ? 'South' : 'North') : (position === 'West' ? 'East' : 'West')
    const card = aiPlayCard(hand, currentTrick, trump, position, partnerPos)
    
    const newHand = hand.filter(c => cardKey(c) !== cardKey(card))
    setHands(prev => ({ ...prev, [position]: newHand }))
    
    const newTrick = [...currentTrick, { position, card }]
    setTrick(newTrick)
    
    if (newTrick.length === 4) {
      // Pass newTrick directly to avoid closure issues
      setTimeout(() => resolveTrick(newTrick), 1500)
    } else {
      const next = nextPosition(position)
      setCurrentPlayer(next)
      
      if (next !== 'South') {
        setTimeout(() => aiPlay(next), 1000)
      }
    }
  }

  const resolveTrick = (completeTrick) => {
    // BUG FIX 1: With trump tier in cardValue, simply compare values
    let winner = completeTrick[0]
    for (const play of completeTrick) {
      if (cardValue(play.card, trump) > cardValue(winner.card, trump)) {
        winner = play
      }
    }
    
    const winTeam = partnership(winner.position)
    setTricksWon(prev => ({ ...prev, [winTeam]: prev[winTeam] + 1 }))
    setLastWinner(winner.position)
    
    setTrick([])
    
    // BUG FIX 3: Use ref to check current hand state
    const currentHands = handsRef.current
    if (currentHands.South.length === 0) {
      setTimeout(() => endHand(winTeam), 1000)
    } else {
      setCurrentPlayer(winner.position)
      setMessage(`${POSITION_LABELS[winner.position]} wins the trick`)
      
      if (winner.position !== 'South') {
        setTimeout(() => aiPlay(winner.position), 1500)
      }
    }
  }

  const endHand = (lastWinTeam) => {
    const makerTeam = partnership(maker)
    const tricksForMaker = tricksWon[makerTeam]
    const tricksForDefender = tricksWon[makerTeam === 'N-S' ? 'E-W' : 'N-S']
    
    // Include the last trick
    const finalMakerTricks = lastWinTeam === makerTeam ? tricksForMaker + 1 : tricksForMaker
    const finalDefenderTricks = lastWinTeam !== makerTeam ? tricksForDefender + 1 : tricksForDefender
    
    let points = 0
    let msg = ''
    
    if (finalMakerTricks >= 3) {
      if (finalMakerTricks === 5) {
        points = 2
        msg = `${makerTeam} marches! +2 points`
      } else {
        points = 1
        msg = `${makerTeam} takes ${finalMakerTricks} tricks. +1 point`
      }
      setScore(prev => ({ ...prev, [makerTeam]: prev[makerTeam] + points }))
    } else {
      points = 2
      const defTeam = makerTeam === 'N-S' ? 'E-W' : 'N-S'
      msg = `${makerTeam} euchred! ${defTeam} gets +2 points`
      setScore(prev => ({ ...prev, [defTeam]: prev[defTeam] + points }))
    }
    
    setMessage(msg)
    
    // Check for game win
    const newScore = { ...score }
    if (finalMakerTricks >= 3) {
      newScore[makerTeam] += points
    } else {
      const defTeam = makerTeam === 'N-S' ? 'E-W' : 'N-S'
      newScore[defTeam] += points
    }
    
    if (newScore['N-S'] >= 10 || newScore['E-W'] >= 10) {
      const winner = newScore['N-S'] >= 10 ? 'N-S' : 'E-W'
      setMessage(`${winner === 'N-S' ? '🎉 You and North' : 'West and East'} win the game!`)
      setGamePhase('gameOver')
    } else {
      setGamePhase('handOver')
    }
  }

  const handleNextHand = () => {
    const nextDealer = nextPosition(dealer)
    setDealer(nextDealer)
    setGamePhase('deal')
  }

  const handleNewGame = () => {
    setScore({ 'N-S': 0, 'E-W': 0 })
    setDealer('South')
    // BUG FIX 6: Force redeal by incrementing counter
    dealCountRef.current++
    setGamePhase('deal')
  }

  // ── Render hand over screen ───────────────────────────────────────
  if (gamePhase === 'handOver' || gamePhase === 'gameOver') {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
        <div
          className="flex flex-col items-center gap-6 p-8 rounded-3xl w-full"
          style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xl)' }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 22,
              background: gamePhase === 'gameOver' 
                ? 'linear-gradient(145deg, #0a84ff, #0a84ffdd)' 
                : 'linear-gradient(145deg, #ff9f0a, #ff9f0add)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              boxShadow: gamePhase === 'gameOver' ? '0 8px 24px #0a84ff40' : '0 8px 24px #ff9f0a40',
            }}
          >
            {gamePhase === 'gameOver' ? '🎉' : '✅'}
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <h2
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--label-primary)',
              }}
            >
              {message}
            </h2>
          </div>

          <div className="flex gap-4 w-full">
            <div className="flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl" style={{ background: 'var(--fill-tertiary)' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#0a84ff' }}>
                {score['N-S']}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--label-tertiary)' }}>
                North-South
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl" style={{ background: 'var(--fill-tertiary)' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#ff6b6b' }}>
                {score['E-W']}
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--label-tertiary)' }}>
                East-West
              </span>
            </div>
          </div>

          {gamePhase === 'handOver' && (
            <button onClick={handleNextHand} className="btn-primary w-full">
              Next Hand
            </button>
          )}
          
          {gamePhase === 'gameOver' && (
            <button onClick={handleNewGame} className="btn-primary w-full">
              New Game
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Render dealer discard screen ─────────────────────────────────────
  if (gamePhase === 'dealerDiscard') {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--label-primary)', textAlign: 'center' }}>
          🃏 Euchre
        </h2>

        <div
          className="flex flex-col items-center gap-4 p-6 rounded-3xl w-full"
          style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)' }}
        >
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--label-secondary)', textAlign: 'center' }}>
            {message}
          </p>

          <div style={{ fontSize: '0.85rem', color: 'var(--label-secondary)', textAlign: 'center' }}>
            Trump: {trump} {SUIT_NAMES[trump]}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span style={{ fontSize: '0.75rem', color: 'var(--label-tertiary)', textTransform: 'uppercase' }}>
            Your Hand (click a card to discard)
          </span>
          <div className="flex gap-2">
            {hands.South.map((card, i) => (
              <Card key={i} card={card} onClick={() => handleDealerDiscard(card)} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Render bidding screens ────────────────────────────────────────
  if (gamePhase === 'bid1' || gamePhase === 'bid2') {
    const isYourTurn = currentPlayer === 'South'
    const availableSuits = gamePhase === 'bid2' ? SUITS.filter(s => turnedCard && s !== turnedCard.suit) : []

    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--label-primary)', textAlign: 'center' }}>
          🃏 Euchre
        </h2>

        <div className="flex gap-4 items-center">
          <div className="flex flex-col items-center gap-2 p-3 rounded-2xl" style={{ background: 'var(--fill-tertiary)' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0a84ff' }}>{score['N-S']}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--label-tertiary)' }}>N-S</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-3 rounded-2xl" style={{ background: 'var(--fill-tertiary)' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff6b6b' }}>{score['E-W']}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--label-tertiary)' }}>E-W</span>
          </div>
        </div>

        <div
          className="flex flex-col items-center gap-4 p-6 rounded-3xl w-full"
          style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)' }}
        >
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--label-secondary)', textAlign: 'center' }}>
            {message}
          </p>

          {turnedCard && (
            <div className="flex flex-col items-center gap-2">
              <span style={{ fontSize: '0.75rem', color: 'var(--label-tertiary)', textTransform: 'uppercase' }}>
                Turned Up Card
              </span>
              <Card card={turnedCard} disabled small />
            </div>
          )}

          <div style={{ fontSize: '0.85rem', color: 'var(--label-secondary)', textAlign: 'center' }}>
            {isYourTurn ? '👤 Your turn' : `${POSITION_LABELS[currentPlayer]} is bidding...`}
          </div>

          {isYourTurn && gamePhase === 'bid1' && (
            <div className="flex gap-3">
              <button onClick={() => handleBid(true)} className="btn-primary">
                Order Up
              </button>
              <button onClick={() => handleBid(false)} className="btn-ghost">
                Pass
              </button>
            </div>
          )}

          {isYourTurn && gamePhase === 'bid2' && (
            <div className="flex flex-col gap-3 w-full">
              <div className="flex gap-2 justify-center flex-wrap">
                {availableSuits.map(suit => (
                  <button
                    key={suit}
                    onClick={() => handleNameTrump(suit)}
                    className="btn-primary"
                    style={{ minWidth: 100 }}
                  >
                    {SUIT_NAMES[suit]} {suit}
                  </button>
                ))}
              </div>
              <button onClick={() => handleBid(false)} className="btn-ghost">
                Pass
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <span style={{ fontSize: '0.75rem', color: 'var(--label-tertiary)', textTransform: 'uppercase' }}>
            Your Hand
          </span>
          <div className="flex gap-2">
            {hands.South.map((card, i) => (
              <Card key={i} card={card} disabled small />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Render play screen ────────────────────────────────────────────
  const isYourTurn = currentPlayer === 'South'
  
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--label-primary)', textAlign: 'center' }}>
        🃏 Euchre
      </h2>

      <div className="flex gap-4 items-center">
        <div className="flex flex-col items-center gap-1 p-4 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '2px solid var(--fill-tertiary)', minWidth: 140 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--label-tertiary)', letterSpacing: '0.05em' }}>
            North-South
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#0a84ff', lineHeight: 1 }}>
            {score['N-S']}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--label-secondary)' }}>
            {tricksWon['N-S']} tricks
          </span>
        </div>
        
        <div className="flex flex-col items-center gap-1 p-3 rounded-2xl" style={{ background: 'var(--fill-secondary)', minWidth: 80 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--label-tertiary)', letterSpacing: '0.05em' }}>
            Trump
          </span>
          <span style={{ fontSize: '2rem', lineHeight: 1 }}>
            {trump}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--label-secondary)' }}>
            {SUIT_NAMES[trump]}
          </span>
        </div>
        
        <div className="flex flex-col items-center gap-1 p-4 rounded-2xl" style={{ background: 'var(--bg-surface)', border: '2px solid var(--fill-tertiary)', minWidth: 140 }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--label-tertiary)', letterSpacing: '0.05em' }}>
            East-West
          </span>
          <span style={{ fontSize: '2rem', fontWeight: 700, color: '#ff6b6b', lineHeight: 1 }}>
            {score['E-W']}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--label-secondary)' }}>
            {tricksWon['E-W']} tricks
          </span>
        </div>
      </div>

      {message && (
        <div 
          className="px-4 py-2 rounded-2xl"
          style={{ background: 'var(--fill-tertiary)' }}
        >
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--label-primary)', textAlign: 'center', margin: 0 }}>
          {message}
        </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 w-full">
        {/* North */}
        <div className="flex flex-col items-center gap-2">
          <span style={{ fontSize: '0.75rem', color: 'var(--label-tertiary)' }}>
            {POSITION_LABELS.North} {currentPlayer === 'North' ? '⚡' : ''}
          </span>
          <div className="flex gap-1">
            {hands.North.map((_, i) => (
              <CardBack key={i} small />
            ))}
          </div>
        </div>

        {/* West - Trick - East */}
        <div className="flex items-center justify-between w-full gap-4" style={{ maxWidth: 600 }}>
          <div className="flex flex-col items-center gap-2">
            <span style={{ fontSize: '0.75rem', color: 'var(--label-tertiary)' }}>
              {POSITION_LABELS.West} {currentPlayer === 'West' ? '⚡' : ''}
            </span>
            <div className="flex flex-col gap-1">
              {hands.West.map((_, i) => (
                <CardBack key={i} small />
              ))}
            </div>
          </div>

          <div
            className="flex items-center justify-center gap-3 flex-1 p-4 rounded-2xl"
            style={{ background: 'var(--fill-secondary)', minHeight: 120 }}
          >
            {trick.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--label-tertiary)' }}>
                {isYourTurn ? 'Play a card' : `${POSITION_LABELS[currentPlayer]}'s turn`}
              </span>
            ) : (
              trick.map((play, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <Card card={play.card} disabled small />
                  <span style={{ fontSize: '0.65rem', color: 'var(--label-tertiary)' }}>
                    {POSITION_LABELS[play.position]}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <span style={{ fontSize: '0.75rem', color: 'var(--label-tertiary)' }}>
              {POSITION_LABELS.East} {currentPlayer === 'East' ? '⚡' : ''}
            </span>
            <div className="flex flex-col gap-1">
              {hands.East.map((_, i) => (
                <CardBack key={i} small />
              ))}
            </div>
          </div>
        </div>

        {/* South (You) */}
        <div className="flex flex-col items-center gap-2">
          <span style={{ fontSize: '0.75rem', color: 'var(--label-tertiary)' }}>
            {POSITION_LABELS.South} {currentPlayer === 'South' ? '⚡' : ''}
          </span>
          <div className="flex gap-2">
            {hands.South.map((card, i) => (
              <Card
                key={i}
                card={card}
                onClick={() => handlePlayCard(card)}
                disabled={!isYourTurn}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
