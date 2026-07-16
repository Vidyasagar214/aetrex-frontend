import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import FleetOverview from './pages/FleetOverview';
import LocationExplorer from './pages/LocationExplorer';
import ReleaseUpdates from './pages/ReleaseUpdates';
import Devices from './pages/Devices';
import ActivityHealth from './pages/ActivityHealth';
import HardwareInventory from './pages/HardwareInventory';
import Alerts from './pages/Alerts';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<FleetOverview />} />
          <Route path="location-explorer" element={<LocationExplorer />} />
          <Route path="releases" element={<ReleaseUpdates />} />
          <Route path="devices" element={<Devices />} />
          <Route path="activity-health" element={<ActivityHealth />} />
          <Route path="hardware-inventory" element={<HardwareInventory />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
