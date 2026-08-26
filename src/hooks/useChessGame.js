import { useState, useCallback, useEffect } from 'react'
import { initializeBoard, isValidMove, makeMove, isCheck, isCheckmate, isStalemate, getValidMoves } from '../utils/chessRules'
import { getAIMove } from '../utils/chessAI'

const AI_COLOR = 'black'
const AI_THINK_DELAY = 500

export function useChessGame() {
  const [board, setBoard] = useState(() => initializeBoard())
  const [turn, setTurn] = useState('white')
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [moveHistory, setMoveHistory] = useState([])
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] })
  const [gameStatus, setGameStatus] = useState('active')
  const [vsAI, setVsAI] = useState(true)

  const isAIThinking =
    vsAI && turn === AI_COLOR && gameStatus !== 'checkmate' && gameStatus !== 'stalemate'

  const updateGameStatus = useCallback((newBoard, newTurn) => {
    if (isCheckmate(newBoard, newTurn)) {
      setGameStatus('checkmate')
    } else if (isStalemate(newBoard, newTurn)) {
      setGameStatus('stalemate')
    } else if (isCheck(newBoard, newTurn)) {
      setGameStatus('check')
    } else {
      setGameStatus('active')
    }
  }, [])

  const validMoves = selectedSquare
    ? getValidMoves(board, selectedSquare.row, selectedSquare.col, turn)
    : []

  const selectSquare = useCallback(
    (square) => {
      if (gameStatus === 'checkmate' || gameStatus === 'stalemate') return
      if (vsAI && turn === AI_COLOR) return

      const piece = board[square.row][square.col]

      // If clicking the same square, deselect
      if (
        selectedSquare &&
        selectedSquare.row === square.row &&
        selectedSquare.col === square.col
      ) {
        setSelectedSquare(null)
        return
      }

      // If clicking a piece of the current player, select it
      if (piece && piece.color === turn) {
        setSelectedSquare(square)
      } else if (!piece) {
        // If clicking empty square, deselect
        setSelectedSquare(null)
      }
    },
    [board, selectedSquare, turn, gameStatus, vsAI]
  )

  const makeGameMove = useCallback(
    (toSquare) => {
      if (!selectedSquare) return

      const fromSquare = selectedSquare

      if (!isValidMove(board, fromSquare, toSquare, turn)) {
        return
      }

      const { newBoard, capturedPiece, notation } = makeMove(
        board,
        fromSquare,
        toSquare,
        turn
      )

      setBoard(newBoard)
      setSelectedSquare(null)

      // Update captured pieces
      if (capturedPiece) {
        setCapturedPieces((prev) => ({
          ...prev,
          [turn]: [...prev[turn], capturedPiece],
        }))
      }

      // Update move history
      setMoveHistory((prev) => [...prev, { from: fromSquare, to: toSquare, notation }])

      // Switch turn
      const newTurn = turn === 'white' ? 'black' : 'white'
      setTurn(newTurn)

      // Update game status
      updateGameStatus(newBoard, newTurn)
    },
    [board, selectedSquare, turn, updateGameStatus]
  )

  // Let the AI reply once it's the AI's turn.
  useEffect(() => {
    if (!isAIThinking) return

    const id = setTimeout(() => {
      const aiMove = getAIMove(board, AI_COLOR)
      if (!aiMove) return

      const { newBoard, capturedPiece, notation } = makeMove(board, aiMove.from, aiMove.to)
      setBoard(newBoard)

      if (capturedPiece) {
        setCapturedPieces((prev) => ({
          ...prev,
          [AI_COLOR]: [...prev[AI_COLOR], capturedPiece],
        }))
      }

      setMoveHistory((prev) => [...prev, { from: aiMove.from, to: aiMove.to, notation }])

      const newTurn = AI_COLOR === 'white' ? 'black' : 'white'
      setTurn(newTurn)
      updateGameStatus(newBoard, newTurn)
    }, AI_THINK_DELAY)

    return () => clearTimeout(id)
  }, [isAIThinking, board, updateGameStatus])

  const undoMove = useCallback(() => {
    if (moveHistory.length === 0) return

    // Reset to initial board and replay all moves except the last one
    let newBoard = initializeBoard()
    let newCapturedPieces = { white: [], black: [] }
    let newTurn = 'white'

    // Remove the last move, then replay everything before it from scratch.
    const newHistory = moveHistory.slice(0, -1)
    setMoveHistory(newHistory)

    for (const move of newHistory) {
      const fromSquare = move.from
      const toSquare = move.to
      const { newBoard: updatedBoard, capturedPiece } = makeMove(
        newBoard,
        fromSquare,
        toSquare,
        newTurn
      )
      newBoard = updatedBoard
      if (capturedPiece) {
        newCapturedPieces[newTurn].push(capturedPiece)
      }
      newTurn = newTurn === 'white' ? 'black' : 'white'
    }

    setBoard(newBoard)
    setCapturedPieces(newCapturedPieces)
    setTurn(newTurn)
    setSelectedSquare(null)
    updateGameStatus(newBoard, newTurn)
  }, [moveHistory, updateGameStatus])

  const resetGame = useCallback(() => {
    setBoard(initializeBoard())
    setTurn('white')
    setSelectedSquare(null)
    setMoveHistory([])
    setCapturedPieces({ white: [], black: [] })
    setGameStatus('active')
  }, [])

  const changeGameMode = useCallback(
    (nextVsAI) => {
      setVsAI(nextVsAI)
      resetGame()
    },
    [resetGame]
  )

  return {
    board,
    turn,
    gameStatus,
    selectedSquare,
    validMoves,
    moveHistory,
    capturedPieces,
    vsAI,
    isAIThinking,
    aiColor: AI_COLOR,
    selectSquare,
    makeMove: makeGameMove,
    undoMove,
    resetGame,
    changeGameMode,
  }
}
