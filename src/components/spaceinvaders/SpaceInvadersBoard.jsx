import { useState, useEffect, useRef, useCallback } from 'react'
import './spaceInvaders.css'

const GAME_WIDTH = 800
const GAME_HEIGHT = 600
const PLAYER_WIDTH = 50
const PLAYER_HEIGHT = 30
const PLAYER_SPEED = 5
const BULLET_WIDTH = 4
const BULLET_HEIGHT = 15
const BULLET_SPEED = 7
const ALIEN_WIDTH = 40
const ALIEN_HEIGHT = 30
const ALIEN_ROWS = 4
const ALIEN_COLS = 10
const ALIEN_SPEED = 1
const ALIEN_DROP = 30
const ALIEN_BULLET_SPEED = 4
const ALIEN_SHOOT_CHANCE = 0.0005

function SpaceInvadersBoard() {
  const canvasRef = useRef(null)
  const [gameState, setGameState] = useState('ready') // ready, playing, paused, gameOver, won
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('spaceInvadersHighScore')
    return saved ? parseInt(saved, 10) : 0
  })

  // Game state refs for game loop
  const gameStateRef = useRef({
    player: { x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2, y: GAME_HEIGHT - 60 },
    bullets: [],
    aliens: [],
    alienBullets: [],
    alienDirection: 1,
    keys: {},
    lastShot: 0,
    animationFrame: null,
  })

  // Initialize aliens
  const initAliens = useCallback(() => {
    const aliens = []
    const startX = 50
    const startY = 50
    const spacingX = 60
    const spacingY = 50

    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        aliens.push({
          x: startX + col * spacingX,
          y: startY + row * spacingY,
          alive: true,
          type: row, // Different types for different rows
        })
      }
    }
    return aliens
  }, [])

  // Start new game
  const startGame = useCallback(() => {
    gameStateRef.current = {
      player: { x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2, y: GAME_HEIGHT - 60 },
      bullets: [],
      aliens: initAliens(),
      alienBullets: [],
      alienDirection: 1,
      keys: {},
      lastShot: 0,
      animationFrame: null,
    }
    setScore(0)
    setLives(3)
    setGameState('playing')
  }, [initAliens])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && gameState === 'playing') {
        e.preventDefault()
        const now = Date.now()
        const state = gameStateRef.current
        if (now - state.lastShot > 500) {
          state.bullets.push({
            x: state.player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
            y: state.player.y,
          })
          state.lastShot = now
        }
      } else if (e.code === 'KeyP' && gameState === 'playing') {
        setGameState('paused')
      } else if (e.code === 'KeyP' && gameState === 'paused') {
        setGameState('playing')
      }
      gameStateRef.current.keys[e.code] = true
    }

    const handleKeyUp = (e) => {
      gameStateRef.current.keys[e.code] = false
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameState])

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const state = gameStateRef.current

    const gameLoop = () => {
      // Clear canvas
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

      // Move player
      if (state.keys['ArrowLeft'] || state.keys['KeyA']) {
        state.player.x = Math.max(0, state.player.x - PLAYER_SPEED)
      }
      if (state.keys['ArrowRight'] || state.keys['KeyD']) {
        state.player.x = Math.min(
          GAME_WIDTH - PLAYER_WIDTH,
          state.player.x + PLAYER_SPEED
        )
      }

      // Draw player
      ctx.fillStyle = '#0f0'
      ctx.fillRect(
        state.player.x,
        state.player.y,
        PLAYER_WIDTH,
        PLAYER_HEIGHT
      )

      // Move and draw bullets
      state.bullets = state.bullets.filter((bullet) => {
        bullet.y -= BULLET_SPEED
        if (bullet.y < 0) return false

        ctx.fillStyle = '#fff'
        ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT)
        return true
      })

      // Check if aliens need to move down and change direction
      let shouldDrop = false
      const aliveAliens = state.aliens.filter((a) => a.alive)
      
      if (aliveAliens.length > 0) {
        const leftmost = Math.min(...aliveAliens.map((a) => a.x))
        const rightmost = Math.max(...aliveAliens.map((a) => a.x + ALIEN_WIDTH))

        if (
          (state.alienDirection > 0 && rightmost >= GAME_WIDTH - 10) ||
          (state.alienDirection < 0 && leftmost <= 10)
        ) {
          shouldDrop = true
          state.alienDirection *= -1
        }
      }

      // Move and draw aliens
      state.aliens.forEach((alien) => {
        if (!alien.alive) return

        if (shouldDrop) {
          alien.y += ALIEN_DROP
        }
        alien.x += state.alienDirection * ALIEN_SPEED

        // Draw alien
        const colors = ['#f00', '#f80', '#ff0', '#0ff']
        ctx.fillStyle = colors[alien.type]
        ctx.fillRect(alien.x, alien.y, ALIEN_WIDTH, ALIEN_HEIGHT)

        // Alien shooting
        if (Math.random() < ALIEN_SHOOT_CHANCE) {
          state.alienBullets.push({
            x: alien.x + ALIEN_WIDTH / 2 - BULLET_WIDTH / 2,
            y: alien.y + ALIEN_HEIGHT,
          })
        }

        // Check if alien reached bottom
        if (alien.y + ALIEN_HEIGHT >= state.player.y) {
          setGameState('gameOver')
        }
      })

      // Move and draw alien bullets
      state.alienBullets = state.alienBullets.filter((bullet) => {
        bullet.y += ALIEN_BULLET_SPEED
        if (bullet.y > GAME_HEIGHT) return false

        ctx.fillStyle = '#f00'
        ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT)
        return true
      })

      // Collision detection: bullets hitting aliens
      state.bullets.forEach((bullet, bulletIndex) => {
        state.aliens.forEach((alien) => {
          if (
            alien.alive &&
            bullet.x < alien.x + ALIEN_WIDTH &&
            bullet.x + BULLET_WIDTH > alien.x &&
            bullet.y < alien.y + ALIEN_HEIGHT &&
            bullet.y + BULLET_HEIGHT > alien.y
          ) {
            alien.alive = false
            state.bullets.splice(bulletIndex, 1)
            const points = (4 - alien.type) * 10
            setScore((s) => {
              const newScore = s + points
              if (newScore > highScore) {
                setHighScore(newScore)
                localStorage.setItem('spaceInvadersHighScore', newScore.toString())
              }
              return newScore
            })
          }
        })
      })

      // Collision detection: alien bullets hitting player
      state.alienBullets.forEach((bullet, bulletIndex) => {
        if (
          bullet.x < state.player.x + PLAYER_WIDTH &&
          bullet.x + BULLET_WIDTH > state.player.x &&
          bullet.y < state.player.y + PLAYER_HEIGHT &&
          bullet.y + BULLET_HEIGHT > state.player.y
        ) {
          state.alienBullets.splice(bulletIndex, 1)
          setLives((l) => {
            const newLives = l - 1
            if (newLives <= 0) {
              setGameState('gameOver')
            }
            return newLives
          })
          // Reset player position briefly
          state.player.x = GAME_WIDTH / 2 - PLAYER_WIDTH / 2
        }
      })

      // Check win condition
      if (state.aliens.filter((a) => a.alive).length === 0) {
        setGameState('won')
      }

      if (gameState === 'playing') {
        state.animationFrame = requestAnimationFrame(gameLoop)
      }
    }

    state.animationFrame = requestAnimationFrame(gameLoop)

    return () => {
      if (state.animationFrame) {
        cancelAnimationFrame(state.animationFrame)
      }
    }
  }, [gameState, highScore])

  return (
    <div className="space-invaders-container">
      <div className="space-invaders-header">
        <div className="space-invaders-stats">
          <div className="stat">
            <span className="stat-label">Score:</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Lives:</span>
            <span className="stat-value">{'❤️'.repeat(lives)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">High Score:</span>
            <span className="stat-value">{highScore}</span>
          </div>
        </div>
      </div>

      <div className="space-invaders-game">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="space-invaders-canvas"
        />

        {gameState === 'ready' && (
          <div className="space-invaders-overlay">
            <div className="space-invaders-message">
              <h2>SPACE INVADERS</h2>
              <p>Defend Earth from the alien invasion!</p>
              <div className="controls-info">
                <p>
                  <strong>Controls:</strong>
                </p>
                <p>← → or A D to move</p>
                <p>SPACE to shoot</p>
                <p>P to pause</p>
              </div>
              <button onClick={startGame} className="game-button">
                Start Game
              </button>
            </div>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="space-invaders-overlay">
            <div className="space-invaders-message">
              <h2>PAUSED</h2>
              <p>Press P to resume</p>
            </div>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="space-invaders-overlay">
            <div className="space-invaders-message">
              <h2>GAME OVER</h2>
              <p>Final Score: {score}</p>
              {score === highScore && score > 0 && (
                <p className="high-score-text">🏆 New High Score! 🏆</p>
              )}
              <button onClick={startGame} className="game-button">
                Play Again
              </button>
            </div>
          </div>
        )}

        {gameState === 'won' && (
          <div className="space-invaders-overlay">
            <div className="space-invaders-message">
              <h2>🎉 VICTORY! 🎉</h2>
              <p>You saved Earth!</p>
              <p>Final Score: {score}</p>
              {score === highScore && (
                <p className="high-score-text">🏆 New High Score! 🏆</p>
              )}
              <button onClick={startGame} className="game-button">
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-invaders-footer">
        <p className="instructions">
          Destroy all aliens before they reach the bottom! Different colored
          aliens are worth different points.
        </p>
      </div>
    </div>
  )
}

export default SpaceInvadersBoard
