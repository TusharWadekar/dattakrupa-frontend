import API from '../utils/api';

const customerService = {
  // 1. GET ALL CUSTOMERS
  getAll: () => API.get('/customers'),

  // 2. GET CUSTOMER BY ID
  getById: (id) => API.get(`/customers/${id}`),

  // 3. GET BY PHONE
  getByPhone: (phoneNumber) => API.get(`/customers/phone/${phoneNumber}`),

  // 4. SEARCH BY NAME
  search: (name) => API.get(`/customers/search?name=${name}`),

  // 5. GET UDHARI CUSTOMERS
  getUdhari: () => API.get('/customers/udhari'),

  // 6. CREATE CUSTOMER
  create: (data) => API.post('/customers', data),

  // 7. UPDATE CUSTOMER
  update: (id, data) => API.put(`/customers/${id}`, data),

  // 8. DELETE CUSTOMER
  delete: (id) => API.delete(`/customers/${id}`)
};

export default customerService;
