<template>
    <div class="panel-card">
        <div class="panel-header">
            <div class="panel-header-main">
                <h3>Зачётка</h3>
                <span v-if="semesterLabel" class="gradebook-subtitle">{{ semesterLabel }}</span>
            </div>
            <router-link
                class="panel-header-action"
                to="/electronic-record-book"
                aria-label="Открыть зачётку"
                v-tooltip.top="'Открыть зачётку'"
            >
                <i class="pi pi-arrow-up-right"></i>
            </router-link>
        </div>
        <div class="panel-content">
            <div v-if="loading" class="schedule-skeleton">
                <Skeleton v-for="item in 3" :key="`gradebook-skeleton-${item}`" width="100%" height="2.4rem" borderRadius="10px" />
            </div>
            <AsyncState
                v-else-if="error"
                tone="error"
                icon="pi pi-exclamation-triangle"
                title="Не удалось загрузить зачётку"
                description="Проверьте соединение и попробуйте ещё раз."
                retry
                @retry="fetchGrades"
            />
            <div v-else-if="!grades.length" class="activity-item muted">
                Оценок за текущий семестр пока нет
            </div>
            <div v-else class="gradebook-list">
                <div v-for="item in grades" :key="item.vedomostId || item.discipline" class="gradebook-row">
                    <span class="gradebook-discipline" :title="item.discipline">{{ item.discipline || 'Без названия' }}</span>
                    <span
                        v-if="gradeText(item.gradeValue)"
                        class="gradebook-grade"
                        :class="{ 'gradebook-grade--empty': isEmptyGrade(item.gradeValue) }"
                    >{{ gradeText(item.gradeValue) }}</span>
                    <span v-else class="gradebook-grade gradebook-grade--none">—</span>
                </div>
                <router-link to="/electronic-record-book" class="gradebook-link">
                    <span>Открыть зачётку</span>
                    <i class="pi pi-arrow-right"></i>
                </router-link>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import AsyncState from '@/components/Utils/AsyncState.vue';
import { getMyUmuGroups, getMyUmuGrades } from '@/api/umu.js';

const loading = ref(false);
const error = ref(false);
const gradesData = ref(null);

const grades = computed(() => gradesData.value?.grades || []);

const semesterLabel = computed(() => {
    if (!gradesData.value) return '';
    const sem = gradesData.value.currentSemester;
    const year = gradesData.value.currentYear;
    const semPart = sem ? `Семестр ${sem}` : 'Текущий семестр';
    return year ? `${semPart} · ${year}` : semPart;
});

const gradeText = (gradeValue) => {
    if (!gradeValue) return '';
    return gradeValue.shortText || gradeValue.text || '';
};

const isEmptyGrade = (gradeValue) => {
    const text = gradeText(gradeValue);
    return !text || text === '0' || /^(не\s*сдан|не\s*зач|н\/д)$/i.test(text);
};

const fetchGrades = async () => {
    loading.value = true;
    error.value = false;
    try {
        const groupsResponse = await getMyUmuGroups();
        const groups = Array.isArray(groupsResponse.data) ? groupsResponse.data : [];
        if (!groups.length) {
            gradesData.value = null;
            return;
        }

        // По умолчанию — запись с наибольшим studentId (самая свежая),
        // как на странице «Электронная зачётка».
        const defaultGroup = groups.reduce((max, g) => (
            (g?.studentId ?? -Infinity) > (max?.studentId ?? -Infinity) ? g : max
        ));

        const gradesResponse = await getMyUmuGrades({
            studentId: defaultGroup.studentId,
            latestSemester: true,
        });

        gradesData.value = Array.isArray(gradesResponse.data) ? (gradesResponse.data[0] ?? null) : null;
    } catch (e) {
        console.debug('Ошибка при загрузке зачётки:', e);
        error.value = true;
        gradesData.value = null;
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchGrades();
});
</script>

<style scoped src="./dashboardWidget.css"></style>

<style scoped>
.gradebook-subtitle {
    font-size: 0.78rem;
    color: var(--p-grey-2);
    white-space: nowrap;
}
.gradebook-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.gradebook-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border: 1px solid rgba(var(--p-primary-500-rgb), 0.14);
    border-radius: 12px;
    transition: background-color 0.2s ease, border-color 0.2s ease;
}
.gradebook-row:hover {
    background: rgba(var(--p-primary-500-rgb), 0.06);
    border-color: rgba(var(--p-primary-500-rgb), 0.26);
}
.gradebook-discipline {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--p-text-color);
    font-weight: 600;
}
.gradebook-grade {
    flex: 0 0 auto;
    font-weight: 700;
    color: var(--p-primary-color);
    background: rgba(var(--p-primary-500-rgb), 0.12);
    border: 1px solid rgba(var(--p-primary-500-rgb), 0.2);
    padding: 4px 10px;
    border-radius: 999px;
    white-space: nowrap;
}
.gradebook-grade--empty {
    color: var(--p-text-muted-color, var(--p-grey-2));
    background: transparent;
    border-color: rgba(var(--p-primary-500-rgb), 0.14);
}
.gradebook-grade--none {
    color: var(--p-text-muted-color, var(--p-grey-2));
    background: transparent;
    border: none;
    padding: 4px 8px;
}
.gradebook-link {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 0.4rem;
    margin-top: 0.2rem;
    padding: 0.45rem 0.8rem;
    border-radius: 0.72rem;
    border: 1px solid color-mix(in srgb, var(--p-primary-color) 18%, transparent);
    background: color-mix(in srgb, var(--p-primary-color) 8%, transparent);
    color: var(--p-primary-color);
    font-weight: 700;
    font-size: 0.82rem;
    text-decoration: none;
    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}
.gradebook-link:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--p-primary-color) 36%, transparent);
    background: color-mix(in srgb, var(--p-primary-color) 16%, transparent);
}
.gradebook-link .pi {
    font-size: 0.78rem;
    transition: transform 0.2s ease;
}
.gradebook-link:hover .pi {
    transform: translateX(3px);
}
</style>