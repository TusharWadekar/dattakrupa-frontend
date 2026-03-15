import API from '../utils/api';

const paymentService = {

    // Razorpay order banao
    createOrder: (orderId) =>
        API.post(`/payment/create-order/${orderId}`),

    // Payment verify karo
    verify: (data) => API.post('/payment/verify', data),

    // Order ki payments
    getByOrder: (orderId) =>
        API.get(`/payment/order/${orderId}`),

    // Customer ki payments
    getByCustomer: (customerId) =>
        API.get(`/payment/customer/${customerId}`),
};

export default paymentService;
