import { onMounted, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { getMyUmuGroups } from '@/api/umu.js';

/**
 * Загрузка и выбор учебных записей студента в UMU.
 * Одна запись = одна группа/период обучения. По умолчанию выбирается запись
 * с наибольшим studentId (как правило, самая свежая).
 *
 * Возвращает реактивный selectedGroup; страница реагирует на его смену
 * (например, через watch) и подгружает свои данные.
 */
export function useUmuStudentGroups() {
    const toast = useToast();

    const groups = ref([]);
    const groupsLoading = ref(false);
    const groupsError = ref(false);
    const groupsErrorDetail = ref('');

    const selectedGroup = ref(null);

    const selectGroup = (group) => {
        selectedGroup.value = group;
    };

    const loadGroups = async () => {
        groupsLoading.value = true;
        groupsError.value = false;
        groupsErrorDetail.value = '';

        try {
            const response = await getMyUmuGroups();
            groups.value = Array.isArray(response.data) ? response.data : [];

            if (groups.value.length > 0) {
                const defaultGroup = groups.value.reduce((max, g) => (
                    (g?.studentId ?? -Infinity) > (max?.studentId ?? -Infinity) ? g : max
                ));
                selectGroup(defaultGroup);
            }
        } catch (error) {
            groups.value = [];
            groupsError.value = true;
            const status = error?.response?.status;
            groupsErrorDetail.value = status === 403
                ? 'У вашего аккаунта нет связи с системой UMU.'
                : (error?.response?.data?.title || error?.response?.data?.message || '');
            toast.add({
                severity: 'error',
                summary: 'Не удалось загрузить группы',
                detail: groupsErrorDetail.value || 'Попробуйте позже.',
                life: 3500,
            });
        } finally {
            groupsLoading.value = false;
        }
    };

    onMounted(loadGroups);

    return {
        groups,
        groupsLoading,
        groupsError,
        groupsErrorDetail,
        selectedGroup,
        selectGroup,
        loadGroups,
    };
}