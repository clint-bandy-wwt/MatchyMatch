import { useState, useEffect } from 'react'
import Board from './Board'
import GameStatus from './GameStatus'
import GameControls from './GameControls'
import CapturedPieces from './CapturedPieces'
import MoveHistory from './MoveHistory'
import { useChessGame } from '../../hooks/useChessGame'
import Toast from '../Toast'
import Confetti from '../Confetti'
import './chess.css'

export default function ChessBoard() {
  const {
    board,
    turn,
    gameStatus,
    selectedSquare,
    validMoves,
    moveHistory,
    capturedPieces,
    vsAI,
    isAIThinking,
    selectSquare,
    makeMove,
    undoMove,
    resetGame,
    changeGameMode,
  } = useChessGame()

  const [message, setMessage] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => {
      if (gameStatus === 'checkmate') {
        const winner = turn === 'white' ? 'Black' : 'White'
        setMessage(`🎉 ${winner} wins by checkmate!`)
        setShowConfetti(true)
      } else if (gameStatus === 'stalemate') {
        setMessage('🤝 Draw - Stalemate!')
      } else if (gameStatus === 'check') {
        setMessage('⚠️ Check!')
      }
    }, 0)
    return () => clearTimeout(id)
  }, [gameStatus, turn])

  const handleSquareClick = (row, col) => {
    if (gameStatus === 'checkmate' || gameStatus === 'stalemate') return
    if (isAIThinking) return

    const square = { row, col }

    // Check if clicking on a valid move destination
    const isValidMove = validMoves.some(
      (move) => move.row === row && move.col === col
    )

    if (isValidMove) {
      makeMove(square)
      setMessage('')
    } else {
      selectSquare(square)
    }
  }

  const handleUndo = () => {
    undoMove()
    setMessage('')
    setShowConfetti(false)
  }

  const handleReset = () => {
    resetGame()
    setMessage('')
    setShowConfetti(false)
  }

  const handleModeChange = (nextVsAI) => {
    changeGameMode(nextVsAI)
    setMessage('')
    setShowConfetti(false)
  }

  return (
    <div className="chess-container">
      <div className="chess-main">
        {/* Board */}
        <div className="chess-board-wrapper">
          <Board
            board={board}
            selectedSquare={selectedSquare}
            validMoves={validMoves}
            onSquareClick={handleSquareClick}
          />
        </div>

        {/* Right Panel */}
        <div className="chess-panel">
          {/* Status */}
          <GameStatus
            turn={turn}
            gameStatus={gameStatus}
            moveCount={moveHistory.length}
            isAIThinking={isAIThinking}
          />

          {/* Captured Pieces */}
          <CapturedPieces capturedPieces={capturedPieces} />

          {/* Controls */}
          <GameControls
            vsAI={vsAI}
            onModeChange={handleModeChange}
            onUndo={handleUndo}
            onReset={handleReset}
            canUndo={moveHistory.length > 0}
            gameOver={gameStatus === 'checkmate' || gameStatus === 'stalemate'}
          />

          {/* Move History */}
          <MoveHistory moves={moveHistory} />
        </div>
      </div>

      {/* Toast Message */}
      {message && <Toast message={message} />}

      {/* Confetti */}
      {showConfetti && <Confetti />}
    </div>
  )
}
