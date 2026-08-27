import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import Toast from "../Toast";
import { pickDailyWord, scrambleWord, SCRAMBLE_WORDS } from "../../data/scrambleWords";

const MAX_WRONG = 5; // wrong submissions allowed

// ── Letter tile (scrambled pool) ─────────────────────────────────────────────

function PoolTile({ letter, index, state, onClick }) {
  // state: 'idle' | 'used' | 'wrong'
  return (
    <button
      onClick={() => state === "idle" && onClick(index)}
      disabled={state === "used"}
      aria-label={state === "used" ? "used" : letter}
      className="tile-transition relative flex items-center justify-center rounded-2xl select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      style={{
        width: 52,
        height: 52,
        fontSize: "1.35rem",
        fontWeight: 700,
        letterSpacing: "-0.01em",
        cursor: state === "used" ? "default" : "pointer",
        ...(state === "used"
          ? {
              background: "var(--fill-quaternary)",
              border: "1.5px dashed var(--separator-opaque)",
              color: "transparent",
              boxShadow: "none",
            }
          : state === "wrong"
          ? {
              background: "rgba(255,59,48,0.12)",
              border: "1.5px solid rgba(255,59,48,0.5)",
              color: "#ff3b30",
              boxShadow: "none",
            }
          : {
              background: "var(--bg-surface)",
              border: "0.5px solid rgba(0,0,0,0.08)",
              color: "var(--label-primary)",
              boxShadow: "var(--shadow-sm)",
            }),
      }}
    >
      {state !== "used" ? letter : ""}
    </button>
  );
}

// ── Answer slot ───────────────────────────────────────────────────────────────

function AnswerSlot({ letter, slotIndex, isWrong, onRemove }) {
  const filled = letter !== null;
  return (
    <button
      onClick={() => filled && onRemove(slotIndex)}
      aria-label={filled ? `Remove ${letter}` : "empty slot"}
      className="tile-transition relative flex items-center justify-center rounded-2xl select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      style={{
        width: 52,
        height: 52,
        fontSize: "1.35rem",
        fontWeight: 700,
        letterSpacing: "-0.01em",
        cursor: filled ? "pointer" : "default",
        ...(filled && isWrong
          ? {
              background: "rgba(255,59,48,0.12)",
              border: "1.5px solid rgba(255,59,48,0.5)",
              color: "#ff3b30",
              boxShadow: "none",
            }
          : filled
          ? {
              background: "var(--accent-light)",
              border: "1.5px solid var(--accent)",
              color: "var(--accent)",
              boxShadow: "0 0 0 3px rgba(0,122,255,0.10)",
            }
          : {
              background: "var(--fill-quaternary)",
              border: "1.5px dashed var(--separator-opaque)",
              color: "transparent",
              boxShadow: "none",
            }),
      }}
    >
      {filled ? letter : ""}
    </button>
  );
}

// ── Main board ────────────────────────────────────────────────────────────────

export default function ScrambleBoard() {
  const [entry, setEntry] = useState(() => pickDailyWord());
  const [gameKey, setGameKey] = useState(0);

  const handleNewGame = () => {
    // Pick a random word for "play again"
    const next = SCRAMBLE_WORDS[Math.floor(Math.random() * SCRAMBLE_WORDS.length)];
    setEntry(next);
    setGameKey((k) => k + 1);
  };

  return <Game key={gameKey} entry={entry} onNewGame={handleNewGame} />;
}

function Game({ entry, onNewGame }) {
  const { word, hint } = entry;

  // Scrambled letters as an array of { letter, poolIndex }
  const [scrambled] = useState(() => {
    const s = scrambleWord(word);
    return s.split("").map((letter, i) => ({ letter, poolIndex: i }));
  });

  // Which pool indices have been placed into the answer slots
  const [answer, setAnswer] = useState(() => Array(word.length).fill(null));
  // answer[i] = poolIndex of the letter placed there, or null

  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [gameState, setGameState] = useState("playing"); // 'playing' | 'won' | 'lost'
  const [toast, setToast] = useState(null);
  const [isWrong, setIsWrong] = useState(false); // flash wrong state on answer row
  const [hintVisible, setHintVisible] = useState(false);

  const showToast = useCallback((msg) => setToast(msg), []);

  const handleSubmit = useCallback(() => {
    if (gameState !== "playing") return;
    if (answer.some((v) => v === null)) {
      showToast("Fill all the letters first!");
      return;
    }

    const guess = answer.map((poolIdx) => scrambled.find((s) => s.poolIndex === poolIdx).letter).join("");

    if (guess === word) {
      setGameState("won");
      return;
    }

    // Wrong
    const newWrong = wrongGuesses + 1;
    setWrongGuesses(newWrong);
    setIsWrong(true);
    setTimeout(() => setIsWrong(false), 600);

    if (newWrong >= MAX_WRONG) {
      setGameState("lost");
      return;
    }

    const remaining = MAX_WRONG - newWrong;
    showToast(remaining === 1 ? "Last chance!" : `Not quite — ${remaining} tries left`);
    // Clear answer for next attempt
    setTimeout(() => setAnswer(Array(word.length).fill(null)), 400);
  }, [gameState, answer, word, scrambled, wrongGuesses]);

  // Keyboard support
  useEffect(() => {
    if (gameState !== "playing") return;
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();

      if (key === "BACKSPACE" || key === "DELETE") {
        // Remove last placed letter
        setAnswer((prev) => {
          const lastFilled = [...prev].reverse().findIndex((v) => v !== null);
          if (lastFilled === -1) return prev;
          const idx = prev.length - 1 - lastFilled;
          const next = [...prev];
          next[idx] = null;
          return next;
        });
        return;
      }
      if (key === "ENTER") {
        handleSubmit();
        return;
      }
      if (/^[A-Z]$/.test(key)) {
        // Find first available pool tile with this letter
        setAnswer((prev) => {
          const usedIndices = new Set(prev.filter((v) => v !== null));
          const poolIdx = scrambled.findIndex(
            ({ letter, poolIndex }) => letter === key && !usedIndices.has(poolIndex)
          );
          if (poolIdx === -1) return prev;
          const slotIdx = prev.findIndex((v) => v === null);
          if (slotIdx === -1) return prev;
          const next = [...prev];
          next[slotIdx] = scrambled[poolIdx].poolIndex;
          return next;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameState, scrambled]);

  const usedPoolIndices = new Set(answer.filter((v) => v !== null));

  const handlePoolTileClick = (poolIndex) => {
    if (gameState !== "playing") return;
    const slotIdx = answer.findIndex((v) => v === null);
    if (slotIdx === -1) return; // all slots filled
    setAnswer((prev) => {
      const next = [...prev];
      next[slotIdx] = poolIndex;
      return next;
    });
  };

  const handleSlotRemove = (slotIndex) => {
    if (gameState !== "playing") return;
    setAnswer((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  };

  const handleClear = () => {
    setAnswer(Array(word.length).fill(null));
  };

  const allFilled = answer.every((v) => v !== null);
  const livesLeft = MAX_WRONG - wrongGuesses;

  // Split long words across two rows if > 8 letters
  const needsWrap = word.length > 8;
  const firstRow  = needsWrap ? answer.slice(0, Math.ceil(word.length / 2)) : answer;
  const secondRow = needsWrap ? answer.slice(Math.ceil(word.length / 2))    : [];
  const firstRowStart  = 0;
  const secondRowStart = Math.ceil(word.length / 2);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Lives */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: MAX_WRONG }).map((_, i) => (
          <span
            key={i}
            style={{
              fontSize: "1.1rem",
              opacity: i < livesLeft ? 1 : 0.2,
              transition: "opacity 0.3s ease",
            }}
          >
            ❤️
          </span>
        ))}
      </div>

      {/* Hint toggle */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => setHintVisible((v) => !v)}
          className="btn-ghost"
          style={{ fontSize: "0.8rem", padding: "6px 14px" }}
        >
          {hintVisible ? "Hide hint" : "Show hint 💡"}
        </button>
        {hintVisible && (
          <p
            className="fade-in text-center"
            style={{
              fontSize: "0.9rem",
              color: "var(--label-secondary)",
              fontStyle: "italic",
              letterSpacing: "-0.01em",
              maxWidth: 280,
            }}
          >
            "{hint}"
          </p>
        )}
      </div>

      {/* Scrambled pool */}
      <div className="flex flex-col items-center gap-3">
        <p
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--label-tertiary)",
          }}
        >
          Scrambled
        </p>
        <div
          className="flex flex-wrap justify-center gap-2"
          style={{ maxWidth: 340 }}
        >
          {scrambled.map(({ letter, poolIndex }) => (
            <PoolTile
              key={poolIndex}
              letter={letter}
              index={poolIndex}
              state={usedPoolIndices.has(poolIndex) ? "used" : "idle"}
              onClick={handlePoolTileClick}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          width: "100%",
          height: "0.5px",
          background: "var(--separator)",
        }}
      />

      {/* Answer slots */}
      <div className="flex flex-col items-center gap-3">
        <p
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--label-tertiary)",
          }}
        >
          Your answer
        </p>

        <div className={clsx("flex flex-col items-center gap-2", isWrong && "wordle-shake")}>
          {/* First row (or only row) */}
          <div className="flex flex-wrap justify-center gap-2">
            {firstRow.map((poolIdx, i) => (
              <AnswerSlot
                key={firstRowStart + i}
                letter={poolIdx !== null ? scrambled.find((s) => s.poolIndex === poolIdx).letter : null}
                slotIndex={firstRowStart + i}
                isWrong={isWrong}
                onRemove={handleSlotRemove}
              />
            ))}
          </div>
          {/* Second row (long words) */}
          {needsWrap && (
            <div className="flex flex-wrap justify-center gap-2">
              {secondRow.map((poolIdx, i) => (
                <AnswerSlot
                  key={secondRowStart + i}
                  letter={poolIdx !== null ? scrambled.find((s) => s.poolIndex === poolIdx).letter : null}
                  slotIndex={secondRowStart + i}
                  isWrong={isWrong}
                  onRemove={handleSlotRemove}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {gameState === "playing" && (
        <div className="flex gap-2 flex-wrap justify-center">
          <button
            onClick={handleClear}
            disabled={answer.every((v) => v === null)}
            className="btn-outline"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
            </svg>
            Clear
          </button>
          <button
            onClick={handleSubmit}
            disabled={!allFilled}
            className="btn-primary"
          >
            Submit
          </button>
        </div>
      )}

      {/* Instructions */}
      {gameState === "playing" && answer.every((v) => v === null) && (
        <p
          className="text-center"
          style={{
            fontSize: "0.8rem",
            color: "var(--label-tertiary)",
            letterSpacing: "-0.01em",
            maxWidth: 300,
          }}
        >
          Tap the scrambled letters in the right order to spell the hidden word. Tap a placed letter to remove it.
        </p>
      )}

      {/* Win state */}
      {gameState === "won" && (
        <div
          className="spring-pop flex flex-col items-center gap-6 mt-2 p-8 rounded-3xl w-full"
          style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-xl)" }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(145deg, #34c759, #30d158)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              boxShadow: "0 8px 24px rgba(52,199,89,0.35)",
            }}
          >
            🎉
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <h2
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--label-primary)",
              }}
            >
              {wrongGuesses === 0 ? "First try!" : wrongGuesses === 1 ? "Nice work!" : "You got it!"}
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--label-tertiary)", letterSpacing: "-0.01em" }}>
              The word was{" "}
              <span style={{ color: "var(--label-primary)", fontWeight: 700, letterSpacing: "0.06em" }}>
                {word}
              </span>
              {wrongGuesses > 0 && (
                <>
                  {" "}— solved with{" "}
                  <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                    {wrongGuesses} wrong {wrongGuesses === 1 ? "guess" : "guesses"}
                  </span>
                </>
              )}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--label-tertiary)", fontStyle: "italic", marginTop: 4 }}>
              "{hint}"
            </p>
          </div>
          <button onClick={onNewGame} className="btn-primary">
            New Word
          </button>
        </div>
      )}

      {/* Lose state */}
      {gameState === "lost" && (
        <div
          className="spring-pop flex flex-col items-center gap-6 mt-2 p-8 rounded-3xl w-full"
          style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-xl)" }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(145deg, #ff9f0a, #ff6b00)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              boxShadow: "0 8px 24px rgba(255,159,10,0.35)",
            }}
          >
            😵
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <h2
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: "var(--label-primary)",
              }}
            >
              Out of tries!
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--label-tertiary)", letterSpacing: "-0.01em" }}>
              The word was{" "}
              <span style={{ color: "var(--label-primary)", fontWeight: 700, letterSpacing: "0.06em" }}>
                {word}
              </span>
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--label-tertiary)", fontStyle: "italic", marginTop: 4 }}>
              "{hint}"
            </p>
          </div>
          <button onClick={onNewGame} className="btn-primary">
            Try Another
          </button>
        </div>
      )}
    </div>
  );
}
