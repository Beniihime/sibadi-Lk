<template>
    <div class="schedule-details-container">

        <div v-if="showHint" class="hint-message">
            Пожалуйста, выберите диапазон дат.
        </div>

        <header class="schedule-header">
            <div class="header-row justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <Button icon="pi pi-arrow-left" size="small" rounded @click="goBack" />
                    <span class="fs-3 ms-4">Расписание</span>
                </div>
                
                <Transition name="content-fade" mode="out-in">
                    <div key="schedule-teach-refresh-content" class="refresh-time" v-if="!isLoading">
                        <span>Дата обновления: </span>
                        <span>{{ formatDate(scheduleData?.dateUploadingRasp) }}</span>
                    </div>
                    <Skeleton key="schedule-teach-refresh-skeleton" v-else width="300px" height="2.5rem"></Skeleton>
                </Transition>
            </div>
            <div class="header-row justify-content-between">
                <div class="search-header-card">
                    <IconField class="searchBar">
                        <InputIcon class="pi pi-search" />
                        <InputText id="search" name="search" placeholder="Поиск..." class="search" v-model="searchQuery" />
                    </IconField>
                </div>
            </div>

            <div class="header-row">
                <div class="header-card" v-for="(_, index) in 4" :key="index">
                    <Transition name="content-fade" mode="out-in">
                        <Skeleton key="schedule-teach-card-skeleton" v-if="isLoading" width="100%" height="3rem" />
                        <div key="schedule-teach-card-content" v-else>
                            <div class="card-title">{{ headerTitles[index] }}</div>
                            <div class="card-value">{{ headerValues[index] }}</div>
                        </div>
                    </Transition>
                </div>
            </div>

            <div class="header-row">
                <div class="header-card date-picker">
                    <DatePicker v-if="showFullSchedule" v-model="selectedDateRange" selectionMode="range" :minDate="minDate" :maxDate="maxDate" :disabledDates="disabledDates" :showOtherMonths="false"
                        showIcon variant="filled" iconDisplay="input" dateFormat="dd.mm.yy" @update:modelValue="fetchScheduleData" showButtonBar placeholder="Выберите диапазон" :manualInput="false">
                        <template #date="slotProps">
                            <div class="date-wrapper">
                                <span :class="{ 'with-circle': isDateAvailable(slotProps.date) }">
                                    {{ slotProps.date.day }}
                                </span>
                            </div>
                        </template>
                    </DatePicker>
                    <DatePicker v-else v-model="selectedDate" :minDate="minDate" :maxDate="maxDate" :disabledDates="disabledDates" :showOtherMonths="false"
                        showIcon variant="filled" iconDisplay="input" dateFormat="dd.mm.yy" @update:modelValue="fetchScheduleData" showButtonBar placeholder="Выберите дату" :manualInput="false">
                        <template #date="slotProps">
                            <div class="date-wrapper">
                                <span :class="{ 'with-circle': isDateAvailable(slotProps.date) }">
                                    {{ slotProps.date.day }}
                                </span>
                            </div>
                        </template>
                    </DatePicker>
                </div>
                <div class="header-card">
                    <span class="card-title">Тип недели</span>
                    <span class="card-value">{{ weekFullName }}</span>
                </div>
            </div>
            <Button @click="toggleScheduleMode" class="p-button-text">
                {{ showFullSchedule ? "Расписание на неделю" : "Всё расписание" }}
            </Button>
        </header>

        <div v-if="Object.keys(groupedLessons).length > 0" class="schedule-list">
            <div v-for="(lessons, date) in groupedLessons" :key="date" class="_per-day-container">
                <div class="day-container">
                    <h4 class="day-title">{{ getDayOfWeek(date) }}</h4>
                    <span>{{ formatDate(date) }}</span>
                </div>
                
                <div v-for="lesson in lessons" :key="lesson.код" class="lesson-card">
                    <div class="lesson-header">
                        <span class="lesson-number" :style="{ 'background-color': `var(--p-${cleanDiscipline(lesson.дисциплина).color}-500)` }">{{ lesson?.номерЗанятия }}</span>
                        <span class="time">{{ lesson.начало.replace("-", ":") }} <span class="lesson-second_plan"> - {{ lesson.конец.replace("-", ":") }}</span></span>
                        <div class="other-schedule">
                            <Button size="small" icon="pi pi-ellipsis-v" variant="text" rounded class="me-3" @click="toggle(lesson.код, $event)" />
                            <Popover :ref="(el) => setPopoverRef(el, lesson.код)">
                                <div class="other-schedule-buttons">
                                    <Button 
                                        v-for="group in lesson.группа.split(',')" 
                                        :key="group" 
                                        text 
                                        @click="ScheduleGroup(lesson, group)"
                                    >
                                        Расписание {{ group.trim() }}
                                    </Button>
                                    <Button text @click="ScheduleAud(lesson)">
                                        Расписание {{ lesson?.аудитория }}
                                    </Button>
                                </div>
                            </Popover>
                        </div>
                        
                    </div>
                    <div class="lesson-content">
                        <h3 class="lesson-title">{{ cleanDiscipline(lesson.дисциплина).cleanedDiscipline }}</h3>
                        <div class="lesson-type">{{ cleanDiscipline(lesson.дисциплина).type }}</div>
                        <p class="lesson-teacher lesson-second_plan">{{ lesson.преподаватель }}</p>
                        <p class="room lesson-second_plan">{{ lesson.группа }}</p>
                        <p class="room lesson-second_plan">{{ lesson.аудитория }}</p>
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="empty-message">
            <p>Нет занятий на выбранную дату</p>
        </div>

    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { useGroupsStore } from '@/stores/groups';
import { saveScheduleSelection, SCHEDULE_TYPE_GROUP, SCHEDULE_TYPE_ROOM, SCHEDULE_TYPE_TEACHER } from '@/utils/scheduleStorage.js';

import { formatDateRuLong as formatDate, formatRuWeekdayCapitalized } from "@/utils/date.js";

const route = useRoute();
const router = useRouter();
const idTeacher = route.params.idTeacher;
const teacherName = ref("");
const showFullSchedule = ref(false);

const selectedDate = ref(null);
const selectedDateRange = ref();
const minDate = ref(null);
const maxDate = ref(null);
const availableDates = ref([]);
const scheduleData = ref([]);
const filteredScheduleData = ref([]);
const scheduleRasp = ref([]);
const searchQuery = ref("");

const showHint = ref(false);

const isLoading = ref(false); 
const groupsStore = useGroupsStore();

const weekShortName = computed(() => {
    return scheduleData.value?.typesWeek?.find(t => t.typeWeekID === scheduleData.value?.curNumNed)?.shortName || '?';
});

const weekFullName = computed(() => {
    return scheduleData.value?.typesWeek?.find(t => t.typeWeekID === scheduleData.value?.selectedNumNed)?.name || 'Неизвестно';
});

const headerTitles = ["Преподаватель", "Учебный год", "Семестр", "Текущая неделя"];
const headerValues = computed(() => [
    scheduleData.value?.prepod?.name,
    scheduleData.value?.year,
    getSemesterName(scheduleData.value?.curSem).name,
    `${scheduleData.value?.curWeekNumber} (${weekShortName.value} нед.)`
]);

watch(teacherName, (newTeacherName) => {
    localStorage.setItem('teacherName', newTeacherName);
    document.title = `${newTeacherName} - Расписание`;
});

const getSemesterName = (semester) => {
    const semesters = {
        1: { name: "Осень" },
        2: { name: "Весна" }
    };
    return semesters[semester] || { name: "Неизвестно" };
};

const toggleScheduleMode = () => {
    showFullSchedule.value = !showFullSchedule.value;
    showHint.value = (!selectedDateRange.value || !selectedDateRange.value[0] || !selectedDateRange.value[1]) && showFullSchedule.value;
    fetchScheduleData();
};

// Получаем доступные даты из GetRaspDates
const fetchAvailableDates = async () => {
    try {
        const response = await axios.get(`https://umu.sibadi.org/api/GetRaspDates?idTeacher=${idTeacher}`);
        const data = response.data.data;

        minDate.value = new Date(data.minDate);
        maxDate.value = new Date(data.maxDate);
        
        availableDates.value = data.dates.map(date => new Date(date));

        // Устанавливаем текущую дату или ближайшую доступную
        selectedDate.value = new Date(data.selDate);

        fetchScheduleData();
    } catch (error) {
        console.error("Ошибка загрузки дат:", error);
    }
};

// Загружаем расписание на выбранную дату
const fetchScheduleData = async () => {
    if (!idTeacher || !selectedDate.value) return;

    isLoading.value = true;

    const formattedDate = selectedDate.value.toISOString().split("T")[0];
    const sdateParam = showFullSchedule.value ? "" : `&sdate=${formattedDate}`;

    try {
        const response = await axios.get(`https://umu.sibadi.org/api/Rasp?idTeacher=${idTeacher}${sdateParam}`);
        scheduleData.value = response.data.data.info;
        
        teacherName.value = scheduleData.value?.prepod?.name;
        saveScheduleSelection({
            type: SCHEDULE_TYPE_TEACHER,
            id: idTeacher,
            name: scheduleData.value?.prepod?.name,
            setAsLast: true
        });

        scheduleRasp.value = response.data.data.rasp;

        if (showFullSchedule.value && selectedDateRange.value && selectedDateRange.value[0] && selectedDateRange.value[1]) {
            filteredScheduleData.value = scheduleRasp.value.filter(lesson => {
                const entryDate = new Date(lesson.дата).setHours(0, 0, 0, 0);
                return entryDate >= selectedDateRange.value[0].setHours(0, 0, 0, 0) && entryDate <= selectedDateRange.value[1].setHours(0, 0, 0, 0);
            });
        } else if (!showFullSchedule.value && selectedDate.value) {
            filteredScheduleData.value = scheduleRasp.value.filter(lesson => {
                const entryDate = new Date(lesson.дата).setHours(0, 0, 0, 0);
                return entryDate >= selectedDate.value.setHours(0, 0, 0, 0);
            });
        } else {
            filteredScheduleData.value = scheduleRasp.value;
        }
        
    } catch (error) {
        console.error("Ошибка загрузки расписания:", error);
    } finally {
        isLoading.value = false;
    }
};

const filteredLessons = computed(() => {
    if (!searchQuery.value) return filteredScheduleData.value;
    return filteredScheduleData.value.filter(lesson => {
        return cleanDiscipline(lesson.дисциплина).cleanedDiscipline.toLowerCase().includes(searchQuery.value.toLowerCase());
    });
});

// Групировка занятий по дням недели
const groupedLessons = computed(() => {
    const grouped = {};
    filteredLessons.value.forEach(lesson => {
        const date = lesson.дата;
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(lesson);
    });
    return grouped;
});

const getDayOfWeek = (dateString) => {
    return formatRuWeekdayCapitalized(dateString, '');
};

const isDateAvailable = (dateObj) => {
    if (!Array.isArray(availableDates.value)) {
        console.error("availableDates is not an array:", availableDates.value);
        return false;
    }
    
    const date = new Date(dateObj.year, dateObj.month, dateObj.day);
    return availableDates.value.some(d => d.toDateString() === date.toDateString());
};

// Очистка названия дисциплины от "лек.", "лаб.", "пр."
const cleanDiscipline = (discipline) => {
    const match = discipline.match(/^(лек|лаб|пр|экз|зач)\s*/i, '');
    let type = "";
    let color = "";
    if (match) {
        const typeAbbr = match[1].toLowerCase();
        switch (typeAbbr) {
            case "лек":
                type = "Лекция";
                color = "green";
                break;
            case "лаб":
                type = "Лабораторная";
                color = "purple";
                break;
            case "пр":
                type = "Практика";
                color = "amber";
                break;
            case "экз":
                type = "Экзамен";
                color = "sky";
                break;
            case "зач":
                type = "Зачет";
                color = "sky";
                break;
            default:
                type = "";
        }
    }
    return {
        cleanedDiscipline: discipline.replace(/^(лек|лаб|пр.|экз|зач)\s*/i, ''),
        type,
        color
    };
};

const popovers = ref([]);

const setPopoverRef = (el, index) => {
    popovers.value[index] = el;
};

const toggle = (index, event) => {
    console.debug(popovers.value[index])
    popovers.value[index]?.toggle(event);
};

const ScheduleAud = (lesson) => {
    saveScheduleSelection({
        type: SCHEDULE_TYPE_ROOM,
        id: lesson.код,
        name: lesson.аудитория,
        setAsLast: true
    });
    router.push(`/schedule/room/${lesson.код}`)
}

const ScheduleGroup = (lesson, group) => {
    const groupData = groupsStore.groups.find(g => g.name === group.trim());
    if (!groupData?.id) return;

    saveScheduleSelection({
        type: SCHEDULE_TYPE_GROUP,
        id: groupData.id,
        name: groupData.name,
        setAsLast: true
    });

    router.push(`/schedule/group/${groupData.id}`)
}

// Отключенные даты (которые отсутствуют в массиве `availableDates`)
const disabledDates = computed(() => {
    const allDates = new Set(availableDates.value.map(d => d.toDateString()));
    const range = [];
    let current = new Date(minDate.value);
    while (current <= maxDate.value) {
        if (!allDates.has(current.toDateString())) {
            range.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }
    return range;
});

const goBack = () => {
    router.back();
};

onMounted(() => {
    fetchAvailableDates();
});
</script>

<style scoped>
h4 {
    margin: 0;
}
.schedule-details-container {
    padding: 20px 6rem;
    margin: auto;
    color: var(--p-text-color);
    transition: all 0.5s;
}
.schedule-header {
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 30px;
}
.header-row {
    display: flex;
    gap: 20px;
}
.refresh-time {
    border-radius: 12px;
    padding: 8px 14px;
    background-color: var(--p-grey-7);
    transition: all 0.5s;
}
.search-header-card {
    width: 100%;
}
.header-card {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    background: var(--p-grey-7);
    transition: all 0.5s;
}
.card-title {
    font-size: 0.9rem;
    color: #bbb;
}
.card-value {
    font-size: 1.2rem;
    font-weight: bold;
    transition: all 0.5s;
}
.date-picker {
    display: flex;
    justify-content: center;
}
.schedule-list {
    margin-top: 10px;
}
._per-day-container {
    margin-bottom: 26px;
}
.day-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding: 12px 18px;
    border-radius: 12px;
    color: #fff;
    background-color: var(--p-primary-color);
}
.lesson-card {
    margin-bottom: 12px;
    background: var(--p-grey-7);
    border-radius: 12px;
    padding: 16px 0px;
    border: solid 2px var(--p-grey-4);
    transition: all 0.5s;
}
.time {
    font-size: 1.15rem;
}
.lesson-header {
    display: flex;
    gap: 12px;
    align-items: center;
    font-weight: 600;
    margin-bottom: 4px;
    position: relative;
}
.other-schedule {
    position: absolute;
    right: 0;
    top: 0;
}
.other-schedule-buttons {
    display: grid;
    gap: 10px;
}
.lesson-number {
    color: #fff;
    padding: 1px 14px;
    border-top-right-radius: 12px;
    border-bottom-right-radius: 12px;
    transition: all 0.5s;
}
.lesson-content {
    margin-left: 40px;
}
.lesson-title {
    font-size: 1.4rem;
    color: var(--p-text-color);
    margin-bottom: 2px;
    transition: all 0.5s;
}
.lesson-type {
    font-size: 1.2rem;
}
.lesson-second_plan {
    color: var(--p-grey-1);
    transition: all 0.5s;
}
.lesson-teacher {
    font-size: 1rem;
    margin: 0;
}
.room {
    font-size: 1rem;
    margin: 0;
}
.empty-message {
    text-align: center;
    margin-top: 20px;
    font-size: 1.1rem;
    color: var(--p-text-secondary);
    transition: all 0.5s;
}
.search {
    border-radius: 12px;
    transition: all 0.5s;
    width: 100%; 
}
.date-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.with-circle {
    position: relative;
}

.with-circle::after {
    content: "";
    width: 6px;
    height: 6px;
    background-color: var(--p-green-500);
    border-radius: 50%;
    position: absolute;
    bottom: -3px;
    left: 50%;
    transform: translateX(-50%);
}
.hint-message {
    position: absolute;
    top: 20px;
    right: 50%;
    transform: translateX(50%);
    background: var(--p-blue-500);
    color: var(--p-text-color);
    padding: 10px 20px;
    border-radius: 12px;
    font-size: 14px;
    text-align: center;
    z-index: 1000;
    cursor: pointer;
    animation: fadeInOut 5s forwards;
}

@keyframes fadeInOut {
    0%, 80% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
}

@media (max-width: 768px) {
    .schedule-details-container {
        padding: 1rem var(--app-page-padding-x) calc(1rem + var(--app-mobile-bottom-offset));
    }
    .schedule-header {
        gap: 0.85rem;
        margin-bottom: 1.25rem;
    }
    .header-row {
        flex-wrap: wrap;
        gap: 0.6rem;
    }
    .header-card {
        flex: 1 1 calc(50% - 0.3rem);
        min-width: 0;
        padding: 0.65rem;
    }
    .refresh-time {
        font-size: 0.8rem;
    }
    .day-container {
        padding: 0.65rem 0.85rem;
    }
    .lesson-card {
        padding: 0.85rem 0;
    }
    .lesson-content {
        margin-left: 0.5rem;
        padding-right: 0.85rem;
    }
    .lesson-title {
        font-size: 1.1rem;
    }
    .lesson-type {
        font-size: 1rem;
    }
}

@media (max-width: 480px) {
    .header-card {
        flex: 1 1 100%;
    }
    .lesson-header {
        flex-wrap: wrap;
        gap: 0.5rem;
    }
}
</style>
