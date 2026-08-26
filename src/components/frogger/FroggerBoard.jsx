import { useState, useEffect, useRef, useCallback } from 'react'

// Game constants
const COLS = 13
const ROWS = 13
const CELL = 32
const ROAD_START = 3
const ROAD_END = 8
const WATER_START = 9
const WATER_END = 11
const SAFE_ZONE_TOP = 0
const SAFE_ZONE_BOTTOM = 2
const SPAWN_ZONE = 12

// Direction vectors
const DIR = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}

// Obstacle configurations (cars, trucks, logs, turtles)
const OBSTACLE_CONFIGS = [
  // Road obstacles (rows 3-8)
  { row: 3, type: 'car', speed: 2, direction: 1, length: 1 },
  { row: 4, type: 'truck', speed: 1.5, direction: -1, length: 2 },
  { row: 5, type: 'car', speed: 2.5, direction: 1, length: 1 },
  { row: 6, type: 'car', speed: 1.8, direction: -1, length: 1 },
  { row: 7, type: 'car', speed: 2.2, direction: 1, length: 1 },
  { row: 8, type: 'truck', speed: 1.6, direction: -1, length: 2 },
  // Water obstacles (rows 9-11)
  { row: 9, type: 'log', speed: 1.5, direction: 1, length: 2 },
  { row: 10, type: 'turtle', speed: 1.3, direction: -1, length: 2 },
  { row: 11, type: 'log', speed: 1.2, direction: 1, length: 3 },
]

function initState() {
  return {
    frogX: Math.floor(COLS / 2),
    frogY: SPAWN_ZONE,
    score: 0,
    lives: 3,
    status: 'playing',
  }
}

function drawGame(ctx, state, obstacles, dark) {
  const W = COLS * CELL
  const H = ROWS * CELL

  // Clear background
  ctx.fillStyle = dark ? '#1c1c1e' : '#f2f2f7'
  ctx.fillRect(0, 0, W, H)

  // Draw grid
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath()
    ctx.moveTo(x * CELL, 0)
    ctx.lineTo(x * CELL, H)
    ctx.stroke()
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * CELL)
    ctx.lineTo(W, y * CELL)
    ctx.stroke()
  }

  // Draw safe zones (grass)
  ctx.fillStyle = dark ? '#2a4d2a' : '#b3e5b3'
  for (let y = SAFE_ZONE_TOP; y <= SAFE_ZONE_BOTTOM; y++) {
    ctx.fillRect(0, y * CELL, W, CELL)
  }
  ctx.fillRect(0, SPAWN_ZONE * CELL, W, CELL)

  // Draw water
  ctx.fillStyle = dark ? '#1a3a5c' : '#87ceeb'
  for (let y = WATER_START; y <= WATER_END; y++) {
    ctx.fillRect(0, y * CELL, W, CELL)
  }

  // Draw road
  ctx.fillStyle = dark ? '#3a3a3a' : '#999999'
  for (let y = ROAD_START; y <= ROAD_END; y++) {
    ctx.fillRect(0, y * CELL, W, CELL)
  }

  // Draw obstacles
  obstacles.forEach((obs) => {
    const y = obs.row * CELL
    const x = (obs.x % (COLS + obs.length + 2)) * CELL
    const w = obs.length * CELL
    const h = CELL

    if (obs.type === 'car') {
      ctx.fillStyle = dark ? '#ff4444' : '#ff2222'
      ctx.fillRect(x, y + h * 0.2, w, h * 0.6)
    } else if (obs.type === 'truck') {
      ctx.fillStyle = dark ? '#0044ff' : '#0022ff'
      ctx.fillRect(x, y + h * 0.15, w, h * 0.7)
    } else if (obs.type === 'log') {
      ctx.fillStyle = dark ? '#664422' : '#8b6914'
      ctx.fillRect(x, y + h * 0.25, w, h * 0.5)
    } else if (obs.type === 'turtle') {
      ctx.fillStyle = dark ? '#228844' : '#22aa44'
      for (let i = 0; i < obs.length; i++) {
        ctx.fillRect(x + i * CELL + CELL * 0.15, y + h * 0.2, CELL * 0.7, CELL * 0.6)
      }
    }
  })

  // Draw frog
  const fx = state.frogX * CELL
  const fy = state.frogY * CELL
  ctx.fillStyle = dark ? '#22dd44' : '#00cc00'
  ctx.beginPath()
  ctx.arc(fx + CELL / 2, fy + CELL / 2, CELL * 0.35, 0, Math.PI * 2)
  ctx.fill()
}

export default function FroggerBoard() {
  const canvasRef = useRef(null)
  const [renderState, setRenderState] = useState(initState)
  const stateRef = useRef(renderState)
  const obstaclesRef = useRef([])
  const animationFrameRef = useRef(null)
  const [dark, setDark] = useState(false)
  const [best, setBest] = useState(0)

  // Initialize obstacles with proper starting positions based on direction
  useEffect(() => {
    obstaclesRef.current = OBSTACLE_CONFIGS.map((c, index) => {
      // Stagger starting positions so obstacles are distributed across the screen
      // Objects going right start from left edge, objects going left start from right edge
      let startX
      if (c.direction === 1) {
        // Moving right: start off left edge, staggered
        startX = -c.length + (index * 3)
      } else {
        // Moving left: start off right edge, staggered
        startX = COLS + (index * 3)
      }
      
      return {
        ...c,
        x: startX,
      }
    })
  }, [])

  // Render game whenever state changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawGame(canvas.getContext('2d'), renderState, obstaclesRef.current, dark)
  }, [renderState, dark])

  // Update obstacle positions
  const updateObstacles = useCallback((dt) => {
    obstaclesRef.current.forEach((o) => {
      o.x += (o.direction * o.speed * dt) / 1000
      
      // Wrap obstacles around when they go off screen
      if (o.direction === 1 && o.x > COLS + o.length + 2) {
        o.x = -o.length
      } else if (o.direction === -1 && o.x < -o.length - 2) {
        o.x = COLS + o.length
      }
    })
  }, [])

  // Check collisions with obstacles and water
  const checkCollision = useCallback(() => {
    const s = stateRef.current

    // Check if in water zone (and not on a log/turtle)
    if (s.frogY >= WATER_START && s.frogY <= WATER_END && s.frogY !== SPAWN_ZONE) {
      let onPlatform = false
      for (const obs of obstaclesRef.current) {
        if (obs.row === s.frogY) {
          const ox = (obs.x % (COLS + obs.length + 2)) * CELL
          const ox2 = ox + obs.length * CELL
          const fx = s.frogX * CELL
          const fx2 = fx + CELL

          if (fx < ox2 && fx2 > ox) {
            onPlatform = true
            // Move frog with the platform
            s.frogX = Math.max(0, Math.min(COLS - 1, s.frogX + (obs.direction * obs.speed) / 120))
            break
          }
        }
      }
      if (!onPlatform) return 'lost'
    }

    // Check collision with road obstacles (cars/trucks)
    if (s.frogY >= ROAD_START && s.frogY <= ROAD_END) {
      for (const obs of obstaclesRef.current) {
        if (obs.row === s.frogY) {
          const ox = (obs.x % (COLS + obs.length + 2)) * CELL
          const ox2 = ox + obs.length * CELL
          const fx = s.frogX * CELL
          const fx2 = fx + CELL

          if (fx < ox2 && fx2 > ox) return 'lost'
        }
      }
    }

    // Check if reached safe zone
    if (s.frogY <= SAFE_ZONE_BOTTOM) return 'won'

    return null
  }, [])

  // Main game loop
  useEffect(() => {
    let lastTime = Date.now()

    const animate = () => {
      const now = Date.now()
      const dt = now - lastTime
      lastTime = now

      if (stateRef.current.status === 'playing') {
        updateObstacles(dt)
        const collision = checkCollision()

        if (collision === 'won') {
          const newState = {
            ...stateRef.current,
            status: 'won',
            score: stateRef.current.score + 100,
          }
          stateRef.current = newState
          setRenderState(newState)
          setBest((b) => Math.max(b, newState.score))
        } else if (collision === 'lost') {
          const newLives = stateRef.current.lives - 1
          if (newLives <= 0) {
            const ls = { ...stateRef.current, status: 'lost' }
            stateRef.current = ls
            setRenderState(ls)
          } else {
            const rs = {
              ...stateRef.current,
              frogX: Math.floor(COLS / 2),
              frogY: SPAWN_ZONE,
              lives: newLives,
            }
            stateRef.current = rs
            setRenderState(rs)
          }
        } else {
          setRenderState({ ...stateRef.current })
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [updateObstacles, checkCollision])

  // Handle keyboard input
  useEffect(() => {
    const handler = (e) => {
      const s = stateRef.current

      // Space to restart
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (s.status !== 'playing') {
          const f = initState()
          stateRef.current = f
          setRenderState(f)
        }
        return
      }

      if (s.status !== 'playing') return

      // Arrow keys and WASD
      const map = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        w: 'UP',
        s: 'DOWN',
        a: 'LEFT',
        d: 'RIGHT',
        W: 'UP',
        S: 'DOWN',
        A: 'LEFT',
        D: 'RIGHT',
      }

      const dir = map[e.key]
      if (dir) {
        e.preventDefault()
        const d = DIR[dir]
        const newX = Math.max(0, Math.min(COLS - 1, s.frogX + d.x))
        const newY = Math.max(0, Math.min(ROWS - 1, s.frogY + d.y))
        const newState = {
          ...s,
          frogX: newX,
          frogY: newY,
          score: s.score + (dir === 'UP' ? 10 : 0),
        }
        stateRef.current = newState
        setRenderState(newState)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full">
      {/* Stats display */}
      <div className="flex gap-4">
        <div
          className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl"
          style={{ background: 'var(--fill-tertiary)' }}
        >
          <span
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--label-primary)',
            }}
          >
            {renderState.score}
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--label-tertiary)',
            }}
          >
            Score
          </span>
        </div>
        <div
          className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl"
          style={{ background: 'var(--fill-tertiary)' }}
        >
          <span
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--label-primary)',
            }}
          >
            {renderState.lives}
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--label-tertiary)',
            }}
          >
            Lives
          </span>
        </div>
        <div
          className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl"
          style={{ background: 'var(--fill-tertiary)' }}
        >
          <span
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--label-primary)',
            }}
          >
            {best}
          </span>
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--label-tertiary)',
            }}
          >
            Best
          </span>
        </div>
      </div>

      {/* Game canvas */}
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        style={{
          border: '2px solid var(--label-tertiary)',
          borderRadius: '8px',
          display: 'block',
          imageRendering: 'pixelated',
        }}
      />

      {/* Controls and status */}
      <div className="flex flex-col gap-3 w-full max-w-md">
        <div
          style={{
            fontSize: '0.85rem',
            color: 'var(--label-secondary)',
            textAlign: 'center',
          }}
        >
          {renderState.status === 'playing' &&
            '↑ ↓ ← → or WASD to move • Avoid traffic and cross the water!'}
          {renderState.status === 'won' && '🎉 You made it to safety!'}
          {renderState.status === 'lost' && '💀 Game Over!'}
        </div>
        <button
          onClick={() => {
            const f = initState()
            stateRef.current = f
            setRenderState(f)
          }}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            background: 'var(--accent)',
            color: '#fff',
          }}
        >
          {renderState.status === 'playing' ? 'New Game' : 'Play Again'}
        </button>
      </div>
    </div>
  )
}
