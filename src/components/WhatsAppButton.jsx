import React, { useState } from 'react';
import toast from 'react-hot-toast';
import whatsappService from '../services/whatsappService';

const WhatsAppButton = ({ type, id, customerName, defaultText, showIconOnly = false }) => {
    // type: 'bill' | 'reminder'
    const [state, setState] = useState('normal'); // 'normal' | 'loading' | 'success' | 'error'

    const handleClick = async (e) => {
        e.stopPropagation();
        if (state === 'loading') return;

        setState('loading');
        try {
            if (type === 'bill') {
                await whatsappService.sendBill(id);
                toast.success(<span className="font-medium"><b>Bill Bheja Gaya!</b><br/>{customerName} ko WhatsApp aayega</span>, {
                    icon: "📱",
                    duration: 3000
                });
            } else {
                await whatsappService.sendReminder(id);
                toast.success(<span className="font-medium"><b>Reminder Bheja Gaya!</b><br/>{customerName} ko udhari reminder gaya</span>, {
                    icon: "📱",
                    duration: 3000
                });
            }
            setState('success');
            setTimeout(() => setState('normal'), 2000);
        } catch (err) {
            setState('error');
            const status = err.response?.status;
            if (status === 503) {
                toast.error("❌ WhatsApp service band hai");
            } else if (status === 404) {
                toast.error(type === 'bill' ? "❌ Order nahi mila" : "❌ Customer nahi mila");
            } else if (!err.response) {
                toast.error("❌ Internet connection check karo");
            } else {
                toast.error("❌ Kuch galat ho gaya");
            }
            setTimeout(() => setState('normal'), 2000);
        }
    };

    let bgClass = "bg-[#25d366]/10 text-[#25d366] border-[#25d366]/30 hover:bg-[#25d366]/20 hover:scale-105 transform transition-all";
    let text = defaultText;

    if (state === 'loading') {
        bgClass = "bg-[#25d366]/5 text-[#25d366] border-[#25d366]/10 cursor-not-allowed";
        text = showIconOnly ? "⏳" : "⏳ Bhej raha...";
    } else if (state === 'success') {
        bgClass = "bg-[#22d3a5]/15 text-[#22d3a5] border-[#22d3a5]/30";
        text = showIconOnly ? "✅" : "✅ Bhej diya!";
    } else if (state === 'error') {
        bgClass = "bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/30";
        text = showIconOnly ? "❌" : "❌ Failed";
    }

    if (showIconOnly) {
        return (
            <button 
                onClick={handleClick}
                disabled={state === 'loading'}
                title={defaultText}
                className={`w-8 h-8 rounded border flex items-center justify-center text-sm ${bgClass}`}
            >
                {state === 'normal' ? '📱' : text}
            </button>
        );
    }

    return (
        <button 
            onClick={handleClick}
            disabled={state === 'loading'}
            className={`px-4 py-2 text-sm font-bold rounded-lg border flex items-center justify-center gap-2 ${bgClass}`}
        >
            {state === 'normal' && '📱'}
            {text}
        </button>
    );
};

export default WhatsAppButton;
