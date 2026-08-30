import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { SupplierDirectory } from './pages/SupplierDirectory';
import { RiskDetail } from './pages/RiskDetail';
import { DisruptionHistory } from './pages/DisruptionHistory';
import { AuditLog } from './pages/AuditLog';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />} />
      <Route path="/suppliers" element={<SupplierDirectory />} />
      <Route path="/risks/:chainId" element={<RiskDetail />} />
      <Route path="/history" element={<DisruptionHistory />} />
      <Route path="/audit" element={<AuditLog />} />
    </Routes>
  );
}

export default App;