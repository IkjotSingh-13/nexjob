import Icon from './Icon.jsx';

export default function Footer() {
  return (
    <div className="wrap foot-in">
      <div className="foot-grid">
        <div className="foot-brand">
          <span className="brand">
            <span className="brand-mark"><Icon name="scale" size={15} /></span>
            <span className="brand-name">Nexjob</span>
          </span>
          <p style={{ fontSize: 'var(--t-sm)', color: 'var(--ink-2)' }}>
            A job board that puts every salary on the same scale, so you can see
            where a role really sits before you apply.
          </p>
        </div>

        <div className="foot-col">
          <p className="tick">Find work</p>
          <ul>
            <li><a href="./jobs.html">Browse roles</a></li>
            <li><a href="./jobs.html?saved=1">Saved roles</a></li>
            <li><a href="./dashboard.html#alerts">Job alerts</a></li>
            <li><a href="./dashboard.html">Your dashboard</a></li>
          </ul>
        </div>

        <div className="foot-col">
          <p className="tick">Research</p>
          <ul>
            <li><a href="./companies.html">Companies</a></li>
            <li><a href="./salaries.html">Pay explorer</a></li>
            <li><a href="./prep.html">How to get in</a></li>
          </ul>
        </div>

        <div className="foot-col">
          <p className="tick">Employers</p>
          <ul>
            <li><a href="./post-job.html">Post a role</a></li>
            <li><a href="./employer.html">Manage postings</a></li>
            <li><a href="./auth.html?tab=register&role=employer">Create employer account</a></li>
          </ul>
        </div>

        <div className="foot-col">
          <p className="tick">About</p>
          <ul>
            <li><a href="./index.html#how">How Nexjob works</a></li>
            <li><a href="./profile.html">Your profile</a></li>
            <li><a href="./404.html">Anything else</a></li>
          </ul>
        </div>
      </div>

      <div className="foot-base">
        <span className="tick">Coursework project · listings are sample data</span>
        <span className="tick">React (JSX) and CSS · built with Vite</span>
      </div>
    </div>
  );
}
