import { useState, useEffect } from 'react';
import orderService from '../services/orderService';
export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');

  // Note: Payments might be derived from orders if there isn't a dedicated endpoint,
  // but we'll try to fetch from a dedicated endpoint or default to orders.
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await orderService.getAll();
        const allOrders = Array.isArray(response.data.data || response.data) ? (response.data.data || response.data) : [];
        // Derive payments from fulfilled/paid orders for now
        const paidOrders = allOrders.filter(o => o.paymentStatus !== 'UNPAID');
        setPayments(paidOrders);
      } catch (error) {
        console.error("Failed to fetch payments", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const filteredPayments = payments.filter(p => {
    const matchSearch = p.id?.toString().includes(search) ||
      (p.customer?.name || '').toLowerCase().includes(search.toLowerCase());
    // Basic date filtering based on order date if available
    const matchDate = date ? p.createdAt?.includes(date) : true;
    return matchSearch && matchDate;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow-sm">Payments History</h1>
          <p className="text-slate-400 text-sm mt-1">Review all transactions and payments.</p>
        </div>
      </div>
      <div className="bg-neutral-900 rounded-xl border border-slate-700/50 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments by ID or customer..."
            className="bg-black border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-brand-orange focus:border-brand-orange block w-64 p-2.5 outline-none transition"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-black border border-slate-700 text-slate-400 text-sm rounded-lg p-2.5 outline-none focus:ring-brand-orange focus:border-brand-orange"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div></div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No payments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-400">
              <thead className="text-xs text-slate-300 uppercase bg-black/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 border-r border-slate-700/50">Order ID</th>
                  <th className="px-6 py-4 border-r border-slate-700/50">Customer</th>
                  <th className="px-6 py-4 border-r border-slate-700/50">Amount Paid</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(p => (
                  <tr key={p.id} className="border-b border-slate-700/50 hover:bg-neutral-800/30 transition">
                    <td className="px-6 py-4 font-medium text-white">#ORD-{p.id.toString().padStart(3, '0')}</td>
                    <td className="px-6 py-4">{p.customer?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 font-bold text-green-400">₹{p.totalAmount}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded border text-xs font-semibold bg-green-500/20 text-green-400 border-green-500/20">
                        {p.paymentStatus}
                      </span>
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
