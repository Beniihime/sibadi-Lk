import axiosInstance from '@/utils/axios.js';

/**
 * Получить реквизиты для оплаты текущего аутентифицированного пользователя.
 * @returns {Promise} axios-ответ со списком PaymentDetailResponse
 */
export function getMyPaymentDetails() {
    return axiosInstance.get('/api/payment-details/me');
}

/**
 * Получить реквизиты для оплаты пользователя по идентификатору (для админа, read-only).
 * @param {string} userId
 * @returns {Promise} axios-ответ со списком PaymentDetailResponse
 */
export function getPaymentDetailsByUserId(userId) {
    return axiosInstance.get(`/api/payment-details/${userId}`);
}

/**
 * Создать реквизит для оплаты текущего пользователя.
 * @param {Object} payload — { bik, currentAccount, correspondentAccount, bankId?, bankName?, isVisible? }
 * @returns {Promise} axios-ответ с PaymentDetailResponse
 */
export function createMyPaymentDetail(payload) {
    return axiosInstance.post('/api/payment-details/me', payload);
}

/**
 * Изменить реквизит для оплаты по идентификатору.
 * @param {string} id
 * @param {Object} payload — { bik?, currentAccount?, correspondentAccount?, bankId?, bankName?, isVisible? }
 * @returns {Promise} axios-ответ с PaymentDetailResponse
 */
export function updatePaymentDetail(id, payload) {
    return axiosInstance.put(`/api/payment-details/${id}`, payload);
}

/**
 * Удалить реквизит для оплаты по идентификатору.
 * @param {string} id
 * @returns {Promise} axios-ответ
 */
export function deletePaymentDetail(id) {
    return axiosInstance.delete(`/api/payment-details/${id}`);
}

/**
 * Получить справочник банков.
 * @returns {Promise} axios-ответ со списком BankResponse ({ id, name })
 */
export function getBanks() {
    return axiosInstance.get('/api/banks');
}