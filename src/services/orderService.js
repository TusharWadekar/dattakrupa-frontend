import API from '../utils/api';

const orderService = {
  getAll: () => API.get('/orders'),
  create: (data) => API.post('/orders', data),
  updateStatus: (id, status) => API.put(`/orders/${id}/status`, { status }),
  sendBill: (id) => API.post(`/whatsapp/send-bill/${id}`)
};

export default orderService;
