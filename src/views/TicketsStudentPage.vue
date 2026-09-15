<template>
    <main class="tickets-student-page">
        <section class="tickets-student-shell">
            <header class="tickets-student-header">
                <div class="tickets-student-copy">
                    <Tag rounded severity="info">Справки</Tag>
                    <h2>Заявки на получение справок</h2>
                    <p>Выберите тип справки, заполните форму и отслеживайте статус уже созданных заявок</p>
                </div>

                <div class="tickets-student-actions">
                    <Button v-if="canCreateStudentTickets" icon="pi pi-plus" @click="openCreateModal" />
                    <Button
                        icon="pi pi-refresh"
                        label="Обновить"
                        outlined
                        severity="secondary"
                        :loading="listLoading"
                        @click="refreshPage"
                    />
                </div>
            </header>

            <PermissionDenied v-if="!canAccessTicketsStudent" />

            <template v-else>
                <section
                    v-if="canReadStudentTickets"
                    class="tickets-student-card tickets-student-card-list"
                >
                    <div class="tickets-student-card-head">
                        <div>
                            <h3>Ранее сформированные заявки</h3>
                        </div>
                        <div class="tickets-student-card-head-actions">
                            <Select
                                v-model="rowsPerPage"
                                :options="rowsPerPageOptions"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Строк на странице"
                                class="tickets-student-rows-select"
                                @change="onRowsPerPageChange"
                            />
                            <Button
                                icon="pi pi-filter"
                                label="Фильтры"
                                outlined
                                severity="secondary"
                                :class="{ 'tickets-student-filter-toggle--active': showFilters }"
                                :badge="activeFilterCount ? String(activeFilterCount) : undefined"
                                @click="showFilters = !showFilters"
                            />
                            <Tag :value="`Всего: ${totalRecords}`" severity="contrast" />
                        </div>
                    </div>

                    <div v-if="showFilters" class="tickets-student-list-filters">
                        <InputText
                            :model-value="listFilters.number"
                            placeholder="Поиск по номеру"
                            @update:model-value="onListFilterChange('number', $event)"
                        />
                        <Select
                            v-model="listFilters.status"
                            :options="statusOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Статус"
                            @change="onListFilterChange('status', $event.value)"
                        />
                        <Select
                            v-model="listFilters.priority"
                            :options="priorityOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Приоритет"
                            @change="onListFilterChange('priority', $event.value)"
                        />
                        <Button
                            icon="pi pi-filter-slash"
                            label="Сбросить"
                            text
                            severity="secondary"
                            @click="resetListFilters"
                        />
                    </div>

                    <div v-if="studentTickets.length" class="tickets-student-grid">
                        <article
                            v-for="ticket in studentTickets"
                            :key="ticket.id"
                            class="tickets-student-grid-card"
                            @click="openTicketDetails(ticket)"
                        >
                            <div class="tickets-student-grid-head">
                                <div class="tickets-student-grid-number">
                                    <i class="pi pi-file"></i>
                                    <strong>№ {{ ticket.number || '—' }}</strong>
                                </div>
                                <Tag
                                    :severity="getStatusSeverity(ticket.status)"
                                    :value="getStatusLabel(ticket.status)"
                                    :icon="getStatusIcon(ticket.status)"
                                />
                            </div>

                            <div class="tickets-student-grid-summary">
                                {{ ticket.requestType?.name || 'Тип не указан' }}
                            </div>

                            <ul class="tickets-student-grid-fields">
                                <li class="tickets-student-grid-field">
                                    <span class="tickets-student-grid-field-label">Приоритет</span>
                                    <Tag
                                        :severity="getPrioritySeverity(ticket.priority)"
                                        :value="getPriorityLabel(ticket.priority)"
                                    />
                                </li>
                                <li v-if="ticket.createdAt" class="tickets-student-grid-field">
                                    <span class="tickets-student-grid-field-label">Создана</span>
                                    <span class="tickets-student-grid-field-chip">{{ formatDate(ticket.createdAt) }}</span>
                                </li>
                                <li v-if="ticket.updatedAt" class="tickets-student-grid-field">
                                    <span class="tickets-student-grid-field-label">Обновлена</span>
                                    <span class="tickets-student-grid-field-chip">{{ formatDate(ticket.updatedAt) }}</span>
                                </li>
                            </ul>

                            <div v-if="ticket.summary" class="tickets-student-grid-row">
                                <span class="tickets-student-grid-label">Данные</span>
                                <span class="tickets-student-grid-value clamp-2">{{ ticket.summary }}</span>
                            </div>
                        </article>
                    </div>

                    <div v-else class="tickets-student-empty-state">
                        <i class="pi pi-inbox"></i>
                        <h4>Заявки не найдены</h4>
                        <p>{{ hasActiveListFilters ? 'Измените параметры фильтрации и попробуйте ещё раз.' : 'У вас пока нет созданных заявок на справки.' }}</p>
                    </div>

                    <Paginator
                        :rows="rowsPerPage"
                        :first="firstRowIndex"
                        :totalRecords="totalRecords"
                        @page="onPage"
                    />
                </section>
            </template>
        </section>

        <StudentTicketDetailsDialog
            v-model:visible="ticketDetailsVisible"
            :ticket-id="selectedTicketId"
            @update:visible="onTicketDetailsVisibilityChange"
        />
        <StudentTicketCreateDialog
            ref="createTicketDialogRef"
            :show-button="false"
            @created="onTicketCreated"
        />
    </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { usePermissionStore } from '@/stores/permissions.js';
import { formatDateRuLongWithTime as formatDate } from '@/utils/date.js';
import { listMyTickets } from '@/api/tickets.js';
import PermissionDenied from '@/components/Utils/PermissionDenied.vue';
import StudentTicketDetailsDialog from '@/components/Tickets/StudentTicketDetailsDialog.vue';
import StudentTicketCreateDialog from '@/components/Tickets/StudentTicketCreateDialog.vue';

const toast = useToast();
const permissionStore = usePermissionStore();

const listLoading = ref(false);

const studentTickets = ref([]);
const totalRecords = ref(0);
const currentPage = ref(1);
const rowsPerPage = ref(12);
const ticketDetailsVisible = ref(false);
const selectedTicketId = ref('');
const createTicketDialogRef = ref(null);
const rowsPerPageOptions = [
    { label: '12', value: 12 },
    { label: '24', value: 24 },
    { label: '48', value: 48 },
];

const listFilters = ref({
    number: '',
    status: null,
    priority: null,
});

const showFilters = ref(false);

const canReadStudentTickets = computed(() => permissionStore.hasPermission('TicketsStudent', 'Read'));
const canCreateStudentTickets = computed(() => permissionStore.hasPermission('TicketsStudent', 'Create'));
const canAccessTicketsStudent = computed(() => canReadStudentTickets.value || canCreateStudentTickets.value);

const firstRowIndex = computed(() => (currentPage.value - 1) * rowsPerPage.value);
const hasActiveListFilters = computed(() => Boolean(
    String(listFilters.value.number || '').trim()
    || listFilters.value.status
    || listFilters.value.priority
));

const activeFilterCount = computed(() => [
    String(listFilters.value.number || '').trim(),
    listFilters.value.status,
    listFilters.value.priority,
].filter(Boolean).length);

const statusOptions = [
    { label: 'Все статусы', value: null },
    { label: 'Новая', value: 'New' },
    { label: 'Открыта', value: 'Open' },
    { label: 'Назначена', value: 'Assigned' },
    { label: 'В ожидании', value: 'Pending' },
    { label: 'Решена', value: 'Resolved' },
    { label: 'Закрыта', value: 'Closed' },
    { label: 'Отменена', value: 'Cancelled' },
];

const priorityOptions = [
    { label: 'Любой приоритет', value: null },
    { label: 'Низкий', value: 'Low' },
    { label: 'Средний', value: 'Medium' },
    { label: 'Высокий', value: 'High' },
];

const statusMap = {
    New: 'Новая',
    Open: 'Открыта',
    Assigned: 'Назначена',
    Pending: 'В ожидании',
    Resolved: 'Решена',
    Closed: 'Закрыта',
    Cancelled: 'Отменена',
};

const priorityMap = {
    Low: 'Низкий',
    Medium: 'Средний',
    High: 'Высокий',
};

const getStatusSeverity = (status) => ({
    New: 'info',
    Open: 'warning',
    Assigned: 'success',
    Pending: 'secondary',
    Resolved: 'success',
    Closed: 'secondary',
    Cancelled: 'danger',
}[status] || 'contrast');

const getStatusLabel = (status) => statusMap[status] || status || 'Не указан';
const getStatusIcon = (status) => ({
    New: 'pi pi-plus-circle',
    Open: 'pi pi-folder-open',
    Assigned: 'pi pi-verified',
    Pending: 'pi pi-hourglass',
    Resolved: 'pi pi-check-circle',
    Closed: 'pi pi-lock',
    Cancelled: 'pi pi-times-circle',
}[status] || 'pi pi-info-circle');

const getPrioritySeverity = (priority) => ({
    Low: 'success',
    Medium: 'warning',
    High: 'danger',
}[priority] || 'secondary');

const getPriorityLabel = (priority) => priorityMap[priority] || priority || 'Не указан';

const normalizeNumberFilter = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return null;
    const numericValue = Number(normalized);
    return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
};

const parseTicketFormData = (formData) => {
    if (!formData) return {};

    try {
        return typeof formData === 'string' ? JSON.parse(formData) : formData;
    } catch {
        return {};
    }
};

const buildTicketSummary = (ticket) => {
    const parsed = parseTicketFormData(ticket?.formData);
    const values = Object.values(parsed || {})
        .map((value) => {
            if (value && typeof value === 'object') {
                return value.fileName || '';
            }

            return String(value || '').trim();
        })
        .filter(Boolean);

    return values.slice(0, 2).join(' • ') || 'Дополнительные данные не указаны';
};

const enrichStudentTickets = (items = []) => (
    Array.isArray(items)
        ? items.map((ticket) => ({
            ...ticket,
            summary: buildTicketSummary(ticket),
        }))
        : []
);

const fetchStudentTickets = async () => {
    if (!canReadStudentTickets.value) return;

    listLoading.value = true;

    try {
        const response = await listMyTickets({
            page: currentPage.value,
            pageSize: rowsPerPage.value,
            number: normalizeNumberFilter(listFilters.value.number),
            status: listFilters.value.status || undefined,
            priority: listFilters.value.priority || undefined,
        });

        studentTickets.value = enrichStudentTickets(response.data?.tickets);
        totalRecords.value = Number(response.data?.totalCount) || 0;
    } catch (error) {
        studentTickets.value = [];
        totalRecords.value = 0;
        toast.add({
            severity: 'error',
            summary: 'Не удалось загрузить список заявок',
            detail: error?.response?.data?.message || 'Попробуйте обновить страницу позже.',
            life: 3500,
        });
    } finally {
        listLoading.value = false;
    }
};

const resetListFilters = async () => {
    listFilters.value = {
        number: '',
        status: null,
        priority: null,
    };
    currentPage.value = 1;
    await fetchStudentTickets();
};

const onListFilterChange = async (field, value) => {
    listFilters.value = {
        ...listFilters.value,
        [field]: value,
    };
    currentPage.value = 1;
    await fetchStudentTickets();
};

const onRowsPerPageChange = async () => {
    currentPage.value = 1;
    await fetchStudentTickets();
};

const onPage = async (event) => {
    currentPage.value = Number(event.page) + 1;
    rowsPerPage.value = Number(event.rows);
    await fetchStudentTickets();
};

const openTicketDetails = (ticket) => {
    if (!ticket?.id) return;

    selectedTicketId.value = ticket.id;
    ticketDetailsVisible.value = true;
};

const onTicketDetailsVisibilityChange = (value) => {
    ticketDetailsVisible.value = value;

    if (!value) {
        selectedTicketId.value = '';
    }
};

const openCreateModal = () => {
    createTicketDialogRef.value?.openModal?.();
};

const onTicketCreated = async () => {
    if (!canReadStudentTickets.value) return;

    currentPage.value = 1;
    await fetchStudentTickets();
};

const refreshPage = async () => {
    await fetchStudentTickets();
};

onMounted(async () => {
    if (!canAccessTicketsStudent.value) return;

    await fetchStudentTickets();
});
</script>

<style scoped>
.tickets-student-page {
    --tickets-student-border: rgba(var(--p-blue-500-rgb), 0.14);
    --tickets-student-soft-bg: rgba(var(--p-blue-500-rgb), 0.05);
    min-height: 100%;
    padding: 10px;
}

.tickets-student-shell {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 100%;
    padding: 1.25rem;
    border-radius: 20px;
    border: 1px solid var(--tickets-student-border);
    background:
        radial-gradient(1000px 220px at 0% 0%, rgba(var(--p-blue-500-rgb), 0.08), transparent 60%),
        linear-gradient(180deg, var(--p-bg-color-2) 0%, var(--p-bg-color-1) 100%);
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06);
}

.tickets-student-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
}

.tickets-student-copy h2 {
    margin: 0.75rem 0 0;
}

.tickets-student-copy p {
    margin: 0.65rem 0 0;
    max-width: 70ch;
    color: var(--p-grey-1);
    line-height: 1.5;
}

.tickets-student-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.tickets-student-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.15rem;
    border-radius: 18px;
    border: 1px solid rgba(var(--p-blue-500-rgb), 0.1);
    background:
        linear-gradient(
            180deg,
            color-mix(in srgb, var(--p-content-background) 96%, var(--p-primary-color) 4%),
            color-mix(in srgb, var(--p-content-background) 90%, var(--p-primary-color) 10%)
        );
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.tickets-student-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
}

.tickets-student-card-head h3,
.tickets-student-card-head p {
    margin: 0;
}

.tickets-student-card-head p {
    margin-top: 0.45rem;
    color: var(--p-grey-1);
    line-height: 1.5;
}

.tickets-student-card-head-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.tickets-student-filter-toggle--active {
    border-color: var(--p-primary-color);
    color: var(--p-primary-color);
}

.tickets-student-list-filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(clamp(200px, 30vw, 280px), 1fr));
    align-items: start;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 16px;
    border: 1px solid var(--tickets-student-border);
    background: rgba(var(--p-blue-500-rgb), 0.03);
    min-width: 0;
}

.tickets-student-list-filters > * {
    min-width: 0;
}

.tickets-student-list-filters :deep(.p-select),
.tickets-student-list-filters :deep(.p-inputtext) {
    width: 100%;
}

.tickets-student-rows-select {
    max-width: 12rem;
}

.tickets-student-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(clamp(260px, 45vw, 340px), 1fr));
    gap: 0.85rem;
}

.tickets-student-grid-card {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: 1rem;
    border-radius: 18px;
    border: 1px solid var(--tickets-student-border);
    background: linear-gradient(
        180deg,
        var(--tickets-student-soft-bg),
        rgba(255, 255, 255, 0)
    );
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
    cursor: pointer;
    transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.tickets-student-grid-card:hover {
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1);
    transform: translateY(-2px);
}

.tickets-student-grid-head,
.tickets-student-grid-number {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.tickets-student-grid-number {
    justify-content: flex-start;
}

.tickets-student-grid-number .pi {
    font-size: 1.3rem;
}

.tickets-student-grid-summary {
    font-weight: 600;
    font-size: 1.02rem;
    line-height: 1.35;
    color: var(--p-text-color);
}

.tickets-student-grid-fields {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.tickets-student-grid-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
}

.tickets-student-grid-field-label {
    flex: 0 0 auto;
    color: var(--p-text-muted-color, var(--p-grey-2));
    font-size: 0.85rem;
    white-space: nowrap;
}

.tickets-student-grid-field-label::after {
    content: ':';
}

.tickets-student-grid-field-chip {
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

.tickets-student-grid-row {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
}

.tickets-student-grid-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--p-text-muted-color, var(--p-grey-2));
}

.tickets-student-grid-value {
    color: var(--p-text-color);
    line-height: 1.45;
}

.clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.tickets-student-empty-state {
    min-height: 220px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
}

.tickets-student-empty-state i {
    font-size: 2rem;
    color: var(--p-grey-1);
}

.tickets-student-empty-state h4,
.tickets-student-empty-state p {
    margin: 0;
}

.tickets-student-empty-state p {
    max-width: 48ch;
    color: var(--p-grey-1);
}

@media (max-width: 768px) {
    .tickets-student-shell {
        padding: 1rem;
    }

    .tickets-student-header,
    .tickets-student-card-head {
        flex-direction: column;
        align-items: stretch;
    }

    .tickets-student-actions {
        justify-content: flex-start;
    }

    .tickets-student-list-filters {
        grid-template-columns: minmax(0, 1fr);
    }

    .tickets-student-grid {
        grid-template-columns: 1fr;
    }

    .tickets-student-grid-head {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>