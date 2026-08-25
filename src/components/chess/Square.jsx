// Both colors use the solid "black" glyph set (rather than the hollow
// "white" code points, U+2654-2659) and are told apart with CSS fill +
// stroke instead (see .piece-white / .piece-black in chess.css). This is
// defensive, not the fix for a specific bug: the hollow set renders fine
// in mainstream fonts, but its font coverage is less universal, so this
// avoids depending on it.
const PIECE_SYMBOLS = {
  pawn: '♟',
  rook: '♜',
  knight: '♞',
  bishop: '♝',
  queen: '♛',
  king: '♚',
}

export default function Square({
  piece,
  isLight,
  isSelected,
  isValidMove,
  onClick,
  row,
  col,
}) {
  const squareClass = [
    'chess-square',
    isLight ? 'light' : 'dark',
    isSelected && 'selected',
    isValidMove && 'valid-move',
  ]
    .filter(Boolean)
    .join(' ')

  const symbol = piece ? PIECE_SYMBOLS[piece.type] : ''

  return (
    <button
      className={squareClass}
      onClick={onClick}
      aria-label={`Square ${String.fromCharCode(97 + col)}${8 - row}`}
    >
      {isValidMove && <div className="move-indicator" />}
      {piece && (
        <span className={`piece piece-${piece.color}`}>{symbol}</span>
      )}
    </button>
  )
}
