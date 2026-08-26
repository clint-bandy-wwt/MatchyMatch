export default function GameStatus({ turn, gameStatus, moveCount, isAIThinking }) {
  const getStatusMessage = () => {
    if (gameStatus === 'checkmate') {
      const winner = turn === 'white' ? 'Black' : 'White'
      return `${winner} wins!`
    }
    if (gameStatus === 'stalemate') {
      return 'Draw - Stalemate'
    }
    if (isAIThinking) {
      return 'AI is thinking...'
    }
    if (gameStatus === 'check') {
      return `${turn.charAt(0).toUpperCase() + turn.slice(1)} in check!`
    }
    return `${turn.charAt(0).toUpperCase() + turn.slice(1)} to move`
  }

  const getStatusEmoji = () => {
    if (gameStatus === 'checkmate') return '🏆'
    if (gameStatus === 'stalemate') return '🤝'
    if (isAIThinking) return '🤖'
    if (gameStatus === 'check') return '⚠️'
    return '♟️'
  }

  return (
    <div className="game-status">
      <div className="status-header">
        <span className="status-emoji">{getStatusEmoji()}</span>
        <span className="status-text">{getStatusMessage()}</span>
      </div>
      <div className="move-counter">Move {Math.ceil(moveCount / 2)}</div>
    </div>
  )
}
