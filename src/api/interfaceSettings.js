import axiosInstance from '@/utils/axios.js';

const BASE_URL = '/api/me/interface-settings';

/**
 * Получить настройки интерфейса пользователя (раскладка виджетов + тема).
 * Возвращает null при 204 (строки ещё нет — клиент применяет дефолт).
 */
export async function getInterfaceSettings() {
    const response = await axiosInstance.get(BASE_URL, {
        headers: { accept: 'application/json' },
        validateStatus: (status) => status === 200 || status === 204,
    });

    if (response.status === 204 || !response.data) {
        return null;
    }

    const data = response.data;
    return {
        columns: Array.isArray(data.columns) ? data.columns : null,
        themeMode: typeof data.themeMode === 'string' ? data.themeMode : 'auto',
        accentColor: data.accentColor ?? null,
    };
}

/**
 * Сохранить настройки интерфейса пользователя (upsert всей строки).
 */
export function saveInterfaceSettings(payload) {
    return axiosInstance.put(BASE_URL, payload);
}