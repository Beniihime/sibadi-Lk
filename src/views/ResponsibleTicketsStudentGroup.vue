<template>
    <main>
        <div class="content-wrapper">
            <Transition name="content-fade" mode="out-in">
            <DataTable 
                v-if="!loading || groupList.length"
                key="responsible-content"
                :value="groupList" 
                dataKey="id" 
                class="mb-4 no-row-hover" 
                paginator
                stripedRows
                :rows="rowsPerPage"
                :totalRecords="groupList.length"
                :first="first"
                @page="onPageChange"
                v-model:filters="filters"
                filterDisplay="row"
            >
                <template #header>
                    <div class="d-flex justify-content-between align-items-center">
                        <h3 class="m-0">Ответственные за заявки</h3>
                        <div class="page-controls d-flex gap-2">
                            <AddResponsibleGroup @added="loadGroups" />
                            <Button 
                                icon="pi pi-sync"
                                outlined
                                severity="secondary"
                                @click="loadGroups"
                                :loading="loading"
                                :disabled="loading"
                            />
                        </div>
                    </div>
                </template>

                <Column 
                    field="groupName" 
                    header="Название группы"
                    filter
                    filterField="groupName"
                    :showFilterMenu="false"
                >
                    <template #filter="{ filterModel, filterCallback }">
                        <InputText
                            v-model="filterModel.value"
                            placeholder="Поиск по названию"
                            class=""
                            @input="filterCallback()"
                        />
                    </template>
                </Column>

                <Column 
                    header="Ответственный" 
                    filter
                    filterField="responsible"
                    :showFilterMenu="false"
                >
                    <template #body="{ data }">
                        <div v-if="data.user">
                            {{ data.user.lastName }} {{ data.user.firstName }} {{ data.user.middleName }}
                            <br>
                            <small class="text-secondary">{{ data.user.email }}</small>
                        </div>
                        <div v-else>-</div>
                    </template>

                    <template #filter="{ filterModel, filterCallback }">
                        <InputText
                            v-model="filterModel.value"
                            placeholder="ФИО или email"
                            @input="filterCallback()"
                        />
                    </template>
                </Column>

                <Column header="Статус пользователя">
                    <template #body="{ data }">
                        <Tag 
                            v-if="data.user"
                            :icon="data.user.isBlocked ? 'pi pi-times' : 'pi pi-check'" 
                            :severity="data.user.isBlocked ? 'danger' : 'success'" 
                            :value="data.user.isBlocked ? 'Заблокирован' : 'Активен'"
                        />
                        <span v-else>-</span>
                    </template>
                </Column>
                <Column header="Роли">
                    <template #body="{ data }">
                        <Chips 
                            v-if="data.user && data.user.roles.length"
                            :model-value="data.user.roles.map(r => r.title)"
                            readonly
                        />
                        <span v-else>-</span>
                    </template>
                </Column>
                <Column header="">
                    <template #body="{ data }">
                        <DeleteResponsibleGroup :group="data" @deleted="loadGroups" />
                    </template>
                </Column>

                <template #paginatorstart>
                    <div>Всего записей: {{ groupList.length }}</div>
                </template>

                <template #paginatorend>
                    <div class="d-flex align-items-center">
                        <span>Показать</span>
                        <Select 
                            v-model="rowsPerPage"
                            :options="rowsPerPageOptions"
                            optionLabel="label"
                            optionValue="value"
                            class="search mx-1 px-1"
                        />
                        <span>строк</span>
                    </div>
                </template>

            </DataTable>
            <div v-else key="responsible-skeleton" class="table-skeleton">
                <Skeleton width="15rem" height="2rem" class="mb-4" />
                <Skeleton width="100%" height="3rem" class="mb-3" />
                <Skeleton width="100%" height="3rem" class="mb-2" />
                <Skeleton width="100%" height="3rem" class="mb-2" />
                <Skeleton width="100%" height="3rem" class="mb-2" />
                <Skeleton width="100%" height="3rem" class="mb-2" />
            </div>
            </Transition>
        </div>
    </main>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axiosInstance from "@/utils/axios";
import DeleteResponsibleGroup from "@/components/ResponsibleTicketStudentGroup/DeleteResponsibleGroup.vue";
import AddResponsibleGroup from "@/components/ResponsibleTicketStudentGroup/AddResponsibleGroup.vue";
import { FilterMatchMode } from '@primevue/core/api';

const loading = ref(true);
const groupList = ref([]);
const first = ref(0);
const rowsPerPage = ref(5);

const filters = ref({
    groupName: { value: null, matchMode: FilterMatchMode.CONTAINS },
    responsible: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

const rowsPerPageOptions = [
    { label: '5', value: 5 },
    { label: '10', value: 10 },
    { label: '15', value: 15 },
];

const onPageChange = (event) => {
    first.value = event.first;
}

onMounted(() => {
    loadGroups(); 
});

const loadGroups = async () => {
    loading.value = true;
    try {
        const response = await axiosInstance.get('/api/responsibleticketstudentgroup');
        groupList.value = response.data.map(g => ({
            ...g,
            responsible: g.user
                ? `${g.user.lastName} ${g.user.firstName} ${g.user.middleName} ${g.user.email}`
                : '',
        }));
    } catch (error) {
        console.error('Ошибка при загрузке групп с ответственными: ', error);
        window.dispatchEvent(new CustomEvent('toast', {
            detail: {
                severity: 'error',
                summary: 'Группы',
                detail: `Ошибка при загрузке данных`,
            }
        }));
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
main {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100vh;
    box-sizing: border-box;
    color: var(--p-text-color);
}
.header {
    padding: 20px 8rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.content-wrapper {
    height: 100%;
    padding: 10px 2rem;
}

:deep(.no-row-hover .p-datatable-tbody > tr:hover),
:deep(.no-row-hover .p-datatable-tbody > tr.p-row-hover),
:deep(.no-row-hover.p-datatable-hoverable-rows .p-datatable-tbody > tr:hover) {
    background: transparent !important;
}
.table-skeleton {
    width: 100%;
}
</style>
