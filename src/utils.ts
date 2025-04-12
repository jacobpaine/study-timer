import { Tone } from "./types";


export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return (
    `${h ? `${h}h ` : ""}${m ? `${m}m ` : ""}${s ? `${s}s` : ""}`.trim() || "0s"
  );
};

export const parseDuration = (input: string): number => {
  const cleaned = input.trim().toLowerCase();
  if (/^\d+$/.test(cleaned)) return parseInt(cleaned, 10) * 60;
  const regex = /(\d+)\s*(h|m|s)/g;
  let totalSeconds = 0,
    match;
  while ((match = regex.exec(cleaned))) {
    const value = parseInt(match[1], 10);
    if (match[2] === "h") totalSeconds += value * 3600;
    if (match[2] === "m") totalSeconds += value * 60;
    if (match[2] === "s") totalSeconds += value;
  }
  return totalSeconds;
};

export const playMelody = (tones: Tone[], delayBetween = 0.05) => {
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

export const exportDataAsJSON = (data: any = {}, filename = 'timers-and-goals.json') => {
  const timers: Record<string, any> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.secondsLeft === "number" &&
        typeof parsed.durations === "object"
      ) {
        timers[key] = parsed;
      }
    } catch {}
  }

  const finalData = {
    ...data,
    timers,
  };

  const blob = new Blob([JSON.stringify(finalData, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};


export const importDataFromJSON = (callback: (data: any) => void) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";

  input.onchange = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== "string") return;

        const parsed = JSON.parse(result);
        if (parsed.scores) {
          for (const title in parsed.scores) {
            const exists = localStorage.getItem(title);
            if (exists) continue;

            const newTimer = {
              title,
              durations:
                parsed.durations?.[title] || { focus: 1500, shortBreak: 300 },
              secondsLeft:
                parsed.secondsLeft?.[title] ??
                parsed.durations?.[title]?.focus ??
                1500,
              mode: parsed.mode?.[title] || "focus",
              elapsedTime: {
                focus: parsed.scores[title]?.focus || 0,
                shortBreak: parsed.scores[title]?.break || 0,
              },
              completedCounts: {
                focus: 0,
                shortBreak: 0,
              },
              isRunning: false,
              lastUpdated: Date.now(),
            };

            localStorage.setItem(title, JSON.stringify(newTimer));
          }
        }
        if (parsed.timers) {
          for (const title in parsed.timers) {
            if (!localStorage.getItem(title)) {
              localStorage.setItem(title, JSON.stringify(parsed.timers[title]));
            }
          }
        }
        callback(parsed);
      } catch (err) {
        console.error("Failed to parse JSON:", err);
      }
    };

    reader.readAsText(file);
  };

  input.click();
};