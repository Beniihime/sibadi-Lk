<template>
    <div class="content">
        <div class="content-wrapper">
            <Transition name="content-fade" mode="out-in">
                <div v-if="isFirstLoadDone" key="tickets-content">
                    <section class="tickets-layout">
                        <div class="tickets-toolbar">
                            <div>
                                <h3 class="title m-0">Справки</h3>
                                <p class="tickets-subtitle">Управление и отслеживание справок.</p>
                            </div>
                            <div class="tickets-toolbar-actions">
                                <Button
                                    icon="pi pi-sliders-h"
                                    outlined
                                    severity="secondary"
                                    @click="toggleSpecialFeaturesPanel"
                                />
                                <OverlayPanel ref="specialFeaturesPanel">
                                    <div class="special-features-panel">
                                        <Button
                                            label="Автоназначение ответственных"
                                            icon="pi pi-users"
                                            :loading="autoAssignLoading"
                                            :disabled="autoAssignLoading"
                                            @click="runAutoAssignResponsible"
                                        />
                                    </div>
                                </OverlayPanel>
                                <Button
                                    icon="pi pi-filter"
                                    outlined
                                    severity="secondary"
                                    @click="showMobileFilters = !showMobileFilters"
                                />
                                <Button
                                    icon="pi pi-sync"
                                    outlined
                                    severity="secondary"
                                    @click="fetchTickets"
                                    :loading="loading"
                                    :disabled="loading"
                                />
                            </div>
                        </div>

                        <div class="tickets-only-my">
                            <Checkbox
                                v-model="onlyMyTickets"
                                binary
                                inputId="onlyMyTickets"
                                :disabled="!canReadTickets"
                                @change="onAssigneeToggle"
                            />
                            <label for="onlyMyTickets" class="cursor-pointer">
                                Только мои заявки
                            </label>
                        </div>

                        <div v-if="showMobileFilters" class="tickets-filters">
                            <InputText
                                :model-value="filters.number"
                                placeholder="Поиск по номеру"
                                @update:model-value="newValue => onFilter('number', newValue)"
                            />
                            <Select
                                v-model="filters.status"
                                :options="statusOptions"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Статус"
                                @change="onFilter('status', $event.value)"
                            />
                            <Select
                                v-model="filters.priority"
                                :options="priorityOptions"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Приоритет"
                                @change="onFilter('priority', $event.value)"
                            />
                            <InputText
                                :model-value="filters.requesterId"
                                placeholder="Поиск по ID инициатора"
                                @update:model-value="newValue => onFilter('requesterId', newValue)"
                            />
                            <div class="tickets-filter-actions">
                                <Select
                                    v-model="rowsPerPage"
                                    :options="rowsPerPageOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Строк на странице"
                                    @change="onRowsPerPageChange"
                                />
                                <Button
                                    label="Сбросить"
                                    text
                                    severity="secondary"
                                    @click="resetMobileFilters"
                                />
                            </div>
                        </div>

                        <div class="tickets-summary">
                            <span>Всего заявок: {{ totalRecords }}</span>
                            <span>Показано: {{ currentPageTickets.length }}</span>
                        </div>

                        <div v-if="currentPageTickets.length" class="tickets-card-list">
                            <article
                                v-for="ticket in currentPageTickets"
                                :key="ticket.id"
                                class="tickets-card"
                                @click="openTicketModal(ticket.id)"
                            >
                                <div class="tickets-card-head">
                                    <div class="tickets-card-number">
                                        <i class="pi pi-file"></i>
                                        <strong>№ {{ ticket.number || '—' }}</strong>
                                    </div>
                                    <Tag
                                        :severity="getStatusSeverity(ticket.status)"
                                        :value="getStatusLabel(ticket.status)"
                                        :icon="getStatusIcon(ticket.status)"
                                    />
                                </div>

                                <div class="tickets-card-summary">{{ ticket.requestType?.name || 'Тип заявки не указан' }}</div>

                                <ul class="tickets-card-fields">
                                    <li class="tickets-card-field">
                                        <span class="tickets-card-field-label">Приоритет</span>
                                        <Tag
                                            :severity="getPrioritySeverity(ticket.priority)"
                                            :value="getPriorityLabel(ticket.priority)"
                                        />
                                    </li>
                                    <li v-if="ticket.requesterName" class="tickets-card-field">
                                        <span class="tickets-card-field-label">Заявитель</span>
                                        <span class="tickets-card-field-chip">{{ ticket.requesterName }}</span>
                                    </li>
                                    <li v-if="ticket.requesterSystem" class="tickets-card-field">
                                        <span class="tickets-card-field-label">Система</span>
                                        <span class="tickets-card-field-chip">{{ ticket.requesterSystem }}</span>
                                    </li>
                                    <li v-if="ticket.createdAt" class="tickets-card-field">
                                        <span class="tickets-card-field-label">Дата создания</span>
                                        <span class="tickets-card-field-chip">{{ formatDate(ticket.createdAt) }}</span>
                                    </li>
                                </ul>
                            </article>
                        </div>
                        <AsyncState
                            v-else-if="loadError"
                            tone="error"
                            icon="pi pi-exclamation-triangle"
                            title="Не удалось загрузить справки"
                            description="Проверьте соединение и попробуйте ещё раз."
                            retry
                            @retry="fetchTickets"
                        />
                        <div v-else class="tickets-empty-state">
                            {{ hasActiveFilters
                                ? 'Попробуйте изменить параметры фильтрации'
                                : 'У вас пока нет справок или они не назначены на вас'
                            }}
                        </div>

                        <div class="tickets-paginator">
                            <Paginator
                                :rows="rowsPerPage"
                                :first="firstRowIndex"
                                :totalRecords="totalRecords"
                                @page="onPage"
                            />
                        </div>
                    </section>
                </div>

                <div key="tickets-skeleton" v-else-if="loading" class="skeleton-container">
                    <div class="skeleton-header mb-4">
                        <Skeleton width="200px" height="40px" class="mb-2" />
                        <Skeleton width="300px" height="20px" />
                    </div>
                    <Skeleton width="100%" height="200px" class="skeleton-table" />
                </div>
            </Transition>
        </div>

        <TicketDetailsModal
            v-model:visible="ticketModalVisible"
            :ticketId="selectedTicketId"
            @close="handleModalClose"
        />
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axiosInstance from '@/utils/axios.js';
import { debounce } from 'lodash';
import TicketDetailsModal from '@/components/Tickets/TicketDetails.vue';
import AsyncState from '@/components/Utils/AsyncState.vue';
import { usePermissionStore } from '@/stores/permissions';
import { ticketMocks, USE_MOCK_DATA } from '@/config/mockRuntime.js';
import { formatDateRuLongWithTime as formatDate } from '@/utils/date.js';
import { getSessionUserId } from '@/utils/TokenService';
import { getCurrentUser } from '@/utils/currentUser.js';
import { useResponsiveLayout } from '@/composables/useResponsiveLayout.js';
import { useMobileTableView } from '@/composables/useMobileTableView.js';

const permissionStore = usePermissionStore();

const tickets = ref([]);
const totalRecords = ref(0);
const loading = ref(true);
const loadError = ref(false);
const isFirstLoadDone = ref(false);
const useMockData = ref(USE_MOCK_DATA);
const specialFeaturesPanel = ref(null);
const autoAssignLoading = ref(false);
const rowsPerPageOptions = [
    { label: '12', value: 12 },
    { label: '24', value: 24 },
    { label: '48', value: 48 },
];
const { isPhone } = useResponsiveLayout();

// Модальное окно
const ticketModalVisible = ref(false);
const selectedTicketId = ref(null);

const resolveUserId = async () => {
    const sessionUserId = getSessionUserId();
    if (sessionUserId) return sessionUserId;

    try {
        const me = await getCurrentUser();
        return me?.id || null;
    } catch {
        return null;
    }
};

const onlyMyTickets = ref(true);

const canReadTickets = computed(() => {
    return permissionStore.hasPermission('Tickets', 'Read');
});

const onAssigneeToggle = () => {
    currentPage.value = 1;
    fetchTickets();
};

const toggleSpecialFeaturesPanel = (event) => {
    specialFeaturesPanel.value?.toggle(event);
};

const runAutoAssignResponsible = async () => {
    try {
        autoAssignLoading.value = true;
        await axiosInstance.post('/api/tickets/function/auto/assign-tickets');
        window.dispatchEvent(new CustomEvent('toast', {
            detail: {
                severity: 'success',
                summary: 'Справки',
                detail: 'Автоназначение ответственных запущено'
            }
        }));
        specialFeaturesPanel.value?.hide();
    } catch (error) {
        console.error('Ошибка при автоназначении ответственных:', error);
        window.dispatchEvent(new CustomEvent('toast', {
            detail: {
                severity: 'error',
                summary: 'Справки',
                detail: 'Не удалось запустить автоназначение ответственных'
            }
        }));
    } finally {
        autoAssignLoading.value = false;
    }
};

const filters = ref({
    number: null,
    status: null,
    priority: null,
    requesterId: null,
});

// Маппинг статусов (английский → русский)
const statusMap = {
    'New': 'Новая',
    'Open': 'Открыта',
    'Assigned': 'Назначена',
    'Pending': 'В ожидании',
    'Resolved': 'Решена',
    'Closed': 'Закрыта',
    'Cancelled': 'Отменена'
};

// Маппинг приоритетов (английский → русский)
const priorityMap = {
    'Low': 'Низкий',
    'Medium': 'Средний',
    'High': 'Высокий'
};

// Опции для фильтров статусов (с полным списком enum)
const statusOptions = [
    { label: "Все", value: null },
    { label: 'Новая', value: 'New' },
    { label: 'Открыта', value: 'Open' },
    { label: 'Назначена', value: 'Assigned' },
    { label: 'В ожидании', value: 'Pending' },
    { label: 'Решена', value: 'Resolved' },
    { label: 'Закрыта', value: 'Closed' },
    { label: 'Отменена', value: 'Cancelled' },
];

// Опции для фильтров приоритетов (с полным списком enum)
const priorityOptions = [
    { label: "Все", value: null },
    { label: 'Низкий', value: 'Low' },
    { label: 'Средний', value: 'Medium' },
    { label: 'Высокий', value: 'High' },
];

const currentPage = ref(1);
const rowsPerPage = ref(12);
const {
    firstRowIndex,
    currentPageItems: currentPageTickets,
    showMobileFilters,
} = useMobileTableView({
    items: tickets,
    currentPage,
    rowsPerPage,
    isPhone,
    sliceItems: false,
});

// Компьютированные свойства
const hasActiveFilters = computed(() => {
    return Object.values(filters.value).some(value =>
        value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)
    );
});

const onFilter = (field, value) => {
    filters.value[field] = value;
    currentPage.value = 1;
    debouncedFetchTickets();
};

const debouncedFetchTickets = debounce(async () => {
    await fetchTickets();
}, 500);

const resetMobileFilters = async () => {
    currentPage.value = 1;
    filters.value = {
        number: null,
        status: null,
        priority: null,
        requesterId: null,
    };
    await fetchTickets();
};

const parseFioFromFormData = (formData) => {
    if (!formData) return null;
    try {
        const parsed = typeof formData === 'string' ? JSON.parse(formData) : formData;
        return parsed?.fio || null;
    } catch {
        return null;
    }
};

const enrichTicketsWithFio = (ticketList) => {
    return (ticketList || []).map(ticket => ({
        ...ticket,
        requesterName: parseFioFromFormData(ticket?.formData) || '—'
    }));
};

// Функции для стилизации статусов и приоритетов
const getStatusSeverity = (status) => {
    const map = {
        'New': 'info',
        'Open': 'warning',
        'Assigned': 'success',
        'Pending': 'secondary',
        'Resolved': 'success',
        'Closed': 'secondary',
        'Cancelled': 'danger'
    };
    return map[status] || 'info';
};

const getStatusLabel = (status) => {
    return statusMap[status] || status;
};

const getStatusIcon = (status) => {
    const map = {
        'New': 'pi pi-plus-circle',
        'Open': 'pi pi-folder-open',
        'Assigned': 'pi pi-verified',
        'Pending': 'pi pi-hourglass',
        'Resolved': 'pi pi-check-circle',
        'Closed': 'pi pi-lock',
        'Cancelled': 'pi pi-times-circle'
    };
    return map[status] || 'pi pi-info-circle';
};

const getPrioritySeverity = (priority) => {
    const map = {
        'Low': 'success',
        'Medium': 'warning',
        'High': 'danger'
    };
    return map[priority] || 'info';
};

const getPriorityLabel = (priority) => {
    return priorityMap[priority] || priority;
};

// Работа с модальным окном
const openTicketModal = async (ticketId) => {
    selectedTicketId.value = ticketId;
    ticketModalVisible.value = true;
};

const handleModalClose = () => {
    fetchTickets();
};

const onPage = async (event) => {
    currentPage.value = event.page + 1;
    rowsPerPage.value = event.rows;
    await fetchTickets();
};

const onRowsPerPageChange = async () => {
    currentPage.value = 1;
    await fetchTickets();
};

const fetchTickets = async () => {
    try {
        loading.value = true;
        loadError.value = false;
        if (useMockData.value) {
            const mockTickets = ticketMocks.mockTickets || {};
            tickets.value = enrichTicketsWithFio(mockTickets.tickets || []);
            totalRecords.value = mockTickets.totalCount || 0;
            return;
        }
        const userId = await resolveUserId();

        const payload = {
            page: currentPage.value,
            pageSize: rowsPerPage.value,
            ...filters.value,
        };

        if (onlyMyTickets.value && canReadTickets.value) {
            payload.assigneeId = userId;
        }

        const { data } = await axiosInstance.post('/api/tickets', payload);
        tickets.value = enrichTicketsWithFio(data.tickets);
        totalRecords.value = data.totalCount || 0;
    } catch (error) {
        console.error('Ошибка при получении заявок:', error);
        loadError.value = true;
    } finally {
        loading.value = false;
        isFirstLoadDone.value = true;
    }
};

onMounted(async () => {
    await fetchTickets();
});
</script>

<style scoped>
.content {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    box-sizing: border-box;
}

.content-wrapper {
    position: relative;
    flex-grow: 1;
    padding: var(--app-page-padding-y) var(--app-page-padding-x) 1rem;
    height: 100%;
    color: var(--p-text-color);
    transition: all 0.5s;
}

.tickets-layout {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.tickets-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
}

.tickets-subtitle {
    margin: 0.35rem 0 0;
    color: var(--p-text-muted-color, var(--p-grey-2));
    font-size: 0.92rem;
}

.tickets-toolbar-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
}

.tickets-only-my {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.8rem 1rem;
    border-radius: 16px;
    border: 1px solid rgba(var(--p-blue-500-rgb), 0.12);
    background: rgba(var(--p-blue-500-rgb), 0.04);
}

.tickets-filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(clamp(200px, 30vw, 280px), 1fr));
    align-items: start;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 18px;
    border: 1px solid rgba(var(--p-blue-500-rgb), 0.12);
    background: linear-gradient(
        180deg,
        rgba(var(--p-blue-500-rgb), 0.04),
        rgba(255, 255, 255, 0)
    );
    min-width: 0;
}

.tickets-filters > * {
    min-width: 0;
}

.tickets-filters :deep(.p-select),
.tickets-filters :deep(.p-inputtext) {
    width: 100%;
}

.tickets-filter-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    grid-column: 1 / -1;
}

.tickets-summary {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.92rem;
    color: var(--p-text-muted-color, var(--p-grey-2));
}

.tickets-card-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(clamp(260px, 45vw, 340px), 1fr));
    gap: 0.85rem;
}

.tickets-card {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: 1rem;
    border-radius: 18px;
    border: 1px solid rgba(var(--p-blue-500-rgb), 0.14);
    background: linear-gradient(
        180deg,
        rgba(var(--p-blue-500-rgb), 0.05),
        rgba(255, 255, 255, 0)
    );
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
    cursor: pointer;
    transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.tickets-card:hover {
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1);
    transform: translateY(-2px);
}

.tickets-card-head,
.tickets-card-number {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.tickets-card-number {
    justify-content: flex-start;
}

.tickets-card-number .pi {
    font-size: 1.3rem;
}

.tickets-card-summary {
    font-weight: 600;
    font-size: 1.02rem;
    line-height: 1.35;
    color: var(--p-text-color);
}

.tickets-card-fields {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.tickets-card-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
}

.tickets-card-field-label {
    flex: 0 0 auto;
    color: var(--p-text-muted-color, var(--p-grey-2));
    font-size: 0.85rem;
    white-space: nowrap;
}

.tickets-card-field-label::after {
    content: ':';
}

.tickets-card-field-chip {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    padding: 0.32rem 0.7rem;
    border-radius: 999px;
    background: rgba(var(--p-blue-500-rgb), 0.08);
    font-size: 0.82rem;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tickets-empty-state {
    padding: 2rem 1rem;
    text-align: center;
    border-radius: 18px;
    border: 1px dashed rgba(var(--p-blue-500-rgb), 0.18);
    color: var(--p-text-muted-color, var(--p-grey-2));
}

.tickets-paginator {
    padding-bottom: var(--app-mobile-bottom-offset);
}

.special-features-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 280px;
}

.skeleton-container {
    padding: 1.5rem;
}

.skeleton-header {
    display: flex;
    flex-direction: column;
}

.skeleton-table {
    border-radius: 12px;
    background-color: var(--p-grey-3);
}

@media (max-width: 768px) {
    .content {
        min-height: calc(100dvh - 4.5rem);
    }

    .tickets-toolbar,
    .tickets-card-head {
        flex-direction: column;
        align-items: flex-start;
    }

    .tickets-toolbar-actions {
        width: 100%;
        justify-content: flex-end;
    }

    .tickets-toolbar-actions :deep(.p-button) {
        flex: 1;
    }

    .tickets-summary,
    .tickets-filter-actions {
        display: grid;
        grid-template-columns: 1fr;
    }

    .tickets-filters {
        grid-template-columns: minmax(0, 1fr);
    }

    .tickets-card-list {
        grid-template-columns: 1fr;
    }
}
</style>