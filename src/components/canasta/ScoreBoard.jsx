// src/components/canasta/ScoreBoard.jsx
export default function ScoreBoard({ playerScore, aiScore, playerRed3s, aiRed3s, round }) {
  return (
    <div className="canasta-score">
      <div className="canasta-score-item">
        <div className="canasta-score-label">Round</div>
        <div className="canasta-score-value">{round}</div>
      </div>
      <div className="canasta-score-item">
        <div className="canasta-score-label">Your Score</div>
        <div className="canasta-score-value" style={{ color: '#0a84ff' }}>
          {playerScore}
        </div>
        {playerRed3s > 0 && (
          <div style={{ fontSize: '12px', color: 'var(--label-tertiary)' }}>
            Red 3s: {playerRed3s}
          </div>
        )}
      </div>
      <div className="canasta-score-item">
        <div className="canasta-score-label">AI Score</div>
        <div className="canasta-score-value" style={{ color: '#ff3b30' }}>
          {aiScore}
        </div>
        {aiRed3s > 0 && (
          <div style={{ fontSize: '12px', color: 'var(--label-tertiary)' }}>
            Red 3s: {aiRed3s}
          </div>
        )}
      </div>
    </div>
  )
}
