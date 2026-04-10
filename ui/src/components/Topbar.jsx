import { CircleDot, Database, Play, TriangleAlert } from "lucide-react";

const STEP_HEADINGS = [
  "Connect Your Database",
  "Upload PDF Document",
  "Define Extraction Schema",
  "AI Extraction in Progress",
  "Review & Insert Rows",
];

export function Topbar({
  dbConnected,
  stats,
  onRunExtraction,
  onOpenDbModal,
  runDisabled,
  onDocs,
  onExportCsv,
  onToggleFilter,
  filterActive,
  providerLabel,
  onOpenAiSettings,
  activeStep = 1
}) {
  const heading = STEP_HEADINGS[activeStep] || "PDF Extraction Studio";
  const stepNum = Math.min(activeStep + 1, 5);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 style={{ fontSize: "20px" }}>{heading}</h1>
        <span className="tag">Step {stepNum} of 5</span>
        <span className={`tag ${dbConnected ? "ok" : ""}`}>
          <CircleDot size={12} /> {dbConnected ? "DB Connected" : "DB Not Connected"}
        </span>
      </div>

      <div className="topbar-right">
        <button
          className="ghost-btn compact"
          type="button"
          onClick={onOpenAiSettings}
          style={{ borderStyle: "dashed" }}
        >
          🧠 {providerLabel}
        </button>
        <button className="ghost-btn" type="button" onClick={onOpenDbModal}>
          <Database size={15} /> Database
        </button>
        <button className="ghost-btn" type="button" onClick={onDocs}>
          Docs
        </button>
        <button className="run-btn" type="button" onClick={onRunExtraction} disabled={runDisabled}>
          <Play size={14} /> Run Extraction
        </button>
      </div>

      <div className="stats-row">
        {stats.map((item) => (
          <div className="stat-box" key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
        <button className="ghost-btn compact" type="button" onClick={onExportCsv}>
          Export CSV
        </button>
        <button className={`ghost-btn compact ${filterActive ? "active-filter" : ""}`} type="button" onClick={onToggleFilter}>
          <TriangleAlert size={14} /> Filter
        </button>
      </div>
    </header>
  );
}
