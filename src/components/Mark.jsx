/**
 * A company's square logo: its first letter on its brand colour.
 * size is '', 'sm' or 'lg'.
 */
export default function Mark({ company, size = '' }) {
  return (
    <span className={size ? `mark mark--${size}` : 'mark'} aria-hidden="true"
          style={{ background: company.brandBg, color: company.brandFg }}>
      {company.initial}
    </span>
  );
}
