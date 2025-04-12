export type Mode = "focus" | "shortBreak";
export type Tone = { frequency: number; duration: number; type?: OscillatorType };
export type Goal = {
  id: string;
  name: string;
  hours: number; // in seconds
  completed: boolean;
  description?: string;
  linkedTo?: string; // the timer key
};
