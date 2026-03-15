import API from '../utils/api';

const dashboardService = {
  // Dashboard data lo
  getData: () => API.get('/dashboard'),
};

export default dashboardService;
