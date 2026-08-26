import { getValidMoves, makeMove, isCheck } from './chessRules'

const PIECE_VALUES = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
}

// Look-ahead depth in plies (AI move + this many opponent/AI replies).
const SEARCH_DEPTH = 2

function evaluateBoard(board, forColor) {
  let score = 0
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (!piece) continue
      const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col)
      const value = PIECE_VALUES[piece.type] + (7 - centerDistance) * 2
      score += piece.color === forColor ? value : -value
    }
  }
  return score
}

function getAllMoves(board, color) {
  const moves = []
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (piece && piece.color === color) {
        for (const to of getValidMoves(board, row, col, color)) {
          moves.push({ from: { row, col }, to })
        }
      }
    }
  }
  return moves
}

function minimax(board, color, depth, alpha, beta, aiColor) {
  const maximizing = color === aiColor

  if (depth === 0) return evaluateBoard(board, aiColor)

  const moves = getAllMoves(board, color)
  if (moves.length === 0) {
    if (isCheck(board, color)) return maximizing ? -100000 - depth : 100000 + depth
    return 0
  }

  const opponent = color === 'white' ? 'black' : 'white'
  let best = maximizing ? -Infinity : Infinity

  for (const move of moves) {
    const { newBoard } = makeMove(board, move.from, move.to)
    const score = minimax(newBoard, opponent, depth - 1, alpha, beta, aiColor)

    if (maximizing) {
      best = Math.max(best, score)
      alpha = Math.max(alpha, score)
    } else {
      best = Math.min(best, score)
      beta = Math.min(beta, score)
    }
    if (alpha >= beta) break
  }

  return best
}

// Picks a move for `aiColor`, searching a few plies ahead and breaking ties randomly.
export function getAIMove(board, aiColor, depth = SEARCH_DEPTH) {
  const moves = getAllMoves(board, aiColor)
  if (moves.length === 0) return null

  const opponent = aiColor === 'white' ? 'black' : 'white'
  let bestScore = -Infinity
  let bestMoves = []

  for (const move of moves) {
    const { newBoard } = makeMove(board, move.from, move.to)
    const score = minimax(newBoard, opponent, depth - 1, -Infinity, Infinity, aiColor)

    if (score > bestScore) {
      bestScore = score
      bestMoves = [move]
    } else if (score === bestScore) {
      bestMoves.push(move)
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)]
}
