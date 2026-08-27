import { useState, useEffect, useRef, useCallback } from 'react'

const PADDLE_WIDTH = 100
const PADDLE_HEIGHT = 12
const BALL_SIZE = 10
const BRICK_ROWS = 5
const BRICK_COLS = 8
const BRICK_HEIGHT = 20
const BRICK_PADDING = 4

export default function GreatWallBoard() {
  const canvasRef = useRef(null)
  const [gameState, setGameState] = useState('ready') // ready, playing, won, lost
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const gameLoopRef = useRef(null)
  const stateRef = useRef({
    paddle: { x: 0, y: 0 },
    ball: { x: 0, y: 0, dx: 0, dy: 0 },
    bricks: [],
    canvasWidth: 0,
    canvasHeight: 0,
  })

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const { paddle, ball, bricks, canvasWidth, canvasHeight } = stateRef.current

    // Clear canvas
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Draw paddle
    ctx.fillStyle = '#00d4ff'
    ctx.fillRect(paddle.x, paddle.y, PADDLE_WIDTH, PADDLE_HEIGHT)

    // Draw ball
    ctx.fillStyle = '#ff006e'
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, BALL_SIZE / 2, 0, Math.PI * 2)
    ctx.fill()

    // Draw bricks
    bricks.forEach((brick) => {
      if (brick.visible) {
        ctx.fillStyle = brick.color
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height)
      }
    })

    // Draw score and lives
    ctx.fillStyle = '#ffffff'
    ctx.font = '16px monospace'
    ctx.fillText(`Score: ${score}`, 10, 25)
    ctx.fillText(`Lives: ${lives}`, canvasWidth - 80, 25)

    if (gameState === 'ready') {
      ctx.fillStyle = '#ffffff'
      ctx.font = '20px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Click to Start', canvasWidth / 2, canvasHeight / 2)
      ctx.textAlign = 'left'
    }

    if (gameState === 'won') {
      ctx.fillStyle = '#00ff00'
      ctx.font = '32px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('You Won!', canvasWidth / 2, canvasHeight / 2)
      ctx.font = '16px monospace'
      ctx.fillText('Click to Play Again', canvasWidth / 2, canvasHeight / 2 + 40)
      ctx.textAlign = 'left'
    }

    if (gameState === 'lost') {
      ctx.fillStyle = '#ff0000'
      ctx.font = '32px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Game Over', canvasWidth / 2, canvasHeight / 2)
      ctx.font = '16px monospace'
      ctx.fillText('Click to Try Again', canvasWidth / 2, canvasHeight / 2 + 40)
      ctx.textAlign = 'left'
    }
  }, [gameState, score, lives])

  const initGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const width = canvas.width
    const height = canvas.height
    const brickWidth = (width - (BRICK_COLS + 1) * BRICK_PADDING) / BRICK_COLS

    const bricks = []
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        bricks.push({
          x: col * (brickWidth + BRICK_PADDING) + BRICK_PADDING,
          y: row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_PADDING + 40,
          width: brickWidth,
          height: BRICK_HEIGHT,
          visible: true,
          color: `hsl(${(row * 360) / BRICK_ROWS}, 70%, 60%)`,
        })
      }
    }

    stateRef.current = {
      paddle: {
        x: width / 2 - PADDLE_WIDTH / 2,
        y: height - PADDLE_HEIGHT - 20,
      },
      ball: {
        x: width / 2,
        y: height - PADDLE_HEIGHT - 40,
        dx: 3,
        dy: -3,
      },
      bricks,
      canvasWidth: width,
      canvasHeight: height,
    }

    setScore(0)
    setLives(3)
    setGameState('ready')
  }, [])

  const startGame = useCallback(() => {
    setGameState('playing')
  }, [])

  const update = useCallback(() => {
    if (gameState !== 'playing') return

    const { paddle, ball, bricks, canvasWidth, canvasHeight } = stateRef.current

    // Move ball
    ball.x += ball.dx
    ball.y += ball.dy

    // Ball collision with walls
    if (ball.x - BALL_SIZE / 2 < 0 || ball.x + BALL_SIZE / 2 > canvasWidth) {
      ball.dx = -ball.dx
    }
    if (ball.y - BALL_SIZE / 2 < 0) {
      ball.dy = -ball.dy
    }

    // Ball collision with paddle
    if (
      ball.y + BALL_SIZE / 2 > paddle.y &&
      ball.y - BALL_SIZE / 2 < paddle.y + PADDLE_HEIGHT &&
      ball.x > paddle.x &&
      ball.x < paddle.x + PADDLE_WIDTH
    ) {
      ball.dy = -Math.abs(ball.dy)
      // Add some angle based on where it hits the paddle
      const hitPos = (ball.x - paddle.x) / PADDLE_WIDTH
      ball.dx = (hitPos - 0.5) * 6
    }

    // Ball collision with bricks
    bricks.forEach((brick) => {
      if (!brick.visible) return

      if (
        ball.x + BALL_SIZE / 2 > brick.x &&
        ball.x - BALL_SIZE / 2 < brick.x + brick.width &&
        ball.y + BALL_SIZE / 2 > brick.y &&
        ball.y - BALL_SIZE / 2 < brick.y + brick.height
      ) {
        brick.visible = false
        ball.dy = -ball.dy
        setScore((s) => s + 10)
      }
    })

    // Check win condition
    if (bricks.every((b) => !b.visible)) {
      setGameState('won')
      return
    }

    // Ball falls off bottom
    if (ball.y - BALL_SIZE / 2 > canvasHeight) {
      const newLives = lives - 1
      setLives(newLives)
      if (newLives <= 0) {
        setGameState('lost')
      } else {
        // Reset ball
        ball.x = canvasWidth / 2
        ball.y = canvasHeight - PADDLE_HEIGHT - 40
        ball.dx = 3
        ball.dy = -3
      }
    }
  }, [gameState, lives])

  // Canvas sizing + the initial game setup. This must run only once on
  // mount — it used to also depend on `gameState`, so every state
  // transition (e.g. 'ready' -> 'playing' on click) re-ran it and called
  // initGame() again, which unconditionally resets gameState back to
  // 'ready'. That made the game unstartable: clicking to play silently
  // reset it every time.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement

    const setupCanvas = (width) => {
      canvas.width = Math.min(600, width)
      canvas.height = 500
      initGame()
      draw()
    }

    // Right after this view mounts (e.g. swapping in from the game picker),
    // the container can still measure 0 wide for a frame. Measuring once
    // and locking that in would leave the canvas permanently invisible, so
    // wait for a real measurement instead.
    let resizeObserver = null
    if (container.clientWidth > 0) {
      setupCanvas(container.clientWidth)
    } else if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width
        if (width > 0) {
          resizeObserver.disconnect()
          setupCanvas(width)
        }
      })
      resizeObserver.observe(container)
    }

    return () => {
      resizeObserver?.disconnect()
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [])

  // Input listeners are re-bound whenever gameState changes, so handleClick
  // always sees the current value — but, unlike the effect above, this
  // must never re-run initGame().
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      stateRef.current.paddle.x = Math.max(
        0,
        Math.min(x - PADDLE_WIDTH / 2, stateRef.current.canvasWidth - PADDLE_WIDTH)
      )
    }

    const handleClick = () => {
      if (gameState === 'ready') {
        startGame()
      } else if (gameState === 'won' || gameState === 'lost') {
        initGame()
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
    }
  }, [gameState, initGame, startGame])

  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
        gameLoopRef.current = null
      }
      draw()
      return
    }

    // Define gameLoop inside the effect to avoid circular dependency
    const gameLoop = () => {
      update()
      draw()
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
        gameLoopRef.current = null
      }
    }
  }, [gameState, score, lives, draw, update])

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold mb-2">The Great Wall</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Break down the wall, one brick at a time!
        </p>
      </div>

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          className="border-2 border-gray-300 dark:border-gray-700 rounded-lg cursor-none"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>

      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Move your mouse to control the paddle</p>
        <p>Don't let the ball fall!</p>
      </div>
    </div>
  )
}
