import { Database, Loader2, X, CheckCircle2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const DB_TYPES = [
  { id: "postgresql", label: "PostgreSQL", defaultPort: "5432", defaultUser: "postgres" },
  { id: "mysql", label: "MySQL", defaultPort: "3306", defaultUser: "root" }
];
const INITIAL_FORM = {
  type: "postgresql",
  host: "localhost",
  port: "5432",
  dbname: "my_database",
  user: "postgres",
  password: ""
};
const STORAGE_KEY = "saved_db_connections";

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function saveToPersist(form) {
  const list = loadSaved();
  const normalizedForm = { ...INITIAL_FORM, ...form };
  const key = `${normalizedForm.type}:${normalizedForm.host}:${normalizedForm.port}/${normalizedForm.dbname}`;
  const existing = list.findIndex((connection) => `${connection.type}:${connection.host}:${connection.port}/${connection.dbname}` === key);
  const entry = { ...normalizedForm, id: key, savedAt: new Date().toISOString() };
  if (existing >= 0) list[existing] = entry; else list.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 10)));
}

export function ConnectDbModal({ onClose, onSave, onTest, activeDbLabel }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedConns, setSavedConns] = useState([]);
  const [tab, setTab] = useState("new"); // "new" | "saved"

  useEffect(() => { setSavedConns(loadSaved()); }, []);

  function handleTypeSelect(typeId) {
    const selectedType = DB_TYPES.find((item) => item.id === typeId);
    if (!selectedType) return;

    setForm((prev) => ({
      ...prev,
      type: selectedType.id,
      port: selectedType.defaultPort,
      user: selectedType.defaultUser
    }));
  }

  async function submit(action, nextForm = form) {
    setLoading(true); setError(""); setStatus("");
    try {
      const result = await action(nextForm);
      setForm(nextForm);
      setStatus(`Connected — ${(result.tables || []).length} tables found`);
      saveToPersist(nextForm);
      setSavedConns(loadSaved());
      return result;
    } catch (err) {
      setError(err.message || "Connection failed");
      return null;
    } finally { setLoading(false); }
  }

  function deleteConn(id) {
    const next = savedConns.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedConns(next);
  }

  return (
    <div className="overlay">
      <div className="modal" style={{ width: "min(92vw, 580px)" }}>
        <div className="modal-head">
          <div>
            <h3>Database Connection</h3>
            {activeDbLabel && <p style={{ color: "#3dd7b1" }}>● Currently: <strong>{activeDbLabel}</strong></p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="mode-tabs" style={{ margin: "14px 0 12px", borderBottom: "1px solid #2a3347", paddingBottom: "10px" }}>
          <button className={`tab ${tab === "saved" ? "active" : ""}`} onClick={() => setTab("saved")}>
            Saved Connections
          </button>
          <button className={`tab ${tab === "new" ? "active" : ""}`} onClick={() => setTab("new")}>
            New Connection
          </button>
        </div>

        {tab === "saved" && (
          <div style={{ display: "grid", gap: "8px", maxHeight: "320px", overflowY: "auto" }}>
            {savedConns.length === 0 && <p style={{ color: "#8a93a6", padding: "10px 0" }}>No saved connections yet.</p>}
            {savedConns.map(c => (
              <div key={c.id} style={{ border: "1px solid #2a3347", borderRadius: "10px", padding: "10px 12px", background: "#0d1120", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <div>
                  <strong style={{ fontSize: "13px" }}>{c.dbname}</strong>
                  <span style={{ display: "block", fontSize: "11px", color: "#3dd7b1", marginTop: "2px" }}>
                    {(c.type || "postgresql").toUpperCase()}
                  </span>
                  <span style={{ display: "block", fontSize: "11px", color: "#7a85a0", marginTop: "2px" }}>{c.user}@{c.host}:{c.port}</span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    className="ghost-btn compact"
                    onClick={async () => {
                      const nextForm = { ...INITIAL_FORM, ...c };
                      setForm(nextForm);
                      setTab("new");
                      const r = await submit(onSave, nextForm);
                      if (r) onClose();
                    }}
                    disabled={loading}
                  >
                    <CheckCircle2 size={13} /> Connect
                  </button>
                  <button className="icon-btn" onClick={() => deleteConn(c.id)} title="Remove"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "new" && (
          <>
            <label className="field-label">DATABASE TYPE</label>
            <div className="db-type-grid">
              {DB_TYPES.map((type) => (
                <button
                  key={type.id}
                  className={`db-type ${form.type === type.id ? "active" : ""}`}
                  type="button"
                  onClick={() => handleTypeSelect(type.id)}
                >
                  <Database size={14} />{type.label}
                </button>
              ))}
            </div>

            <div className="modal-grid">
              <div>
                <label className="field-label">HOST</label>
                <input className="field" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} />
              </div>
              <div>
                <label className="field-label">PORT</label>
                <input className="field" value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} />
              </div>
            </div>

            <label className="field-label">DATABASE NAME</label>
            <input className="field" value={form.dbname} onChange={e => setForm({ ...form, dbname: e.target.value })} />

            <div className="modal-grid">
              <div>
                <label className="field-label">USERNAME</label>
                <input className="field" value={form.user} onChange={e => setForm({ ...form, user: e.target.value })} />
              </div>
              <div>
                <label className="field-label">PASSWORD</label>
                <input className="field" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>

            {status ? <p className="status-chip">{status}</p> : null}
            {error ? <p className="status-inline error">{error}</p> : null}

            <div className="modal-actions" style={{ marginTop: "14px" }}>
              <button className="ghost-btn full" type="button" disabled={loading} onClick={() => submit(onTest)}>
                {loading ? <Loader2 size={14} className="spin" /> : null} Test Connection
              </button>
              <button className="run-btn full" type="button" disabled={loading} onClick={async () => { const r = await submit(onSave); if (r) onClose(); }}>
                {loading ? <Loader2 size={14} className="spin" /> : null} Save & Connect
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
