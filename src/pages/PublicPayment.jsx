import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import orderService from '../services/orderService';
import paymentService from '../services/paymentService';
import toast from 'react-hot-toast';

export default function PublicPayment() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const res = await orderService.getById(orderId);
        setOrder(res.data?.data || res.data);
      } catch (err) {
        console.error("Order fetch error:", err);
        toast.error("Order details nahi mil paye");
      } finally {
        setLoading(false);
      }
    };
    if (orderId) fetchOrder();
  }, [orderId]);

  const handlePayment = async () => {
    setIsProcessing(true);
    let verifyToastId = null;

    try {
      // 1. Create Razorpay order on backend
      const res = await paymentService.createOrder(orderId);
      const paymentData = res.data?.data;

      if (!paymentData || !paymentData.razorpayOrderId) {
        throw new Error("Invalid Razorpay payment data");
      }

      // 2. Open Razorpay Modal
      const options = {
        key: paymentData.keyId,
        amount: paymentData.amount,
        currency: "INR",
        name: "DattaKrupa Laundry",
        description: `Order #${orderId} - Payment`,
        order_id: paymentData.razorpayOrderId,
        handler: async function (response) {
          verifyToastId = toast.loading("Verifying payment...");
          try {
            await paymentService.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
            toast.success("Payment Successful! 🎉", { id: verifyToastId });
            setIsSuccess(true);
          } catch (e) {
            toast.error("Verification failed!", { id: verifyToastId });
          }
        },
        prefill: {
          name: order.customerName,
          contact: order.customerPhone
        },
        theme: {
          color: "#f97316"
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error("Payment initiation error:", err);
      toast.error("Payment start nahi hua");
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium animate-pulse">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="bg-emerald-500/20 p-6 rounded-full text-emerald-400 mb-6 border border-emerald-500/30">
          <span className="text-6xl">✅</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Payment Ho Gaya!</h1>
        <p className="text-slate-400 text-lg mb-8 max-w-xs">DattaKrupa Laundry ko payment mil gaya. Shukriya!</p>
        <div className="w-full max-w-xs bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8">
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-slate-500">Order ID:</span>
                <span className="text-white font-bold">#{orderId}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status:</span>
                <span className="text-emerald-400 font-bold uppercase">PAID</span>
            </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-white mb-2">Order Not Found</h2>
        <p className="text-slate-500 mb-6">Maaf kijiye, humein yeh order details nahi mile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] text-slate-100 font-sans p-4 sm:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-md flex flex-col items-center mb-8 pt-4">
        <div className="flex items-center gap-3 mb-2">
           <span className="text-3xl">🧺</span>
           <h1 className="text-2xl font-black tracking-tight text-white italic">DattaKrupa <span className="text-brand-orange">Laundry</span></h1>
        </div>
        <div className="flex items-center gap-2 text-emerald-400/80 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <span className="animate-pulse">🔒</span> Secure Payment
        </div>
      </header>

      {/* Order Details Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
        <div className="p-6 border-b border-slate-800 bg-gradient-to-br from-slate-800/50 to-transparent">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Customer</h3>
                    <p className="text-xl font-bold text-white leading-none">{order.customerName}</p>
                </div>
                <div className="text-right">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Order #</h3>
                    <p className="text-lg font-black text-brand-orange">#{order.id}</p>
                </div>
            </div>
        </div>

        {/* Items List */}
        <div className="p-6">
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">Order Items</h3>
            <div className="space-y-4 mb-8">
                {order.items && order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center group">
                        <div className="flex flex-col">
                            <span className="text-white font-semibold text-sm group-hover:text-brand-orange transition-colors">{item.itemName}</span>
                            <span className="text-slate-500 text-xs font-medium">Qty: {item.quantity} × ₹{item.pricePerItem}</span>
                        </div>
                        <span className="text-white font-bold text-sm tracking-tight">₹{item.subtotal}</span>
                    </div>
                ))}
            </div>

            {/* Total */}
            <div className="pt-6 border-t border-slate-800/50">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400 font-bold text-sm">Total Amount</span>
                    <span className="text-slate-400 text-sm line-through opacity-50">₹{order.totalAmount}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-white font-black text-lg">Amount Due</span>
                    <div className="text-3xl font-black text-white flex items-baseline gap-1">
                       <span className="text-brand-orange text-sm font-bold">₹</span>
                       <span>{order.dueAmount || order.totalAmount}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-slate-800/10">
            <button
                onClick={handlePayment}
                disabled={isProcessing}
                className={`w-full py-5 rounded-2xl bg-gradient-to-br from-brand-orange to-orange-600 hover:from-orange-500 hover:to-orange-500 text-white font-black text-xl shadow-xl shadow-brand-orange/20 transition-all flex items-center justify-center gap-3 active:scale-95 group ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {isProcessing ? (
                   <>
                     <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                     <span className="animate-pulse">Processing...</span>
                   </>
                ) : (
                    <>
                      <span className="text-2xl group-hover:scale-125 transition-transform">💳</span>
                      <span>₹{order.dueAmount || order.totalAmount} Pay Karo</span>
                    </>
                )}
            </button>
            <p className="mt-4 text-center text-[10px] text-slate-500 font-medium">By clicking, you agree to secure processing via Razorpay</p>
        </div>
      </div>

      <p className="mt-12 text-slate-600 text-[10px] uppercase font-bold tracking-[0.2em]">DattaKrupa Laundry Management System</p>
    </div>
  );
}
