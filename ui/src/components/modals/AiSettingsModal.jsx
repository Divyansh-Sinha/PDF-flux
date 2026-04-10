import { useState, useEffect } from "react";
import { X, Save, BarChart2, Settings2, Trash2, CheckCircle2 } from "lucide-react";

const PROVIDERS = [
    { id: "groq", name: "Groq", defaultModel: "llama-3.3-70b-versatile", docsUrl: "https://console.groq.com/keys" },
    { id: "gemini", name: "Google Gemini", defaultModel: "gemini-2.5-flash", docsUrl: "https://ai.google.dev/" },
    { id: "openai", name: "OpenAI", defaultModel: "gpt-4o", docsUrl: "https://platform.openai.com/api-keys" },
    { id: "mistral", name: "Mistral", defaultModel: "mistral-large-latest", docsUrl: "https://console.mistral.ai/api-keys/" }
];

const KEYS_STORAGE = "llm_provider_configs";

function loadProviderConfigs() {
    try { return JSON.parse(localStorage.getItem(KEYS_STORAGE) || "{}"); } catch { return {}; }
}

export function AiSettingsModal({ onClose, config, onSaveConfig }) {
    const [tab, setTab] = useState("config");
    const [activeProvider, setActiveProvider] = useState(config?.provider || "groq");
    const [providerForms, setProviderForms] = useState(() => {
        const saved = loadProviderConfigs();
        const forms = {};
        PROVIDERS.forEach(p => {
            forms[p.id] = {
                api_key: saved[p.id]?.api_key || "",
                model: saved[p.id]?.model || p.defaultModel
            };
        });
        return forms;
    });
    const [stats, setStats] = useState({});

    useEffect(() => {
        try { setStats(JSON.parse(localStorage.getItem("llm_usage_stats") || "{}")); } catch { setStats({}); }
    }, []);

    function handleSave() {
        // Persist all provider configs to localStorage
        const toSave = {};
        PROVIDERS.forEach(p => { toSave[p.id] = providerForms[p.id]; });
        localStorage.setItem(KEYS_STORAGE, JSON.stringify(toSave));

        // Pass active provider config up to App state
        onSaveConfig({
            provider: activeProvider,
            api_key: providerForms[activeProvider].api_key,
            model: providerForms[activeProvider].model
        });
        onClose();
    }

    function clearStats() {
        localStorage.removeItem("llm_usage_stats");
        setStats({});
    }

    const activeMeta = PROVIDERS.find(p => p.id === activeProvider);

    return (
        <div className="overlay">
            <div className="modal" style={{ width: "min(92vw, 650px)" }}>
                <div className="modal-head">
                    <h3>AI Engine Configuration</h3>
                    <button className="icon-btn" type="button" onClick={onClose}><X size={15} /></button>
                </div>

                <div className="mode-tabs" style={{ margin: "14px 0 12px", borderBottom: "1px solid #2a3347", paddingBottom: "10px" }}>
                    <button className={`tab ${tab === "config" ? "active" : ""}`} style={{ display: "flex", gap: "6px", alignItems: "center" }} onClick={() => setTab("config")}>
                        <Settings2 size={14} /> Configuration
                    </button>
                    <button className={`tab ${tab === "analytics" ? "active" : ""}`} style={{ display: "flex", gap: "6px", alignItems: "center" }} onClick={() => setTab("analytics")}>
                        <BarChart2 size={14} /> Usage Analytics
                    </button>
                </div>

                {tab === "config" && (
                    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "14px", minHeight: "260px" }}>
                        {/* Provider list */}
                        <div style={{ display: "grid", gap: "6px", alignContent: "start" }}>
                            {PROVIDERS.map(p => {
                                const hasKey = !!providerForms[p.id]?.api_key;
                                const isActive = activeProvider === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setActiveProvider(p.id)}
                                        style={{
                                            border: isActive ? "1px solid #507f10" : "1px solid #2a3347",
                                            borderRadius: "9px", padding: "9px 10px", background: isActive ? "#152009" : "#0d111a",
                                            color: isActive ? "#b7ef00" : "#8a93a6", cursor: "pointer", textAlign: "left",
                                            display: "flex", alignItems: "center", justifyContent: "space-between"
                                        }}
                                    >
                                        <span style={{ fontSize: "12px", fontWeight: 600 }}>{p.name}</span>
                                        {hasKey && <CheckCircle2 size={12} color="#3dd7b1" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Provider form */}
                        <div className="column-list">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong style={{ color: "#c6d0e6" }}>{activeMeta?.name}</strong>
                                <a href={activeMeta?.docsUrl} target="_blank" rel="noreferrer" style={{ fontSize: "11px", color: "#7a85a0" }}>Get API Key ↗</a>
                            </div>

                            <label className="field-label">API Key</label>
                            <div style={{ display: "flex", gap: "6px" }}>
                                <input
                                    className="field"
                                    type="password"
                                    placeholder="Enter API key (stored locally in browser)"
                                    value={providerForms[activeProvider].api_key}
                                    onChange={e => setProviderForms(prev => ({ ...prev, [activeProvider]: { ...prev[activeProvider], api_key: e.target.value } }))}
                                    style={{ flex: 1 }}
                                />
                                {providerForms[activeProvider].api_key && (
                                    <button className="icon-btn" title="Clear key" onClick={() => setProviderForms(prev => ({ ...prev, [activeProvider]: { ...prev[activeProvider], api_key: "" } }))}>
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>

                            <label className="field-label">Model Override</label>
                            <input
                                className="field"
                                placeholder={`Default: ${activeMeta?.defaultModel}`}
                                value={providerForms[activeProvider].model}
                                onChange={e => setProviderForms(prev => ({ ...prev, [activeProvider]: { ...prev[activeProvider], model: e.target.value } }))}
                            />
                            <p style={{ fontSize: "11px", color: "#667189", margin: "4px 0 0" }}>
                                Leave blank to use key from server <code>.env</code> file.
                            </p>

                            <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "12px", color: "#667189" }}>Active provider for next extraction:</span>
                                <select
                                    className="ghost-btn compact"
                                    value={activeProvider}
                                    onChange={e => setActiveProvider(e.target.value)}
                                >
                                    {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <button className="success-btn" style={{ marginTop: "12px" }} onClick={handleSave}>
                                <Save size={14} /> Save & Apply
                            </button>
                        </div>
                    </div>
                )}

                {tab === "analytics" && (
                    <div className="column-list">
                        <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "1fr 1fr" }}>
                            {PROVIDERS.map(p => {
                                const s = stats[p.id];
                                return (
                                    <div key={p.id} style={{ background: "#111825", padding: "12px", borderRadius: "10px", border: "1px solid #1e2838" }}>
                                        <div style={{ color: "#74f9d6", fontWeight: "600", marginBottom: "8px", fontSize: "12px" }}>{p.name}</div>
                                        {[["Requests", s?.requests], ["Prompt Tokens", s?.prompt_tokens], ["Comp. Tokens", s?.completion_tokens], ["Total Tokens", s?.total_tokens]].map(([label, val]) => (
                                            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#8a94a6", padding: "2px 0" }}>
                                                <span>{label}</span><strong style={{ color: "#c1cadb" }}>{val || 0}</strong>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                            <button className="ghost-btn compact" onClick={clearStats} style={{ color: "#f26d7f" }}>
                                <Trash2 size={13} /> Reset Analytics
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
