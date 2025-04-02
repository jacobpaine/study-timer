import "./App.css";
import Timer from "./components/Timer";

function App() {
  return (
    <div className="app">
      <h1>Timers ⏱️</h1>
      <div className="timer-row">
        <Timer storageKey="study-timer-1" />
        <Timer storageKey="study-timer-2" />
      </div>
    </div>
  );
}

export default App;
