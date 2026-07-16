import { NavLink } from 'react-router-dom';
import { NAV_SECTIONS } from '../../data/navigation';

export default function Sidebar({ open, onClose }) {
  return (
    <aside
      id="sidebar"
      className={`fixed inset-y-0 left-0 z-40 w-[220px] bg-sidebar text-white flex flex-col transform transition-transform duration-200 ease-in-out shrink-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      <div className="sidebar-brand">
        <img src="/assets/aetrex-logo1.png" alt="Aetrex" />
      </div>

      <nav className="sidebar-nav flex-1">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="sidebar-section-label">{section.label}</p>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <i className={item.icon} />
                <span className="sidebar-link-text">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p className="sidebar-footer-title">Scanner Fleet Management</p>
        <p className="sidebar-footer-meta">PoC v0.2 · Trigent × Aetrex</p>
      </div>
    </aside>
  );
}
