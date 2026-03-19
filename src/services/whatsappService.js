import API from '../utils/api';

const whatsappService = {
  // Bill bhejo
  sendBill: (orderId) =>
    API.post(`/whatsapp/send-bill/${orderId}`),

  // Udhari reminder bhejo
  sendReminder: (customerId) =>
    API.post(`/whatsapp/udhari-reminder/${customerId}`),

  // Bulk bills bhejo
  sendBulkBills: async (orderIds, onProgress) => {
    const results = [];
    for (let i = 0; i < orderIds.length; i++) {
      const orderId = orderIds[i];
      if (onProgress) onProgress(i + 1, orderIds.length);
      try {
        await API.post(`/whatsapp/send-bill/${orderId}`);
        results.push({ orderId, success: true });
        // Wait 1 second between each call as requested
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error(`Error sending bill for ${orderId}:`, e);
        results.push({ orderId, success: false });
      }
    }
    return results;
  },

  // Bulk Udhari reminders bhejo
  sendBulkReminders: async (customerIds, onProgress) => {
    const results = [];
    for (let i = 0; i < customerIds.length; i++) {
        const customerId = customerIds[i];
        if (onProgress) onProgress(i + 1, customerIds.length);
        try {
            await API.post(`/whatsapp/udhari-reminder/${customerId}`);
            results.push({ customerId, success: true });
            // Wait 1 second between each call
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
            console.error(`Error sending reminder for ${customerId}:`, e);
            results.push({ customerId, success: false });
        }
    }
    return results;
  }
};

export default whatsappService;
