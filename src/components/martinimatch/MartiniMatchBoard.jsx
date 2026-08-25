import { useState, useCallback } from 'react'
import Toast from '../Toast'
import Confetti from '../Confetti'
import './MartiniMatch.css'
import { COCKTAILS } from '../../data/martiniMatchData'

const createInitialCards = () => {
  const gameCards = []
  COCKTAILS.forEach((cocktail) => {
    gameCards.push({
      id: `name-${cocktail.id}`,
      type: 'name',
      cocktailId: cocktail.id,
      content: cocktail.name,
      emoji: cocktail.emoji,
    })
    gameCards.push({
      id: `ingredient-${cocktail.id}`,
      type: 'ingredient',
      cocktailId: cocktail.id,
      content: cocktail.ingredient,
      emoji: cocktail.emoji,
    })
  })
  return gameCards.sort(() => Math.random() - 0.5)
}

export default function MartiniMatchBoard() {
  const [cards, setCards] = useState(createInitialCards)
  const [flipped, setFlipped] = useState(new Set())
  const [matched, setMatched] = useState(new Set())
  const [moves, setMoves] = useState(0)
  const [message, setMessage] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [gameWon, setGameWon] = useState(false)

  const initializeGame = useCallback(() => {
    setCards(createInitialCards())
    setFlipped(new Set())
    setMatched(new Set())
    setMoves(0)
    setMessage('')
    setShowConfetti(false)
    setGameWon(false)
  }, [])

  const handleCardClick = (cardId) => {
    if (flipped.has(cardId) || matched.has(cardId) || gameWon || flipped.size >= 2) return

    const newFlipped = new Set(flipped)
    newFlipped.add(cardId)
    setFlipped(newFlipped)

    // Check for match when 2 cards are flipped
    if (newFlipped.size === 2) {
      const flippedCards = Array.from(newFlipped)
      const card1 = cards.find((c) => c.id === flippedCards[0])
      const card2 = cards.find((c) => c.id === flippedCards[1])

      setMoves(moves + 1)

      if (card1.cocktailId === card2.cocktailId) {
        // Match found!
        setMatched((prev) => new Set([...prev, flippedCards[0], flippedCards[1]]))
        setFlipped(new Set())
        setMessage('🎉 Perfect match!')

        // Check if game is won
        if (matched.size + 2 === cards.length) {
          setGameWon(true)
          setShowConfetti(true)
          setMessage('🏆 You won! All cocktails matched!')
        }
      } else {
        // No match
        setMessage('❌ Not a match, try again!')
        setTimeout(() => {
          setFlipped(new Set())
        }, 1000)
      }
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <h2
          className="text-3xl font-bold tracking-tight mb-2"
          style={{ color: 'var(--label-primary)' }}
        >
          🍸 Martini Match
        </h2>
        <p
          className="text-sm"
          style={{ color: 'var(--label-secondary)' }}
        >
          Match cocktail names with their ingredients!
        </p>
      </div>

      {/* Stats */}
      <div
        className="text-center p-4 rounded-lg mb-6 font-semibold"
        style={{ backgroundColor: 'var(--fill-tertiary)', color: 'var(--label-primary)' }}
      >
        <p>Moves: {moves}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--label-secondary)' }}>
          Matched: {matched.size} / {cards.length}
        </p>
      </div>

      {/* Game Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={matched.has(card.id) || gameWon}
            className={`martini-card ${
              flipped.has(card.id) || matched.has(card.id) ? 'flipped' : ''
            } ${matched.has(card.id) ? 'matched' : ''}`}
            style={{
              backgroundColor: matched.has(card.id)
                ? '#e8f5e9'
                : flipped.has(card.id)
                  ? 'var(--fill-secondary)'
                  : 'var(--fill-tertiary)',
              color: 'var(--label-primary)',
            }}
          >
            <div className="martini-card__inner">
              {flipped.has(card.id) || matched.has(card.id) ? (
                <div className="text-center">
                  <div className="text-2xl mb-1">{card.emoji}</div>
                  <div className="text-xs font-semibold">{card.content}</div>
                </div>
              ) : (
                <div className="text-3xl">🍸</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={initializeGame}
          className="flex-1 px-6 py-3 rounded-lg font-semibold"
          style={{ backgroundColor: 'var(--fill-tertiary)', color: 'var(--label-primary)' }}
        >
          {gameWon ? 'Play Again' : 'Reset'}
        </button>
      </div>

      {/* Toast Message */}
      {message && <Toast message={message} />}

      {/* Confetti */}
      {showConfetti && <Confetti />}
    </div>
  )
}
