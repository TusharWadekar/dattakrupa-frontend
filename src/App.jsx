import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import NewOrder from './pages/NewOrder';
import Customers from './pages/Customers';
import UdhariLedger from './pages/UdhariLedger';
import Payments from './pages/Payments';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="new-order" element={<NewOrder />} />
        <Route path="customers" element={<Customers />} />
        <Route path="udhari" element={<UdhariLedger />} />
        <Route path="payments" element={<Payments />} />
      </Route>
    </Routes>
  );
}

export default App;
