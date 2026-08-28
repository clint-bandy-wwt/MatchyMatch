import { useState, useCallback, useEffect } from 'react'

// Constants
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const PHASES = {
  DISCARD: 'discard',
  CUT: 'cut',
  PEGGING: 'pegging',
  COUNTING: 'counting',
  GAMEOVER: 'gameover'
}

/**
 * Create a standard 52-card deck
 */
const createDeck = () => {
  const deck = []
  let id = 0
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: id++,
        suit,
        rank,
        value: getCardValue(rank)
      })
    }
  }
  return shuffleDeck(deck)
}

/**
 * Get numeric value for pegging (Aces=1, face cards=10)
 */
const getCardValue = (rank) => {
  if (rank === 'A') return 1
  if (['J', 'Q', 'K'].includes(rank)) return 10
  return parseInt(rank)
}

/**
 * Fisher-Yates shuffle
 */
const shuffleDeck = (deck) => {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Deal 6 cards to each player
 */
const dealHands = (deck, count = 6) => {
  const playerHand = deck.slice(0, count)
  const aiHand = deck.slice(count, count * 2)
  const remainingDeck = deck.slice(count * 2)
  return { playerHand, aiHand, remainingDeck }
}

/**
 * Calculate points for a set of cards (for counting phase)
 */
const _calculateHandScore = (hand, cutCard, isCrib = false) => {
  const allCards = [...hand, cutCard]
  let score = 0
  const scoringEvents = []

  // Fifteens (2 points each)
  const fifteenCombos = findFifteens(allCards)
  score += fifteenCombos.length * 2
  if (fifteenCombos.length > 0) {
    scoringEvents.push(`${fifteenCombos.length} fifteens for ${fifteenCombos.length * 2}`)
  }

  // Pairs (2 points each)
  const pairs = findPairs(allCards)
  score += pairs * 2
  if (pairs > 0) {
    scoringEvents.push(`${pairs} pairs for ${pairs * 2}`)
  }

  // Runs (points = run length)
  const runs = findRuns(allCards)
  score += runs.score
  if (runs.score > 0) {
    scoringEvents.push(`${runs.description}`)
  }

  // Flush (4 or 5 points)
  const flushScore = checkFlush(hand, cutCard, isCrib)
  score += flushScore
  if (flushScore > 0) {
    scoringEvents.push(`flush for ${flushScore}`)
  }

  // Nobs (1 point) - Jack of same suit as cut card
  const nobsScore = checkNobs(hand, cutCard)
  score += nobsScore
  if (nobsScore > 0) {
    scoringEvents.push('nobs for 1')
  }

  return { score, scoringEvents }
}

/**
 * Find all combinations that sum to 15
 */
const findFifteens = (cards) => {
  const combos = []
  const n = cards.length
  
  // Check all possible subsets
  for (let i = 1; i < (1 << n); i++) {
    const subset = []
    let sum = 0
    for (let j = 0; j < n; j++) {
      if (i & (1 << j)) {
        subset.push(cards[j])
        sum += cards[j].value
      }
    }
    if (sum === 15) {
      combos.push(subset)
    }
  }
  
  return combos
}

/**
 * Count pairs in hand
 */
const findPairs = (cards) => {
  let pairs = 0
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      if (cards[i].rank === cards[j].rank) {
        pairs++
      }
    }
  }
  return pairs
}

/**
 * Find runs (sequences) in hand
 */
const findRuns = (cards) => {
  const rankValues = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 }
  const sorted = [...cards].sort((a, b) => rankValues[a.rank] - rankValues[b.rank])
  
  // Check for runs of length 5, 4, then 3
  for (let runLength = 5; runLength >= 3; runLength--) {
    const runs = findRunsOfLength(sorted, runLength, rankValues)
    if (runs.count > 0) {
      return {
        score: runs.count * runLength,
        description: runs.count > 1 ? `${runs.count} runs of ${runLength} for ${runs.count * runLength}` : `run of ${runLength}`
      }
    }
  }
  
  return { score: 0, description: '' }
}

const findRunsOfLength = (sorted, length, rankValues) => {
  if (sorted.length < length) return { count: 0 }
  
  // Generate all combinations of 'length' cards
  const combos = getCombinations(sorted, length)
  let validRuns = 0
  
  for (const combo of combos) {
    const values = combo.map(c => rankValues[c.rank]).sort((a, b) => a - b)
    let isRun = true
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i - 1] + 1) {
        isRun = false
        break
      }
    }
    if (isRun) validRuns++
  }
  
  return { count: validRuns }
}

const getCombinations = (arr, k) => {
  if (k === 1) return arr.map(item => [item])
  const combos = []
  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr[i]
    const tail = getCombinations(arr.slice(i + 1), k - 1)
    tail.forEach(combo => combos.push([head, ...combo]))
  }
  return combos
}

/**
 * Check for flush
 */
const checkFlush = (hand, cutCard, isCrib) => {
  const handSuit = hand[0].suit
  const allSameSuit = hand.every(c => c.suit === handSuit)
  
  if (!allSameSuit) return 0
  
  // In crib, all 5 cards must be same suit
  if (isCrib) {
    return cutCard.suit === handSuit ? 5 : 0
  }
  
  // In hand, 4 same suit = 4 points, 5 same suit = 5 points
  return cutCard.suit === handSuit ? 5 : 4
}

/**
 * Check for nobs (Jack of same suit as cut card)
 */
const checkNobs = (hand, cutCard) => {
  return hand.some(c => c.rank === 'J' && c.suit === cutCard.suit) ? 1 : 0
}

/**
 * Main Cribbage game hook
 */
export function useCribbageGame() {
  // Game state
  const [playerHand, setPlayerHand] = useState([])
  const [aiHand, setAiHand] = useState([])
  const [crib, setCrib] = useState([])
  const [cutCard, setCutCard] = useState(null)
  const [remainingDeck, setRemainingDeck] = useState([])
  
  // Phase and turn management
  const [phase, setPhase] = useState(PHASES.DISCARD)
  const [currentPlayer, setCurrentPlayer] = useState('player')
  const [dealer, setDealer] = useState('player')
  
  // Pegging state
  const [playedCards, setPlayedCards] = useState([])
  const [peggingCount, setPeggingCount] = useState(0)
  const [playerDeclaredGo, setPlayerDeclaredGo] = useState(false)
  const [_aiDeclaredGo, setAiDeclaredGo] = useState(false)
  
  // Scores
  const [playerScore, setPlayerScore] = useState(0)
  const [aiScore, setAiScore] = useState(0)
  const [lastScoringEvent, setLastScoringEvent] = useState(null)
  
  // UI state
  const [selectedCards, setSelectedCards] = useState([])
  const [validPlays, setValidPlays] = useState([])
  const [message, setMessage] = useState('Select 2 cards to discard to the crib')
  const [playerDiscarded, setPlayerDiscarded] = useState(false)
  const [aiDiscarded, setAiDiscarded] = useState(false)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [gameWinner, setGameWinner] = useState(null)

  /**
   * Deal cards for new round
   */
  const dealCards = useCallback(() => {
    const deck = createDeck()
    const { playerHand: pHand, aiHand: aHand, remainingDeck: remaining } = dealHands(deck, 6)
    
    setPlayerHand(pHand)
    setAiHand(aHand)
    setRemainingDeck(remaining)
    setCrib([])
    setCutCard(null)
    setPlayedCards([])
    setPeggingCount(0)
    setSelectedCards([])
    setPlayerDiscarded(false)
    setAiDiscarded(false)
    setPlayerDeclaredGo(false)
    setAiDeclaredGo(false)
    
    setPhase(PHASES.DISCARD)
    setMessage('Select 2 cards to discard to the crib')
  }, [])

  /**
   * Initialize new game
   */
  useEffect(() => {
    dealCards()
  }, [dealCards])

  /**
   * Player selects/deselects a card
   */
  const selectCard = useCallback((card) => {
    setSelectedCards(prev => {
      const isSelected = prev.some(c => c.id === card.id)
      if (isSelected) {
        return prev.filter(c => c.id !== card.id)
      } else if (prev.length < 2) {
        return [...prev, card]
      }
      return prev
    })
  }, [])

  /**
   * Player confirms discard
   */
  const confirmDiscard = useCallback(() => {
    if (selectedCards.length !== 2) return
    
    // Remove selected cards from player hand and add to crib
    const newHand = playerHand.filter(c => !selectedCards.some(sc => sc.id === c.id))
    setPlayerHand(newHand)
    setCrib(prev => [...prev, ...selectedCards])
    setSelectedCards([])
    setPlayerDiscarded(true)
    setMessage('Waiting for AI to discard...')
    
    // Trigger AI discard
    setIsAIThinking(true)
  }, [selectedCards, playerHand])

  /**
   * AI discards cards
   */
  useEffect(() => {
    if (playerDiscarded && !aiDiscarded && phase === PHASES.DISCARD) {
      setTimeout(() => {
        // AI strategy: discard lowest value cards
        const sorted = [...aiHand].sort((a, b) => a.value - b.value)
        const aiDiscards = sorted.slice(0, 2)
        const newAiHand = aiHand.filter(c => !aiDiscards.some(d => d.id === c.id))
        
        setAiHand(newAiHand)
        setCrib(prev => [...prev, ...aiDiscards])
        setAiDiscarded(true)
        setIsAIThinking(false)
        
        // Move to cut phase
        setPhase(PHASES.CUT)
        setMessage('Cutting the deck...')
        setTimeout(() => cutTheDeck(), 1000)
      }, 1500)
    }
  }, [playerDiscarded, aiDiscarded, phase, aiHand])

  /**
   * Cut the deck to reveal starter card
   */
  const cutTheDeck = useCallback(() => {
    if (remainingDeck.length === 0) return
    
    const cut = remainingDeck[0]
    setCutCard(cut)
    
    // Check for "his heels" - if cut card is a Jack, dealer gets 2 points
    if (cut.rank === 'J') {
      if (dealer === 'player') {
        setPlayerScore(prev => prev + 2)
        setLastScoringEvent({ player: 'player', points: 2, reason: 'His Heels (cut Jack)' })
      } else {
        setAiScore(prev => prev + 2)
        setLastScoringEvent({ player: 'ai', points: 2, reason: 'His Heels (cut Jack)' })
      }
    }
    
    // Start pegging phase
    setPhase(PHASES.PEGGING)
    const firstPlayer = dealer === 'player' ? 'ai' : 'player'
    setCurrentPlayer(firstPlayer)
    setMessage(`${firstPlayer === 'player' ? 'Your' : "AI's"} turn to play`)
  }, [remainingDeck, dealer])

  /**
   * Calculate valid plays for current player
   */
  useEffect(() => {
    if (phase === PHASES.PEGGING && currentPlayer === 'player') {
      const hand = playerHand
      const valid = hand.filter(card => peggingCount + card.value <= 31)
      setValidPlays(valid)
      
      if (valid.length === 0 && hand.length > 0) {
        setMessage("You must say 'Go'")
      }
    } else {
      setValidPlays([])
    }
  }, [phase, currentPlayer, playerHand, peggingCount])

  /**
   * Player plays a card during pegging
   */
  const playCard = useCallback((card) => {
    if (phase !== PHASES.PEGGING) return
    if (currentPlayer !== 'player') return
    if (peggingCount + card.value > 31) return
    
    // Play the card
    const newCount = peggingCount + card.value
    setPlayerHand(prev => prev.filter(c => c.id !== card.id))
    setPlayedCards(prev => [...prev, { ...card, player: 'player' }])
    setPeggingCount(newCount)
    
    // Check for scoring
    const points = calculatePeggingScore(playedCards, card, newCount)
    if (points > 0) {
      setPlayerScore(prev => prev + points)
      setLastScoringEvent({ player: 'player', points, reason: getPeggingReason(playedCards, card, newCount) })
    }
    
    // Check if count reaches 31 or if round is complete
    if (newCount === 31) {
      setPlayerScore(prev => prev + 2)
      setLastScoringEvent({ player: 'player', points: 2, reason: '31' })
      setPeggingCount(0)
      setPlayedCards([])
      setPlayerDeclaredGo(false)
      setAiDeclaredGo(false)
    }
    
    // Check if pegging phase is over
    if (playerHand.length === 1 && aiHand.length === 0) {
      setTimeout(() => endPegging(), 1000)
      return
    }
    
    // Switch to AI turn
    setCurrentPlayer('ai')
    setIsAIThinking(true)
  }, [phase, currentPlayer, peggingCount, playerHand, aiHand, playedCards])

  /**
   * Calculate points earned during pegging
   */
  const calculatePeggingScore = (previousPlays, newCard, newCount) => {
    let points = 0
    const allPlays = [...previousPlays, { ...newCard, player: 'player' }]
    
    // 15 (2 points)
    if (newCount === 15) points += 2
    
    // 31 (2 points) - handled separately in playCard
    
    // Pairs, triples, quadruples
    if (allPlays.length >= 2) {
      const lastCard = allPlays[allPlays.length - 1]
      const prevCard = allPlays[allPlays.length - 2]
      if (lastCard.rank === prevCard.rank) {
        points += 2
        
        // Check for triple
        if (allPlays.length >= 3) {
          const prevCard2 = allPlays[allPlays.length - 3]
          if (lastCard.rank === prevCard2.rank) {
            points += 4 // Additional 4 points (total 6 for triple)
            
            // Check for quadruple
            if (allPlays.length >= 4) {
              const prevCard3 = allPlays[allPlays.length - 4]
              if (lastCard.rank === prevCard3.rank) {
                points += 6 // Additional 6 points (total 12 for quadruple)
              }
            }
          }
        }
      }
    }
    
    // Run (3+ cards in sequence)
    const runPoints = checkPeggingRun(allPlays)
    points += runPoints
    
    return points
  }

  /**
   * Check for runs during pegging
   */
  const checkPeggingRun = (plays) => {
    if (plays.length < 3) return 0
    
    const rankValues = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 }
    
    // Check from longest possible run down to 3
    for (let len = Math.min(plays.length, 7); len >= 3; len--) {
      const lastCards = plays.slice(-len)
      const values = lastCards.map(c => rankValues[c.rank]).sort((a, b) => a - b)
      
      let isRun = true
      for (let i = 1; i < values.length; i++) {
        if (values[i] !== values[i - 1] + 1) {
          isRun = false
          break
        }
      }
      
      if (isRun) return len
    }
    
    return 0
  }

  /**
   * Get description of pegging score
   */
  const getPeggingReason = (previousPlays, newCard, newCount) => {
    const allPlays = [...previousPlays, { ...newCard, player: 'player' }]
    
    if (newCount === 15) return 'fifteen-two'
    if (newCount === 31) return '31'
    
    // Check for pairs
    if (allPlays.length >= 2) {
      const lastCard = allPlays[allPlays.length - 1]
      const prevCard = allPlays[allPlays.length - 2]
      if (lastCard.rank === prevCard.rank) {
        if (allPlays.length >= 4 && allPlays[allPlays.length - 3].rank === lastCard.rank && allPlays[allPlays.length - 4].rank === lastCard.rank) {
          return 'four of a kind'
        }
        if (allPlays.length >= 3 && allPlays[allPlays.length - 3].rank === lastCard.rank) {
          return 'three of a kind'
        }
        return 'pair'
      }
    }
    
    // Check for run
    const runLen = checkPeggingRun(allPlays)
    if (runLen >= 3) return `run of ${runLen}`
    
    return ''
  }

  /**
   * Player declares "Go"
   */
  const declareGo = useCallback(() => {
    if (phase !== PHASES.PEGGING) return
    if (currentPlayer !== 'player') return
    
    setPlayerDeclaredGo(true)
    setCurrentPlayer('ai')
    setIsAIThinking(true)
  }, [phase, currentPlayer])

  /**
   * AI plays during pegging
   */
  useEffect(() => {
    if (phase === PHASES.PEGGING && currentPlayer === 'ai' && isAIThinking) {
      setTimeout(() => {
        const validAIPlays = aiHand.filter(card => peggingCount + card.value <= 31)
        
        if (validAIPlays.length === 0) {
          // AI says "Go"
          setAiDeclaredGo(true)
          
          // If both said Go, award 1 point and reset
          if (playerDeclaredGo) {
            setAiScore(prev => prev + 1)
            setLastScoringEvent({ player: 'ai', points: 1, reason: 'Go' })
            setPeggingCount(0)
            setPlayedCards([])
            setPlayerDeclaredGo(false)
            setAiDeclaredGo(false)
          }
          
          // Check if pegging is done
          if (aiHand.length === 0 && playerHand.length === 0) {
            setTimeout(() => endPegging(), 1000)
            return
          }
          
          setCurrentPlayer('player')
          setIsAIThinking(false)
          return
        }
        
        // AI plays a card (simple strategy: play highest valid card)
        const cardToPlay = validAIPlays[validAIPlays.length - 1]
        const newCount = peggingCount + cardToPlay.value
        
        setAiHand(prev => prev.filter(c => c.id !== cardToPlay.id))
        setPlayedCards(prev => [...prev, { ...cardToPlay, player: 'ai' }])
        setPeggingCount(newCount)
        
        // Check for scoring
        const points = calculatePeggingScore(playedCards, cardToPlay, newCount)
        if (points > 0) {
          setAiScore(prev => prev + points)
          setLastScoringEvent({ player: 'ai', points, reason: getPeggingReason(playedCards, cardToPlay, newCount) })
        }
        
        // Check if count reaches 31
        if (newCount === 31) {
          setAiScore(prev => prev + 2)
          setLastScoringEvent({ player: 'ai', points: 2, reason: '31' })
          setPeggingCount(0)
          setPlayedCards([])
          setPlayerDeclaredGo(false)
          setAiDeclaredGo(false)
        }
        
        // Check if pegging phase is over
        if (aiHand.length === 1 && playerHand.length === 0) {
          setTimeout(() => endPegging(), 1000)
          return
        }
        
        setCurrentPlayer('player')
        setIsAIThinking(false)
      }, 1500)
    }
  }, [phase, currentPlayer, isAIThinking, aiHand, playerHand, peggingCount, playedCards, playerDeclaredGo])

  /**
   * Count hands and crib
   */
  const countHands = useCallback(() => {
    if (!cutCard) return
    
    // Non-dealer counts first
    const firstCounter = dealer === 'player' ? 'ai' : 'player'
    
    // Count AI hand (if AI is first)
    if (firstCounter === 'ai') {
      // Hand counting would happen here in full implementation
      // In actual implementation, we'd need to track the original 4 cards
      // For now, using remaining hand as approximation
      
      // Simplified: assume we still have the hand info
      // In real game, we'd need to store pre-pegging hands
    }
    
    // Move to next round
    setTimeout(() => {
      const newDealer = dealer === 'player' ? 'ai' : 'player'
      setDealer(newDealer)
      
      // Check for winner
      if (playerScore >= 121) {
        setGameWinner('player')
        setPhase(PHASES.GAMEOVER)
        setMessage('You win!')
        return
      }
      if (aiScore >= 121) {
        setGameWinner('ai')
        setPhase(PHASES.GAMEOVER)
        setMessage('AI wins!')
        return
      }
      
      // Deal new round
      dealCards()
    }, 3000)
  }, [cutCard, dealer, playerScore, aiScore, aiHand, playedCards, dealCards])

  /**
   * End pegging phase and move to counting
   */
  const endPegging = useCallback(() => {
    setPhase(PHASES.COUNTING)
    setMessage('Counting hands...')
    setTimeout(() => countHands(), 1000)
  }, [countHands])

  /**
   * Start new game
   */
  const newGame = useCallback(() => {
    setPlayerScore(0)
    setAiScore(0)
    setDealer('player')
    setGameWinner(null)
    setLastScoringEvent(null)
    dealCards()
  }, [dealCards])

  return {
    // Game state
    playerHand,
    aiHand,
    crib,
    cutCard,
    playedCards,
    peggingCount,
    playerScore,
    aiScore,
    phase,
    currentPlayer,
    dealer,
    selectedCards,
    validPlays,
    isAIThinking,
    lastScoringEvent,
    gameWinner,
    message,
    
    // Actions
    selectCard,
    confirmDiscard,
    playCard,
    declareGo,
    newGame,
  }
}
