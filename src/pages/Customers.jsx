import { useState, useEffect } from 'react';
import customerService from '../services/customerService';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phoneNumber: '', email: '', address: '' });

  const fetchCustomers = async () => {
    try {
      const response = await customerService.getAll();
      setCustomers(Array.isArray(response.data.data || response.data) ? (response.data.data || response.data) : []);
    } catch (error) {
      console.error("Failed to fetch customers", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      await customerService.create(newCustomer);
      setShowAddForm(false);
      setNewCustomer({ name: '', phoneNumber: '', email: '', address: '' });
      fetchCustomers(); // Refresh list
    } catch (error) {
      console.error("Failed to add customer", error);
      alert("Failed to add customer");
    }
  };

  const filteredCustomers = (Array.isArray(customers) ? customers : []).filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phoneNumber?.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow-sm">Customers</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your customer database.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-white bg-brand-orange hover:bg-orange-600 focus:ring-4 focus:ring-orange-500/30 rounded-lg text-sm px-5 py-2.5 font-medium transition shadow-lg shadow-orange-600/20"
        >
          {showAddForm ? 'Cancel' : '+ Add Customer'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-neutral-900 rounded-xl border border-slate-700/50 p-6 shadow-lg">
          <h3 className="text-lg font-medium text-white mb-4">New Customer</h3>
          <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Name *</label>
              <input required type="text" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full bg-black border border-slate-700 rounded-lg p-2.5 text-white focus:border-brand-orange outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Phone *</label>
              <input required type="text" value={newCustomer.phoneNumber} onChange={(e) => setNewCustomer({ ...newCustomer, phoneNumber: e.target.value })} className="w-full bg-black border border-slate-700 rounded-lg p-2.5 text-white focus:border-brand-orange outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Email</label>
              <input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} className="w-full bg-black border border-slate-700 rounded-lg p-2.5 text-white focus:border-brand-orange outline-none" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Address</label>
              <input type="text" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} className="w-full bg-black border border-slate-700 rounded-lg p-2.5 text-white focus:border-brand-orange outline-none" />
            </div>
            <div className="md:col-span-2 flex justify-end mt-2">
              <button type="submit" className="text-white bg-green-600 hover:bg-green-500 rounded-lg text-sm px-5 py-2.5 font-medium transition">Save Customer</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-neutral-900 rounded-xl border border-slate-700/50 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-slate-700">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by name or phone..."
            className="bg-black border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-brand-orange focus:border-brand-orange block w-full md:w-80 p-2.5 outline-none transition"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div></div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No customers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-400">
              <thead className="text-xs text-slate-300 uppercase bg-black/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(c => (
                  <tr key={c.id || c._id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
                    <td className="px-6 py-4 font-medium text-white">{c.name}</td>
                    <td className="px-6 py-4">{c.phoneNumber}</td>
                    <td className="px-6 py-4">{c.email || '-'}</td>
                    <td className="px-6 py-4">{c.address || '-'}</td>
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
