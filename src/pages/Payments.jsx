import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import paymentService from '../services/paymentService';
import orderService from '../services/orderService';
import WhatsAppButton from '../components/WhatsAppButton';

export default function Payments() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Filtering
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, PAID, UNPAID, PARTIAL
  const [sortOrder, setSortOrder] = useState('Newest');

  // Modals
  const [cashModal, setCashModal] = useState({ isOpen: false, orderId: null, amount: '', customerName: '' });
  const [receiptModal, setReceiptModal] = useState({ isOpen: false, order: null, payments: [] });
  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState(false);

  // Load Razorpay Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getAll();
      const allOrders = Array.isArray(response.data?.data) ? response.data.data : [];
      setOrders(allOrders);
      setError(false);
    } catch (error) {
      console.error("Failed to fetch orders", error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Calculations
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalPending = 0;
    let totalBilled = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let partialCount = 0;

    orders.forEach(o => {
      totalRevenue += (o.paidAmount || 0);
      totalPending += (o.dueAmount || 0);
      totalBilled += (o.totalAmount || 0);
      
      if (o.paymentStatus === 'PAID') paidCount++;
      else if (o.paymentStatus === 'PARTIAL') partialCount++;
      else unpaidCount++; // Default to UNPAID
    });

    return {
      totalRevenue, totalPending, totalBilled, totalOrders: orders.length,
      paidCount, unpaidCount, partialCount
    };
  }, [orders]);

  // Filtered List
  const displayOrders = useMemo(() => {
    let filtered = orders;
    
    if (filter !== 'ALL') {
      filtered = filtered.filter(o => o.paymentStatus === filter);
    }
    
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(o => 
        (o.customerName || '').toLowerCase().includes(q) || 
        (o.customerPhone || '').includes(q) ||
        o.id.toString() === q
      );
    }
    
    // Sorting
    filtered.sort((a, b) => {
      if (sortOrder === 'Highest Amount') return b.totalAmount - a.totalAmount;
      if (sortOrder === 'Oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt); // Newest default
    });

    return filtered;
  }, [orders, filter, search, sortOrder]);

  // Handle Error
  const handleError = (err) => {
    const status = err.response?.status;
    const msg = err.response?.data?.message;
    
    if (status === 402) toast.error("Payment process nahi hua");
    else if (status === 404) toast.error("Resource nahi mila");
    else if (status === 400) toast.error("Invalid data / Invalid payment process");
    else toast.error(msg || "Kuch galat ho gaya");
  };

  // Actions
  const handleCashPayment = async (e) => {
    e.preventDefault();
    try {
      await orderService.cashPayment(cashModal.orderId, cashModal.amount);
      toast.success(`💵 ₹${cashModal.amount} cash payment mark hua!`);
      setCashModal({ isOpen: false, orderId: null, amount: '', customerName: '' });
      fetchOrders();
    } catch (error) {
      handleError(error);
    }
  };

  // manual handleSendBill replaced

  const handleShowReceipt = async (order) => {
    try {
      const response = await paymentService.getByOrder(order.id);
      const paymentsList = Array.isArray(response.data?.data) ? response.data.data : [];
      setReceiptModal({ isOpen: true, order, payments: paymentsList });
    } catch (error) {
      toast.error("Failed to fetch receipt data");
    }
  };

  // 6. PAY ONLINE FLOW
  const handlePayNow = async (order) => {
    setIsProcessingRazorpay(true);
    let verifyLoadId = null;

    try {
      // Step 3: Call POST /api/payment/create-order/{id}
      const res = await paymentService.createOrder(order.id);
      const paymentData = res.data?.data;
      
      if (!paymentData || !paymentData.razorpayOrderId) {
        throw new Error("Invalid Razorpay Order Data returned");
      }

      // Step 5: Open Razorpay popup
      const options = {
        key: paymentData.keyId,
        amount: paymentData.amount, // in paise
        currency: "INR",
        name: "DattaKrupa Laundry",
        description: paymentData.description || `DattaKrupa Laundry — Order #${order.id}`,
        order_id: paymentData.razorpayOrderId,
        
        // Step 7: Razorpay callback handler
        handler: async function (response) {
          verifyLoadId = toast.loading("Verifying payment...");
          try {
            // Step 8: Call POST /api/payment/verify
            await paymentService.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            
            // Step 9: Success
            toast.success("✅ Payment successful! DattaKrupa Laundry 🎉", { id: verifyLoadId });
            fetchOrders();
          } catch(e) {
            handleError(e);
            toast.error("❌ Payment verify nahi hua", { id: verifyLoadId });
          }
        },
        prefill: {
          name: paymentData.customerName || order.customerName,
          contact: paymentData.customerPhone || order.customerPhone
        },
        theme: { color: "#f97316" }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response){
        toast.error("❌ Payment fail ho gaya");
        if(verifyLoadId) toast.dismiss(verifyLoadId);
      });
      
      rzp.open();

    } catch (error) {
      handleError(error);
    } finally {
      setIsProcessingRazorpay(false);
    }
  };

  // Helpers
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Unknown";
    const d = new Date(dateString);
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getStatusBadge = (status) => {
    if (status === 'PAID') return <span className="bg-[#22d3a5]/10 text-[#22d3a5] px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider">PAID 🟢</span>;
    if (status === 'PARTIAL') return <span className="bg-[#f59e0b]/10 text-[#f59e0b] px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider">PARTIAL 🟡</span>;
    return <span className="bg-[#f43f5e]/10 text-[#f43f5e] px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider">UNPAID 🔴</span>;
  };

  if (error && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#151820] rounded-2xl border border-red-500/20">
        <button onClick={fetchOrders} className="px-6 py-2 bg-neutral-800 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">💳 Payments</h1>
        <p className="text-slate-400 font-medium">DattaKrupa Laundry — Payment History</p>
      </div>

      {loading && orders.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-[#151820] rounded-2xl"></div>)}
        </div>
      ) : (
        <>
          {/* 2. TOP STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#151820] to-black rounded-2xl p-5 border border-[#22d3a5]/20 shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="bg-[#22d3a5]/20 p-3 rounded-xl text-[#22d3a5] text-xl">💰</div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Collected</p>
                  <h2 className="text-2xl font-black text-white">₹{metrics.totalRevenue.toFixed(2)}</h2>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#151820] to-black rounded-2xl p-5 border border-[#f43f5e]/20 shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="bg-[#f43f5e]/20 p-3 rounded-xl text-[#f43f5e] text-xl">⏳</div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Pending</p>
                  <h2 className="text-2xl font-black text-white">₹{metrics.totalPending.toFixed(2)}</h2>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#151820] to-black rounded-2xl p-5 border border-[#f97316]/20 shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="bg-[#f97316]/20 p-3 rounded-xl text-[#f97316] text-xl">📋</div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Billed</p>
                  <h2 className="text-2xl font-black text-white">₹{metrics.totalBilled.toFixed(2)}</h2>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#151820] to-black rounded-2xl p-5 border border-[#4f9eff]/20 shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="bg-[#4f9eff]/20 p-3 rounded-xl text-[#4f9eff] text-xl">📊</div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Orders</p>
                  <h2 className="text-2xl font-black text-white">{metrics.totalOrders}</h2>
                </div>
              </div>
            </div>
          </div>

          {/* 3. PAYMENT STATUS BREAKDOWN (Clickable) */}
          <div className="bg-[#151820] rounded-xl border border-[rgba(255,255,255,0.05)] p-4 flex flex-wrap items-center justify-center gap-8 shadow-inner font-bold text-sm">
            <button onClick={() => setFilter('PAID')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${filter === 'PAID' ? 'bg-[#22d3a5]/10 border border-[#22d3a5]/30' : 'hover:bg-slate-800'}`}>
              <span className="w-3 h-3 rounded-full bg-[#22d3a5] shadow-[0_0_8px_#22d3a5]"></span> 
              <span className="text-slate-300">Paid:</span> 
              <span className="text-white">{metrics.paidCount}</span>
            </button>
            <button onClick={() => setFilter('UNPAID')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${filter === 'UNPAID' ? 'bg-[#f43f5e]/10 border border-[#f43f5e]/30' : 'hover:bg-slate-800'}`}>
              <span className="w-3 h-3 rounded-full bg-[#f43f5e] shadow-[0_0_8px_#f43f5e]"></span> 
              <span className="text-slate-300">Unpaid:</span> 
              <span className="text-white">{metrics.unpaidCount}</span>
            </button>
            <button onClick={() => setFilter('PARTIAL')} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${filter === 'PARTIAL' ? 'bg-[#f59e0b]/10 border border-[#f59e0b]/30' : 'hover:bg-slate-800'}`}>
              <span className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]"></span> 
              <span className="text-slate-300">Partial:</span> 
              <span className="text-white">{metrics.partialCount}</span>
            </button>
          </div>

          {/* 4. FILTER & SEARCH BAR */}
          <div className="bg-[#151820] p-4 rounded-xl border border-[rgba(255,255,255,0.07)] shadow-lg flex flex-col lg:flex-row gap-4 justify-between items-center">
            <div className="w-full lg:w-96 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone or order ID..."
                className="w-full bg-black/50 border border-[rgba(255,255,255,0.1)] rounded-lg py-2 pl-10 pr-4 text-white focus:border-brand-orange focus:ring-1 outline-none transition placeholder-slate-500"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 hide-scroll">
              <div className="flex gap-2">
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'PAID', label: 'Paid ✅' },
                  { id: 'UNPAID', label: 'Unpaid ❌' },
                  { id: 'PARTIAL', label: 'Partial 🟡' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-4 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider whitespace-nowrap transition-all ${filter === f.id ? 'bg-slate-700 text-white shadow-inner' : 'bg-black/40 text-slate-400 hover:bg-slate-800'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="appearance-none bg-black/50 border border-[rgba(255,255,255,0.1)] text-slate-300 py-2 pl-4 pr-10 rounded-lg outline-none cursor-pointer focus:border-brand-orange min-w-[130px] font-medium text-sm">
                  <option value="Newest">Newest First</option>
                  <option value="Oldest">Oldest First</option>
                  <option value="Highest Amount">Highest Amount</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▼</span>
              </div>
            </div>
          </div>

          {/* 5. PAYMENT TABLE & EMPTY STATE */}
          {displayOrders.length === 0 ? (
            metrics.unpaidCount === 0 && metrics.partialCount === 0 && filter === 'UNPAID' ? (
              <div className="bg-gradient-to-br from-emerald-900/40 to-black rounded-2xl border border-emerald-500/30 p-12 text-center shadow-[0_0_30px_rgba(34,211,165,0.1)] mt-8">
                <div className="text-6xl mb-4 animate-bounce">🎉</div>
                <h3 className="text-2xl font-bold text-emerald-400 mb-2">Sab payments clear hain!</h3>
              </div>
            ) : (
              <div className="bg-[#151820] rounded-xl p-16 text-center border border-slate-800 mt-8">
                <div className="text-5xl text-slate-700 mb-4">💰</div>
                <h3 className="text-lg font-bold text-white mb-1">Koi payment nahi hai abhi tak</h3>
                <p className="text-slate-500 text-sm">Change filters to view other transactions</p>
              </div>
            )
          ) : (
            <div className="bg-[#151820] rounded-2xl border border-[rgba(255,255,255,0.05)] overflow-hidden shadow-xl">
              <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-sm text-left align-middle whitespace-nowrap">
                  <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-black/60 border-b border-white/5">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Order</th>
                      <th className="px-5 py-4 font-semibold">Customer</th>
                      <th className="px-5 py-4 font-semibold text-center">Items</th>
                      <th className="px-5 py-4 font-semibold text-right">Total</th>
                      <th className="px-5 py-4 font-semibold text-right">Paid</th>
                      <th className="px-5 py-4 font-semibold text-right">Due</th>
                      <th className="px-5 py-4 font-semibold text-center">Status</th>
                      <th className="px-5 py-4 font-semibold">Date</th>
                      <th className="px-5 py-4 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {displayOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-300">#{order.id}</td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{order.customerName}</div>
                          <div className="text-[10px] text-slate-500 font-medium">📞 {order.customerPhone}</div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="font-bold text-emerald-100">{order.items?.length || 0} items</div>
                          <div className="text-[10px] text-slate-500 max-w-[120px] truncate mx-auto" title={order.items?.map(i => `${i.itemName}x${i.quantity}`).join(', ')}>
                            {order.items?.map(i => `${i.itemName}×${i.quantity}`).join(', ')}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-white">₹{order.totalAmount}</td>
                        <td className={`px-5 py-4 text-right font-bold ${(order.paidAmount || 0) > 0 ? 'text-[#22d3a5]' : 'text-slate-600'}`}>
                          ₹{order.paidAmount || 0}
                        </td>
                        <td className={`px-5 py-4 text-right font-bold ${(order.dueAmount || 0) > 0 ? 'text-[#f43f5e]' : 'text-[#22d3a5]'}`}>
                          ₹{order.dueAmount || 0}
                        </td>
                        <td className="px-5 py-4 text-center">{getStatusBadge(order.paymentStatus)}</td>
                        <td className="px-5 py-4 text-slate-400 text-xs font-medium">{formatDate(order.createdAt)}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2 justify-center">
                            {(order.paymentStatus === 'UNPAID' || order.paymentStatus === 'PARTIAL') && (
                              <>
                                <button 
                                  onClick={() => handlePayNow(order)}
                                  // disabled={isProcessingRazorpay}
                                  className="w-10 h-8 rounded bg-brand-orange/10 text-brand-orange border border-brand-orange/20 hover:bg-brand-orange hover:text-white flex items-center justify-center transition disabled:opacity-50 text-base"
                                  title="Pay via Razorpay Online"
                                >
                                  💳
                                </button>
                                {(order.status === 'READY' || order.status === 'DELIVERED') && (
                                  <WhatsAppButton type="bill" id={order.id} customerName={order.customerName} defaultText="Bill Bhejo" showIconOnly={true} />
                                )}
                                <button 
                                  onClick={() => setCashModal({ isOpen: true, orderId: order.id, amount: order.dueAmount, customerName: order.customerName })}
                                  className="w-10 h-8 rounded bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-600 hover:text-white flex items-center justify-center transition text-sm"
                                  title="Mark Cash Payment"
                                >
                                  💵
                                </button>
                              </>
                            )}
                            {order.paymentStatus === 'PAID' && (
                              <button
                                onClick={() => handleShowReceipt(order)}
                                className="px-4 h-8 rounded bg-[#4f9eff]/10 text-[#4f9eff] border border-[#4f9eff]/30 hover:bg-[#4f9eff] hover:text-white flex items-center justify-center transition text-[11px] font-bold tracking-wider gap-1"
                              >
                                <span>👁️</span> VIEW RECEIPT
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </>
      )}

      {/* 7. CASH PAYMENT MODAL */}
      {cashModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCashModal({ ...cashModal, isOpen: false })}></div>
          <div className="relative bg-[#151820] border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-slate-900 to-black p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">💵 Cash Payment</h3>
              <button onClick={() => setCashModal({ ...cashModal, isOpen: false })} className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800 transition">✕</button>
            </div>
            
            <form onSubmit={handleCashPayment} className="p-6">
              <div className="mb-6 text-center">
                <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Customer</p>
                <p className="text-white font-medium">{cashModal.customerName}</p>
                <p className="text-slate-500 text-xs mt-1">Order #{cashModal.orderId}</p>
              </div>

              <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-sm font-semibold text-slate-400">Total Due</span>
                <span className="text-emerald-400 font-bold">₹{cashModal.amount}</span>
              </div>

              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider pl-2 text-center mt-2">Amount Received (₹)</label>
              <div className="relative max-w-[200px] mx-auto mb-6">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold text-2xl">₹</span>
                <input 
                  type="number" min="1" required
                  value={cashModal.amount} 
                  onChange={(e) => setCashModal({ ...cashModal, amount: e.target.value })}
                  className="w-full bg-black/50 border border-slate-700 rounded-xl p-4 pl-12 text-white text-2xl font-black text-center focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setCashModal({ ...cashModal, isOpen: false })} className="flex-1 py-3 bg-neutral-800 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl font-medium transition">
                  Cancel
                </button>
                <button type="submit" disabled={!cashModal.amount || cashModal.amount <= 0} className="flex-1 py-3 bg-white text-black font-extrabold rounded-xl hover:bg-slate-200 transition disabled:opacity-50">
                  ✅ Mark Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. VIEW RECEIPT MODAL */}
      {receiptModal.isOpen && receiptModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setReceiptModal({ isOpen: false, order: null, payments: [] })}></div>
          <div className="relative bg-[#1a1f2e] border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-fade-in print:shadow-none print:w-full print:bg-white pb-6 container-receipt">
            
            {/* Top Pattern */}
            <div className="h-16 bg-brand-orange/10 border-b border-brand-orange/20 relative flex items-center justify-center w-full">
               <h2 className="text-brand-orange font-black text-xl italic tracking-widest">Laundry</h2>
               <button onClick={() => setReceiptModal({ isOpen: false, order: null, payments: [] })} className="absolute right-4 text-brand-orange hover:text-white font-black print:hidden">✕</button>
            </div>

            <div className="px-8 pt-6 pb-2 text-center border-b border-slate-700/50 border-dashed">
              <h3 className="text-xl font-bold text-white mb-1">Payment Receipt</h3>
              <p className="text-slate-400 text-[11px] uppercase tracking-widest mb-4">DattaKrupa Laundry</p>
              
              <div className="bg-black/30 rounded-lg p-3 text-left">
                <p className="text-slate-400 text-xs mb-1">Customer: <span className="text-white font-medium ml-1">{receiptModal.order.customerName}</span></p>
                <p className="text-slate-400 text-xs mb-1">Order No: <span className="text-white font-medium ml-1">#{receiptModal.order.id}</span></p>
                <p className="text-slate-400 text-xs">Date: <span className="text-white font-medium ml-1">{formatDate(receiptModal.order.createdAt)}</span></p>
              </div>
            </div>

            <div className="px-8 py-4">
              <h4 className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-3">Items summary</h4>
              <div className="space-y-2.5">
                {receiptModal.order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-300">{item.itemName} <span className="text-slate-500 text-xs mx-1">×</span> {item.quantity}</span>
                    <span className="text-white">₹{item.subtotal}</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-slate-700/50 border-dashed my-4 pt-4 flex justify-between items-center">
                <span className="text-slate-300 font-bold uppercase tracking-widest">Total</span>
                <span className="text-2xl font-black text-[#22d3a5]">₹{receiptModal.order.totalAmount}</span>
              </div>
            </div>

            <div className="bg-black/40 px-8 py-5 mx-4 rounded-xl border border-slate-800">
              <h4 className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-3">Transactions</h4>
              {receiptModal.payments.length > 0 ? (
                <div className="space-y-4">
                  {receiptModal.payments.map((p, pIdx) => (
                    <div key={pIdx} className="border-b border-slate-800 pb-3 last:pb-0 last:border-0 text-xs flex flex-col gap-1">
                      <div className="flex justify-between items-center text-white font-bold">
                        <span>₹{p.amount} <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase border ${p.paymentMode === 'ONLINE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-700/50 text-slate-300 border-slate-600'}`}>{p.paymentMode}</span></span>
                        <span className="text-[#22d3a5]">✅ SUCCESS</span>
                      </div>
                      <div className="flex justify-between text-slate-500 mt-1 uppercase text-[10px]">
                        <span>{p.razorpayPaymentId || `TXN-${p.id}`}</span>
                        <span>{formatDate(p.paymentDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs text-center italic">No individual payment records found (Fully marked previously)</p>
              )}
            </div>

            <div className="text-center mt-6">
               <p className="text-slate-600 font-black italic text-4xl opacity-10">PAID</p>
            </div>

            <button onClick={() => window.print()} className="mt-4 mx-8 mb-2 py-2.5 bg-brand-orange hover:bg-orange-600 text-white rounded-lg font-bold transition flex items-center justify-center gap-2 print:hidden uppercase tracking-widest text-[11px]">
              🖨️ Print Receipt
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
