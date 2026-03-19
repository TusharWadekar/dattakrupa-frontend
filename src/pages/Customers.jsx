import { useState, useEffect, useCallback } from 'react';
import customerService from '../services/customerService';
import toast from 'react-hot-toast';
import API from '../utils/api';
import WhatsAppButton from '../components/WhatsAppButton';

const AVATAR_COLORS = [
  'bg-orange-500 text-white',
  'bg-emerald-500 text-white',
  'bg-blue-500 text-white',
  'bg-purple-500 text-white',
  'bg-rose-500 text-white',
  'bg-teal-500 text-white'
];

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, UDHARI, ACTIVE, NEW
  
  // Modals state
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', phoneNumber: '', address: '' });
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // stores customer obj
  const [viewCustomer, setViewCustomer] = useState(null); // stores customer obj for slideover

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch();
      } else if (activeFilter !== 'ALL') {
        // Just triggering a re-render is fine; useMemo handles local filters if API search is empty
      } else {
        fetchCustomers();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      // If exactly 10 digits, search by phone
      if (/^\d{10}$/.test(searchQuery)) {
        const response = await customerService.getByPhone(searchQuery);
        const data = response.data?.data || response.data;
        setCustomers(data ? [data] : []);
      } else {
        // Search by name
        const response = await customerService.search(searchQuery);
        const data = response.data?.data || response.data || [];
        setCustomers(Array.isArray(data) ? data : []);
      }
      setError(false);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setCustomers([]);
        setError(false);
      } else {
        toast.error("Search fetch mein error aya");
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async (filterType = activeFilter) => {
    try {
      setLoading(true);
      let response;
      if (filterType === 'UDHARI') {
        response = await customerService.getUdhari();
      } else {
        response = await customerService.getAll();
      }
      
      let data = Array.isArray(response.data?.data || response.data) ? (response.data?.data || response.data) : [];
      
      // Client-side filtering for ACTIVE / NEW (if API doesn't support them directly)
      if (filterType === 'ACTIVE') {
        data = data.filter(c => (c.totalOrders || 0) > 0);
      } else if (filterType === 'NEW') {
        data = data.filter(c => (c.totalOrders || 0) === 0);
      }
      
      setCustomers(data);
      setError(false);
    } catch (err) {
      console.error("Failed to fetch customers", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery) {
      fetchCustomers(activeFilter);
    }
  }, [activeFilter, searchQuery]); // Re-run when activeFilter changes and search is empty

  // Form Handlers
  const handleOpenAddForm = () => {
    setIsEditing(false);
    setFormData({ id: null, name: '', phoneNumber: '', address: '' });
    setShowForm(true);
  };

  const handleOpenEditForm = (customer) => {
    setIsEditing(true);
    setFormData({ 
      id: customer.id, 
      name: customer.name, 
      phoneNumber: customer.phoneNumber, 
      address: customer.address || '' 
    });
    setShowForm(true);
  };

  const handleError = (error) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.errorCode;
    const msg = error.response?.data?.message;

    if (status === 409 || errorCode === 'DUPLICATE_RESOURCE') {
      toast.error("Yeh phone number already registered hai");
    } else if (status === 404 || errorCode === 'RESOURCE_NOT_FOUND') {
      toast.error("Customer nahi mila");
    } else if (status === 400 || errorCode === 'VALIDATION_ERROR') {
      toast.error(msg || "Details check karein, kuch galat hai");
    } else {
      toast.error("Kuch galat ho gaya, dobara try karo");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    if (formData.name.trim().length < 2) {
      return toast.error("Name kam se kam 2 characters ka hona chahiye");
    }
    
    if (!/^[6-9]\d{9}$/.test(formData.phoneNumber)) {
      return toast.error("Phone exactly 10 digits aur 6-9 se start hona chahiye");
    }

    try {
      if (isEditing) {
        await customerService.update(formData.id, {
          name: formData.name,
          phoneNumber: formData.phoneNumber,
          address: formData.address
        });
        toast.success("Customer update ho gaya! ✏️");
      } else {
        await customerService.create({
          name: formData.name,
          phoneNumber: formData.phoneNumber,
          address: formData.address
        });
        toast.success("Customer add ho gaya! 🎉");
      }
      setShowForm(false);
      fetchCustomers();
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await customerService.delete(id);
      toast.success("Customer delete ho gaya! 🗑️", { style: { background: '#f43f5e', color: '#fff', border: '1px solid #9f1239' }});
      setShowDeleteConfirm(null);
      
      // If deleting from the slide-over, close it
      if (viewCustomer && viewCustomer.id === id) {
        setViewCustomer(null);
      }
      
      fetchCustomers();
    } catch (err) {
      handleError(err);
    }
  };

  // Removed manual handleWhatsApp

  // Helpers
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getCardBorder = (c) => {
    if ((c.totalDue || 0) > 0) return 'border-rose-500/50 hover:border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]';
    if ((c.totalOrders || 0) === 0) return 'border-slate-700 hover:border-slate-500';
    return 'border-emerald-500/30 hover:border-emerald-500/80 shadow-[0_0_15px_rgba(34,211,165,0.05)]';
  };

  if (error && customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#151820] rounded-2xl border border-red-500/20">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-red-400 mb-2">Kuch galat ho gaya</h2>
        <button onClick={() => fetchCustomers()} className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition border border-slate-700">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">👥 Customers</h1>
        <p className="text-slate-400 font-medium">DattaKrupa Laundry — Customer Directory</p>
      </div>

      {/* 4. FILTER BUTTONS & ACTION BAR */}
      <div className="bg-[#151820] p-4 rounded-xl border border-[rgba(255,255,255,0.07)] shadow-lg flex flex-col md:flex-row gap-4 justify-between items-center relative z-20">
        <div className="w-full md:w-96 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or exact phone..."
            className="w-full bg-black/50 border border-[rgba(255,255,255,0.1)] rounded-lg py-2.5 pl-10 pr-10 text-white focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition placeholder-slate-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">✕</button>
          )}
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto hide-scroll pb-1 md:pb-0">
          <div className="flex gap-2 bg-black/40 p-1 rounded-lg border border-slate-800">
            <button onClick={() => setActiveFilter('ALL')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition whitespace-nowrap ${activeFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>All Customers</button>
            <button onClick={() => setActiveFilter('UDHARI')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition whitespace-nowrap ${activeFilter === 'UDHARI' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-slate-400 hover:text-white'}`}>Udhari Wale</button>
            <button onClick={() => setActiveFilter('ACTIVE')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition whitespace-nowrap ${activeFilter === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-white'}`}>Active</button>
            <button onClick={() => setActiveFilter('NEW')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition whitespace-nowrap ${activeFilter === 'NEW' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>New</button>
          </div>
          
          <button
            onClick={handleOpenAddForm}
            className="flex-none bg-gradient-to-r from-brand-orange to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-brand-orange/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
          >
            ➕ Add Customer
          </button>
        </div>
      </div>

      {searchQuery && !loading && (
        <p className="text-slate-400 text-sm italic px-2">
          {customers.length} customer(s) found
        </p>
      )}

      {/* CUSTOMER CARDS GRID */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-[#151820] rounded-xl border border-[rgba(255,255,255,0.05)] h-64 animate-pulse p-6 flex flex-col justify-between">
              <div className="flex gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-800"></div>
                <div className="space-y-2 flex-1 pt-2">
                  <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-16 bg-slate-800/50 rounded-lg w-full"></div>
              <div className="flex justify-between">
                <div className="h-8 bg-slate-800 rounded w-24"></div>
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-slate-800 rounded"></div>
                  <div className="h-8 w-8 bg-slate-800 rounded"></div>
                  <div className="h-8 w-8 bg-slate-800 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        /* Empty States */
        <div className={`rounded-2xl border p-12 flex flex-col items-center justify-center text-center shadow-xl ${activeFilter === 'UDHARI' && !searchQuery ? 'bg-gradient-to-br from-emerald-900/40 to-black border-emerald-500/30' : 'bg-[#151820] border-[rgba(255,255,255,0.05)]'}`}>
          {activeFilter === 'UDHARI' && !searchQuery ? (
            <>
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <h3 className="text-2xl font-bold text-emerald-400 mb-2">Sab clear! Kisi ki udhari nahi</h3>
              <p className="text-emerald-500/80 font-medium">Excellent business management!</p>
            </>
          ) : searchQuery ? (
            <>
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-white mb-2">'{searchQuery}' se koi customer nahi mila</h3>
              <button onClick={() => setSearchQuery('')} className="mt-4 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg transition">Clear Search</button>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">🏜️</div>
              <h3 className="text-xl font-bold text-white mb-2">Koi customer nahi hai</h3>
              <button onClick={handleOpenAddForm} className="mt-6 bg-brand-orange hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold transition shadow-lg shadow-brand-orange/20">➕ Pehla Customer Add Karo</button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {customers.map((customer) => {
            const numId = customer.id || 0;
            const avatarColor = AVATAR_COLORS[numId % 6];
            const borderClass = getCardBorder(customer);
            
            return (
              <div key={customer.id} className={`bg-[#151820] rounded-xl border-2 transition-all duration-300 p-6 flex flex-col ${borderClass} relative overflow-hidden group hover:-translate-y-1`}>
                {/* Status indicator line */}
                {(customer.totalDue || 0) > 0 && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600"></div>}
                {((customer.totalOrders || 0) > 0 && (customer.totalDue || 0) === 0) && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>}
                
                <div className="flex items-start gap-4 mb-5">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black shadow-lg ${avatarColor}`}>
                    {customer.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-lg font-bold text-white truncate">{customer.name}</h3>
                    <div className="flex items-center gap-1.5 text-slate-300 text-sm mt-0.5">
                      <span>📞</span> <span className="truncate">{customer.phoneNumber}</span>
                    </div>
                    {customer.address && (
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
                        <span>📍</span> <span className="truncate">{customer.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-black/40 rounded-lg flex divide-x divide-slate-800/50 border border-[rgba(255,255,255,0.05)] mb-5">
                  <div className="flex-1 p-3 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 flex justify-center items-center gap-1">
                      <span>📦</span> Orders
                    </div>
                    <div className="text-lg font-bold text-white">{customer.totalOrders || 0}</div>
                  </div>
                  <div className="flex-1 p-3 text-center bg-gradient-to-b from-transparent to-red-900/10">
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 flex justify-center items-center gap-1">
                      <span>💰</span> Due
                    </div>
                    <div className={`text-lg font-bold ${(customer.totalDue || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ₹{customer.totalDue || 0}
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                  <div className="text-xs text-slate-500 font-medium">
                    Member since: <span className="text-slate-400">{formatDate(customer.createdAt)}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setViewCustomer(customer)}
                      title="View Customer"
                      className="w-8 h-8 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600 flex items-center justify-center hover:bg-slate-600 hover:text-white transition-colors"
                    >
                      👁️
                    </button>
                    {(customer.totalDue || 0) > 0 && (
                      <WhatsAppButton type="reminder" id={customer.id} customerName={customer.name} defaultText="WhatsApp Reminder" showIconOnly={true} />
                    )}
                    <button 
                      onClick={() => handleOpenEditForm(customer)}
                      title="Edit Customer"
                      className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(customer)}
                      title="Delete Customer"
                      className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5 & 6. ADD/EDIT CUSTOMER MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-[#151820] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-neutral-900 to-black p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-brand-orange">{isEditing ? '✏️' : '👤'}</span> 
                {isEditing ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800 transition">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Full Name <span className="text-brand-orange">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">👤</span>
                  <input 
                    required minLength="2" type="text" 
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="E.g., Amit Kumar"
                    className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:border-brand-orange outline-none transition" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Phone Number {isEditing ? <span className="text-slate-500 text-xs font-normal ml-2">(Cannot edit)</span> : <span className="text-brand-orange">*</span>}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">📞</span>
                  <input 
                    required minLength="10" maxLength="10" pattern="[6-9][0-9]{9}" type="tel" 
                    value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') })} 
                    placeholder="10-digit mobile number"
                    disabled={isEditing}
                    className={`w-full bg-black/50 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:border-brand-orange outline-none transition ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`} 
                  />
                </div>
                {!isEditing && <p className="text-[10px] text-slate-500 mt-1 ml-1">Must start with 6,7,8,9 (10 digits)</p>}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Address <span className="text-slate-500 font-normal">(Optional)</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-500">📍</span>
                  <textarea 
                    rows="2" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                    placeholder="Enter full address details"
                    className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:border-brand-orange outline-none transition resize-none" 
                  ></textarea>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 px-4 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-lg font-medium transition">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 px-4 bg-gradient-to-r from-brand-orange to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white rounded-lg font-bold transition shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-2">
                  ✅ {isEditing ? 'Update Karo' : 'Add Karo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DELETE CUSTOMER CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)}></div>
          <div className="relative bg-[#151820] border-2 border-rose-500/50 w-full max-w-sm rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.1)] overflow-hidden animate-fade-in p-6 text-center">
            <div className="text-5xl mb-4 animate-bounce">⚠️</div>
            <h3 className="text-xl font-bold text-white mb-2">Are you sure?</h3>
            <p className="text-rose-400 font-medium text-lg mb-1">"{showDeleteConfirm.name}" delete hoga</p>
            <p className="text-slate-400 text-sm mb-6">Yeh action undo nahi hoga!</p>
            
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-3 bg-neutral-800 text-white rounded-xl font-medium hover:bg-neutral-700 transition">
                Cancel
              </button>
              <button onClick={() => handleDelete(showDeleteConfirm.id)} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition shadow-lg shadow-rose-600/20">
                🗑️ Delete Karo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. SLIDE-OVER VIEW CUSTOMER PANEL */}
      {viewCustomer && (
        <div className="fixed inset-0 z-[45] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewCustomer(null)}></div>
          <div className="relative w-full max-w-md bg-[#151820] border-l border-slate-700 h-full shadow-2xl animate-slide-left flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-black/20">
              <h3 className="text-xl font-bold text-white">Customer Details</h3>
              <button onClick={() => setViewCustomer(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Profile Header */}
              <div className="flex items-center gap-5 mb-8">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black shadow-lg ${AVATAR_COLORS[(viewCustomer.id || 0) % 6]}`}>
                  {viewCustomer.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">{viewCustomer.name}</h2>
                  <p className="text-brand-orange font-medium mt-1">ID: #{viewCustomer.id}</p>
                </div>
              </div>

              {/* Info Blocks */}
              <div className="space-y-4 mb-8">
                <div className="bg-black/40 border border-slate-800 rounded-xl p-4 flex items-start gap-4">
                  <span className="text-2xl">📞</span>
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Phone Number</label>
                    <p className="text-white font-medium text-lg">{viewCustomer.phoneNumber}</p>
                  </div>
                </div>
                
                <div className="bg-black/40 border border-slate-800 rounded-xl p-4 flex items-start gap-4">
                  <span className="text-2xl">📍</span>
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Address</label>
                    <p className="text-white font-medium">{viewCustomer.address || "No address provided"}</p>
                  </div>
                </div>
                
                <div className="bg-black/40 border border-slate-800 rounded-xl p-4 flex items-start gap-4">
                  <span className="text-2xl">🗓️</span>
                  <div>
                    <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">Member Since</label>
                    <p className="text-white font-medium">{formatDate(viewCustomer.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Stats Mini */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 text-center">
                  <span className="text-2xl block mb-2">📦</span>
                  <div className="text-2xl font-black text-white">{viewCustomer.totalOrders || 0}</div>
                  <div className="text-xs text-blue-400 uppercase font-bold tracking-wider mt-1">Total Orders</div>
                </div>
                <div className={`border rounded-xl p-4 text-center ${(viewCustomer.totalDue || 0) > 0 ? 'bg-rose-900/10 border-rose-500/20' : 'bg-emerald-900/10 border-emerald-500/20'}`}>
                  <span className="text-2xl block mb-2">💰</span>
                  <div className={`text-2xl font-black ${(viewCustomer.totalDue || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>₹{viewCustomer.totalDue || 0}</div>
                  <div className={`text-xs uppercase font-bold tracking-wider mt-1 ${(viewCustomer.totalDue || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>Total Due</div>
                </div>
              </div>

            </div>
            
            <div className="p-6 border-t border-slate-800 bg-black/20 space-y-3">
              <button 
                onClick={() => {
                  window.location.href = `/orders?search=${encodeURIComponent(viewCustomer.phoneNumber)}`;
                }}
                className="w-full py-3.5 bg-brand-orange hover:bg-orange-600 text-white rounded-xl font-bold transition shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-2"
              >
                <span>📦</span> Orders Dekho
              </button>
              
              {(viewCustomer.totalDue || 0) > 0 && (
                <WhatsAppButton type="reminder" id={viewCustomer.id} customerName={viewCustomer.name} defaultText="WhatsApp Reminder" showIconOnly={false} />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
