<template>
    <div class="panel-card tickets-overview-card">
        <div class="panel-header">
            <h3>Справки</h3>
            <div class="panel-header-actions">
                <button
                    v-if="canCreateStudentTickets"
                    class="panel-header-action panel-header-action-primary"
                    aria-label="Создать справку"
                    v-tooltip.top="'Создать справку'"
                    @click="emit('open-create-dialog')"
                >
                    <i class="pi pi-plus"></i>
                </button>
                <router-link class="panel-header-action" to="/tickets/my-requests" aria-label="Открыть справки" v-tooltip.top="'Открыть справки'">
                    <i class="pi pi-arrow-up-right"></i>
                </router-link>
            </div>
        </div>
        <div class="panel-content">
            <div v-if="recentCertificatesLoading" class="schedule-skeleton">
                <Skeleton v-for="item in 3" :key="`certificate-skeleton-${item}`" width="100%" height="2.7rem" borderRadius="10px" />
            </div>
            <div v-else-if="recentCertificates.length" class="recent-tickets">
                <router-link
                    v-for="ticket in recentCertificates"
                    :key="ticket.id"
                    class="recent-ticket"
                    to="/tickets/my-requests"
                >
                    <div class="recent-ticket-main">
                        <strong>{{ ticket.requestType?.title || ticket.requestType?.name || `Справка №${ticket.number}` }}</strong>
                        <span>{{ formatCertificateDate(ticket.createdAt || ticket.updatedAt) }}</span>
                    </div>
                    <Tag :value="getCertificateStatusLabel(ticket.status)" :severity="getCertificateStatusSeverity(ticket.status)" />
                </router-link>
            </div>
            <div v-else class="activity-item muted">Оформляйте справки и отслеживайте их готовность здесь.</div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { formatDateRuLongWithTime } from '@/utils/date.js';
import { listMyTickets } from '@/api/tickets.js';
import { usePermissionStore } from '@/stores/permissions.js';
import { ticketMocks, USE_MOCK_DATA } from '@/config/mockRuntime.js';

const emit = defineEmits(['open-create-dialog']);

const permissionStore = usePermissionStore();
const recentCertificates = ref([]);
const recentCertificatesLoading = ref(false);

const canAccessStudentTickets = computed(() => (
    permissionStore.hasPermission('TicketsStudent', 'Read')
    || permissionStore.hasPermission('TicketsStudent', 'Create')
));
const canCreateStudentTickets = computed(() => permissionStore.hasPermission('TicketsStudent', 'Create'));

const formatCertificateDate = (date) => formatDateRuLongWithTime(date);
const getCertificateStatusSeverity = (status) => ({
    New: 'info',
    Open: 'warning',
    Assigned: 'info',
    Pending: 'warning',
    Resolved: 'success',
    Closed: 'secondary',
    Cancelled: 'danger',
}[status] || 'contrast');
const getCertificateStatusLabel = (status) => ({
    New: 'Новая',
    Open: 'Открыта',
    Assigned: 'В работе',
    Pending: 'Ожидание',
    Resolved: 'Готова',
    Closed: 'Закрыта',
    Cancelled: 'Отменена',
}[status] || status || 'Не указан');

const fetchRecentCertificates = async () => {
    if (!canAccessStudentTickets.value) {
        recentCertificates.value = [];
        return;
    }

    recentCertificatesLoading.value = true;
    try {
        if (USE_MOCK_DATA) {
            recentCertificates.value = (ticketMocks.mockTickets?.tickets || []).slice(0, 3);
            return;
        }

        const response = await listMyTickets({ page: 1, pageSize: 3 });
        recentCertificates.value = (response.data?.tickets || [])
            .slice()
            .sort((left, right) => new Date(right.createdAt || right.updatedAt) - new Date(left.createdAt || left.updatedAt))
            .slice(0, 3);
    } catch (error) {
        console.debug('Ошибка при загрузке последних справок:', error);
        recentCertificates.value = [];
    } finally {
        recentCertificatesLoading.value = false;
    }
};

watch(canAccessStudentTickets, (canRead) => {
    if (canRead) {
        fetchRecentCertificates();
    } else {
        recentCertificates.value = [];
    }
}, { immediate: true });

onMounted(() => {
    fetchRecentCertificates();
});

defineExpose({ refetch: fetchRecentCertificates });
</script>

<style scoped src="./dashboardWidget.css"></style>