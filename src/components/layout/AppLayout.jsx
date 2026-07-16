import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSidebar } from '../../hooks/useSidebar';
import { PAGE_META } from '../../data/navigation';

export default function AppLayout() {
  const { open, close, toggle } = useSidebar();
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname] || PAGE_META['/'];

  return (
    <>
      <div
        className={`sidebar-overlay fixed inset-0 bg-black/40 z-30 lg:hidden ${
          open ? '' : 'hidden'
        }`}
        aria-hidden={!open}
        onClick={close}
      />

      <div className="flex min-h-screen">
        <Sidebar open={open} onClose={close} />

        <div className="app-main flex-1 flex flex-col min-w-0">
          <Header
            title={meta.title}
            subtitle={meta.subtitle}
            onToggleSidebar={toggle}
          />
          <Outlet />
        </div>
      </div>
    </>
  );
}
