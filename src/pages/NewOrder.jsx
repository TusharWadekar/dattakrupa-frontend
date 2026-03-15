import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import customerService from '../services/customerService';
import orderService from '../services/orderService';

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
      await orderService.create({
        customerId: Number(customerId),
        items: orderItems,
        notes: notes,
        expectedDelivery: expectedDelivery,
        status: 'RECEIVED',
        paymentStatus: 'UNPAID'
      });
      alert('Order created successfully!');
      navigate('/orders');
    } catch (error) {
      console.error("Failed to create order", error);
      alert("Failed to create order");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-white drop-shadow-sm">Create New Order</h1>
      <div className="bg-neutral-900 rounded-xl border border-slate-700/50 p-6 shadow-lg max-w-3xl">
        <p className="text-slate-400 mb-6 text-sm">Fill in the details below to create a new order.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-300">Customer *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="bg-black border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-brand-orange focus:border-brand-orange block w-full p-2.5 outline-none transition"
            >
              <option value="">Select a customer...</option>
              {customers.map(c => (
                <option key={c.id || c._id} value={c.id || c._id}>{c.name} - {c.phoneNumber}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <h3 className="text-lg font-medium text-slate-200 mb-4 tracking-tight">Clothing Items</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(items).map(itemName => (
                <div key={itemName} className="p-4 bg-black/50 rounded-lg border border-slate-700/50 flex flex-col justify-between hover:bg-black transition">
                  <span className="text-slate-200 font-medium">{itemName}</span>
                  <div className="flex items-center space-x-2 mt-4">
                    <input
                      type="number"
                      placeholder="Qty"
                      min="0"
                      value={items[itemName].quantity}
                      onChange={(e) => handleItemChange(itemName, 'quantity', e.target.value)}
                      className="w-16 bg-neutral-900 border border-slate-600 rounded p-1 text-sm outline-none text-slate-200 focus:border-brand-orange"
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      min="0"
                      value={items[itemName].price}
                      onChange={(e) => handleItemChange(itemName, 'price', e.target.value)}
                      className="w-20 bg-neutral-900 border border-slate-600 rounded p-1 text-sm outline-none text-slate-200 focus:border-brand-orange"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-700">
            <h3 className="text-lg font-medium text-slate-200 mb-4 tracking-tight">Additional Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-slate-300">Expected Delivery Date *</label>
                <input
                  type="date"
                  required
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  className="bg-black border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-brand-orange focus:border-brand-orange block w-full p-2.5 outline-none transition"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block mb-2 text-sm font-medium text-slate-300">Notes / Instructions</label>
                <textarea
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g., Mild detergent use karo"
                  className="bg-black border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-brand-orange focus:border-brand-orange block w-full p-2.5 outline-none transition resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-700 mt-8">
            <button type="button" onClick={() => navigate(-1)} className="text-slate-300 bg-transparent hover:bg-neutral-800 border border-slate-600 rounded-lg text-sm px-5 py-2.5 mr-3 transition font-medium">Cancel</button>
            <button type="submit" className="text-white bg-brand-orange hover:bg-orange-600 focus:ring-4 focus:ring-orange-500/30 rounded-lg text-sm px-5 py-2.5 font-medium transition shadow-lg shadow-orange-600/20">Create Order</button>
          </div>
        </form>
      </div>
    </div>
  );
}
