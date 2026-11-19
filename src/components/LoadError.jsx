/** Shown when the JSON files could not be loaded. */
export default function LoadError({ title, style }) {
  return (
    <div className="empty" style={style}>
      <h3>{title}</h3>
      <p>The board data could not be fetched. Make sure the app is running through
         Vite rather than opened from the file system, then reload.</p>
      <code>npm run dev</code>
    </div>
  );
}
