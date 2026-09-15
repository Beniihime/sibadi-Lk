<template>
    <div class="payment-requisites">
        <div class="profile-card payment-requisites-card">
            <div class="payment-header">
                <div>
                    <div class="payment-eyebrow">Профиль</div>
                    <h2 class="m-0">Реквизиты для оплаты</h2>
                    <p class="payment-subtitle">
                        Банковские реквизиты для выставления счетов
                    </p>
                </div>
                <div v-if="isCurrentUser" class="d-flex gap-2">
                    <Button label="Добавить" icon="pi pi-plus" @click="openAddDialog" />
                </div>
            </div>

            <div v-if="loading" class="d-flex align-items-center gap-2">
                <ProgressSpinner style="width: 24px; height: 24px;" />
                <span>Загрузка реквизитов...</span>
            </div>

            <div v-else-if="!requisites.length" class="payment-empty">
                Реквизитов нет
            </div>

            <div v-else class="payment-list">
                <div v-for="req in requisites" :key="req.id" class="payment-item">
                    <div class="payment-item-head">
                        <div class="payment-item-bank">
                            <i class="pi pi-building-columns"></i>
                            <span>{{ bankLabel(req) }}</span>
                        </div>
                        <Tag
                            :value="req.isVisible ? 'Виден' : 'Скрыт'"
                            :severity="req.isVisible ? 'success' : 'secondary'"
                        />
                    </div>
                    <div class="payment-item-grid">
                        <div class="payment-kv">
                            <div class="payment-kv-label">БИК</div>
                            <div class="payment-kv-value">{{ req.bik || '-' }}</div>
                        </div>
                        <div class="payment-kv">
                            <div class="payment-kv-label">Расчётный счёт</div>
                            <div class="payment-kv-value">{{ req.currentAccount || '-' }}</div>
                        </div>
                        <div class="payment-kv">
                            <div class="payment-kv-label">Корр. счёт</div>
                            <div class="payment-kv-value">{{ req.correspondentAccount || '-' }}</div>
                        </div>
                    </div>
                    <div v-if="isCurrentUser" class="payment-item-actions">
                        <Button label="Изменить" icon="pi pi-pencil" outlined severity="secondary" size="small" @click="openEditDialog(req)" />
                        <Button label="Удалить" icon="pi pi-trash" severity="danger" outlined size="small" @click="openDeleteDialog(req)" />
                    </div>
                </div>
            </div>
        </div>

        <Dialog v-model:visible="showAddDialog" modal header="Добавить реквизит" :style="{ 'max-width': '40rem', width: '100%' }">
            <div class="payment-form-grid">
                <div class="full-width">
                    <label class="mb-1 d-block">Банк</label>
                    <Select
                        v-model="bankSelect"
                        :options="bankOptions"
                        optionLabel="label"
                        optionValue="value"
                        class="w-100"
                        placeholder="Выберите банк из справочника"
                        :loading="banksLoading"
                    />
                </div>
                <div v-if="bankSelect === CUSTOM_BANK_VALUE" class="full-width">
                    <label class="mb-1 d-block">Наименование банка</label>
                    <InputText v-model="form.bankName" class="w-100" placeholder="Например: ПАО «Банк»" />
                </div>
                <div>
                    <label class="mb-1 d-block">БИК</label>
                    <InputText v-model="form.bik" class="w-100" />
                </div>
                <div>
                    <label class="mb-1 d-block">Расчётный счёт</label>
                    <InputText v-model="form.currentAccount" class="w-100" />
                </div>
                <div>
                    <label class="mb-1 d-block">Корр. счёт</label>
                    <InputText v-model="form.correspondentAccount" class="w-100" />
                </div>
                <div class="full-width payment-visible-row">
                    <label for="paymentAddVisible" class="m-0">Виден</label>
                    <ToggleSwitch id="paymentAddVisible" v-model="form.isVisible" />
                </div>
            </div>
            <div class="d-flex justify-content-end mt-3 gap-2">
                <Button label="Отмена" text severity="secondary" @click="showAddDialog = false" />
                <Button label="Добавить" icon="pi pi-check" :loading="actionLoading" @click="addRequisite" />
            </div>
        </Dialog>

        <Dialog v-model:visible="showEditDialog" modal header="Изменить реквизит" :style="{ 'max-width': '40rem', width: '100%' }">
            <div class="payment-form-grid">
                <div class="full-width">
                    <label class="mb-1 d-block">Банк</label>
                    <Select
                        v-model="bankSelect"
                        :options="bankOptions"
                        optionLabel="label"
                        optionValue="value"
                        class="w-100"
                        placeholder="Выберите банк из справочника"
                        :loading="banksLoading"
                    />
                </div>
                <div v-if="bankSelect === CUSTOM_BANK_VALUE" class="full-width">
                    <label class="mb-1 d-block">Наименование банка</label>
                    <InputText v-model="form.bankName" class="w-100" placeholder="Например: ПАО «Банк»" />
                </div>
                <div>
                    <label class="mb-1 d-block">БИК</label>
                    <InputText v-model="form.bik" class="w-100" />
                </div>
                <div>
                    <label class="mb-1 d-block">Расчётный счёт</label>
                    <InputText v-model="form.currentAccount" class="w-100" />
                </div>
                <div>
                    <label class="mb-1 d-block">Корр. счёт</label>
                    <InputText v-model="form.correspondentAccount" class="w-100" />
                </div>
                <div class="full-width payment-visible-row">
                    <label for="paymentEditVisible" class="m-0">Виден</label>
                    <ToggleSwitch id="paymentEditVisible" v-model="form.isVisible" />
                </div>
            </div>
            <div class="d-flex justify-content-end mt-3 gap-2">
                <Button label="Отмена" text severity="secondary" @click="showEditDialog = false" />
                <Button label="Сохранить" icon="pi pi-check" :loading="actionLoading" @click="editRequisite" />
            </div>
        </Dialog>

        <Dialog v-model:visible="showDeleteDialog" modal header="Удалить реквизит?" :style="{ 'max-width': '30rem' }">
            <p class="m-0">Вы уверены, что хотите удалить реквизит «{{ bankLabel(selectedRequisite) }}»?</p>
            <div class="d-flex justify-content-end mt-3 gap-2">
                <Button label="Отмена" text severity="secondary" @click="showDeleteDialog = false" />
                <Button label="Удалить" icon="pi pi-trash" severity="danger" :loading="actionLoading" @click="deleteRequisite" />
            </div>
        </Dialog>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import {
    getMyPaymentDetails,
    getPaymentDetailsByUserId,
    createMyPaymentDetail,
    updatePaymentDetail,
    deletePaymentDetail,
    getBanks
} from '@/api/paymentDetails.js';

const props = defineProps({
    userId: { type: [String, null], default: null },
    isCurrentUser: { type: Boolean, default: false }
});

const CUSTOM_BANK_VALUE = '__custom__';

const requisites = ref([]);
const banks = ref([]);
const banksLoading = ref(false);
const loading = ref(false);
const actionLoading = ref(false);
const selectedRequisite = ref(null);
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const showDeleteDialog = ref(false);

const emptyForm = () => ({
    bankId: null,
    bankName: '',
    bik: '',
    currentAccount: '',
    correspondentAccount: '',
    isVisible: true
});
const form = ref(emptyForm());
const bankSelect = ref(null);

const bankOptions = computed(() => [
    ...banks.value.map((b) => ({ label: b.name, value: b.id })),
    { label: 'Ввести вручную', value: CUSTOM_BANK_VALUE }
]);

watch(bankSelect, (value) => {
    if (value === CUSTOM_BANK_VALUE) {
        form.value.bankId = null;
    } else if (value) {
        form.value.bankId = value;
        form.value.bankName = '';
    } else {
        form.value.bankId = null;
    }
});

const bankLabel = (req) => {
    if (!req) return '';
    if (req.bankName) return req.bankName;
    if (req.bankId) {
        const matched = banks.value.find((b) => String(b.id) === String(req.bankId));
        if (matched) return matched.name;
    }
    return 'Без банка';
};

const showToast = (severity, detail) => {
    window.dispatchEvent(new CustomEvent('toast', {
        detail: { severity, summary: 'Реквизиты', detail }
    }));
};

const loadBanks = async () => {
    try {
        banksLoading.value = true;
        const response = await getBanks();
        banks.value = Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.debug('Ошибка при загрузке банков: ', error);
        banks.value = [];
    } finally {
        banksLoading.value = false;
    }
};

const loadRequisites = async () => {
    if (!props.userId) return;
    loading.value = true;
    try {
        const response = props.isCurrentUser
            ? await getMyPaymentDetails()
            : await getPaymentDetailsByUserId(props.userId);
        requisites.value = Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.debug('Ошибка при загрузке реквизитов: ', error);
        requisites.value = [];
        showToast('error', 'Не удалось загрузить реквизиты');
    } finally {
        loading.value = false;
    }
};

const syncBankSelectFromForm = () => {
    if (form.value.bankId) {
        bankSelect.value = form.value.bankId;
    } else if (form.value.bankName) {
        bankSelect.value = CUSTOM_BANK_VALUE;
    } else {
        bankSelect.value = null;
    }
};

const resetForm = () => {
    form.value = emptyForm();
    bankSelect.value = null;
};

const openAddDialog = () => {
    resetForm();
    showAddDialog.value = true;
};

const openEditDialog = (req) => {
    selectedRequisite.value = req;
    form.value = {
        bankId: req.bankId ?? null,
        bankName: req.bankName ?? '',
        bik: req.bik ?? '',
        currentAccount: req.currentAccount ?? '',
        correspondentAccount: req.correspondentAccount ?? '',
        isVisible: req.isVisible
    };
    syncBankSelectFromForm();
    showEditDialog.value = true;
};

const openDeleteDialog = (req) => {
    selectedRequisite.value = req;
    showDeleteDialog.value = true;
};

const buildPayload = () => {
    const payload = {
        bik: form.value.bik.trim(),
        currentAccount: form.value.currentAccount.trim(),
        correspondentAccount: form.value.correspondentAccount.trim(),
        isVisible: form.value.isVisible
    };

    if (bankSelect.value === CUSTOM_BANK_VALUE) {
        payload.bankId = null;
        payload.bankName = form.value.bankName.trim() || null;
    } else if (bankSelect.value) {
        payload.bankId = bankSelect.value;
        payload.bankName = null;
    } else {
        payload.bankId = null;
        payload.bankName = null;
    }

    return payload;
};

const validateForm = () => {
    if (!form.value.bik.trim()) {
        showToast('error', 'Укажите БИК');
        return false;
    }
    if (!form.value.currentAccount.trim()) {
        showToast('error', 'Укажите расчётный счёт');
        return false;
    }
    if (!form.value.correspondentAccount.trim()) {
        showToast('error', 'Укажите корреспондентский счёт');
        return false;
    }
    if (bankSelect.value === CUSTOM_BANK_VALUE && !form.value.bankName.trim()) {
        showToast('error', 'Введите наименование банка');
        return false;
    }
    return true;
};

const addRequisite = async () => {
    if (!validateForm()) return;
    try {
        actionLoading.value = true;
        await createMyPaymentDetail(buildPayload());
        showToast('success', 'Реквизит добавлен');
        showAddDialog.value = false;
        await loadRequisites();
    } catch (error) {
        console.debug('Ошибка при добавлении реквизита: ', error);
        showToast('error', 'Не удалось добавить реквизит');
    } finally {
        actionLoading.value = false;
    }
};

const editRequisite = async () => {
    if (!selectedRequisite.value?.id || !validateForm()) return;
    try {
        actionLoading.value = true;
        await updatePaymentDetail(selectedRequisite.value.id, buildPayload());
        showToast('success', 'Реквизит обновлён');
        showEditDialog.value = false;
        await loadRequisites();
    } catch (error) {
        console.debug('Ошибка при обновлении реквизита: ', error);
        showToast('error', 'Не удалось обновить реквизит');
    } finally {
        actionLoading.value = false;
    }
};

const deleteRequisite = async () => {
    if (!selectedRequisite.value?.id) return;
    try {
        actionLoading.value = true;
        await deletePaymentDetail(selectedRequisite.value.id);
        showToast('success', 'Реквизит удалён');
        showDeleteDialog.value = false;
        await loadRequisites();
    } catch (error) {
        console.debug('Ошибка при удалении реквизита: ', error);
        showToast('error', 'Не удалось удалить реквизит');
    } finally {
        actionLoading.value = false;
    }
};

onMounted(async () => {
    await Promise.all([loadRequisites(), loadBanks()]);
});
</script>

<style scoped>
.profile-card {
    border-width: 2px;
    border-style: solid;
    border-color: rgba(var(--p-blue-500-rgb), 0.14);
    background: linear-gradient(
        180deg,
        rgba(var(--p-blue-500-rgb), 0.04),
        rgba(255, 255, 255, 0)
    );
    border-radius: 12px;
    width: 100%;
    padding: 20px;
}
.payment-requisites-card {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}
.payment-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
}
.payment-eyebrow {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(var(--p-blue-500-rgb), 0.85);
    margin-bottom: 0.4rem;
    font-weight: 700;
}
.payment-subtitle {
    margin: 0.45rem 0 0;
    color: var(--p-grey-2);
    font-size: 0.95rem;
}
.payment-empty {
    color: var(--p-grey-2);
    padding: 2rem 1rem;
    text-align: center;
    border: 1px dashed rgba(var(--p-blue-500-rgb), 0.22);
    border-radius: 18px;
    background: rgba(var(--p-blue-500-rgb), 0.03);
}
.payment-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.payment-item {
    border-radius: 18px;
    border: 1px solid rgba(var(--p-blue-500-rgb), 0.16);
    background: linear-gradient(180deg, rgba(var(--p-blue-500-rgb), 0.05), rgba(255, 255, 255, 0.02));
    padding: 1rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
}
.payment-item-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}
.payment-item-bank {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    color: var(--p-text-color);
}
.payment-item-bank .pi {
    color: rgba(var(--p-blue-500-rgb), 0.7);
}
.payment-item-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
}
.payment-kv {
    min-height: 64px;
    padding: 0.8rem 0.9rem;
    border-radius: 14px;
    border: 1px solid rgba(var(--p-blue-500-rgb), 0.12);
    background: rgba(255, 255, 255, 0.04);
}
.payment-kv-label {
    color: var(--p-grey-2);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.4rem;
}
.payment-kv-value {
    color: var(--p-text-color);
    font-size: 0.98rem;
    font-weight: 600;
    word-break: break-word;
}
.payment-item-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
}
.payment-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}
.payment-form-grid .full-width {
    grid-column: 1 / -1;
}
.payment-visible-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

@media (max-width: 960px) {
    .payment-header {
        flex-direction: column;
    }
    .payment-item-grid {
        grid-template-columns: 1fr;
    }
    .payment-form-grid {
        grid-template-columns: 1fr;
    }
}
</style>