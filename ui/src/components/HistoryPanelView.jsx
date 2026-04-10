import { DocumentPanel } from "./DocumentPanel";

export function HistoryPanelView({ item }) {
    if (!item) return null;

    const pdfState = {
        localName: item.fileName,
        fileId: item.fileId,
        pageCount: item.pageCount || 4,
        textExtracted: true,
        isUploading: false,
        error: ""
    };

    return (
        <section className="content-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <DocumentPanel pdfState={pdfState} onUpload={null} />
            </div>

            <div className="table-panel" style={{ gridColumn: "span 2", padding: "14px", background: "#0c1018", borderRadius: "14px", border: "1px solid #1a2233" }}>
                <h3 style={{ marginTop: 0, color: "#8b96ad", fontSize: "14px", display: "flex", justifyContent: "space-between" }}>
                    <span>Past Extraction: <strong>{item.table}</strong></span>
                    <span style={{ fontSize: "11px", color: "#617187" }}>{new Date(item.timestamp).toLocaleString()}</span>
                </h3>

                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                {item.columns.map(c => <th key={c.name}>{c.name}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {item.rows.map((row, idx) => (
                                // eslint-disable-next-line react/no-array-index-key
                                <tr key={idx}>
                                    {item.columns.map(c => <td key={c.name}>{row[c.name]}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="empty-state" style={{ padding: "8px", textAlign: "right" }}>
                    Total rows inserted: <strong>{item.rows.length}</strong>
                </div>
            </div>
        </section>
    );
}
