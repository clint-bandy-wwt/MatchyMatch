import { useState, useEffect, useCallback, useRef } from "react";
import Toast from "../Toast";
import { ANAGRAM_WORDS } from "../../data/anagramWords";

// ── Constants ────────────────────────────────────────────────────────────────

const ROUNDS = 5;
const TIME_LIMIT = 30; // seconds per round
const POINTS_TABLE = [
  { threshold: 25, points: 100 },
  { threshold: 20, points: 80 },
  { threshold: 15, points: 60 },
  { threshold: 10, points: 40 },
  { threshold: 0,  points: 20 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scramble(word) {
  // Keep scrambling until the result differs from the original
  let result;
  let attempts = 0;
  do {
    result = shuffle(word.split("")).join("");
    attempts++;
  } while (result === word && attempts < 20);
  return result;
}

function pickRounds(count) {
  const pool = shuffle([...ANAGRAM_WORDS]);
  return pool.slice(0, count).map((entry) => ({
    ...entry,
    scrambled: scramble(entry.word),
  }));
}

function calcPoints(timeLeft) {
  for (const { threshold, points } of POINTS_TABLE) {
    if (timeLeft > threshold) return points;
  }
  return POINTS_TABLE[POINTS_TABLE.length - 1].points;
}

// ── Letter tile ──────────────────────────────────────────────────────────────

function LetterTile({ letter, state, onClick }) {
  // state: 'scrambled' | 'placed' | 'correct' | 'wrong'
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 52,
    height: 52,
    borderRadius: 14,
    fontSize: "1.35rem",
    fontWeight: 700,
    letterSpacing: "-0.01em",
    cursor: state === "placed" ? "default" : "pointer",
    userSelect: "none",
    transition: "background 0.15s ease, transform 0.12s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.15s ease",
  };

  const styles = {
    scrambled: {
      background: "var(--bg-surface)",
      color: "var(--label-primary)",
      border: "0.5px solid rgba(0,0,0,0.10)",
      boxShadow: "var(--shadow-sm)",
    },
    placed: {
      background: "var(--accent-light)",
      color: "var(--accent)",
      border: "1.5px solid var(--accent)",
      boxShadow: "0 0 0 3px rgba(0,122,255,0.10)",
    },
    correct: {
      background: "linear-gradient(145deg, #34c759, #30d158)",
      color: "#fff",
      border: "1.5px solid #28a745",
      boxShadow: "0 4px 14px rgba(52,199,89,0.35)",
    },
    wrong: {
      background: "linear-gradient(145deg, #ff3b30, #ff453a)",
      color: "#fff",
      border: "1.5px solid #e0321f",
      boxShadow: "0 4px 14px rgba(255,59,48,0.35)",
    },
  };

  return (
    <button
      onClick={onClick}
      style={{ ...base, ...styles[state] }}
      aria-label={`Letter ${letter}`}
    >
      {letter}
    </button>
  );
}

// ── Timer ring ───────────────────────────────────────────────────────────────

function TimerRing({ timeLeft, total }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / total;
  const dashOffset = circumference * (1 - progress);

  const color =
    timeLeft > 15 ? "#34c759" : timeLeft > 8 ? "#ff9f0a" : "#ff3b30";

  return (
    <div style={{ position: "relative", width: 60, height: 60 }}>
      <svg width="60" height="60" style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          stroke="var(--fill-tertiary)"
          strokeWidth="4"
        />
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1rem",
          fontWeight: 700,
          color,
          letterSpacing: "-0.02em",
          transition: "color 0.3s ease",
        }}
      >
        {timeLeft}
      </div>
    </div>
  );
}

// ── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 14px",
        borderRadius: 999,
        background: "var(--accent-light)",
        border: "1px solid rgba(0,122,255,0.18)",
      }}
    >
      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Score
      </span>
      <span style={{ fontSize: "1rem", fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.02em" }}>
        {score}
      </span>
    </div>
  );
}

// ── Round result pill ────────────────────────────────────────────────────────

function RoundDot({ status }) {
  // status: 'pending' | 'correct' | 'skipped'
  const colors = {
    pending: "var(--fill-secondary)",
    correct: "#34c759",
    skipped: "#ff3b30",
  };
  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: colors[status],
        transition: "background 0.3s ease",
      }}
    />
  );
}

// ── Main board ───────────────────────────────────────────────────────────────

export default function AnagramBoard() {
  const [gameKey, setGameKey] = useState(0);
  return (
    <Game
      key={gameKey}
      onNewGame={() => setGameKey((k) => k + 1)}
    />
  );
}

function Game({ onNewGame }) {
  const [rounds]         = useState(() => pickRounds(ROUNDS));
  const [roundIndex, setRoundIndex] = useState(0);
  const [timeLeft, setTimeLeft]     = useState(TIME_LIMIT);
  const [score, setScore]           = useState(0);
  const [roundResults, setRoundResults] = useState([]); // 'correct' | 'skipped'
  const [gamePhase, setGamePhase]   = useState("playing"); // 'playing' | 'result' | 'done'

  // Letter interaction state
  const [scrambledSlots, setScrambledSlots] = useState(() =>
    rounds[0].scrambled.split("").map((l, i) => ({ letter: l, id: i, used: false }))
  );
  const [answerSlots, setAnswerSlots] = useState([]); // { letter, sourceId }
  const [revealState, setRevealState] = useState(null); // null | 'correct' | 'wrong'

  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const currentRound = rounds[roundIndex];

  // ── Timer ──────────────────────────────────────────────────────────────────

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => {
    if (gamePhase === "playing") startTimer();
    return stopTimer;
  }, [gamePhase, roundIndex, startTimer, stopTimer]);

  // Declared here (rather than after the effects below, where the flow
  // reads more naturally) so both effects reference an already-declared
  // value instead of a forward reference.
  const advanceRound = (result) => {
    setRoundResults((prev) => {
      const next = [...prev, result];
      const nextIndex = roundIndex + 1;
      if (nextIndex >= ROUNDS) {
        setTimeout(() => setGamePhase("done"), result === "correct" ? 400 : 100);
      } else {
        setTimeout(() => {
          setRoundIndex(nextIndex);
          setTimeLeft(TIME_LIMIT);
          setRevealState(null);
          setAnswerSlots([]);
          setScrambledSlots(
            rounds[nextIndex].scrambled
              .split("")
              .map((l, i) => ({ letter: l, id: i, used: false }))
          );
          setGamePhase("playing");
        }, result === "correct" ? 600 : 200);
      }
      return next;
    });
  };

  const handleSkip = useCallback((timedOut = false) => {
    if (gamePhase !== "playing") return;
    stopTimer();
    if (!timedOut) setToast("Skipped!");
    else setToast(`Time's up! It was ${currentRound.word}`);
    advanceRound("skipped");
  }, [gamePhase, currentRound, stopTimer]);

  // Time ran out. Deferred so the setState calls inside handleSkip don't
  // run synchronously within the effect body.
  useEffect(() => {
    if (timeLeft === 0 && gamePhase === "playing") {
      const id = setTimeout(() => handleSkip(true), 0);
      return () => clearTimeout(id);
    }
  }, [timeLeft, gamePhase]);

  // ── Letter interaction ─────────────────────────────────────────────────────

  const handleScrambledClick = (id) => {
    if (gamePhase !== "playing" || revealState) return;
    const slot = scrambledSlots.find((s) => s.id === id);
    if (!slot || slot.used) return;

    const wordLen = currentRound.word.length;
    if (answerSlots.length >= wordLen) return;

    setScrambledSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, used: true } : s))
    );
    setAnswerSlots((prev) => [...prev, { letter: slot.letter, sourceId: id }]);
  };

  const handleAnswerClick = (idx) => {
    if (gamePhase !== "playing" || revealState) return;
    const removed = answerSlots[idx];
    setAnswerSlots((prev) => prev.filter((_, i) => i !== idx));
    setScrambledSlots((prev) =>
      prev.map((s) => (s.id === removed.sourceId ? { ...s, used: false } : s))
    );
  };

  // Auto-submit when all letters placed. The state updates are deferred
  // (rather than called directly in the effect body) so they don't run
  // synchronously within the effect.
  useEffect(() => {
    if (
      gamePhase === "playing" &&
      !revealState &&
      answerSlots.length === currentRound.word.length
    ) {
      const attempt = answerSlots.map((s) => s.letter).join("");
      const id = setTimeout(() => {
        if (attempt === currentRound.word) {
          stopTimer();
          const pts = calcPoints(timeLeft);
          setRevealState("correct");
          setScore((s) => s + pts);
          setToast(`+${pts} pts`);
          setTimeout(() => advanceRound("correct"), 1200);
        } else {
          setRevealState("wrong");
          setTimeout(() => {
            setRevealState(null);
            // Return all letters to scrambled row
            setAnswerSlots([]);
            setScrambledSlots((prev) => prev.map((s) => ({ ...s, used: false })));
          }, 700);
        }
      }, 0);
      return () => clearTimeout(id);
    }
  }, [answerSlots]);

  const handleClear = () => {
    if (gamePhase !== "playing" || revealState) return;
    setAnswerSlots([]);
    setScrambledSlots((prev) => prev.map((s) => ({ ...s, used: false })));
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const correctCount = roundResults.filter((r) => r === "correct").length;
  const maxScore = ROUNDS * POINTS_TABLE[0].points;

  // Build round dots (past + current + future)
  const dots = Array.from({ length: ROUNDS }, (_, i) => {
    if (i < roundResults.length) return roundResults[i];
    return "pending";
  });

  if (gamePhase === "done") {
    const pct = Math.round((score / maxScore) * 100);
    const emoji =
      pct >= 90 ? "🏆" : pct >= 70 ? "🎉" : pct >= 50 ? "😊" : "💪";
    const msg =
      pct >= 90
        ? "Anagram Master!"
        : pct >= 70
        ? "Great work!"
        : pct >= 50
        ? "Not bad!"
        : "Keep practising!";

    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
        <div
          className="spring-pop flex flex-col items-center gap-6 p-8 rounded-3xl w-full"
          style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-xl)" }}
        >
          {/* Icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 22,
              background: "linear-gradient(145deg, #007aff, #5856d6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              boxShadow: "0 8px 28px rgba(0,122,255,0.35)",
            }}
          >
            {emoji}
          </div>

          {/* Headline */}
          <div className="flex flex-col items-center gap-1">
            <h2
              style={{
                fontSize: "1.9rem",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: "var(--label-primary)",
              }}
            >
              {msg}
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--label-tertiary)", letterSpacing: "-0.01em" }}>
              {correctCount} of {ROUNDS} words solved
            </p>
          </div>

          {/* Score */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "16px 32px",
              borderRadius: 18,
              background: "var(--accent-light)",
              border: "1px solid rgba(0,122,255,0.15)",
            }}
          >
            <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Final Score
            </span>
            <span style={{ fontSize: "2.8rem", fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.04em", lineHeight: 1 }}>
              {score}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--label-tertiary)" }}>
              out of {maxScore}
            </span>
          </div>

          {/* Round breakdown */}
          <div className="flex flex-col gap-2 w-full">
            {rounds.map((r, i) => {
              const res = roundResults[i];
              const icon = res === "correct" ? "✓" : res === "skipped" ? "✗" : "–";
              const color = res === "correct" ? "#34c759" : res === "skipped" ? "#ff3b30" : "var(--label-quaternary)";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 12,
                    background: "var(--fill-quaternary)",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--label-secondary)", letterSpacing: "0.04em" }}>
                    {r.word}
                  </span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color }}>
                    {icon}
                  </span>
                </div>
              );
            })}
          </div>

          <button onClick={onNewGame} className="btn-primary w-full" style={{ justifyContent: "center" }}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Header row: round dots + score */}
      <div className="flex items-center justify-between w-full">
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {dots.map((status, i) => (
            <RoundDot key={i} status={status} />
          ))}
          <span style={{ fontSize: "0.75rem", color: "var(--label-tertiary)", marginLeft: 6, letterSpacing: "-0.01em" }}>
            Round {roundIndex + 1}/{ROUNDS}
          </span>
        </div>
        <ScoreBadge score={score} />
      </div>

      {/* Timer + hint */}
      <div className="flex flex-col items-center gap-2">
        <TimerRing timeLeft={timeLeft} total={TIME_LIMIT} />
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--label-tertiary)",
            letterSpacing: "-0.01em",
            fontStyle: "italic",
          }}
        >
          {currentRound.hint}
        </p>
      </div>

      {/* Answer slots */}
      <div
        style={{
          minHeight: 64,
          width: "100%",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          alignItems: "center",
          padding: "12px 16px",
          borderRadius: 18,
          background: "var(--fill-quaternary)",
          border: "1.5px dashed var(--separator)",
          transition: "border-color 0.2s ease",
          borderColor:
            revealState === "correct"
              ? "#34c759"
              : revealState === "wrong"
              ? "#ff3b30"
              : "var(--separator)",
        }}
      >
        {answerSlots.length === 0 ? (
          <span style={{ fontSize: "0.8rem", color: "var(--label-quaternary)", letterSpacing: "-0.01em" }}>
            Tap letters below to build the word
          </span>
        ) : (
          answerSlots.map((slot, idx) => (
            <LetterTile
              key={idx}
              letter={slot.letter}
              index={idx}
              state={
                revealState === "correct"
                  ? "correct"
                  : revealState === "wrong"
                  ? "wrong"
                  : "placed"
              }
              onClick={() => handleAnswerClick(idx)}
            />
          ))
        )}
      </div>

      {/* Scrambled letters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          width: "100%",
        }}
      >
        {scrambledSlots.map((slot) => (
          <LetterTile
            key={slot.id}
            letter={slot.used ? "" : slot.letter}
            index={slot.id}
            state={slot.used ? "placed" : "scrambled"}
            onClick={() => handleScrambledClick(slot.id)}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        <button
          onClick={handleClear}
          disabled={answerSlots.length === 0 || !!revealState}
          className="btn-outline"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
          </svg>
          Clear
        </button>
        <button
          onClick={() => handleSkip(false)}
          disabled={!!revealState}
          className="btn-outline"
          style={{ color: "var(--label-tertiary)" }}
        >
          Skip
        </button>
      </div>

      {/* Scoring guide */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {POINTS_TABLE.map(({ threshold, points }, i) => {
          const nextThreshold = i === 0 ? TIME_LIMIT : POINTS_TABLE[i - 1].threshold;
          const active = timeLeft <= nextThreshold && timeLeft > threshold;
          return (
            <div
              key={i}
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: "0.7rem",
                fontWeight: 600,
                letterSpacing: "0.02em",
                background: active ? "var(--accent)" : "var(--fill-quaternary)",
                color: active ? "#fff" : "var(--label-tertiary)",
                transition: "background 0.3s ease, color 0.3s ease",
              }}
            >
              {points}pts
            </div>
          );
        })}
      </div>
    </div>
  );
}
