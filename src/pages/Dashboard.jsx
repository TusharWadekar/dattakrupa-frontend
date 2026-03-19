import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import dashboardService from '../services/dashboardService';
import whatsappService from '../services/whatsappService';
import orderService from '../services/orderService';
import customerService from '../services/customerService';
import toast from 'react-hot-toast';

function Dashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(0);

    const [sendingBills, setSendingBills] = useState(false);
    const [sendingReminders, setSendingReminders] = useState(false);

    const handleSendAllBills = async () => {
        setSendingBills(true);
        try {
            const res = await orderService.getAll();
            const ordersList = Array.isArray(res.data?.data) ? res.data.data : (res.data || []);
            const pendingOrders = ordersList.filter(o => 
                (o.status === "READY" || o.status === "DELIVERED") && 
                (o.paymentStatus === "UNPAID" || o.paymentStatus === "PARTIAL")
            );
            
            if (pendingOrders.length === 0) {
                toast.success("Koi pending bills nahi hai!", { icon: "✅" });
                setSendingBills(false);
                return;
            }

            const toastId = toast.loading(`Bhej raha hoon... 0/${pendingOrders.length}`);
            const orderIds = pendingOrders.map(o => o.id);
            const results = await whatsappService.sendBulkBills(orderIds, (current, total) => {
                toast.loading(`Bhej raha hoon... ${current}/${total}`, { id: toastId });
            });
            
            const successes = results.filter(r => r.success).length;
            toast.success(`✅ ${successes} bills bheje gaye!`, { id: toastId, duration: 4000 });
        } catch (err) {
            toast.error("❌ Error fetching orders");
        } finally {
            setSendingBills(false);
        }
    };

    const handleSendBulkReminders = async () => {
        setSendingReminders(true);
        try {
            const res = await customerService.getUdhari();
            const customersList = Array.isArray(res.data?.data) ? res.data.data : (res.data || []);
            const pendingCustomers = customersList.filter(c => (c.totalDue || 0) > 0);
            
            if (pendingCustomers.length === 0) {
                toast.success("Koi udhari customers nahi hai!", { icon: "✅" });
                setSendingReminders(false);
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
            toast.error("❌ Error fetching customers");
        } finally {
            setSendingReminders(false);
        }
    };

    const fetchDashboardData = () => {
        dashboardService.getData()
            .then(res => {
                setData(res.data.data || res.data);
                setLoading(false);
                setError(false);
                setLastUpdated(0);
            })
            .catch(err => {
                console.error('Dashboard error:', err);
                setLoading(false);
                setError(true);
            });
    };

    useEffect(() => {
        // Initial fetch
        fetchDashboardData();

        // Auto-refresh every 30 seconds
        const intervalId = setInterval(() => {
            fetchDashboardData();
        }, 30000);

        // Last updated timer counter
        const timerId = setInterval(() => {
            setLastUpdated(prev => prev + 1);
        }, 1000);

        return () => {
            clearInterval(intervalId);
            clearInterval(timerId);
        };
    }, []);

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-800 border-t-brand-orange"></div>
                <p className="text-slate-400 font-medium animate-pulse">Loading Dashboard Data...</p>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-neutral-900 rounded-2xl border border-red-500/20 p-8 shadow-xl">
                <div className="text-5xl mb-2">⚠️</div>
                <h2 className="text-xl font-bold text-red-400">Data load nahi hua</h2>
                <p className="text-slate-400">Dobara try karo</p>
                <button 
                    onClick={() => { setLoading(true); fetchDashboardData(); }}
                    className="mt-6 px-6 py-2.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition font-medium"
                >
                    Retry Loading
                </button>
            </div>
        );
    }

    const d = data || {};

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* 1. HEADER BANNER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-neutral-900/50 p-6 rounded-2xl border border-slate-800 shadow-lg">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </div>
                        <span className="text-xs font-bold text-green-400 tracking-wider uppercase">Shop is Open</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">DattaKrupa Laundry</h1>
                    <p className="text-brand-orange font-medium mt-1">Owner Dashboard</p>
                </div>
                <div className="text-right text-xs text-slate-500 bg-black/40 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg>
                    Last updated: {lastUpdated}s ago
                </div>
            </div>

            {/* Empty State */}
            {(d.todayOrders ?? 0) === 0 && (
                <div className="bg-orange-500/10 border border-brand-orange/30 rounded-xl p-4 flex items-center gap-4 animate-pulse">
                    <div className="text-2xl">🌅</div>
                    <p className="text-orange-200 font-medium">Aaj koi order nahi aaya abhi tak. Naye din ki shuruaat karein!</p>
                </div>
            )}

            {/* 2. STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Card 1 - Orange */}
                <div className="bg-gradient-to-br from-neutral-900 to-black rounded-2xl p-6 border border-orange-500/20 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500 text-6xl">📦</div>
                    <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-brand-orange/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-orange-400 mb-2">
                            <span className="text-xl">📦</span>
                            <span className="text-sm font-semibold tracking-wide uppercase">Aaj ke Orders</span>
                        </div>
                        <div className="mt-2 flex items-end gap-2">
                            <h2 className="text-4xl font-extrabold text-white">{d.todayOrders ?? 0}</h2>
                        </div>
                    </div>
                </div>

                {/* Card 2 - Green */}
                <div className="bg-gradient-to-br from-neutral-900 to-black rounded-2xl p-6 border border-green-500/20 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500 text-6xl">💰</div>
                    <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-green-500/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-green-400 mb-2">
                            <span className="text-xl">💰</span>
                            <span className="text-sm font-semibold tracking-wide uppercase">Aaj ki Kamai</span>
                        </div>
                        <div className="mt-2 flex items-end gap-2">
                            <h2 className="text-4xl font-extrabold text-white">₹{d.todayRevenue ?? 0.0}</h2>
                        </div>
                    </div>
                </div>

                {/* Card 3 - Red */}
                <div className="bg-gradient-to-br from-neutral-900 to-black rounded-2xl p-6 border border-red-500/20 shadow-xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500 text-6xl">📒</div>
                    <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-red-400 mb-2">
                            <span className="text-xl">📒</span>
                            <span className="text-sm font-semibold tracking-wide uppercase">Total Udhari</span>
                        </div>
                        <div className="mt-2 flex flex-col">
                            <h2 className="text-4xl font-extrabold text-white">₹{d.totalPendingUdhari ?? 0.0}</h2>
                            <span className="text-xs text-red-400/80 font-medium mt-1 bg-red-500/10 px-2 py-0.5 rounded-md inline-flex w-max border border-red-500/20">
                                {d.customersWithUdhari ?? 0} customers
                            </span>
                        </div>
                    </div>
                </div>

                {/* Card 4 - Blue */}
                <div className="bg-gradient-to-br from-neutral-900 to-black rounded-2xl p-6 border border-blue-500/20 shadow-xl overflow-hidden relative group hover:border-blue-500/40 transition">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500 text-6xl">✅</div>
                    <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-blue-400 mb-2">
                            <span className="text-xl">✅</span>
                            <span className="text-sm font-semibold tracking-wide uppercase">Taiyar Orders</span>
                        </div>
                        <div className="mt-2 flex flex-col">
                            <h2 className="text-4xl font-extrabold text-white">{d.readyOrders ?? 0}</h2>
                            <span className="text-xs text-blue-300 animate-pulse mt-1">Bill bhejo!</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 3. ORDER STATUS FLOW */}
                <div className="lg:col-span-2 bg-neutral-900 rounded-2xl border border-slate-700/50 p-6 shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <span className="bg-slate-800 p-1.5 rounded-lg">📊</span>
                        Order Pipeline
                    </h3>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full relative">
                        {/* Connecting Line */}
                        <div className="hidden sm:block absolute top-[45%] left-10 right-10 h-1 bg-slate-800 -z-0 rounded-full"></div>
                        
                        {/* Received */}
                        <div className="flex flex-col items-center relative z-10 w-full sm:w-auto bg-neutral-900 p-2 sm:p-0 rounded-xl">
                            <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-2xl shadow-lg mb-3">
                                📥
                            </div>
                            <span className="text-3xl font-black text-white">{d.receivedOrders ?? 0}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Received</span>
                        </div>

                        {/* Washing */}
                        <div className="flex flex-col items-center relative z-10 w-full sm:w-auto bg-neutral-900 p-2 sm:p-0 rounded-xl">
                            <div className="w-14 h-14 rounded-full bg-blue-900/50 border-2 border-blue-500 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(59,130,246,0.5)] mb-3 relative">
                                {(d.washingOrders ?? 0) > 0 && <span className="absolute inset-0 rounded-full border border-blue-400 animate-ping opacity-75"></span>}
                                🫧
                            </div>
                            <span className="text-3xl font-black text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">{d.washingOrders ?? 0}</span>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mt-1">Washing</span>
                        </div>

                        {/* Drying */}
                        <div className="flex flex-col items-center relative z-10 w-full sm:w-auto bg-neutral-900 p-2 sm:p-0 rounded-xl">
                            <div className="w-14 h-14 rounded-full bg-orange-900/50 border-2 border-brand-orange flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(249,115,22,0.3)] mb-3 relative">
                                {(d.dryingOrders ?? 0) > 0 && <span className="absolute inset-0 rounded-full border border-brand-orange animate-pulse opacity-75"></span>}
                                💨
                            </div>
                            <span className="text-3xl font-black text-brand-orange">{d.dryingOrders ?? 0}</span>
                            <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider mt-1">Drying</span>
                        </div>

                        {/* Ready */}
                        <div className="flex flex-col items-center relative z-10 w-full sm:w-auto bg-neutral-900 p-2 sm:p-0 rounded-xl">
                            <div className="w-14 h-14 rounded-full bg-green-900/40 border-2 border-green-500 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(34,197,94,0.3)] mb-3">
                                ✅
                            </div>
                            <span className="text-3xl font-black text-green-400">{d.readyOrders ?? 0}</span>
                            <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider mt-1">Ready</span>
                        </div>

                        {/* Delivered */}
                        <div className="flex flex-col items-center relative z-10 w-full sm:w-auto bg-neutral-900 p-2 sm:p-0 rounded-xl opacity-80">
                            <div className="w-14 h-14 rounded-full bg-purple-900/30 border-2 border-purple-500/50 flex items-center justify-center text-2xl mb-3">
                                🚚
                            </div>
                            <span className="text-3xl font-black text-purple-400">{d.deliveredOrders ?? 0}</span>
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mt-1">Delivered</span>
                        </div>
                    </div>
                </div>

                {/* 4. PAYMENT SUMMARY CARD */}
                <div className="bg-neutral-900 rounded-2xl border border-slate-700/50 p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <span className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg border border-emerald-500/30">💸</span>
                        Aaj ki Payments
                    </h3>
                    
                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">💳</span>
                                <span className="text-slate-300 font-medium">Online (Razorpay)</span>
                            </div>
                            <span className="font-bold text-white">₹{d.todayOnlinePayments ?? 0.0}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">💵</span>
                                <span className="text-slate-300 font-medium">Cash</span>
                            </div>
                            <span className="font-bold text-white">₹{d.todayCashPayments ?? 0.0}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-900/40 to-green-800/20 border border-emerald-500/30 mt-2">
                            <span className="text-emerald-400 font-bold uppercase tracking-wider text-sm">💰 Total Kamai</span>
                            <span className="font-black text-xl text-emerald-400">₹{d.todayRevenue ?? 0.0}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 5. QUICK STATS CARD */}
                <div className="bg-neutral-900 rounded-2xl border border-slate-700/50 p-6 shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                        <span className="bg-blue-500/20 text-blue-400 p-1.5 rounded-lg border border-blue-500/30">📈</span>
                        Lifetime Stats
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-black/40 border border-slate-800 rounded-xl p-4 text-center hover:bg-black/60 transition">
                            <div className="text-2xl mb-1">👥</div>
                            <div className="text-2xl font-bold text-white">{d.totalCustomers ?? 0}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">Customers</div>
                        </div>
                        <div className="bg-black/40 border border-slate-800 rounded-xl p-4 text-center hover:bg-black/60 transition">
                            <div className="text-2xl mb-1">📦</div>
                            <div className="text-2xl font-bold text-white">{d.totalOrders ?? 0}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold mt-1">Total Orders</div>
                        </div>
                        <div className="bg-black/40 border border-red-900/30 rounded-xl p-4 text-center hover:bg-red-900/10 transition">
                            <div className="text-2xl mb-1">📒</div>
                            <div className="text-2xl font-bold text-red-400">{d.customersWithUdhari ?? 0}</div>
                            <div className="text-[10px] text-red-400/80 uppercase font-bold mt-1">Udhari Users</div>
                        </div>
                    </div>
                </div>

                {/* 6. QUICK ACTION BUTTONS */}
                <div className="bg-neutral-900 rounded-2xl border border-slate-700/50 p-6 shadow-xl flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                        <span className="bg-purple-500/20 text-purple-400 p-1.5 rounded-lg border border-purple-500/30">⚡</span>
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Link to="/new-order" className="flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-brand-orange to-orange-600 hover:from-orange-500 hover:to-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20 transition-all transform hover:-translate-y-1 group">
                            <span className="text-2xl group-hover:scale-125 transition-transform">➕</span>
                            <span className="font-bold text-sm">New Order</span>
                        </Link>
                        
                        <button disabled={sendingBills} onClick={handleSendAllBills} className={`flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-[#25D366] to-[#1DA851] text-white rounded-xl shadow-lg transition-all group ${sendingBills ? 'opacity-50 cursor-not-allowed' : 'hover:from-[#1DA851] hover:to-[#178540] shadow-green-500/20 transform hover:-translate-y-1'}`}>
                            <span className={`text-2xl transition-transform ${sendingBills ? 'animate-spin opacity-50' : 'group-hover:scale-125'}`}>{sendingBills ? '⏳' : '📱'}</span>
                            <span className="font-bold text-sm text-center tracking-tight">{sendingBills ? 'Bhej raha...' : 'Send All Bills'}</span>
                        </button>
                        
                        <button disabled={sendingReminders} onClick={handleSendBulkReminders} className={`flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-xl shadow-lg transition-all group ${sendingReminders ? 'opacity-50 cursor-not-allowed' : 'hover:from-red-500 hover:to-rose-600 shadow-red-500/20 transform hover:-translate-y-1'}`}>
                            <span className={`text-2xl transition-transform ${sendingReminders ? 'animate-spin opacity-50' : 'group-hover:scale-125'}`}>{sendingReminders ? '⏳' : '📒'}</span>
                            <span className="font-bold text-sm text-center tracking-tight">{sendingReminders ? 'Bhej raha...' : 'Udhari Reminder'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 7. FOOTER TIP BOX */}
            {d.readyOrders > 0 ? (
                <div className="bg-gradient-to-r from-orange-500/10 to-transparent border-l-4 border-l-brand-orange border border-slate-700/50 rounded-xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="text-3xl animate-bounce">💡</div>
                        <div>
                            <h3 className="text-lg font-bold text-white">{d.readyOrders} orders taiyar hain!</h3>
                            <p className="text-orange-200/80 text-sm">Abhi WhatsApp pe customers ko bills bhejo pick up ke liye.</p>
                        </div>
                    </div>
                    <button disabled={sendingBills} onClick={handleSendAllBills} className="text-white bg-[#25D366] hover:bg-[#1DA851] disabled:opacity-50 disabled:cursor-not-allowed font-bold py-2.5 px-6 rounded-lg whitespace-nowrap shadow-lg shadow-green-500/30 transition-colors flex items-center gap-2">
                        {sendingBills ? '⏳ Bhej raha...' : '📱 Saare Bills Bhejo'}
                    </button>
                </div>
            ) : (
                <div className="bg-gradient-to-r from-green-500/10 to-transparent border-l-4 border-l-green-500 border border-slate-700/50 rounded-xl p-5 shadow-lg flex items-center gap-4">
                    <div className="text-3xl text-green-400">✅</div>
                    <div>
                        <h3 className="text-lg font-bold text-green-400">Sab orders deliver ho gaye!</h3>
                        <p className="text-green-500/70 text-sm">Shop ka counter clear hai. Great job!</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
