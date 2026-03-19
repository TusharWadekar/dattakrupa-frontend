import API from '../utils/api';

const paymentService = {
  // 1. CREATE RAZORPAY ORDER
  createOrder: (orderId) => API.post(`/payment/create-order/${orderId}`),

  // 2. VERIFY PAYMENT
  verifyPayment: (data) => API.post('/payment/verify', data),

  // 4. GET PAYMENTS BY ORDER
  getByOrder: (orderId) => API.get(`/payment/order/${orderId}`),

  // 5. GET PAYMENTS BY CUSTOMER
  getByCustomer: (customerId) => API.get(`/payment/customer/${customerId}`)
};

export default paymentService;
