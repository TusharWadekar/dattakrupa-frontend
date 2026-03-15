import { useState, useEffect } from 'react';
import orderService from '../services/orderService';

export default function UdhariLedger() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [data, setData] = useState({
    totalUdhari: 0,
    customersInDebt: 0,
    pendingCustomers: []
  });

  const fetchUdhari = async () => {
    try {
      const response = await orderService.getAll();
      const allOrders = Array.isArray(response.data.data || response.data) ? (response.data.data || response.data) : [];

      const unpaidOrders = allOrders.filter(o => o.paymentStatus !== 'PAID');

      // Group by customer
      const customersMap = {};
      let totalAmount = 0;

      unpaidOrders.forEach(o => {
        if (!o.customer) return;

        const customerId = o.customer.id || o.customer._id;
        if (!customersMap[customerId]) {
          customersMap[customerId] = {
            id: customerId,
            name: o.customer.name,
            phoneNumber: o.customer.phoneNumber,
            pendingAmount: 0
          };
        }
        customersMap[customerId].pendingAmount += (o.totalAmount || 0);
        totalAmount += (o.totalAmount || 0);
      });

      setData({
        totalUdhari: totalAmount,
        customersInDebt: Object.keys(customersMap).length,
        pendingCustomers: Object.values(customersMap)
      });

    } catch (error) {
      console.error("Failed to fetch udhari data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUdhari();
  }, []);

  const handleSendReminder = async (customerId) => {
    try {
      await orderService.sendBill(customerId);
      alert("Reminder sent successfully!");
    } catch (error) {
      console.error("Failed to send reminder", error);
      alert("Reminder feature requires specific backend endpoint");
    }
  };

  const filteredCustomers = data.pendingCustomers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phoneNumber?.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow-sm">Udhari Ledger</h1>
          <p className="text-slate-400 text-sm mt-1">Pending dues and payment reminders.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-neutral-900 rounded-xl p-6 border border-slate-700/50 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition duration-300">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-red-500 to-rose-400 opacity-20 rounded-full blur-2xl group-hover:scale-150 transition duration-500"></div>
          <p className="text-slate-400 text-sm font-medium mb-2 relative z-10">Total Udhari</p>
          <p className="text-3xl font-bold text-red-400 relative z-10">₹{data.totalUdhari}</p>
        </div>
        <div className="bg-neutral-900 rounded-xl p-6 border border-slate-700/50 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition duration-300">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-orange-500 to-yellow-400 opacity-20 rounded-full blur-2xl group-hover:scale-150 transition duration-500"></div>
          <p className="text-slate-400 text-sm font-medium mb-2 relative z-10">Customers in Debt</p>
          <p className="text-3xl font-bold text-white relative z-10">{data.customersInDebt}</p>
        </div>
      </div>

      <div className="bg-neutral-900 rounded-xl border border-slate-700/50 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pending customers..."
            className="bg-black border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-brand-orange focus:border-brand-orange block w-64 p-2.5 outline-none transition"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div></div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No pending udhari found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-400">
              <thead className="text-xs text-slate-300 uppercase bg-black/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 border-r border-slate-700/50">Customer Name</th>
                  <th className="px-6 py-4 border-r border-slate-700/50">Phone Number</th>
                  <th className="px-6 py-4 border-r border-slate-700/50">Pending Amount</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(c => (
                  <tr key={c.id} className="border-b border-slate-700/50 hover:bg-neutral-800/30 transition">
                    <td className="px-6 py-4 font-medium text-white">{c.name}</td>
                    <td className="px-6 py-4">{c.phoneNumber}</td>
                    <td className="px-6 py-4 font-bold text-red-400">₹{c.pendingAmount}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleSendReminder(c.id)}
                        className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded transition shadow-lg shadow-green-900/20 flex items-center space-x-1 font-medium"
                      >
                        <span>Send Reminder</span>
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
