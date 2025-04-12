// App.tsx
import "./App.css";
import { useEffect, useState } from "react";
import Timer from "./components/Timer";
import { ScoreField } from "./components/Scorefield";
import { EditableField } from "./components/EditableField";
import { EditableNumberField } from "./components/EditableNumberField";
import { Goal } from "./types";
import { exportDataAsJSON, importDataFromJSON } from "./utils";

type ScoreMap = Record<string, { focus: number; break: number }>;

const App = () => {
  const [timerKeys, setTimerKeys] = useState<string[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scores, setScores] = useState<ScoreMap>({});
  const [globalDurations] = useState({ focus: 1500, shortBreak: 300 });

  useEffect(() => {
    const loadedKeys: string[] = [];
    const loadedScores: ScoreMap = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        const isTimer =
          parsed &&
          typeof parsed.secondsLeft === "number" &&
          typeof parsed.durations === "object" &&
          typeof parsed.mode === "string";

        if (isTimer) {
          loadedKeys.push(key);
          loadedScores[key] = {
            focus: parsed.completedCounts?.focus || 0,
            break: parsed.completedCounts?.shortBreak || 0,
          };
        }
      } catch (err) {
        console.warn(`Skipping invalid localStorage item '${key}'`);
      }
    }

    setTimerKeys(loadedKeys);
    setScores((prev) => {
      const merged: ScoreMap = { ...prev };
      for (const key of Object.keys(loadedScores)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const elapsed = parsed.elapsedTime || { focus: 0, shortBreak: 0 };
            merged[key] = {
              focus: elapsed.focus || 0,
              break: elapsed.shortBreak || 0,
            };
          } catch {
            console.warn("Invalid localStorage data for", key);
          }
        }
      }
      return merged;
    });
  }, []);

  const addTimer = (title?: string) => {
    const newTitle = title?.trim() || `Timer ${timerKeys.length + 1}`;
    if (timerKeys.includes(newTitle)) return;

    setTimerKeys((prev) => [...prev, newTitle]);
    setScores((prev) => ({
      ...prev,
      [newTitle]: { focus: 0, break: 0 },
    }));

    if (!localStorage.getItem(newTitle)) {
      localStorage.setItem(
        newTitle,
        JSON.stringify({
          title: newTitle,
          durations: globalDurations,
          secondsLeft: globalDurations.focus,
          mode: "focus",
          completedCounts: { focus: 0, shortBreak: 0 },
          isRunning: false,
        })
      );
    }
  };

  const removeTimer = (keyToRemove: string) => {
    setTimerKeys((prev) => prev.filter((key) => key !== keyToRemove));
    localStorage.removeItem(keyToRemove);
    setScores((prev) => {
      const updated = { ...prev };
      delete updated[keyToRemove];
      return updated;
    });
  };

  const handleSessionComplete = (
    durationInSeconds: number,
    title: string,
    mode: "focus" | "shortBreak"
  ) => {
    const key = title.trim() || "Untitled";
    setScores((prev) => ({
      ...prev,
      [key]: {
        focus:
          (prev[key]?.focus || 0) + (mode === "focus" ? durationInSeconds : 0),
        break:
          (prev[key]?.break || 0) +
          (mode === "shortBreak" ? durationInSeconds : 0),
      },
    }));
  };

  const handleTitleChange = (oldTitle: string, newTitle: string) => {
    if (!newTitle || oldTitle === newTitle) return;
    const existing = localStorage.getItem(oldTitle);
    if (existing) {
      localStorage.setItem(newTitle, existing);
      localStorage.removeItem(oldTitle);
    }

    setScores((prev) => {
      const updated = { ...prev };
      if (updated[oldTitle]) {
        updated[newTitle] = updated[oldTitle];
        delete updated[oldTitle];
      }
      return updated;
    });

    setTimerKeys((prev) =>
      prev.map((key) => (key === oldTitle ? newTitle : key))
    );
  };

  const addGoal = () => {
    setGoals((prev) => [
      ...prev,
      {
        id: `goal-${Date.now()}`,
        name: "",
        hours: 1,
        completed: false,
        description: "",
      },
    ]);
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal))
    );
  };

  const toggleComplete = (id: string) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === id ? { ...goal, completed: !goal.completed } : goal
      )
    );
  };

  const removeGoal = (id: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
  };

  const updateFocusScore = (title: string, newVal: number) => {
    setScores((prev) => ({
      ...prev,
      [title]: {
        ...prev[title],
        focus: newVal,
      },
    }));

    const saved = localStorage.getItem(title);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.elapsedTime) parsed.elapsedTime = {};
        parsed.elapsedTime.focus = newVal;
        localStorage.setItem(title, JSON.stringify(parsed));
      } catch {}
    }
  };

  const updateBreakScore = (title: string, newVal: number) => {
    setScores((prev) => ({
      ...prev,
      [title]: {
        ...prev[title],
        break: newVal,
      },
    }));

    const saved = localStorage.getItem(title);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.elapsedTime) parsed.elapsedTime = {};
        parsed.elapsedTime.shortBreak = newVal;
        localStorage.setItem(title, JSON.stringify(parsed));
      } catch {
        console.warn("Failed to update break score in localStorage", title);
      }
    }
  };

  return (
    <div className="app">
      <div className="layout">
        <div className="left-panel">
          <h2>Goals</h2>
          <button onClick={addGoal}>+ Add Goal</button>
          <div className="goals-list">
            {goals.map((goal) => {
              const isEditing = editingId === goal.id;
              const score = goal.linkedTo
                ? scores[goal.linkedTo]?.focus || 0
                : 0;
              const goalMet = score >= goal.hours;
              return (
                <div
                  key={goal.id}
                  style={{ backgroundColor: goalMet ? "#d4edda" : undefined }}
                  className="card"
                >
                  <div className="goal-row">
                    <select
                      value={goal.linkedTo || ""}
                      onChange={(e) =>
                        updateGoal(goal.id, { linkedTo: e.target.value })
                      }
                    >
                      <option value="">(Not linked)</option>
                      {timerKeys.map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>

                    <input
                      type="checkbox"
                      checked={goal.completed}
                      onChange={() => toggleComplete(goal.id)}
                    />
                    {isEditing ? (
                      <EditableField
                        value={goal.name}
                        onChange={(newName) =>
                          updateGoal(goal.id, { name: newName })
                        }
                      />
                    ) : (
                      <div
                        onClick={() => setEditingId(goal.id)}
                        className={`goal-name-display ${
                          goal.completed ? "strike" : ""
                        }`}
                      >
                        {goal.name || (
                          <span style={{ color: "#aaa" }}>
                            Click to add name
                          </span>
                        )}
                      </div>
                    )}
                    <EditableNumberField
                      value={goal.hours}
                      onChange={(val) => updateGoal(goal.id, { hours: val })}
                    />
                    <button
                      onClick={() => removeGoal(goal.id)}
                      className="remove-goal-button"
                      title="Remove goal"
                    >
                      ❌
                    </button>
                  </div>
                  <textarea
                    className={`goal-description ${
                      goal.completed ? "strike" : ""
                    }`}
                    value={goal.description}
                    onChange={(e) =>
                      updateGoal(goal.id, { description: e.target.value })
                    }
                    placeholder="Describe your goal..."
                  />
                </div>
              );
            })}
          </div>

          <h2>Scores</h2>
          {Object.entries(scores).map(([title, { focus, break: brk }]) => {
            return (
              <div className="time-display" key={title}>
                <strong>{title}</strong>: {"  "}🎯{"  "}
                <ScoreField
                  value={focus}
                  onChange={(val: number) => updateFocusScore(title, val)}
                />
                {"  "}☕{"  "}
                <ScoreField
                  value={brk}
                  onChange={(val: number) => updateBreakScore(title, val)}
                />
              </div>
            );
          })}
        </div>

        <div className="right-panel">
          <button
            className="add-timer button button-primary"
            onClick={() => addTimer()}
          >
            + Add Timer
          </button>

          <div className="timers-column">
            {timerKeys.map((key) => (
              <div key={key} className="timer-row-ui">
                <Timer
                  storageKey={key}
                  onRemove={() => removeTimer(key)}
                  onSessionComplete={handleSessionComplete}
                  onTitleChange={handleTitleChange}
                  onTickUpdate={(delta, title, mode) => {
                    const scoreKey = mode === "shortBreak" ? "break" : "focus";
                    setScores((prev) => ({
                      ...prev,
                      [title]: {
                        ...prev[title],
                        [scoreKey]: (prev[title]?.[scoreKey] || 0) + delta,
                      },
                    }));
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <button onClick={() => exportDataAsJSON({ goals, scores })}>
        Download Data
      </button>
      <button
        onClick={() =>
          importDataFromJSON((data) => {
            const timerTitles = Object.keys(data.timers || {});
            setGoals(data.goals || []);
            setScores(data.scores || {});
            setTimerKeys((prev) => {
              const allKeys = new Set([...prev, ...timerTitles]);
              return Array.from(allKeys);
            });
          })
        }
      >
        Load Data
      </button>
    </div>
  );
};

export default App;
