import { Plus, Trash2 } from "lucide-react";

const TYPES = ["text", "int", "float", "date", "boolean"];

export function SchemaPanel({
  mode,
  onModeChange,
  tables,
  selectedTable,
  onTableChange,
  manualTableName,
  onManualTableNameChange,
  columns,
  onColumnsChange,
  onAiSuggest
}) {
  function updateColumn(index, key, value) {
    onColumnsChange(columns.map((column, i) => (i === index ? { ...column, [key]: value } : column)));
  }

  function addColumn() {
    onColumnsChange([...columns, { name: `field_${columns.length + 1}`, type: "text" }]);
  }

  function removeColumn(index) {
    onColumnsChange(columns.filter((_, i) => i !== index));
  }

  return (
    <section className="panel schema-panel">
      <div className="panel-head">
        <h2>TARGET SCHEMA</h2>
        <span className="tag ok">{columns.length} cols</span>
      </div>

      <div className="tab-row">
        <button className={`tab ${mode === "existing" ? "active" : ""}`} type="button" onClick={() => onModeChange("existing")}>
          Existing Table
        </button>
        <button className={`tab ${mode === "new" ? "active" : ""}`} type="button" onClick={() => onModeChange("new")}>
          Define New
        </button>
      </div>

      {mode === "existing" ? (
        <>
          <label className="field-label">SELECT TABLE</label>
          <select className="field" value={selectedTable} onChange={(event) => onTableChange(event.target.value)}>
            <option value="">Select table</option>
            {tables.map((table) => (
              <option key={table.name} value={table.name}>
                {table.name}
              </option>
            ))}
          </select>
        </>
      ) : (
        <>
          <label className="field-label">TABLE NAME</label>
          <input className="field" value={manualTableName} onChange={(event) => onManualTableNameChange(event.target.value)} />
        </>
      )}

      <label className="field-label">COLUMNS</label>
      <div className="column-list">
        {columns.map((column, index) => (
          <div className="column-item" key={`${column.name}-${index}`}>
            <input
              value={column.name}
              onChange={(event) => updateColumn(index, "name", event.target.value)}
              placeholder="column_name"
            />
            <select value={column.type} onChange={(event) => updateColumn(index, "type", event.target.value)}>
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button type="button" className="icon-btn column-remove" onClick={() => removeColumn(index)}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <button className="ghost-btn full" type="button" onClick={addColumn}>
        <Plus size={14} /> Add Column
      </button>
      <button className="run-btn full ai-btn" type="button" onClick={onAiSuggest}>
        AI Suggest Schema
      </button>
    </section>
  );
}
