import { useState, useEffect, useRef, useCallback } from "react";

// ── Constants ────────────────────────────────────────────────────────────────

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;

// Player
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 30;
const PLAYER_SPEED = 5;

// Aliens
const ALIEN_ROWS = 4;
const ALIEN_COLS = 8;
const ALIEN_WIDTH = 30;
const ALIEN_HEIGHT = 25;
const ALIEN_PADDING = 10;
const ALIEN_SPEED_START = 1;
const ALIEN_SPEED_INCREMENT = 0.3;

// Bullets
const BULLET_WIDTH = 3;
const BULLET_HEIGHT = 10;
const BULLET_SPEED = 7;
const ALIEN_BULLET_SPEED = 4;
const ALIEN_SHOOT_CHANCE = 0.002;

// Shields
const SHIELD_COUNT = 4;
const SHIELD_WIDTH = 60;
const SHIELD_HEIGHT = 40;
const SHIELD_HEALTH = 20;

function initState() {
  // Create aliens
  const aliens = [];
  const startX = (CANVAS_WIDTH - (ALIEN_COLS * (ALIEN_WIDTH + ALIEN_PADDING))) / 2;
  const startY = 60;
  
  for (let row = 0; row < ALIEN_ROWS; row++) {
    for (let col = 0; col < ALIEN_COLS; col++) {
      aliens.push({
        x: startX + col * (ALIEN_WIDTH + ALIEN_PADDING),
        y: startY + row * (ALIEN_HEIGHT + ALIEN_PADDING),
        row,
        col,
        alive: true,
      });
    }
  }

  // Create shields
  const shields = [];
  const shieldSpacing = CANVAS_WIDTH / (SHIELD_COUNT + 1);
  for (let i = 0; i < SHIELD_COUNT; i++) {
    shields.push({
      x: shieldSpacing * (i + 1) - SHIELD_WIDTH / 2,
      y: CANVAS_HEIGHT - 150,
      health: SHIELD_HEALTH,
    });
  }

  return {
    player: {
      x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: CANVAS_HEIGHT - 60,
    },
    aliens,
    alienDirection: 1, // 1 = right, -1 = left
    alienSpeed: ALIEN_SPEED_START,
    playerBullets: [],
    alienBullets: [],
    shields,
    score: 0,
    lives: 3,
    status: "idle", // 'idle' | 'playing' | 'paused' | 'won' | 'lost'
    alienAnimation: 0, // Toggle between 0 and 1 for animation frames
  };
}

// ── Canvas renderer ───────────────────────────────────────────────────────────

function drawGame(ctx, state, dark) {
  const { player, aliens, playerBullets, alienBullets, shields, alienAnimation } = state;

  // Background - space theme
  ctx.fillStyle = dark ? "#0a0e1a" : "#1a1d2e";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Stars background
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  for (let i = 0; i < 50; i++) {
    const x = (i * 37) % CANVAS_WIDTH;
    const y = (i * 47) % CANVAS_HEIGHT;
    ctx.fillRect(x, y, 1, 1);
  }

  // Draw player
  ctx.fillStyle = "#00ff88";
  ctx.beginPath();
  ctx.moveTo(player.x + PLAYER_WIDTH / 2, player.y);
  ctx.lineTo(player.x, player.y + PLAYER_HEIGHT);
  ctx.lineTo(player.x + PLAYER_WIDTH, player.y + PLAYER_HEIGHT);
  ctx.closePath();
  ctx.fill();

  // Player details
  ctx.fillStyle = "#00aa55";
  ctx.fillRect(player.x + 5, player.y + 15, 10, 10);
  ctx.fillRect(player.x + PLAYER_WIDTH - 15, player.y + 15, 10, 10);

  // Draw aliens
  aliens.forEach((alien) => {
    if (!alien.alive) return;
    
    // Color based on row
    const colors = ["#ff3366", "#ff6633", "#ffaa33", "#66ff33"];
    ctx.fillStyle = colors[alien.row % colors.length];
    
    // Simple alien body
    const frame = alienAnimation;
    const bodyWidth = ALIEN_WIDTH - 6;
    const bodyHeight = ALIEN_HEIGHT - 8;
    
    ctx.fillRect(alien.x + 3, alien.y + 4, bodyWidth, bodyHeight);
    
    // Eyes
    ctx.fillStyle = "#000";
    const eyeY = alien.y + 8;
    ctx.fillRect(alien.x + 8, eyeY, 4, 4);
    ctx.fillRect(alien.x + ALIEN_WIDTH - 12, eyeY, 4, 4);
    
    // Antennae/legs (animated)
    ctx.fillStyle = colors[alien.row % colors.length];
    if (frame === 0) {
      ctx.fillRect(alien.x, alien.y + bodyHeight + 4, 4, 4);
      ctx.fillRect(alien.x + ALIEN_WIDTH - 4, alien.y + bodyHeight + 4, 4, 4);
    } else {
      ctx.fillRect(alien.x + 3, alien.y + bodyHeight + 4, 4, 4);
      ctx.fillRect(alien.x + ALIEN_WIDTH - 7, alien.y + bodyHeight + 4, 4, 4);
    }
  });

  // Draw shields
  ctx.fillStyle = "#00aaff";
  shields.forEach((shield) => {
    if (shield.health > 0) {
      const alpha = Math.max(0.3, shield.health / SHIELD_HEALTH);
      ctx.globalAlpha = alpha;
      ctx.fillRect(shield.x, shield.y, SHIELD_WIDTH, SHIELD_HEIGHT);
      ctx.globalAlpha = 1;
      
      // Shield damage cracks
      if (shield.health < SHIELD_HEALTH * 0.7) {
        ctx.strokeStyle = dark ? "#0a0e1a" : "#1a1d2e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(shield.x + 10, shield.y);
        ctx.lineTo(shield.x + 15, shield.y + SHIELD_HEIGHT);
        ctx.stroke();
      }
      if (shield.health < SHIELD_HEALTH * 0.4) {
        ctx.beginPath();
        ctx.moveTo(shield.x + SHIELD_WIDTH - 10, shield.y);
        ctx.lineTo(shield.x + SHIELD_WIDTH - 15, shield.y + SHIELD_HEIGHT);
        ctx.stroke();
      }
    }
  });

  // Draw player bullets
  ctx.fillStyle = "#ffff00";
  playerBullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT);
  });

  // Draw alien bullets
  ctx.fillStyle = "#ff0066";
  alienBullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT);
  });
}

// ── Score and Lives Display ──────────────────────────────────────────────────

function ScoreDisplay({ score, lives, best }) {
  return (
    <div className="w-full flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-4">
        <div
          className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl"
          style={{ background: "var(--fill-tertiary)", minWidth: 68 }}
        >
          <span style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--label-primary)" }}>
            {score}
          </span>
          <span style={{ fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--label-tertiary)" }}>
            Score
          </span>
        </div>
        <div
          className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl"
          style={{ background: "var(--fill-tertiary)", minWidth: 68 }}
        >
          <span style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--label-primary)" }}>
            {best}
          </span>
          <span style={{ fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--label-tertiary)" }}>
            Best
          </span>
        </div>
      </div>
      <div
        className="flex items-center gap-1.5 px-4 py-2 rounded-2xl"
        style={{ background: "var(--fill-tertiary)" }}
      >
        {Array.from({ length: lives }).map((_, i) => (
          <span key={i} style={{ fontSize: "1.2rem" }}>💚</span>
        ))}
        {Array.from({ length: Math.max(0, 3 - lives) }).map((_, i) => (
          <span key={`empty-${i}`} style={{ fontSize: "1.2rem", opacity: 0.3 }}>🖤</span>
        ))}
      </div>
    </div>
  );
}

// ── Main board ────────────────────────────────────────────────────────────────

export default function SpaceInvadersBoard({ dark }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const stateRef = useRef(initState());
  const [renderState, setRenderState] = useState(stateRef.current);
  const [best, setBest] = useState(0);
  const keysPressed = useRef(new Set());

  // ── Game loop ───────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const state = stateRef.current;
    if (state.status !== "playing") {
      return;
    }

    // Move player
    if (keysPressed.current.has("ArrowLeft") || keysPressed.current.has("a")) {
      state.player.x = Math.max(0, state.player.x - PLAYER_SPEED);
    }
    if (keysPressed.current.has("ArrowRight") || keysPressed.current.has("d")) {
      state.player.x = Math.min(CANVAS_WIDTH - PLAYER_WIDTH, state.player.x + PLAYER_SPEED);
    }

    // Move aliens
    let hitEdge = false;
    const aliveAliens = state.aliens.filter(a => a.alive);
    
    aliveAliens.forEach((alien) => {
      alien.x += state.alienDirection * state.alienSpeed;
      if (alien.x <= 0 || alien.x + ALIEN_WIDTH >= CANVAS_WIDTH) {
        hitEdge = true;
      }
    });

    if (hitEdge) {
      state.alienDirection *= -1;
      aliveAliens.forEach((alien) => {
        alien.y += ALIEN_HEIGHT / 2;
        // Check if aliens reached the bottom
        if (alien.y + ALIEN_HEIGHT >= state.player.y) {
          state.status = "lost";
        }
      });
      state.alienSpeed += ALIEN_SPEED_INCREMENT;
      state.alienAnimation = 1 - state.alienAnimation;
    }

    // Move player bullets
    state.playerBullets = state.playerBullets.filter((bullet) => {
      bullet.y -= BULLET_SPEED;
      return bullet.y > -BULLET_HEIGHT;
    });

    // Move alien bullets
    state.alienBullets = state.alienBullets.filter((bullet) => {
      bullet.y += ALIEN_BULLET_SPEED;
      return bullet.y < CANVAS_HEIGHT;
    });

    // Aliens shoot
    aliveAliens.forEach((alien) => {
      if (Math.random() < ALIEN_SHOOT_CHANCE) {
        state.alienBullets.push({
          x: alien.x + ALIEN_WIDTH / 2,
          y: alien.y + ALIEN_HEIGHT,
        });
      }
    });

    // Collision detection: player bullets vs aliens
    state.playerBullets = state.playerBullets.filter((bullet) => {
      let hit = false;
      state.aliens.forEach((alien) => {
        if (
          alien.alive &&
          bullet.x + BULLET_WIDTH > alien.x &&
          bullet.x < alien.x + ALIEN_WIDTH &&
          bullet.y + BULLET_HEIGHT > alien.y &&
          bullet.y < alien.y + ALIEN_HEIGHT
        ) {
          alien.alive = false;
          hit = true;
          state.score += 10;
        }
      });
      return !hit;
    });

    // Collision detection: bullets vs shields
    const checkShieldCollision = (bullet) => {
      for (const shield of state.shields) {
        if (
          shield.health > 0 &&
          bullet.x + BULLET_WIDTH > shield.x &&
          bullet.x < shield.x + SHIELD_WIDTH &&
          bullet.y + BULLET_HEIGHT > shield.y &&
          bullet.y < shield.y + SHIELD_HEIGHT
        ) {
          shield.health -= 1;
          return true;
        }
      }
      return false;
    };

    state.playerBullets = state.playerBullets.filter((bullet) => !checkShieldCollision(bullet));
    state.alienBullets = state.alienBullets.filter((bullet) => !checkShieldCollision(bullet));

    // Collision detection: alien bullets vs player
    state.alienBullets = state.alienBullets.filter((bullet) => {
      if (
        bullet.x + BULLET_WIDTH > state.player.x &&
        bullet.x < state.player.x + PLAYER_WIDTH &&
        bullet.y + BULLET_HEIGHT > state.player.y &&
        bullet.y < state.player.y + PLAYER_HEIGHT
      ) {
        state.lives -= 1;
        if (state.lives <= 0) {
          state.status = "lost";
        }
        return false;
      }
      return true;
    });

    // Check win condition
    if (aliveAliens.length === 0) {
      state.status = "won";
      setBest((b) => Math.max(b, state.score));
    }

    // Update render
    setRenderState({ ...state });

    if (state.status === "playing") {
      animationRef.current = requestAnimationFrame(gameLoop);
    } else if (state.status === "lost") {
      setBest((b) => Math.max(b, state.score));
    }
  }, []);

  // ── Start / restart ─────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    const fresh = { ...initState(), status: "playing" };
    stateRef.current = fresh;
    setRenderState(fresh);
    keysPressed.current.clear();
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  // ── Pause / resume ──────────────────────────────────────────────
  const togglePause = useCallback(() => {
    const state = stateRef.current;
    if (state.status === "playing") {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      state.status = "paused";
      stateRef.current = state;
      setRenderState({ ...state });
    } else if (state.status === "paused") {
      state.status = "playing";
      stateRef.current = state;
      setRenderState({ ...state });
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameLoop]);

  // ── Keyboard controls ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const state = stateRef.current;

      // Space = start / pause / resume / shoot
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (state.status === "idle" || state.status === "lost" || state.status === "won") {
          startGame();
        } else if (state.status === "playing") {
          // Shoot
          state.playerBullets.push({
            x: state.player.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
            y: state.player.y,
          });
        } else if (state.status === "paused") {
          togglePause();
        }
        return;
      }

      // P = pause/resume
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        if (state.status === "playing" || state.status === "paused") {
          togglePause();
        }
        return;
      }

      // Movement keys
      if (["ArrowLeft", "ArrowRight", "a", "d", "A", "D"].includes(e.key)) {
        e.preventDefault();
        keysPressed.current.add(e.key.toLowerCase());
      }
    };

    const handleKeyUp = (e) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [startGame, togglePause]);

  // ── Draw whenever renderState changes ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    drawGame(ctx, renderState, dark ?? false);
  }, [renderState, dark]);

  // ── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const status = renderState.status;
  const isActive = status === "playing" || status === "paused";

  // ── Overlay content ─────────────────────────────────────────────
  const overlayContent = () => {
    if (status === "idle") {
      return (
        <div className="flex flex-col items-center gap-4">
          <div style={{ fontSize: 48 }}>👾</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--label-primary)" }}>
            Space Invaders
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--label-tertiary)", textAlign: "center", maxWidth: 280 }}>
            Defend Earth from alien invaders! Shoot them down before they reach you.
          </p>
          <button onClick={startGame} className="btn-primary">
            Start Game
          </button>
          <div style={{ fontSize: "0.72rem", color: "var(--label-quaternary)", letterSpacing: "-0.01em", textAlign: "center" }}>
            <div>Arrow keys / A D to move</div>
            <div>Space to shoot · P to pause</div>
          </div>
        </div>
      );
    }
    if (status === "paused") {
      return (
        <div className="flex flex-col items-center gap-4">
          <div style={{ fontSize: 40 }}>⏸️</div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--label-primary)" }}>
            Paused
          </h2>
          <button onClick={togglePause} className="btn-primary">
            Resume
          </button>
        </div>
      );
    }
    if (status === "lost") {
      return (
        <div className="flex flex-col items-center gap-4">
          <div
            style={{
              width: 64, height: 64, borderRadius: 18,
              background: "linear-gradient(145deg, #ff453a, #ff3b30)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, boxShadow: "0 8px 24px rgba(255,59,48,0.35)",
            }}
          >
            💥
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--label-primary)" }}>
            Game Over
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--label-tertiary)" }}>
            Score: <strong style={{ color: "var(--label-primary)" }}>{renderState.score}</strong>
          </p>
          <button onClick={startGame} className="btn-primary">
            Try Again
          </button>
        </div>
      );
    }
    if (status === "won") {
      return (
        <div className="flex flex-col items-center gap-4">
          <div
            style={{
              width: 64, height: 64, borderRadius: 18,
              background: "linear-gradient(145deg, #34c759, #30d158)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, boxShadow: "0 8px 24px rgba(52,199,89,0.35)",
            }}
          >
            🏆
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--label-primary)" }}>
            Victory!
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--label-tertiary)" }}>
            Final score: <strong style={{ color: "var(--label-primary)" }}>{renderState.score}</strong>
          </p>
          <button onClick={startGame} className="btn-primary">
            Play Again
          </button>
        </div>
      );
    }
    return null;
  };

  const overlay = overlayContent();

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-2xl mx-auto">
      {/* Score and lives display */}
      <ScoreDisplay score={renderState.score} lives={renderState.lives} best={best} />

      {/* Canvas + overlay wrapper */}
      <div
        style={{
          position: "relative",
          width: CANVAS_WIDTH,
          maxWidth: "100%",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
          border: "0.5px solid var(--separator)",
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ display: "block", width: "100%", height: "auto" }}
        />

        {/* Overlay for idle / paused / end states */}
        {overlay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          >
            <div
              className="spring-pop flex flex-col items-center gap-4 p-7 rounded-3xl"
              style={{
                background: "var(--bg-surface)",
                boxShadow: "var(--shadow-xl)",
                minWidth: 240,
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
          <button onClick={togglePause} className="btn-ghost">
            {status === "paused" ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button onClick={startGame} className="btn-ghost">
            🔄 Restart
          </button>
        </div>
      )}

      <p
        className="text-center"
        style={{ fontSize: "0.75rem", color: "var(--label-tertiary)", letterSpacing: "-0.01em" }}
      >
        {isActive
          ? "Arrow keys / A D to move · Space to shoot · P to pause"
          : "Press Space or click Start to play"}
      </p>
    </div>
  );
}
