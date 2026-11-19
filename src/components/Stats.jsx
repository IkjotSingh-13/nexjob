/**
 * A row of big figures.
 * <Stats items={[['Open roles', 28, 'across the board'], ...]} />
 */
export default function Stats({ items }) {
  return (
    <div className="stats">
      {items.map(([label, figure, note]) => (
        <div className="stat" key={label}>
          <span className="tick">{label}</span>
          <span className="stat-figure">{figure}</span>
          <span className="tick" style={{ textTransform: 'none', letterSpacing: 0 }}>{note}</span>
        </div>
      ))}
    </div>
  );
}
