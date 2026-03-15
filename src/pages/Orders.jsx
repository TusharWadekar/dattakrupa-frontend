import { useState, useEffect } from 'react';
import orderService from '../services/orderService';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchOrders = async () => {
    try {
      const response = await orderService.getAll();
      setOrders(Array.isArray(response.data.data || response.data) ? (response.data.data || response.data) : []);
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await orderService.updateStatus(id, newStatus);
      fetchOrders(); // Refresh after update
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update status");
    }
  };

  const handleSendBill = async (id) => {
    try {
      await orderService.sendBill(id);
      alert("Bill sent successfully!");
    } catch (error) {
      console.error("Failed to send bill", error);
      alert("Failed to send bill via WhatsApp");
    }
  };

  const filteredOrders = (Array.isArray(orders) ? orders : []).filter(o =>
    o.id?.toString().includes(search) ||
    (o.customer?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow-sm">Orders Management</h1>
          <p className="text-slate-400 text-sm mt-1">View and manage all laundry orders.</p>
        </div>
      </div>
      <div className="bg-neutral-900 rounded-xl border border-slate-700/50 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-700 flex flex-wrap gap-4 items-center justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="bg-black border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-brand-orange focus:border-brand-orange block w-64 p-2.5 outline-none transition"
          />
          <div className="flex space-x-2">
            <span className="px-3 py-1 bg-black border border-slate-700 rounded-md text-xs text-slate-400 flex items-center justify-center cursor-pointer hover:bg-neutral-800 transition">Filter by Status</span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div></div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-400">
              <thead className="text-xs text-slate-300 uppercase bg-black/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 border-r border-slate-700/50">Order ID</th>
                  <th className="px-6 py-4 border-r border-slate-700/50">Customer</th>
                  <th className="px-6 py-4 border-r border-slate-700/50">Status</th>
                  <th className="px-6 py-4 border-r border-slate-700/50">Payment</th>
                  <th className="px-6 py-4 border-r border-slate-700/50">Amount</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id} className="border-b border-slate-700/50 hover:bg-neutral-800/30 transition">
                    <td className="px-6 py-4 font-medium text-white">#ORD-{order.id.toString().padStart(3, '0')}</td>
                    <td className="px-6 py-4">{order.customer?.name || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        className="bg-black/50 border border-slate-600 text-xs font-semibold px-2 py-1 rounded outline-none"
                      >
                        <option value="RECEIVED">RECEIVED</option>
                        <option value="WASHING">WASHING</option>
                        <option value="DRYING">DRYING</option>
                        <option value="READY">READY</option>
                        <option value="DELIVERED">DELIVERED</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded border text-xs font-semibold ${order.paymentStatus === 'PAID' ? 'bg-green-500/20 text-green-400 border-green-500/20' :
                          order.paymentStatus === 'PARTIAL' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20' :
                            'bg-red-500/20 text-red-400 border-red-500/20'
                        }`}>
                        {order.paymentStatus || 'UNPAID'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-white">₹{order.totalAmount || 0}</td>
                    <td className="px-6 py-4 flex space-x-2">
                      <button
                        onClick={() => handleSendBill(order.id)}
                        className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded transition shadow-lg flex items-center"
                      >
                        WA Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
