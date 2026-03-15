import API from '../utils/api';

const customerService = {
  // Sab customers lo
  getAll: () => API.get('/customers'),

  // ID se customer lo
  getById: (id) => API.get(`/customers/${id}`),

  // Phone se customer lo
  getByPhone: (phoneNumber) => API.get(`/customers/phone/${phoneNumber}`),

  // Search karo
  search: (name) => API.get(`/customers/search?name=${name}`),

  // Udhari wale customers
  getUdhari: () => API.get('/customers/udhari'),

  // Naya customer banao
  create: (data) => API.post('/customers', data),

  // Update karo
  update: (id, data) => API.put(`/customers/${id}`, data),

  // Delete karo
  delete: (id) => API.delete(`/customers/${id}`),
};

export default customerService;
