import { useState } from "react";

export const EditableField: React.FC<{
  value: string;
  onChange: (newVal: string) => void;
}> = ({ value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value);

  const handleSubmit = () => {
    onChange(input.trim());
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
      style={{ width: "100%" }}
    />
  ) : (
    <span style={{ cursor: "pointer" }} onClick={() => setEditing(true)}>
      {value || <span style={{ color: "#aaa" }}>Click to add name</span>}
    </span>
  );
};
