import axiosInstance from '@/utils/axios.js';

const base = '/api/umu';

/**
 * Получить записи/группы аутентифицированного студента в UMU.
 * @returns {Promise} axios-ответ со списком StudentProfileEntry
 */
export function getMyUmuGroups() {
    return axiosInstance.get(`${base}/students/me/groups`);
}

/**
 * Получить оценки студента из ведомостей по выбранной группе.
 * @param {Object} params
 * @param {number} params.studentId — код студента в UMU, привязанный к выбранной группе
 * @param {number} [params.semester] — явный семестр
 * @param {boolean} [params.latestSemester] — только самый свежий (Год, Семестр)
 * @param {string} [params.fromDate] — ISO-дата (по Дата_Экзамена ведомости, с)
 * @param {string} [params.toDate] — ISO-дата (по Дата_Экзамена ведомости, по)
 * @param {string} [params.discipline] — поиск по названию предмета
 * @returns {Promise} axios-ответ со списком StudentGrades
 */
export function getMyUmuGrades(params = {}) {
    return axiosInstance.get(`${base}/students/me/grades`, { params });
}

/**
 * Получить учебный план студента (дисциплины и блоки выборных) по выбранной группе.
 * @param {Object} params
 * @param {number} params.studentId — код студента в UMU, привязанный к выбранной группе
 * @param {string} [params.discipline] — поиск по названию дисциплины (подстрока)
 * @param {number} [params.course] — курс
 * @param {number} [params.semester] — семестр
 * @param {number} [params.assessment] — тип контроля: 1 — экзамен, 2 — зачёт
 * @param {number} [params.elective] — выборность: 1 — только выборные, 2 — только обязательные
 * @returns {Promise} axios-ответ с StudentCurriculum ({ curriculum, electives })
 */
export function getMyUmuCurriculum(params = {}) {
    return axiosInstance.get(`${base}/students/me/curriculum`, { params });
}

/**
 * Получить расписание сессии студента (экзамены/зачёты/пересдачи) по выбранной группе.
 * @param {Object} params
 * @param {number} params.studentId — код студента в UMU, привязанный к выбранной группе
 * @returns {Promise} axios-ответ с StudentExamSchedule ({ items })
 */
export function getMyUmuExamSchedule(params = {}) {
    return axiosInstance.get(`${base}/students/me/exam-schedule`, { params });
}