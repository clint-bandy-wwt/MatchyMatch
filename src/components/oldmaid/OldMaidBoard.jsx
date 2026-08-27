// src/components/oldmaid/OldMaidBoard.jsx
// src/components/oldmaid/OldMaidBoard.jsx
import { useOldMaid } from '../../hooks/useOldMaid';
import { getCardDisplay, getSuitColor } from '../../data/oldMaidData';

// ── Card Component ────────────────────────────────────────────────

function Card({ card, onClick, isBack = false, disabled = false, isHoverable = false }) {
  const suitColor = card ? getSuitColor(card.suit) : 'black';
  
  if (isBack) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
          isHoverable && !disabled ? 'cursor-pointer hover:scale-105' : 'cursor-default'
        }`}
        style={{
          width: 70,
          height: 100,
          borderRadius: 8,
          background: 'linear-gradient(145deg, #4a5568, #2d3748)',
          border: '2px solid #1a202c',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '80%',
            height: '85%',
            borderRadius: 4,
            border: '2px solid #4a5568',
            background: 'repeating-linear-gradient(45deg, #2d3748, #2d3748 10px, #4a5568 10px, #4a5568 20px)',
          }}
        />
      </button>
    );
  }
  
  return (
    <div
      className="relative"
      style={{
        width: 70,
        height: 100,
        borderRadius: 8,
        background: 'white',
        border: '2px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 4px',
        color: suitColor,
        fontWeight: 700,
        fontSize: '1.1rem',
      }}
    >
      <div style={{ fontSize: '0.9rem' }}>{getCardDisplay(card)}</div>
      <div style={{ fontSize: '1.5rem' }}>{card.rank}</div>
      <div style={{ fontSize: '0.9rem', transform: 'rotate(180deg)' }}>
        {getCardDisplay(card)}
      </div>
    </div>
  );
}

// ── Pair Display ──────────────────────────────────────────────────

function PairDisplay({ pairs, label }) {
  if (pairs.length === 0) {
    return null;
  }
  
  return (
    <div className="flex flex-col gap-2">
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--label-tertiary)',
        }}
      >
        {label} ({pairs.length} {pairs.length === 1 ? 'pair' : 'pairs'})
      </div>
      <div className="flex flex-wrap gap-2">
        {pairs.map((pair, index) => (
          <div key={index} className="flex gap-1">
            <Card card={pair[0]} />
            <Card card={pair[1]} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Game Over Screen ──────────────────────────────────────────────

function GameOverScreen({ gameState, unmatchedQueen, onPlayAgain }) {
  const isWin = gameState === 'won';
  
  return (
    <div
      className="spring-pop flex flex-col items-center gap-6 p-8 rounded-3xl w-full max-w-md mx-auto"
      style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xl)' }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 22,
          background: isWin
            ? 'linear-gradient(145deg, #34c759, #30d158)'
            : 'linear-gradient(145deg, #ff3b30, #ff453a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          boxShadow: isWin
            ? '0 8px 24px rgba(52,199,89,0.35)'
            : '0 8px 24px rgba(255,59,48,0.35)',
        }}
      >
        {isWin ? '🎉' : '😅'}
      </div>
      
      <div className="flex flex-col items-center gap-1 text-center">
        <h2
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--label-primary)',
          }}
        >
          {isWin ? 'You Won!' : 'You Lost!'}
        </h2>
        <p style={{ fontSize: '0.95rem', color: 'var(--label-tertiary)' }}>
          {isWin
            ? 'Your opponent was left with the Old Maid!'
            : 'You were left holding the Old Maid!'}
        </p>
      </div>
      
      {/* UX improvement: Show the unmatched queen */}
      {unmatchedQueen && (
        <div className="flex flex-col items-center gap-2">
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--label-tertiary)',
            }}
          >
            The Old Maid
          </div>
          <Card card={unmatchedQueen} />
        </div>
      )}
      
      <button onClick={onPlayAgain} className="btn-primary w-full">
        Play Again
      </button>
    </div>
  );
}

// ── Main Board ────────────────────────────────────────────────────

export default function OldMaidBoard() {
  const {
    playerHand,
    opponentHand,
    playerPairs,
    opponentPairs,
    currentTurn,
    gameState,
    message,
    isAIThinking,
    unmatchedQueen,
    handlePlayerDraw,
    resetGame,
  } = useOldMaid();

  if (gameState !== 'playing') {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto">
        <GameOverScreen gameState={gameState} unmatchedQueen={unmatchedQueen} onPlayAgain={resetGame} />
        
        {/* Show final pairs */}
        <div className="w-full flex flex-col gap-6">
          <PairDisplay pairs={playerPairs} label="Your Pairs" />
          <PairDisplay pairs={opponentPairs} label="Opponent's Pairs" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto">
      {/* Title */}
      <div className="text-center">
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--label-primary)',
            marginBottom: '0.5rem',
          }}
        >
          Old Maid
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--label-tertiary)' }}>
          Draw cards from your opponent and avoid being left with the Old Maid!
        </p>
      </div>

      {/* Status message */}
      <div
        className="px-6 py-3 rounded-2xl text-center"
        style={{
          background: currentTurn === 'player' && !isAIThinking
            ? 'linear-gradient(145deg, rgba(0,122,255,0.15), rgba(0,122,255,0.08))'
            : 'var(--fill-tertiary)',
          border: currentTurn === 'player' && !isAIThinking
            ? '1.5px solid rgba(0,122,255,0.3)'
            : 'none',
          fontSize: '0.95rem',
          fontWeight: 600,
          color: 'var(--label-primary)',
        }}
      >
        {message}
      </div>

      {/* Opponent's hand */}
      <div className="w-full flex flex-col gap-3">
        <div
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--label-tertiary)',
          }}
        >
          Opponent's Hand ({opponentHand.length} {opponentHand.length === 1 ? 'card' : 'cards'})
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {opponentHand.map((_, index) => (
            <Card
              key={index}
              isBack={true}
              onClick={() => {
                if (currentTurn === 'player' && !isAIThinking) {
                  handlePlayerDraw(index);
                }
              }}
              disabled={currentTurn !== 'player' || isAIThinking}
              isHoverable={currentTurn === 'player' && !isAIThinking}
            />
          ))}
        </div>
      </div>

      {/* Player's hand */}
      <div className="w-full flex flex-col gap-3">
        <div
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--label-tertiary)',
          }}
        >
          Your Hand ({playerHand.length} {playerHand.length === 1 ? 'card' : 'cards'})
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {playerHand.map((card) => (
            <Card key={card.id} card={card} />
          ))}
        </div>
      </div>

      {/* Pairs section */}
      <div className="w-full flex flex-col gap-6 mt-4">
        <PairDisplay pairs={playerPairs} label="Your Pairs" />
        <PairDisplay pairs={opponentPairs} label="Opponent's Pairs" />
      </div>

      {/* New game button */}
      <button onClick={resetGame} className="btn-ghost mt-4">
        🔀 New Game
      </button>
    </div>
  );
}
