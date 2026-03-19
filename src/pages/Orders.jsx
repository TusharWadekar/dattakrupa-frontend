import { useState, useEffect, useMemo, useCallback } from 'react';
import orderService from '../services/orderService';
import customerService from '../services/customerService';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import WhatsAppButton from '../components/WhatsAppButton';

const ITEMS_OPTIONS = [
  'Shirt', 'Pant', 'T-Shirt', 'Jeans', 'Saree', 
  'Jacket', 'Kurti', 'Bedsheet', 'Blanket', 'Socks', 'Dupatta'
];

const STATUS_FLOW = ['RECEIVED', 'WASHING', 'DRYING', 'READY', 'DELIVERED'];

export default function Orders() {
  const [searchParams] = useSearchParams();
  const phoneParam = searchParams.get('search') || '';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Filters
  const [search, setSearch] = useState(phoneParam);
  const [statusFilter, setStatusFilter] = useState('ALL'); 
  const [paymentFilter, setPaymentFilter] = useState('ALL'); 
  const [sortOrder, setSortOrder] = useState('Newest');

  // Modals state
  const [newOrderModal, setNewOrderModal] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [cashModal, setCashModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // New Order Form State
  const [customers, setCustomers] = useState([]);
  const [newOrder, setNewOrder] = useState({
    customerId: '',
    items: [{ itemName: 'Shirt', quantity: 1, pricePerItem: '' }],
    expectedDelivery: '',
    notes: ''
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      let res;
      if (statusFilter !== 'ALL') {
        res = await orderService.getByStatus(statusFilter);
      } else {
        res = await orderService.getAll();
      }
      
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setOrders(data);
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
      if (err.response?.status !== 404) {
        toast.error("Failed to load orders");
      } else {
        setOrders([]);
        setError(false);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Load Customers for dropdown in New Order modal
  useEffect(() => {
    if (newOrderModal && customers.length === 0) {
      customerService.getAll().then(res => setCustomers(res.data?.data || [])).catch(console.error);
    }
  }, [newOrderModal, customers.length]);

  // Stats
  const stats = useMemo(() => {
    return {
      received: orders.filter(o => o.status === 'RECEIVED').length,
      washing: orders.filter(o => o.status === 'WASHING').length,
      drying: orders.filter(o => o.status === 'DRYING').length,
      ready: orders.filter(o => o.status === 'READY').length,
      delivered: orders.filter(o => o.status === 'DELIVERED').length,
    };
  }, [orders]);

  // Filter & Sort Pipeline
  const filteredOrders = useMemo(() => {
    let list = [...orders];
    
    // Search by Name or Phone
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o => 
        (o.customerName || '').toLowerCase().includes(q) || 
        (o.customerPhone || '').includes(q) ||
        o.id.toString() === q
      );
    }

    // Payment Filter
    if (paymentFilter !== 'ALL') {
      list = list.filter(o => o.paymentStatus === paymentFilter);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortOrder === 'Highest Amount') return b.totalAmount - a.totalAmount;
      if (sortOrder === 'Oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt); // Newest default
    });

    return list;
  }, [orders, search, paymentFilter, sortOrder]);

  // Handle Error properly
  const handleError = (error) => {
    const status = error.response?.status;
    const msg = error.response?.data?.message;

    if (status === 404) toast.error("Order nahi mila");
    else if (status === 400) toast.error(msg || "Validation error: Check your inputs");
    else toast.error("Kuch galat ho gaya");
  };

  // APIs Actions
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newOrder.customerId) return toast.error("Customer select karna zaroori hai");
    if (newOrder.items.length === 0) return toast.error("Kam se kam ek item zaroori hai");
    
    // Validate items
    for (let item of newOrder.items) {
      if (!item.itemName || item.quantity < 1 || item.pricePerItem < 1) {
        return toast.error("Please add valid quantity & price for all items");
      }
    }

    try {
      await orderService.create(newOrder);
      toast.success("Order create ho gaya! 🧺");
      setNewOrderModal(false);
      setNewOrder({
        customerId: '',
        items: [{ itemName: 'Shirt', quantity: 1, pricePerItem: '' }],
        expectedDelivery: '',
        notes: ''
      });
      fetchOrders();
    } catch (err) {
      handleError(err);
    }
  };

  const handleUpdateStatus = async (id, newStatus, currentStatus) => {
    const currentIndex = STATUS_FLOW.indexOf(currentStatus);
    const newIndex = STATUS_FLOW.indexOf(newStatus);
    
    if (newIndex < currentIndex) {
      // Refresh to reset dropdown if backward
      fetchOrders();
      return toast.error("Status piche nahi le ja sakte", { icon: '⚠️' });
    }

    try {
      await orderService.updateStatus(id, newStatus);
      toast.success("Status update hua! ✅");
      fetchOrders();
    } catch (err) {
      handleError(err);
      fetchOrders(); // reset select
    }
  };

  const handleSendBill = async (id) => {
    try {
      await orderService.sendBill(id);
      toast.success("Bill bheja gaya! 📱");
    } catch (err) {
      toast.error("❌ Bill nahi bheja");
    }
  };

  const handleCashSubmit = async (e) => {
    e.preventDefault();
    try {
      await orderService.cashPayment(cashModal.id, cashModal.amount);
      toast.success(`Cash payment ₹${cashModal.amount} mark hua! 💵`);
      setCashModal(null);
      fetchOrders();
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await orderService.delete(id);
      toast.success("Order delete ho gaya! 🗑️", { style: { background: '#f43f5e', color: '#fff' }});
      setDeleteConfirm(null);
      setViewOrder(null);
      fetchOrders();
    } catch (err) {
      handleError(err);
    }
  };

  // Helpers
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const calculateNewOrderTotal = () => {
    return newOrder.items.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.pricePerItem) || 0;
      return sum + (q * p);
    }, 0);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start xl:items-end gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">📦 Orders</h1>
          <p className="text-slate-400 font-medium">DattaKrupa Laundry — All Orders</p>
        </div>
        <button 
          onClick={() => setNewOrderModal(true)}
          className="bg-brand-orange hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-brand-orange/20 transition-all transform hover:-translate-y-0.5 whitespace-nowrap"
        >
          ➕ New Order
        </button>
      </div>

      {/* 2. STATS BAR */}
      <div className="flex overflow-x-auto gap-3 pb-2 hide-scroll z-10 relative">
        <button onClick={() => setStatusFilter('ALL')} className={`flex-shrink-0 px-5 py-3 rounded-xl border font-bold transition flex items-center gap-2 ${statusFilter === 'ALL' ? 'bg-slate-700 text-white border-slate-600' : 'bg-[#151820] text-slate-400 border-[rgba(255,255,255,0.05)] hover:bg-slate-800'}`}>
          All Orders <span className="text-xs bg-slate-900 px-2 py-0.5 rounded-full">{orders.length}</span>
        </button>
        <button onClick={() => setStatusFilter('RECEIVED')} className={`flex-shrink-0 px-5 py-3 rounded-xl border font-bold transition flex items-center gap-2 ${statusFilter === 'RECEIVED' ? 'bg-slate-700 text-white border-slate-600' : 'bg-[#151820] text-slate-400 border-[rgba(255,255,255,0.05)] hover:bg-slate-800'}`}>
          📥 Received <span className="text-xs bg-slate-800 text-slate-200 px-2 py-0.5 rounded-full">{stats.received}</span>
        </button>
        <button onClick={() => setStatusFilter('WASHING')} className={`flex-shrink-0 px-5 py-3 rounded-xl border font-bold transition flex items-center gap-2 ${statusFilter === 'WASHING' ? 'bg-blue-900/40 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(79,158,255,0.1)]' : 'bg-[#151820] text-slate-400 border-[rgba(255,255,255,0.05)] hover:border-blue-500/30'}`}>
          🫧 Washing {stats.washing > 0 && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse ml-1"></span>} <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{stats.washing}</span>
        </button>
        <button onClick={() => setStatusFilter('DRYING')} className={`flex-shrink-0 px-5 py-3 rounded-xl border font-bold transition flex items-center gap-2 ${statusFilter === 'DRYING' ? 'bg-orange-900/40 text-brand-orange border-brand-orange/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'bg-[#151820] text-slate-400 border-[rgba(255,255,255,0.05)] hover:border-brand-orange/30'}`}>
          💨 Drying {stats.drying > 0 && <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse ml-1"></span>} <span className="text-xs bg-brand-orange/20 text-brand-orange px-2 py-0.5 rounded-full">{stats.drying}</span>
        </button>
        <button onClick={() => setStatusFilter('READY')} className={`flex-shrink-0 px-5 py-3 rounded-xl border font-bold transition flex items-center gap-2 ${statusFilter === 'READY' ? 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(34,211,165,0.1)]' : 'bg-[#151820] text-slate-400 border-[rgba(255,255,255,0.05)] hover:border-emerald-500/30'}`}>
          ✅ Ready <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{stats.ready}</span>
        </button>
        <button onClick={() => setStatusFilter('DELIVERED')} className={`flex-shrink-0 px-5 py-3 rounded-xl border font-bold transition flex items-center gap-2 ${statusFilter === 'DELIVERED' ? 'bg-purple-900/40 text-purple-400 border-purple-500/30 shadow-[0_0_15px_rgba(167,139,250,0.1)]' : 'bg-[#151820] text-slate-400 border-[rgba(255,255,255,0.05)] hover:border-purple-500/30'}`}>
          🚚 Delivered <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">{stats.delivered}</span>
        </button>
      </div>

      {/* 3. FILTER BAR */}
      <div className="bg-[#151820] p-4 rounded-xl border border-[rgba(255,255,255,0.07)] shadow-lg flex flex-col xl:flex-row gap-4 justify-between items-center relative z-20">
        <div className="w-full xl:w-96 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name or phone..."
            className="w-full bg-black/50 border border-[rgba(255,255,255,0.1)] rounded-lg py-2 pl-10 pr-4 text-white focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition placeholder-slate-500"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">✕</button>}
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative">
            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="appearance-none bg-black/50 border border-[rgba(255,255,255,0.1)] text-slate-300 py-2 pl-4 pr-10 rounded-lg outline-none cursor-pointer focus:border-brand-orange min-w-[140px]">
              <option value="ALL">Payment: All</option>
              <option value="PAID">Paid ✅</option>
              <option value="UNPAID">Unpaid ❌</option>
              <option value="PARTIAL">Partial 🟡</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
          </div>

          <div className="relative">
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="appearance-none bg-black/50 border border-[rgba(255,255,255,0.1)] text-slate-300 py-2 pl-4 pr-10 rounded-lg outline-none cursor-pointer focus:border-brand-orange min-w-[140px]">
              <option value="Newest">Sort: Newest</option>
              <option value="Oldest">Sort: Oldest</option>
              <option value="Highest Amount">Highest Amount</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
          </div>
        </div>
      </div>

      {/* 4. ORDERS TABLE */}
      {loading ? (
        <div className="bg-[#151820] rounded-2xl border border-[rgba(255,255,255,0.05)] overflow-hidden shadow-xl p-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-slate-800 rounded w-full"></div>
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-slate-800/50 rounded w-full"></div>)}
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-[#151820] rounded-xl border border-[rgba(255,255,255,0.05)] p-16 flex flex-col items-center justify-center text-center shadow-xl">
          <div className="text-6xl mb-4 text-slate-700">🛒</div>
          <h3 className="text-xl font-bold text-white mb-2">Koi order nahi hai abhi tak</h3>
          <p className="text-slate-500 mb-6 max-w-md">Try changing filters or add a new order using the button above.</p>
        </div>
      ) : (
        <div className="bg-[#151820] rounded-2xl border border-[rgba(255,255,255,0.05)] overflow-hidden shadow-xl">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left align-middle whitespace-nowrap">
              <thead className="text-xs text-slate-400 uppercase bg-black/60 border-b border-white/5">
                <tr>
                  <th className="px-5 py-4 font-semibold">#</th>
                  <th className="px-5 py-4 font-semibold">Customer</th>
                  <th className="px-5 py-4 font-semibold">Items</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Payment</th>
                  <th className="px-5 py-4 font-semibold">Total / Due</th>
                  <th className="px-5 py-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredOrders.map(order => {
                  const getStatusClass = (status) => {
                    const c = {
                      'RECEIVED': 'bg-slate-700/50 text-slate-300 border-slate-600',
                      'WASHING': 'bg-blue-900/40 text-[#4f9eff] border-blue-500/30 font-bold',
                      'DRYING': 'bg-orange-900/40 text-[#f97316] border-orange-500/30 font-bold',
                      'READY': 'bg-emerald-900/40 text-[#22d3a5] border-emerald-500/30 font-bold',
                      'DELIVERED': 'bg-purple-900/40 text-[#a78bfa] border-purple-500/30 font-bold'
                    };
                    return c[status] || c['RECEIVED'];
                  };

                  const getPaymentBadge = (status) => {
                    if (status === 'PAID') return <span className="bg-[#22d3a5]/10 text-[#22d3a5] px-2.5 py-1 rounded border border-[#22d3a5]/20 font-bold text-[10px] tracking-wider uppercase">PAID</span>;
                    if (status === 'PARTIAL') return <span className="bg-[#f59e0b]/10 text-[#f59e0b] px-2.5 py-1 rounded border border-[#f59e0b]/20 font-bold text-[10px] tracking-wider uppercase">PARTIAL</span>;
                    return <span className="bg-[#f43f5e]/10 text-[#f43f5e] px-2.5 py-1 rounded border border-[#f43f5e]/20 font-bold text-[10px] tracking-wider uppercase">UNPAID</span>;
                  };

                  const isWashingOrDrying = order.status === 'WASHING' || order.status === 'DRYING';

                  return (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-400">#{order.id}</td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-white text-base">{order.customerName}</div>
                        <div className="text-xs text-slate-500 font-medium">📞 {order.customerPhone}</div>
                        <div className="text-[10px] text-slate-600 font-medium mt-1">{formatDate(order.createdAt)}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-300">{order.items?.length || 0} Items</div>
                        <div className="text-xs text-slate-500 truncate max-w-[150px]" title={order.items?.map(i => `${i.itemName}x${i.quantity}`).join(', ')}>
                          {order.items?.map(i => `${i.itemName}×${i.quantity}`).join(', ')}
                        </div>
                      </td>
                      <td className="px-5 py-4 relative group">
                        <div className="relative">
                           {isWashingOrDrying && <span className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full animate-ping z-10 bg-[currentColor] opacity-30" style={{ color: order.status === 'WASHING' ? '#4f9eff' : '#f97316' }}></span>}
                           {isWashingOrDrying && <span className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full z-10" style={{ backgroundColor: order.status === 'WASHING' ? '#4f9eff' : '#f97316' }}></span>}
                          
                          <select 
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value, order.status)}
                            className={`appearance-none border text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer pr-6 w-full text-center transition ${getStatusClass(order.status)}`}
                          >
                            <option value="RECEIVED" className="bg-black text-white">RECEIVED</option>
                            <option value="WASHING" className="bg-black text-white">WASHING</option>
                            <option value="DRYING" className="bg-black text-white">DRYING</option>
                            <option value="READY" className="bg-black text-white">READY</option>
                            <option value="DELIVERED" className="bg-black text-white">DELIVERED</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {getPaymentBadge(order.paymentStatus)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-sm min-w-[100px]">
                            <span className="text-slate-500 text-xs">Total:</span> 
                            <span className="font-bold text-white">₹{order.totalAmount || 0}</span>
                          </div>
                          {(order.dueAmount || 0) > 0 ? (
                            <div className="flex justify-between items-center text-xs mt-0.5 border-t border-slate-700/50 pt-1">
                              <span className="text-rose-500/80 uppercase font-bold text-[10px]">Due:</span> 
                              <span className="font-bold text-rose-500">₹{order.dueAmount}</span>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center text-xs mt-0.5 border-t border-slate-700/50 pt-1">
                              <span className="text-emerald-500/80 uppercase font-bold text-[10px]">Paid:</span> 
                              <span className="font-bold text-emerald-500">₹{order.paidAmount}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2 justify-center">
                          {((order.status === 'READY' || order.status === 'DELIVERED') && order.paymentStatus !== 'PAID') && (
                            <WhatsAppButton type="bill" id={order.id} customerName={order.customerName} defaultText="Bill Bhejo" showIconOnly={true} />
                          )}
                          {order.paymentStatus !== 'PAID' && (
                            <button 
                              onClick={() => setCashModal({ id: order.id, customerName: order.customerName, amount: order.dueAmount })}
                              title="Mark Cash Payment"
                              className="w-8 h-8 rounded bg-slate-700/50 text-slate-300 border border-slate-600 flex items-center justify-center hover:bg-slate-600 hover:text-white transition-colors text-sm"
                            >
                              💵
                            </button>
                          )}
                          <button 
                            onClick={() => setViewOrder(order)}
                            title="View Details"
                            className="w-8 h-8 rounded bg-blue-500/10 text-[#4f9eff] border border-blue-500/20 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                          >
                            👁️
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm(order)}
                            title="Delete Order"
                            className="w-8 h-8 rounded bg-rose-500/10 text-[#f43f5e] border border-rose-500/20 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. NEW ORDER MODAL */}
      {newOrderModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setNewOrderModal(false)}></div>
          <div className="relative bg-[#151820] border border-brand-orange/20 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-neutral-900 to-black p-5 border-b border-slate-800 flex justify-between items-center shadow-md z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><span>➕</span> New Order</h3>
              <button onClick={() => setNewOrderModal(false)} className="text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800 transition">✕</button>
            </div>
            
            <form onSubmit={handleCreateOrder} className="p-6 overflow-y-auto space-y-6">
              {/* Customer Select */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5 flex justify-between">
                  <span>Customer <span className="text-brand-orange">*</span></span>
                  <a href="/customers" className="text-brand-orange text-xs hover:underline">Add New Customer</a>
                </label>
                <select 
                  required
                  value={newOrder.customerId}
                  onChange={e => setNewOrder({...newOrder, customerId: e.target.value})}
                  className="w-full bg-black/60 border border-slate-700 rounded-lg p-3 text-white focus:border-brand-orange outline-none transition"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phoneNumber})</option>)}
                </select>
              </div>

              {/* Items Table */}
              <div className="bg-black/30 border border-slate-800 rounded-xl p-4">
                <label className="block text-sm font-semibold text-slate-300 mb-3">Items list <span className="text-brand-orange">*</span></label>
                
                <div className="space-y-3">
                  {newOrder.items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <select 
                        value={item.itemName}
                        onChange={e => {
                          const newI = [...newOrder.items];
                          newI[index].itemName = e.target.value;
                          setNewOrder({...newOrder, items: newI});
                        }}
                        className="flex-1 bg-black/60 border border-slate-700 rounded-lg p-2.5 text-white focus:border-brand-orange outline-none w-full sm:w-auto"
                      >
                        <option value="" disabled>Select Item</option>
                        {ITEMS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                      
                      <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-24">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">Qty</span>
                          <input type="number" min="1" placeholder="1" value={item.quantity} 
                            onChange={e => {
                              const newI = [...newOrder.items];
                              newI[index].quantity = e.target.value;
                              setNewOrder({...newOrder, items: newI});
                            }}
                            className="w-full bg-black/60 border border-slate-700 rounded-lg p-2.5 pl-10 text-white focus:border-brand-orange outline-none" 
                          />
                        </div>
                        <div className="relative flex-1 sm:w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                          <input type="number" min="1" placeholder="30" value={item.pricePerItem} 
                            onChange={e => {
                              const newI = [...newOrder.items];
                              newI[index].pricePerItem = e.target.value;
                              setNewOrder({...newOrder, items: newI});
                            }}
                            className="w-full bg-black/60 border border-slate-700 rounded-lg p-2.5 pl-8 text-white focus:border-brand-orange outline-none" 
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            if(newOrder.items.length === 1) return;
                            const newI = newOrder.items.filter((_, i) => i !== index);
                            setNewOrder({...newOrder, items: newI});
                          }}
                          className={`px-3 py-2 rounded-lg font-bold border ${newOrder.items.length === 1 ? 'border-slate-800 text-slate-600 bg-transparent' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'}`}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setNewOrder({
                      ...newOrder, 
                      items: [...newOrder.items, { itemName: 'Pant', quantity: 1, pricePerItem: '' }]
                    })}
                    className="text-brand-orange hover:text-orange-400 font-bold text-sm bg-brand-orange/10 px-4 py-2 rounded-lg transition"
                  >
                    + Add More Item
                  </button>
                  <div className="text-right">
                    <span className="text-slate-400 text-sm">Estimated Total: </span>
                    <span className="text-xl font-black text-white">₹{calculateNewOrderTotal()}</span>
                  </div>
                </div>
              </div>

              {/* Extras */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5 flex gap-2 items-center">
                    <span>🗓️ Expected Delivery</span>
                  </label>
                  <input type="date" value={newOrder.expectedDelivery} onChange={e => setNewOrder({...newOrder, expectedDelivery: e.target.value})} className="w-full bg-black/60 border border-slate-700 text-slate-400 rounded-lg p-3 focus:border-brand-orange outline-none custom-date-input" />
                </div>
                <div className="flex-2 w-full sm:w-2/3">
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5 flex gap-2 items-center">
                    <span>📝 Notes</span>
                  </label>
                  <input type="text" placeholder="E.g., Mild detergent use karo" value={newOrder.notes} onChange={e => setNewOrder({...newOrder, notes: e.target.value})} className="w-full bg-black/60 border border-slate-700 text-white rounded-lg p-3 focus:border-brand-orange outline-none" />
                </div>
              </div>
              
              <div className="pt-4 flex gap-3 border-t border-slate-800">
                <button type="button" onClick={() => setNewOrderModal(false)} className="flex-1 py-3 px-4 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl font-medium transition">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 px-4 bg-gradient-to-r from-brand-orange to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-xl font-bold transition shadow-lg shadow-brand-orange/20">
                  ✅ Order Banao
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. ORDER DETAIL MODAL */}
      {viewOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setViewOrder(null)}></div>
          <div className="relative bg-[#151820] border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-black/80 p-5 border-b border-slate-800 flex justify-between items-center shadow-md">
              <div>
                <h3 className="text-xl font-bold text-white">Order #{viewOrder.id}</h3>
                <p className="text-xs text-slate-400 mt-1">{formatDate(viewOrder.createdAt)}</p>
              </div>
              <button onClick={() => setViewOrder(null)} className="text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800 transition">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-lg font-bold text-brand-orange">{viewOrder.customerName}</h4>
                  <p className="text-slate-300 text-sm flex items-center gap-1.5 mt-1"><span>📞</span> {viewOrder.customerPhone}</p>
                </div>
                <div className="text-right flex flex-col gap-2 items-end">
                  <span className={`px-3 py-1 text-xs font-bold rounded border uppercase tracking-widest ${
                    viewOrder.status === 'RECEIVED' ? 'bg-slate-700/50 text-slate-300 border-slate-600' :
                    viewOrder.status === 'WASHING' ? 'bg-blue-900/40 text-[#4f9eff] border-blue-500/30' :
                    viewOrder.status === 'DRYING' ? 'bg-orange-900/40 text-[#f97316] border-orange-500/30' :
                    viewOrder.status === 'READY' ? 'bg-emerald-900/40 text-[#22d3a5] border-emerald-500/30' :
                    'bg-purple-900/40 text-[#a78bfa] border-purple-500/30'
                  }`}>{viewOrder.status}</span>
                  
                  <span className={`px-3 py-1 text-[10px] font-bold rounded border uppercase tracking-widest ${
                    viewOrder.paymentStatus === 'PAID' ? 'bg-[#22d3a5]/10 text-[#22d3a5] border-[#22d3a5]/20' :
                    viewOrder.paymentStatus === 'PARTIAL' ? 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20' :
                    'bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/20'
                  }`}>{viewOrder.paymentStatus}</span>
                </div>
              </div>

              <div className="bg-black/50 rounded-xl border border-slate-800 overflow-hidden mb-6">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 bg-black/80 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {viewOrder.items?.map((item, idx) => (
                      <tr key={idx} className="text-slate-300">
                        <td className="px-4 py-3 font-medium">{item.itemName}</td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">₹{item.pricePerItem}</td>
                        <td className="px-4 py-3 text-right font-bold text-white">₹{item.subtotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 mb-6">
                <div className="flex-1 space-y-3">
                  {viewOrder.notes && (
                    <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-3">
                      <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider mb-1">📝 Notes</p>
                      <p className="text-slate-300 text-sm">{viewOrder.notes}</p>
                    </div>
                  )}
                  {viewOrder.expectedDelivery && (
                    <div className="bg-slate-800/30 border border-slate-800 rounded-lg p-3">
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">🗓️ Expected Delivery</p>
                      <p className="text-white text-sm font-medium">{formatDate(viewOrder.expectedDelivery)}</p>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-1/2 bg-black/40 border border-slate-800 rounded-xl p-4 self-start">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal</span>
                      <span>₹{viewOrder.totalAmount}</span>
                    </div>
                    {(viewOrder.paidAmount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-500 pb-2 border-b border-slate-800">
                        <span>Paid</span>
                        <span>-₹{viewOrder.paidAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-black text-white pt-1">
                      <span>Total Due</span>
                      <span className={(viewOrder.dueAmount || 0) > 0 ? "text-rose-500" : "text-emerald-400"}>₹{viewOrder.dueAmount || viewOrder.totalAmount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {((viewOrder.status === 'READY' || viewOrder.status === 'DELIVERED') && viewOrder.paymentStatus !== 'PAID') && (
                  <WhatsAppButton type="bill" id={viewOrder.id} customerName={viewOrder.customerName} defaultText="📱 Send Bill" showIconOnly={false} />
                )}
                {viewOrder.paymentStatus !== 'PAID' && (
                  <button onClick={() => { setViewOrder(null); setCashModal({ id: viewOrder.id, customerName: viewOrder.customerName, amount: viewOrder.dueAmount }); }} className={`py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 ${((viewOrder.status !== 'READY' && viewOrder.status !== 'DELIVERED') || viewOrder.paymentStatus === 'PAID') ? 'col-span-2 sm:col-span-4' : 'col-span-1 sm:col-span-2'}`}>
                    💵 Cash Pay
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. CASH PAYMENT MODAL */}
      {cashModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setCashModal(null)}></div>
          <div className="relative bg-[#151820] border border-emerald-500/20 w-full max-w-sm rounded-2xl shadow-[0_0_50px_rgba(34,211,165,0.05)] overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-slate-900 to-black p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">💵 Cash Payment</h3>
              <button onClick={() => setCashModal(null)} className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800 transition">✕</button>
            </div>
            
            <form onSubmit={handleCashSubmit} className="p-6 text-center">
              <p className="text-slate-400 text-sm mb-1">Order <span className="text-white font-bold">#{cashModal.id}</span> — {cashModal.customerName}</p>
              <p className="text-emerald-400 font-bold mb-6 tracking-wide uppercase text-xs">Total Due: ₹{cashModal.amount}</p>

              <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Amount Received (₹)</label>
              <div className="relative max-w-[200px] mx-auto mb-6">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white font-bold text-2xl">₹</span>
                <input 
                  type="number" min="1" max={cashModal.amount} required 
                  value={cashModal.amount} onChange={e => setCashModal({...cashModal, amount: e.target.value})}
                  className="w-full bg-black border border-slate-700 rounded-xl p-4 pl-12 text-white text-2xl font-black text-center focus:border-emerald-400 focus:ring-1 outline-none transition" 
                  autoFocus 
                />
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setCashModal(null)} className="flex-1 py-3 bg-neutral-800 text-slate-300 rounded-xl hover:bg-neutral-700 transition font-medium">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-white text-black font-extrabold rounded-xl hover:bg-slate-200 transition">✅ Mark Paid</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. DELETE ORDER MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}></div>
          <div className="relative bg-[#151820] border-2 border-rose-500/50 w-full max-w-sm rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.1)] overflow-hidden animate-fade-in p-6 text-center">
            <div className="text-5xl mb-4 animate-bounce">⚠️</div>
            <h3 className="text-xl font-bold text-white mb-2">Order Delete Karo?</h3>
            <p className="text-white font-medium mb-1">Order #{deleteConfirm.id} — {deleteConfirm.customerName}</p>
            <p className="text-slate-400 text-sm mb-2">₹{deleteConfirm.totalAmount} — {deleteConfirm.status}</p>
            <p className="text-rose-400 font-bold text-xs uppercase tracking-wider mb-6 bg-rose-500/10 py-1.5 rounded-lg inline-block px-3">Yeh action undo nahi hoga!</p>
            
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 bg-neutral-800 text-white rounded-xl font-medium hover:bg-neutral-700 transition">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition shadow-lg shadow-rose-600/20">🗑️ Delete Karo</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
