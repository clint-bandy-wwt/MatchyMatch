import { useState, useEffect, useCallback } from "react";
import {
  pickPuzzle,
  validateWord,
  wordScore,
  isPangram,
  maxScore,
  getRank,
} from "../../data/spellingBeeData";
import Toast from "../Toast";

// ── Honeycomb hex layout ──────────────────────────────────────────────────────
// 7 hexagons: 1 center + 6 surrounding
// We render them as styled buttons arranged in a flower pattern.

function HexButton({ letter, isCenter, onClick, disabled }) {
  return (
    <button
      onClick={() => !disabled && onClick(letter)}
      disabled={disabled}
      aria-label={`Letter ${letter}${isCenter ? " (required)" : ""}`}
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        border: "none",
        background: isCenter
          ? "linear-gradient(145deg, #ffd60a, #ff9f0a)"
          : "var(--bg-surface)",
        color: isCenter ? "#1c1c1e" : "var(--label-primary)",
        fontSize: "1.35rem",
        fontWeight: 800,
        letterSpacing: "0.04em",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: isCenter
          ? "0 4px 16px rgba(255,159,10,0.45)"
          : "var(--shadow-md)",
        transition: "transform 0.12s ease, box-shadow 0.12s ease",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(0.92)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {letter}
    </button>
  );
}

// ── Honeycomb grid ────────────────────────────────────────────────────────────
// Positions: center + 6 outer in a circle

function Honeycomb({ center, outer, onLetter, disabled }) {
  // Arrange outer letters in a circle around center
  // Using CSS grid with absolute positioning trick
  const radius = 76; // px from center to outer button center

  return (
    <div
      style={{
        position: "relative",
        width: 220,
        height: 220,
        flexShrink: 0,
      }}
      aria-label="Letter honeycomb"
    >
      {/* Center */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <HexButton
          letter={center}
          isCenter
          onClick={onLetter}
          disabled={disabled}
        />
      </div>

      {/* Outer 6 */}
      {outer.map((letter, i) => {
        const angle = (i * 60 - 90) * (Math.PI / 180); // start at top
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <div
            key={letter}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            }}
          >
            <HexButton
              letter={letter}
              isCenter={false}
              onClick={onLetter}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Input display ─────────────────────────────────────────────────────────────

function WordInput({ value, center, outer }) {
  const allowed = new Set([center, ...outer]);
  return (
    <div
      style={{
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        flexWrap: "wrap",
        padding: "6px 12px",
      }}
      aria-live="polite"
      aria-label={`Current input: ${value || "empty"}`}
    >
      {value.length === 0 ? (
        <span
          style={{
            fontSize: "1.1rem",
            color: "var(--label-quaternary)",
            letterSpacing: "0.08em",
            fontWeight: 500,
          }}
        >
          Type or tap letters…
        </span>
      ) : (
        value.split("").map((ch, i) => (
          <span
            key={i}
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              letterSpacing: "0.04em",
              color:
                ch === center
                  ? "#ff9f0a"
                  : allowed.has(ch)
                  ? "var(--label-primary)"
                  : "rgba(255,59,48,0.8)",
              transition: "color 0.1s",
            }}
          >
            {ch}
          </span>
        ))
      )}
    </div>
  );
}

// ── Found words list ──────────────────────────────────────────────────────────

function FoundWordsList({ words, puzzle }) {
  const sorted = [...words].sort();
  return (
    <div
      style={{
        width: "100%",
        maxHeight: 160,
        overflowY: "auto",
        display: "flex",
        flexWrap: "wrap",
        gap: "6px 8px",
        padding: "10px 12px",
        borderRadius: 16,
        background: "var(--fill-quaternary)",
      }}
    >
      {sorted.length === 0 ? (
        <span style={{ fontSize: "0.8rem", color: "var(--label-tertiary)" }}>
          No words found yet…
        </span>
      ) : (
        sorted.map((w) => {
          const pangram = isPangram(w, puzzle);
          return (
            <span
              key={w}
              style={{
                fontSize: "0.82rem",
                fontWeight: pangram ? 700 : 500,
                color: pangram ? "#ff9f0a" : "var(--label-secondary)",
                background: pangram
                  ? "rgba(255,159,10,0.12)"
                  : "var(--fill-tertiary)",
                padding: "2px 8px",
                borderRadius: 999,
                border: pangram
                  ? "1px solid rgba(255,159,10,0.35)"
                  : "none",
                letterSpacing: "-0.01em",
              }}
            >
              {w.toLowerCase()}
              {pangram && " ✨"}
            </span>
          );
        })
      )}
    </div>
  );
}

// ── Score / rank bar ──────────────────────────────────────────────────────────

function ScoreBar({ score, max, foundCount }) {
  const rank = getRank(score, max);
  const pct = max > 0 ? Math.min(score / max, 1) : 0;

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Rank + score */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontSize: "0.88rem",
            fontWeight: 700,
            color: rank.color,
            letterSpacing: "-0.01em",
          }}
        >
          {rank.label}
        </span>
        <span
          style={{
            fontSize: "0.82rem",
            color: "var(--label-tertiary)",
            letterSpacing: "-0.01em",
          }}
        >
          {foundCount} word{foundCount !== 1 ? "s" : ""} · {score} pts
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: "100%",
          height: 6,
          borderRadius: 999,
          background: "var(--fill-tertiary)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct * 100}%`,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${rank.color}, ${rank.color}cc)`,
            transition: "width 0.4s cubic-bezier(0.34,1.2,0.64,1)",
          }}
        />
      </div>
    </div>
  );
}

// ── Main board ────────────────────────────────────────────────────────────────

export default function SpellingBeeBoard() {
  const [puzzle] = useState(pickPuzzle);
  const [gameKey, setGameKey] = useState(0);

  return (
    <Game
      key={gameKey}
      puzzle={puzzle}
      onNewGame={() => setGameKey((k) => k + 1)}
    />
  );
}

function Game({ puzzle, onNewGame }) {
  const { center, outer } = puzzle;

  const [input, setInput]       = useState("");
  const [found, setFound]       = useState(new Set());
  const [score, setScore]       = useState(0);
  const [toast, setToast]       = useState(null);
  const [shake, setShake]       = useState(false);
  const [outerOrder, setOuterOrder] = useState([...outer]);

  const max = maxScore(puzzle);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const showToast = useCallback((msg) => {
    setToast(msg);
  }, []);

  const handleSubmit = useCallback(() => {
    const word = input.trim().toUpperCase();
    if (!word) return;

    if (found.has(word)) {
      showToast("Already found! 🔁");
      triggerShake();
      setInput("");
      return;
    }

    const result = validateWord(word, puzzle);

    if (result === "too_short") {
      showToast("Too short — need 4+ letters");
      triggerShake();
      return;
    }
    if (result === "missing_center") {
      showToast(`Must contain "${center}" ✋`);
      triggerShake();
      return;
    }
    if (result === "bad_letters") {
      showToast("Letters not in today's hive 🐝");
      triggerShake();
      return;
    }
    if (result === "not_a_word") {
      showToast("Not in word list 📖");
      triggerShake();
      return;
    }

    // Valid!
    const pts = wordScore(word, puzzle);
    const pangram = isPangram(word, puzzle);
    setFound((prev) => new Set([...prev, word]));
    setScore((prev) => prev + pts);
    setInput("");

    if (pangram) {
      showToast(`Pangram! +${pts} pts ✨🎉`);
    } else if (pts === 1) {
      showToast(`+1 pt 👍`);
    } else {
      showToast(`+${pts} pts 🎉`);
    }
  }, [input, found, puzzle, center]);

  // ── Keyboard support ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();

      if (key === "ENTER") {
        handleSubmit();
        return;
      }
      if (key === "BACKSPACE" || key === "DELETE") {
        setInput((prev) => prev.slice(0, -1));
        return;
      }
      if (/^[A-Z]$/.test(key)) {
        setInput((prev) => prev + key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [input, found]);

  const handleLetter = useCallback((letter) => {
    setInput((prev) => prev + letter);
  }, []);

  const handleDelete = useCallback(() => {
    setInput((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setInput("");
  }, []);

  const handleShuffle = useCallback(() => {
    setOuterOrder((prev) => [...prev].sort(() => Math.random() - 0.5));
  }, []);

  const rank = getRank(score, max);
  const isQueenBee = score >= max && max > 0;

  // ── Queen Bee win screen ──────────────────────────────────────────
  if (isQueenBee) {
    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
        <div
          className="spring-pop flex flex-col items-center gap-6 p-8 rounded-3xl w-full"
          style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-xl)" }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 22,
              background: "linear-gradient(145deg, #ffd60a, #ff9f0a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              boxShadow: "0 8px 24px rgba(255,159,10,0.45)",
            }}
          >
            👑
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h2
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--label-primary)",
              }}
            >
              Queen Bee!
            </h2>
            <p style={{ fontSize: "0.95rem", color: "var(--label-tertiary)" }}>
              You found every single word. Incredible!
            </p>
            <p
              style={{
                fontSize: "1.4rem",
                fontWeight: 800,
                color: "#ff9f0a",
                letterSpacing: "-0.02em",
              }}
            >
              {score} pts · {found.size} words
            </p>
          </div>
          <FoundWordsList words={[...found]} puzzle={puzzle} />
          <button onClick={onNewGame} className="btn-primary">
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // ── Playing screen ────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Header info */}
      <div className="w-full flex flex-col gap-1 items-center">
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 12px",
            borderRadius: 999,
            background: "rgba(255,159,10,0.12)",
            color: "#ff9f0a",
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          🐝 Spelling Bee
        </span>
        <p
          style={{
            fontSize: "0.78rem",
            color: "var(--label-tertiary)",
            textAlign: "center",
            letterSpacing: "-0.01em",
          }}
        >
          Make words using the letters in the hive.
          <br />
          Every word must include the{" "}
          <strong style={{ color: "#ff9f0a" }}>golden letter</strong>.
        </p>
      </div>

      {/* Score bar */}
      <div
        className="w-full rounded-2xl px-4 py-3"
        style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-sm)" }}
      >
        <ScoreBar score={score} max={max} foundCount={found.size} />
      </div>

      {/* Input display */}
      <div
        className="w-full rounded-2xl"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-sm)",
          animation: shake ? "shake 0.4s cubic-bezier(0.36,0.07,0.19,0.97)" : "none",
        }}
      >
        <WordInput value={input} center={center} outer={outer} />
      </div>

      {/* Honeycomb */}
      <div
        className="flex items-center justify-center rounded-3xl py-6"
        style={{
          width: "100%",
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <Honeycomb
          center={center}
          outer={outerOrder}
          onLetter={handleLetter}
          disabled={false}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button onClick={handleDelete} className="btn-ghost" disabled={input.length === 0}>
          ⌫ Delete
        </button>
        <button onClick={handleShuffle} className="btn-ghost">
          🔀 Shuffle
        </button>
        <button
          onClick={handleSubmit}
          className="btn-primary"
          disabled={input.length < 4}
        >
          Enter ↵
        </button>
        <button onClick={handleClear} className="btn-ghost" disabled={input.length === 0}>
          ✕ Clear
        </button>
      </div>

      {/* Found words */}
      <div className="w-full flex flex-col gap-2">
        <p
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--label-tertiary)",
            textAlign: "center",
          }}
        >
          Found words ({found.size})
        </p>
        <FoundWordsList words={[...found]} puzzle={puzzle} />
      </div>

      {/* Rank hint */}
      <p
        style={{
          fontSize: "0.72rem",
          color: "var(--label-tertiary)",
          textAlign: "center",
          letterSpacing: "-0.01em",
        }}
      >
        Current rank:{" "}
        <strong style={{ color: rank.color }}>{rank.label}</strong>
        {" · "}Reach <strong style={{ color: "#ff9f0a" }}>Queen Bee 👑</strong> to win!
      </p>

      <button onClick={onNewGame} className="btn-ghost">
        🔄 New Puzzle
      </button>
    </div>
  );
}
