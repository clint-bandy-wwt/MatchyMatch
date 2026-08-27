import { useState, useEffect, useRef, useCallback } from "react";
import { clsx } from "clsx";
import Toast from "../Toast";
import { pickProblems } from "../../data/mathQuizProblems";

const TOTAL_QUESTIONS = 10;
const TIME_PER_QUESTION = 15; // seconds

// ── Tier badge ────────────────────────────────────────────────────────────────

const TIER_META = {
  1: { label: "Easy",   color: "#34c759", bg: "rgba(52,199,89,0.12)"   },
  2: { label: "Medium", color: "#ff9f0a", bg: "rgba(255,159,10,0.12)"  },
  3: { label: "Hard",   color: "#ff3b30", bg: "rgba(255,59,48,0.12)"   },
};

function TierBadge({ tier }) {
  const meta = TIER_META[tier] || TIER_META[1];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 999,
        background: meta.bg,
        color: meta.color,
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
      }}
    >
      {meta.label}
    </span>
  );
}

// ── Countdown ring ────────────────────────────────────────────────────────────

function CountdownRing({ timeLeft, total }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const pct = timeLeft / total;
  const color = timeLeft <= 5 ? "#ff3b30" : timeLeft <= 10 ? "#ff9f0a" : "#34c759";

  return (
    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--fill-tertiary)" strokeWidth="5" />
        <circle
          cx="28" cy="28" r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s ease" }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1rem",
          fontWeight: 800,
          color,
          letterSpacing: "-0.03em",
          transition: "color 0.3s ease",
        }}
      >
        {timeLeft}
      </span>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--label-tertiary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Question {current} of {total}
        </span>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--accent)", letterSpacing: "0.02em" }}>
          {pct}%
        </span>
      </div>
      <div style={{ width: "100%", height: 6, borderRadius: 999, background: "var(--fill-tertiary)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 999,
            background: "linear-gradient(90deg, var(--accent), #5856d6)",
            transition: "width 0.4s cubic-bezier(0.34,1.2,0.64,1)",
          }}
        />
      </div>
    </div>
  );
}

// ── Summary row ───────────────────────────────────────────────────────────────

function SummaryRow({ problem, userAnswer, timeTaken, index }) {
  const correct = userAnswer !== null && Number(userAnswer) === problem.answer;
  const skipped = userAnswer === null;
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        background: correct
          ? "rgba(52,199,89,0.07)"
          : skipped
          ? "rgba(120,120,128,0.07)"
          : "rgba(255,59,48,0.07)",
        border: `0.5px solid ${correct ? "rgba(52,199,89,0.25)" : skipped ? "rgba(120,120,128,0.2)" : "rgba(255,59,48,0.25)"}`,
      }}
    >
      <span style={{ fontSize: "0.9rem", fontWeight: 700, flexShrink: 0, color: correct ? "#1a7a35" : skipped ? "var(--label-tertiary)" : "#c0392b" }}>
        {correct ? "✓" : skipped ? "—" : "✗"}
      </span>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--label-primary)", letterSpacing: "-0.01em" }}>
          {index + 1}. {problem.question} = ?
        </p>
        {!correct && (
          <p style={{ fontSize: "0.75rem", color: "var(--label-tertiary)" }}>
            {skipped ? "Time ran out" : <>Your answer: <span style={{ color: "#c0392b", fontWeight: 600 }}>{userAnswer}</span></>}
            {" · "}Correct: <span style={{ color: "#1a7a35", fontWeight: 600 }}>{problem.answer}</span>
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <TierBadge tier={problem.tier} />
        {timeTaken !== null && (
          <span style={{ fontSize: "0.68rem", color: "var(--label-tertiary)", fontWeight: 500 }}>
            {timeTaken.toFixed(1)}s
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function MathQuizBoard() {
  const [problems] = useState(() => pickProblems(TOTAL_QUESTIONS));
  const [gameKey, setGameKey] = useState(0);

  return (
    <Game
      key={gameKey}
      problems={problems}
      onNewGame={() => setGameKey((k) => k + 1)}
    />
  );
}

// ── Game ──────────────────────────────────────────────────────────────────────

function Game({ problems, onNewGame }) {
  const [qIndex, setQIndex]         = useState(0);
  const [input, setInput]           = useState("");
  const [answered, setAnswered]     = useState(false);   // locked in for this question
  const [isCorrect, setIsCorrect]   = useState(null);    // true | false | null
  const [score, setScore]           = useState(0);
  const [timeLeft, setTimeLeft]     = useState(TIME_PER_QUESTION);
  const [gameState, setGameState]   = useState("playing"); // 'playing' | 'done'
  const [toast, setToast]           = useState(null);
  const [shaking, setShaking]       = useState(false);
  const [totalTime, setTotalTime]   = useState(0);

  // Per-question records: { userAnswer: string|null, timeTaken: number|null }
  const [records, setRecords] = useState([]);

  const inputRef  = useRef(null);
  // Date.now() is impure, so the ref starts empty and is set in an effect
  // below (and reset again in handleNext for subsequent questions).
  const startTime = useRef(null);

  const problem = problems[qIndex];

  const showToast = useCallback((msg) => setToast(msg), []);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 450);
  };

  const handleTimeout = useCallback(() => {
    const elapsed = (Date.now() - startTime.current) / 1000;
    setAnswered(true);
    setIsCorrect(false);
    setRecords((prev) => [...prev, { userAnswer: null, timeTaken: null }]);
    setTotalTime((t) => t + elapsed);
    triggerShake();
    showToast("Time's up! ⏰");
  }, [showToast]);

  // Start the clock for the first question on mount.
  useEffect(() => {
    startTime.current = Date.now();
  }, []);

  // Focus input on mount and question change
  useEffect(() => {
    if (gameState === "playing" && !answered) {
      inputRef.current?.focus();
    }
  }, [qIndex, gameState, answered]);

  // Countdown timer
  useEffect(() => {
    if (answered || gameState !== "playing") return;

    if (timeLeft <= 0) {
      // Time's up — auto-skip. Deferred (rather than calling handleTimeout
      // synchronously) so the resulting setState calls don't run directly
      // within the effect body.
      const id = setTimeout(handleTimeout, 0);
      return () => clearTimeout(id);
    }

    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, answered, gameState]);

  const handleSubmit = () => {
    if (answered || input.trim() === "") return;

    const elapsed = parseFloat(((Date.now() - startTime.current) / 1000).toFixed(1));
    const numAnswer = Number(input.trim());
    const correct = numAnswer === problem.answer;

    setAnswered(true);
    setIsCorrect(correct);
    setTotalTime((t) => t + elapsed);
    setRecords((prev) => [...prev, { userAnswer: input.trim(), timeTaken: elapsed }]);

    if (correct) {
      setScore((s) => s + 1);
      showToast("Correct! 🎉");
    } else {
      triggerShake();
      showToast(`Wrong! Answer: ${problem.answer} 😬`);
    }
  };

  const handleNext = () => {
    const isLast = qIndex === problems.length - 1;
    if (isLast) {
      setGameState("done");
    } else {
      setQIndex((i) => i + 1);
      setInput("");
      setAnswered(false);
      setIsCorrect(null);
      setTimeLeft(TIME_PER_QUESTION);
      startTime.current = Date.now();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (!answered) {
        handleSubmit();
      } else {
        handleNext();
      }
    }
  };

  // ── Result screen ──────────────────────────────────────────────────
  if (gameState === "done") {
    const pct = Math.round((score / TOTAL_QUESTIONS) * 100);
    const avgTime = records.filter((r) => r.timeTaken !== null).reduce((a, r) => a + r.timeTaken, 0) /
      (records.filter((r) => r.timeTaken !== null).length || 1);

    const resultEmoji =
      pct === 100 ? "🏆" :
      pct >= 80   ? "🌟" :
      pct >= 60   ? "👍" :
      pct >= 40   ? "🤔" : "📐";

    const resultTitle =
      pct === 100 ? "Perfect score!" :
      pct >= 80   ? "Math whiz!" :
      pct >= 60   ? "Good work!" :
      pct >= 40   ? "Keep practising!" : "Back to basics!";

    return (
      <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto">
        {/* Score card */}
        <div
          className="spring-pop flex flex-col items-center gap-5 p-8 rounded-3xl w-full"
          style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-xl)" }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 22,
              background: pct >= 60
                ? "linear-gradient(145deg, #34c759, #30d158)"
                : "linear-gradient(145deg, #ff9f0a, #ff6b00)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              boxShadow: pct >= 60
                ? "0 8px 24px rgba(52,199,89,0.35)"
                : "0 8px 24px rgba(255,159,10,0.35)",
            }}
          >
            {resultEmoji}
          </div>

          <div className="flex flex-col items-center gap-1">
            <h2 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--label-primary)" }}>
              {resultTitle}
            </h2>
            <p style={{ fontSize: "1rem", color: "var(--label-tertiary)", letterSpacing: "-0.01em" }}>
              You scored{" "}
              <span style={{ color: "var(--label-primary)", fontWeight: 700 }}>{score}</span>
              {" "}out of{" "}
              <span style={{ color: "var(--label-primary)", fontWeight: 700 }}>{TOTAL_QUESTIONS}</span>
            </p>
          </div>

          {/* Score ring */}
          <div className="flex items-center justify-center" style={{ position: "relative", width: 100, height: 100 }}>
            <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--fill-tertiary)" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={pct >= 60 ? "#34c759" : "#ff9f0a"}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
                style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.34,1.2,0.64,1)" }}
              />
            </svg>
            <span style={{ position: "absolute", fontSize: "1.4rem", fontWeight: 800, color: "var(--label-primary)", letterSpacing: "-0.03em" }}>
              {pct}%
            </span>
          </div>

          {/* Stats row */}
          <div className="flex gap-6 w-full justify-center">
            <div className="flex flex-col items-center gap-0.5">
              <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--label-primary)", letterSpacing: "-0.03em" }}>
                {avgTime.toFixed(1)}s
              </span>
              <span style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--label-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Avg time
              </span>
            </div>
            <div style={{ width: 1, background: "var(--separator)", alignSelf: "stretch" }} />
            <div className="flex flex-col items-center gap-0.5">
              <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--label-primary)", letterSpacing: "-0.03em" }}>
                {totalTime.toFixed(0)}s
              </span>
              <span style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--label-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Total time
              </span>
            </div>
          </div>

          <button onClick={onNewGame} className="btn-primary">
            Play Again
          </button>
        </div>

        {/* Answer review */}
        <div className="w-full flex flex-col gap-2">
          <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--label-tertiary)", marginBottom: 4 }}>
            Review
          </p>
          {problems.map((p, i) => (
            <SummaryRow
              key={p.id}
              problem={p}
              userAnswer={records[i]?.userAnswer ?? null}
              timeTaken={records[i]?.timeTaken ?? null}
              index={i}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Playing screen ─────────────────────────────────────────────────
  const cardBorder =
    isCorrect === true  ? "rgba(52,199,89,0.5)"  :
    isCorrect === false ? "rgba(255,59,48,0.5)"  :
    "transparent";

  const cardBg =
    isCorrect === true  ? "rgba(52,199,89,0.06)"  :
    isCorrect === false ? "rgba(255,59,48,0.06)"  :
    "var(--bg-surface)";

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto">
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* Progress */}
      <ProgressBar current={qIndex + 1} total={TOTAL_QUESTIONS} />

      {/* Score badge */}
      <div className="self-end flex items-center gap-1.5">
        <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--label-tertiary)" }}>Score:</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 10px",
            borderRadius: 999,
            background: "var(--accent-light)",
            color: "var(--accent)",
            fontSize: "0.8rem",
            fontWeight: 700,
          }}
        >
          {score} / {TOTAL_QUESTIONS}
        </span>
      </div>

      {/* Question card */}
      <div
        className={clsx("w-full rounded-3xl p-6 flex flex-col gap-5", shaking && "wordle-shake")}
        style={{
          background: cardBg,
          boxShadow: "var(--shadow-md)",
          border: `1.5px solid ${cardBorder}`,
          transition: "background 0.25s ease, border-color 0.25s ease",
        }}
      >
        {/* Top row: tier badge + timer */}
        <div className="flex items-center justify-between">
          <TierBadge tier={problem.tier} />
          <CountdownRing timeLeft={timeLeft} total={TIME_PER_QUESTION} />
        </div>

        {/* Problem */}
        <div className="flex flex-col items-center gap-2 py-2">
          <p
            style={{
              fontSize: "clamp(2rem, 8vw, 3rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "var(--label-primary)",
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            {problem.question} = ?
          </p>
        </div>

        {/* Answer input */}
        <div className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={input}
            onChange={(e) => !answered && setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={answered}
            placeholder="Your answer…"
            style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: 16,
              border: `1.5px solid ${
                isCorrect === true  ? "rgba(52,199,89,0.6)"  :
                isCorrect === false ? "rgba(255,59,48,0.5)"  :
                "var(--separator)"
              }`,
              background: "var(--bg-base)",
              color: "var(--label-primary)",
              fontSize: "1.3rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              textAlign: "center",
              outline: "none",
              transition: "border-color 0.2s ease",
              fontFamily: "var(--font-system)",
            }}
          />

          {/* Feedback line */}
          {answered && (
            <p
              className="fade-up text-center"
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: isCorrect ? "#1a7a35" : "#c0392b",
                letterSpacing: "-0.01em",
              }}
            >
              {isCorrect
                ? "✓ Correct!"
                : `✗ The answer was ${problem.answer}`}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 w-full justify-center mt-1">
        {!answered ? (
          <button
            onClick={handleSubmit}
            disabled={input.trim() === ""}
            className="btn-primary"
            style={{ minWidth: 140 }}
          >
            Submit
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="btn-primary"
            style={{ minWidth: 140 }}
          >
            {qIndex === problems.length - 1 ? "See Results →" : "Next →"}
          </button>
        )}
      </div>

      {/* Hint */}
      {!answered && (
        <p
          className="text-center"
          style={{ fontSize: "0.78rem", color: "var(--label-tertiary)", letterSpacing: "-0.01em", maxWidth: 300 }}
        >
          Type your answer and press <strong>Submit</strong> or hit <strong>Enter</strong>.
        </p>
      )}
    </div>
  );
}
