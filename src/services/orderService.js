import API from '../utils/api';

const orderService = {
  // 1. GET ALL ORDERS
  getAll: () => API.get('/orders'),

  // 2. GET ORDER BY ID
  getById: (id) => API.get(`/orders/${id}`),

  // 3. GET ORDERS BY CUSTOMER
  getByCustomer: (customerId) => API.get(`/orders/customer/${customerId}`),

  // 4. GET ORDERS BY STATUS
  getByStatus: (status) => API.get(`/orders/status/${status}`),

  // 5. CREATE ORDER
  create: (data) => API.post('/orders', data),

  // 6. UPDATE ORDER STATUS
  updateStatus: (id, status) => API.put(`/orders/${id}/status?status=${status}`),

  // 7. SEND WHATSAPP BILL
  sendBill: (id) => API.post(`/whatsapp/send-bill/${id}`),

  // 8. CASH PAYMENT
  cashPayment: (id, amount) => API.put(`/orders/${id}/cash-payment?amount=${amount}`),

  // 9. DELETE ORDER
  delete: (id) => API.delete(`/orders/${id}`)
};

export default orderService;
