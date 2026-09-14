<template>
    <div class="content">
        <div class="content-wrap">

            <Transition name="content-fade" mode="out-in">
                <div key="requests-content" v-if="!loading">
                    <section class="requests-layout">
                        <div class="requests-toolbar">
                            <div>
                                <h3 class="title m-0">Ваши заявки</h3>
                                <p class="requests-subtitle">Быстрый просмотр актуальных обращений и статусов.</p>
                            </div>
                            <div class="requests-toolbar-actions">
                                <Button icon="pi pi-filter" outlined severity="secondary" @click="showMobileFilters = !showMobileFilters" />
                                <Button icon="pi pi-plus" @click="openCreateModal" />
                                <Button
                                    icon="pi pi-sync"
                                    outlined
                                    severity="secondary"
                                    @click="fetchCalls"
                                    :loading="loading"
                                    :disabled="loading"
                                />
                            </div>
                        </div>

                        <div v-if="showMobileFilters" class="requests-filters">
                            <InputText
                                v-model="filters.number"
                                placeholder="Поиск по номеру"
                                @input="handleFilterInput('number', filters.number)"
                            />
                            <InputText
                                v-model="filters.callSummaryName"
                                placeholder="Поиск по сводке"
                                @input="handleFilterInput('callSummaryName', filters.callSummaryName)"
                            />
                            <Select
                                v-model="filters.priorityId"
                                :options="priorityOptions"
                                optionLabel="name"
                                optionValue="id"
                                placeholder="Приоритет"
                                @change="handleFilterInput('priorityId', filters.priorityId)"
                            />
                            <MultiSelect
                                v-model="filters.entityStateNames"
                                :options="stateOptions"
                                optionLabel="label"
                                optionValue="value"
                                display="chip"
                                placeholder="Статусы"
                                @change="handleFilterInput('entityStateNames', filters.entityStateNames)"
                            />
                            <MultiSelect
                                v-model="filters.serviceName"
                                :options="serviceOptions"
                                optionLabel="label"
                                optionValue="value"
                                display="chip"
                                placeholder="Сервис"
                                @change="handleFilterInput('serviceName', filters.serviceName)"
                            />
                            <div class="requests-filter-actions">
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
                                    @click="clearMobileFilters"
                                />
                            </div>
                        </div>

                        <div class="requests-summary">
                            <span>Всего заявок: {{ totalRecords }}</span>
                            <span>Показано: {{ currentPageCalls.length }}</span>
                        </div>

                        <div v-if="currentPageCalls.length" class="requests-card-list">
                            <article
                                v-for="call in currentPageCalls"
                                :key="call.id"
                                class="requests-card"
                                :class="{ 'removed-row': call.removed, 'highlighted-row': call.id === lastCreatedId }"
                                @click="openCallDetails(call.id)"
                            >
                                <div class="requests-card-head">
                                    <div class="requests-card-number">
                                        <OverlayBadge :value="call.documentCount" :severity="call.documentCount ? 'danger' : 'secondary'">
                                            <i class="pi pi-file"></i>
                                        </OverlayBadge>
                                        <strong>№ {{ call.number || '—' }}</strong>
                                    </div>
                                    <Tag
                                        :value="call.entityStateName"
                                        :severity="getStatusSeverity(call.entityStateName)"
                                        :icon="getStatusIcon(call.entityStateName)"
                                    />
                                </div>

                                <div v-if="call.callSummaryName" class="requests-card-summary">{{ call.callSummaryName }}</div>

                                <ul class="requests-card-fields">
                                    <li class="requests-card-field">
                                        <span class="requests-card-field-label">Приоритет</span>
                                        <Tag
                                            :value="call.priorityName || 'Без приоритета'"
                                            :severity="call.priorityName === 'Высокий' ? 'danger' : call.priorityName === 'Низкий' ? 'success' : 'info'"
                                        />
                                    </li>
                                    <li v-if="call.clientFullName" class="requests-card-field">
                                        <span class="requests-card-field-label">Клиент</span>
                                        <span class="requests-card-field-chip">{{ call.clientFullName }}</span>
                                    </li>
                                    <li v-if="call.initiatorFullName" class="requests-card-field">
                                        <span class="requests-card-field-label">Инициатор</span>
                                        <span class="requests-card-field-chip">{{ call.initiatorFullName }}</span>
                                    </li>
                                    <li v-if="call.executorFullName" class="requests-card-field">
                                        <span class="requests-card-field-label">Исполнитель</span>
                                        <span class="requests-card-field-chip">{{ call.executorFullName }}</span>
                                    </li>
                                    <li v-if="call.serviceName" class="requests-card-field">
                                        <span class="requests-card-field-label">Сервис</span>
                                        <span class="requests-card-field-chip">{{ call.serviceName }}</span>
                                    </li>
                                </ul>

                                <div v-if="call.description" class="requests-card-row">
                                    <span class="requests-card-label">Описание</span>
                                    <span class="requests-card-value clamp-2">{{ call.description }}</span>
                                </div>
                            </article>
                        </div>
                        <AsyncState
                            v-else-if="requestsLoadError"
                            tone="error"
                            icon="pi pi-exclamation-triangle"
                            title="Не удалось загрузить заявки"
                            description="Проверьте соединение и попробуйте ещё раз."
                            retry
                            @retry="fetchCalls"
                        />
                        <div v-else class="requests-empty-state">Не найдено.</div>

                        <div class="requests-paginator">
                            <Paginator
                                :rows="rowsPerPage"
                                :first="firstRowIndex"
                                :totalRecords="totalRecords"
                                @page="onPage"
                            />
                        </div>
                    </section>
                </div>
                <Skeleton key="requests-skeleton" v-else width="100%" height="100%" class="skeleton-table" />
            </Transition>
        </div>
        <CreateRequest ref="createRequestRef" :showButton="false" @refreshRequests="(id) => fetchCalls(id)"/>
        <InfraManagerCallsMe ref="callDetailsRef" class="position-absolute opacity-0" style="z-index: -999;" @close="clearCallDetailsQuery"/>
    </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { debounce } from 'lodash';
import qs from 'qs';
import axiosInstance from '@/utils/axios.js';
import { getInfraStatusIcon, getInfraStatusSeverity } from '@/utils/infraStatus.js';
import { formatDateOmskFromUtcString } from '@/utils/date.js';
import { useResponsiveLayout } from '@/composables/useResponsiveLayout.js';
import { useMobileTableView } from '@/composables/useMobileTableView.js';

import InfraManagerCallsMe from '@/components/InfraManager/InfraManagerCallsMe.vue';
import CreateRequest from '@/components/InfraManager/CreateRequest.vue';
import AsyncState from '@/components/Utils/AsyncState.vue';
import { requestMocks, USE_MOCK_DATA } from '@/config/mockRuntime.js';

const loading = ref(true);
const requestsLoadError = ref(false);
const calls = ref([]);  // Все загруженные заявки
const currentPage = ref(1);  // Текущая страница
const rowsPerPage = ref(12);  // Количество строк на странице
const totalRecords = ref(0);  // Общее количество заявок
const totalPages = ref(0);
const loadedPages = ref(10);

const route = useRoute();
const router = useRouter();
const { isPhone } = useResponsiveLayout();

const serviceOptions = ref([]);
const priorityOptions = ref([]);
const stateOptions = ref([]);

const rowsPerPageOptions = [
    { label: '12', value: 12 },
    { label: '24', value: 24 },
    { label: '48', value: 48 },
];

const {
    firstRowIndex,
    currentPageItems: currentPageCalls,
    showMobileFilters,
} = useMobileTableView({
    items: calls,
    currentPage,
    rowsPerPage,
    isPhone,
});

const getStatusSeverity = getInfraStatusSeverity;
const getStatusIcon = getInfraStatusIcon;
const formatUTCToOmsk = formatDateOmskFromUtcString;

const formatUtcFields = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(formatUtcFields);
    } else if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            if (key.startsWith('utc') && obj[key]) {
                newObj[key] = formatUTCToOmsk(obj[key]);
            } else {
                newObj[key] = formatUtcFields(obj[key]);
            }
        }
        return newObj;
    }
    return obj;
};

const lastCreatedId = ref(null);

const getMockCalls = () => requestMocks.filter((call) => {
    const matchesNumber = !filters.number || String(call.number).toLowerCase().includes(String(filters.number).toLowerCase());
    const matchesSummary = !filters.callSummaryName || call.callSummaryName.toLowerCase().includes(String(filters.callSummaryName).toLowerCase());
    const matchesPriority = !filters.priorityId || call.priorityId === filters.priorityId;
    const matchesState = !filters.entityStateNames?.length || filters.entityStateNames.includes(call.entityStateName);
    const matchesService = !filters.serviceName?.length || filters.serviceName.includes(call.serviceName);
    return matchesNumber && matchesSummary && matchesPriority && matchesState && matchesService;
});

// Загрузка заявок (по страницам)
const fetchCalls = async (highlightId = null) => {
    try {
        loading.value = true;
        requestsLoadError.value = false;

        if (USE_MOCK_DATA) {
            calls.value = formatUtcFields(getMockCalls());
            totalRecords.value = calls.value.length;
            totalPages.value = Math.max(1, Math.ceil(totalRecords.value / rowsPerPage.value));
            loadedPages.value = totalPages.value;
            loading.value = false;
            return;
        }

        const response = await axiosInstance.get('/api/infra-manager/users/me/calls', {
            params: {
                page: 1,
                pageSize: rowsPerPage.value * 5,
                ...filters,
            },

            paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' })
        });

        if (response.data?.entities) {
            calls.value = formatUtcFields(response.data.entities);
            totalRecords.value = response.data.countAllEntities;
            totalPages.value = response.data.countAllPages;
            loadedPages.value = 5;
            if (firstRowIndex.value >= totalRecords.value) {
                currentPage.value = 1;
            }
        }

        if (highlightId) {
            lastCreatedId.value = highlightId;
            console.debug(lastCreatedId.value);
            setTimeout(() => {
                lastCreatedId.value = null;
            }, 5000);
        }

        loading.value = false;
    } catch (error) {
        console.error('Ошибка при загрузке: ', error);
        requestsLoadError.value = true;
        loading.value = false;
    }
};

const loadMorePages = async () => {
    if (USE_MOCK_DATA) return;

    try {
        const response = await axiosInstance.get('/api/infra-manager/users/me/calls', {
            params: {
                page: loadedPages.value / 5 + 1,
                pageSize: rowsPerPage.value * 5,
                ...filters
            },
        });

        if (response.data?.entities) {
            calls.value.push(...formatUtcFields(response.data.entities));
            loadedPages.value += 5;
        }
    } catch (error) {
        console.debug('Ошибка при загрузке: ', error);
    }
};

// При изменении страницы
const onPage = async (event) => {
    currentPage.value = event.page + 1;
    rowsPerPage.value = event.rows;

    if ((currentPage.value >= loadedPages.value - 1 &&
            calls.value.length != totalRecords.value) ||
            (currentPage.value === loadedPages.value && calls.value.length != totalRecords.value)) {
        await loadMorePages();
    }
};

const onRowsPerPageChange = async () => {
    currentPage.value = 1;
    await fetchCalls();
};

const fetchFilterOptions = async () => {
    if (USE_MOCK_DATA) {
        const mockCalls = requestMocks;
        serviceOptions.value = [...new Set(mockCalls.map((call) => call.serviceName))].map((service) => ({ label: service, value: service }));
        priorityOptions.value = [
            { id: '', name: 'Все' },
            { id: 'high', name: 'Высокий' },
            { id: 'medium', name: 'Средний' },
            { id: 'low', name: 'Низкий' },
        ];
        stateOptions.value = [...new Set(mockCalls.map((call) => call.entityStateName))].map((state) => ({ label: state, value: state }));
        return;
    }

    try {
        const [services, priorities, states] = await Promise.all([
            axiosInstance.get('/api/infra-manager/calls/service-names'),
            axiosInstance.get('/api/infra-manager/calls/priorities'),
            axiosInstance.get('/api/infra-manager/calls/states'),
        ]);

        serviceOptions.value = services.data.map(service => ({ label: service, value: service }));
        priorityOptions.value = [
            { id: '', name: 'Все' },
            ...priorities.data
        ]
        stateOptions.value = states.data.map(state => ({ label: state, value: state }));
    } catch (error) {
        console.debug('Ошибка загрузки данных для фильтров: ', error);
    }
};

const filters = reactive({
    number: route.query.number || '',
    callSummaryName: route.query.callSummaryName || '',
    serviceName: route.query.serviceName ? route.query.serviceName.split(',') : [],
    priorityId: route.query.priorityId || '',
    entityStateNames: route.query.entityStateNames || ['Инициирована', 'Открыта', 'Зарегистрирована', 'Ожидает']
});

const debouncedUpdateQuery = debounce((key, value) => {
    const query = { ...route.query };

    if (value && value.length !== 0) {
        if (Array.isArray(value)) {
            query[key] = value;
        } else {
            query[key] = value;
        }
    } else {
        delete query[key];
    }

    router.push({ query });
}, 750);

const clearMobileFilters = () => {
    currentPage.value = 1;
    filters.number = '';
    filters.callSummaryName = '';
    filters.serviceName = [];
    filters.priorityId = '';
    filters.entityStateNames = [];

    const query = { ...route.query };
    delete query.number;
    delete query.callSummaryName;
    delete query.serviceName;
    delete query.priorityId;
    delete query.entityStateNames;

    router.push({ query });
};

// Обновление query при входе
const handleFilterInput = (key, value) => {
    filters[key] = value;
    currentPage.value = 1;
    debouncedUpdateQuery(key, value);
};

watch (
    () => route.query,
    async () => {
        await fetchCalls();
    },
    { immediate: true }
);

const callDetailsRef = ref(null); // Ссылка на дочерний компонент InfraManagerCalls
const createRequestRef = ref(null);
const shouldOpenCreateModal = ref(false);

const openCallDetailsById = (id) => {
    if (!id) return;

    nextTick(() => {
        callDetailsRef.value?.openCallDetails(id);
    });
};

const openCallDetails = (id) => {
    if (!id) return;

    if (String(route.query.callId || '') === String(id)) {
        openCallDetailsById(id);
        return;
    }

    router.push({
        query: {
            ...route.query,
            callId: id,
        },
    });
};

const clearCallDetailsQuery = () => {
    if (!route.query.callId) return;

    const query = { ...route.query };
    delete query.callId;
    router.replace({ query });
};
const openCreateModal = () => { createRequestRef.value?.openModal?.(); };

watch(
    () => route.query.callId,
    (callId) => {
        if (callId) {
            openCallDetailsById(callId);
        }
    },
    { immediate: true }
);

watch(
    () => route.query.create,
    (createFlag) => {
        shouldOpenCreateModal.value = createFlag === '1';
    },
    { immediate: true }
);

watch(
    [shouldOpenCreateModal, createRequestRef],
    async ([needOpen]) => {
        if (!needOpen || !createRequestRef.value?.openModal) return;

        await nextTick();
        createRequestRef.value.openModal();
        shouldOpenCreateModal.value = false;

        const query = { ...route.query };
        delete query.create;
        router.replace({ query });
    },
    { immediate: true }
);

onMounted(() => {
    fetchFilterOptions();
});
</script>

<style scoped>
.content {
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    height: 100dvh;
}
.content-wrap {
    flex-grow: 1;
    align-content: center;
    padding: var(--app-page-padding-y) var(--app-page-padding-x) 1rem;
    color: var(--p-text-color);
    transition: all 0.5s;
    height: 100%;
}
.pi {
    font-size: 2rem;
}
.search {
    border-radius: 12px;
    font-size: 18px;
    transition: all 0.5s;
}
.skeleton-table {
    border-radius: 12px;
    background-color: var(--p-grey-3);
}

.requests-layout {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.requests-toolbar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
}

.requests-subtitle {
    margin: 0.35rem 0 0;
    color: var(--p-text-muted-color, var(--p-grey-2));
    font-size: 0.92rem;
}

.requests-toolbar-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
}

.requests-filters {
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
.requests-filters > * {
    min-width: 0;
}
.requests-filters :deep(.p-multiselect),
.requests-filters :deep(.p-select),
.requests-filters :deep(.p-inputtext) {
    width: 100%;
}
/* MultiSelect с чипами: в покое — одна строка с многоточием,
   при фокусе/раскрытии — перенос по контенту. */
.requests-filters :deep(.p-multiselect:not(.p-inputwrapper-focus) .p-multiselect-label) {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.requests-filters :deep(.p-multiselect:not(.p-inputwrapper-focus) .p-multiselect-chip-item) {
    margin-inline-end: 0.25rem;
}
.requests-filters :deep(.p-multiselect.p-inputwrapper-focus .p-multiselect-label) {
    display: flex;
    flex-wrap: wrap;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
}

.requests-filter-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    grid-column: 1 / -1;
}

.requests-summary {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.92rem;
    color: var(--p-text-muted-color, var(--p-grey-2));
}

.requests-card-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(clamp(260px, 45vw, 340px), 1fr));
    gap: 0.85rem;
}

.requests-card {
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
.requests-card:hover {
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1);
    transform: translateY(-2px);
}

.requests-card-head,
.requests-card-number {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.requests-card-number {
    justify-content: flex-start;
}

.requests-card-number .pi {
    font-size: 1.3rem;
}

.requests-card-row {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
}

.requests-card-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--p-text-muted-color, var(--p-grey-2));
}

.requests-card-value {
    color: var(--p-text-color);
    line-height: 1.45;
}

.requests-card-summary {
    font-weight: 600;
    font-size: 1.02rem;
    line-height: 1.35;
    color: var(--p-text-color);
}

.requests-card-fields {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.requests-card-field {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
}

.requests-card-field-label {
    flex: 0 0 auto;
    color: var(--p-text-muted-color, var(--p-grey-2));
    font-size: 0.85rem;
    white-space: nowrap;
}
.requests-card-field-label::after {
    content: ':';
}

.requests-card-field-chip {
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

.requests-empty-state {
    padding: 2rem 1rem;
    text-align: center;
    border-radius: 18px;
    border: 1px dashed rgba(var(--p-blue-500-rgb), 0.18);
    color: var(--p-text-muted-color, var(--p-grey-2));
}

.requests-paginator {
    padding-bottom: var(--app-mobile-bottom-offset);
}

.clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

@media (max-width: 768px) {
    .content {
        min-height: calc(100dvh - 4.5rem);
    }

    .requests-toolbar,
    .requests-card-head {
        flex-direction: column;
        align-items: flex-start;
    }

    .requests-toolbar-actions {
        width: 100%;
        justify-content: flex-end;
    }

    .requests-toolbar-actions :deep(.p-button) {
        flex: 1;
    }

    .requests-summary,
    .requests-filter-actions {
        grid-template-columns: 1fr;
        display: grid;
    }

    .requests-filters {
        grid-template-columns: minmax(0, 1fr);
    }

    .requests-card-list {
        grid-template-columns: 1fr;
    }
}
</style>