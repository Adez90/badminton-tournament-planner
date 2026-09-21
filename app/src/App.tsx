import { useState } from "react";
import "./App.css";
import { ClassesPanel } from "./components/ClassesPanel";
import { CourtsPanel } from "./components/CourtsPanel";
import { ParticipantsPanel } from "./components/ParticipantsPanel";
import { SchedulePanel } from "./components/SchedulePanel";
import { buildSampleData } from "./domain/sample";
import { useTournamentStore } from "./state/useTournamentStore";

type Step = "classes" | "courts" | "participants" | "schedule";

const STEPS: { key: Step; label: string }[] = [
  { key: "classes", label: "1. Classes" },
  { key: "courts", label: "2. Courts" },
  { key: "participants", label: "3. Participants" },
  { key: "schedule", label: "4. Schedule" },
];

function App() {
  const store = useTournamentStore();
  const [step, setStep] = useState<Step>("classes");

  return (
    <div className="app">
      <header className="app-header">
        <h1>Badminton Tournament Planner</h1>
        <button className="secondary" onClick={() => store.loadSample(buildSampleData())}>
          Load sample data
        </button>
      </header>

      <nav className="steps">
        {STEPS.map((s) => (
          <button
            key={s.key}
            className={step === s.key ? "step active" : "step"}
            onClick={() => setStep(s.key)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <main>
        {step === "classes" && <ClassesPanel store={store} />}
        {step === "courts" && <CourtsPanel store={store} />}
        {step === "participants" && <ParticipantsPanel store={store} />}
        {step === "schedule" && <SchedulePanel store={store} />}
      </main>
    </div>
  );
}

export default App;
