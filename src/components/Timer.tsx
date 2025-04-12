import React, { useState, useEffect, useRef } from "react";
import { parseDuration, playMelody } from "../utils";
import { Mode } from "../types";

const sessionEndMelody = [
  { frequency: 784, duration: 0.2 },
  { frequency: 659, duration: 0.2 },
  { frequency: 523, duration: 0.3 },
];

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return (
    `${h ? `${h}h ` : ""}${m ? `${m}m ` : ""}${s ? `${s}s` : ""}`.trim() || "0s"
  );
};

const Timer: React.FC<{
  storageKey: string;
  onRemove?: () => void;
  onSessionComplete?: (
    durationInSeconds: number,
    title: string,
    mode: Mode
  ) => void;
  onTitleChange?: (oldTitle: string, newTitle: string) => void;
  onTickUpdate?: (secondsSpent: number, title: string, mode: Mode) => void;
}> = ({
  storageKey,
  onRemove,
  onSessionComplete,
  onTitleChange,
  onTickUpdate,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("focus");
  const [isRunning, setIsRunning] = useState(false);
  const [durations, setDurations] = useState({ focus: 1500, shortBreak: 300 });
  const [secondsLeft, setSecondsLeft] = useState(1500);
  const [completedCounts, setCompletedCounts] = useState({
    focus: 0,
    shortBreak: 0,
  });
  const [elapsedTime, setElapsedTime] = useState({ focus: 0, shortBreak: 0 });
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editableTimeInput, setEditableTimeInput] = useState("25m");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasRunningBeforeEdit = useRef(false);
  const hasInitializedRef = useRef(false);
  const sessionCompletedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      const {
        durations = { focus: 1500, shortBreak: 300 },
        mode = "focus",
        secondsLeft: savedSeconds = 1500,
        isRunning = false,
        completedCounts = { focus: 0, shortBreak: 0 },
        elapsedTime = { focus: 0, shortBreak: 0 },
        lastUpdated,
      } = parsed;

      setDurations(durations);
      setMode(mode);
      setCompletedCounts(completedCounts);
      setElapsedTime(elapsedTime);

      let adjustedSeconds = durations[mode] - elapsedTime[mode];

      if (isRunning && lastUpdated) {
        const secondsPassed = Math.floor((Date.now() - lastUpdated) / 1000);
        setElapsedTime((prev) => ({
          ...prev,
          [mode]: prev[mode] + secondsPassed,
        }));
        adjustedSeconds = Math.max(adjustedSeconds - secondsPassed, 0);
        if (adjustedSeconds === 0) {
          setIsRunning(false);
        } else {
          setIsRunning(true);
        }
      } else {
        setIsRunning(false);
      }

      setSecondsLeft(adjustedSeconds);
    } catch {
      console.warn("Invalid saved timer data for", storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    sessionCompletedRef.current = false;
  }, [mode, durations[mode]]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            if (!sessionCompletedRef.current) {
              handleSessionEnd();
            }
            return 0;
          }
          onTickUpdate?.(1, storageKey, mode);
          setElapsedTime((prev) => ({
            ...prev,
            [mode]: prev[mode] + 1,
          }));
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current!);
  }, [isRunning, durations, mode, completedCounts, storageKey]);

  useEffect(() => {
    const data = {
      title: storageKey,
      durations,
      mode,
      secondsLeft,
      isRunning,
      completedCounts,
      elapsedTime,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [
    durations,
    mode,
    secondsLeft,
    isRunning,
    completedCounts,
    elapsedTime,
    storageKey,
  ]);

  const handleSessionEnd = () => {
    if (sessionCompletedRef.current) return;
    sessionCompletedRef.current = true;

    setIsRunning(false);
    setCompletedCounts((prev) => ({ ...prev, [mode]: prev[mode] + 1 }));

    if (mode === "focus") {
      setMode("shortBreak");
      playMelody(sessionEndMelody);
    } else {
      setMode("focus");
    }

    onSessionComplete?.(durations[mode], storageKey, mode);
  };

  const handleTitleSubmit = () => {
    const newTitle = editingTitle?.trim() || storageKey;
    if (newTitle !== storageKey) {
      onTitleChange?.(storageKey, newTitle);
    }
    setIsEditingTitle(false);
    setEditingTitle(null);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h > "00" ? `${h}h ` : ""}${m}m ${s}s`;
  };

  return (
    <div className="timer">
      {isEditingTitle ? (
        <input
          type="text"
          value={editingTitle ?? storageKey}
          onChange={(e) => setEditingTitle(e.target.value)}
          onBlur={handleTitleSubmit}
          onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
          autoFocus
        />
      ) : (
        <h3
          onClick={() => setIsEditingTitle(true)}
          style={{ cursor: "pointer" }}
        >
          {storageKey}
        </h3>
      )}

      <div className="button-row">
        <button onClick={() => setIsRunning((r) => !r)}>
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          onClick={() => {
            const newMode = mode === "focus" ? "shortBreak" : "focus";
            setMode(newMode);
            setSecondsLeft(durations[newMode] - elapsedTime[newMode]);
          }}
        >
          {mode === "focus" ? "Focus" : "Break"}
        </button>
        <button
          onClick={onRemove}
          className="remove-timer button button-danger"
        >
          X
        </button>
      </div>

      <div className="time-display">
        {isEditingTime ? (
          <input
            type="text"
            value={editableTimeInput}
            onChange={(e) => setEditableTimeInput(e.target.value)}
            onBlur={() => {
              const newSeconds = parseDuration(editableTimeInput);
              if (newSeconds > 0) {
                setSecondsLeft(newSeconds);
                setDurations((prev) => ({ ...prev, [mode]: newSeconds }));
              }
              setIsEditingTime(false);
              if (wasRunningBeforeEdit.current) setIsRunning(true);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            autoFocus
          />
        ) : (
          <span
            onClick={() => {
              wasRunningBeforeEdit.current = isRunning;
              setIsRunning(false);
              setEditableTimeInput(formatDuration(secondsLeft));
              setIsEditingTime(true);
            }}
            style={{ cursor: "pointer" }}
          >
            {formatTime(secondsLeft)}
          </span>
        )}
      </div>
    </div>
  );
};

export default Timer;
