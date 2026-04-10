import { CheckCircle2, Circle } from "lucide-react";

export function ProgressModal({ progress, currentStep, steps, onCancel, onSkip, fileName, pageCount }) {
  return (
    <div className="overlay">
      <div className="progress-modal">
        <span className="spark">+</span>
        <h3>Extracting with AI</h3>
        <p>{fileName || "Selected PDF"}</p>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-meta">
          <span>Pages: {pageCount || 0}</span>
          <span>{progress}%</span>
          <span>{progress < 100 ? "processing" : "done"}</span>
        </div>

        <ul className="step-list">
          {steps.map((step, index) => {
            const done = index < currentStep;
            const active = index === currentStep;
            return (
              <li className={active ? "active" : ""} key={step}>
                {done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                <span>{step}</span>
              </li>
            );
          })}
        </ul>

        <button className="ghost-btn full" type="button" onClick={onSkip}>
          Skip to Result {"->"}
        </button>
        <button className="subtle-link" type="button" onClick={onCancel}>
          Hide
        </button>
      </div>
    </div>
  );
}
