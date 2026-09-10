import { useState, useEffect, useCallback, useRef } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♦', '♣']
const SUIT_COLORS = { '♠': 'black', '♥': 'red', '♦': 'red', '♣': 'black' }
const SUIT_NAMES = { '♠': 'Spades', '♥': 'Hearts', '♦': 'Diamonds', '♣': 'Clubs' }
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A']
const PLAYERS = ['South', 'West', 'North', 'East']
const TEAMS = { South: 'NS', North: 'NS', East: 'EW', West: 'EW' }

// ── Deck Functions ───────────────────────────────────────────────────────────

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

function dealCards(deck) {
  const hands = { South: [], West: [], North: [], East: [] }
  let idx = 0
  // Deal 5 cards to each player (3-2 or 2-3 pattern)
  for (let round = 0; round < 2; round++) {
    const cardsPerPlayer = round === 0 ? 3 : 2
    for (const player of PLAYERS) {
      for (let i = 0; i < cardsPerPlayer; i++) {
        hands[player].push(deck[idx++])
      }
    }
  }
  const upcard = deck[idx]
  return { hands, upcard }
}

// ── Card Value Functions ─────────────────────────────────────────────────────

function getCardValue(card, trump) {
  if (!trump) return 0
  
  const leftBowerSuit = getLeftBowerSuit(trump)
  const isRightBower = card.rank === 'J' && card.suit === trump
  const isLeftBower = card.rank === 'J' && card.suit === leftBowerSuit
  const isTrump = card.suit === trump || isLeftBower
  
  if (isRightBower) return 100
  if (isLeftBower) return 90
  if (isTrump) {
    const rankValues = { 'A': 80, 'K': 70, 'Q': 60, '10': 50, '9': 40 }
    return rankValues[card.rank] || 0
  }
  
  // Non-trump cards
  const rankValues = { 'A': 30, 'K': 20, 'Q': 10, 'J': 5, '10': 4, '9': 3 }
  return rankValues[card.rank] || 0
}

function getLeftBowerSuit(trump) {
  if (trump === '♠') return '♣'
  if (trump === '♣') return '♠'
  if (trump === '♥') return '♦'
  if (trump === '♦') return '♥'
  return null
}

function getEffectiveSuit(card, trump) {
  const leftBowerSuit = getLeftBowerSuit(trump)
  if (card.rank === 'J' && card.suit === leftBowerSuit) {
    return trump // Left bower counts as trump suit
  }
  return card.suit
}

function canFollowSuit(hand, leadSuit, trump) {
  return hand.some(card => getEffectiveSuit(card, trump) === leadSuit)
}

function isValidPlay(card, hand, leadSuit, trump) {
  if (!leadSuit) return true // Leading player can play any card
  
  const cardSuit = getEffectiveSuit(card, trump)
  if (cardSuit === leadSuit) return true
  
  // Must follow suit if possible
  return !canFollowSuit(hand, leadSuit, trump)
}

// ── AI Functions ─────────────────────────────────────────────────────────────

function aiShouldOrderUp(hand, upcard, position, dealerPosition) {
  const trump = upcard.suit
  let trumpCount = 0
  let bowerCount = 0
  
  for (const card of hand) {
    if (card.suit === trump || (card.rank === 'J' && card.suit === getLeftBowerSuit(trump))) {
      trumpCount++
      if (card.rank === 'J') bowerCount++
    }
  }
  
  const isDealer = position === dealerPosition
  
  if (bowerCount >= 1 && trumpCount >= 3) return true
  if (isDealer && trumpCount >= 2) return true
  
  return false
}

function aiChooseTrump(hand, upcard) {
  const suitCounts = { '♠': 0, '♥': 0, '♦': 0, '♣': 0 }
  const suitBowers = { '♠': 0, '♥': 0, '♦': 0, '♣': 0 }
  
  for (const card of hand) {
    suitCounts[card.suit]++
    if (card.rank === 'J') suitBowers[card.suit]++
  }
  
  let bestSuit = null
  let bestScore = 1
  
  for (const suit of SUITS) {
    if (suit === upcard.suit) continue // Can't pick upcard suit in round 2
    
    const leftBowerSuit = getLeftBowerSuit(suit)
    const score = suitCounts[suit] + (suitBowers[leftBowerSuit] ? 1 : 0) + suitBowers[suit] * 2
    
    if (score > bestScore) {
      bestScore = score
      bestSuit = suit
    }
  }
  
  return bestSuit
}

function aiChooseCard(hand, leadSuit, trump, trick) {
  const validCards = hand.filter(card => isValidPlay(card, hand, leadSuit, trump))
  
  if (validCards.length === 0) return hand[0]
  
  // Simple AI strategy
  if (!leadSuit) {
    // Leading: play highest trump or highest card
    validCards.sort((a, b) => getCardValue(b, trump) - getCardValue(a, trump))
    return validCards[0]
  }
  
  // Following: try to win or discard low card
  const trickCards = Object.values(trick)
  const highestValue = Math.max(...trickCards.map(c => getCardValue(c, trump)))
  
  const winningCards = validCards.filter(card => getCardValue(card, trump) > highestValue)
  
  if (winningCards.length > 0) {
    // Play lowest winning card
    winningCards.sort((a, b) => getCardValue(a, trump) - getCardValue(b, trump))
    return winningCards[0]
  }
  
  // Can't win, play lowest card
  validCards.sort((a, b) => getCardValue(a, trump) - getCardValue(b, trump))
  return validCards[0]
}

function aiShouldGoAlone(hand, trump) {
  let trumpCount = 0
  let bowerCount = 0
  let aceCount = 0
  
  for (const card of hand) {
    const effectiveSuit = getEffectiveSuit(card, trump)
    if (effectiveSuit === trump) {
      trumpCount++
      if (card.rank === 'J') bowerCount++
      if (card.rank === 'A') aceCount++
    }
  }
  
  // Go alone if very strong hand
  return bowerCount >= 2 || (bowerCount >= 1 && aceCount >= 1 && trumpCount >= 4)
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EuchreBoard() {
  const [gameState, setGameState] = useState('intro') // intro, bidding, playing, roundOver, gameOver
  const [hands, setHands] = useState({ South: [], West: [], North: [], East: [] })
  const [upcard, setUpcard] = useState(null)
  const [trump, setTrump] = useState(null)
  const [dealer, setDealer] = useState('South')
  const [currentPlayer, setCurrentPlayer] = useState('South')
  const [biddingRound, setBiddingRound] = useState(1)
  const [passes, setPasses] = useState(0)
  const [maker, setMaker] = useState(null)
  const [alonePlayer, setAlonePlayer] = useState(null)
  const [trick, setTrick] = useState({})
  const [leadSuit, setLeadSuit] = useState(null)
  const [trickWinner, setTrickWinner] = useState(null)
  const [tricksWon, setTricksWon] = useState({ NS: 0, EW: 0 })
  const [scores, setScores] = useState({ NS: 0, EW: 0 })
  const [message, setMessage] = useState('')
  const [roundWinner, setRoundWinner] = useState(null)
  const [roundPoints, setRoundPoints] = useState(0)
  const [awaitingDiscard, setAwaitingDiscard] = useState(false)
  
  const aiTimeoutRef = useRef(null)
  
  // ── Start Play Phase (defined early for use by other callbacks) ──────────────
  
  const startPlayPhaseInternal = useCallback((dealerPos) => {
    const leadPlayer = PLAYERS[(PLAYERS.indexOf(dealerPos) + 1) % 4]
    setCurrentPlayer(leadPlayer)
    setTrick({})
    setLeadSuit(null)
    setGameState('playing')
    setMessage(`${leadPlayer} leads`)
    setAwaitingDiscard(false)
  }, [])
  
  // ── Start New Game ───────────────────────────────────────────────────────────
  
  const startNewGame = useCallback(() => {
    const deck = shuffleDeck(createDeck())
    const { hands: newHands, upcard: newUpcard } = dealCards(deck)
    
    setHands(newHands)
    setUpcard(newUpcard)
    setTrump(null)
    setDealer('South')
    setCurrentPlayer('West') // Player left of dealer starts bidding
    setBiddingRound(1)
    setPasses(0)
    setMaker(null)
    setAlonePlayer(null)
    setTrick({})
    setLeadSuit(null)
    setTrickWinner(null)
    setTricksWon({ NS: 0, EW: 0 })
    setScores({ NS: 0, EW: 0 })
    setMessage('Bidding starts with West')
    setGameState('bidding')
    setRoundWinner(null)
    setRoundPoints(0)
    setAwaitingDiscard(false)
  }, [])
  
  // ── Start New Hand ───────────────────────────────────────────────────────────
  
  const startNewHand = useCallback(() => {
    const newDealer = PLAYERS[(PLAYERS.indexOf(dealer) + 1) % 4]
    const deck = shuffleDeck(createDeck())
    const { hands: newHands, upcard: newUpcard } = dealCards(deck)
    
    setHands(newHands)
    setUpcard(newUpcard)
    setTrump(null)
    setDealer(newDealer)
    setCurrentPlayer(PLAYERS[(PLAYERS.indexOf(newDealer) + 1) % 4])
    setBiddingRound(1)
    setPasses(0)
    setMaker(null)
    setAlonePlayer(null)
    setTrick({})
    setLeadSuit(null)
    setTrickWinner(null)
    setTricksWon({ NS: 0, EW: 0 })
    setMessage(`Dealer: ${newDealer}. Bidding starts with ${PLAYERS[(PLAYERS.indexOf(newDealer) + 1) % 4]}`)
    setGameState('bidding')
    setRoundWinner(null)
    setRoundPoints(0)
    setAwaitingDiscard(false)
  }, [dealer])
  
  // ── Bidding: Order Up ────────────────────────────────────────────────────────
  
  const orderUp = (player, goingAlone = false) => {
    setTrump(upcard.suit)
    setMaker(player)
    if (goingAlone) setAlonePlayer(player)
    
    if (player === dealer) {
      // Dealer must discard after picking up
      setAwaitingDiscard(true)
      setHands(prev => ({
        ...prev,
        [dealer]: [...prev[dealer], upcard]
      }))
      setMessage(`${dealer} picked up ${upcard.rank}${upcard.suit}. Discard a card.`)
    } else {
      // Non-dealer ordered up
      setHands(prev => ({
        ...prev,
        [dealer]: [...prev[dealer], upcard]
      }))
      setMessage(`${player} ordered up ${SUIT_NAMES[upcard.suit]}${goingAlone ? ' and is going alone!' : ''}`)
      
      if (player === 'South' && !goingAlone) {
        setAwaitingDiscard(true) // South ordered up, dealer needs to discard
      } else {
        // AI will discard automatically
        setTimeout(() => {
          const dealerHand = hands[dealer]
          const lowestCard = dealerHand.reduce((min, card) => 
            getCardValue(card, upcard.suit) < getCardValue(min, upcard.suit) ? card : min
          )
          setHands(prev => ({ ...prev, [dealer]: dealerHand.filter(c => c !== lowestCard) }))
          startPlayPhaseInternal(dealer)
        }, 1500)
      }
    }
  }
  
  // ── Bidding: Call Suit (Round 2) ─────────────────────────────────────────────
  
  const callSuit = (player, suit, goingAlone = false) => {
    setTrump(suit)
    setMaker(player)
    if (goingAlone) setAlonePlayer(player)
    setMessage(`${player} called ${SUIT_NAMES[suit]}${goingAlone ? ' and is going alone!' : ''}`)
    
    setTimeout(() => startPlayPhaseInternal(dealer), 1500)
  }
  
  // ── Bidding: Pass ────────────────────────────────────────────────────────────
  
  const pass = (player) => {
    const newPasses = passes + 1
    setPasses(newPasses)
    
    if (biddingRound === 1 && newPasses === 4) {
      // All passed in round 1, move to round 2
      setBiddingRound(2)
      setPasses(0)
      setCurrentPlayer(PLAYERS[(PLAYERS.indexOf(dealer) + 1) % 4])
      setMessage('All passed. Round 2: call a suit (not ' + SUIT_NAMES[upcard.suit] + ')')
    } else if (biddingRound === 2 && newPasses === 3) {
      // Dealer must call something in round 2
      if (currentPlayer === dealer) {
        const chosenSuit = aiChooseTrump(hands[dealer], upcard)
        if (chosenSuit) {
          callSuit(dealer, chosenSuit, false)
        } else {
          // Dealer stuck, pick a random suit
          const availableSuits = SUITS.filter(s => s !== upcard.suit)
          const randomSuit = availableSuits[Math.floor(Math.random() * availableSuits.length)]
          callSuit(dealer, randomSuit, false)
        }
      } else {
        const nextPlayer = PLAYERS[(PLAYERS.indexOf(currentPlayer) + 1) % 4]
        setCurrentPlayer(nextPlayer)
        setMessage(`${player} passed. ${nextPlayer}'s turn.`)
      }
    } else if (biddingRound === 2 && player === dealer) {
      // Dealer can't pass in round 2 after 3 passes
      const chosenSuit = aiChooseTrump(hands[dealer], upcard)
      if (chosenSuit) {
        callSuit(dealer, chosenSuit, false)
      }
    } else {
      const nextPlayer = PLAYERS[(PLAYERS.indexOf(currentPlayer) + 1) % 4]
      setCurrentPlayer(nextPlayer)
      setMessage(`${player} passed. ${nextPlayer}'s turn.`)
    }
  }
  
  // ── Discard Card (for dealer after order up) ─────────────────────────────────
  
  const discardCard = (card) => {
    const updatedHand = hands[dealer].filter(c => c !== card)
    setHands(prev => ({ ...prev, [dealer]: updatedHand }))
    setMessage(`${dealer} discarded ${card.rank}${card.suit}`)
    setTimeout(() => startPlayPhaseInternal(dealer), 1500)
  }
  
  // ── End Hand ─────────────────────────────────────────────────────────────────
  
  const endHand = useCallback(() => {
    const makerTeam = TEAMS[maker]
    const makerTricks = tricksWon[makerTeam]
    
    let points = 0
    let winner = null
    
    if (makerTricks === 5) {
      // March
      points = alonePlayer ? 4 : 2
      winner = makerTeam
      setMessage(`${makerTeam} team marched! +${points} points`)
    } else if (makerTricks >= 3) {
      // Made it
      points = 1
      winner = makerTeam
      setMessage(`${makerTeam} team made it! +${points} point`)
    } else {
      // Euchred
      points = 2
      winner = makerTeam === 'NS' ? 'EW' : 'NS'
      setMessage(`${makerTeam} team got euchred! ${winner} team gets +${points} points`)
    }
    
    const newScores = {
      ...scores,
      [winner]: scores[winner] + points
    }
    
    setScores(newScores)
    setRoundWinner(winner)
    setRoundPoints(points)
    
    if (newScores.NS >= 10 || newScores.EW >= 10) {
      setGameState('gameOver')
    } else {
      setGameState('roundOver')
    }
  }, [maker, tricksWon, alonePlayer, scores])
  
  // ── Play Card ────────────────────────────────────────────────────────────────
  
  const playCard = useCallback((player, card) => {
    if (!isValidPlay(card, hands[player], leadSuit, trump)) {
      setMessage('Must follow suit!')
      return
    }
    
    const newTrick = { ...trick, [player]: card }
    const newHands = { ...hands, [player]: hands[player].filter(c => c !== card) }
    
    setTrick(newTrick)
    setHands(newHands)
    
    if (!leadSuit) {
      const effectiveSuit = getEffectiveSuit(card, trump)
      setLeadSuit(effectiveSuit)
    }
    
    // Check if trick is complete
    const activePlayers = alonePlayer 
      ? PLAYERS.filter(p => {
          const aloneTeam = TEAMS[alonePlayer]
          const alonePartner = PLAYERS.find(pl => pl !== alonePlayer && TEAMS[pl] === aloneTeam)
          return p !== alonePartner
        })
      : PLAYERS
    
    if (Object.keys(newTrick).length === activePlayers.length) {
      // Trick complete, determine winner
      let winningPlayer = null
      let highestValue = -1
      
      for (const [p, c] of Object.entries(newTrick)) {
        const value = getCardValue(c, trump)
        if (value > highestValue) {
          highestValue = value
          winningPlayer = p
        }
      }
      
      setTrickWinner(winningPlayer)
      setTricksWon(prev => ({
        ...prev,
        [TEAMS[winningPlayer]]: prev[TEAMS[winningPlayer]] + 1
      }))
      
      setMessage(`${winningPlayer} wins the trick!`)
      
      setTimeout(() => {
        // Check if hand is over
        // When going alone, check if active players have cards, not all players
        const activePlayers = alonePlayer 
          ? PLAYERS.filter(p => {
              const aloneTeam = TEAMS[alonePlayer]
              const alonePartner = PLAYERS.find(pl => pl !== alonePlayer && TEAMS[pl] === aloneTeam)
              return p !== alonePartner
            })
          : PLAYERS
        
        // Hand is over when any active player has no cards left
        const handOver = activePlayers.some(p => newHands[p].length === 0)
        
        if (handOver) {
          endHand()
        } else {
          // Next trick
          setTrick({})
          setLeadSuit(null)
          setTrickWinner(null)
          setCurrentPlayer(winningPlayer)
          setMessage(`${winningPlayer} leads`)
        }
      }, 2000)
    } else {
      // Move to next player
      const nextPlayer = activePlayers[(activePlayers.indexOf(player) + 1) % activePlayers.length]
      setCurrentPlayer(nextPlayer)
    }
  }, [hands, trick, leadSuit, trump, alonePlayer, endHand])
  
  // ── AI Logic ─────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (gameState === 'bidding' && currentPlayer !== 'South') {
      aiTimeoutRef.current = setTimeout(() => {
        if (biddingRound === 1) {
          const shouldOrder = aiShouldOrderUp(hands[currentPlayer], upcard, currentPlayer, dealer)
          if (shouldOrder) {
            const goingAlone = aiShouldGoAlone(hands[currentPlayer], upcard.suit)
            orderUp(currentPlayer, goingAlone)
          } else {
            pass(currentPlayer)
          }
        } else {
          // Round 2
          const chosenSuit = aiChooseTrump(hands[currentPlayer], upcard)
          if (chosenSuit && passes < 2) {
            const goingAlone = aiShouldGoAlone(hands[currentPlayer], chosenSuit)
            callSuit(currentPlayer, chosenSuit, goingAlone)
          } else {
            pass(currentPlayer)
          }
        }
      }, 1000)
    }
    
    return () => clearTimeout(aiTimeoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, currentPlayer, biddingRound, hands, upcard, dealer, passes])
  
  useEffect(() => {
    if (gameState !== 'playing' || currentPlayer === 'South' || trickWinner) {
      return
    }
    
    // Don't play if this player has no cards (partner sitting out)
    if (!hands[currentPlayer] || hands[currentPlayer].length === 0) {
      return
    }
    
      aiTimeoutRef.current = setTimeout(() => {
        const card = aiChooseCard(hands[currentPlayer], leadSuit, trump, trick)
        playCard(currentPlayer, card)
      }, 1200)
    
    return () => clearTimeout(aiTimeoutRef.current)
  }, [gameState, currentPlayer, trickWinner, hands, leadSuit, trump, trick, alonePlayer, playCard])
  
  // ── UI: Discard during dealer pickup ─────────────────────────────────────────
  
  useEffect(() => {
    if (awaitingDiscard && dealer !== 'South' && hands[dealer] && hands[dealer].length === 6) {
      // AI dealer discards automatically
      setTimeout(() => {
        const lowestCard = hands[dealer].reduce((min, card) => 
          getCardValue(card, trump || upcard.suit) < getCardValue(min, trump || upcard.suit) ? card : min
        )
        discardCard(lowestCard)
      }, 1500)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingDiscard, dealer, hands, trump, upcard])
  
  // ── Render Functions ─────────────────────────────────────────────────────────
  
  const renderCard = (card, onClick = null, disabled = false, faceDown = false) => {
    if (faceDown) {
      return (
        <div 
          className="inline-block w-12 h-16 rounded border-2 border-blue-800 bg-blue-900 mx-0.5 shadow"
          style={{ fontSize: '8px', lineHeight: '16px' }}
        >
          <div className="text-center text-blue-100 mt-6">🂠</div>
        </div>
      )
    }
    
    const color = SUIT_COLORS[card.suit]
    const clickable = onClick && !disabled
    
    return (
      <button
        onClick={clickable ? () => onClick(card) : undefined}
        disabled={disabled || !clickable}
        className={`inline-block w-12 h-16 rounded border-2 mx-0.5 shadow transition-transform ${
          clickable ? 'hover:scale-110 hover:-translate-y-1 cursor-pointer' : 'cursor-default'
        }`}
        style={{ 
          borderColor: color === 'red' ? '#dc2626' : '#1e293b',
          backgroundColor: 'white',
          color: color === 'red' ? '#dc2626' : '#1e293b'
        }}
      >
        <div className="flex flex-col items-center justify-between h-full p-1">
          <div className="font-bold text-xs">{card.rank}</div>
          <div className="text-lg">{card.suit}</div>
          <div className="font-bold text-xs">{card.rank}</div>
        </div>
      </button>
    )
  }
  
  // ── Intro Screen ─────────────────────────────────────────────────────────────
  
  if (gameState === 'intro') {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-8 text-white shadow-2xl">
          <h1 className="text-4xl font-bold text-center mb-6">♠♥♦♣ Euchre ♠♥♦♣</h1>
          <div className="space-y-4 mb-8">
            <p className="text-lg">Welcome to Euchre! A classic trick-taking card game.</p>
            <div className="bg-green-700 p-4 rounded">
              <h2 className="font-bold mb-2">Game Rules:</h2>
              <ul className="space-y-1 text-sm">
                <li>• 4 players in 2 teams: You (South) + North vs East + West</li>
                <li>• 24-card deck: 9, 10, J, Q, K, A in each suit</li>
                <li>• 5 cards dealt to each player, plus 1 upcard</li>
                <li>• Bidding: Order up the upcard or call another suit</li>
                <li>• Trump suit: Right bower (J of trump) is highest, left bower (J of same color) is second</li>
                <li>• Must follow suit when possible</li>
                <li>• First team to 10 points wins!</li>
              </ul>
            </div>
            <div className="bg-green-700 p-4 rounded">
              <h2 className="font-bold mb-2">Scoring:</h2>
              <ul className="space-y-1 text-sm">
                <li>• 3-4 tricks: 1 point</li>
                <li>• All 5 tricks (march): 2 points (4 if alone)</li>
                <li>• Euchred (makers get &lt;3 tricks): 2 points to defenders</li>
              </ul>
            </div>
          </div>
          <button 
            onClick={startNewGame}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-green-900 font-bold py-3 px-6 rounded-lg text-xl transition-colors"
          >
            🎴 Start Game
          </button>
        </div>
      </div>
    )
  }
  
  // ── Round Over Screen ────────────────────────────────────────────────────────
  
  if (gameState === 'roundOver') {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-8 text-white shadow-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Hand Complete!</h2>
          <p className="text-2xl mb-6">{roundWinner} team wins +{roundPoints} point{roundPoints > 1 ? 's' : ''}!</p>
          <div className="flex justify-center gap-8 mb-8">
            <div className="bg-green-700 p-4 rounded-lg">
              <div className="text-sm mb-1">North/South</div>
              <div className="text-4xl font-bold">{scores.NS}</div>
            </div>
            <div className="bg-green-700 p-4 rounded-lg">
              <div className="text-sm mb-1">East/West</div>
              <div className="text-4xl font-bold">{scores.EW}</div>
            </div>
          </div>
          <button 
            onClick={startNewHand}
            className="bg-yellow-500 hover:bg-yellow-600 text-green-900 font-bold py-3 px-6 rounded-lg text-xl transition-colors"
          >
            Next Hand
          </button>
        </div>
      </div>
    )
  }
  
  // ── Game Over Screen ─────────────────────────────────────────────────────────
  
  if (gameState === 'gameOver') {
    const winner = scores.NS >= 10 ? 'North/South' : 'East/West'
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-xl p-8 text-white shadow-2xl text-center">
          <h2 className="text-4xl font-bold mb-4">🎉 Game Over! 🎉</h2>
          <p className="text-3xl mb-6">{winner} team wins!</p>
          <div className="flex justify-center gap-8 mb-8">
            <div className="bg-green-700 p-4 rounded-lg">
              <div className="text-sm mb-1">North/South</div>
              <div className="text-4xl font-bold">{scores.NS}</div>
            </div>
            <div className="bg-green-700 p-4 rounded-lg">
              <div className="text-sm mb-1">East/West</div>
              <div className="text-4xl font-bold">{scores.EW}</div>
            </div>
          </div>
          <button 
            onClick={startNewGame}
            className="bg-yellow-500 hover:bg-yellow-600 text-green-900 font-bold py-3 px-6 rounded-lg text-xl transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    )
  }
  
  // ── Playing Screen ───────────────────────────────────────────────────────────
  
  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      <div className="bg-gradient-to-br from-green-700 to-green-800 rounded-xl p-6 shadow-2xl">
        {/* Score and Info Bar */}
        <div className="bg-green-900 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center text-white">
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-xs mb-1">North/South</div>
                <div className="text-2xl font-bold">{scores.NS}</div>
              </div>
              <div className="text-center">
                <div className="text-xs mb-1">East/West</div>
                <div className="text-2xl font-bold">{scores.EW}</div>
              </div>
            </div>
            <div className="text-center flex-1">
              {trump && (
                <div className="text-lg">
                  Trump: <span className="font-bold text-2xl" style={{ color: SUIT_COLORS[trump] === 'red' ? '#fca5a5' : 'white' }}>{trump} {SUIT_NAMES[trump]}</span>
                </div>
              )}
              {maker && <div className="text-xs mt-1">Called by: {maker}</div>}
              {alonePlayer && <div className="text-xs text-yellow-300">Going Alone: {alonePlayer}</div>}
            </div>
            <div className="text-center">
              <div className="text-xs mb-1">Dealer</div>
              <div className="text-lg font-bold">{dealer}</div>
            </div>
          </div>
        </div>
        
        {/* Message */}
        {message && (
          <div className="bg-yellow-500 text-green-900 rounded-lg p-3 mb-4 text-center font-semibold">
            {message}
          </div>
        )}
        
        {/* Table Layout */}
        <div className="relative bg-green-600 rounded-lg p-8 mb-4" style={{ minHeight: '400px' }}>
          {/* North (top) */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center">
            {alonePlayer && TEAMS[alonePlayer] === 'NS' && alonePlayer !== 'North' ? (
              <div>
                <div className="text-white font-bold mb-2">North (sitting out)</div>
                <div className="text-yellow-300 text-xs">Partner is going alone</div>
              </div>
            ) : (
              <>
                <div className="text-white font-bold mb-2">North</div>
                <div className="flex justify-center">
                  {hands.North && hands.North.map((card, i) => (
                    <div key={i}>{renderCard(card, null, false, true)}</div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* West (left) */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            {alonePlayer && TEAMS[alonePlayer] === 'EW' && alonePlayer !== 'West' ? (
              <div>
                <div className="text-white font-bold mb-2">West (sitting out)</div>
                <div className="text-yellow-300 text-xs">Partner is going alone</div>
              </div>
            ) : (
              <>
                <div className="text-white font-bold mb-2">West</div>
                <div className="flex flex-col items-center">
                  {hands.West && hands.West.map((card, i) => (
                    <div key={i} className="mb-1">{renderCard(card, null, false, true)}</div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* East (right) */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            {alonePlayer && TEAMS[alonePlayer] === 'EW' && alonePlayer !== 'East' ? (
              <div>
                <div className="text-white font-bold mb-2">East (sitting out)</div>
                <div className="text-yellow-300 text-xs">Partner is going alone</div>
              </div>
            ) : (
              <>
                <div className="text-white font-bold mb-2">East</div>
                <div className="flex flex-col items-center">
                  {hands.East && hands.East.map((card, i) => (
                    <div key={i} className="mb-1">{renderCard(card, null, false, true)}</div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          {/* Center - Trick and Upcard */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="flex flex-col items-center gap-2">
              {/* Upcard during bidding */}
              {gameState === 'bidding' && upcard && (
                <div className="mb-2">
                  <div className="text-white text-xs mb-1 text-center">Upcard</div>
                  {renderCard(upcard)}
                </div>
              )}
              
              {/* Trick */}
              {Object.keys(trick).length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {PLAYERS.map(player => trick[player] && (
                    <div key={player} className="flex flex-col items-center">
                      <div className="text-white text-xs">{player}</div>
                      {renderCard(trick[player])}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Tricks won */}
              {gameState === 'playing' && (
                <div className="mt-4 text-white text-xs text-center">
                  <div>NS: {tricksWon.NS} | EW: {tricksWon.EW}</div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* South (player hand) */}
        <div className="bg-green-900 rounded-lg p-4">
          <div className="text-white font-bold mb-2 text-center">Your Hand (South)</div>
          
          {/* Discard instruction when awaiting discard */}
          {awaitingDiscard && dealer === 'South' && (
            <div className="text-yellow-300 mb-2 text-center text-sm">Click a card to discard</div>
          )}
          
          <div className="flex justify-center flex-wrap gap-1">
            {hands.South && hands.South.map((card, i) => {
              // Can play during game, OR can click to discard during discard phase
              const canDiscard = awaitingDiscard && dealer === 'South'
              const canPlay = (gameState === 'playing' && currentPlayer === 'South' && !trickWinner) || canDiscard
              const isValid = canPlay && isValidPlay(card, hands.South, leadSuit, trump)
              
              const clickHandler = canDiscard ? (c) => discardCard(c) : (canPlay && isValid ? (c) => playCard('South', c) : null)
              
              return (
                <div key={i}>
                  {renderCard(
                    card, 
                    clickHandler,
                    canDiscard ? false : !isValid
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Bidding Controls */}
          {gameState === 'bidding' && currentPlayer === 'South' && !awaitingDiscard && (
            <div className="mt-4 flex justify-center gap-4 flex-wrap">
              {biddingRound === 1 ? (
                <>
                  <button 
                    onClick={() => orderUp('South', false)}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                  >
                    Order Up
                  </button>
                  <button 
                    onClick={() => orderUp('South', true)}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded"
                  >
                    Order Up (Alone)
                  </button>
                  <button 
                    onClick={() => pass('South')}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                  >
                    Pass
                  </button>
                </>
              ) : (
                <>
                  {SUITS.filter(s => s !== upcard.suit).map(suit => (
                    <button 
                      key={suit}
                      onClick={() => callSuit('South', suit, false)}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                      style={{ color: SUIT_COLORS[suit] === 'red' ? '#fca5a5' : 'white' }}
                    >
                      Call {suit}
                    </button>
                  ))}
                  {passes < 3 && (
                    <button 
                      onClick={() => pass('South')}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                    >
                      Pass
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
