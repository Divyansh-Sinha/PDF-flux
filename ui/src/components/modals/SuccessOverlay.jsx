export function SuccessOverlay({ rowCount, onDismiss }) {
  return (
    <div className="overlay success-overlay" onClick={onDismiss} role="presentation">
      <div className="success-toast">
        <strong>Extraction Completed</strong>
        <span>{rowCount} rows ready for insert</span>
      </div>
    </div>
  );
}
