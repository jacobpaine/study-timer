import React, { useState, useEffect, useRef } from "react";

type Mode = "focus" | "shortBreak" | "longBreak";
type Tone = {
  frequency: number;
  duration: number;
  type?: OscillatorType;
};

const playMelody = (tones: Tone[], delayBetween = 0.05) => {
  const ctx = new AudioContext();
  let currentTime = ctx.currentTime;

  tones.forEach(({ frequency, duration, type = "sine" }) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    gainNode.gain.setValueAtTime(1, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);

    currentTime += duration + delayBetween;
  });
};

const focusStartMelody = [
  { frequency: 440, duration: 0.25 }, // A4
  { frequency: 660, duration: 0.25 }, // E5
  { frequency: 880, duration: 0.35 }, // A5
];

const breakStartMelody = [
  { frequency: 660, duration: 0.2, type: "triangle" },
  { frequency: 520, duration: 0.2, type: "triangle" },
  { frequency: 390, duration: 0.3, type: "triangle" },
];

const sessionEndMelody = [
  { frequency: 784, duration: 0.2 }, // G5
  { frequency: 659, duration: 0.2 }, // E5
  { frequency: 523, duration: 0.3 }, // C5
];

const playTone = (
  frequency: number,
  duration: number,
  type: OscillatorType = "sine"
) => {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  oscillator.start();

  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.currentTime + duration
  );
  oscillator.stop(ctx.currentTime + duration);
};

const playFocusStartTone = () => playTone(880, 0.4, "sine");
const playBreakStartTone = () => playTone(660, 0.4, "triangle");
const playSessionEndTone = () => playTone(440, 0.6, "square");

const Timer: React.FC<{ storageKey?: string }> = ({ storageKey = "timer" }) => {
  const [completedCounts, setCompletedCounts] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved
      ? JSON.parse(saved).completedCounts || {
          focus: 0,
          shortBreak: 0,
          longBreak: 0,
        }
      : { focus: 0, shortBreak: 0, longBreak: 0 };
  });

  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved).mode || "focus" : "focus";
  });

  const [isRunning, setIsRunning] = useState(false);

  const [sessions, setSessions] = useState(0);
  const [title, setTitle] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved).title || "Timer" : "Timer";
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [durations, setDurations] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved
      ? JSON.parse(saved).durations || {
          focus: 1500,
          shortBreak: 300,
          longBreak: 900,
        }
      : { focus: 1500, shortBreak: 300, longBreak: 900 };
  });

  const [secondsLeft, setSecondsLeft] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved).secondsLeft || 1500 : 1500;
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev === 0) {
            handleSessionEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(intervalRef.current!);
  }, [isRunning]);

  useEffect(() => {
    setSecondsLeft(secondsLeft);
  }, [mode, durations]);

  useEffect(() => {
    const data = {
      title,
      completedCounts,
      durations,
      mode,
      secondsLeft,
      isRunning,
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [title, completedCounts, durations, mode, secondsLeft, isRunning]);

  const handleSessionEnd = () => {
    setIsRunning(false);
    setCompletedCounts((prev) => ({
      ...prev,
      [mode]: prev[mode] + 1,
    }));
    if (mode === "focus") {
      const nextMode = (sessions + 1) % 4 === 0 ? "longBreak" : "shortBreak";
      setMode(nextMode);
      setSessions((s) => s + 1);
      playMelody(sessionEndMelody);
    } else {
      setMode("focus");
    }
  };

  const handleDurationChange = (newValue: number, targetMode: Mode) => {
    setDurations((prev) => ({
      ...prev,
      [targetMode]: newValue * 60,
    }));

    if (mode === targetMode) {
      setSecondsLeft(newValue * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progressPercent = 100 - (secondsLeft / durations[mode]) * 100;

  return (
    <div className="timer">
      <div className="scoreboard">
        <span>🎯 Focus: {completedCounts.focus}</span>
        <span>☕ Short: {completedCounts.shortBreak}</span>
        <span>🛌 Long: {completedCounts.longBreak}</span>
      </div>
      <div className="timer-title">
        {isEditingTitle ? (
          <input
            type="text"
            value={title}
            autoFocus
            onBlur={() => setIsEditingTitle(false)}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setIsEditingTitle(false);
            }}
          />
        ) : (
          <h2
            onClick={() => setIsEditingTitle(true)}
            title="Click to edit title"
          >
            {title || "Untitled Timer"}
          </h2>
        )}
      </div>

      <div className="mode-buttons">
        <button
          onClick={() => {
            setIsRunning(false);
            setMode("focus");
            setSecondsLeft(durations.focus);
            playMelody(breakStartMelody);
          }}
          className={mode === "focus" ? "active" : ""}
        >
          Focus
        </button>
        <button
          onClick={() => {
            setIsRunning(false);
            setMode("shortBreak");
            setSecondsLeft(durations.shortBreak);
            playBreakStartTone();
          }}
          className={mode === "shortBreak" ? "active" : ""}
        >
          Short Break
        </button>
        <button
          onClick={() => {
            setIsRunning(false);
            setMode("longBreak");
            setSecondsLeft(durations.longBreak);
          }}
          className={mode === "longBreak" ? "active" : ""}
        >
          Long Break
        </button>
      </div>

      <div className="time-display">{formatTime(secondsLeft)}</div>

      <div className="progress-container">
        <div
          className="progress-bar"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mode-buttons">
        <div className="button-row">
          <button onClick={() => setIsRunning((r) => !r)}>
            {isRunning ? "Pause" : "Start"}
          </button>
          <button
            onClick={() => {
              setIsRunning(false);
              setSecondsLeft(durations[mode]);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="durations">
        <h3>Adjust Durations (minutes)</h3>
        {(["focus", "shortBreak", "longBreak"] as Mode[]).map((type) => (
          <div key={type}>
            <label>
              {type === "focus"
                ? "Focus"
                : type === "shortBreak"
                ? "Short Break"
                : "Long Break"}
              :{" "}
              <input
                type="number"
                min={1}
                value={durations[type] / 60}
                onChange={(e) =>
                  handleDurationChange(Number(e.target.value), type)
                }
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Timer;
