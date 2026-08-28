/**
 * useCribbageGame Hook
 * Complete game state management for Cribbage
 * 
 * This is the BRAIN of the game - orchestrates everything:
 * - Manages all game state
 * - Handles player actions
 * - Triggers AI moves
 * - Enforces rules
 * - Updates scores
 * - Handles phase transitions
 */

import { useState, useEffect, useCallback } from 'react'
import {
  createDeck,
  dealHands,
  sortHand,
  cutDeck,
  removeCardFromHand,
  cardsEqual,
} from '../utils/cribbageDeck'
import {
  scoreHand,
  scorePeggingPlay,
} from '../utils/cribbageScoring'
import {
  validatePeggingPlay,
  canPlayAnyCard,
  getValidPlays,
  isGameOver,
  getWinner,
  determineDealer,
  getNonDealer,
  switchDealer,
  getFirstPegger,
  isJack,
  isPeggingComplete,
  PHASES,
} from '../utils/cribbageRules'
import {
  chooseDiscards,
  choosePeggingPlay,
} from '../utils/cribbageAI'

const AI_THINK_DELAY = 800 // ms

export function useCribbageGame() {
  // Game state
  const [playerHand, setPlayerHand] = useState([])
  const [aiHand, setAiHand] = useState([])
  const [crib, setCrib] = useState([])
  const [cutCard, setCutCard] = useState(null)
  const [playedCards, setPlayedCards] = useState([]) // Array of {card, player}
  const [peggingCount, setPeggingCount] = useState(0)
  const [peggingHistory, setPeggingHistory] = useState([])
  const [remainingDeck, setRemainingDeck] = useState([])
  
  // Scores
  const [playerScore, setPlayerScore] = useState(0)
  const [aiScore, setAiScore] = useState(0)
  const [lastScoringEvent, setLastScoringEvent] = useState(null)
  
  // Game flow
  const [phase, setPhase] = useState(PHASES.DEALING)
  const [currentPlayer, setCurrentPlayer] = useState('player')
  const [dealer, setDealer] = useState('player')
  const [roundNumber, setRoundNumber] = useState(1)
  
  // UI state
  const [selectedCards, setSelectedCards] = useState([])
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [message, setMessage] = useState('')
  const [playerDiscarded, setPlayerDiscarded] = useState(false)
  const [aiDiscarded, setAiDiscarded] = useState(false)
  const [countingIndex, setCountingIndex] = useState(0)
  const [playerDeclaredGo, setPlayerDeclaredGo] = useState(false)
  const [aiDeclaredGo, setAiDeclaredGo] = useState(false)
  
  // Computed values
  const gameWinner = getWinner(playerScore, aiScore)
  const validPlays = phase === PHASES.PEGGING && currentPlayer === 'player'
    ? getValidPlays(playerHand, peggingCount)
    : []
  
  /**
   * Add score to a player with notification
   */
  const addScore = useCallback((player, points, reason) => {
    if (points === 0) return
    
    if (player === 'player') {
      setPlayerScore(prev => Math.min(prev + points, 121))
    } else {
      setAiScore(prev => Math.min(prev + points, 121))
    }
    
    setLastScoringEvent({ player, points, reason })
    setMessage(`${player === 'player' ? 'You' : 'AI'} scored ${points} point${points !== 1 ? 's' : ''}: ${reason}`)
    
    // Clear scoring event after 3 seconds
    setTimeout(() => {
      setLastScoringEvent(null)
      setMessage('')
    }, 3000)
  }, [])
  
  /**
   * Start a new game
   */
  const newGame = useCallback(() => {
    setRoundNumber(1)
    setPlayerScore(0)
    setAiScore(0)
    setDealer(determineDealer())
    setPhase(PHASES.DEALING)
    setMessage('New game started!')
    setLastScoringEvent(null)
    
    // Clear other state
    setPlayerHand([])
    setAiHand([])
    setCrib([])
    setCutCard(null)
    setPlayedCards([])
    setPeggingCount(0)
    setPeggingHistory([])
    setSelectedCards([])
    setPlayerDiscarded(false)
    setAiDiscarded(false)
    setCountingIndex(0)
    setPlayerDeclaredGo(false)
    setAiDeclaredGo(false)
  }, [])
  
  /**
   * Reset to initial state
   */
  const resetGame = useCallback(() => {
    newGame()
  }, [newGame])
  
  /**
   * Deal cards for a new round
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
   * Player selects/deselects a card
   */
  const selectCard = useCallback((card) => {
    if (phase === PHASES.DISCARD) {
      setSelectedCards(prev => {
        const isSelected = prev.some(c => cardsEqual(c, card))
        
        if (isSelected) {
          // Deselect
          return prev.filter(c => !cardsEqual(c, card))
        } else {
          // Select (max 2)
          if (prev.length >= 2) {
            return prev // Already selected 2
          }
          return [...prev, card]
        }
      })
    }
  }, [phase])
  
  /**
   * Confirm discard selection (player)
   */
  const confirmDiscard = useCallback(() => {
    if (selectedCards.length !== 2) {
      setMessage('Please select exactly 2 cards to discard')
      return
    }
    
    // Move selected cards to crib
    setCrib(prev => [...prev, ...selectedCards])
    
    // Remove from player hand
    setPlayerHand(prev => {
      const newHand = prev.filter(card => 
        !selectedCards.some(selected => cardsEqual(selected, card))
      )
      return sortHand(newHand)
    })
    
    setSelectedCards([])
    setPlayerDiscarded(true)
    setMessage('Waiting for AI to discard...')
  }, [selectedCards])
  
  /**
   * AI discards cards
   */
  const aiDiscard = useCallback(() => {
    const isDealer = dealer === 'ai'
    const discards = chooseDiscards(aiHand, isDealer)
    
    // Move AI discards to crib
    setCrib(prev => [...prev, ...discards])
    
    // Remove from AI hand
    setAiHand(prev => {
      const newHand = prev.filter(card =>
        !discards.some(discard => cardsEqual(discard, card))
      )
      return sortHand(newHand)
    })
    
    setAiDiscarded(true)
  }, [aiHand, dealer])
  
  /**
   * Cut the deck
   */
  const performCut = useCallback(() => {
    const { cutCard: cut } = cutDeck(remainingDeck)
    setCutCard(cut)
    
    // Check for "two for his heels" (Jack cut)
    if (isJack(cut)) {
      addScore(dealer, 2, 'two for his heels (Jack cut)')
    }
    
    // Start pegging phase
    const firstPegger = getNonDealer(dealer)
    setCurrentPlayer(firstPegger)
    setPhase(PHASES.PEGGING)
    setMessage(`${firstPegger === 'player' ? 'Your' : "AI's"} turn to play`)
  }, [remainingDeck, dealer, addScore])
  
  /**
   * Play a card during pegging
   */
  const playCard = useCallback((card, player = currentPlayer) => {
    if (phase !== PHASES.PEGGING) return
    
    // Validate play
    if (!validatePeggingPlay(card, peggingCount)) {
      setMessage('Cannot play that card - would exceed 31')
      return
    }
    
    // Remove card from hand
    if (player === 'player') {
      setPlayerHand(prev => removeCardFromHand(prev, card))
      setPlayerDeclaredGo(false)
    } else {
      setAiHand(prev => removeCardFromHand(prev, card))
      setAiDeclaredGo(false)
    }
    
    // Add to played cards
    setPlayedCards(prev => [...prev, { card, player }])
    
    // Calculate new count
    const newCount = peggingCount + card.value
    setPeggingCount(newCount)
    
    // Score the play
    const scoreResult = scorePeggingPlay(playedCards, card, peggingCount)
    if (scoreResult.points > 0) {
      addScore(player, scoreResult.points, scoreResult.reasons.join(', '))
    }
    
    // Check for last card (count to 31 or last card played)
    if (newCount === 31) {
      // Reset count for next round
      setPeggingCount(0)
      setPlayedCards([])
      setPlayerDeclaredGo(false)
      setAiDeclaredGo(false)
      
      // Check if pegging is complete
      const playerEmpty = (player === 'player' ? playerHand.length === 1 : playerHand.length === 0)
      const aiEmpty = (player === 'ai' ? aiHand.length === 1 : aiHand.length === 0)
      
      if (playerEmpty && aiEmpty) {
        // Move to counting phase
        setPhase(PHASES.COUNTING)
        setCountingIndex(0)
        setMessage('Counting hands...')
        return
      }
    }
    
    // Switch player
    const nextPlayer = player === 'player' ? 'ai' : 'player'
    setCurrentPlayer(nextPlayer)
  }, [phase, peggingCount, playedCards, currentPlayer, playerHand, aiHand, addScore])
  
  /**
   * Declare "Go" - cannot play any card
   */
  const declareGo = useCallback((player = currentPlayer) => {
    if (player === 'player') {
      setPlayerDeclaredGo(true)
    } else {
      setAiDeclaredGo(true)
    }
    
    // Check if both have declared go or can't play
    const otherPlayer = player === 'player' ? 'ai' : 'player'
    const otherHand = player === 'player' ? aiHand : playerHand
    const otherAlreadyDeclared = player === 'player' ? aiDeclaredGo : playerDeclaredGo
    const otherCanPlay = canPlayAnyCard(otherHand, peggingCount)
    
    if (otherAlreadyDeclared || !otherCanPlay) {
      // Both can't play - award Go point to last player who played
      if (playedCards.length > 0) {
        const lastPlay = playedCards[playedCards.length - 1]
        addScore(lastPlay.player, 1, 'Go')
      }
      
      // Reset for next pegging round
      setPeggingCount(0)
      setPlayedCards([])
      setPlayerDeclaredGo(false)
      setAiDeclaredGo(false)
      
      // Check if pegging is complete
      if (isPeggingComplete(playerHand.length, aiHand.length)) {
        setPhase(PHASES.COUNTING)
        setCountingIndex(0)
        setMessage('Counting hands...')
        return
      }
      
      // Continue with first player who has cards
      const nextPlayer = playerHand.length > 0 ? 'player' : 'ai'
      setCurrentPlayer(nextPlayer)
    } else {
      // Switch to other player
      setCurrentPlayer(otherPlayer)
      setMessage(`${otherPlayer === 'player' ? 'Your' : "AI's"} turn`)
    }
  }, [currentPlayer, playerHand, aiHand, peggingCount, playedCards, playerDeclaredGo, aiDeclaredGo, addScore])
  
  /**
   * Count hands at end of round
   */
  const countHands = useCallback(() => {
    if (!cutCard) return
    
    // Counting order: non-dealer, dealer, crib (dealer)
    const nonDealer = getNonDealer(dealer)
    
    const countingOrder = [
      { player: nonDealer, hand: nonDealer === 'player' ? playerHand : aiHand, isCrib: false },
      { player: dealer, hand: dealer === 'player' ? playerHand : aiHand, isCrib: false },
      { player: dealer, hand: crib, isCrib: true },
    ]
    
    if (countingIndex < countingOrder.length) {
      const current = countingOrder[countingIndex]
      const result = scoreHand(current.hand, cutCard, current.isCrib)
      
      if (result.total > 0) {
        const handType = current.isCrib ? 'crib' : 'hand'
        addScore(current.player, result.total, `${handType}: ${result.breakdown.map(b => b.reason).join(', ')}`)
      }
      
      setCountingIndex(prev => prev + 1)
    } else {
      // Counting complete - check for winner
      if (isGameOver(playerScore, aiScore)) {
        setPhase(PHASES.GAMEOVER)
        const winner = getWinner(playerScore, aiScore)
        setMessage(`Game Over! ${winner === 'player' ? 'You win!' : 'AI wins!'}`)
      } else {
        // Start next round
        setDealer(prev => switchDealer(prev))
        setRoundNumber(prev => prev + 1)
        setPhase(PHASES.DEALING)
      }
    }
  }, [cutCard, dealer, playerHand, aiHand, crib, countingIndex, playerScore, aiScore, addScore])
  
  // ======================
  // EFFECTS FOR AUTOMATION
  // ======================
  
  /**
   * Auto-deal when in dealing phase
   */
  useEffect(() => {
    if (phase === PHASES.DEALING) {
      const timer = setTimeout(() => {
        dealCards()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [phase, dealCards])
  
  /**
   * AI auto-discard when player has discarded
   */
  useEffect(() => {
    if (phase === PHASES.DISCARD && playerDiscarded && !aiDiscarded && !isAIThinking) {
      setIsAIThinking(true)
      setTimeout(() => {
        aiDiscard()
        setIsAIThinking(false)
      }, AI_THINK_DELAY)
    }
  }, [phase, playerDiscarded, aiDiscarded, isAIThinking, aiDiscard])
  
  /**
   * Auto-cut after both players discard
   */
  useEffect(() => {
    if (phase === PHASES.DISCARD && playerDiscarded && aiDiscarded) {
      const timer = setTimeout(() => {
        performCut()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [phase, playerDiscarded, aiDiscarded, performCut])
  
  /**
   * AI makes pegging moves
   */
  useEffect(() => {
    if (phase === PHASES.PEGGING && currentPlayer === 'ai' && !isAIThinking) {
      setIsAIThinking(true)
      
      setTimeout(() => {
        const isDealer = dealer === 'ai'
        const card = choosePeggingPlay(aiHand, playedCards, peggingCount, isDealer)
        
        if (card) {
          playCard(card, 'ai')
        } else {
          declareGo('ai')
        }
        
        setIsAIThinking(false)
      }, AI_THINK_DELAY)
    }
  }, [phase, currentPlayer, isAIThinking, aiHand, playedCards, peggingCount, dealer, playCard, declareGo])
  
  /**
   * Auto-advance through counting phase
   */
  useEffect(() => {
    if (phase === PHASES.COUNTING && cutCard) {
      const timer = setTimeout(() => {
        countHands()
      }, 2000) // 2 seconds between each count
      
      return () => clearTimeout(timer)
    }
  }, [phase, countingIndex, countHands, cutCard])
  
  /**
   * Check for game over after scores update
   */
  useEffect(() => {
    if (phase !== PHASES.GAMEOVER && isGameOver(playerScore, aiScore)) {
      setPhase(PHASES.GAMEOVER)
      const winner = getWinner(playerScore, aiScore)
      setMessage(`Game Over! ${winner === 'player' ? 'You win!' : 'AI wins!'}`)
    }
  }, [playerScore, aiScore, phase])
  
  // Return hook interface
  return {
    // Game State
    playerHand,
    aiHand,
    crib,
    cutCard,
    playedCards,
    peggingCount,
    peggingHistory,
    
    // Scores
    playerScore,
    aiScore,
    lastScoringEvent,
    
    // Game Flow
    phase,
    currentPlayer,
    dealer,
    roundNumber,
    
    // UI State
    selectedCards,
    validPlays,
    isAIThinking,
    message,
    gameWinner,
    
    // Actions
    selectCard,
    confirmDiscard,
    playCard,
    declareGo,
    newGame,
    resetGame,
  }
}
