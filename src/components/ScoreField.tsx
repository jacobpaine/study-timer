import { useState } from "react";
import { formatDuration, parseDuration } from "../utils";

export const ScoreField: React.FC<{
  value: number;
  onChange: (newVal: number) => void;
}> = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    const newVal = parseDuration(input);
    if (!isNaN(newVal)) onChange(newVal);
    setEditing(false);
  };

  return editing ? (
    <input
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onBlur={handleSubmit}
      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      autoFocus
      style={{ width: "5.5em" }}
    />
  ) : (
    <span
      style={{ cursor: "pointer" }}
      onClick={() => {
        setInput(formatDuration(value));
        setEditing(true);
      }}
    >
      {formatDuration(value)}
    </span>
  );
};
