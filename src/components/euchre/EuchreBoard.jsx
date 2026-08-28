import { useState, useEffect, useCallback } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♣', '♦']
const SUIT_NAMES = { '♠': 'Spades', '♥': 'Hearts', '♣': 'Clubs', '♦': 'Diamonds' }
const SUIT_COLORS = { '♠': 'black', '♥': 'red', '♣': 'black', '♦': 'red' }
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A']

// Map opposite suit for left bower logic
const OPPOSITE_SUIT = { '♠': '♣', '♣': '♠', '♥': '♦', '♦': '♥' }

const POSITIONS = ['South', 'West', 'North', 'East']

// ── Utility Functions ────────────────────────────────────────────────────────

function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

function shuffle(deck) {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function dealCards(deck) {
  const hands = { South: [], West: [], North: [], East: [] }
  let idx = 0
  
  // Deal 5 cards to each player (standard Euchre deal: 3-2 or 2-3)
  // We'll do simple 5-card deal
  for (let round = 0; round < 5; round++) {
    for (const pos of POSITIONS) {
      hands[pos].push(deck[idx++])
    }
  }
  
  const upCard = deck[idx]
  return { hands, upCard }
}

function getEffectiveSuit(card, trump) {
  if (!trump) return card.suit
  
  // Right bower (trump jack)
  if (card.rank === 'J' && card.suit === trump) {
    return trump
  }
  
  // Left bower (jack of same color)
  if (card.rank === 'J' && card.suit === OPPOSITE_SUIT[trump]) {
    return trump
  }
  
  return card.suit
}

function getCardValue(card, trump, leadSuit) {
  const effectiveSuit = getEffectiveSuit(card, trump)
  
  // Not following suit and not trump
  if (effectiveSuit !== trump && effectiveSuit !== leadSuit) {
    return 0
  }
  
  // Trump suit values
  if (effectiveSuit === trump) {
    if (card.rank === 'J' && card.suit === trump) return 100 // Right bower
    if (card.rank === 'J' && card.suit === OPPOSITE_SUIT[trump]) return 99 // Left bower
    const rankValues = { 'A': 50, 'K': 49, 'Q': 48, '10': 47, '9': 46 }
    return rankValues[card.rank] || 45
  }
  
  // Lead suit values (non-trump)
  const rankValues = { 'A': 20, 'K': 19, 'Q': 18, 'J': 17, '10': 16, '9': 15 }
  return rankValues[card.rank] || 10
}

function findWinner(trick, trump) {
  if (trick.length === 0) return null
  
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
  if (!leadSuit) return true // Leading, can play anything
  
  const effectiveSuit = getEffectiveSuit(card, trump)
  const effectiveLeadSuit = leadSuit
  
  // Must follow suit if possible
  if (effectiveSuit === effectiveLeadSuit) return true
  
  // Check if player has any cards of lead suit
  const hasLeadSuit = hand.some(c => getEffectiveSuit(c, trump) === effectiveLeadSuit)
  
  return !hasLeadSuit
}

// Simple AI logic
function aiChooseCard(hand, leadSuit, trump, trickSoFar) {
  // Filter playable cards
  const playable = hand.filter(card => canPlayCard(card, hand, leadSuit, trump))
  
  if (playable.length === 0) return hand[0]
  if (playable.length === 1) return playable[0]
  
  // Simple strategy: play highest card if winning, lowest if losing
  const sortedByValue = [...playable].sort((a, b) => {
    const valA = getCardValue(a, trump, leadSuit || trump)
    const valB = getCardValue(b, trump, leadSuit || trump)
    return valB - valA
  })
  
  if (trickSoFar.length === 0) {
    // Leading: play medium card
    return sortedByValue[Math.floor(sortedByValue.length / 2)]
  }
  
  // Check if partner is currently winning
  const currentWinner = findWinner(trickSoFar, trump)
  const partnerPositions = { 
    South: 'North', North: 'South', 
    West: 'East', East: 'West' 
  }
  
  const myPosition = POSITIONS.find(() => hand === hand) // This is placeholder; actual position tracked in state
  const myPartner = partnerPositions[myPosition] || partnerPositions['West']
  
  if (currentWinner === myPartner) {
    // Partner winning, play lowest
    return sortedByValue[sortedByValue.length - 1]
  }
  
  // Try to win with highest card
  return sortedByValue[0]
}

function aiMakeBid(hand, upCard, position, dealer, round) {
  // Simple AI bidding strategy
  const upSuit = upCard.suit
  
  if (round === 1) {
    // First round: evaluate strength in up-card suit
    const trumpCount = hand.filter(c => {
      const eff = getEffectiveSuit(c, upSuit)
      return eff === upSuit
    }).length
    
    const hasBower = hand.some(c => 
      (c.rank === 'J' && c.suit === upSuit) ||
      (c.rank === 'J' && c.suit === OPPOSITE_SUIT[upSuit])
    )
    
    const hasAce = hand.some(c => c.rank === 'A' && c.suit === upSuit)
    
    // Order up if dealer and have 2+ trump, or non-dealer with 3+ trump or bower
    if (position === dealer && (trumpCount >= 2 || hasBower)) {
      return { action: 'orderup', alone: false }
    } else if (position !== dealer && (trumpCount >= 3 || (hasBower && trumpCount >= 2) || (hasAce && trumpCount >= 2))) {
      return { action: 'orderup', alone: false }
    }
    
    return { action: 'pass' }
  } else {
    // Second round: pick best suit (not up-card suit)
    const suitStrength = {}
    
    for (const suit of SUITS) {
      if (suit === upSuit) continue
      
      const trumpCount = hand.filter(c => {
        const eff = getEffectiveSuit(c, suit)
        return eff === suit
      }).length
      
      const hasBower = hand.some(c => 
        (c.rank === 'J' && c.suit === suit) ||
        (c.rank === 'J' && c.suit === OPPOSITE_SUIT[suit])
      )
      
      suitStrength[suit] = trumpCount + (hasBower ? 2 : 0)
    }
    
    const bestSuit = Object.entries(suitStrength).sort((a, b) => b[1] - a[1])[0]
    
    // Call trump if strength >= 3, or dealer is forced to call
    if (bestSuit[1] >= 3) {
      return { action: 'call', suit: bestSuit[0], alone: false }
    } else if (position === dealer) {
      // Dealer must call (stick the dealer)
      return { action: 'call', suit: bestSuit[0], alone: false }
    }
    
    return { action: 'pass' }
  }
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function EuchreBoard() {
  const [gameState, setGameState] = useState('start') // start, dealing, bidding, playing, trickEnd, handEnd, gameOver
  const [hands, setHands] = useState({ South: [], West: [], North: [], East: [] })
  const [upCard, setUpCard] = useState(null)
  const [trump, setTrump] = useState(null)
  const [dealer, setDealer] = useState('West')
  const [currentPlayer, setCurrentPlayer] = useState('South')
  const [trick, setTrick] = useState([])
  const [trickWinner, setTrickWinner] = useState(null)
  const [scores, setScores] = useState({ NS: 0, EW: 0 })
  const [tricksWon, setTricksWon] = useState({ NS: 0, EW: 0 })
  const [biddingRound, setBiddingRound] = useState(1)
  const [bidHistory, setBidHistory] = useState([])
  const [maker, setMaker] = useState(null)
  const [goingAlone, setGoingAlone] = useState(null)
  const [message, setMessage] = useState('')
  const [dealerDiscarding, setDealerDiscarding] = useState(false)
  
  const startNewHand = useCallback(() => {
    const deck = shuffle(createDeck())
    const { hands: newHands, upCard: newUpCard } = dealCards(deck)
    
    setHands(newHands)
    setUpCard(newUpCard)
    setTrump(null)
    setTrick([])
    setTrickWinner(null)
    setTricksWon({ NS: 0, EW: 0 })
    setBiddingRound(1)
    setBidHistory([])
    setMaker(null)
    setGoingAlone(null)
    setDealerDiscarding(false)
    setMessage('')
    
    // Rotate dealer
    const dealerIdx = POSITIONS.indexOf(dealer)
    const nextDealer = POSITIONS[(dealerIdx + 1) % 4]
    setDealer(nextDealer)
    
    // First player to bid is left of dealer
    const nextDealerIdx = POSITIONS.indexOf(nextDealer)
    const firstBidder = POSITIONS[(nextDealerIdx + 1) % 4]
    setCurrentPlayer(firstBidder)
    
    setGameState('bidding')
  }, [dealer])
  
  const startGame = () => {
    setScores({ NS: 0, EW: 0 })
    setDealer('West')
    startNewHand()
  }
  
  // Helper for stick-the-dealer auto-call
  const autoCallTrump = useCallback(() => {
    const availableSuits = SUITS.filter(s => s !== upCard.suit)
    const bestSuit = availableSuits[Math.floor(Math.random() * availableSuits.length)]
    
    // Schedule the call for next tick to avoid recursion
    setTimeout(() => {
      setTrump(bestSuit)
      setMaker(currentPlayer)
      setGoingAlone(false)
      setMessage(`${currentPlayer} called ${SUIT_NAMES[bestSuit]} trump!`)
      
      // Start playing, first player is left of dealer
      const dealerIdx = POSITIONS.indexOf(dealer)
      const firstPlayer = POSITIONS[(dealerIdx + 1) % 4]
      setCurrentPlayer(firstPlayer)
      setGameState('playing')
    }, 0)
  }, [upCard, currentPlayer, dealer])
  
  // Handle stick-the-dealer separately to avoid recursion
  useEffect(() => {
    if (gameState !== 'bidding' || dealerDiscarding) return
    if (biddingRound !== 2 || currentPlayer !== dealer) return
    
    // Check if we need to auto-call for dealer
    const allPassed = bidHistory.filter(b => b.action === 'pass').length >= 7
    
    if (allPassed && currentPlayer === 'South') {
      // Let human dealer make the choice
      return
    } else if (allPassed && currentPlayer !== 'South') {
      // AI dealer must call
      autoCallTrump()
    }
  }, [gameState, biddingRound, currentPlayer, dealer, bidHistory, dealerDiscarding, autoCallTrump])
  
  // Handle bidding
  const handleBid = useCallback((action, suit = null, alone = false) => {
    const newBidHistory = [...bidHistory, { position: currentPlayer, action, suit, alone }]
    setBidHistory(newBidHistory)
    
    if (action === 'orderup') {
      setTrump(upCard.suit)
      setMaker(currentPlayer)
      setGoingAlone(alone ? currentPlayer : null)
      setMessage(`${currentPlayer} ordered up ${SUIT_NAMES[upCard.suit]}!`)
      
      // Dealer picks up and must discard
      const newHands = { ...hands }
      newHands[dealer] = [...newHands[dealer], upCard]
      setHands(newHands)
      setDealerDiscarding(true)
      setCurrentPlayer(dealer)
      return
    }
    
    if (action === 'call') {
      setTrump(suit)
      setMaker(currentPlayer)
      setGoingAlone(alone ? currentPlayer : null)
      setMessage(`${currentPlayer} called ${SUIT_NAMES[suit]} trump!`)
      
      // Start playing, first player is left of dealer
      const dealerIdx = POSITIONS.indexOf(dealer)
      const firstPlayer = POSITIONS[(dealerIdx + 1) % 4]
      setCurrentPlayer(firstPlayer)
      setGameState('playing')
      return
    }
    
    // Pass
    const dealerIdx = POSITIONS.indexOf(dealer)
    const currentIdx = POSITIONS.indexOf(currentPlayer)
    
    // Check if everyone passed in round 1
    if (biddingRound === 1) {
      const nextIdx = (currentIdx + 1) % 4
      const nextPlayer = POSITIONS[nextIdx]
      
      if (nextIdx === (dealerIdx + 1) % 4) {
        // Everyone passed, go to round 2
        setBiddingRound(2)
        setCurrentPlayer(nextPlayer)
        setMessage('Round 2: Choose trump (not ' + SUIT_NAMES[upCard.suit] + ')')
      } else {
        setCurrentPlayer(nextPlayer)
      }
    } else {
      // Round 2
      if (currentPlayer !== dealer) {
        const nextIdx = (currentIdx + 1) % 4
        setCurrentPlayer(POSITIONS[nextIdx])
      }
    }
  }, [currentPlayer, bidHistory, upCard, hands, dealer, biddingRound])
  
  // AI bidding
  useEffect(() => {
    if (gameState !== 'bidding' || currentPlayer === 'South' || dealerDiscarding) return
    
    const timer = setTimeout(() => {
      const hand = hands[currentPlayer]
      const bid = aiMakeBid(hand, upCard, currentPlayer, dealer, biddingRound)
      
      if (bid.action === 'orderup') {
        handleBid('orderup', null, bid.alone)
      } else if (bid.action === 'call') {
        handleBid('call', bid.suit, bid.alone)
      } else {
        handleBid('pass')
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [gameState, currentPlayer, hands, upCard, dealer, biddingRound, handleBid, dealerDiscarding])
  
  // Handle dealer discard
  const handleDealerDiscard = useCallback((card) => {
    const newHands = { ...hands }
    newHands[dealer] = newHands[dealer].filter(c => !(c.rank === card.rank && c.suit === card.suit))
    setHands(newHands)
    setDealerDiscarding(false)
    
    // Start playing
    const dealerIdx = POSITIONS.indexOf(dealer)
    const firstPlayer = POSITIONS[(dealerIdx + 1) % 4]
    setCurrentPlayer(firstPlayer)
    setGameState('playing')
  }, [dealer, hands])
  
  // AI dealer discard
  useEffect(() => {
    if (!dealerDiscarding || dealer === 'South' || gameState !== 'bidding') return
    
    const timer = setTimeout(() => {
      // AI dealer picks lowest card to discard
      const dealerHand = hands[dealer]
      if (dealerHand.length === 0) return
      
      // Simple strategy: discard the lowest non-trump card, or lowest card if all trump
      const nonTrump = dealerHand.filter(c => getEffectiveSuit(c, upCard.suit) !== upCard.suit)
      const cardToDiscard = nonTrump.length > 0 ? nonTrump[0] : dealerHand[0]
      
      handleDealerDiscard(cardToDiscard)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [dealerDiscarding, dealer, gameState, hands, upCard, handleDealerDiscard])
  
  // Handle card play
  const handleCardPlay = useCallback((card) => {
    const hand = hands[currentPlayer]
    const leadSuit = trick.length > 0 ? getEffectiveSuit(trick[0].card, trump) : null
    
    if (leadSuit && !canPlayCard(card, hand, leadSuit, trump)) {
      setMessage('Must follow suit!')
      setTimeout(() => setMessage(''), 1500)
      return
    }
    
    const newTrick = [...trick, { position: currentPlayer, card }]
    setTrick(newTrick)
    
    const newHands = { ...hands }
    newHands[currentPlayer] = newHands[currentPlayer].filter(c => !(c.rank === card.rank && c.suit === card.suit))
    setHands(newHands)
    
    if (newTrick.length === 4) {
      // Trick complete
      const winner = findWinner(newTrick, trump)
      setTrickWinner(winner)
      
      const team = (winner === 'North' || winner === 'South') ? 'NS' : 'EW'
      setTricksWon(prev => ({ ...prev, [team]: prev[team] + 1 }))
      
      setGameState('trickEnd')
      
      setTimeout(() => {
        setTrick([])
        setTrickWinner(null)
        setCurrentPlayer(winner)
        
        // Check if hand is over
        if (newHands[winner].length === 0) {
          // Score the hand
          const makerTeam = (maker === 'North' || maker === 'South') ? 'NS' : 'EW'
          const defenderTeam = makerTeam === 'NS' ? 'EW' : 'NS'
          
          const makerTricks = tricksWon[makerTeam] + (team === makerTeam ? 1 : 0)
          
          let points = 0
          let scoringTeam = makerTeam
          
          if (makerTricks >= 3) {
            // Makers win
            if (makerTricks === 5) {
              points = goingAlone ? 4 : 2 // March
            } else {
              points = 1 // Made it
            }
          } else {
            // Euchred
            points = 2
            scoringTeam = defenderTeam
          }
          
          setScores(prev => ({ ...prev, [scoringTeam]: prev[scoringTeam] + points }))
          setGameState('handEnd')
          
          setTimeout(() => {
            const newScores = { ...scores }
            newScores[scoringTeam] += points
            
            if (newScores[scoringTeam] >= 10) {
              setGameState('gameOver')
            } else {
              startNewHand()
            }
          }, 3000)
        } else {
          setGameState('playing')
        }
      }, 2000)
    } else {
      // Next player
      const skipPlayer = goingAlone && goingAlone !== currentPlayer
      let nextIdx = (POSITIONS.indexOf(currentPlayer) + 1) % 4
      let nextPlayer = POSITIONS[nextIdx]
      
      // Skip partner if going alone
      if (skipPlayer) {
        const alonePartner = goingAlone === 'North' || goingAlone === 'South' 
          ? (goingAlone === 'North' ? 'South' : 'North')
          : (goingAlone === 'East' ? 'West' : 'East')
        
        if (nextPlayer === alonePartner) {
          nextIdx = (nextIdx + 1) % 4
          nextPlayer = POSITIONS[nextIdx]
        }
      }
      
      setCurrentPlayer(nextPlayer)
    }
  }, [currentPlayer, hands, trick, trump, tricksWon, maker, goingAlone, scores, startNewHand])
  
  // AI card play
  useEffect(() => {
    if (gameState !== 'playing' || currentPlayer === 'South' || dealerDiscarding) return
    
    const timer = setTimeout(() => {
      const hand = hands[currentPlayer]
      const leadSuit = trick.length > 0 ? getEffectiveSuit(trick[0].card, trump) : null
      const card = aiChooseCard(hand, leadSuit, trump, trick)
      handleCardPlay(card)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [gameState, currentPlayer, hands, trick, trump, dealerDiscarding, handleCardPlay])
  
  // Render helpers
  const renderCard = (card, onClick = null, disabled = false, small = false) => {
    const color = SUIT_COLORS[card.suit]
    const size = small ? 'w-12 h-16 text-sm' : 'w-16 h-24 text-base'
    
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${size} bg-white rounded border-2 border-gray-300 flex flex-col items-center justify-center shadow-md transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
        style={{ color }}
      >
        <div className="font-bold">{card.rank}</div>
        <div className="text-2xl">{card.suit}</div>
      </button>
    )
  }
  
  const canPlayCardFromHand = (card) => {
    if (gameState !== 'playing' || currentPlayer !== 'South') return false
    const leadSuit = trick.length > 0 ? getEffectiveSuit(trick[0].card, trump) : null
    return canPlayCard(card, hands.South, leadSuit, trump)
  }
  
  // ── Render ───────────────────────────────────────────────────────────────────
  
  if (gameState === 'start') {
    return (
      <div className="flex flex-col items-center gap-6 p-8 max-w-4xl mx-auto">
        <div className="text-6xl">🃏</div>
        <h1 className="text-4xl font-bold">Euchre</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 text-center max-w-md">
          Classic 4-player trick-taking card game. First team to 10 points wins!
        </p>
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm max-w-md">
          <p className="font-semibold mb-2">Rules:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
            <li>24-card deck (9, 10, J, Q, K, A)</li>
            <li>4 players in 2 partnerships (you are South, partner is North)</li>
            <li>Bid to choose trump suit</li>
            <li>Win 3 of 5 tricks to make your bid</li>
            <li>Right bower (trump J) and left bower (same-color J) are highest</li>
            <li>First team to 10 points wins</li>
          </ul>
        </div>
        <button
          onClick={startGame}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors"
        >
          Start Game
        </button>
      </div>
    )
  }
  
  if (gameState === 'gameOver') {
    const winner = scores.NS >= 10 ? 'North-South' : 'East-West'
    const youWon = scores.NS >= 10
    
    return (
      <div className="flex flex-col items-center gap-6 p-8 max-w-4xl mx-auto">
        <div className="text-6xl">{youWon ? '🎉' : '😢'}</div>
        <h1 className="text-4xl font-bold">{winner} Wins!</h1>
        <div className="text-2xl font-semibold">
          Final Score: NS {scores.NS} - EW {scores.EW}
        </div>
        <button
          onClick={startGame}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors"
        >
          New Game
        </button>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col items-center gap-4 p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <div className="text-2xl font-bold">Euchre</div>
        <div className="flex gap-8 text-lg font-semibold">
          <div className="text-blue-600">NS: {scores.NS}</div>
          <div className="text-red-600">EW: {scores.EW}</div>
        </div>
      </div>
      
      {/* Trump and Status */}
      <div className="flex gap-4 items-center">
        {trump && (
          <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
            <span className="font-semibold">Trump: </span>
            <span style={{ color: SUIT_COLORS[trump] }} className="text-2xl">{trump}</span>
            <span className="ml-2">{SUIT_NAMES[trump]}</span>
          </div>
        )}
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <span className="font-semibold">Dealer: </span>{dealer}
        </div>
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <span className="font-semibold">Tricks: </span>NS {tricksWon.NS} - EW {tricksWon.EW}
        </div>
      </div>
      
      {/* Message */}
      {message && (
        <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-center">
          {message}
        </div>
      )}
      
      {/* Bidding Phase */}
      {gameState === 'bidding' && !dealerDiscarding && (
        <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-xl font-semibold">
            {currentPlayer}'s turn to bid
          </div>
          
          <div className="flex items-center gap-4">
            <span className="font-semibold">Up Card:</span>
            {upCard && renderCard(upCard)}
          </div>
          
          {currentPlayer === 'South' && (
            <div className="flex gap-2 flex-wrap justify-center">
              {biddingRound === 1 ? (
                <>
                  <button
                    onClick={() => handleBid('orderup', null, false)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Order Up
                  </button>
                  <button
                    onClick={() => handleBid('pass')}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Pass
                  </button>
                </>
              ) : (
                <>
                  {SUITS.filter(s => s !== upCard.suit).map(suit => (
                    <button
                      key={suit}
                      onClick={() => handleBid('call', suit, false)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                      style={{ color: SUIT_COLORS[suit] === 'red' ? '#fff' : '#fff' }}
                    >
                      Call {suit} {SUIT_NAMES[suit]}
                    </button>
                  ))}
                  {currentPlayer !== dealer && (
                    <button
                      onClick={() => handleBid('pass')}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Pass
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* South's hand during bidding */}
          {currentPlayer === 'South' && (
            <div className="flex flex-col items-center gap-2 mt-4">
              <div className="text-sm font-semibold">Your hand:</div>
              <div className="flex gap-2 flex-wrap justify-center">
                {hands.South.map((card, idx) => (
                  <div key={idx}>{renderCard(card)}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Dealer Discarding */}
      {dealerDiscarding && currentPlayer === dealer && dealer === 'South' && (
        <div className="flex flex-col items-center gap-4 p-6 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
          <div className="text-xl font-semibold">
            You picked up the {upCard.rank}{upCard.suit}. Choose a card to discard:
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {hands.South.map((card, idx) => (
              <div key={idx}>
                {renderCard(card, () => handleDealerDiscard(card))}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Playing Area */}
      {(gameState === 'playing' || gameState === 'trickEnd') && (
        <div className="relative w-full max-w-2xl h-96 bg-green-700 rounded-lg flex items-center justify-center">
          {/* Current trick */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-48 h-48">
              {trick.map((play, idx) => {
                const positions = ['South', 'West', 'North', 'East']
                const pos = positions.indexOf(play.position)
                const styles = [
                  { bottom: '-80px', left: '50%', transform: 'translateX(-50%)' },
                  { left: '-80px', top: '50%', transform: 'translateY(-50%)' },
                  { top: '-80px', left: '50%', transform: 'translateX(-50%)' },
                  { right: '-80px', top: '50%', transform: 'translateY(-50%)' },
                ]
                
                return (
                  <div key={idx} className="absolute" style={styles[pos]}>
                    {renderCard(play.card, null, true, true)}
                  </div>
                )
              })}
            </div>
          </div>
          
          {trickWinner && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg font-semibold">
              {trickWinner} wins the trick!
            </div>
          )}
        </div>
      )}
      
      {/* Player's Hand */}
      {(gameState === 'playing' || gameState === 'trickEnd') && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm font-semibold">
            {currentPlayer === 'South' ? 'Your turn - click a card to play' : `${currentPlayer}'s turn`}
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {hands.South.map((card, idx) => (
              <div key={idx}>
                {renderCard(
                  card,
                  currentPlayer === 'South' ? () => handleCardPlay(card) : null,
                  currentPlayer !== 'South' || !canPlayCardFromHand(card),
                  false
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Other players' card counts */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-md text-center text-sm">
        <div>
          <div className="font-semibold">West</div>
          <div>{hands.West.length} cards</div>
        </div>
        <div>
          <div className="font-semibold">North (Partner)</div>
          <div>{hands.North.length} cards</div>
        </div>
        <div>
          <div className="font-semibold">East</div>
          <div>{hands.East.length} cards</div>
        </div>
      </div>
      
      {/* Hand End Message */}
      {gameState === 'handEnd' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center">
            <div className="text-2xl font-bold mb-4">Hand Complete</div>
            <div className="text-lg mb-2">
              Final tricks: NS {tricksWon.NS} - EW {tricksWon.EW}
            </div>
            <div className="text-lg font-semibold">
              Score: NS {scores.NS} - EW {scores.EW}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
