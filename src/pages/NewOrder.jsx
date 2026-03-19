import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import customerService from '../services/customerService';
import orderService from '../services/orderService';
import whatsappService from '../services/whatsappService';
import WhatsAppButton from '../components/WhatsAppButton';
import toast from 'react-hot-toast';

export default function NewOrder() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [items, setItems] = useState({
    Shirt: { quantity: '', price: '' },
    Pant: { quantity: '', price: '' },
    Saree: { quantity: '', price: '' },
    Jacket: { quantity: '', price: '' }
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isSendingBill, setIsSendingBill] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await customerService.getAll();
        setCustomers(Array.isArray(response.data.data || response.data) ? (response.data.data || response.data) : []);
      } catch (error) {
        console.error("Failed to fetch customers", error);
      }
    };
    fetchCustomers();
  }, []);

  const handleItemChange = (item, field, value) => {
    setItems(prev => ({
      ...prev,
      [item]: {
        ...prev[item],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) return alert("Please select a customer");

    // Filter out items with no quantity and match backend model
    const orderItems = Object.keys(items).map(name => {
      const { quantity, price } = items[name];
      if (quantity && Number(quantity) > 0) {
        return { 
          itemName: name, 
          quantity: Number(quantity), 
          pricePerItem: Number(price) 
        };
      }
      return null;
    }).filter(Boolean);

    if (orderItems.length === 0) return alert("Please add at least one item");

    try {
      const res = await orderService.create({
        customerId: Number(customerId),
        items: orderItems,
        notes: notes,
        expectedDelivery: expectedDelivery,
        status: 'RECEIVED',
        paymentStatus: 'UNPAID'
      });
      
      const newOrder = res.data?.data || res.data;
      setCreatedOrder(newOrder);
      setIsSuccess(true);
      toast.success("Order Created Successfully! 🚀");
    } catch (error) {
      console.error("Failed to create order", error);
      toast.error("Failed to create order");
    }
  };

  const handleCreateAnother = () => {
    setCustomerId('');
    setNotes('');
    setExpectedDelivery('');
    setItems({
      Shirt: { quantity: '', price: '' },
      Pant: { quantity: '', price: '' },
      Saree: { quantity: '', price: '' },
      Jacket: { quantity: '', price: '' }
    });
    setIsSuccess(false);
    setCreatedOrder(null);
  };


  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-white drop-shadow-md tracking-tight">Create New Order</h1>
        <p className="text-slate-400 text-sm">Fill in the details below to add a new laundry order.</p>
      </div>

      <div className="bg-neutral-900 rounded-2xl border border-slate-700/50 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10 w-full">
          {/* Customer Selection Section */}
          <div className="bg-black/40 p-5 rounded-xl border border-slate-700/50 relative overflow-hidden group hover:border-brand-orange/30 transition-colors">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-orange to-amber-400 rounded-l-xl"></div>
            <label className="block mb-2 text-sm font-semibold text-slate-200">Select Customer <span className="text-brand-orange">*</span></label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="bg-neutral-900 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange block w-full p-3 outline-none transition cursor-pointer shadow-inner"
            >
              <option value="">-- Choose a customer --</option>
              {customers.map(c => (
                <option key={c.id || c._id} value={c.id || c._id}>{c.name} - {c.phoneNumber}</option>
              ))}
            </select>
          </div>

          {/* Clothing Items Section */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-400 p-1.5 rounded-lg border border-blue-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5"/></svg>
              </span>
              Clothing Items
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.keys(items).map((itemName, index) => {
                const colors = [
                  "from-cyan-500/10 to-blue-500/10 border-blue-500/30 focus-within:border-blue-500 hover:border-blue-500/50",
                  "from-purple-500/10 to-pink-500/10 border-purple-500/30 focus-within:border-purple-500 hover:border-purple-500/50",
                  "from-orange-500/10 to-red-500/10 border-orange-500/30 focus-within:border-orange-500 hover:border-orange-500/50",
                  "from-green-500/10 to-emerald-500/10 border-green-500/30 focus-within:border-green-500 hover:border-green-500/50"
                ];
                const activeColor = colors[index % colors.length];

                return (
                  <div key={itemName} className={`p-5 rounded-xl border bg-gradient-to-br transition-all duration-300 ${activeColor}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-white font-bold text-lg tracking-wide">{itemName}</span>
                      <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-slate-300 uppercase shrink-0 border border-white/10 shadow-sm">
                        {itemName.charAt(0)}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 w-10">Qty</label>
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          value={items[itemName].quantity}
                          onChange={(e) => handleItemChange(itemName, 'quantity', e.target.value)}
                          className="flex-1 bg-black/40 border border-slate-600 rounded-lg p-2.5 text-sm outline-none text-white focus:ring-2 focus:ring-white/20 transition text-center"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 w-10">Price</label>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            min="0"
                            value={items[itemName].price}
                            onChange={(e) => handleItemChange(itemName, 'price', e.target.value)}
                            className="w-full bg-black/40 border border-slate-600 rounded-lg p-2.5 pl-7 text-sm outline-none text-white focus:ring-2 focus:ring-white/20 transition"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional Details Section */}
          <div className="bg-black/20 p-6 rounded-xl border border-slate-700/50">
            <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <span className="bg-brand-orange/20 text-brand-orange p-1.5 rounded-lg border border-brand-orange/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/></svg>
              </span>
              Additional Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <label className="block mb-2 text-sm font-semibold text-slate-200">Expected Delivery <span className="text-brand-orange">*</span></label>
                <input
                  type="date"
                  required
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  className="bg-neutral-900 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange block w-full p-3 outline-none transition cursor-pointer"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-semibold text-slate-200">Notes / Instructions</label>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Mild detergent use karo, urgent delivery..."
                  className="bg-neutral-900 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange block w-full p-3 outline-none transition resize-none placeholder-slate-500"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-700/50 gap-4 mt-8">
            <button type="button" onClick={() => navigate(-1)} className="text-slate-300 bg-black hover:bg-neutral-800 border border-slate-600 rounded-lg text-sm px-6 py-3 transition font-semibold hover:text-white">Cancel</button>
            <button type="submit" className="text-white bg-gradient-to-r from-brand-orange to-orange-500 hover:from-orange-500 hover:to-orange-600 focus:ring-4 focus:ring-orange-500/30 rounded-lg text-sm px-8 py-3 font-bold transition shadow-lg shadow-brand-orange/30 transform hover:-translate-y-0.5">
              Create Order →
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      {isSuccess && createdOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-fade-in" onClick={handleCreateAnother}></div>
          
          <div className="relative bg-[#0d0f14] border-2 border-brand-orange shadow-[0_0_50px_rgba(249,115,22,0.2)] w-full max-w-sm rounded-[2.5rem] p-8 text-center animate-bounce-in overflow-hidden">
             {/* Decorative Elements */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-brand-orange/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-orange/5 rounded-full blur-2xl -ml-16 -mb-16"></div>

             <div className="relative z-10">
                <div className="w-20 h-20 bg-gradient-to-br from-brand-orange to-amber-500 rounded-full mx-auto flex items-center justify-center text-4xl shadow-lg shadow-brand-orange/30 mb-6 scale-up-anim">
                    ✅
                </div>
                
                <h2 className="text-2xl font-black text-white mb-2 leading-tight">Order Created! 🚀</h2>
                <p className="text-slate-400 text-sm mb-6 uppercase font-bold tracking-widest">ORDER #<span className="text-brand-orange">{createdOrder.id}</span></p>

                <div className="bg-black/40 border border-slate-800 rounded-2xl p-4 mb-8">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Customer</span>
                        <span className="text-white font-bold text-sm tracking-tight">{createdOrder.customerName}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="w-full">
                        <WhatsAppButton type="bill" id={createdOrder.id} customerName={createdOrder.customerName} defaultText="WhatsApp Bill Bhejo" showIconOnly={false} />
                    </div>
                    
                    <button 
                        onClick={handleCreateAnother}
                        className="w-full py-3.5 px-6 bg-slate-800/50 hover:bg-slate-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 border border-slate-700"
                    >
                        ➕ Another Order
                    </button>
                    
                    <button 
                        onClick={() => navigate('/orders')}
                        className="w-full py-3 px-6 text-slate-500 hover:text-slate-300 text-xs font-bold uppercase tracking-widest transition"
                    >
                        Go to All Orders →
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
