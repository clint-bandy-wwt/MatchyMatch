// src/hooks/useCanasta.js
import { useState, useEffect, useCallback } from 'react'
import {
  createDeck,
  shuffleDeck,
  isValidMeld,
  canAddToMeld,
  canPickUpDiscardPile,
  canGoOut,
  calculateScore,
  isBlack3,
  getMeldRank,
  getMinimumMeldRequirement,
  calculateCardPoints,
} from '../data/canastaData'

const INITIAL_HAND_SIZE = 15
const CARDS_TO_DRAW = 2

export function useCanasta() {
  const [deck, setDeck] = useState([])
  const [playerHand, setPlayerHand] = useState([])
  const [aiHand, setAiHand] = useState([])
  const [discardPile, setDiscardPile] = useState([])
  const [playerMelds, setPlayerMelds] = useState([])
  const [aiMelds, setAiMelds] = useState([])
  const [playerRed3s, setPlayerRed3s] = useState(0)
  const [aiRed3s, setAiRed3s] = useState(0)
  const [playerScore, setPlayerScore] = useState(0)
  const [aiScore, setAiScore] = useState(0)
  const [round, setRound] = useState(1)
  const [turn, setTurn] = useState('player') // 'player' or 'ai'
  const [phase, setPhase] = useState('draw') // 'draw', 'meld', 'discard'
  const [selectedCards, setSelectedCards] = useState([])
  const [frozen, setFrozen] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState(null)
  const [message, setMessage] = useState('')
  const [playerHasMelded, setPlayerHasMelded] = useState(false)
  const [aiHasMelded, setAiHasMelded] = useState(false)

  // Initialize game
  const initGame = useCallback(() => {
    const newDeck = shuffleDeck(createDeck())
    const playerCards = []
    const aiCards = []
    let deckIndex = 0

    // Deal initial hands
    for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
      playerCards.push(newDeck[deckIndex++])
      aiCards.push(newDeck[deckIndex++])
    }

    // Handle red 3s in initial hands
    let pRed3s = 0
    let aRed3s = 0
    const finalPlayerCards = []
    const finalAiCards = []

    for (const card of playerCards) {
      if (card.isRed3) {
        pRed3s++
        finalPlayerCards.push(newDeck[deckIndex++])
      } else {
        finalPlayerCards.push(card)
      }
    }

    for (const card of aiCards) {
      if (card.isRed3) {
        aRed3s++
        finalAiCards.push(newDeck[deckIndex++])
      } else {
        finalAiCards.push(card)
      }
    }

    // Find first valid discard pile card
    let firstDiscard = null
    while (deckIndex < newDeck.length) {
      const card = newDeck[deckIndex++]
      if (!card.isWild && !card.isRed3 && !isBlack3(card)) {
        firstDiscard = card
        break
      }
    }

    setDeck(newDeck.slice(deckIndex))
    setPlayerHand(finalPlayerCards)
    setAiHand(finalAiCards)
    setDiscardPile(firstDiscard ? [firstDiscard] : [])
    setPlayerMelds([])
    setAiMelds([])
    setPlayerRed3s(pRed3s)
    setAiRed3s(aRed3s)
    setTurn('player')
    setPhase('draw')
    setSelectedCards([])
    setFrozen(false)
    setGameOver(false)
    setWinner(null)
    setMessage('')
    setPlayerHasMelded(false)
    setAiHasMelded(false)
  }, [])

  useEffect(() => {
    initGame()
  }, [initGame])

  // Handle card selection
  const toggleCardSelection = useCallback((card) => {
    setSelectedCards((prev) => {
      const isSelected = prev.some((c) => c.id === card.id)
      if (isSelected) {
        return prev.filter((c) => c.id !== card.id)
      } else {
        return [...prev, card]
      }
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedCards([])
  }, [])

  // Draw cards from deck
  const drawFromDeck = useCallback(() => {
    if (phase !== 'draw' || turn !== 'player') return

    if (deck.length < CARDS_TO_DRAW) {
      setMessage('Not enough cards in deck!')
      return
    }

    const drawnCards = deck.slice(0, CARDS_TO_DRAW)
    const newDeck = deck.slice(CARDS_TO_DRAW)
    
    // Handle red 3s
    let red3Count = 0
    const finalCards = []
    let deckIndex = 0

    for (const card of drawnCards) {
      if (card.isRed3) {
        red3Count++
        if (deckIndex < newDeck.length) {
          finalCards.push(newDeck[deckIndex++])
        }
      } else {
        finalCards.push(card)
      }
    }

    setPlayerHand((prev) => [...prev, ...finalCards])
    setDeck(newDeck.slice(deckIndex))
    setPlayerRed3s((prev) => prev + red3Count)
    setPhase('meld')
    setMessage(red3Count > 0 ? `Drew ${red3Count} Red 3(s)! Replaced with new cards.` : '')
  }, [phase, turn, deck])

  // Pick up discard pile
  const pickUpDiscardPile = useCallback(() => {
    if (phase !== 'draw' || turn !== 'player') return

    const topCard = discardPile[discardPile.length - 1]
    if (!canPickUpDiscardPile(topCard, playerHand, playerMelds, frozen)) {
      setMessage('Cannot pick up discard pile!')
      return
    }

    // Must immediately meld the top card
    const matchingCards = playerHand.filter(
      (c) => !c.isWild && c.rank === topCard.rank
    )
    
    if (matchingCards.length < 2 && !playerMelds.some((m) => getMeldRank(m.cards) === topCard.rank)) {
      setMessage('Must have 2 matching cards or existing meld!')
      return
    }

    setPlayerHand((prev) => [...prev, ...discardPile])
    setDiscardPile([])
    setFrozen(false)
    setPhase('meld')
    setMessage('Picked up discard pile! Now meld the top card.')
  }, [phase, turn, discardPile, playerHand, playerMelds, frozen])

  // Form a new meld
  const formMeld = useCallback(() => {
    if (selectedCards.length < 3) {
      setMessage('Need at least 3 cards to form a meld!')
      return
    }

    if (!isValidMeld(selectedCards)) {
      setMessage('Invalid meld! Check the rules.')
      return
    }

    // Check minimum meld requirement if first meld
    if (!playerHasMelded) {
      const meldPoints = calculateCardPoints(selectedCards)
      const minRequired = getMinimumMeldRequirement(playerScore)
      if (meldPoints < minRequired) {
        setMessage(`First meld must be worth at least ${minRequired} points!`)
        return
      }
    }

    const meldRank = getMeldRank(selectedCards)
    const newMeld = {
      id: `meld-${Date.now()}`,
      rank: meldRank,
      cards: [...selectedCards],
    }

    setPlayerMelds((prev) => [...prev, newMeld])
    setPlayerHand((prev) => prev.filter((c) => !selectedCards.some((sc) => sc.id === c.id)))
    setSelectedCards([])
    setPlayerHasMelded(true)
    setMessage('Meld formed!')
  }, [selectedCards, playerHasMelded, playerScore])

  // Add cards to existing meld
  const addToMeld = useCallback((meldId) => {
    if (selectedCards.length === 0) {
      setMessage('Select cards to add to meld!')
      return
    }

    const meld = playerMelds.find((m) => m.id === meldId)
    if (!meld) return

    if (!canAddToMeld(meld, selectedCards)) {
      setMessage('Cannot add these cards to this meld!')
      return
    }

    setPlayerMelds((prev) =>
      prev.map((m) =>
        m.id === meldId ? { ...m, cards: [...m.cards, ...selectedCards] } : m
      )
    )
    setPlayerHand((prev) => prev.filter((c) => !selectedCards.some((sc) => sc.id === c.id)))
    setSelectedCards([])
    setMessage('Cards added to meld!')
  }, [selectedCards, playerMelds])

  // Discard a card
  const discardCard = useCallback(() => {
    if (phase !== 'meld' && phase !== 'discard') return
    if (selectedCards.length !== 1) {
      setMessage('Select exactly 1 card to discard!')
      return
    }

    const card = selectedCards[0]
    setDiscardPile((prev) => [...prev, card])
    setPlayerHand((prev) => prev.filter((c) => c.id !== card.id))
    setSelectedCards([])

    // Check if pile should be frozen
    if (card.isWild) {
      setFrozen(true)
    } else if (isBlack3(card)) {
      setFrozen(true) // Temporary freeze
    }

    setPhase('draw')
    setTurn('ai')
    setMessage('')
  }, [phase, selectedCards])

  // Go out
  const goOut = useCallback(() => {
    if (!canGoOut(playerHand, playerMelds)) {
      setMessage('Cannot go out! Need at least one canasta and must meld/discard all cards.')
      return
    }

    // Calculate final scores
    const pScore = calculateScore(playerMelds, playerRed3s, [], true, false)
    const aScore = calculateScore(aiMelds, aiRed3s, aiHand, false, false)

    setPlayerScore((prev) => prev + pScore)
    setAiScore((prev) => prev + aScore)
    setGameOver(true)
    setWinner(pScore > aScore ? 'player' : 'ai')
    setMessage(`Round over! You went out!`)
  }, [playerHand, playerMelds, aiMelds, playerRed3s, aiRed3s, aiHand])

  // AI turn
  useEffect(() => {
    if (turn !== 'ai' || gameOver) return

    const aiTurn = setTimeout(() => {
      // Simple AI: draw cards, try to meld, discard random card
      if (phase === 'draw') {
        if (deck.length >= CARDS_TO_DRAW) {
          const drawnCards = deck.slice(0, CARDS_TO_DRAW)
          const newDeck = deck.slice(CARDS_TO_DRAW)
          
          let red3Count = 0
          const finalCards = []
          let deckIndex = 0

          for (const card of drawnCards) {
            if (card.isRed3) {
              red3Count++
              if (deckIndex < newDeck.length) {
                finalCards.push(newDeck[deckIndex++])
              }
            } else {
              finalCards.push(card)
            }
          }

          setAiHand((prev) => [...prev, ...finalCards])
          setDeck(newDeck.slice(deckIndex))
          setAiRed3s((prev) => prev + red3Count)
          setPhase('meld')
        }
      } else if (phase === 'meld') {
        // Try to form melds
        const handByRank = {}
        for (const card of aiHand) {
          if (!card.isWild && card.rank !== '3') {
            if (!handByRank[card.rank]) handByRank[card.rank] = []
            handByRank[card.rank].push(card)
          }
        }

        for (const rank in handByRank) {
          if (handByRank[rank].length >= 2) {
            const cards = handByRank[rank].slice(0, 3)
            if (isValidMeld(cards)) {
              const newMeld = {
                id: `ai-meld-${Date.now()}`,
                rank,
                cards,
              }
              setAiMelds((prev) => [...prev, newMeld])
              setAiHand((prev) => prev.filter((c) => !cards.some((mc) => mc.id === c.id)))
              setAiHasMelded(true)
              break
            }
          }
        }

        // Discard a card
        setTimeout(() => {
          setAiHand((prev) => {
            if (prev.length === 0) return prev
            const cardToDiscard = prev[0]
            setDiscardPile((p) => [...p, cardToDiscard])
            if (cardToDiscard.isWild || isBlack3(cardToDiscard)) {
              setFrozen(true)
            }
            return prev.slice(1)
          })
          setPhase('draw')
          setTurn('player')
        }, 500)
      }
    }, 1000)

    return () => clearTimeout(aiTurn)
  }, [turn, phase, deck, aiHand, gameOver])

  // New round
  const newRound = useCallback(() => {
    setRound((prev) => prev + 1)
    initGame()
  }, [initGame])

  // Reset game
  const resetGame = useCallback(() => {
    setPlayerScore(0)
    setAiScore(0)
    setRound(1)
    initGame()
  }, [initGame])

  return {
    // State
    playerHand,
    aiHand,
    discardPile,
    playerMelds,
    aiMelds,
    playerRed3s,
    aiRed3s,
    playerScore,
    aiScore,
    round,
    turn,
    phase,
    selectedCards,
    frozen,
    gameOver,
    winner,
    message,
    deckCount: deck.length,
    
    // Actions
    toggleCardSelection,
    clearSelection,
    drawFromDeck,
    pickUpDiscardPile,
    formMeld,
    addToMeld,
    discardCard,
    goOut,
    newRound,
    resetGame,
    
    // Helpers
    canPickUp: canPickUpDiscardPile(
      discardPile[discardPile.length - 1],
      playerHand,
      playerMelds,
      frozen
    ),
    canFormMeld: selectedCards.length >= 3 && isValidMeld(selectedCards),
    canDiscard: selectedCards.length === 1 && (phase === 'meld' || phase === 'discard'),
    canGoOut: canGoOut(playerHand, playerMelds),
  }
}
