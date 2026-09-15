<template>
    <main class="dashboard" :class="{ 'dashboard-editing': dashboardStore.editing }">
        <section class="hero">
            <div class="hero-content">
                <div class="hero-pill">
                    <i class="pi pi-sparkles"></i>
                    <span>Добро пожаловать</span>
                </div>
                <h1>Добро пожаловать в ЛКС, {{ firstName }}!</h1>
                <p class="subtitle">Быстрый доступ к основным разделам и вашей активности</p>
            </div>
            <div v-if="canEditDashboard" class="hero-edit">
                <button
                    v-if="!dashboardStore.editing"
                    class="edit-toggle"
                    aria-label="Редактировать главную страницу"
                    v-tooltip.top="'Редактировать главную'"
                    @click="dashboardStore.startEdit()"
                >
                    <i class="pi pi-pencil"></i>
                </button>
                <button
                    v-else
                    class="edit-toggle edit-toggle-done"
                    aria-label="Завершить редактирование"
                    v-tooltip.top="'Готово'"
                    @click="dashboardStore.endEdit()"
                >
                    <i class="pi pi-check"></i>
                </button>
            </div>
        </section>

        <!-- Телефон: одна плоская колонка всех размещённых виджетов -->
        <section v-if="isPhone" class="overview-grid overview-grid-phone">
            <div
                v-for="id in placedFlat"
                :key="id"
                class="widget-slot"
            >
                <component
                    :is="WIDGETS_BY_ID[id].component"
                    v-bind="widgetBindings(id)"
                    :ref="(el) => setWidgetRef(id, el)"
                />
            </div>
        </section>

        <!-- Десктоп/планшет: 3 колонки -->
        <section v-else class="overview-grid">
            <div
                v-for="(col, columnIndex) in dashboardStore.columns"
                :key="columnIndex"
                class="overview-column"
            >
                <VueDraggable
                    v-if="dashboardStore.editing"
                    :model-value="dashboardStore.columns[columnIndex]"
                    :group="{ name: 'widgets', pull: true, put: true }"
                    :animation="180"
                    handle=".widget-drag-handle"
                    class="overview-column-drag"
                    ghost-class="widget-ghost"
                    @update:model-value="(val) => dashboardStore.setColumn(columnIndex, val)"
                    @end="dashboardStore.touch()"
                >
                    <div
                        v-for="id in col"
                        :key="id"
                        class="widget-slot widget-slot-edit"
                    >
                        <span class="widget-drag-handle" title="Перетащите виджет">
                            <i class="pi pi-bars"></i>
                        </span>
                        <component
                            :is="WIDGETS_BY_ID[id].component"
                            v-bind="widgetBindings(id)"
                            :ref="(el) => setWidgetRef(id, el)"
                        />
                    </div>
                </VueDraggable>

                <template v-else>
                    <div
                        v-for="id in col"
                        :key="id"
                        class="widget-slot"
                    >
                        <component
                            :is="WIDGETS_BY_ID[id].component"
                            v-bind="widgetBindings(id)"
                            :ref="(el) => setWidgetRef(id, el)"
                        />
                    </div>
                </template>
            </div>
        </section>

        <StudentTicketCreateDialog
            ref="createCertificateDialogRef"
            :show-button="false"
            @created="onCertificateCreated"
        />
    </main>
</template>

<script setup>
import { computed } from 'vue';
import { onMounted, ref } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import StudentTicketCreateDialog from '@/components/Tickets/StudentTicketCreateDialog.vue';
import { useDashboardStore } from '@/stores/dashboard.js';
import { WIDGETS_BY_ID } from '@/config/dashboardWidgets.js';
import { useResponsiveLayout } from '@/composables/useResponsiveLayout.js';
import { getCurrentUser } from '@/utils/currentUser.js';

const dashboardStore = useDashboardStore();
const { isPhone, isDesktop } = useResponsiveLayout();

const canEditDashboard = computed(() => isDesktop.value);
const firstName = ref(localStorage.getItem('firstName') || '');
const createCertificateDialogRef = ref(null);
const widgetRefs = {};

const setWidgetRef = (id, el) => {
    if (el) {
        widgetRefs[id] = el;
    } else {
        delete widgetRefs[id];
    }
};

/**
 * Все размещённые id по порядку колонок — для плоского вида на телефоне.
 */
const placedFlat = computed(() => dashboardStore.columns.flat());

const widgetBindings = (id) => {
    if (id === 'certificates') {
        return { onOpenCreateDialog: openCertificateModal };
    }
    return {};
};

const openCertificateModal = () => {
    createCertificateDialogRef.value?.openModal?.();
};

const onCertificateCreated = () => {
    widgetRefs.certificates?.refetch?.();
};

const fetchUserStatus = async () => {
    try {
        const me = await getCurrentUser();
        firstName.value = me.firstName || '';
        localStorage.setItem('firstName', firstName.value);
    } catch (error) {
        console.debug('Ошибка при загрузке статуса пользователя:', error);
    }
};

onMounted(() => {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    fetchUserStatus();
    dashboardStore.load();
});
</script>

<style scoped>
.dashboard {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: var(--app-page-padding-y) var(--app-page-padding-x) 1.5rem;
    gap: 24px;
    isolation: isolate;
    overflow: hidden;
}
.dashboard::before {
    content: "";
    position: absolute;
    inset: -30% -10% auto -10%;
    height: 420px;
    z-index: -1;
    pointer-events: none;
    background:
        radial-gradient(circle at 18% 24%, rgba(var(--p-primary-500-rgb), 0.15), transparent 50%),
        radial-gradient(circle at 86% 8%, rgba(var(--p-amber-500-rgb), 0.10), transparent 42%);
    filter: blur(8px);
    animation: driftBg 14s ease-in-out infinite alternate;
}
.hero {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.35rem 0 0.15rem;
    opacity: 0;
    transform: translateY(12px);
    animation: revealUp 0.62s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards;
}
.hero-content {
    position: relative;
    z-index: 1;
}
.hero h1 {
    font-size: 2.2rem;
    color: var(--p-text-color);
    margin: 0 0 6px;
}
.hero-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 0.8rem;
    background: rgba(var(--p-primary-500-rgb), 0.12);
    color: var(--p-primary-color);
    margin-bottom: 12px;
}
.subtitle {
    margin: 0;
    color: var(--p-grey-2);
}

.hero-edit {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
}
.edit-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.3rem;
    height: 2.3rem;
    padding: 0;
    border-radius: 0.85rem;
    border: 1px solid color-mix(in srgb, var(--p-primary-color) 24%, transparent);
    background: color-mix(in srgb, var(--p-primary-color) 10%, transparent);
    color: var(--p-primary-color);
    font: inherit;
    cursor: pointer;
    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}
.edit-toggle:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--p-primary-color) 42%, transparent);
    background: color-mix(in srgb, var(--p-primary-color) 18%, transparent);
}
.edit-toggle-done {
    background: var(--p-primary-color);
    border-color: var(--p-primary-color);
    color: var(--p-primary-contrast-color, #fff);
}
.edit-toggle-done:hover {
    background: var(--p-primary-600);
}

.overview-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    gap: 16px;
}
.overview-column {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
    min-height: 0;
}
.overview-column-drag {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 220px;
    padding: 4px;
    border-radius: 16px;
    border: 1px dashed transparent;
    transition: border-color 0.2s ease, background 0.2s ease;
}
.dashboard-editing .overview-column-drag {
    border-color: rgba(var(--p-primary-500-rgb), 0.22);
    background: rgba(var(--p-primary-500-rgb), 0.03);
}

.widget-slot {
    position: relative;
    min-width: 0;
}
.widget-slot-edit {
    cursor: grab;
}
.widget-slot-edit:active {
    cursor: grabbing;
}
.widget-drag-handle {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 4;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 0.55rem;
    color: var(--p-text-muted-color, var(--p-grey-2));
    background: color-mix(in srgb, var(--p-bg-color-1) 70%, transparent);
    border: 1px solid rgba(var(--p-primary-500-rgb), 0.16);
    cursor: grab;
    opacity: 0.85;
    transition: opacity 0.2s ease, background 0.2s ease;
}
.widget-drag-handle:hover {
    opacity: 1;
    background: color-mix(in srgb, var(--p-primary-color) 14%, transparent);
    color: var(--p-primary-color);
}
.widget-ghost {
    opacity: 0.5;
}

/* В режиме редактирования глушим hover-подъём карточек, чтобы не дёргалось при DnD */
.dashboard-editing :deep(.panel-card:hover) {
    transform: none;
}

@keyframes revealUp {
    from {
        opacity: 0;
        transform: translateY(18px) scale(0.985);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes driftBg {
    from { transform: translate3d(0, 0, 0); }
    to { transform: translate3d(0, 18px, 0); }
}

@media (prefers-reduced-motion: reduce) {
    .dashboard::before,
    .hero {
        animation: none !important;
        transform: none !important;
        opacity: 1 !important;
    }
}

@media (max-width: 1024px) {
    .dashboard { padding-bottom: 1.5rem; }
    .hero h1 { font-size: 2rem; }
}

@media (max-width: 640px) {
    .dashboard {
        padding-bottom: var(--app-mobile-bottom-offset);
        gap: 18px;
    }
    .hero {
        padding: 0.15rem 0;
    }
    .hero h1 {
        font-size: 1.65rem;
        line-height: 1.15;
    }
    .hero-pill { margin-bottom: 10px; }
    .overview-grid,
    .overview-grid-phone {
        grid-template-columns: 1fr;
    }
}
</style>