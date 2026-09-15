<template>
    <div class="panel-card news-overview-card">
        <div class="panel-header">
            <h3>Новости</h3>
            <router-link class="panel-header-action" to="/news" aria-label="Открыть новости" v-tooltip.top="'Открыть новости'">
                <i class="pi pi-arrow-up-right"></i>
            </router-link>
        </div>
        <div class="panel-content">
            <div v-if="latestNewsLoading" class="schedule-skeleton">
                <Skeleton width="70%" height="1.1rem" borderRadius="8px" />
                <Skeleton width="100%" height="2.7rem" borderRadius="10px" />
                <Skeleton width="40%" height="0.9rem" borderRadius="8px" />
            </div>
            <div v-else-if="latestNews" class="latest-news">
                <strong class="latest-news-title">{{ latestNews.title || 'Без заголовка' }}</strong>
                <p v-if="latestNews.body" class="latest-news-body">{{ latestNews.body }}</p>
                <span v-if="latestNews.createdAt" class="latest-news-date">{{ formatLatestNewsDate(latestNews.createdAt) }}</span>
                <router-link to="/news" class="latest-news-link">
                    <span>Все новости</span>
                    <i class="pi pi-arrow-right"></i>
                </router-link>
            </div>
            <div v-else class="activity-item muted">Новостей пока нет</div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { formatDateRuLongWithTime } from '@/utils/date.js';
import { getVisiblePosts, normalizePostsResponse } from '@/api/news.js';

const latestNews = ref(null);
const latestNewsLoading = ref(false);

const formatLatestNewsDate = (date) => formatDateRuLongWithTime(date);

const fetchLatestNews = async () => {
    latestNewsLoading.value = true;
    try {
        const response = await getVisiblePosts({ page: 1, pageSize: 1 });
        const { posts } = normalizePostsResponse(response.data);
        latestNews.value = posts[0] || null;
    } catch (error) {
        console.debug('Ошибка при загрузке последней новости:', error);
        latestNews.value = null;
    } finally {
        latestNewsLoading.value = false;
    }
};

onMounted(() => {
    fetchLatestNews();
});
</script>

<style scoped src="./dashboardWidget.css"></style>