export default function GameControls({
  vsAI,
  onModeChange,
  onUndo,
  onReset,
  canUndo,
  gameOver,
}) {
  return (
    <div className="game-controls-wrapper">
      <div className="mode-toggle">
        <button
          onClick={() => onModeChange(true)}
          className={vsAI ? 'btn-primary' : 'btn-ghost'}
          title="Play against the computer"
        >
          🤖 vs AI
        </button>
        <button
          onClick={() => onModeChange(false)}
          className={!vsAI ? 'btn-primary' : 'btn-ghost'}
          title="Play against another person on this device"
        >
          🧑‍🤝‍🧑 2 Player
        </button>
      </div>
      <div className="game-controls">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="control-btn undo-btn"
          title="Undo last move"
        >
          ↶ Undo
        </button>
        <button
          onClick={onReset}
          className="control-btn reset-btn"
          title="Start a new game"
        >
          {gameOver ? '🔄 Play Again' : '🔄 New Game'}
        </button>
      </div>
    </div>
  )
}
