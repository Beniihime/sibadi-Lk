<template>
    <main class="cup-page">
        <section class="cup-shell">
            <header class="cup-header">
                <div class="cup-copy">
                    <Tag rounded severity="info">Портфолио</Tag>
                    <h2>Учебный план</h2>
                    <p v-if="selectedGroup">
                        {{ selectedGroup.groupName || 'Группа не указана'
                            }}{{ selectedGroup.course ? ` · ${selectedGroup.course} курс` : ''
                            }}{{ selectedGroup.specialtyCode ? ` · ${selectedGroup.specialtyCode}${selectedGroup.specialtyName ? ` ${selectedGroup.specialtyName}` : ''}` : '' }}
                    </p>
                    <p v-else>Дисциплины учебного плана по выбранной группе.</p>
                </div>

                <div class="cup-actions">
                    <Button
                        icon="pi pi-refresh"
                        label="Обновить"
                        outlined
                        severity="secondary"
                        :loading="curriculumLoading"
                        @click="loadCurriculum"
                    />
                </div>
            </header>

            <!-- Состояния загрузки/ошибки групп -->
            <section v-if="groupsLoading" class="cup-empty-state">
                <ProgressSpinner style="width: 2.5rem; height: 2.5rem;" />
                <h4>Загрузка данных…</h4>
            </section>

            <section v-else-if="groupsError" class="cup-empty-state">
                <i class="pi pi-exclamation-triangle"></i>
                <h4>Не удалось загрузить учебный план</h4>
                <p>{{ groupsErrorDetail || 'Проверьте связь с системой UMU и попробуйте позже.' }}</p>
            </section>

            <section v-else-if="!groups.length" class="cup-empty-state">
                <i class="pi pi-list-check"></i>
                <h4>Записи не найдены</h4>
                <p>В системе UMU не найдено учебных записей для вашего аккаунта.</p>
            </section>

            <template v-else-if="selectedGroup">
                <div v-if="groups.length > 1" class="cup-group-select">
                    <label>Группа</label>
                    <Select
                        :modelValue="selectedGroup"
                        :options="groups"
                        optionLabel="groupName"
                        placeholder="Выбрать группу"
                        @update:modelValue="selectGroup"
                    >
                        <template #option="{ option }">
                            <div class="cup-group-option">
                                <strong>{{ option.groupName || 'Без названия' }}</strong>
                                <small>{{
                                    [
                                        option.course ? `${option.course} курс` : null,
                                        option.specialtyCode
                                            ? `${option.specialtyCode}${option.specialtyName ? ` ${option.specialtyName}` : ''}`
                                            : null,
                                    ].filter(Boolean).join(' · ') || 'Учебная запись'
                                }}</small>
                            </div>
                        </template>
                    </Select>
                </div>

                <!-- Дисциплины -->
                <section class="cup-card">
                    <div class="cup-card-head">
                        <div class="cup-title-row">
                            <h3>Дисциплины</h3>
                            <Tag :value="`Всего: ${curriculumItems.length}`" severity="contrast" />
                        </div>
                        <div class="cup-card-head-actions">
                            <Button
                                icon="pi pi-filter"
                                label="Фильтры"
                                outlined
                                severity="secondary"
                                :class="{ 'cup-filter-toggle--active': showFilters }"
                                :badge="activeFilterCount ? String(activeFilterCount) : undefined"
                                @click="showFilters = !showFilters"
                            />
                        </div>
                    </div>

                    <div v-if="showFilters" class="cup-filters">
                        <div class="cup-filter-field">
                            <label>Дисциплина</label>
                            <InputText
                                v-model="discipline"
                                placeholder="Поиск по названию"
                                @keydown.enter="loadCurriculum"
                            />
                        </div>
                        <div class="cup-filter-field">
                            <label>Курс</label>
                            <InputNumber v-model="course" :min="1" :useGrouping="false" placeholder="Любой" />
                        </div>
                        <div class="cup-filter-field">
                            <label>Семестр</label>
                            <InputNumber v-model="semester" :min="1" :useGrouping="false" placeholder="Любой" />
                        </div>
                        <div class="cup-filter-field">
                            <label>Тип контроля</label>
                            <Select
                                v-model="assessment"
                                :options="assessmentOptions"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Любой"
                            />
                        </div>
                        <div class="cup-filter-field">
                            <label>Выборность</label>
                            <Select
                                v-model="elective"
                                :options="electiveOptions"
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Все"
                            />
                        </div>
                        <div class="cup-filter-actions">
                            <Button
                                label="Применить"
                                icon="pi pi-check"
                                :loading="curriculumLoading"
                                @click="loadCurriculum"
                            />
                            <Button
                                label="Сбросить"
                                icon="pi pi-filter-slash"
                                severity="secondary"
                                text
                                @click="resetCurriculumFilters"
                            />
                        </div>
                    </div>

                    <div v-if="curriculumLoading" class="cup-empty-state">
                        <ProgressSpinner style="width: 2.5rem; height: 2.5rem;" />
                        <h4>Загрузка учебного плана…</h4>
                    </div>

                    <div v-else-if="!curriculumItems.length" class="cup-empty-state">
                        <i class="pi pi-inbox"></i>
                        <h4>Учебный план не найден</h4>
                        <p>Данные учебного плана для этой записи пока отсутствуют.</p>
                    </div>

                    <div v-else class="cup-curriculum">
                        <section v-if="curriculumItems.length" class="cup-curriculum-group">
                            <div class="cup-subjects-grid">
                                <article
                                    v-for="item in curriculumItems"
                                    :key="item.disciplineId || item.discipline"
                                    class="cup-subject-card"
                                >
                                    <div class="cup-subject-title">
                                        <strong>{{ item.discipline || 'Без названия' }}</strong>
                                        <div class="cup-tags">
                                            <Tag v-if="item.block" severity="secondary" :value="item.block" />
                                            <Tag v-if="item.elective" severity="info" value="Выборная" />
                                            <Tag v-if="item.additionalElective" severity="info" value="Доп. выборная" />
                                            <Tag v-if="item.facultative" severity="warn" value="Факультатив" />
                                        </div>
                                    </div>
                                    <div v-if="item.department" class="cup-subject-meta">
                                        <span><i class="pi pi-building"></i>{{ item.department }}</span>
                                    </div>
                                    <ul v-if="item.semesters?.length" class="cup-semesters">
                                        <li
                                            v-for="sem in item.semesters"
                                            :key="sem.semester"
                                            class="cup-semester"
                                        >
                                            <div class="cup-semester-head">
                                                <strong>{{ sem.semester }} сем.</strong>
                                                <span v-if="sem.course" class="cup-semester-course">{{ sem.course }} курс</span>
                                                <div class="cup-tags">
                                                    <Tag v-if="sem.exam" severity="warn" value="Экзамен" />
                                                    <Tag v-if="sem.credit" severity="success" value="Зачёт" />
                                                </div>
                                            </div>
                                            <div class="cup-semester-hours">
                                                <span v-if="sem.hours"><i class="pi pi-clock"></i>{{ sem.hours }} ч</span>
                                                <span v-if="sem.hoursAud">{{ sem.hoursAud }} ч ауд.</span>
                                                <span v-if="sem.lecture?.hours">Лек {{ sem.lecture.hours }} ч</span>
                                                <span v-if="sem.practical?.hours">Прак {{ sem.practical.hours }} ч</span>
                                                <span v-if="sem.laboratory?.hours">Лаб {{ sem.laboratory.hours }} ч</span>
                                            </div>
                                            <ul v-if="semesterTeacherRows(sem).length" class="cup-teachers">
                                                <li
                                                    v-for="(row, i) in semesterTeacherRows(sem)"
                                                    :key="i"
                                                    class="cup-teacher-row"
                                                >
                                                    <i class="pi pi-user"></i>
                                                    <span>{{ row.teacher }}<template v-if="row.subgroup"> · {{ row.subgroup }} п/г</template> · {{ row.type }} · {{ row.hours }} ч</span>
                                                </li>
                                            </ul>
                                        </li>
                                    </ul>
                                </article>
                            </div>
                        </section>
                    </div>
                </section>
            </template>
        </section>
    </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useUmuStudentGroups } from '@/composables/useUmuStudentGroups.js';
import { getMyUmuCurriculum } from '@/api/umu.js';

const toast = useToast();

const {
    groups,
    groupsLoading,
    groupsError,
    groupsErrorDetail,
    selectedGroup,
    selectGroup,
} = useUmuStudentGroups();

const curriculumData = ref(null);
const curriculumLoading = ref(false);

// Фильтры учебного плана (CurriculumFilter: дисциплина, курс, семестр, тип контроля, выборность)
const showFilters = ref(false);
const discipline = ref('');
const course = ref(null);
const semester = ref(null);
const assessment = ref(null);
const elective = ref(null);

// CurriculumAssessment в proto: 1 — экзамен, 2 — зачёт (0/нет значения — любой)
const assessmentOptions = [
    { label: 'Экзамен', value: 1 },
    { label: 'Зачёт', value: 2 },
];
// CurriculumElective в proto: 1 — только выборные, 2 — только обязательные (0/нет значения — все)
const electiveOptions = [
    { label: 'Только выборные', value: 1 },
    { label: 'Только обязательные', value: 2 },
];

// Основные дисциплины + выборные (из отдельного поля electives) в одном плоском списке
// с дедупликацией по disciplineId — отдельный блок выборных больше не выводится.
const curriculumItems = computed(() => {
    const main = curriculumData.value?.curriculum || [];
    const electiveDisciplines = (curriculumData.value?.electives || []).flatMap((g) => g.disciplines || []);
    const seen = new Set();
    const merged = [];
    for (const item of [...main, ...electiveDisciplines]) {
        const key = item.disciplineId ?? item.discipline;
        if (key == null || seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
    }
    return merged;
});

const activeFilterCount = computed(() => [
    String(discipline.value || '').trim() || null,
    course.value || null,
    semester.value || null,
    assessment.value != null ? assessment.value : null,
    elective.value != null ? elective.value : null,
].filter((v) => v !== null && v !== '').length);

const buildCurriculumParams = () => {
    const params = { studentId: selectedGroup.value.studentId };

    if (String(discipline.value || '').trim()) params.discipline = String(discipline.value).trim();
    if (course.value) params.course = course.value;
    if (semester.value) params.semester = semester.value;
    if (assessment.value != null) params.assessment = assessment.value;
    if (elective.value != null) params.elective = elective.value;

    return params;
};

const resetCurriculumFilters = () => {
    discipline.value = '';
    course.value = null;
    semester.value = null;
    assessment.value = null;
    elective.value = null;
    loadCurriculum();
};

// Типы занятий с подписями для вывода преподавателей по часам.
const WORK_TYPES = [
    { key: 'lecture', label: 'Лекция' },
    { key: 'practical', label: 'Практика' },
    { key: 'laboratory', label: 'Лабораторная работа' },
];

// Разворачивает преподавателей семестра по типам занятий:
// { teacher: ФИО, subgroup: № подгруппы|null, type: подпись типа, hours: часы типа }
const semesterTeacherRows = (sem) => {
    const rows = [];
    for (const t of WORK_TYPES) {
        const block = sem?.[t.key];
        if (!block?.teachers?.length) continue;
        for (const teacher of block.teachers) {
            if (!teacher?.teacher) continue;
            rows.push({
                teacher: teacher.teacher,
                subgroup: teacher.subgroup ?? null,
                type: t.label,
                hours: block.hours ?? 0,
            });
        }
    }
    return rows;
};

const loadCurriculum = async () => {
    if (!selectedGroup.value) return;

    curriculumLoading.value = true;

    try {
        const response = await getMyUmuCurriculum(buildCurriculumParams());
        curriculumData.value = response.data ?? null;
    } catch (error) {
        curriculumData.value = null;
        toast.add({
            severity: 'error',
            summary: 'Не удалось загрузить учебный план',
            detail: error?.response?.data?.title || error?.response?.data?.message || 'Попробуйте позже.',
            life: 3500,
        });
    } finally {
        curriculumLoading.value = false;
    }
};

// При смене группы сбрасываем кэш и фильтры, подгружаем учебный план.
watch(selectedGroup, async (group) => {
    if (!group) return;
    curriculumData.value = null;
    discipline.value = '';
    course.value = null;
    semester.value = null;
    assessment.value = null;
    elective.value = null;
    await loadCurriculum();
});
</script>

<style scoped>
.cup-page {
    --cup-border: rgba(var(--p-blue-500-rgb), 0.14);
    min-height: 100%;
    padding: 10px;
}

.cup-shell {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 100%;
    padding: 1.25rem;
    border-radius: 20px;
    border: 1px solid var(--cup-border);
    background:
        radial-gradient(1000px 220px at 0% 0%, rgba(var(--p-blue-500-rgb), 0.08), transparent 60%),
        linear-gradient(180deg, var(--p-bg-color-2) 0%, var(--p-bg-color-1) 100%);
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06);
}

.cup-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
}

.cup-copy h2 { margin: 0.75rem 0 0; }
.cup-copy p {
    margin: 0.65rem 0 0;
    max-width: 70ch;
    color: var(--p-grey-1);
    line-height: 1.5;
}

.cup-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.cup-group-select {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    max-width: 26rem;
}
.cup-group-select label {
    font-size: 0.78rem;
    color: var(--p-grey-1);
}
.cup-group-option {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
}
.cup-group-option small {
    color: var(--p-text-muted-color, var(--p-grey-2));
    font-size: 0.74rem;
}

.cup-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.15rem;
    border-radius: 18px;
    border: 1px solid rgba(var(--p-blue-500-rgb), 0.1);
    background:
        linear-gradient(180deg,
            color-mix(in srgb, var(--p-content-background) 96%, var(--p-primary-color) 4%),
            color-mix(in srgb, var(--p-content-background) 90%, var(--p-primary-color) 10%));
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.cup-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
}
.cup-title-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
}
.cup-title-row h3 { margin: 0; }

.cup-card-head-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}
.cup-filter-toggle--active {
    border-color: color-mix(in srgb, var(--p-primary-color) 55%, transparent);
    color: var(--p-primary-color);
    background: color-mix(in srgb, var(--p-primary-color) 13%, transparent);
}

.cup-filters {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.85rem;
    align-items: end;
    padding: 0.85rem;
    border-radius: 14px;
    border: 1px dashed var(--cup-border);
    background: rgba(var(--p-blue-500-rgb), 0.03);
}
/* Анти-overflow: grid-элементы не растягивают контейнер */
.cup-filters > * {
    min-width: 0;
}
.cup-filters :deep(.p-select),
.cup-filters :deep(.p-inputtext),
.cup-filters :deep(.p-inputnumber),
.cup-filters :deep(.p-inputnumber-input) {
    width: 100%;
}
.cup-filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}
.cup-filter-field label {
    font-size: 0.78rem;
    color: var(--p-grey-1);
}
.cup-filter-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
}

.cup-curriculum {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin-top: 0.25rem;
}
.cup-curriculum-group {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}
.cup-group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
}
.cup-group-head h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 750;
}

.cup-subjects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(clamp(260px, 45vw, 340px), 1fr));
    gap: 0.75rem;
}

.cup-subject-card {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1rem;
    border: 1px solid var(--p-grey-4);
    border-radius: 1rem;
    background: var(--p-bg-color-1);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.cup-subject-card:hover {
    border-color: color-mix(in srgb, var(--p-primary-color) 48%, transparent);
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.cup-subject-title {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
}
.cup-subject-title strong {
    font-size: 1.02rem;
    font-weight: 750;
    line-height: 1.25;
}
.cup-subject-title small {
    color: var(--p-text-muted-color, var(--p-grey-2));
    font-size: 0.76rem;
}
.cup-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.2rem;
}

.cup-subject-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    color: var(--p-text-muted-color, var(--p-grey-2));
    font-size: 0.82rem;
}
.cup-subject-meta span {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
}
.cup-subject-meta i {
    font-size: 0.8rem;
    color: var(--p-primary-color);
}

.cup-semesters {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
}
.cup-semester {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.6rem 0.75rem;
    border-radius: 0.65rem;
    border: 1px solid var(--p-grey-4);
    background: color-mix(in srgb, var(--p-bg-color-1) 92%, var(--p-primary-color) 4%);
}
.cup-semester-head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.4rem;
    font-size: 0.86rem;
}
.cup-semester-head strong { font-weight: 700; }
.cup-semester-course {
    color: var(--p-text-muted-color, var(--p-grey-2));
    font-size: 0.78rem;
}
.cup-semester-head .cup-tags { margin-top: 0; }
.cup-semester-hours {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.9rem;
    color: var(--p-text-muted-color, var(--p-grey-2));
    font-size: 0.8rem;
}
.cup-semester-hours span {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
}
.cup-semester-hours i {
    font-size: 0.78rem;
    color: var(--p-primary-color);
}
.cup-teachers {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin: 0;
    padding: 0;
    list-style: none;
}
.cup-teacher-row {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    color: var(--p-text-muted-color, var(--p-grey-2));
    font-size: 0.8rem;
    line-height: 1.4;
}
.cup-teacher-row > i {
    font-size: 0.78rem;
    color: var(--p-primary-color);
    margin-top: 0.15rem;
    flex: 0 0 auto;
}
.cup-teacher-row > span {
    min-width: 0;
}

.cup-empty-state {
    min-height: 240px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
}
.cup-empty-state i { font-size: 2rem; color: var(--p-grey-1); }
.cup-empty-state h4, .cup-empty-state p { margin: 0; }
.cup-empty-state p { max-width: 48ch; color: var(--p-grey-1); }

@media (max-width: 1100px) {
    .cup-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 768px) {
    .cup-shell { padding: 1rem; }
    .cup-header { flex-direction: column; align-items: stretch; }
    .cup-actions { justify-content: flex-start; }
    .cup-subjects-grid { grid-template-columns: 1fr; }
    .cup-filters { grid-template-columns: minmax(0, 1fr); }
}
</style>