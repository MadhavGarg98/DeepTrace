import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { SupplierDirectory } from './pages/SupplierDirectory';
import { RiskDetail } from './pages/RiskDetail';
import { DisruptionHistory } from './pages/DisruptionHistory';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />} />
      <Route path="/suppliers" element={<SupplierDirectory />} />
      <Route path="/risks/:chainId" element={<RiskDetail />} />
      <Route path="/history" element={<DisruptionHistory />} />
    </Routes>
  );
}

export default App;
