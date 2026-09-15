<template>
    <div class="widget-palette">
        <div class="palette-header">
            <i class="pi pi-th-large"></i>
            <span>Виджеты</span>
        </div>
        <p class="palette-hint">Перетащите виджет в нужную колонку. Чтобы убрать — перетащите обратно сюда.</p>

        <VueDraggable
            v-model="paletteModel"
            :group="{ name: 'widgets', pull: true, put: true }"
            :animation="180"
            handle=".palette-card-handle"
            class="palette-list"
            ghost-class="palette-card-ghost"
        >
            <div
                v-for="id in paletteModel"
                :key="id"
                class="palette-card"
            >
                <span class="palette-card-handle"><i class="pi pi-bars"></i></span>
                <span class="palette-card-icon"><i :class="widgetIcon(id)"></i></span>
                <span class="palette-card-name">{{ widgetName(id) }}</span>
            </div>
        </VueDraggable>

        <div v-if="!paletteModel.length" class="palette-empty">
            Все виджеты размещены. Перетащите любой из колонки обратно, чтобы убрать.
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { useDashboardStore } from '@/stores/dashboard.js';
import { WIDGETS_BY_ID } from '@/config/dashboardWidgets.js';

const dashboardStore = useDashboardStore();

const paletteModel = computed({
    get: () => dashboardStore.paletteIds,
    set: (val) => dashboardStore.setPalette(val),
});

const widgetName = (id) => WIDGETS_BY_ID[id]?.name ?? id;
const widgetIcon = (id) => WIDGETS_BY_ID[id]?.icon ?? 'pi pi-th-large';
</script>

<style scoped>
.widget-palette {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    padding: 0.9rem 0.85rem 1rem;
    box-sizing: border-box;
    overflow: hidden;
}
.palette-header {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    font-weight: 700;
    font-size: 1rem;
    color: var(--p-text-color);
}
.palette-header .pi {
    color: var(--p-primary-color);
}
.palette-hint {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.4;
    color: var(--p-text-muted-color, var(--p-grey-2));
}
.palette-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
    flex: 1 1 auto;
    min-height: 60px;
    padding: 2px;
}
.palette-card {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem 0.75rem;
    border-radius: 0.85rem;
    border: 1px solid rgba(var(--p-primary-500-rgb), 0.18);
    background: color-mix(in srgb, var(--p-primary-color) 7%, transparent);
    cursor: grab;
    user-select: none;
    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}
.palette-card:hover {
    transform: translateY(-1px);
    border-color: rgba(var(--p-primary-500-rgb), 0.34);
    background: color-mix(in srgb, var(--p-primary-color) 13%, transparent);
}
.palette-card:active {
    cursor: grabbing;
}
.palette-card-ghost {
    opacity: 0.5;
}
.palette-card-handle {
    display: inline-flex;
    align-items: center;
    color: var(--p-text-muted-color, var(--p-grey-2));
    font-size: 0.8rem;
}
.palette-card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.85rem;
    height: 1.85rem;
    border-radius: 0.6rem;
    background: color-mix(in srgb, var(--p-primary-color) 14%, transparent);
    color: var(--p-primary-color);
    flex: 0 0 auto;
}
.palette-card-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--p-text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.palette-empty {
    margin: 0;
    padding: 0.75rem;
    border-radius: 0.85rem;
    border: 1px dashed rgba(var(--p-primary-500-rgb), 0.24);
    font-size: 0.8rem;
    line-height: 1.4;
    color: var(--p-text-muted-color, var(--p-grey-2));
    text-align: center;
}
</style>