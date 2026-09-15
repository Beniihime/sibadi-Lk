<template>
    <div class="panel-card">
        <div class="panel-header">
            <h3>Последние заявки</h3>
            <div class="panel-header-actions">
                <router-link
                    v-if="showRequests"
                    class="panel-header-action panel-header-action-primary"
                    :to="{ path: '/requests', query: { create: '1' } }"
                    aria-label="Создать заявку"
                    v-tooltip.top="'Создать заявку'"
                >
                    <i class="pi pi-plus"></i>
                </router-link>
                <router-link class="panel-header-action" to="/requests" aria-label="Открыть заявки" v-tooltip.top="'Открыть заявки'">
                    <i class="pi pi-arrow-up-right"></i>
                </router-link>
            </div>
        </div>
        <div class="panel-content">
            <div v-if="recentTicketsLoading" class="schedule-skeleton">
                <Skeleton v-for="item in 3" :key="`ticket-skeleton-${item}`" width="100%" height="2.7rem" borderRadius="10px" />
            </div>
            <div v-else-if="recentTickets.length" class="recent-tickets">
                <router-link
                    v-for="ticket in recentTickets"
                    :key="ticket.id"
                    class="recent-ticket"
                    :to="{ path: '/requests', query: { callId: ticket.id } }"
                >
                    <div class="recent-ticket-main">
                        <strong>{{ ticket.callSummaryName || ticket.fullName || `Заявка №${ticket.number}` }}</strong>
                        <span>{{ formatTicketDate(ticket.utcDateRegistered || ticket.utcDateModified) }}</span>
                    </div>
                    <Tag :value="ticket.entityStateName || 'Не указан'" :severity="getTicketStatusSeverity(ticket.entityStateName)" />
                </router-link>
            </div>
            <AsyncState
                v-else-if="recentTicketsError"
                tone="error"
                icon="pi pi-exclamation-triangle"
                title="Не удалось загрузить заявки"
                description="Проверьте соединение и попробуйте ещё раз."
                retry
                @retry="fetchRecentTickets"
            />
            <div v-else class="activity-item muted">
                {{ showRequests ? 'Незакрытых заявок нет' : 'Заявки недоступны' }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import axiosInstance from '@/utils/axios.js';
import AsyncState from '@/components/Utils/AsyncState.vue';
import { getRequestAccess } from '@/utils/requestAccess.js';
import { formatDateOmskFromUtcString } from '@/utils/date.js';
import { getInfraStatusSeverity } from '@/utils/infraStatus.js';
import { requestMocks, USE_MOCK_DATA } from '@/config/mockRuntime.js';

const showRequests = ref(localStorage.getItem('InfraStatus') === 'true');
const recentTickets = ref([]);
const recentTicketsLoading = ref(false);
const recentTicketsError = ref(false);

const getTicketStatusSeverity = getInfraStatusSeverity;
const formatTicketDate = (date) => formatDateOmskFromUtcString(date);

const fetchRecentTickets = async () => {
    if (!showRequests.value) {
        recentTickets.value = [];
        return;
    }

    recentTicketsLoading.value = true;
    recentTicketsError.value = false;
    try {
        if (USE_MOCK_DATA) {
            recentTickets.value = requestMocks.slice(0, 3);
            return;
        }

        const response = await axiosInstance.get('/api/infra-manager/users/me/calls', {
            params: { page: 1, pageSize: 20 },
        });
        recentTickets.value = (response.data?.entities || [])
            .filter((ticket) => ticket.entityStateName !== 'Закрыта' && !ticket.utcDateClosed)
            .sort((left, right) => new Date(right.utcDateRegistered || right.utcDateModified) - new Date(left.utcDateRegistered || left.utcDateModified))
            .slice(0, 3);
    } catch (error) {
        console.debug('Ошибка при загрузке последних заявок:', error);
        recentTickets.value = [];
        recentTicketsError.value = true;
    } finally {
        recentTicketsLoading.value = false;
    }
};

const fetchRequestAvailability = async () => {
    const requestAccess = await getRequestAccess();
    showRequests.value = requestAccess.showRequests;
};

watch(showRequests, (canRead) => {
    if (canRead) {
        fetchRecentTickets();
    } else {
        recentTickets.value = [];
    }
}, { immediate: true });

onMounted(() => {
    fetchRequestAvailability();
});
</script>

<style scoped src="./dashboardWidget.css"></style>