import { useCribbageGame } from '../../hooks/useCribbageGame'
import Hand from './Hand'
import PlayArea from './PlayArea'
import Card from './Card'

export default function CribbageBoard() {
  const {
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
    selectCard,
    confirmDiscard,
    playCard,
    declareGo,
    newGame,
  } = useCribbageGame()

  const handleCardClick = (card) => {
    if (phase === 'discard') {
      selectCard(card)
    } else if (phase === 'pegging' && currentPlayer === 'player') {
      if (validPlays.some(c => c.id === card.id)) {
        playCard(card)
      }
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Header with scores */}
      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">You</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{playerScore}</div>
          {dealer === 'player' && <div className="text-xs text-yellow-600">⭐ Dealer</div>}
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">CRIBBAGE</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">First to 121</div>
          {lastScoringEvent && (
            <div className="text-sm font-semibold text-green-600 mt-2">
              +{lastScoringEvent.points}: {lastScoringEvent.reason}
            </div>
          )}
        </div>
        
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">AI</div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">{aiScore}</div>
          {dealer === 'ai' && <div className="text-xs text-yellow-600">⭐ Dealer</div>}
        </div>
      </div>

      {/* Phase indicator */}
      <div className="text-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
        <span className="font-semibold capitalize">{phase}</span> Phase
        {currentPlayer && <span> - {currentPlayer === 'player' ? 'Your' : "AI's"} Turn</span>}
        {isAIThinking && <span className="ml-2 text-blue-600">AI is thinking...</span>}
      </div>

      {/* AI Hand */}
      <Hand
        cards={aiHand}
        owner="ai"
        hidden={phase !== 'counting' && phase !== 'gameover'}
        label="AI Hand"
      />

      {/* Play Area with cut card and crib */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Crib */}
        <div className="flex flex-col items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-sm font-semibold">Crib ({dealer === 'player' ? 'Yours' : "AI's"})</div>
          <div className="flex gap-1">
            {crib.length > 0 ? (
              crib.map((card, i) => (
                <Card
                  key={i}
                  card={card}
                  size="small"
                  isHidden={phase !== 'counting' && phase !== 'gameover'}
                />
              ))
            ) : (
              <div className="text-xs text-gray-500 italic">Empty</div>
            )}
          </div>
        </div>

        {/* Play Area */}
        {phase === 'pegging' && (
          <PlayArea
            playedCards={playedCards}
            count={peggingCount}
          />
        )}

        {/* Cut Card */}
        {cutCard && (phase === 'pegging' || phase === 'counting') && (
          <div className="flex flex-col items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-sm font-semibold">Cut Card</div>
            <Card card={cutCard} size="medium" />
          </div>
        )}
      </div>

      {/* Player Hand */}
      <Hand
        cards={playerHand}
        owner="player"
        selectedCards={selectedCards}
        validPlays={validPlays}
        onCardClick={handleCardClick}
        hidden={false}
        phase={phase}
        label="Your Hand"
      />

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <button
          onClick={newGame}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
        >
          New Game
        </button>
        
        {phase === 'discard' && selectedCards.length === 2 && (
          <button
            onClick={confirmDiscard}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
          >
            Confirm Discard
          </button>
        )}
        
        {phase === 'pegging' && currentPlayer === 'player' && validPlays.length === 0 && (
          <button
            onClick={declareGo}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition"
          >
            Go
          </button>
        )}
      </div>

      {/* Game Over */}
      {gameWinner && (
        <div className="text-center p-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-lg">
          <div className="text-3xl font-bold text-white mb-2">
            🎉 {gameWinner === 'player' ? 'You Win!' : 'AI Wins!'} 🎉
          </div>
          <div className="text-white">
            Final Score: You {playerScore} - AI {aiScore}
          </div>
        </div>
      )}

      {/* Instructions */}
      {phase === 'discard' && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 italic">
          Select 2 cards to discard to the crib
        </div>
      )}
      {phase === 'pegging' && currentPlayer === 'player' && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 italic">
          Click a card to play it (must not exceed 31)
        </div>
      )}
    </div>
  )
}
