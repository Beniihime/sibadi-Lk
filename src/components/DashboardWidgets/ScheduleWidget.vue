<template>
    <div class="panel-card schedule-overview-card">
        <div class="panel-header">
            <div class="panel-header-main">
                <h3>Расписание</h3>
                <SelectButton
                    v-model="selectedScheduleType"
                    :options="scheduleModeOptions"
                    optionValue="value"
                    class="schedule-mode-switch"
                >
                    <template #option="{ option }">
                        <span class="schedule-mode-icon" :title="option.label">
                            <i :class="option.icon"></i>
                        </span>
                    </template>
                </SelectButton>
            </div>
            <router-link class="panel-header-action" to="/schedule" aria-label="Открыть расписание" v-tooltip.top="'Открыть расписание'">
                <i class="pi pi-arrow-up-right"></i>
            </router-link>
        </div>
        <div class="panel-content">
            <div v-if="scheduleSelection.name" class="schedule-current-target">
                {{ scheduleSelection.name }}
            </div>
            <Transition name="schedule-fade" mode="out-in">
                <div :key="scheduleViewState" class="schedule-state">
                    <div v-if="scheduleViewState === 'no-selection'" class="activity-item muted">
                        Выберите {{ selectedScheduleTargetLabel }} в расписании, чтобы отобразить
                    </div>
                    <div v-else-if="scheduleViewState === 'loading'" class="schedule-skeleton">
                        <Skeleton width="11rem" height="0.9rem" borderRadius="8px" />

                        <div v-for="item in 3" :key="`schedule-skeleton-${item}`" class="schedule-skeleton-item">
                            <div class="schedule-skeleton-badges">
                                <Skeleton width="7.2rem" height="1.65rem" borderRadius="999px" />
                                <Skeleton width="5.6rem" height="1.55rem" borderRadius="999px" />
                            </div>
                            <Skeleton width="92%" height="1rem" borderRadius="8px" />
                            <Skeleton width="5.4rem" height="1.55rem" borderRadius="999px" />
                        </div>
                    </div>
                    <div v-else-if="scheduleViewState === 'empty'" class="activity-item muted">
                        Ближайших занятий нет
                    </div>
                    <div v-else class="schedule-mini">
                        <div class="schedule-mini-date">Ближайшая дата: {{ scheduleDateLabel }}</div>
                        <div v-for="lesson in todayLessons" :key="lesson.key" class="schedule-mini-item">
                            <div class="schedule-badges">
                                <span class="schedule-time badge">{{ lesson.time }}</span>
                                <span
                                    v-if="lesson.type"
                                    class="schedule-type badge"
                                    :style="{ '--type-color': `var(--p-${lesson.typeColor}-500)` }"
                                >
                                    {{ lesson.type }}
                                </span>
                            </div>
                            <span class="schedule-title">{{ lesson.title }}</span>
                            <span class="schedule-room badge" v-if="lesson.room">{{ lesson.room }}</span>
                        </div>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import axios from 'axios';
import {
    buildSchedulePath,
    getLastScheduleSelection,
    getScheduleSelectionByType,
    normalizeScheduleType,
    SCHEDULE_TYPE_GROUP,
    SCHEDULE_TYPE_ROOM,
    SCHEDULE_TYPE_TEACHER
} from '@/utils/scheduleStorage.js';

const DASHBOARD_SCHEDULE_TYPE_KEY = 'dashboardScheduleType';

const todayLessons = ref([]);
const scheduleDateLabel = ref('');
const isScheduleLoading = ref(false);
let scheduleRequestId = 0;

const scheduleModeOptions = [
    { label: 'Группа', value: SCHEDULE_TYPE_GROUP, icon: 'pi pi-users' },
    { label: 'Аудитория', value: SCHEDULE_TYPE_ROOM, icon: 'pi pi-building' },
    { label: 'Преподаватель', value: SCHEDULE_TYPE_TEACHER, icon: 'pi pi-user' }
];

const lastSchedule = getLastScheduleSelection();
const savedDashboardType = localStorage.getItem(DASHBOARD_SCHEDULE_TYPE_KEY);
const selectedScheduleType = ref(normalizeScheduleType(lastSchedule.type || savedDashboardType));
const scheduleSelection = ref(getScheduleSelectionByType(selectedScheduleType.value));

const selectedScheduleTargetLabel = computed(() => ({
    [SCHEDULE_TYPE_GROUP]: 'группу',
    [SCHEDULE_TYPE_ROOM]: 'аудиторию',
    [SCHEDULE_TYPE_TEACHER]: 'преподавателя',
}[selectedScheduleType.value] || 'группу'));

const scheduleViewState = computed(() => {
    if (!scheduleSelection.value.id) return 'no-selection';
    if (isScheduleLoading.value) return 'loading';
    if (todayLessons.value.length === 0) return 'empty';
    return 'content';
});

// eslint-disable-next-line no-unused-vars
const openScheduleLink = computed(() => buildSchedulePath(selectedScheduleType.value, scheduleSelection.value.id));

const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getScheduleParamName = (type) => {
    if (type === SCHEDULE_TYPE_ROOM) return 'idAudLine';
    if (type === SCHEDULE_TYPE_TEACHER) return 'idTeacher';
    return 'idGroup';
};

const fetchScheduleForDate = async (date) => {
    if (!scheduleSelection.value.id) return [];

    try {
        const formattedDate = formatLocalDate(date);
        const paramName = getScheduleParamName(selectedScheduleType.value);
        const response = await axios.get(
            `https://umu.sibadi.org/api/Rasp?${paramName}=${scheduleSelection.value.id}&sdate=${formattedDate}`
        );
        const lessons = response.data?.data?.rasp || [];
        return lessons.filter((lesson) => {
            if (!lesson?.дата) return false;
            const lessonDate = new Date(lesson.дата);
            return formatLocalDate(lessonDate) === formattedDate;
        });
    } catch (error) {
        return [];
    }
};

const cleanDiscipline = (discipline) => {
    const match = discipline?.match(/^(лек|лаб|пр|экз|зач)\s*/i, '');
    let type = '';
    let color = 'blue';
    if (match) {
        const typeAbbr = match[1].toLowerCase();
        switch (typeAbbr) {
            case 'лек':
                type = 'Лекция';
                color = 'green';
                break;
            case 'лаб':
                type = 'Лабораторная';
                color = 'purple';
                break;
            case 'пр':
                type = 'Практика';
                color = 'amber';
                break;
            case 'экз':
                type = 'Экзамен';
                color = 'sky';
                break;
            case 'зач':
                type = 'Зачет';
                color = 'sky';
                break;
            default:
                type = '';
        }
    }
    return {
        cleanedDiscipline: discipline?.replace(/^(лек|лаб|пр.|экз|зач)\s*/i, '') || discipline,
        type,
        color
    };
};

const setScheduleLessons = (lessons, date) => {
    const mapRoom = (lesson) => {
        if (selectedScheduleType.value === SCHEDULE_TYPE_GROUP) return lesson.аудитория;
        if (selectedScheduleType.value === SCHEDULE_TYPE_ROOM) return lesson.группа;
        return lesson.аудитория || lesson.группа;
    };

    todayLessons.value = lessons.slice(0, 4).map((lesson, index) => ({
        key: lesson.код || index,
        time: `${lesson.начало.replace('-', ':')} - ${lesson.конец.replace('-', ':')}`,
        title: cleanDiscipline(lesson.дисциплина).cleanedDiscipline,
        type: cleanDiscipline(lesson.дисциплина).type,
        typeColor: cleanDiscipline(lesson.дисциплина).color,
        room: mapRoom(lesson)
    }));
    scheduleDateLabel.value = date.toLocaleDateString('ru-RU', {
        weekday: 'short',
        day: '2-digit',
        month: 'long'
    });
};

const fetchNearestSchedule = async () => {
    const requestId = ++scheduleRequestId;

    if (!scheduleSelection.value.id) {
        isScheduleLoading.value = false;
        todayLessons.value = [];
        scheduleDateLabel.value = '';
        return;
    }

    isScheduleLoading.value = true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        for (let offset = 0; offset <= 7; offset += 1) {
            if (requestId !== scheduleRequestId) return;

            const date = new Date(today);
            date.setDate(today.getDate() + offset);
            const lessons = await fetchScheduleForDate(date);

            if (requestId !== scheduleRequestId) return;

            if (lessons.length > 0) {
                setScheduleLessons(lessons, date);
                return;
            }
        }

        todayLessons.value = [];
        scheduleDateLabel.value = '';
    } finally {
        if (requestId === scheduleRequestId) {
            isScheduleLoading.value = false;
        }
    }
};

watch(selectedScheduleType, (newType) => {
    localStorage.setItem(DASHBOARD_SCHEDULE_TYPE_KEY, newType);
    scheduleSelection.value = getScheduleSelectionByType(newType);
    fetchNearestSchedule();
});

onMounted(() => {
    scheduleSelection.value = getScheduleSelectionByType(selectedScheduleType.value);
    fetchNearestSchedule();
});
</script>

<style scoped src="./dashboardWidget.css"></style>