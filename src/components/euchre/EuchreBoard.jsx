import { useState, useEffect, useCallback, useRef } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♦', '♣']
const SUIT_NAMES = { '♠': 'Spades', '♥': 'Hearts', '♦': 'Diamonds', '♣': 'Clubs' }
const SUIT_COLORS = { '♠': '#000', '♥': '#e31c79', '♦': '#e31c79', '♣': '#000' }
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A']
const POSITIONS = ['South', 'West', 'North', 'East'] // South is human

// ── Helpers ──────────────────────────────────────────────────────────────────

function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
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

function getOppositeColor(suit) {
  if (suit === '♠') return '♣'
  if (suit === '♣') return '♠'
  if (suit === '♥') return '♦'
  if (suit === '♦') return '♥'
  return null
}

function isLeftBower(card, trump) {
  return card.rank === 'J' && card.suit === getOppositeColor(trump)
}

function isRightBower(card, trump) {
  return card.rank === 'J' && card.suit === trump
}

function getEffectiveSuit(card, trump) {
  // Left bower is considered trump suit
  if (isLeftBower(card, trump)) return trump
  return card.suit
}

function getCardValue(card, trump, leadSuit) {
  const effectiveSuit = getEffectiveSuit(card, trump)
  
  // Right bower (J of trump) is highest
  if (isRightBower(card, trump)) return 100
  
  // Left bower (J of opposite color) is second highest
  if (isLeftBower(card, trump)) return 99
  
  // Trump cards ranked by rank
  if (effectiveSuit === trump) {
    const rankValue = { 'A': 6, 'K': 5, 'Q': 4, '10': 3, '9': 2 }[card.rank] || 0
    return 50 + rankValue
  }
  
  // Lead suit cards (if not trump)
  if (effectiveSuit === leadSuit && leadSuit !== trump) {
    const rankValue = { 'A': 6, 'K': 5, 'Q': 4, 'J': 3, '10': 2, '9': 1 }[card.rank] || 0
    return 10 + rankValue
  }
  
  // Off-suit cards have no value
  return 0
}

function determineWinner(trick, trump) {
  const leadSuit = getEffectiveSuit(trick[0].card, trump)
  let winnerIdx = 0
  let highestValue = getCardValue(trick[0].card, trump, leadSuit)
  
  for (let i = 1; i < trick.length; i++) {
    const value = getCardValue(trick[i].card, trump, leadSuit)
    if (value > highestValue) {
      highestValue = value
      winnerIdx = i
    }
  }
  
  return trick[winnerIdx].position
}

function canPlayCard(card, hand, leadSuit, trump) {
  if (!leadSuit) return true // First card of trick
  
  const effectiveSuit = getEffectiveSuit(card, trump)
  const leadEffective = leadSuit
  
  // Must follow suit if able
  const hasLeadSuit = hand.some(c => getEffectiveSuit(c, trump) === leadEffective)
  if (!hasLeadSuit) return true // Can play anything if don't have lead suit
  
  return effectiveSuit === leadEffective
}

// ── AI Logic ─────────────────────────────────────────────────────────────────

function _aiShouldOrderUp(hand, upcard, position, dealer) {
  // Simple AI: order up if has 2+ trump including face cards or bowers
  const trump = upcard.suit
  const trumpCards = hand.filter(c => getEffectiveSuit(c, trump) === trump)
  const hasBower = trumpCards.some(c => c.rank === 'J')
  const faceCount = trumpCards.filter(c => ['J', 'Q', 'K', 'A'].includes(c.rank)).length
  
  // Dealer is more likely to pick up
  const threshold = position === dealer ? 1 : 2
  
  return hasBower || faceCount >= threshold
}

function _aiChooseTrump(hand, excludeSuit) {
  // Count strength in each suit
  const suitStrength = {}
  for (const suit of SUITS) {
    if (suit === excludeSuit) continue
    const cards = hand.filter(c => getEffectiveSuit(c, suit) === suit || isLeftBower(c, suit))
    const faceCount = cards.filter(c => ['J', 'Q', 'K', 'A'].includes(c.rank)).length
    suitStrength[suit] = cards.length * 10 + faceCount * 5
  }
  
  const bestSuit = Object.keys(suitStrength).reduce((a, b) => 
    suitStrength[a] > suitStrength[b] ? a : b
  )
  
  // Only call if has at least 2 cards in suit
  const suitCards = hand.filter(c => getEffectiveSuit(c, bestSuit) === bestSuit || isLeftBower(c, bestSuit))
  return suitCards.length >= 2 ? bestSuit : null
}

function aiChooseDiscard(hand, trump) {
  // Discard lowest non-trump card, or lowest trump if all trump
  const nonTrump = hand.filter(c => getEffectiveSuit(c, trump) !== trump)
  if (nonTrump.length > 0) {
    // Find lowest value non-trump
    return nonTrump.reduce((lowest, card) => {
      const lowestVal = { '9': 1, '10': 2, 'J': 3, 'Q': 4, 'K': 5, 'A': 6 }[lowest.rank] || 0
      const cardVal = { '9': 1, '10': 2, 'J': 3, 'Q': 4, 'K': 5, 'A': 6 }[card.rank] || 0
      return cardVal < lowestVal ? card : lowest
    })
  }
  // All trump, discard lowest
  return hand.reduce((lowest, card) => {
    const lowestVal = getCardValue(lowest, trump, trump)
    const cardVal = getCardValue(card, trump, trump)
    return cardVal < lowestVal ? card : lowest
  })
}

function aiPlayCard(hand, currentTrick, trump) {
  const leadSuit = currentTrick.length > 0 ? getEffectiveSuit(currentTrick[0].card, trump) : null
  const playable = hand.filter(c => canPlayCard(c, hand, leadSuit, trump))
  
  if (playable.length === 0) return hand[0] // Shouldn't happen
  if (playable.length === 1) return playable[0]
  
  // If leading, play highest trump or highest card
  if (currentTrick.length === 0) {
    return playable.reduce((best, card) => {
      const bestVal = getCardValue(best, trump, trump)
      const cardVal = getCardValue(card, trump, trump)
      return cardVal > bestVal ? card : best
    })
  }
  
  // Try to win or throw off
  const winningCard = currentTrick.reduce((best, t) => {
    const bestVal = getCardValue(best, trump, leadSuit)
    const cardVal = getCardValue(t.card, trump, leadSuit)
    return cardVal > bestVal ? t.card : best
  }, currentTrick[0].card)
  
  const canWin = playable.filter(c => getCardValue(c, trump, leadSuit) > getCardValue(winningCard, trump, leadSuit))
  
  if (canWin.length > 0) {
    // Play lowest winning card
    return canWin.reduce((best, card) => {
      const bestVal = getCardValue(best, trump, leadSuit)
      const cardVal = getCardValue(card, trump, leadSuit)
      return cardVal < bestVal ? card : best
    })
  }
  
  // Can't win, throw lowest card
  return playable.reduce((best, card) => {
    const bestVal = getCardValue(best, trump, leadSuit)
    const cardVal = getCardValue(card, trump, leadSuit)
    return cardVal < bestVal ? card : best
  })
}

// ── Initial State ────────────────────────────────────────────────────────────

function initState() {
  const deck = shuffleDeck(createDeck())
  const hands = {
    South: deck.slice(0, 5),
    West: deck.slice(5, 10),
    North: deck.slice(10, 15),
    East: deck.slice(15, 20),
  }
  const upcard = deck[20]
  
  return {
    phase: 'bidding-round1', // bidding-round1, bidding-round2, discard, playing, hand-over, game-over
    hands,
    upcard,
    dealer: 0, // index in POSITIONS
    currentPlayer: 1, // West starts bidding (left of dealer)
    trump: null,
    maker: null, // position that called trump
    alonePlayer: null,
    currentTrick: [],
    trickLeader: null,
    tricksWon: { 'North-South': 0, 'East-West': 0 },
    score: { 'North-South': 0, 'East-West': 0 },
    message: '',
    lastTrick: null,
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EuchreBoard() {
  const [state, setState] = useState(initState)
  const [selectedCard, setSelectedCard] = useState(null)
  const [aloneOption, setAloneOption] = useState(false)
  const aiTimeoutRef = useRef(null)
  
  const dealerPos = POSITIONS[state.dealer]
  const currentPos = POSITIONS[state.currentPlayer]
  
  // ── Message Display ──────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (state.message) {
      const timer = setTimeout(() => {
        setState(s => ({ ...s, message: '' }))
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [state.message])
  
  // ── Bidding Round 1 ──────────────────────────────────────────────────────────
  
  const handleBidRound1 = useCallback((orderUp, goAlone = false) => {
    if (orderUp) {
      const trump = state.upcard.suit
      const maker = currentPos
      
      // Dealer picks up the card
      const newHands = { ...state.hands }
      newHands[dealerPos] = [...newHands[dealerPos], state.upcard]
      
      setState(s => ({
        ...s,
        phase: 'discard',
        currentPlayer: s.dealer,
        trump,
        maker,
        alonePlayer: goAlone ? maker : null,
        hands: newHands,
        message: `${maker} orders up ${SUIT_NAMES[trump]}${goAlone ? ' and goes alone!' : ''}`,
      }))
    } else {
      // Pass
      const nextPlayer = (state.currentPlayer + 1) % 4
      
      if (nextPlayer === (state.dealer + 1) % 4) {
        // Round 1 complete, move to round 2
        setState(s => ({
          ...s,
          phase: 'bidding-round2',
          currentPlayer: nextPlayer,
          message: 'Round 2 - choose a different suit',
        }))
      } else {
        setState(s => ({ ...s, currentPlayer: nextPlayer }))
      }
    }
  }, [state, currentPos, dealerPos])
  
  // ── Bidding Round 2 ──────────────────────────────────────────────────────────
  
  // ── Next Hand ────────────────────────────────────────────────────────────────
  
  const handleNextHand = useCallback(() => {
    const newDealer = (state.dealer + 1) % 4
    const deck = shuffleDeck(createDeck())
    const hands = {
      South: deck.slice(0, 5),
      West: deck.slice(5, 10),
      North: deck.slice(10, 15),
      East: deck.slice(15, 20),
    }
    const upcard = deck[20]
    
    setState(s => ({
      ...initState(),
      dealer: newDealer,
      currentPlayer: (newDealer + 1) % 4,
      hands,
      upcard,
      score: s.score,
    }))
  }, [state])
  
  const handleBidRound2 = useCallback((suit, goAlone = false) => {
    if (suit) {
      setState(s => ({
        ...s,
        phase: 'playing',
        trump: suit,
        maker: currentPos,
        alonePlayer: goAlone ? currentPos : null,
        currentPlayer: (s.dealer + 1) % 4, // Left of dealer leads
        trickLeader: (s.dealer + 1) % 4,
        message: `${currentPos} calls ${SUIT_NAMES[suit]}${goAlone ? ' and goes alone!' : ''}`,
      }))
    } else {
      // Pass
      const nextPlayer = (state.currentPlayer + 1) % 4
      
      if (nextPlayer === (state.dealer + 1) % 4) {
        // Everyone passed in both rounds, redeal
        handleNextHand()
      } else {
        setState(s => ({ ...s, currentPlayer: nextPlayer }))
      }
    }
  }, [state, currentPos, handleNextHand])
  
  // ── Discard ──────────────────────────────────────────────────────────────────
  
  const handleDiscard = useCallback((card) => {
    const newHands = { ...state.hands }
    newHands[dealerPos] = newHands[dealerPos].filter(c => c !== card)
    
    setState(s => ({
      ...s,
      phase: 'playing',
      hands: newHands,
      currentPlayer: (s.dealer + 1) % 4,
      trickLeader: (s.dealer + 1) % 4,
      message: `${dealerPos} discarded`,
    }))
  }, [state, dealerPos])
  
  // ── Play Card ────────────────────────────────────────────────────────────────
  
  const advanceToNextPlayer = useCallback(() => {
    setState(s => {
      let nextPlayer = (s.currentPlayer + 1) % 4
      
      // Check if we need to skip partner when going alone
      if (s.alonePlayer) {
        const makerTeam = s.maker === 'North' || s.maker === 'South' ? 'North-South' : 'East-West'
        const nextTeam = POSITIONS[nextPlayer] === 'North' || POSITIONS[nextPlayer] === 'South' ? 'North-South' : 'East-West'
        const isPartner = makerTeam === nextTeam && POSITIONS[nextPlayer] !== s.maker
        
        if (isPartner) {
          nextPlayer = (nextPlayer + 1) % 4
        }
      }
      
      return { ...s, currentPlayer: nextPlayer }
    })
  }, [])
  
  const handlePlayCard = useCallback((card) => {
    if (state.phase !== 'playing') return
    
    const leadSuit = state.currentTrick.length > 0 
      ? getEffectiveSuit(state.currentTrick[0].card, state.trump)
      : null
    
    if (!canPlayCard(card, state.hands[currentPos], leadSuit, state.trump)) {
      setState(s => ({ ...s, message: 'Must follow suit!' }))
      return
    }
    
    const newHands = { ...state.hands }
    newHands[currentPos] = newHands[currentPos].filter(c => c !== card)
    
    const newTrick = [...state.currentTrick, { position: currentPos, card }]
    
    setSelectedCard(null)
    
    // Determine expected trick size (3 if going alone, 4 otherwise)
    const expectedSize = state.alonePlayer ? 3 : 4
    
    if (newTrick.length === expectedSize) {
      // Trick complete
      const winner = determineWinner(newTrick, state.trump)
      const winnerTeam = winner === 'North' || winner === 'South' ? 'North-South' : 'East-West'
      const newTricksWon = { ...state.tricksWon }
      newTricksWon[winnerTeam]++
      
      // Check if hand is over (all 5 tricks)
      if (newTricksWon['North-South'] + newTricksWon['East-West'] === 5) {
        // Hand over, calculate score
        const makerTeam = state.maker === 'North' || state.maker === 'South' ? 'North-South' : 'East-West'
        const defenderTeam = makerTeam === 'North-South' ? 'East-West' : 'North-South'
        const makerTricks = newTricksWon[makerTeam]
        const newScore = { ...state.score }
        let msg = ''
        
        if (makerTricks === 5) {
          // March
          const points = state.alonePlayer ? 4 : 2
          newScore[makerTeam] += points
          msg = `${makerTeam} marches! +${points} points`
        } else if (makerTricks >= 3) {
          // Made it
          const points = 1  // Always 1 point for making it (3-4 tricks)
          newScore[makerTeam] += points
          msg = `${makerTeam} makes it! +${points} point${points > 1 ? 's' : ''}`
        } else {
          // Euchred
          newScore[defenderTeam] += 2
          msg = `${makerTeam} euchred! ${defenderTeam} +2 points`
        }
        
        if (newScore['North-South'] >= 10 || newScore['East-West'] >= 10) {
          setState(s => ({
            ...s,
            phase: 'game-over',
            score: newScore,
            message: msg,
            lastTrick: newTrick,
          }))
        } else {
          setState(s => ({
            ...s,
            phase: 'hand-over',
            score: newScore,
            tricksWon: newTricksWon,
            message: msg,
            lastTrick: newTrick,
            hands: newHands,
          }))
        }
      } else {
        // Next trick
        const winnerIdx = POSITIONS.indexOf(winner)
        setState(s => ({
          ...s,
          hands: newHands,
          currentTrick: [],
          currentPlayer: winnerIdx,
          trickLeader: winnerIdx,
          tricksWon: newTricksWon,
          message: `${winner} wins the trick`,
          lastTrick: newTrick,
        }))
      }
    } else {
      // Trick continues
      setState(s => {
        let nextPlayer = (s.currentPlayer + 1) % 4
        
        // Skip partner if going alone
        if (s.alonePlayer) {
          const makerTeam = s.maker === 'North' || s.maker === 'South' ? 'North-South' : 'East-West'
          const nextTeam = POSITIONS[nextPlayer] === 'North' || POSITIONS[nextPlayer] === 'South' ? 'North-South' : 'East-West'
          const isPartner = makerTeam === nextTeam && POSITIONS[nextPlayer] !== s.maker
          
          if (isPartner) {
            nextPlayer = (nextPlayer + 1) % 4
          }
        }
        
        return {
          ...s,
          hands: newHands,
          currentTrick: newTrick,
          currentPlayer: nextPlayer,
        }
      })
    }
  }, [state, currentPos])
  
  // ── New Game ─────────────────────────────────────────────────────────────────
  
  const handleNewGame = useCallback(() => {
    setState(initState())
    setAloneOption(false)
  }, [])
  
  // ── AI Actions ───────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (currentPos === 'South') return // Human player
    
    clearTimeout(aiTimeoutRef.current)
    
    if (state.phase === 'bidding-round1') {
      aiTimeoutRef.current = setTimeout(() => {
        handleBidRound1(false)
      }, 800)
    } else if (state.phase === 'bidding-round2') {
      aiTimeoutRef.current = setTimeout(() => {
        handleBidRound2(null)
      }, 800)
    } else if (state.phase === 'discard' && currentPos === dealerPos) {
      aiTimeoutRef.current = setTimeout(() => {
        const card = aiChooseDiscard(state.hands[dealerPos], state.trump)
        handleDiscard(card)
      }, 800)
    } else if (state.phase === 'playing') {
      // Check if current player is skipped due to going alone
      if (state.alonePlayer) {
        const makerTeam = state.maker === 'North' || state.maker === 'South' ? 'North-South' : 'East-West'
        const currentTeam = currentPos === 'North' || currentPos === 'South' ? 'North-South' : 'East-West'
        const isPartner = makerTeam === currentTeam && currentPos !== state.maker
        
        if (isPartner) {
          // Skip this player
          aiTimeoutRef.current = setTimeout(() => {
            advanceToNextPlayer()
          }, 400)
          return
        }
      }
      
      aiTimeoutRef.current = setTimeout(() => {
        const card = aiPlayCard(
          state.hands[currentPos],
          state.currentTrick,
          state.trump
        )
        handlePlayCard(card)
      }, 1000)
    }
    
    return () => clearTimeout(aiTimeoutRef.current)
  }, [state.phase, state.currentPlayer, state.currentTrick, state.trump, currentPos, dealerPos, state.hands, state.alonePlayer, state.maker, handleBidRound1, handleBidRound2, handleDiscard, advanceToNextPlayer, handlePlayCard])
  
  // ── Render Helpers ───────────────────────────────────────────────────────────
  
  const renderCard = (card, onClick, selectable = false, small = false) => {
    const isSelected = selectedCard === card
    const color = SUIT_COLORS[card.suit]
    const size = small ? 'w-10 h-14 text-xs' : 'w-16 h-24 text-base'
    
    return (
      <div
        key={`${card.suit}-${card.rank}`}
        onClick={onClick}
        className={`${size} rounded border-2 bg-white flex flex-col items-center justify-center cursor-pointer transition-all ${
          isSelected ? 'border-blue-500 -translate-y-2' : 'border-gray-300'
        } ${selectable ? 'hover:border-blue-400 hover:-translate-y-1' : ''}`}
        style={{ color }}
      >
        <div className="font-bold">{card.rank}</div>
        <div className="text-2xl" style={{ lineHeight: 1 }}>{card.suit}</div>
      </div>
    )
  }
  
  const renderHand = (position, hand) => {
    const isCurrentPlayer = position === currentPos
    const isHuman = position === 'South'
    const canPlay = state.phase === 'playing' && isCurrentPlayer && isHuman
    const canDiscard = state.phase === 'discard' && position === dealerPos && isHuman
    
    if (!isHuman && state.phase !== 'hand-over' && state.phase !== 'game-over') {
      // Show card backs for AI
      return (
        <div className="flex gap-1 justify-center">
          {hand.map((_, idx) => (
            <div
              key={idx}
              className="w-10 h-14 rounded border-2 border-gray-400 bg-blue-900 flex items-center justify-center text-white text-xs"
            >
              🂠
            </div>
          ))}
        </div>
      )
    }
    
    return (
      <div className="flex gap-2 justify-center flex-wrap">
        {hand.map(card => renderCard(
          card,
          () => {
            if (canPlay) {
              setSelectedCard(card)
            } else if (canDiscard) {
              handleDiscard(card)
            }
          },
          canPlay || canDiscard,
          position !== 'South'
        ))}
      </div>
    )
  }
  
  const renderTrick = () => {
    if (state.currentTrick.length === 0 && !state.lastTrick) return null

    const trickToShow = state.currentTrick.length > 0 ? state.currentTrick : state.lastTrick
    if (!trickToShow || trickToShow.length === 0) return null

    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative" style={{ width: '300px', height: '300px' }}>
          {trickToShow.map((play) => {
            const pos = POSITIONS.indexOf(play.position)
            const cardPositions = [
              { bottom: '0px', left: '50%', transform: 'translate(-50%, 0)' }, // South
              { top: '50%', left: '0px', transform: 'translate(0, -50%)' }, // West
              { top: '0px', left: '50%', transform: 'translate(-50%, 0)' }, // North
              { top: '50%', right: '0px', transform: 'translate(0, -50%)' }, // East
            ]
            return (
              <div key={`trick-${play.position}-${play.card.suit}-${play.card.rank}`} className="absolute" style={cardPositions[pos]}>
                {renderCard(play.card, () => {}, false, true)}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  
  // ── Render UI ────────────────────────────────────────────────────────────────
  
  if (state.phase === 'game-over') {
    const winner = state.score['North-South'] >= 10 ? 'North-South' : 'East-West'
    const isPlayerTeam = winner === 'North-South'
    
    return (
      <div className="flex flex-col items-center gap-6 max-w-4xl w-full p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold mb-2">
            {isPlayerTeam ? 'Victory!' : 'Game Over'}
          </h2>
          <p className="text-xl mb-4">
            {winner} wins {state.score[winner]} to {state.score[winner === 'North-South' ? 'East-West' : 'North-South']}!
          </p>
          <button
            onClick={handleNewGame}
            className="btn-primary px-6 py-3 text-lg"
          >
            New Game
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col items-center gap-4 max-w-6xl w-full p-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Euchre</h2>
        <div className="flex gap-6 justify-center text-sm">
          <div>
            <span className="font-semibold">You & North:</span> {state.score['North-South']}
          </div>
          <div>
            <span className="font-semibold">East & West:</span> {state.score['East-West']}
          </div>
        </div>
      </div>
      
      {/* Message */}
      {state.message && (
        <div className="bg-blue-100 dark:bg-blue-900 px-4 py-2 rounded text-center font-semibold">
          {state.message}
        </div>
      )}
      
      {/* Game Info */}
      <div className="flex gap-4 flex-wrap justify-center text-sm">
        <div>Dealer: {dealerPos}</div>
        {state.trump && <div>Trump: {SUIT_NAMES[state.trump]} {state.trump}</div>}
        {state.phase === 'playing' && (
          <div>
            Tricks: N-S {state.tricksWon['North-South']} | E-W {state.tricksWon['East-West']}
          </div>
        )}
        {state.alonePlayer && <div className="font-bold text-red-600">{state.alonePlayer} going alone!</div>}
      </div>
      
      {/* Playing Area */}
      <div className="relative w-full max-w-4xl" style={{ minHeight: '500px' }}>
        {/* North */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full max-w-md">
          <div className="text-center text-sm font-semibold mb-2">
            North {POSITIONS[state.currentPlayer] === 'North' && '⭐'}
          </div>
          {renderHand('North', state.hands.North)}
        </div>
        
        {/* West */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
          <div className="text-center text-sm font-semibold mb-2">
            West {POSITIONS[state.currentPlayer] === 'West' && '⭐'}
          </div>
          {renderHand('West', state.hands.West)}
        </div>
        
        {/* East */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
          <div className="text-center text-sm font-semibold mb-2">
            East {POSITIONS[state.currentPlayer] === 'East' && '⭐'}
          </div>
          {renderHand('East', state.hands.East)}
        </div>
        
        {/* South (Human) */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md">
          <div className="text-center text-sm font-semibold mb-2">
            You (South) {POSITIONS[state.currentPlayer] === 'South' && '⭐'}
          </div>
          {renderHand('South', state.hands.South)}
        </div>
        
        {/* Center - Upcard/Trick */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {state.phase.includes('bidding') && (
            <div className="text-center">
              <div className="text-sm font-semibold mb-2">Upcard</div>
              {renderCard(state.upcard, null, false, false)}
            </div>
          )}
          {state.phase === 'discard' && currentPos === 'South' && (
            <div className="text-center">
              <div className="text-sm font-semibold mb-2">Click a card to discard</div>
            </div>
          )}
          {renderTrick()}
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex flex-col gap-3 items-center w-full max-w-md">
        {state.phase === 'bidding-round1' && currentPos === 'South' && (
          <div className="flex flex-col gap-2 w-full">
            <div className="text-center font-semibold mb-2">
              Order up {SUIT_NAMES[state.upcard.suit]}?
            </div>
            <div className="flex gap-2 items-center justify-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aloneOption}
                  onChange={(e) => setAloneOption(e.target.checked)}
                />
                Go alone
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBidRound1(true, aloneOption)}
                className="btn-primary flex-1"
              >
                Order Up
              </button>
              <button
                onClick={() => handleBidRound1(false)}
                className="btn-ghost flex-1"
              >
                Pass
              </button>
            </div>
          </div>
        )}
        
        {state.phase === 'bidding-round2' && currentPos === 'South' && (
          <div className="flex flex-col gap-2 w-full">
            <div className="text-center font-semibold mb-2">
              Choose trump (not {SUIT_NAMES[state.upcard.suit]})
            </div>
            <div className="flex gap-2 items-center justify-center mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aloneOption}
                  onChange={(e) => setAloneOption(e.target.checked)}
                />
                Go alone
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SUITS.filter(s => s !== state.upcard.suit).map(suit => (
                <button
                  key={suit}
                  onClick={() => handleBidRound2(suit, aloneOption)}
                  className="btn-primary"
                  style={{ color: SUIT_COLORS[suit] }}
                >
                  {SUIT_NAMES[suit]} {suit}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleBidRound2(null)}
              className="btn-ghost w-full"
            >
              Pass
            </button>
          </div>
        )}
        
        {state.phase === 'playing' && currentPos === 'South' && selectedCard && (
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={() => handlePlayCard(selectedCard)}
              className="btn-primary"
            >
              Play {selectedCard.rank}{selectedCard.suit}
            </button>
            <button
              onClick={() => setSelectedCard(null)}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        )}
        
        {state.phase === 'hand-over' && (
          <div className="flex flex-col gap-2 w-full">
            <div className="text-center mb-2">
              <div className="font-semibold text-lg mb-1">Hand Complete</div>
              <div>Score: N-S {state.score['North-South']} | E-W {state.score['East-West']}</div>
            </div>
            <button
              onClick={handleNextHand}
              className="btn-primary"
            >
              Next Hand
            </button>
          </div>
        )}
      </div>
      
      {/* Instructions */}
      <div className="text-xs text-center text-gray-600 dark:text-gray-400 max-w-2xl">
        <p>
          Standard Euchre: 24 cards (9-A), 4 players in teams. First team to 10 points wins.
          Right bower (J of trump) is highest, left bower (J of same color) is second highest.
        </p>
      </div>
    </div>
  )
}
