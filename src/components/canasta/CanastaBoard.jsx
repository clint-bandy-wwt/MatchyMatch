// src/components/canasta/CanastaBoard.jsx
import { useCanasta } from '../../hooks/useCanasta'
import Hand from './Hand'
import Meld from './Meld'
import { DrawPile, DiscardPile } from './Piles'
import ScoreBoard from './ScoreBoard'
import Toast from '../Toast'
import Confetti from '../Confetti'
import './canasta.css'

export default function CanastaBoard() {
  const {
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
    deckCount,
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
    canPickUp,
    canFormMeld,
    canDiscard,
    canGoOut,
  } = useCanasta()

  return (
    <div className="canasta-container">
      {/* Title */}
      <div className="text-center mb-6">
        <h2
          className="text-3xl font-bold tracking-tight mb-2"
          style={{ color: 'var(--label-primary)' }}
        >
          Canasta
        </h2>
        <p className="text-sm" style={{ color: 'var(--label-secondary)' }}>
          Form melds and canastas to score points. First to 5000 wins!
        </p>
      </div>

      {/* Score Board */}
      <ScoreBoard
        playerScore={playerScore}
        aiScore={aiScore}
        playerRed3s={playerRed3s}
        aiRed3s={aiRed3s}
        round={round}
      />

      {/* Turn Indicator */}
      <div
        className={`canasta-turn-indicator ${turn === 'player' ? 'active' : ''}`}
        style={{ marginTop: '16px' }}
      >
        {turn === 'player' ? (
          <>
            Your Turn - {phase === 'draw' ? 'Draw cards' : 'Meld or Discard'}
          </>
        ) : (
          'AI is thinking...'
        )}
      </div>

      {/* AI Section */}
      <div style={{ marginTop: '20px' }}>
        <Hand cards={aiHand} title="AI Hand" faceDown />
        {aiMelds.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div className="canasta-hand-title">AI Melds</div>
            <div className="canasta-melds">
              {aiMelds.map((meld) => (
                <Meld key={meld.id} meld={meld} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Center Area - Piles */}
      <div className="canasta-center" style={{ marginTop: '20px' }}>
        <DrawPile
          count={deckCount}
          onDraw={drawFromDeck}
          disabled={turn !== 'player' || phase !== 'draw'}
        />
        <DiscardPile
          cards={discardPile}
          onPickUp={pickUpDiscardPile}
          disabled={turn !== 'player' || phase !== 'draw' || !canPickUp}
          frozen={frozen}
        />
      </div>

      {/* Player Section */}
      <div style={{ marginTop: '20px' }}>
        {playerMelds.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div className="canasta-hand-title">Your Melds</div>
            <div className="canasta-melds">
              {playerMelds.map((meld) => (
                <Meld
                  key={meld.id}
                  meld={meld}
                  canAdd={selectedCards.length > 0 && turn === 'player'}
                  onAddCards={() => addToMeld(meld.id)}
                />
              ))}
            </div>
          </div>
        )}
        <Hand
          cards={playerHand}
          selectedCards={selectedCards}
          onCardClick={turn === 'player' ? toggleCardSelection : undefined}
          title="Your Hand"
        />
      </div>

      {/* Controls */}
      <div className="canasta-controls" style={{ marginTop: '20px' }}>
        <button
          onClick={clearSelection}
          disabled={selectedCards.length === 0}
          className="canasta-btn"
        >
          Clear Selection
        </button>
        <button
          onClick={formMeld}
          disabled={!canFormMeld || turn !== 'player'}
          className="canasta-btn canasta-btn-primary"
        >
          Form Meld ({selectedCards.length} cards)
        </button>
        <button
          onClick={discardCard}
          disabled={!canDiscard || turn !== 'player'}
          className="canasta-btn canasta-btn-warning"
        >
          Discard
        </button>
        <button
          onClick={goOut}
          disabled={!canGoOut || turn !== 'player'}
          className="canasta-btn canasta-btn-success"
        >
          Go Out
        </button>
        <button onClick={resetGame} className="canasta-btn canasta-btn-danger">
          New Game
        </button>
      </div>

      {/* Help Text */}
      <div
        style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: 'var(--fill-tertiary)',
          borderRadius: '8px',
          fontSize: '13px',
          color: 'var(--label-secondary)',
        }}
      >
        <strong>How to Play:</strong>
        <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
          <li>Draw 2 cards or take the discard pile</li>
          <li>Form melds of 3+ cards of the same rank</li>
          <li>A canasta is a meld of 7+ cards (500 pts natural, 300 pts mixed)</li>
          <li>Wild cards (2s and Jokers) can substitute for any card</li>
          <li>Discard 1 card to end your turn</li>
          <li>Go out when you have a canasta and can meld/discard all cards</li>
        </ul>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="canasta-modal">
          <div className="canasta-modal-content">
            <div className="canasta-modal-title">
              {winner === 'player' ? '🎉 You Win!' : '😔 AI Wins'}
            </div>
            <div className="canasta-modal-message">Round {round} Complete</div>
            <div className="canasta-modal-score">
              {playerScore} - {aiScore}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={newRound} className="canasta-btn canasta-btn-primary">
                Next Round
              </button>
              <button onClick={resetGame} className="canasta-btn">
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {message && <Toast message={message} />}

      {/* Confetti */}
      {gameOver && winner === 'player' && <Confetti />}
    </div>
  )
}
