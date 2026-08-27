import { useState, useEffect, useCallback } from 'react'
import {
  buildDeck,
  shuffle,
  deal,
  canPlay,
  chooseAiCard,
  chooseSuitForAi,
  nextPlayer,
  hasWon,
  drawCard,
  getLegalCards,
} from './crazyEightsLogic'

const PLAYER_NAMES = ['You (South)', 'West', 'North', 'East']
const AI_DELAY = 700

function getSuitColor(suit) {
  if (suit === '♥' || suit === '♦') return '#ef4444'
  return '#1e293b'
}

function Card({ card, onClick, isLegal, isFaceDown, style }) {
  const color = getSuitColor(card.suit)
  
  if (isFaceDown) {
    return (
      <div
        style={{
          width: 70,
          height: 100,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
          border: '2px solid #1e40af',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          color: 'white',
          ...style,
        }}
      >
        🂠
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      style={{
        width: 70,
        height: 100,
        borderRadius: 8,
        background: 'white',
        border: `2px solid ${isLegal ? '#22c55e' : '#e5e7eb'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick && isLegal ? 'pointer' : 'default',
        opacity: !onClick || isLegal ? 1 : 0.5,
        transition: 'all 0.2s',
        boxShadow: isLegal ? '0 0 0 3px rgba(34, 197, 94, 0.3)' : 'none',
        ...style,
      }}
      className={onClick && isLegal ? 'hover:scale-105' : ''}
    >
      <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>
        {card.rank}
      </div>
      <div style={{ fontSize: 32, lineHeight: 1 }}>
        {card.suit}
      </div>
    </div>
  )
}

function SuitPicker({ onSelect }) {
  const suits = ['♠', '♥', '♦', '♣']
  
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        padding: 24,
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        zIndex: 100,
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>
        Choose a suit:
      </h3>
      <div style={{ display: 'flex', gap: 12 }}>
        {suits.map((suit) => (
          <button
            key={suit}
            onClick={() => onSelect(suit)}
            style={{
              width: 60,
              height: 80,
              fontSize: 40,
              borderRadius: 8,
              border: '2px solid #e5e7eb',
              background: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            className="hover:scale-110 hover:border-blue-500"
          >
            {suit}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function CrazyEightsBoard() {
  const [gameState, setGameState] = useState(null)
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [activeSuit, setActiveSuit] = useState(null)
  const [gameStatus, setGameStatus] = useState('idle')
  const [winner, setWinner] = useState(null)
  const [message, setMessage] = useState('')
  const [showSuitPicker, setShowSuitPicker] = useState(false)
  const [pendingEightCard, setPendingEightCard] = useState(null)

  const initGame = useCallback(() => {
    const deck = shuffle(buildDeck())
    const { hands, drawPile } = deal(deck, 4, 5)
    
    // Flip one card to start discard
    const discardPile = [drawPile.shift()]
    
    setGameState({
      hands,
      drawPile,
      discardPile,
    })
    setCurrentPlayer(0)
    setActiveSuit(discardPile[0].suit)
    setGameStatus('playing')
    setWinner(null)
    setMessage('Your turn!')
    setShowSuitPicker(false)
    setPendingEightCard(null)
  }, [])

  useEffect(() => {
    initGame()
  }, [initGame])

  const playCard = useCallback(
    (playerIndex, card) => {
      if (!gameState) return

      const newHands = gameState.hands.map((h, i) =>
        i === playerIndex ? h.filter((c) => c !== card) : h
      )
      const newDiscardPile = [...gameState.discardPile, card]

      setGameState({
        ...gameState,
        hands: newHands,
        discardPile: newDiscardPile,
      })

      // Check if player won
      if (newHands[playerIndex].length === 0) {
        setGameStatus('won')
        setWinner(playerIndex)
        setMessage(
          playerIndex === 0 ? '🎉 You won!' : `${PLAYER_NAMES[playerIndex]} won!`
        )
        return
      }

      // If it's an eight, handle suit selection
      if (card.rank === '8') {
        if (playerIndex === 0) {
          // Human player picks suit
          setPendingEightCard(card)
          setShowSuitPicker(true)
        } else {
          // AI picks suit
          const newSuit = chooseSuitForAi(newHands[playerIndex])
          setActiveSuit(newSuit)
          const next = nextPlayer(currentPlayer, 4)
          setCurrentPlayer(next)
          setMessage(
            `${PLAYER_NAMES[playerIndex]} played an 8, changed suit to ${newSuit}. ${
              next === 0 ? 'Your turn!' : `${PLAYER_NAMES[next]}'s turn.`
            }`
          )
        }
      } else {
        setActiveSuit(card.suit)
        const next = nextPlayer(currentPlayer, 4)
        setCurrentPlayer(next)
        setMessage(
          next === 0 ? 'Your turn!' : `${PLAYER_NAMES[next]}'s turn.`
        )
      }
    },
    [gameState, currentPlayer]
  )

  const handleSuitSelect = useCallback(
    (suit) => {
      setActiveSuit(suit)
      setShowSuitPicker(false)
      setPendingEightCard(null)
      const next = nextPlayer(currentPlayer, 4)
      setCurrentPlayer(next)
      setMessage(
        `You played an 8, changed suit to ${suit}. ${
          next === 0 ? 'Your turn!' : `${PLAYER_NAMES[next]}'s turn.`
        }`
      )
    },
    [currentPlayer]
  )

  const handleDrawCard = useCallback(() => {
    if (!gameState || currentPlayer !== 0 || gameStatus !== 'playing') return

    const { card, newDrawPile, newDiscardPile } = drawCard(
      gameState.drawPile,
      gameState.discardPile
    )

    if (!card) {
      setMessage('No cards left to draw!')
      return
    }

    const newHands = [...gameState.hands]
    newHands[0] = [...newHands[0], card]

    setGameState({
      hands: newHands,
      drawPile: newDrawPile,
      discardPile: newDiscardPile,
    })

    const topCard = gameState.discardPile[gameState.discardPile.length - 1]
    
    // Check if the drawn card is playable
    if (canPlay(card, topCard, activeSuit)) {
      setMessage('Drew a card you can play!')
    } else {
      // Can't play, pass turn
      const next = nextPlayer(currentPlayer, 4)
      setCurrentPlayer(next)
      setMessage(`Drew a card but couldn't play. ${PLAYER_NAMES[next]}'s turn.`)
    }
  }, [gameState, currentPlayer, activeSuit, gameStatus])

  const handleCardClick = useCallback(
    (card) => {
      if (currentPlayer !== 0 || gameStatus !== 'playing') return
      
      const topCard = gameState.discardPile[gameState.discardPile.length - 1]
      if (!canPlay(card, topCard, activeSuit)) return
      
      playCard(0, card)
    },
    [currentPlayer, gameStatus, gameState, activeSuit, playCard]
  )

  // AI turn logic
  useEffect(() => {
    if (
      !gameState ||
      currentPlayer === 0 ||
      gameStatus !== 'playing' ||
      showSuitPicker
    )
      return

    const timer = setTimeout(() => {
      const topCard = gameState.discardPile[gameState.discardPile.length - 1]
      const aiHand = gameState.hands[currentPlayer]
      const cardToPlay = chooseAiCard(aiHand, topCard, activeSuit)

      if (cardToPlay) {
        playCard(currentPlayer, cardToPlay)
      } else {
        // AI must draw
        const { card, newDrawPile, newDiscardPile } = drawCard(
          gameState.drawPile,
          gameState.discardPile
        )

        if (card) {
          const newHands = [...gameState.hands]
          newHands[currentPlayer] = [...newHands[currentPlayer], card]

          setGameState({
            hands: newHands,
            drawPile: newDrawPile,
            discardPile: newDiscardPile,
          })

          // Check if AI can play the drawn card
          if (canPlay(card, topCard, activeSuit)) {
            setTimeout(() => {
              playCard(currentPlayer, card)
            }, AI_DELAY / 2)
          } else {
            // AI passes
            const next = nextPlayer(currentPlayer, 4)
            setCurrentPlayer(next)
            setMessage(
              `${PLAYER_NAMES[currentPlayer]} drew but couldn't play. ${
                next === 0 ? 'Your turn!' : `${PLAYER_NAMES[next]}'s turn.`
              }`
            )
          }
        } else {
          // No cards to draw, pass
          const next = nextPlayer(currentPlayer, 4)
          setCurrentPlayer(next)
          setMessage(
            `${PLAYER_NAMES[currentPlayer]} couldn't play. ${
              next === 0 ? 'Your turn!' : `${PLAYER_NAMES[next]}'s turn.`
            }`
          )
        }
      }
    }, AI_DELAY)

    return () => clearTimeout(timer)
  }, [
    gameState,
    currentPlayer,
    activeSuit,
    gameStatus,
    showSuitPicker,
    playCard,
  ])

  if (!gameState) return null

  const topCard = gameState.discardPile[gameState.discardPile.length - 1]
  const humanHand = gameState.hands[0]
  const legalCards = getLegalCards(humanHand, topCard, activeSuit)

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Game Status */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Crazy Eights</h2>
        <p className="text-lg">{message}</p>
        {topCard.suit !== activeSuit && (
          <p className="text-sm mt-1">
            Active suit: <span style={{ fontSize: 20 }}>{activeSuit}</span>
          </p>
        )}
      </div>

      {/* Opponents */}
      <div className="mb-8">
        <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="text-center">
              <div className="text-sm font-semibold mb-2">
                {PLAYER_NAMES[idx]}
                {currentPlayer === idx && gameStatus === 'playing' && ' 👈'}
              </div>
              <div className="flex justify-center gap-1">
                {gameState.hands[idx].map((_, i) => (
                  <Card key={i} card={{ suit: '♠', rank: '' }} isFaceDown />
                ))}
              </div>
              <div className="text-xs mt-1">
                {gameState.hands[idx].length} card{gameState.hands[idx].length !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center: Draw Pile + Discard Pile */}
      <div className="flex justify-center items-center gap-8 mb-8">
        <div className="text-center">
          <div className="text-sm font-semibold mb-2">Draw Pile</div>
          <div
            onClick={
              currentPlayer === 0 &&
              gameStatus === 'playing' &&
              legalCards.length === 0
                ? handleDrawCard
                : undefined
            }
            style={{
              cursor:
                currentPlayer === 0 &&
                gameStatus === 'playing' &&
                legalCards.length === 0
                  ? 'pointer'
                  : 'default',
            }}
            className={
              currentPlayer === 0 &&
              gameStatus === 'playing' &&
              legalCards.length === 0
                ? 'hover:scale-105 transition-transform'
                : ''
            }
          >
            <Card
              card={{ suit: '♠', rank: '' }}
              isFaceDown
              style={{ width: 90, height: 130 }}
            />
          </div>
          <div className="text-xs mt-1">{gameState.drawPile.length} cards</div>
        </div>

        <div className="text-center">
          <div className="text-sm font-semibold mb-2">Discard Pile</div>
          <Card
            card={topCard}
            style={{ width: 90, height: 130 }}
          />
        </div>
      </div>

      {/* Human Hand */}
      <div className="mb-8">
        <div className="text-center mb-3">
          <div className="text-sm font-semibold">
            Your Hand
            {currentPlayer === 0 && gameStatus === 'playing' && ' 👈'}
          </div>
        </div>
        <div className="flex justify-center gap-2 flex-wrap">
          {humanHand.map((card, i) => {
            const legal = legalCards.some(
              (c) => c.suit === card.suit && c.rank === card.rank
            )
            return (
              <Card
                key={i}
                card={card}
                onClick={() => handleCardClick(card)}
                isLegal={legal}
              />
            )
          })}
        </div>
      </div>

      {/* New Game / Win Banner */}
      {gameStatus === 'won' && (
        <div className="text-center">
          <div
            className="inline-block px-6 py-3 rounded-lg mb-4"
            style={{
              background: winner === 0 ? '#22c55e' : '#ef4444',
              color: 'white',
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {winner === 0 ? '🎉 You Won!' : `${PLAYER_NAMES[winner]} Won!`}
          </div>
          <div>
            <button
              onClick={initGame}
              className="btn-primary"
              style={{
                background: '#3b82f6',
                color: 'white',
                padding: '12px 24px',
                borderRadius: 8,
                border: 'none',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              New Game
            </button>
          </div>
        </div>
      )}

      {gameStatus === 'idle' && (
        <div className="text-center">
          <button
            onClick={initGame}
            className="btn-primary"
            style={{
              background: '#3b82f6',
              color: 'white',
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Start Game
          </button>
        </div>
      )}

      {/* Suit Picker Modal */}
      {showSuitPicker && <SuitPicker onSelect={handleSuitSelect} />}
    </div>
  )
}
