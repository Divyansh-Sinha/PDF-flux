import { Plus, Trash2 } from "lucide-react";

export function DataTablePanel({
  rows,
  columns,
  tableName,
  warnings,
  extractError,
  insertResult,
  inserting,
  mode,
  onModeChange,
  onRowsChange,
  onInsert,
  infoMessage
}) {
  const headers = columns.map((column) => column.name).filter(Boolean);

  function updateCell(originalIndex, header, value) {
    onRowsChange((prev) => prev.map((row, index) => (index === originalIndex ? { ...row, [header]: value } : row)));
  }

  function removeRow(originalIndex) {
    onRowsChange((prev) => prev.filter((_, index) => index !== originalIndex));
  }

  function addRow() {
    const newRow = headers.reduce((acc, header) => ({ ...acc, [header]: "" }), {});
    onRowsChange((prev) => [...prev, newRow]);
  }

  return (
    <section className="panel table-panel">
      <div className="table-scroll">
        {headers.length ? (
          <table>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
                <th>actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.__index}>
                  {headers.map((header) => (
                    <td key={`${row.__index}-${header}`}>
                      <input
                        className="cell-input"
                        value={row[header] ?? ""}
                        onChange={(event) => updateCell(row.__index, header, event.target.value)}
                      />
                    </td>
                  ))}
                  <td>
                    <button type="button" className="icon-btn" onClick={() => removeRow(row.__index)}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">Define schema columns to preview extracted rows.</div>
        )}
      </div>

      <div className="table-footer">
        <div className="mode-tabs">
          <button type="button" className={`tab ${mode === "insert" ? "active" : ""}`} onClick={() => onModeChange("insert")}>
            Insert New Rows
          </button>
          <button type="button" className={`tab ${mode === "upsert" ? "active" : ""}`} onClick={() => onModeChange("upsert")}>
            Upsert
          </button>
          <button type="button" className={`tab ${mode === "replace" ? "active" : ""}`} onClick={() => onModeChange("replace")}>
            Replace All
          </button>
          <button type="button" className="ghost-btn compact" onClick={addRow}>
            <Plus size={13} /> Add Row
          </button>
        </div>
        <button type="button" className="success-btn" onClick={onInsert} disabled={!rows.length || inserting}>
          {inserting ? "Inserting..." : "Insert to Database ->"}
        </button>
      </div>

      <p className="insert-meta">
        Ready to insert <strong>{rows.length}</strong> rows into <strong>{tableName || "(select table)"}</strong>
      </p>
      {warnings?.length ? <p className="status-inline warn">{warnings.length} warnings in extracted rows.</p> : null}
      {infoMessage ? <p className="status-inline ok">{infoMessage}</p> : null}
      {extractError ? <p className="status-inline error">{extractError}</p> : null}
      {insertResult ? (
        <p className={`status-inline ${insertResult.failed ? "error" : "ok"}`}>
          Inserted: {insertResult.inserted} | Failed: {insertResult.failed}
        </p>
      ) : null}
    </section>
  );
}
