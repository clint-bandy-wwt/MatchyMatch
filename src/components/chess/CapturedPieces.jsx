// Same solid glyph for both colors as Square.jsx, for consistency — color
// is applied via CSS (.piece-white / .piece-black) rather than switching
// to the hollow "white" code points.
const PIECE_SYMBOLS = {
  pawn: '♟',
  rook: '♜',
  knight: '♞',
  bishop: '♝',
  queen: '♛',
  king: '♚',
}

const PIECE_VALUES = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0,
}

export default function CapturedPieces({ capturedPieces }) {
  const calculateMaterial = (pieces) => {
    return pieces.reduce((sum, piece) => sum + PIECE_VALUES[piece.type], 0)
  }

  const whiteMaterial = calculateMaterial(capturedPieces.white)
  const blackMaterial = calculateMaterial(capturedPieces.black)

  const renderPieces = (pieces) => {
    return pieces.map((piece, idx) => (
      <span key={idx} className={`captured-piece piece-${piece.color}`}>
        {PIECE_SYMBOLS[piece.type]}
      </span>
    ))
  }

  return (
    <div className="captured-pieces">
      <div className="captured-section">
        <div className="captured-label">White captured</div>
        <div className="captured-list">
          {renderPieces(capturedPieces.white, 'white')}
        </div>
        {whiteMaterial > 0 && (
          <div className="material-count">+{whiteMaterial}</div>
        )}
      </div>

      <div className="captured-section">
        <div className="captured-label">Black captured</div>
        <div className="captured-list">
          {renderPieces(capturedPieces.black, 'black')}
        </div>
        {blackMaterial > 0 && (
          <div className="material-count">+{blackMaterial}</div>
        )}
      </div>
    </div>
  )
}
