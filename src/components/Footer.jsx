import { Link } from 'react-router-dom';
import { Icon } from './Icon.jsx';

export function Footer() {
  return (
    <footer className="foot" id="site-foot">
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
              <li><Link to="/jobs">Browse roles</Link></li>
              <li><Link to="/jobs?saved=1">Saved roles</Link></li>
              <li><Link to="/dashboard#alerts">Job alerts</Link></li>
              <li><Link to="/dashboard">Your dashboard</Link></li>
            </ul>
          </div>

          <div className="foot-col">
            <p className="tick">Research</p>
            <ul>
              <li><Link to="/companies">Companies</Link></li>
              <li><Link to="/salaries">Pay explorer</Link></li>
              <li><Link to="/prep">How to get in</Link></li>
            </ul>
          </div>

          <div className="foot-col">
            <p className="tick">Employers</p>
            <ul>
              <li><Link to="/post-job">Post a role</Link></li>
              <li><Link to="/employer">Manage postings</Link></li>
              <li><Link to="/auth?tab=register&role=employer">Create employer account</Link></li>
            </ul>
          </div>

          <div className="foot-col">
            <p className="tick">About</p>
            <ul>
              <li><Link to="/#how">How Nexjob works</Link></li>
              <li><Link to="/profile">Your profile</Link></li>
              <li><Link to="/404">Anything else</Link></li>
            </ul>
          </div>
        </div>

        <div className="foot-base">
          <span className="tick">Coursework project · listings are sample data</span>
          <span className="tick">React and plain CSS · no backend</span>
        </div>
      </div>
    </footer>
  );
}
