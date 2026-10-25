/**
 * The "did not load" card, shared by every page that reads the board.
 * `onRetry` re-runs the load; the board's promise is not cached after a
 * failure, so trying again really does try again.
 */
export function LoadError({ title, error, onRetry, style }) {
  return (
    <div className="empty" style={style}>
      <h3>{title}</h3>
      <p>
        Nexjob could not read its sample data{error?.message ? ` (${error.message})` : ''}.
        Check your connection, then try again.
      </p>
      {onRetry && <button type="button" className="btn btn--outline" onClick={onRetry}>Try again</button>}
    </div>
  );
}
