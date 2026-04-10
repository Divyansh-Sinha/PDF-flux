import { FileText, Upload } from "lucide-react";

export function DocumentPanel({ pdfState, onUpload, pageSnippets = [] }) {
  const pageCount = pdfState.pageCount || 4;
  const cards = Array.from({ length: Math.min(pageCount, 6) }, (_, index) => ({
    label: `Page ${index + 1}`,
    state: pdfState.textExtracted ? "extracted" : index === 0 && pdfState.fileId ? "ocr" : "pending",
    snippet: pageSnippets[index]?.snippet || null
  }));

  return (
    <section className="panel document-panel">
      <div className="panel-head">
        <h2>PDF DOCUMENT</h2>
        {onUpload && (
          <label className="ghost-btn compact upload-btn">
            <Upload size={13} /> Upload PDF
            <input
              type="file"
              accept="application/pdf"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(file);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      <div className="file-row">
        <div className="file-icon">
          <FileText size={17} />
        </div>
        <div className="file-meta">
          <strong>{pdfState.localName || "No file selected"}</strong>
          <span>
            {pdfState.fileId
              ? `${pdfState.pageCount} pages - ${pdfState.textExtracted ? "Text extracted" : "No text detected"}`
              : "Upload a PDF file to begin"}
          </span>
        </div>
      </div>

      {pdfState.isUploading ? <p className="status-inline">Uploading and extracting text...</p> : null}
      {pdfState.error ? <p className="status-inline error">{pdfState.error}</p> : null}

      <div className="pages-wrap">
        {cards.map((page) => (
          <article className={`page-card ${page.state}`} key={page.label}>
            {page.snippet ? (
              <div className="page-text-preview">
                {page.snippet}
              </div>
            ) : (
              <div className="text-lines">
                <span /><span /><span /><span />
              </div>
            )}
            <footer>
              <small>{page.label}</small>
              <small>{page.state === "ocr" ? "limited text" : page.state === "pending" ? "waiting" : "extracted"}</small>
            </footer>
          </article>
        ))}
      </div>
      {pageCount > 6 ? <p className="muted-center">+ {pageCount - 6} more pages</p> : null}
    </section>
  );
}
