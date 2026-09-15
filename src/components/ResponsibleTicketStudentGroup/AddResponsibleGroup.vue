<template>
    <div>
        <Button icon="pi pi-plus" @click="showAddDialog = true" />

        <Dialog 
            v-model:visible="showAddDialog" 
            modal 
            header="Новая связь группы и ответственного" 
            :style="{ 'width' : '30rem' }"
            @show="loadInitialData"
        >
            <form @submit.prevent="submitGroup" class="d-flex flex-column gap-3">
                <!-- Выбор года -->
                <div>
                    <label for="yearSelect" class="block mb-2">Учебный год</label>
                    <Dropdown
                        v-model="selectedYear"
                        :options="yearOptions"
                        optionLabel="label"
                        optionValue="label"
                        placeholder="Выберите год"
                        class="w-100"
                        @change="onYearChange"
                        :disabled="loadingGroups"
                    />
                </div>

                <!-- Autocomplete для групп -->
                <div>
                    <label for="groupSelect" class="block mb-2">Группа</label>
                    <AutoComplete
                        v-model="selectedGroup"
                        :suggestions="filteredGroups"
                        optionLabel="label"
                        field="label"
                        placeholder="Начните вводить название группы..."
                        @complete="searchGroups"
                        class="w-100"
                        :disabled="!selectedYear || loadingGroups"
                        :loading="loadingGroups"
                    />
                    
                    <small v-if="!selectedGroup" class="text-danger block mt-1">
                        Выберите группу
                    </small>
                </div>

                <!-- Autocomplete для пользователя -->
                <div>
                    <label for="userSelect" class="block mb-2">Ответственный пользователь</label>
                    <AutoComplete
                        v-model="selectedUser"
                        :suggestions="filteredUsers"
                        optionLabel="fullName"
                        field="fullName"
                        placeholder="Начните вводить ФИО..."
                        @complete="searchUsers"
                        class="w-100"
                        :disabled="loadingUsers"
                    />
                    
                    <small v-if="!selectedUser" class="text-danger block mt-1">
                        Выберите ответственного пользователя
                    </small>
                </div>
                
                <div class="d-flex justify-content-end gap-2 mt-3">
                    <Button 
                        label="Отмена" 
                        severity="secondary" 
                        outlined 
                        @click="closeDialog" 
                    />
                    <Button 
                        label="Сохранить" 
                        type="submit" 
                        severity="success" 
                        :disabled="!selectedGroup || !selectedUser"
                        :loading="submitting"
                    />
                </div>
            </form>
        </Dialog>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { debounce } from 'lodash';
import axiosInstance from '@/utils/axios';

const showAddDialog = ref(false);
const emit = defineEmits(['added']);

const newGroup = ref({
    groupName: '',
    userId: ''
});

// Годы
const now = new Date();
const currentCalendarYear = now.getFullYear();

const currentStudyYear = now.getMonth() >= 8 
    ? currentCalendarYear 
    : currentCalendarYear - 1;

const selectedYear = ref(`${currentStudyYear}-${currentStudyYear + 1}`);

const yearOptions = computed(() => {
    const years = [];
    for (let i = -3; i <= 2; i++) {
        const start = currentStudyYear + i;
        years.push({
            label: `${start}-${start + 1}`,
            value: `${start}-${start + 1}`
        });
    }
    return years;
});

// Группы
const selectedGroup = ref(null);
const filteredGroups = ref([]);
const loadingGroups = ref(false);

// Пользователи
const selectedUser = ref(null);
const filteredUsers = ref([]);
const loadingUsers = ref(false);
const submitting = ref(false);

// Сброс состояния при открытии диалога (группы не предзагружаем —
// поиск идёт на сервере после того, как пользователь введёт запрос).
const loadInitialData = () => {
    selectedGroup.value = null;
    filteredGroups.value = [];
};

// Функция для извлечения кода группы из названия
const extractGroupCode = (groupName) => {
    if (!groupName) return '';
    const match = groupName.match(/([А-Яа-яA-Za-z]+)[-\s]*(\d+)[-\s]*(\d+)?/);
    if (match) {
        return match[0];
    }
    return '';
};

// Серверный поиск групп с дебаунсом (gRPC DeaneryService.GetGroups
// с фильтром по году и названию, include = AcademicYear).
const debouncedSearchGroups = debounce(async (query) => {
    if (!selectedYear.value) {
        filteredGroups.value = [];
        return;
    }

    const yearStart = parseInt(selectedYear.value, 10);

    try {
        const { data } = await axiosInstance.get('/api/umu/groups', {
            params: { year: yearStart, name: query }
        });

        filteredGroups.value = (data || []).map(group => ({
            label: group.name,
            value: group.id,
            code: extractGroupCode(group.name)
        }));
    } catch (error) {
        console.debug("Ошибка при поиске групп: ", error);
        window.dispatchEvent(new CustomEvent('toast', {
            detail: {
                severity: 'error',
                summary: 'Ошибка',
                detail: 'Не удалось выполнить поиск групп',
            }
        }));
        filteredGroups.value = [];
    } finally {
        loadingGroups.value = false;
    }
}, 300);

// Поиск групп
const searchGroups = (event) => {
    const query = (event.query || '').trim();

    if (!query) {
        filteredGroups.value = [];
        return;
    }

    loadingGroups.value = true;
    debouncedSearchGroups(query);
};

// Обработчик изменения года
const onYearChange = () => {
    selectedGroup.value = null;
    filteredGroups.value = [];
};

// Серверный поиск пользователей с дебаунсом.
// Введённая строка разбивается на токены и раскладывается по полям
// так же, как раздельные фильтры на странице пользователей:
// 1-й токен → фамилия, 2-й → имя, 3-й → отчество, токен с "@" → e-mail.
const debouncedSearchUsers = debounce(async (query) => {
    const tokens = query.split(/\s+/).filter(Boolean);

    const payload = {
        page: 1,
        pageSize: 20,
        isBlocked: false,
        lastName: tokens[0] ?? null,
        firstName: tokens[1] ?? null,
        middleName: tokens[2] ?? null,
        email: tokens.find(t => t.includes('@')) ?? null,
        roleIds: null
    };

    try {
        const { data } = await axiosInstance.post('/api/users/list', payload);

        filteredUsers.value = (data.entities || []).map(user => ({
            id: user.id,
            fullName: `${user.lastName} ${user.firstName} ${user.middleName || ''}`.trim(),
            email: user.email
        }));
    } catch (error) {
        console.debug("Ошибка при поиске пользователей: ", error);
        window.dispatchEvent(new CustomEvent('toast', {
            detail: {
                severity: 'error',
                summary: 'Ошибка',
                detail: 'Не удалось выполнить поиск пользователей',
            }
        }));
        filteredUsers.value = [];
    } finally {
        loadingUsers.value = false;
    }
}, 300);

// Поиск пользователей
const searchUsers = (event) => {
    const query = (event.query || '').trim();

    if (!query) {
        filteredUsers.value = [];
        return;
    }

    loadingUsers.value = true;
    debouncedSearchUsers(query);
};

// Сброс формы
const resetForm = () => {
    selectedGroup.value = null;
    selectedUser.value = null;
    filteredGroups.value = [];
    submitting.value = false;
};

// Закрытие диалога
const closeDialog = () => {
    showAddDialog.value = false;
    resetForm();
};

// Отслеживаем выбранные значения
watch(selectedGroup, (group) => {
    newGroup.value.groupName = group?.label || '';
});

watch(selectedUser, (user) => {
    newGroup.value.userId = user?.id || '';
});

const submitGroup = async () => {
    if (!selectedGroup.value || !selectedUser.value) {
        window.dispatchEvent(new CustomEvent('toast', {
            detail: { 
                severity: 'warn', 
                summary: 'Предупреждение', 
                detail: 'Заполните все обязательные поля',
            }
        }));
        return;
    }

    submitting.value = true;
    
    try {
        const payload = { 
            groupName: newGroup.value.groupName,
            userId: newGroup.value.userId
        };
        
        await axiosInstance.post('/api/responsibleticketstudentgroup', payload);
        
        emit('added');
        showAddDialog.value = false;
        
        window.dispatchEvent(new CustomEvent('toast', {
            detail: { 
                severity: 'success', 
                summary: 'Группы', 
                detail: 'Связь успешно добавлена',
            }
        }));
    } catch (error) {
        console.debug("Ошибка при сохранении связи: ", error);
        window.dispatchEvent(new CustomEvent('toast', {
            detail: { 
                severity: 'error', 
                summary: 'Группы', 
                detail: `Ошибка при сохранении связи: ${error.response?.data?.message || error.message}`,
            }
        }));
    } finally {
        submitting.value = false;
        resetForm();
    }   
}
</script>

<style scoped>

</style>