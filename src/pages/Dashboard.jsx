import { useEffect, useState } from 'react';
import dashboardService from '../services/dashboardService';

function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Backend se data lo
        dashboardService.getData()
            .then(res => {
                setData(res.data.data || res.data); // Support both nested data or flat response
                setLoading(false);
            })
            .catch(err => {
                console.error('Dashboard error:', err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-600">DattaKrupa Laundry Dashboard</h1>
                <p className="text-slate-400 text-sm mt-1">Overview of today's activities and summary.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-neutral-900 rounded-xl p-6 border border-slate-700/50 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition duration-300">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-400 opacity-20 rounded-full blur-2xl group-hover:scale-150 transition duration-500"></div>
                    <p className="text-slate-400 text-sm font-medium mb-2 relative z-10">Today Revenue</p>
                    <h2 className="text-3xl font-bold text-white relative z-10">
                        ₹{data?.todayRevenue || 0}
                    </h2>
                </div>
                
                <div className="bg-neutral-900 rounded-xl p-6 border border-slate-700/50 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition duration-300">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-brand-orange to-yellow-500 opacity-20 rounded-full blur-2xl group-hover:scale-150 transition duration-500"></div>
                    <p className="text-slate-400 text-sm font-medium mb-2 relative z-10">Ready Orders</p>
                    <h2 className="text-3xl font-bold text-white relative z-10">
                        {data?.readyOrders || 0}
                    </h2>
                </div>
                
                <div className="bg-neutral-900 rounded-xl p-6 border border-slate-700/50 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition duration-300">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-red-500 to-rose-400 opacity-20 rounded-full blur-2xl group-hover:scale-150 transition duration-500"></div>
                    <p className="text-slate-400 text-sm font-medium mb-2 relative z-10">Udhari Pending</p>
                    <h2 className="text-3xl font-bold text-red-400 relative z-10">
                        ₹{data?.totalPendingUdhari || 0}
                    </h2>
                </div>
                
                <div className="bg-neutral-900 rounded-xl p-6 border border-slate-700/50 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition duration-300">
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-400 opacity-20 rounded-full blur-2xl group-hover:scale-150 transition duration-500"></div>
                    <p className="text-slate-400 text-sm font-medium mb-2 relative z-10">Total Customers</p>
                    <h2 className="text-3xl font-bold text-white relative z-10">
                        {data?.totalCustomers || 0}
                    </h2>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
