import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import WhatsAppButton from '../components/WhatsAppButton';
import whatsappService from '../services/whatsappService';
import customerService from '../services/customerService';

const AVATAR_COLORS = [
  'bg-emerald-500 text-white',
  'bg-orange-500 text-white',
  'bg-blue-500 text-white',
  'bg-purple-500 text-white',
  'bg-rose-500 text-white',
  'bg-teal-500 text-white'
];

export default function UdhariLedger() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Sort and Filter state
  const [sortBy, setSortBy] = useState('HIGHEST_DUE'); // HIGHEST_DUE, LOWEST_DUE, NAME
  const [filterBy, setFilterBy] = useState('ALL'); // ALL, DELIVERED_UNPAID, HIGH_RISK
  
  // Cash Payment Modal status
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, orderId: null, amount: '' });
  
  const [sendingBulk, setSendingBulk] = useState(false);

  const fetchUdhari = async () => {
    try {
      setLoading(true);
      const response = await API.get('/orders');
      const allOrders = Array.isArray(response.data.data) ? response.data.data : [];
      
      // 1. Filter orders: paymentStatus === "UNPAID" || "PARTIAL"
      const unpaidOrders = allOrders.filter(o => o.paymentStatus === 'UNPAID' || o.paymentStatus === 'PARTIAL');
      setOrders(unpaidOrders);
      setError(false);
    } catch (error) {
      console.error("Failed to fetch udhari", error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUdhari();
  }, []);

  // 2 & 3. Group by customer and calculate per customer
  const customerLedgers = useMemo(() => {
    const groups = {};
    
    orders.forEach(order => {
      const cid = order.customerId;
      if (!groups[cid]) {
        groups[cid] = {
          customerId: cid,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          totalDue: 0,
          orders: []
        };
      }
      
      groups[cid].orders.push(order);
      groups[cid].totalDue += (order.dueAmount || 0);
    });
    
    let ledgers = Object.values(groups);
    
    // Apply Filters
    if (filterBy === 'DELIVERED_UNPAID') {
      // Show customers if ANY of their orders is DELIVERED and unpaid
      ledgers = ledgers.filter(c => c.orders.some(o => o.status === 'DELIVERED'));
    } else if (filterBy === 'HIGH_RISK') {
      ledgers = ledgers.filter(c => c.totalDue > 300);
    }
    
    // Apply Sorting
    ledgers.sort((a, b) => {
      if (sortBy === 'HIGHEST_DUE') return b.totalDue - a.totalDue;
      if (sortBy === 'LOWEST_DUE') return a.totalDue - b.totalDue;
      if (sortBy === 'NAME') return (a.customerName || '').localeCompare(b.customerName || '');
      return 0;
    });
    
    return ledgers;
  }, [orders, filterBy, sortBy]);

  // Global summaries
  const totalUdhari = customerLedgers.reduce((sum, c) => sum + c.totalDue, 0);
  const totalCustomersWithDue = customerLedgers.length;
  
  // Check for DELIVERED but UNPAID across all orders
  const deliveredUnpaidOrders = orders.filter(o => o.status === 'DELIVERED').length;

  const handleSendBulkReminders = async () => {
    setSendingBulk(true);
    try {
        const res = await customerService.getUdhari();
        const customersList = Array.isArray(res.data?.data) ? res.data.data : (res.data || []);
        const pendingCustomers = customersList.filter(c => (c.totalDue || 0) > 0);
        
        if (pendingCustomers.length === 0) {
            toast.success("Koi udhari customers nahi hai!", { icon: "✅" });
            setSendingBulk(false);
            return;
        }

        const toastId = toast.loading(`Bhej raha hoon... 0/${pendingCustomers.length}`);
        const customerIds = pendingCustomers.map(c => c.id);
        const results = await whatsappService.sendBulkReminders(customerIds, (current, total) => {
            toast.loading(`Bhej raha hoon... ${current}/${total}`, { id: toastId });
        });
        
        const successes = results.filter(r => r.success).length;
        toast.success(`✅ ${successes} customers ko reminder bheja!`, { id: toastId, duration: 4000 });
    } catch (err) {
        toast.error("❌ Error fetching customers for bulk reminder");
    } finally {
        setSendingBulk(false);
    }
  };

  const submitCashPayment = async () => {
    try {
      await API.put(`/orders/${paymentModal.orderId}/cash-payment?amount=${paymentModal.amount}`);
      toast.success("💵 Cash payment mark hua!");
      setPaymentModal({ isOpen: false, orderId: null, amount: '' });
      fetchUdhari();
    } catch (error) {
      console.error("Payment error", error);
      toast.error("❌ Kuch galat ho gaya");
    }
  };

  const sendPaymentLink = async (orderId) => {
    try {
      await API.post(`/payment/create-order/${orderId}`);
      toast.success("💳 Payment link sent successfully!");
    } catch (error) {
      console.error("Payment link error", error);
      toast.error("❌ Failed to send link");
    }
  };

  // Helpers
  const getBorderColor = (totalDue) => {
    if (totalDue > 300) return 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
    if (totalDue > 100) return 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]';
    return 'border-yellow-500/50 hover:border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.05)]';
  };

  const getOrderStatusDisplay = (status) => {
    switch (status) {
      case 'RECEIVED': return <span className="text-slate-400 font-bold bg-slate-800/50 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">RECEIVED <span className="w-2 h-2 rounded-full bg-slate-500"></span></span>;
      case 'WASHING': return <span className="text-blue-400 font-bold bg-blue-900/30 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">WASHING <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse border border-blue-400"></span></span>;
      case 'DRYING': return <span className="text-brand-orange font-bold bg-orange-900/30 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">DRYING <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse border border-orange-400"></span></span>;
      case 'READY': return <span className="text-emerald-400 font-bold bg-emerald-900/30 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">READY 🟢</span>;
      case 'DELIVERED': return <span className="text-purple-400 font-bold bg-purple-900/30 px-2 py-0.5 rounded text-xs inline-flex items-center gap-1">DELIVERED ⚠️</span>;
      default: return <span className="text-slate-400 text-xs px-2 py-0.5">{status}</span>;
    }
  };

  if (error && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#151820] rounded-2xl border border-rose-500/20">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-rose-400 mb-2">Data load nahi hua</h2>
        <button onClick={fetchUdhari} className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition border border-slate-700">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">📒 Udhari Ledger</h1>
        <p className="text-slate-400 font-medium">Jinhe paisa dena hai</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 bg-[#151820] border border-[rgba(255,255,255,0.05)] rounded-2xl animate-pulse"></div>
          <div className="h-14 bg-[#151820] border border-[rgba(255,255,255,0.05)] rounded-xl animate-pulse w-full max-w-lg mb-6"></div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-[#151820] border border-[rgba(255,255,255,0.05)] rounded-2xl h-80 animate-pulse"></div>
            ))}
          </div>
        </div>
      ) : orders.length === 0 ? (
        /* 5. EMPTY STATE */
        <div className="bg-gradient-to-br from-emerald-900/40 to-black rounded-2xl border border-emerald-500/30 p-12 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(34,211,165,0.1)]">
          <div className="text-6xl mb-4 animate-bounce">🎉</div>
          <h3 className="text-2xl font-bold text-emerald-400 mb-2 drop-shadow-md">Sab clear hai! Kisi ki udhari nahi hai!</h3>
          <p className="text-emerald-500/80 mb-6 max-w-md font-medium">Excellent business management! No pending payments found.</p>
        </div>
      ) : (
        <>
          {/* 2. TOP SUMMARY BANNER */}
          <div className="bg-gradient-to-r from-rose-900/80 via-[#151820] to-black rounded-2xl border border-rose-500/30 p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -z-0"></div>
            <div className="relative z-10 flex items-center gap-5">
              <div className="bg-rose-500/20 p-4 rounded-xl text-rose-400 border border-rose-500/20">
                <span className="text-4xl">💰</span>
              </div>
              <div className="flex flex-col">
                <p className="text-rose-200 uppercase font-bold text-sm tracking-wider mb-1">Total Udhari Market Mein</p>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-4xl font-black text-white">₹{totalUdhari.toFixed(2)}</h2>
                </div>
                <div className="flex items-center gap-3 mt-2 text-sm font-medium">
                  <span className="text-slate-300 bg-black/40 px-2.5 py-1 rounded-md border border-slate-700/50 shadow-inner">👥 {totalCustomersWithDue} customers ka paisa baaki</span>
                  {deliveredUnpaidOrders > 0 && <span className="text-rose-400 bg-rose-950/50 px-2.5 py-1 rounded-md border border-rose-500/30 shadow-inner">⚠️ {deliveredUnpaidOrders} orders deliver ho gaye lekin unpaid</span>}
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleSendBulkReminders}
              disabled={sendingBulk}
              className="relative z-10 w-full md:w-auto bg-gradient-to-br from-brand-orange to-orange-600 hover:from-orange-500 hover:to-orange-500 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-brand-orange/20 transition-all transform hover:-translate-y-1 active:translate-y-0 text-lg flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`text-2xl transition-transform ${sendingBulk ? 'animate-spin opacity-50' : 'group-hover:scale-125'}`}>{sendingBulk ? '⏳' : '📱'}</span>
              <span>{sendingBulk ? 'Bhej raha...' : 'Sabko Reminder Bhejo'}</span>
            </button>
          </div>

          {/* 3. ALERT BANNER */}
          {deliveredUnpaidOrders > 0 && (
            <div className="bg-gradient-to-r from-rose-500/20 to-transparent border-l-4 border-l-rose-500 rounded-lg p-4 flex items-center gap-4 animate-fade-in shadow-lg">
              <div className="text-2xl animate-pulse">⚠️</div>
              <div>
                <h3 className="font-bold text-rose-400 text-lg">{deliveredUnpaidOrders} orders deliver ho gaye hain lekin payment nahi aayi!</h3>
                <p className="text-rose-200/70 text-sm">Please recover these dues on priority. Unhe alert karein ya payment link bhejein.</p>
              </div>
            </div>
          )}

          {/* 6. SORT & FILTER BAR */}
          <div className="bg-[#151820] p-4 rounded-xl border border-[rgba(255,255,255,0.07)] shadow-lg flex flex-col md:flex-row gap-4 items-center">
            <span className="text-slate-400 font-bold flex items-center gap-2 mr-2">
              <span className="text-xl">🎛️</span> Filters:
            </span>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative">
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-black/50 border border-[rgba(255,255,255,0.1)] text-slate-300 py-2.5 pl-4 pr-10 rounded-lg outline-none cursor-pointer focus:border-brand-orange hover:bg-black/80 transition text-sm font-medium"
                >
                  <option value="HIGHEST_DUE">Sort: Highest Due</option>
                  <option value="LOWEST_DUE">Sort: Lowest Due</option>
                  <option value="NAME">Sort: Names (A-Z)</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
              </div>
              
              <div className="relative">
                <select 
                  value={filterBy} 
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="appearance-none bg-black/50 border border-[rgba(255,255,255,0.1)] text-slate-300 py-2.5 pl-4 pr-10 rounded-lg outline-none cursor-pointer focus:border-brand-orange hover:bg-black/80 transition text-sm font-medium"
                >
                  <option value="ALL">Filter: All Unpaid</option>
                  <option value="DELIVERED_UNPAID">Filter: Delivered+Unpaid</option>
                  <option value="HIGH_RISK">Filter: High Risk (&gt;₹300)</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
              </div>
            </div>
            {customerLedgers.length !== totalCustomersWithDue && (
              <span className="text-orange-400 text-sm ml-auto animate-fade-in italic">
                Showing {customerLedgers.length} results
              </span>
            )}
          </div>

          {/* 4. CUSTOMER UDHARI CARDS */}
          {customerLedgers.length === 0 ? (
            <div className="py-10 text-center text-slate-500 font-medium">Koi result nahi mila in filters ke mutabiq.</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {customerLedgers.map((customer, idx) => {
                const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const cardBorder = getBorderColor(customer.totalDue);
                
                return (
                  <div key={customer.customerId} className={`bg-[#151820] rounded-2xl border-2 transition-all p-0 flex flex-col ${cardBorder} relative overflow-hidden group slide-up-anim`}>
                    
                    {/* Header */}
                    <div className="p-5 border-b border-[rgba(255,255,255,0.05)] bg-gradient-to-br from-black/60 to-transparent flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black shadow-lg ${avatarColor}`}>
                          {customer.customerName?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white leading-tight">{customer.customerName}</h3>
                          <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-0.5">
                            <span>📞</span> <span>{customer.customerPhone}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Total Dues</div>
                        <div className="text-2xl font-black text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]">₹{customer.totalDue}</div>
                      </div>
                    </div>

                    {/* Orders Table inside card */}
                    <div className="p-5 flex-1 max-h-56 overflow-y-auto custom-scrollbar">
                      <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-3 flex items-center justify-between">
                        <span>{customer.orders.length} Unpaid {customer.orders.length === 1 ? 'Order' : 'Orders'}</span>
                        <span className="bg-slate-800/80 px-2 py-0.5 rounded-full text-[10px] border border-slate-700">Detailed Breakdown</span>
                      </div>
                      
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 bg-black/40 rounded-lg border-b border-transparent">
                          <tr>
                            <th className="px-3 py-2 rounded-l-md font-medium">#</th>
                            <th className="px-3 py-2 font-medium">Status / Action</th>
                            <th className="px-3 py-2 font-medium">Items</th>
                            <th className="px-3 py-2 rounded-r-md font-medium text-right bg-rose-950/20 text-rose-300">Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {customer.orders.map(o => (
                            <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-3 py-3 text-slate-400 font-medium">#{o.id}</td>
                              <td className="px-3 py-3 flex items-center gap-2">
                                {getOrderStatusDisplay(o.status)}
                                {((o.status === "READY" || o.status === "DELIVERED") && (o.paymentStatus === "UNPAID" || o.paymentStatus === "PARTIAL")) && (
                                  <WhatsAppButton type="bill" id={o.id} customerName={customer.customerName} defaultText="Bill" showIconOnly={true} />
                                )}
                              </td>
                              <td className="px-3 py-3 text-slate-300">{Array.isArray(o.items) ? o.items.length : 0} items</td>
                              <td className="px-3 py-3 text-right font-bold text-rose-400">₹{o.dueAmount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-[rgba(255,255,255,0.05)] bg-black/40 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <WhatsAppButton type="reminder" id={customer.customerId} customerName={customer.customerName} defaultText="WhatsApp Reminder" showIconOnly={false} />
                      
                      <button 
                        onClick={() => setPaymentModal({ isOpen: true, orderId: customer.orders[0].id, amount: customer.totalDue })}
                        className="flex-1 min-w-[120px] py-2.5 px-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors font-semibold text-sm flex items-center justify-center gap-1.5"
                      >
                        <span className="text-lg">💵</span> Mark Cash
                      </button>
                      
                      <button 
                        onClick={() => sendPaymentLink(customer.orders[0].id)}
                        className="flex-1 min-w-[120px] py-2.5 px-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500 hover:text-white transition-colors font-semibold text-sm flex items-center justify-center gap-1.5"
                      >
                        <span className="text-lg">💳</span> Send Link
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Cash Payment Modal */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPaymentModal({ ...paymentModal, isOpen: false })}></div>
          <div className="relative bg-[#151820] border border-emerald-500/50 w-full max-w-sm rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-emerald-900 to-black p-5 border-b border-emerald-900/50 text-center">
              <div className="text-4xl mb-2">💵</div>
              <h3 className="text-xl font-bold text-white">Cash Payment Received</h3>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-semibold text-slate-300 mb-2 text-center">Enter amount received (₹)</label>
              <div className="relative max-w-[200px] mx-auto mb-6">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-2xl">₹</span>
                <input 
                  type="number" 
                  value={paymentModal.amount} 
                  onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value })}
                  className="w-full bg-black/50 border border-emerald-500/30 rounded-xl p-4 pl-12 text-white text-2xl font-black text-center focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setPaymentModal({ ...paymentModal, isOpen: false })}
                  className="flex-1 py-3 px-4 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitCashPayment}
                  disabled={!paymentModal.amount || paymentModal.amount <= 0}
                  className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-emerald-700 text-white rounded-xl font-bold transition shadow-lg shadow-emerald-500/20"
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
