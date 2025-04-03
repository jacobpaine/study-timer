import "./App.css";
import { useState } from "react";
import Timer from "./components/Timer";

function App() {
  const [timerKeys, setTimerKeys] = useState<string[]>(["study-timer-1"]);

  const addTimer = () => {
    const newKey = `study-timer-${Date.now()}`; // Unique key
    setTimerKeys((prev) => [...prev, newKey]);
  };

  const removeTimer = (keyToRemove: string) => {
    setTimerKeys((prev) => prev.filter((key) => key !== keyToRemove));
    localStorage.removeItem(keyToRemove); // optional: remove saved state
  };

  return (
    <div className="app">
      <h1>Timers ⏱️</h1>
      <button className="add-timer" onClick={addTimer}>
        + Add Timer
      </button>

      <div className="timer-row">
        {timerKeys.map((key) => (
          <div key={key} className="timer-container">
            <Timer storageKey={key} />
            <button className="remove-timer" onClick={() => removeTimer(key)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
