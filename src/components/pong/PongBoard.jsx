import { useState, useEffect, useRef, useCallback } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 400
const PADDLE_WIDTH = 12
const PADDLE_HEIGHT = 80
const BALL_RADIUS = 7
const BALL_SPEED = 5
const PADDLE_SPEED = 6
const AI_SPEED = 4

const SOUNDS = {
  paddle: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
  wall: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
  score: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
}

function initState() {
  return {
    ballX: CANVAS_WIDTH / 2,
    ballY: CANVAS_HEIGHT / 2,
    ballVelX: BALL_SPEED,
    ballVelY: BALL_SPEED,
    leftPaddleY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    rightPaddleY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    leftScore: 0,
    rightScore: 0,
    status: 'idle', // 'idle' | 'playing' | 'paused' | 'won'
    gameMode: 'ai', // 'ai' or '2player'
  }
}

function drawGame(ctx) {
  const W = CANVAS_WIDTH
  const H = CANVAS_HEIGHT

  // Background - dark green
  ctx.fillStyle = '#0a3d0a'
  ctx.fillRect(0, 0, W, H)

  // Center line (dashed) - light green
  ctx.strokeStyle = 'rgba(100, 200, 100, 0.3)'
  ctx.setLineDash([8, 8])
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(W / 2, 0)
  ctx.lineTo(W / 2, H)
  ctx.stroke()
  ctx.setLineDash([])
}

function drawPaddles(ctx, state) {
  // Paddles - bright green
  ctx.fillStyle = '#4ade80'

  // Left paddle
  ctx.fillRect(20, state.leftPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT)

  // Right paddle
  ctx.fillRect(CANVAS_WIDTH - 20 - PADDLE_WIDTH, state.rightPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT)
}

function drawBall(ctx, state) {
  // Ball glow - darker green
  ctx.fillStyle = 'rgba(34, 197, 94, 0.3)'
  ctx.beginPath()
  ctx.arc(state.ballX, state.ballY, BALL_RADIUS + 4, 0, Math.PI * 2)
  ctx.fill()

  // Ball core - bright lime green
  ctx.fillStyle = '#86efac'
  ctx.beginPath()
  ctx.arc(state.ballX, state.ballY, BALL_RADIUS, 0, Math.PI * 2)
  ctx.fill()
}

function drawScore(ctx, state) {
  // Score text - bright green
  ctx.fillStyle = '#86efac'
  ctx.font = 'bold 48px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  // Left score
  ctx.fillText(state.leftScore, CANVAS_WIDTH / 4, 20)

  // Right score
  ctx.fillText(state.rightScore, (CANVAS_WIDTH * 3) / 4, 20)
}

function ScoreBadge({ label, value }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.2))', border: '1px solid rgba(74, 222, 128, 0.5)' }}>
      <span style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#86efac' }}>
        {value}
      </span>
      <span style={{ fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#4ade80' }}>
        {label}
      </span>
    </div>
  )
}

export default function PongBoard() {
  const canvasRef = useRef(null)
  const tickRef = useRef(null)
  const keysRef = useRef({})

  const [renderState, setRenderState] = useState(initState)
  const stateRef = useRef(renderState)
  const [gameMode, setGameMode] = useState('ai')

  // ── Draw whenever renderState changes ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    drawGame(ctx)
    drawPaddles(ctx, renderState)
    drawBall(ctx, renderState)
    drawScore(ctx, renderState)
  }, [renderState])

  // ── Game logic tick ─────────────────────────────────────────────
  const tick = useCallback(() => {
    const s = stateRef.current
    if (s.status !== 'playing') return

    let newState = { ...s }

    // Update ball position
    newState.ballX += newState.ballVelX
    newState.ballY += newState.ballVelY

    // Ball collision with top/bottom walls
    if (newState.ballY - BALL_RADIUS < 0) {
      newState.ballY = BALL_RADIUS
      newState.ballVelY = -newState.ballVelY
    }
    if (newState.ballY + BALL_RADIUS > CANVAS_HEIGHT) {
      newState.ballY = CANVAS_HEIGHT - BALL_RADIUS
      newState.ballVelY = -newState.ballVelY
    }

    // Ball collision with left paddle
    if (
      newState.ballX - BALL_RADIUS < 20 + PADDLE_WIDTH &&
      newState.ballY > newState.leftPaddleY &&
      newState.ballY < newState.leftPaddleY + PADDLE_HEIGHT
    ) {
      newState.ballX = 20 + PADDLE_WIDTH + BALL_RADIUS
      newState.ballVelX = -newState.ballVelX
      // Add angle based on where ball hits paddle
      const hitPos = (newState.ballY - (newState.leftPaddleY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2)
      newState.ballVelY += hitPos * 3
    }

    // Ball collision with right paddle
    if (
      newState.ballX + BALL_RADIUS > CANVAS_WIDTH - 20 - PADDLE_WIDTH &&
      newState.ballY > newState.rightPaddleY &&
      newState.ballY < newState.rightPaddleY + PADDLE_HEIGHT
    ) {
      newState.ballX = CANVAS_WIDTH - 20 - PADDLE_WIDTH - BALL_RADIUS
      newState.ballVelX = -newState.ballVelX
      // Add angle based on where ball hits paddle
      const hitPos = (newState.ballY - (newState.rightPaddleY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2)
      newState.ballVelY += hitPos * 3
    }

    // Ball out of bounds (left side)
    if (newState.ballX < 0) {
      newState.rightScore += 1
      newState.ballX = CANVAS_WIDTH / 2
      newState.ballY = CANVAS_HEIGHT / 2
      newState.ballVelX = BALL_SPEED
      newState.ballVelY = (Math.random() - 0.5) * BALL_SPEED
    }

    // Ball out of bounds (right side)
    if (newState.ballX > CANVAS_WIDTH) {
      newState.leftScore += 1
      newState.ballX = CANVAS_WIDTH / 2
      newState.ballY = CANVAS_HEIGHT / 2
      newState.ballVelX = -BALL_SPEED
      newState.ballVelY = (Math.random() - 0.5) * BALL_SPEED
    }

    // Left paddle (player)
    if (keysRef.current['ArrowUp'] || keysRef.current['w'] || keysRef.current['W']) {
      newState.leftPaddleY = Math.max(0, newState.leftPaddleY - PADDLE_SPEED)
    }
    if (keysRef.current['ArrowDown'] || keysRef.current['s'] || keysRef.current['S']) {
      newState.leftPaddleY = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newState.leftPaddleY + PADDLE_SPEED)
    }

    // Right paddle (AI or second player)
    if (gameMode === 'ai') {
      // Simple AI: follow the ball
      const rightPaddleCenter = newState.rightPaddleY + PADDLE_HEIGHT / 2
      if (rightPaddleCenter < newState.ballY - 15) {
        newState.rightPaddleY = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newState.rightPaddleY + AI_SPEED)
      } else if (rightPaddleCenter > newState.ballY + 15) {
        newState.rightPaddleY = Math.max(0, newState.rightPaddleY - AI_SPEED)
      }
    } else {
      // Two player mode
      if (keysRef.current['ArrowUp'] || keysRef.current['i'] || keysRef.current['I']) {
        newState.rightPaddleY = Math.max(0, newState.rightPaddleY - PADDLE_SPEED)
      }
      if (keysRef.current['ArrowDown'] || keysRef.current['k'] || keysRef.current['K']) {
        newState.rightPaddleY = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, newState.rightPaddleY + PADDLE_SPEED)
      }
    }

    // Check win condition (first to 10)
    if (newState.leftScore >= 10) {
      newState.status = 'won'
      newState.winner = 'left'
      clearInterval(tickRef.current)
    } else if (newState.rightScore >= 10) {
      newState.status = 'won'
      newState.winner = 'right'
      clearInterval(tickRef.current)
    }

    stateRef.current = newState
    setRenderState({ ...newState })
  }, [gameMode])

  // ── Start / restart ─────────────────────────────────────────────
  const startGame = useCallback(
    (mode = gameMode) => {
      clearInterval(tickRef.current)
      const fresh = { ...initState(), status: 'playing', gameMode: mode }
      stateRef.current = fresh
      setRenderState(fresh)
      setGameMode(mode)
      tickRef.current = setInterval(tick, 1000 / 60) // 60 FPS
    },
    [gameMode, tick]
  )

  // ── Pause / resume ──────────────────────────────────────────────
  const togglePause = useCallback(() => {
    const s = stateRef.current
    if (s.status === 'playing') {
      clearInterval(tickRef.current)
      const paused = { ...s, status: 'paused' }
      stateRef.current = paused
      setRenderState(paused)
    } else if (s.status === 'paused') {
      const resumed = { ...s, status: 'playing' }
      stateRef.current = resumed
      setRenderState(resumed)
      tickRef.current = setInterval(tick, 1000 / 60)
    }
  }, [tick])

  // ── Keyboard controls ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const s = stateRef.current

      // Space = start / pause / resume
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (s.status === 'idle' || s.status === 'won') {
          startGame()
        } else if (s.status === 'playing' || s.status === 'paused') {
          togglePause()
        }
        return
      }

      keysRef.current[e.key] = true
    }

    const handleKeyUp = (e) => {
      keysRef.current[e.key] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [startGame, togglePause])

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => () => clearInterval(tickRef.current), [])

  const status = renderState.status
  const isActive = status === 'playing' || status === 'paused'

  // ── Overlay content ─────────────────────────────────────────────
  const overlayContent = () => {
    if (status === 'idle') {
      return (
        <div className="flex flex-col items-center gap-4">
          <div style={{ fontSize: 48 }}>🏓</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#86efac' }}>
            Pong
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#86efac', textAlign: 'center', maxWidth: 240, opacity: 0.9 }}>
            Classic paddle game. First to 10 wins!
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={() => startGame('ai')} className="btn-primary" style={{ background: '#4ade80', color: '#0a3d0a', border: 'none' }}>
              Play vs AI
            </button>
            <button onClick={() => startGame('2player')} className="btn-primary" style={{ background: '#4ade80', color: '#0a3d0a', border: 'none' }}>
              2 Player
            </button>
          </div>
          <p style={{ fontSize: '0.7rem', color: '#4ade80', letterSpacing: '-0.01em', textAlign: 'center', opacity: 0.7 }}>
            P1: ↑↓ or W/S · P2: ↑↓ or I/K · Space to pause
          </p>
        </div>
      )
    }
    if (status === 'paused') {
      return (
        <div className="flex flex-col items-center gap-4">
          <div style={{ fontSize: 40 }}>⏸️</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#86efac' }}>
            Paused
          </h2>
          <button onClick={togglePause} className="btn-primary" style={{ background: '#4ade80', color: '#0a3d0a', border: 'none' }}>
            Resume
          </button>
        </div>
      )
    }
    if (status === 'won') {
      const isLeft = renderState.winner === 'left'
      const winnerName = gameMode === 'ai' ? (isLeft ? 'You' : 'AI') : isLeft ? 'Player 1' : 'Player 2'
      return (
        <div className="flex flex-col items-center gap-4">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'linear-gradient(145deg, #4ade80, #22c55e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              boxShadow: '0 8px 24px rgba(74, 222, 128, 0.35)',
            }}
          >
            🏆
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#86efac' }}>
            {winnerName} Wins!
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#4ade80' }}>
            Final Score: <strong style={{ color: '#86efac' }}>{renderState.leftScore} - {renderState.rightScore}</strong>
          </p>
          <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={() => startGame(gameMode)} className="btn-primary" style={{ background: '#4ade80', color: '#0a3d0a', border: 'none' }}>
              Play Again
            </button>
            <button onClick={() => setRenderState({ ...initState() })} className="btn-ghost" style={{ color: '#4ade80' }}>
              Main Menu
            </button>
          </div>
        </div>
      )
    }
    return null
  }

  const overlay = overlayContent()

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-2xl mx-auto">
      {/* Score display */}
      <div className="w-full flex items-center justify-center gap-8">
        <ScoreBadge label={gameMode === 'ai' ? 'You' : 'P1'} value={renderState.leftScore} />
        <div style={{ fontSize: '0.75rem', color: '#4ade80', letterSpacing: '-0.01em' }}>
          {gameMode === 'ai' ? 'vs AI' : 'vs P2'}
        </div>
        <ScoreBadge label={gameMode === 'ai' ? 'AI' : 'P2'} value={renderState.rightScore} />
      </div>

      {/* Canvas + overlay wrapper */}
      <div
        style={{
          position: 'relative',
          width: CANVAS_WIDTH,
          maxWidth: '100%',
          aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}`,
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 0 30px rgba(74, 222, 128, 0.3)',
          border: '2px solid rgba(74, 222, 128, 0.5)',
          touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />

        {/* Overlay for idle / paused / end states */}
        {overlay && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(10, 61, 10, 0.75)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <div
              className="spring-pop flex flex-col items-center gap-4 p-7 rounded-3xl"
              style={{
                background: 'rgba(10, 61, 10, 0.95)',
                boxShadow: '0 8px 32px rgba(74, 222, 128, 0.25)',
                border: '1px solid rgba(74, 222, 128, 0.3)',
                minWidth: 200,
              }}
            >
              {overlay}
            </div>
          </div>
        )}
      </div>

      {/* In-game controls */}
      {isActive && (
        <div className="flex gap-3">
          <button onClick={togglePause} className="btn-ghost" style={{ color: '#4ade80' }}>
            {status === 'paused' ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button onClick={() => startGame(gameMode)} className="btn-ghost" style={{ color: '#4ade80' }}>
            🔄 Restart
          </button>
        </div>
      )}

      <p
        className="text-center"
        style={{ fontSize: '0.75rem', color: '#4ade80', letterSpacing: '-0.01em' }}
      >
        {isActive
          ? gameMode === 'ai'
            ? 'P1: ↑↓ or W/S · Space to pause'
            : 'P1: ↑↓ or W/S · P2: ↑↓ or I/K · Space to pause'
          : 'Press Space or tap Play to start'}
      </p>
    </div>
  )
}
