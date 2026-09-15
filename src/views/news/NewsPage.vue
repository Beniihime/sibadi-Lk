<template>
    <main class="news-page">
        <NewsFeedSection />
    </main>
</template>

<script setup>
import NewsFeedSection from '@/components/News/NewsFeedSection.vue';
</script>

<style scoped>
.news-page {
    display: flex;
    flex-direction: column;
    padding: var(--app-page-padding-y) var(--app-page-padding-x) 1.5rem;
    gap: 1.5rem;
    color: var(--p-text-color);
}

@media (max-width: 640px) {
    .news-page {
        padding-bottom: var(--app-mobile-bottom-offset);
        gap: 1.15rem;
    }
}
</style>