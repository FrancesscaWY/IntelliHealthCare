<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  batchDeleteAdminInstitutions,
  createAdminInstitution,
  getAdminInstitutionDetail,
  getAdminInstitutions,
  publishAdminInstitution,
  unpublishAdminInstitution,
  updateAdminInstitution,
} from "@/shared/api/system";
import { handleAdminPageError } from "@/shared/api/error";
import mockSeed, { type InstitutionRow } from "./mock";

type StatusFilter = "全部" | "已发布" | "未发布";
type PublishMode = "immediate" | "scheduled";
type InstitutionRecord = InstitutionRow & {
  coverName: string;
  businessHours: string;
  publishMode: PublishMode;
  publishDate: string;
  publishTime: string;
};
type ServiceOption = {
  value: string;
  label: string;
  tags: string[];
};

const props = defineProps<PageComponentProps>();

const serviceOptions: ServiceOption[] = [
  { value: "elder-care", label: "长者照护", tags: ["24h监护", "日间照料", "特殊护理", "失能照护", "夜间值守"] },
  { value: "rehab-care", label: "康复理疗", tags: ["康复理疗", "上门护理", "康复训练"] },
  { value: "nutrition-care", label: "营养管理", tags: ["营养膳食", "慢病管理", "膳食管理"] },
  { value: "companion-care", label: "关怀陪护", tags: ["陪诊服务", "心理陪伴", "认知训练"] },
];
const defaultBusinessHours = ["08:00-20:00", "09:00-18:00", "07:30-19:30", "24小时服务"];

function buildInstitutionRecord(
  row: InstitutionRow & Partial<Pick<InstitutionRecord, "coverName" | "businessHours" | "publishMode" | "publishDate" | "publishTime">>,
  index: number,
): InstitutionRecord {
  return {
    ...row,
    coverName: row.coverName || `institution-cover-${index + 1}.jpg`,
    businessHours: row.businessHours || defaultBusinessHours[index % defaultBusinessHours.length] || "08:00-20:00",
    publishMode: row.publishMode || (row.published ? "immediate" : "scheduled"),
    publishDate: row.publishDate || (row.published ? "" : row.updatedAt.slice(0, 10)),
    publishTime: row.publishTime || row.updatedAt.slice(11, 16) || "12:00",
  };
}

const mock = ref<typeof mockSeed>(mockSeed);
const rows = ref<InstitutionRecord[]>(mockSeed.rows.map((row, index) => buildInstitutionRecord(row, index)));
const searchDraft = ref("");
const searchKeyword = ref("");
const statusFilter = ref<StatusFilter>("全部");
const dateStart = ref("");
const dateEnd = ref("");
const currentPage = ref(1);
const pageJump = ref("1");
const pageSize = 10;
const selectedIds = ref<string[]>([]);
const batchActionOpen = ref(false);
const dialogOpen = ref(false);
const dialogMode = ref<"create" | "edit">("create");
const editingId = ref("");
const deleteDialogOpen = ref(false);
const deleteTargetIds = ref<string[]>([]);
const coverInputRef = ref<HTMLInputElement | null>(null);

const operatorName = "李明明";

const form = reactive({
  institutionNo: "",
  name: "",
  region: mockSeed.regionOptions[0] ?? "浦东新区",
  address: "",
  contactName: "",
  contactPhone: "",
  servicePreset: "",
  coverName: "",
  businessHours: "",
  shareCount: "0",
  favoriteCount: "0",
  note: "",
  publishMode: "immediate" as PublishMode,
  publishDate: "",
  publishTime: "12:00",
});

const filteredRows = computed(() => {
  const keyword = searchKeyword.value.trim();

  return rows.value.filter((row) => {
    const matchedKeyword =
      !keyword ||
      [
        row.institutionNo,
        row.name,
        row.region,
        row.address,
        row.businessHours,
        row.contactName,
        row.contactPhone,
        row.updatedBy,
        row.note,
        row.serviceTags.join(" "),
      ].some((value) => value.includes(keyword));
    const matchedStatus =
      statusFilter.value === "全部" ||
      (statusFilter.value === "已发布" ? row.published : !row.published);
    const currentDate = row.updatedAt.slice(0, 10);
    const matchedStart = !dateStart.value || currentDate >= dateStart.value;
    const matchedEnd = !dateEnd.value || currentDate <= dateEnd.value;

    return matchedKeyword && matchedStatus && matchedStart && matchedEnd;
  });
});

const totalPages = computed(() => Math.max(Math.ceil(filteredRows.value.length / pageSize), 1));
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredRows.value.slice(start, start + pageSize);
});
const currentPageRowIds = computed(() => pagedRows.value.map((row) => row.id));
const allChecked = computed(
  () => currentPageRowIds.value.length > 0 && currentPageRowIds.value.every((id) => selectedIds.value.includes(id)),
);
const paginationPages = computed(() => Array.from({ length: totalPages.value }, (_, index) => index + 1));
const dialogTitle = computed(() => (dialogMode.value === "create" ? "新增机构" : "编辑机构"));
const selectedRows = computed(() => rows.value.filter((row) => selectedIds.value.includes(row.id)));
const selectedCount = computed(() => selectedRows.value.length);
const deleteDialogMessage = computed(() =>
  deleteTargetIds.value.length === 1
    ? "删除后该机构将从列表移除，确定继续吗？"
    : `将删除 ${deleteTargetIds.value.length} 家机构，删除后不可恢复，确定继续吗？`,
);

watch(totalPages, (pageCount) => {
  if (currentPage.value > pageCount) {
    currentPage.value = pageCount;
  }
});

watch(currentPage, (page) => {
  pageJump.value = `${page}`;
});

watch(batchActionOpen, (open) => {
  if (!open) {
    selectedIds.value = [];
  }
});

function formatNow() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function resetPage() {
  currentPage.value = 1;
}

async function syncPageData() {
  try {
    const response = await getAdminInstitutions({
      page: 1,
      pageSize: 200,
    });
    const nextRows = Array.isArray(response?.rows) ? (response.rows as InstitutionRow[]) : [];

    mock.value = {
      ...mock.value,
      title: String(response?.title ?? mockSeed.title),
      summary: String(response?.summary ?? mockSeed.summary),
      statusOptions: Array.isArray(response?.statusOptions) ? response.statusOptions : mockSeed.statusOptions,
      regionOptions: Array.isArray(response?.regionOptions) && response.regionOptions.length
        ? response.regionOptions
        : mockSeed.regionOptions,
      rows: nextRows,
    };
    rows.value = nextRows.map((row, index) => buildInstitutionRecord(row, index));

    if (!mock.value.regionOptions.includes(form.region)) {
      form.region = mock.value.regionOptions[0] ?? form.region;
    }
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "机构管理列表加载失败，已回退到演示数据",
    });
  }
}

function applySearch() {
  searchKeyword.value = searchDraft.value.trim();
  selectedIds.value = [];
  resetPage();
}

function onFilterChange() {
  selectedIds.value = [];
  resetPage();
}

function resetFilters() {
  searchDraft.value = "";
  searchKeyword.value = "";
  statusFilter.value = "全部";
  dateStart.value = "";
  dateEnd.value = "";
  selectedIds.value = [];
  batchActionOpen.value = false;
  resetPage();
}

function setCurrentPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value);
  currentPage.value = nextPage;
}

function jumpToPage() {
  const nextPage = Number(pageJump.value);

  if (!Number.isInteger(nextPage)) {
    pageJump.value = `${currentPage.value}`;
    return;
  }

  setCurrentPage(nextPage);
}

function toggleSelectAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  const nextIds = new Set(selectedIds.value);

  pagedRows.value.forEach((row) => {
    if (checked) {
      nextIds.add(row.id);
    } else {
      nextIds.delete(row.id);
    }
  });

  selectedIds.value = Array.from(nextIds);
}

function toggleRowSelection(id: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  const nextIds = new Set(selectedIds.value);

  if (checked) {
    nextIds.add(id);
  } else {
    nextIds.delete(id);
  }

  selectedIds.value = Array.from(nextIds);
}

function openBatchActions() {
  batchActionOpen.value = !batchActionOpen.value;
}

async function applyBatchPublish(nextPublished: boolean) {
  if (!selectedRows.value.length) {
    props.showToast("请先勾选需要操作的机构。");
    return;
  }

  try {
    await Promise.all(
      selectedRows.value.map((row) =>
        nextPublished ? publishAdminInstitution(row.id) : unpublishAdminInstitution(row.id),
      ),
    );

    selectedRows.value.forEach((row) => {
      row.published = nextPublished;
      row.publishMode = nextPublished ? "immediate" : row.publishMode;
      row.updatedBy = operatorName;
      row.updatedAt = formatNow();
    });

    props.showToast(`${nextPublished ? "批量发布" : "批量下架"} ${selectedRows.value.length} 家机构`);
    await syncPageData();
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: `${nextPublished ? "批量发布" : "批量下架"}失败，请稍后重试`,
    });
  }
}

function requestDeleteRows(targetIds: string[]) {
  if (!targetIds.length) {
    props.showToast("请先勾选需要操作的机构。");
    return;
  }

  deleteTargetIds.value = Array.from(new Set(targetIds));
  deleteDialogOpen.value = true;
}

function closeDeleteDialog() {
  deleteDialogOpen.value = false;
  deleteTargetIds.value = [];
}

async function confirmDelete() {
  if (!deleteTargetIds.value.length) {
    closeDeleteDialog();
    return;
  }

  const deleteSet = new Set(deleteTargetIds.value);

  try {
    await batchDeleteAdminInstitutions({
      institutionIds: Array.from(deleteSet),
    });
    rows.value = rows.value.filter((row) => !deleteSet.has(row.id));
    selectedIds.value = selectedIds.value.filter((id) => !deleteSet.has(id));
    props.showToast(deleteSet.size === 1 ? "机构已删除" : `已删除 ${deleteSet.size} 家机构`);
    closeDeleteDialog();
    await syncPageData();
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "删除机构失败，请稍后重试",
    });
  }
}

function generateInstitutionNo() {
  const maxValue = rows.value.reduce((max, row) => {
    const current = Number(row.institutionNo.replace(/\D/g, ""));
    return Number.isFinite(current) ? Math.max(max, current) : max;
  }, 2024000);

  return `JG${maxValue + 1}`;
}

function resetForm() {
  form.institutionNo = "";
  form.name = "";
  form.region = mock.value.regionOptions[0] ?? "浦东新区";
  form.address = "";
  form.contactName = operatorName;
  form.contactPhone = "";
  form.servicePreset = "";
  form.coverName = "";
  form.businessHours = "";
  form.shareCount = "0";
  form.favoriteCount = "0";
  form.note = "";
  form.publishMode = "immediate";
  form.publishDate = "";
  form.publishTime = "12:00";

  if (coverInputRef.value) {
    coverInputRef.value.value = "";
  }
}

function openCreateDialog() {
  dialogMode.value = "create";
  editingId.value = "";
  resetForm();
  form.institutionNo = generateInstitutionNo();
  dialogOpen.value = true;
}

function inferServicePreset(tags: string[]) {
  let targetValue = serviceOptions[0]?.value ?? "";
  let targetScore = -1;

  serviceOptions.forEach((option) => {
    const score = option.tags.filter((tag) => tags.includes(tag)).length;

    if (score > targetScore) {
      targetValue = option.value;
      targetScore = score;
    }
  });

  return targetScore > 0 ? targetValue : "";
}

function resolveServiceTags(servicePreset: string) {
  return serviceOptions.find((option) => option.value === servicePreset)?.tags ?? [];
}

function triggerCoverSelect() {
  coverInputRef.value?.click();
}

function onCoverChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  const validFormat = /\.(jpe?g|png)$/i.test(file.name);

  if (!validFormat) {
    props.showToast("仅支持 jpg、jpeg、png 格式图片。");
    input.value = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    props.showToast("图片大小不能超过 10MB。");
    input.value = "";
    return;
  }

  form.coverName = file.name;
}

async function openEditDialog(row: InstitutionRecord) {
  try {
    const response = await getAdminInstitutionDetail(row.id);

    dialogMode.value = "edit";
    editingId.value = row.id;
    form.institutionNo = String(response?.institutionNo ?? row.institutionNo);
    form.name = String(response?.name ?? row.name);
    form.region = String(response?.district ?? response?.region ?? row.region);
    form.address = String(response?.address ?? row.address);
    form.contactName = String(response?.contactName ?? row.contactName);
    form.contactPhone = String(response?.contactPhone ?? row.contactPhone);
    form.servicePreset = inferServicePreset(
      Array.isArray(response?.serviceTags) ? (response.serviceTags as string[]) : row.serviceTags,
    );
    form.coverName = String(response?.coverName ?? row.coverName);
    form.businessHours = String(response?.businessHours ?? row.businessHours);
    form.shareCount = `${Number(response?.shareCount ?? row.shareCount)}`;
    form.favoriteCount = `${Number(response?.favoriteCount ?? row.favoriteCount)}`;
    form.note = String(response?.note ?? row.note) === "-" ? "" : String(response?.note ?? row.note);
    form.publishMode = (response?.published ? "immediate" : (response?.publishMode || row.publishMode)) as PublishMode;
    form.publishDate = String(response?.publishDate ?? row.publishDate);
    form.publishTime = String((response?.publishTime ?? row.publishTime) || "12:00");

    if (coverInputRef.value) {
      coverInputRef.value.value = "";
    }

    dialogOpen.value = true;
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "机构详情加载失败，请稍后重试",
    });
  }
}

function closeDialog() {
  dialogOpen.value = false;
  editingId.value = "";

  if (coverInputRef.value) {
    coverInputRef.value.value = "";
  }
}

async function saveInstitution() {
  const name = form.name.trim();
  const address = form.address.trim();
  const contactName = form.contactName.trim() || operatorName;
  const contactPhone = form.contactPhone.trim();
  const serviceTags = resolveServiceTags(form.servicePreset);
  const coverName = form.coverName.trim();
  const businessHours = form.businessHours.trim();
  const shareCount = Number(form.shareCount);
  const favoriteCount = Number(form.favoriteCount);
  const duplicated = rows.value.some((row) => row.institutionNo === form.institutionNo && row.id !== editingId.value);

  if (!name || !address || !contactPhone || !coverName) {
    props.showToast("请完整填写机构基础信息。");
    return;
  }

  if (!/^1\d{10}$/.test(contactPhone)) {
    props.showToast("请输入有效的 11 位手机号。");
    return;
  }

  if (!serviceTags.length) {
    props.showToast("请选择特色服务。");
    return;
  }

  if (!Number.isFinite(shareCount) || shareCount < 0 || !Number.isFinite(favoriteCount) || favoriteCount < 0) {
    props.showToast("分享和收藏数量需为有效数字。");
    return;
  }

  if (duplicated) {
    props.showToast("机构编号已存在。");
    return;
  }

  if (form.publishMode === "scheduled" && (!form.publishDate || !form.publishTime)) {
    props.showToast("请选择定时发布时间。");
    return;
  }

  try {
    const payload = {
      code: form.institutionNo,
      name,
      city: "上海市",
      district: form.region,
      address,
      contactName,
      contactPhone,
      serviceTags,
      note: form.note.trim(),
      coverName,
      businessHours,
      shareCount,
      favoriteCount,
      publishMode: form.publishMode,
      publishDate: form.publishMode === "scheduled" ? form.publishDate : "",
      publishTime: form.publishMode === "scheduled" ? form.publishTime : "12:00",
    };

    let institutionId = editingId.value;

    if (dialogMode.value === "create") {
      const response = await createAdminInstitution(payload);
      institutionId = String(response?.institutionId ?? "");
      props.showToast(`已新增机构：${name}`);
    } else {
      await updateAdminInstitution(editingId.value, payload);
      props.showToast(`已更新机构：${name}`);
    }

    if (institutionId) {
      if (form.publishMode === "immediate") {
        await publishAdminInstitution(institutionId);
      } else {
        await unpublishAdminInstitution(institutionId);
      }
    }

    selectedIds.value = [];
    batchActionOpen.value = false;
    resetPage();
    closeDialog();
    await syncPageData();
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: `${dialogMode.value === "create" ? "新增" : "更新"}机构失败，请稍后重试`,
    });
  }
}

function tagTone(index: number) {
  return index % 2 === 0 ? "feature-tag--mint" : "feature-tag--amber";
}

onMounted(() => {
  void syncPageData();
});
</script>

<template>
  <section class="institution-page">
    <article class="panel-card panel-card--merged">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <div class="filter-grid">
        <label class="filter-item">
          <span class="filter-item__label">发布状态</span>
          <div class="filter-control filter-control--select">
            <select v-model="statusFilter" @change="onFilterChange">
              <option v-for="item in mock.statusOptions" :key="item" :value="item">{{ item }}</option>
            </select>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
            </svg>
          </div>
        </label>

        <div class="filter-item filter-item--date">
          <span class="filter-item__label">更新日期</span>
          <div class="date-range">
            <label class="filter-control filter-control--date">
              <input v-model="dateStart" type="date" @change="onFilterChange" />
            </label>
            <span class="date-range__split">~</span>
            <label class="filter-control filter-control--date">
              <input v-model="dateEnd" type="date" @change="onFilterChange" />
              <svg viewBox="0 0 18 18" focusable="false" aria-hidden="true">
                <rect x="2.5" y="3.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
                <path d="M5.5 2.5v3M12.5 2.5v3M2.5 7.5h13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
              </svg>
            </label>
          </div>
        </div>
      </div>

      <div class="search-row">
        <div class="search-row__main">
          <label class="filter-control filter-control--keyword">
            <input v-model="searchDraft" type="text" placeholder="请输入关键词" @keydown.enter="applySearch" />
          </label>
          <button class="icon-button icon-button--primary" type="button" aria-label="搜索" @click="applySearch">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2" />
              <path d="m16 16 4.2 4.2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
            </svg>
          </button>
          <button class="icon-button" type="button" aria-label="重置" @click="resetFilters">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7v5h5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
              <path d="M7.5 12A6.5 6.5 0 1 0 10 7.4L7 10" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" />
            </svg>
          </button>
        </div>

        <div class="search-row__actions">
          <button class="toolbar-button toolbar-button--primary" type="button" @click="openCreateDialog">新增</button>
          <button class="toolbar-button" :class="{ 'toolbar-button--active': batchActionOpen }" type="button" @click="openBatchActions">
            {{ batchActionOpen ? "完成批量" : "批量操作" }}
          </button>
        </div>
      </div>

      <section class="list-section">
      <header class="list-toolbar">
        <div class="list-toolbar__meta">
          <span>共 {{ filteredRows.length }} 条机构数据</span>
        </div>
      </header>

      <div v-if="batchActionOpen" class="batch-toolbar">
        <span>{{ selectedCount ? `已选 ${selectedCount} 家机构` : "请勾选机构" }}</span>
        <button class="batch-action-button" type="button" @click="applyBatchPublish(true)">批量发布</button>
        <button class="batch-action-button" type="button" @click="applyBatchPublish(false)">批量下架</button>
        <button class="batch-action-button batch-action-button--danger" type="button" @click="requestDeleteRows(selectedIds)">批量删除</button>
      </div>

      <div class="table-scroll">
        <div class="table-head">
          <span class="table-col--name" :class="{ 'table-col--name--batch': batchActionOpen }">
            <label v-if="batchActionOpen" class="selection-anchor selection-anchor--head">
              <input :checked="allChecked" type="checkbox" @change="toggleSelectAll" />
            </label>
            <span>机构名称</span>
          </span>
          <span>特色服务</span>
          <span>分享</span>
          <span>收藏</span>
          <span class="table-col--status">发布状态</span>
          <span>更新人</span>
          <span>最后更新时间</span>
          <span class="table-col--action">操作</span>
        </div>

        <div v-if="pagedRows.length" class="table-list">
          <article v-for="row in pagedRows" :key="row.id" class="table-row">
            <div class="cell cell--name" :class="{ 'cell--name--batch': batchActionOpen }">
              <label v-if="batchActionOpen" class="selection-anchor">
                <input :checked="selectedIds.includes(row.id)" type="checkbox" @change="toggleRowSelection(row.id, $event)" />
              </label>
              <div class="institution-info">
                <strong>{{ row.name }}</strong>
                <span>{{ row.region }} · {{ row.institutionNo }}</span>
              </div>
            </div>
            <div class="cell cell--tags">
              <span v-for="(tag, index) in row.serviceTags" :key="`${row.id}-${tag}`" class="feature-tag" :class="tagTone(index)">
                {{ tag }}
              </span>
            </div>
            <div class="cell cell--count">{{ row.shareCount }}</div>
            <div class="cell cell--count">{{ row.favoriteCount }}</div>
            <div class="cell cell--status">
              <span class="status-badge" :class="{ 'status-badge--draft': !row.published }">
                <i></i>
                {{ row.published ? "已发布" : "未发布" }}
              </span>
            </div>
            <div class="cell">{{ row.updatedBy }}</div>
            <div class="cell cell--time">{{ row.updatedAt }}</div>
            <div class="cell cell--action">
              <button type="button" class="action-link" @click="openEditDialog(row)">编辑</button>
              <button type="button" class="action-link action-link--danger" @click="requestDeleteRows([row.id])">删除</button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">暂无机构数据</div>
      </div>

      <footer class="pagination">
        <span>共{{ filteredRows.length }}条</span>
        <button type="button" class="pagination__ghost pagination__ghost--static">每页{{ pageSize }}条</button>
        <button type="button" class="pagination__ghost" :disabled="currentPage === 1" @click="setCurrentPage(1)">&lt;&lt;</button>
        <button type="button" class="pagination__ghost" :disabled="currentPage === 1" @click="setCurrentPage(currentPage - 1)">&lt;</button>
        <button
          v-for="page in paginationPages"
          :key="`institution-page-${page}`"
          type="button"
          :class="page === currentPage ? 'pagination__active' : 'pagination__ghost'"
          @click="setCurrentPage(page)"
        >
          {{ page }}
        </button>
        <button type="button" class="pagination__ghost" :disabled="currentPage === totalPages" @click="setCurrentPage(currentPage + 1)">&gt;</button>
        <button type="button" class="pagination__ghost" :disabled="currentPage === totalPages" @click="setCurrentPage(totalPages)">&gt;&gt;</button>
        <span>前往第</span>
        <input v-model="pageJump" type="text" inputmode="numeric" @keydown.enter.prevent="jumpToPage" @blur="jumpToPage" />
        <span>页</span>
      </footer>
      </section>
    </article>

    <div v-if="dialogOpen" class="dialog-mask" @click.self="closeDialog">
      <article class="dialog">
        <header class="dialog__header">
          <h2>{{ dialogTitle }}</h2>
          <button class="dialog__close" type="button" @click="closeDialog">×</button>
        </header>

        <div class="dialog__body dialog__body--institution">
          <div class="form-grid form-grid--institution">
            <label class="form-row form-row--full">
              <span class="form-row__label form-row__label--required">机构名称</span>
              <div class="form-row__control">
                <input v-model="form.name" type="text" placeholder="请输入" />
              </div>
            </label>

            <div class="form-row form-row--full form-row--cover">
              <span class="form-row__label form-row__label--required">机构封面</span>
              <div class="form-row__stack">
                <input
                  ref="coverInputRef"
                  class="form-file-input"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  @change="onCoverChange"
                />
                <button class="cover-uploader" :class="{ 'cover-uploader--selected': !!form.coverName }" type="button" @click="triggerCoverSelect">
                  <span class="cover-uploader__symbol">+</span>
                  <span>{{ form.coverName ? "重新上传" : "上传图片" }}</span>
                </button>
                <span v-if="form.coverName" class="cover-uploader__name">{{ form.coverName }}</span>
                <p class="form-row__hint">支持jpg, png等格式文件上传，文件大小不超过10MB</p>
              </div>
            </div>

            <label class="form-row">
              <span class="form-row__label form-row__label--required">特色服务</span>
              <div class="form-row__control form-row__control--select">
                <select v-model="form.servicePreset" required>
                  <option value="" disabled>请选择</option>
                  <option v-for="item in serviceOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
                <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                  <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
                </svg>
              </div>
            </label>

            <label class="form-row">
              <span class="form-row__label">营业时间</span>
              <div class="form-row__control">
                <input v-model="form.businessHours" type="text" placeholder="请输入" />
              </div>
            </label>

            <label class="form-row form-row--full">
              <span class="form-row__label form-row__label--required">机构地址</span>
              <div class="form-row__control">
                <input v-model="form.address" type="text" placeholder="请输入" />
              </div>
            </label>

            <label class="form-row">
              <span class="form-row__label form-row__label--required">联系电话</span>
              <div class="form-row__control">
                <input v-model="form.contactPhone" type="text" placeholder="请输入" />
              </div>
            </label>

            <div class="form-row form-row--full form-row--publish">
              <span class="form-row__label">发布时间</span>
              <div class="publish-settings">
                <label class="publish-option">
                  <input v-model="form.publishMode" type="radio" value="immediate" />
                  <span class="publish-option__indicator"></span>
                  <span class="publish-option__text">立即发布</span>
                </label>

                <div class="publish-schedule">
                  <label class="publish-option">
                    <input v-model="form.publishMode" type="radio" value="scheduled" />
                    <span class="publish-option__indicator"></span>
                    <span class="publish-option__text">定时发布</span>
                  </label>

                  <div class="publish-schedule__controls">
                    <label class="publish-field" :class="{ 'publish-field--disabled': form.publishMode !== 'scheduled' }">
                      <input v-model="form.publishDate" type="date" :disabled="form.publishMode !== 'scheduled'" />
                      <svg viewBox="0 0 18 18" focusable="false" aria-hidden="true">
                        <rect x="2.5" y="3.5" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6" />
                        <path d="M5.5 2.5v3M12.5 2.5v3M2.5 7.5h13" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6" />
                      </svg>
                    </label>

                    <label class="publish-field publish-field--time" :class="{ 'publish-field--disabled': form.publishMode !== 'scheduled' }">
                      <input v-model="form.publishTime" type="time" :disabled="form.publishMode !== 'scheduled'" />
                      <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                        <circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" stroke-width="1.8" />
                        <path d="M10 6.4v3.9l2.7 1.7" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" />
                      </svg>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="dialog__footer">
          <button class="dialog-button dialog-button--ghost" type="button" @click="closeDialog">取消</button>
          <button class="dialog-button dialog-button--primary" type="button" @click="saveInstitution">保存</button>
        </footer>
      </article>
    </div>

    <div v-if="deleteDialogOpen" class="dialog-mask" @click.self="closeDeleteDialog">
      <article class="dialog dialog--confirm">
        <header class="dialog__header">
          <h2>删除确认</h2>
          <button class="dialog__close" type="button" @click="closeDeleteDialog">×</button>
        </header>

        <div class="dialog__body dialog__body--compact">
          <p class="confirm-text">{{ deleteDialogMessage }}</p>
        </div>

        <footer class="dialog__footer">
          <button class="dialog-button dialog-button--ghost" type="button" @click="closeDeleteDialog">取消</button>
          <button class="dialog-button dialog-button--danger" type="button" @click="confirmDelete">确定删除</button>
        </footer>
      </article>
    </div>
  </section>
</template>

<style scoped>
.institution-page {
  display: grid;
  gap: 18px;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.panel-card {
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
  border: 1px solid #edf3ef;
}

.panel-card--merged {
  padding: 24px 24px 18px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.section-head__accent {
  width: 6px;
  height: 22px;
  border-radius: 999px;
  background: #10c89a;
}

.section-head h1 {
  margin: 0;
  color: #2f3946;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
  gap: 26px 34px;
  align-items: center;
}

.filter-item {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.filter-item--date {
  grid-template-columns: 56px minmax(0, 1fr);
}

.filter-item__label {
  color: #7d8792;
  font-size: 13px;
}

.filter-control {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #e9efec;
  border-radius: 10px;
  background: #ffffff;
}

.filter-control input,
.filter-control select {
  width: 100%;
  border: 0;
  background: transparent;
  color: #44515d;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  outline: none;
}

.filter-control input::placeholder {
  color: #c1c8cf;
}

.filter-control svg {
  width: 16px;
  height: 16px;
  color: #c2c8ce;
  pointer-events: none;
}

.filter-control--select {
  position: relative;
}

.filter-control--select select {
  appearance: none;
  padding-right: 20px;
}

.filter-control--select svg {
  position: absolute;
  right: 12px;
}

.filter-control--keyword {
  flex: 1;
  min-width: 0;
}

.filter-control--date {
  padding-right: 40px;
}

.filter-control--date svg {
  position: absolute;
  right: 12px;
}

.filter-control--date input::-webkit-calendar-picker-indicator {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.date-range {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
}

.date-range__split {
  color: #a8b0b7;
  text-align: center;
}

.search-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;
}

.search-row__main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-row__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
}

.list-section {
  margin-top: 28px;
}

.icon-button {
  width: 42px;
  height: 42px;
  border: 1px solid #dfe7e3;
  border-radius: 10px;
  background: #ffffff;
  color: #4d5966;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.icon-button svg {
  width: 20px;
  height: 20px;
}

.icon-button--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.list-toolbar__meta {
  color: #98a3ae;
  font-size: 12px;
}

.toolbar-button {
  min-width: 84px;
  height: 42px;
  padding: 0 24px;
  border: 1px solid #dfe7e3;
  border-radius: 8px;
  background: #ffffff;
  color: #34404d;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.toolbar-button--primary,
.toolbar-button--active {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.batch-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f7fbf9;
  color: #7a8791;
  font-size: 12px;
  flex-wrap: wrap;
}

.batch-action-button {
  min-width: 92px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid #dfe7e3;
  border-radius: 8px;
  background: #ffffff;
  color: #34404d;
  font-size: 12px;
  cursor: pointer;
}

.batch-action-button--danger {
  color: #e46761;
  border-color: #f0d2d0;
}

.table-scroll {
  overflow-x: auto;
}

.table-head,
.table-row {
  min-width: 1184px;
  display: grid;
  grid-template-columns:
    minmax(230px, 1.5fr)
    minmax(210px, 1.4fr)
    minmax(78px, 0.58fr)
    minmax(78px, 0.58fr)
    minmax(110px, 0.8fr)
    minmax(96px, 0.7fr)
    minmax(170px, 1fr)
    minmax(110px, 0.8fr);
  align-items: center;
}

.table-head {
  padding: 15px 0;
  border: 1px solid #eef2ef;
  background: #fafafa;
  color: #2f3946;
  font-size: 12px;
  font-weight: 500;
}

.table-head > span {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0 14px;
  line-height: 1.45;
}

.table-col--name {
  position: relative;
}

.table-col--name--batch {
  padding-left: 56px;
}

.table-col--status,
.table-col--action {
  justify-content: center;
}

.table-list {
  border: 1px solid #eef2ef;
  border-top: 0;
}

.table-row {
  border-top: 1px solid #eef2ef;
  background: #ffffff;
}

.table-row:first-child {
  border-top: 0;
}

.cell {
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 16px 14px;
  color: #2f3946;
  font-size: 12px;
  line-height: 1.45;
}

.selection-anchor {
  position: absolute;
  left: 14px;
  top: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  transform: translateY(-50%);
}

.selection-anchor--head {
  left: 14px;
}

.selection-anchor input {
  margin: 0;
  display: block;
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  accent-color: #39cf9d;
  cursor: pointer;
}

.institution-info {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.institution-info strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303b47;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.institution-info span {
  color: #98a3ae;
  font-size: 12px;
  line-height: 1.35;
}

.cell--name {
  position: relative;
}

.cell--name--batch {
  padding-left: 56px;
}

.cell--tags {
  gap: 6px 8px;
  flex-wrap: wrap;
}

.feature-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 9px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
}

.feature-tag--mint {
  background: #effbf6;
  color: #28c691;
}

.feature-tag--amber {
  background: #fff8e9;
  color: #f2ba43;
}

.cell--count,
.cell--status,
.cell--action {
  justify-content: center;
}

.cell--action {
  gap: 14px;
}

.cell--time {
  white-space: nowrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #37cb98;
  font-size: 13px;
  line-height: 1;
}

.status-badge i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}

.status-badge--draft {
  color: #b5bec7;
}

.action-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: #39cf9d;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
}

.action-link--danger {
  color: #ff6c63;
}

.empty-state {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #eef2ef;
  color: #9ba8b5;
  font-size: 14px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 24px 0 0;
  color: #8f9aa5;
  font-size: 12px;
  flex-wrap: wrap;
}

.pagination__ghost,
.pagination__active,
.pagination input {
  height: 42px;
  min-width: 42px;
  padding: 0 14px;
  border: 1px solid #eef2ef;
  border-radius: 8px;
  background: #ffffff;
  color: #55616d;
  font-size: 13px;
  font-weight: 500;
}

.pagination__ghost,
.pagination__active {
  cursor: pointer;
}

.pagination__ghost--static {
  cursor: default;
}

.pagination__active {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.pagination__ghost:disabled {
  cursor: not-allowed;
  border-color: #eef2ef;
  background: #f7f9fa;
  color: #b8c0c8;
}

.pagination input {
  width: 52px;
  text-align: center;
  outline: none;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(12, 21, 28, 0.42);
}

.dialog {
  width: min(980px, 100%);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 30px 80px rgba(10, 26, 20, 0.24);
  overflow: hidden;
}

.dialog--confirm {
  width: min(420px, 100%);
}

.dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px;
  border-bottom: 1px solid #eef3ef;
}

.dialog__header h2 {
  margin: 0;
  color: #22303d;
  font-size: 18px;
  font-weight: 600;
}

.dialog__close {
  width: 32px;
  height: 32px;
  border: 1px solid #e3ebe6;
  border-radius: 50%;
  background: #ffffff;
  color: #647380;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.dialog__body {
  padding: 22px;
  max-height: min(78vh, 860px);
  overflow: auto;
}

.dialog__body--compact {
  max-height: none;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 28px;
}

.form-grid--institution {
  align-items: start;
}

.form-row {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  align-items: start;
  gap: 14px;
}

.form-row--full {
  grid-column: 1 / -1;
}

.form-row--cover,
.form-row--publish {
  align-items: start;
}

.form-row__label {
  padding-top: 10px;
  color: #8f9aa6;
  font-size: 13px;
}

.form-row__label--required::after {
  content: "*";
  margin-left: 2px;
  color: #ff7f76;
}

.form-row__control {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #e9efec;
  border-radius: 10px;
  background: #ffffff;
}

.form-row__control input,
.form-row__control select {
  width: 100%;
  border: 0;
  background: transparent;
  color: #42505c;
  font-size: 14px;
  outline: none;
}

.form-row__control input::placeholder {
  color: #c3c9cf;
}

.form-row__control--select {
  position: relative;
}

.form-row__control--select select {
  appearance: none;
  padding-right: 20px;
  color: #42505c;
}

.form-row__control--select select:invalid {
  color: #c3c9cf;
}

.form-row__control--select svg {
  position: absolute;
  right: 14px;
  width: 16px;
  height: 16px;
  color: #c2c8ce;
  pointer-events: none;
}

.form-row__stack {
  display: grid;
  justify-items: start;
  gap: 12px;
}

.form-file-input {
  display: none;
}

.form-row__hint {
  margin: 0;
  color: #c3c9cf;
  font-size: 12px;
  line-height: 1.6;
}

.cover-uploader {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 300px;
  height: 180px;
  border: 1px dashed #dfe7e3;
  border-radius: 12px;
  background: #ffffff;
  color: #c3c9cf;
  font-size: 16px;
  cursor: pointer;
}

.cover-uploader--selected {
  border-style: solid;
  color: #7b8894;
  background: #f9fbfa;
}

.cover-uploader__symbol {
  font-size: 24px;
  line-height: 1;
  font-weight: 300;
}

.cover-uploader__name {
  color: #7b8894;
  font-size: 12px;
}

.publish-settings {
  display: grid;
  gap: 16px;
  padding-top: 2px;
}

.publish-schedule {
  display: grid;
  gap: 12px;
}

.publish-schedule__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding-left: 34px;
}

.publish-option {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #41515f;
  font-size: 14px;
  cursor: pointer;
}

.publish-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.publish-option__indicator {
  position: relative;
  width: 24px;
  height: 24px;
  border: 1px solid #cfd7dc;
  border-radius: 50%;
  background: #ffffff;
  flex: 0 0 24px;
}

.publish-option__indicator::after {
  content: "";
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: #39cf9d;
  transform: scale(0);
  transition: transform 0.18s ease;
}

.publish-option input:checked + .publish-option__indicator {
  border-color: #39cf9d;
}

.publish-option input:checked + .publish-option__indicator::after {
  transform: scale(1);
}

.publish-field {
  position: relative;
  display: flex;
  align-items: center;
  width: 340px;
  min-height: 44px;
  padding: 0 42px 0 14px;
  border: 1px solid #e9efec;
  border-radius: 10px;
  background: #ffffff;
}

.publish-field--time {
  width: 200px;
}

.publish-field input {
  width: 100%;
  border: 0;
  background: transparent;
  color: #42505c;
  font-size: 14px;
  outline: none;
  color-scheme: light;
}

.publish-field input::-webkit-calendar-picker-indicator {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.publish-field svg {
  position: absolute;
  right: 14px;
  width: 20px;
  height: 20px;
  color: #c6ccd1;
  pointer-events: none;
}

.publish-field--disabled {
  background: #f6f8f7;
}

.publish-field--disabled input {
  color: #c3c9cf;
}

.confirm-text {
  margin: 0;
  color: #41515f;
  font-size: 14px;
  line-height: 1.8;
}

.dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 22px 22px;
  border-top: 1px solid #eef3ef;
}

.dialog-button {
  min-width: 96px;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid #dfe7e3;
  background: #ffffff;
  color: #34404d;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.dialog-button--primary {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.dialog-button--danger {
  border-color: #e85f5b;
  background: #e85f5b;
  color: #ffffff;
}

@media (max-width: 1080px) {
  .filter-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .date-range {
    grid-template-columns: 1fr;
  }

  .date-range__split {
    display: none;
  }

  .search-row,
  .search-row__main,
  .search-row__actions,
  .list-toolbar {
    flex-wrap: wrap;
  }

  .filter-control--keyword {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-row,
  .form-row--full {
    grid-column: auto;
  }

  .publish-field {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .panel-card--merged {
    padding: 18px 16px;
  }

  .filter-item,
  .filter-item--date {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .toolbar-button {
    min-width: 100px;
    height: 46px;
    padding: 0 18px;
  }

  .search-row__actions {
    width: 100%;
  }

  .dialog-mask {
    padding: 12px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .form-row__label {
    padding-top: 0;
  }

  .cover-uploader {
    width: 100%;
    max-width: 300px;
  }

  .publish-schedule__controls {
    padding-left: 0;
  }

  .publish-field,
  .publish-field--time {
    width: 100%;
  }
}
</style>
