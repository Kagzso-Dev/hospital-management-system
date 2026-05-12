import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tenant_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tenant_token');
      localStorage.removeItem('tenant_info');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const tenantLogin = (data) => axios.post('/api/auth/login', data);

// Superadmin
const saApi = axios.create({ baseURL: '/api/superadmin' });
saApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('superadmin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const superadminLogin = (data) => axios.post('/api/superadmin/login', data);
export const getSuperadminTenants = () => saApi.get('/tenants');
export const createTenant = (data) => saApi.post('/tenants', data);
export const updateTenantStatus = (id, status) => saApi.put(`/tenants/${id}/status`, { status });
export const updateTenantPassword = (id, password) => saApi.put(`/tenants/${id}/password`, { password });
export const deleteTenant = (id) => saApi.delete(`/tenants/${id}`);

// Patients
export const searchPatients = (params) => api.get('/patients', { params });
export const createPatient = (data) => api.post('/patients', data);
export const getPatient = (id) => api.get(`/patients/${id}`);

// Doctors
export const getDoctors = () => api.get('/doctors');
export const getAvailableSlots = (doctorId, date) => api.get(`/doctors/${doctorId}/slots`, { params: { date } });
export const setDoctorAvailability = (doctorId, data) => api.post(`/doctors/${doctorId}/availability`, data);
export const verifyDoctorPassword = (doctorId, password) => api.post(`/doctors/${doctorId}/verify`, { password });

// Appointments
export const getAppointments = (params) => api.get('/appointments', { params });
export const createAppointment = (data) => api.post('/appointments', data);
export const updateAppointmentStatus = (id, status) => api.put(`/appointments/${id}/status`, { status });

// Prescriptions
export const createPrescription = (data) => api.post('/prescriptions', data);
export const getPatientPrescriptions = (patientId) => api.get(`/prescriptions/patient/${patientId}`);
export const getAppointmentPrescription = (appointmentId) => api.get(`/prescriptions/appointment/${appointmentId}`);

// Tokens
export const getTokenDisplay = (doctorId) => api.get('/tokens/display', { params: { doctor_id: doctorId } });

// Medicines
export const searchMedicines = (q) => api.get('/medicines', { params: { q } });
export const getMedicineDetails = (name) => api.get('/medicines/details', { params: { name } });

// Payments
export const createPayment = (data) => api.post('/payments', data);
export const getPayment = (appointmentId) => api.get(`/payments/${appointmentId}`);
export const listPayments = (params) => api.get('/payments', { params });
export const getPaymentSummary = (date) => api.get('/payments/summary', { params: { date } });

export default api;
