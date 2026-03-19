import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import NewOrder from './pages/NewOrder';
import Customers from './pages/Customers';
import UdhariLedger from './pages/UdhariLedger';
import Payments from './pages/Payments';
import PublicPayment from './pages/PublicPayment';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#0a0a0a',
            color: '#22c55e',
            border: '1px solid #166534',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#0a0a0a',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="new-order" element={<NewOrder />} />
          <Route path="customers" element={<Customers />} />
          <Route path="udhari" element={<UdhariLedger />} />
          <Route path="payments" element={<Payments />} />
        </Route>
        <Route path="/pay/:orderId" element={<PublicPayment />} />
      </Routes>
    </>
  );
}

export default App;
