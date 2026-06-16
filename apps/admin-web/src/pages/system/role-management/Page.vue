<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  batchUpdateAdminAccountStatus,
  createAdminAccount,
  deleteAdminAccount,
  getAdminAccounts,
  updateAdminAccount,
  updateAdminAccountStatus,
} from "@/shared/api/system";
import { handleAdminPageError } from "@/shared/api/error";
import AdminUserAvatar from "@/components/AdminUserAvatar.vue";
import mockSeed, { type RoleCategory, type RoleManagementRow } from "./mock";

type RoleFilter = "全部" | RoleCategory;
type PermissionKey = "user-view" | "user-detail" | "user-create" | "user-delete" | "user-tag";

const props = defineProps<PageComponentProps>();

const mock = ref<typeof mockSeed>(mockSeed);
const rows = ref<RoleManagementRow[]>(mockSeed.rows.map((row) => ({ ...row })));
const roleFilters = computed<RoleFilter[]>(() => ["全部", ...(mock.value.roleOptions as RoleCategory[])]);
const activeRole = ref<RoleFilter>("全部");
const searchDraft = ref("");
const searchKeyword = ref("");
const currentPage = ref(1);
const pageJump = ref("1");
const pageSize = 10;
const batchMode = ref(false);
const selectedIds = ref<string[]>([]);
const formDialogOpen = ref(false);
const formMode = ref<"create" | "edit">("create");
const editingRowId = ref("");
const deleteDialogOpen = ref(false);
const deleteDialogMessage = ref("");
const pendingDeleteIds = ref<string[]>([]);
const platformAdminRole: RoleCategory = "平台管理员";

const operatorName = "李明明";

const form = reactive({
  employeeNo: "",
  employeeName: "",
  role: mockSeed.roleOptions[0] as RoleCategory,
  phone: "",
  password: "",
  note: "",
  enabled: true,
});

const permissionLeafOptions: Array<{ key: PermissionKey; label: string }> = [
  { key: "user-view", label: "查看用户" },
  { key: "user-detail", label: "用户详情" },
  { key: "user-create", label: "新增用户" },
  { key: "user-delete", label: "删除用户" },
  { key: "user-tag", label: "添加标签" },
];

const rolePermissionMap: Record<RoleCategory, PermissionKey[]> = {
  平台管理员: ["user-view", "user-detail", "user-create", "user-delete", "user-tag"],
  客服人员: ["user-view", "user-detail"],
  机构主管: ["user-view", "user-detail"],
};

const filteredRows = computed(() => {
  const baseRows = activeRole.value === "全部" ? rows.value : rows.value.filter((row) => row.role === activeRole.value);
  const keyword = searchKeyword.value.trim();

  if (!keyword) {
    return baseRows;
  }

  return baseRows.filter((row) =>
    [row.employeeNo, row.employeeName, row.role, row.phone, row.note, row.updatedBy].some((value) => value.includes(keyword)),
  );
});
const totalPages = computed(() => Math.max(Math.ceil(filteredRows.value.length / pageSize), 1));
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredRows.value.slice(start, start + pageSize);
});
const currentPageRowIds = computed(() => pagedRows.value.map((row) => row.id));
const paginationPages = computed(() => buildPaginationPages(totalPages.value));
const selectedRows = computed(() => filteredRows.value.filter((row) => selectedIds.value.includes(row.id)));
const allChecked = computed(
  () => currentPageRowIds.value.length > 0 && currentPageRowIds.value.every((id) => selectedIds.value.includes(id)),
);
const selectionSummary = computed(() =>
  batchMode.value ? (selectedRows.value.length ? `已选 ${selectedRows.value.length} 人` : "请勾选人员") : "",
);
const formTitle = computed(() => (formMode.value === "create" ? "新增人员" : "编辑人员"));
const activePermissionKeys = computed(() => rolePermissionMap[form.role]);
function permissionState(key: PermissionKey) {
  return activePermissionKeys.value.includes(key) ? "checked" : "crossed";
}

function isPlatformAdmin(role: RoleCategory) {
  return role === platformAdminRole;
}

function statusLocked(role: RoleCategory) {
  return isPlatformAdmin(role);
}

function formatNow() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
}

function buildPaginationPages(totalPageCount: number) {
  return Array.from({ length: totalPageCount }, (_, index) => index + 1);
}

async function syncPageData() {
  try {
    const response = await getAdminAccounts({
      page: 1,
      pageSize: 200,
    });
    const roleOptions = Array.isArray(response?.roleOptions) && response.roleOptions.length
      ? (response.roleOptions as RoleCategory[])
      : mockSeed.roleOptions;

    mock.value = {
      ...mock.value,
      title: String(response?.title ?? mockSeed.title),
      roleOptions,
    };
    rows.value = Array.isArray(response?.rows)
      ? (response.rows as RoleManagementRow[]).map((row) => ({ ...row }))
      : [];

    if (activeRole.value !== "全部" && !roleOptions.includes(activeRole.value)) {
      activeRole.value = "全部";
    }

    if (!roleOptions.includes(form.role)) {
      form.role = roleOptions[0] as RoleCategory;
    }
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "角色管理列表加载失败，已回退到演示数据",
    });
  }
}

function setActiveRole(role: RoleFilter) {
  activeRole.value = role;
  currentPage.value = 1;
  selectedIds.value = [];
}

function applySearch() {
  searchKeyword.value = searchDraft.value.trim();
  currentPage.value = 1;
  selectedIds.value = [];
}

watch(totalPages, (pageCount) => {
  if (currentPage.value > pageCount) {
    currentPage.value = pageCount;
  }
});

watch(currentPage, (page) => {
  pageJump.value = `${page}`;
});

function toggleBatchMode() {
  batchMode.value = !batchMode.value;

  if (!batchMode.value) {
    selectedIds.value = [];
  }
}

function clearBatchSelection() {
  selectedIds.value = [];
}

function toggleSelectAll(checked: boolean) {
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

function onToggleAll(event: Event) {
  toggleSelectAll((event.target as HTMLInputElement).checked);
}

function onToggleRow(id: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  const nextIds = new Set(selectedIds.value);

  if (checked) {
    nextIds.add(id);
  } else {
    nextIds.delete(id);
  }

  selectedIds.value = Array.from(nextIds);
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

function openCreateDialog() {
  formMode.value = "create";
  editingRowId.value = "";
  form.employeeNo = "";
  form.employeeName = "";
  form.role = activeRole.value === "全部" ? mock.value.roleOptions[0] : activeRole.value;
  form.phone = "";
  form.password = "";
  form.note = "";
  form.enabled = true;
  formDialogOpen.value = true;
}

function openEditDialog(row: RoleManagementRow) {
  formMode.value = "edit";
  editingRowId.value = row.id;
  form.employeeNo = row.employeeNo;
  form.employeeName = row.employeeName;
  form.role = row.role;
  form.phone = row.phone;
  form.password = row.password;
  form.note = row.note === "-" ? "" : row.note;
  form.enabled = row.enabled;
  formDialogOpen.value = true;
}

function closeFormDialog() {
  formDialogOpen.value = false;
  editingRowId.value = "";
}

function generateEmployeeNo() {
  const maxValue = rows.value.reduce((max, row) => {
    const current = Number(row.employeeNo);
    return Number.isFinite(current) ? Math.max(max, current) : max;
  }, 4001009000);

  return String(maxValue + 1);
}

function openAvatarUploader() {
  props.showToast("上传头像功能为演示状态");
}

async function saveRoleMember() {
  const employeeName = form.employeeName.trim();
  const phone = form.phone.trim();
  const password = form.password.trim();
  const employeeNo = formMode.value === "create" ? generateEmployeeNo() : form.employeeNo.trim();
  const isPlatformAdminRole = isPlatformAdmin(form.role);
  const restPlatformAdminCount = rows.value.filter(
    (row) => row.id !== editingRowId.value && isPlatformAdmin(row.role),
  ).length;

  if (!employeeName) {
    props.showToast("请输入姓名。");
    return;
  }

  if (!phone) {
    props.showToast("请输入手机号。");
    return;
  }

  if (!password) {
    props.showToast("请输入登录密码。");
    return;
  }

  if (!/^1\d{10}$/.test(phone)) {
    props.showToast("请输入有效的 11 位手机号。");
    return;
  }

  const duplicated = rows.value.some((row) => row.employeeNo === employeeNo && row.id !== editingRowId.value);

  if (duplicated) {
    props.showToast("该员工编号已存在。");
    return;
  }

  if (isPlatformAdminRole && restPlatformAdminCount >= 2) {
    props.showToast("平台管理员最多保留两人。");
    return;
  }

  try {
    const payload = {
      employeeNo,
      employeeName,
      role: form.role,
      phone,
      password,
      note: form.note.trim(),
      enabled: isPlatformAdminRole ? true : form.enabled,
    };

    if (formMode.value === "create") {
      await createAdminAccount(payload);
      props.showToast(`已新增人员：${employeeName}`);
    } else {
      await updateAdminAccount(editingRowId.value, payload);
      props.showToast(`已更新人员：${employeeName}`);
    }

    activeRole.value = form.role;
    currentPage.value = 1;
    closeFormDialog();
    await syncPageData();
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: `${formMode.value === "create" ? "新增" : "更新"}人员失败，请稍后重试`,
    });
  }
}

async function toggleStatus(row: RoleManagementRow) {
  if (statusLocked(row.role)) {
    props.showToast("平台管理员启用状态不可修改。");
    return;
  }

  try {
    await updateAdminAccountStatus(row.id, {
      enabled: !row.enabled,
    });
    row.enabled = !row.enabled;
    row.updatedBy = operatorName;
    row.updatedAt = formatNow();
    props.showToast(`${row.employeeName}已${row.enabled ? "启用" : "停用"}`);
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "更新账号状态失败，请稍后重试",
    });
  }
}

function toggleFormStatus() {
  if (statusLocked(form.role)) {
    return;
  }

  form.enabled = !form.enabled;
}

function handleRoleChange() {
  if (isPlatformAdmin(form.role)) {
    form.enabled = true;
  }
}

function requestDeleteRows(targetRows: RoleManagementRow[]) {
  if (!targetRows.length) {
    props.showToast("请先勾选需要操作的人员。");
    return;
  }

  pendingDeleteIds.value = Array.from(new Set(targetRows.map((row) => row.id)));
  deleteDialogMessage.value =
    pendingDeleteIds.value.length === 1
      ? "删除后该人员将从列表移除，确定继续吗？"
      : `将删除 ${pendingDeleteIds.value.length} 位人员，删除后不可恢复，确定继续吗？`;
  deleteDialogOpen.value = true;
}

function closeDeleteDialog() {
  deleteDialogOpen.value = false;
  deleteDialogMessage.value = "";
  pendingDeleteIds.value = [];
}

async function confirmDelete() {
  if (!pendingDeleteIds.value.length) {
    closeDeleteDialog();
    return;
  }

  const deleteSet = new Set(pendingDeleteIds.value);
  const deleteCount = deleteSet.size;

  try {
    await Promise.all(Array.from(deleteSet).map((id) => deleteAdminAccount(id)));
    rows.value = rows.value.filter((row) => !deleteSet.has(row.id));
    selectedIds.value = selectedIds.value.filter((id) => !deleteSet.has(id));
    closeDeleteDialog();
    props.showToast(deleteCount === 1 ? "人员已删除" : `已删除 ${deleteCount} 位人员`);
    await syncPageData();
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "删除人员失败，请稍后重试",
    });
  }
}

async function handleBatchAction(action: "enable" | "disable" | "delete") {
  const targets = selectedRows.value;

  if (!targets.length) {
    props.showToast("请先勾选需要操作的人员。");
    return;
  }

  if (action === "delete") {
    requestDeleteRows(targets);
    return;
  }

  const editableTargets = targets.filter((row) => !statusLocked(row.role));
  const lockedCount = targets.length - editableTargets.length;

  if (!editableTargets.length) {
    props.showToast("平台管理员启用状态不可通过批量操作修改。");
    return;
  }

  try {
    await batchUpdateAdminAccountStatus({
      accountIds: editableTargets.map((row) => row.id),
      enabled: action === "enable",
    });

    editableTargets.forEach((row) => {
      row.enabled = action === "enable";
      row.updatedBy = operatorName;
      row.updatedAt = formatNow();
    });

    const actionText = action === "enable" ? "批量启用" : "批量停用";
    props.showToast(
      lockedCount ? `${actionText} ${editableTargets.length} 位人员，已跳过 ${lockedCount} 位平台管理员` : `${actionText} ${editableTargets.length} 位人员`,
    );
    await syncPageData();
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: `${action === "enable" ? "批量启用" : "批量停用"}失败，请稍后重试`,
    });
  }
}

onMounted(() => {
  void syncPageData();
});
</script>

<template>
  <section class="role-page">
    <article class="role-panel role-panel--content">
      <header class="section-head">
        <span class="section-head__accent"></span>
        <h1>{{ mock.title }}</h1>
      </header>

      <header class="toolbar">
        <div class="toolbar__top">
          <div class="toolbar-search">
            <label class="toolbar-search__field">
              <input v-model="searchDraft" type="text" placeholder="搜索员工姓名/编号/手机号" @keydown.enter="applySearch" />
            </label>
            <button class="toolbar-search__button" type="button" aria-label="搜索" @click="applySearch">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2" />
                <path d="m16 16 4.2 4.2" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
              </svg>
            </button>
          </div>

          <div class="toolbar__actions">
            <button class="toolbar-button toolbar-button--primary" type="button" @click="openCreateDialog">新增</button>
            <button v-if="batchMode && selectedIds.length" class="toolbar-button" type="button" @click="clearBatchSelection">清空勾选</button>
            <button class="toolbar-button" :class="{ 'toolbar-button--active': batchMode }" type="button" @click="toggleBatchMode">
              {{ batchMode ? "完成批量" : "批量操作" }}
            </button>
          </div>
        </div>

        <div class="toolbar__bottom">
          <div class="role-tabs">
            <button
              v-for="item in roleFilters"
              :key="item"
              class="role-tabs__item"
              :class="{ 'role-tabs__item--active': activeRole === item }"
              type="button"
              @click="setActiveRole(item)"
            >
              {{ item }}
            </button>
          </div>
        </div>
      </header>

      <div class="toolbar__summary">
        <span>{{ activeRole === "全部" ? `全部角色共 ${filteredRows.length} 人` : `${activeRole}下共 ${filteredRows.length} 人` }}</span>
        <strong v-if="selectionSummary">{{ selectionSummary }}</strong>
      </div>

      <div v-if="batchMode" class="batch-action-row">
        <button class="batch-action-button" type="button" @click="handleBatchAction('enable')">批量启用</button>
        <button class="batch-action-button" type="button" @click="handleBatchAction('disable')">批量停用</button>
        <button class="batch-action-button batch-action-button--danger" type="button" @click="handleBatchAction('delete')">批量删除</button>
      </div>

      <div class="table-scroll">
        <div class="table-head" :class="{ 'table-head--batch': batchMode }">
          <span v-if="batchMode" class="col-check">
            <input :checked="allChecked" type="checkbox" @change="onToggleAll" />
          </span>
          <span class="table-col--no">员工编号</span>
          <span class="table-col--name">姓名</span>
          <span class="table-col--role">角色</span>
          <span>手机号码</span>
          <span>备注</span>
          <span>更新人</span>
          <span>最后更新时间</span>
          <span class="table-col--status">状态</span>
          <span class="table-col--action">操作</span>
        </div>

        <div v-if="pagedRows.length" class="table-list">
          <article v-for="row in pagedRows" :key="row.id" class="table-row" :class="{ 'table-row--batch': batchMode }">
            <div v-if="batchMode" class="cell col-check">
              <input :checked="selectedIds.includes(row.id)" type="checkbox" @change="onToggleRow(row.id, $event)" />
            </div>

            <div class="cell cell--no">{{ row.employeeNo }}</div>
            <div class="cell cell--strong">{{ row.employeeName }}</div>
            <div class="cell cell--role">{{ row.role }}</div>
            <div class="cell cell--phone">{{ row.phone }}</div>
            <div class="cell cell--note" :title="row.note">{{ row.note }}</div>
            <div class="cell cell--updater">{{ row.updatedBy }}</div>
            <div class="cell cell--time">{{ row.updatedAt }}</div>
            <div class="cell cell--status">
              <button
                class="status-switch"
                :class="{
                  'status-switch--active': row.enabled,
                  'status-switch--disabled': statusLocked(row.role),
                }"
                :disabled="statusLocked(row.role)"
                :title="statusLocked(row.role) ? '平台管理员启用状态不可修改' : ''"
                type="button"
                @click="toggleStatus(row)"
              >
                <span class="status-switch__thumb"></span>
                <span class="status-switch__label">{{ row.enabled ? "启用" : "停用" }}</span>
              </button>
            </div>
            <div class="cell cell--action">
              <button type="button" class="action-link" @click="openEditDialog(row)">编辑</button>
              <button type="button" class="action-link action-link--danger" @click="requestDeleteRows([row])">删除</button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">当前角色下暂无人员数据</div>
      </div>

      <footer class="pagination">
        <span>共{{ filteredRows.length }}条</span>
        <button type="button" class="pagination__ghost pagination__ghost--static">每页{{ pageSize }}条</button>
        <button type="button" class="pagination__ghost" :disabled="currentPage === 1" @click="setCurrentPage(1)">&lt;&lt;</button>
        <button type="button" class="pagination__ghost" :disabled="currentPage === 1" @click="setCurrentPage(currentPage - 1)">&lt;</button>
        <button
          v-for="page in paginationPages"
          :key="`page-${page}`"
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
    </article>

    <div v-if="formDialogOpen" class="dialog-mask" @click.self="closeFormDialog">
      <article class="dialog">
        <header class="dialog__header">
          <h2>{{ formTitle }}</h2>
          <button class="dialog__close" type="button" @click="closeFormDialog">×</button>
        </header>

        <div class="dialog__body">
          <div class="form-grid">
            <label class="form-row">
              <span class="form-row__label form-row__label--required">姓名</span>
              <div class="form-row__stack">
                <div class="form-row__control">
                  <input v-model="form.employeeName" type="text" placeholder="请输入" />
                </div>
              </div>
            </label>

            <label v-if="formMode === 'edit'" class="form-row form-row--employee-no">
              <span class="form-row__label">员工编号</span>
              <div class="form-row__stack">
                <div class="form-row__control form-row__control--readonly">
                  <input :value="form.employeeNo" type="text" readonly />
                </div>
              </div>
            </label>

            <div class="form-row form-row--avatar">
              <span class="form-row__label">头像</span>
              <button class="avatar-uploader" type="button" @click="openAvatarUploader">
                <span class="avatar-uploader__preview">
                  <AdminUserAvatar :name="form.employeeName || '登录账号'" :size="62" alt="登录账号头像" />
                </span>
                <span class="avatar-uploader__text">+点击上传</span>
              </button>
            </div>

            <label class="form-row">
              <span class="form-row__label form-row__label--required">手机号码</span>
              <div class="form-row__stack">
                <div class="form-row__control">
                  <input v-model="form.phone" type="text" placeholder="请输入" />
                </div>
                <small class="form-row__helper">登录账号，请确认填写的信息正确</small>
              </div>
            </label>

            <label class="form-row">
              <span class="form-row__label">角色</span>
              <div class="form-row__stack">
                <div class="form-row__control form-row__control--select">
                  <select v-model="form.role" @change="handleRoleChange">
                    <option v-for="item in mock.roleOptions" :key="item" :value="item">{{ item }}</option>
                  </select>
                  <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                    <path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" />
                  </svg>
                </div>
              </div>
            </label>

            <label class="form-row">
              <span class="form-row__label form-row__label--required">登录密码</span>
              <div class="form-row__stack">
                <div class="form-row__control">
                  <input v-model="form.password" type="text" placeholder="请输入" />
                </div>
              </div>
            </label>

            <label class="form-row form-row--span2">
              <span class="form-row__label">状态</span>
              <button
                class="status-switch status-switch--form"
                :class="{
                  'status-switch--active': form.enabled,
                  'status-switch--disabled': statusLocked(form.role),
                }"
                :disabled="statusLocked(form.role)"
                type="button"
                @click="toggleFormStatus"
              >
                <span class="status-switch__thumb"></span>
                <span class="status-switch__label">{{ form.enabled ? "启用" : "停用" }}</span>
              </button>
            </label>

            <label class="form-row form-row--textarea form-row--span3">
              <span class="form-row__label">备注</span>
              <div class="form-row__stack">
                <div class="form-row__control form-row__control--textarea">
                  <textarea v-model="form.note" placeholder="请输入"></textarea>
                </div>
              </div>
            </label>

            <section class="permission-section form-row--span3">
            <h3>角色权限</h3>

            <div class="permission-leaf-grid">
              <div v-for="item in permissionLeafOptions" :key="item.key" class="permission-node permission-node--leaf">
                <span class="permission-check" :class="`permission-check--${permissionState(item.key)}`" aria-hidden="true"></span>
                <span>{{ item.label }}</span>
              </div>
            </div>
            </section>
          </div>
        </div>

        <footer class="dialog__footer">
          <button class="dialog-button dialog-button--ghost" type="button" @click="closeFormDialog">取消</button>
          <button class="dialog-button dialog-button--primary" type="button" @click="saveRoleMember">保存</button>
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
.role-page {
  display: grid;
  gap: 18px;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.role-panel {
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.role-panel--content {
  padding: 16px 18px 18px;
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

.toolbar {
  display: grid;
  gap: 12px;
  padding: 4px 6px 0;
}

.toolbar__top,
.toolbar__bottom {
  display: flex;
  align-items: center;
  gap: 14px;
}

.toolbar-search {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-search__field {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 28px;
  border: 1px solid #dfe7e3;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(59, 103, 82, 0.05);
}

.toolbar-search__field input {
  width: 100%;
  border: 0;
  background: transparent;
  color: #42505c;
  font-size: 13px;
  outline: none;
}

.toolbar-search__field input::placeholder {
  color: #b8c0c7;
}

.toolbar-search__button {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 999px;
  background: #39cf9d;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 20px rgba(57, 207, 157, 0.22);
  cursor: pointer;
}

.toolbar-search__button svg {
  width: 18px;
  height: 18px;
}

.role-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 5px;
  overflow-x: auto;
  border-radius: 999px;
  background: #f2f4f6;
}

.role-tabs__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 84px;
  height: 38px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #52606d;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.role-tabs__item--active {
  color: #33c39a;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
}

.toolbar__summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 0 6px 12px;
  color: #7d8792;
  font-size: 12px;
  letter-spacing: 0.01em;
  flex-wrap: wrap;
}

.toolbar__summary strong {
  color: #39cf9d;
  font-weight: 500;
}

.toolbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
  flex-wrap: wrap;
}

.toolbar-button {
  min-width: 120px;
  height: 44px;
  padding: 0 22px;
  border: 1px solid #dfe7e3;
  border-radius: 999px;
  background: #ffffff;
  color: #34404d;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
}

.toolbar-button--primary,
.toolbar-button--active {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.batch-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 6px 12px;
}

.batch-action-button {
  min-width: 88px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #dfe7e3;
  border-radius: 8px;
  background: #ffffff;
  color: #34404d;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
}

.batch-action-button--danger {
  color: #df645c;
  border-color: #f1d3d1;
}

.table-scroll {
  overflow-x: auto;
}

.table-head,
.table-row {
  min-width: 1180px;
  display: grid;
  grid-template-columns:
    minmax(104px, 0.76fr)
    minmax(68px, 0.56fr)
    minmax(90px, 0.66fr)
    minmax(126px, 0.9fr)
    minmax(148px, 1.02fr)
    minmax(92px, 0.7fr)
    minmax(168px, 1.04fr)
    minmax(84px, 0.62fr)
    minmax(92px, 0.64fr);
  align-items: center;
}

.table-head--batch,
.table-row--batch {
  grid-template-columns:
    56px
    minmax(104px, 0.76fr)
    minmax(68px, 0.56fr)
    minmax(90px, 0.66fr)
    minmax(126px, 0.9fr)
    minmax(148px, 1.02fr)
    minmax(92px, 0.7fr)
    minmax(168px, 1.04fr)
    minmax(84px, 0.62fr)
    minmax(92px, 0.64fr);
}

.table-head {
  padding: 16px 0;
  border: 1px solid #eef2ef;
  background: #fafafa;
  color: #2f3946;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.table-head > span {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0 12px;
  line-height: 1.45;
}

.table-col--no,
.table-col--name,
.table-col--role,
.cell--no,
.cell--strong,
.cell--role {
  padding-left: 8px;
  padding-right: 8px;
}

.table-col--status,
.table-col--action,
.cell--status,
.cell--action {
  padding-left: 8px;
  padding-right: 8px;
}

.table-col--status {
  justify-content: center;
  text-align: center;
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
  padding: 14px 12px;
  color: #2f3946;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 1.45;
}

.cell--strong {
  color: #303b47;
  font-size: 13px;
  font-weight: 500;
}

.cell--no,
.cell--phone,
.cell--updater,
.cell--time {
  white-space: nowrap;
}

.cell--role {
  white-space: nowrap;
}

.cell--note {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-check {
  justify-content: center;
}

.col-check input {
  width: 18px;
  height: 18px;
  accent-color: #39cf9d;
  cursor: pointer;
}

.cell--status {
  justify-content: center;
}

.status-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 70px;
  height: 30px;
  padding: 0 6px;
  border: 1px solid #41d0a3;
  border-radius: 999px;
  background: rgba(57, 207, 157, 0.12);
  color: #39cf9d;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.status-switch__thumb {
  position: absolute;
  right: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(47, 57, 70, 0.16);
  transition: transform 0.2s ease;
}

.status-switch__label {
  position: relative;
  z-index: 1;
  padding-left: 2px;
  padding-right: 22px;
  color: inherit;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.status-switch:not(.status-switch--active) {
  border-color: #dfe7e3;
  background: #f3f5f6;
  color: #9aa3ad;
}

.status-switch:not(.status-switch--active) .status-switch__thumb {
  transform: translateX(-40px);
}

.status-switch:not(.status-switch--active) .status-switch__label {
  padding-left: 22px;
  padding-right: 2px;
}

.status-switch--form {
  justify-self: start;
}

.status-switch--disabled,
.status-switch:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.cell--action {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
}

.action-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: #39cf9d;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
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
  padding: 28px 8px 4px;
  color: #8f9aa5;
  font-size: 12px;
  font-weight: 400;
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

.pagination__active {
  border-color: #39cf9d;
  background: #39cf9d;
  color: #ffffff;
}

.pagination__ghost--static {
  cursor: default;
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
  width: min(1120px, 100%);
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
  display: block;
  max-height: min(78vh, 860px);
  overflow: auto;
}

.dialog__body--compact {
  max-height: none;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px 18px;
}

.form-row {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  min-width: 0;
}

.form-row--span2 {
  grid-column: span 2;
}

.form-row--span3 {
  grid-column: 1 / -1;
}

.form-row--avatar {
  align-items: center;
}

.form-row--employee-no {
  grid-template-columns: 70px minmax(0, 1fr);
}

.form-row__label {
  padding-top: 10px;
  color: #8f9aa6;
  font-size: 13px;
  letter-spacing: 0.01em;
}

.form-row__label--required::after {
  content: "*";
  margin-left: 2px;
  color: #ff7f76;
}

.form-row__stack {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.form-row__helper {
  color: #b2bac3;
  font-size: 12px;
  line-height: 1.4;
}

.form-row__control {
  display: flex;
  align-items: center;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #e9efec;
  border-radius: 10px;
  background: #ffffff;
}

.form-row__control input,
.form-row__control select,
.form-row__control textarea {
  width: 100%;
  border: 0;
  background: transparent;
  color: #42505c;
  font-size: 13px;
  outline: none;
}

.form-row__control input::placeholder,
.form-row__control textarea::placeholder {
  color: #c3c9cf;
}

.form-row__control--readonly {
  background: #f4f5f7;
  border-color: #e8eaee;
}

.form-row__control--readonly input {
  color: #22303d;
}

.form-row__control--select {
  position: relative;
}

.form-row__control--select select {
  appearance: none;
  padding-right: 20px;
}

.form-row__control--select svg {
  position: absolute;
  right: 12px;
  width: 16px;
  height: 16px;
  color: #c2c8ce;
}

.form-row__control--textarea {
  min-height: 110px;
  padding: 12px;
  align-items: flex-start;
}

.form-row__control--textarea textarea {
  min-height: 84px;
  resize: none;
}

.avatar-uploader {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.avatar-uploader__preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 62px;
  height: 62px;
  border-radius: 50%;
}

.avatar-uploader__text {
  color: #39cf9d;
  font-size: 13px;
  font-weight: 500;
}

.permission-section {
  display: grid;
  gap: 16px;
  margin-top: 8px;
  padding-top: 8px;
}

.permission-section h3 {
  margin: 0;
  color: #22303d;
  font-size: 16px;
  font-weight: 700;
}

.permission-node {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #30414e;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}

.permission-node--leaf {
  min-width: 0;
  font-size: 14px;
  color: #30414e;
}

.permission-leaf-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px 24px;
}

.permission-check {
  position: relative;
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border: 2px solid #ccd3da;
  border-radius: 4px;
  background: #ffffff;
}

.permission-check--checked {
  border-color: #39cf9d;
  background: #39cf9d;
}

.permission-check--checked::after {
  content: "";
  position: absolute;
  left: 6px;
  top: 2px;
  width: 6px;
  height: 11px;
  border-right: 2px solid #ffffff;
  border-bottom: 2px solid #ffffff;
  transform: rotate(45deg);
}

.permission-check--crossed {
  border-color: #ccd3da;
  background: #ffffff;
}

.permission-check--crossed::before,
.permission-check--crossed::after {
  content: "";
  position: absolute;
  left: 9px;
  top: 3px;
  width: 2px;
  height: 14px;
  border-radius: 999px;
  background: #b4bcc5;
}

.permission-check--crossed::before {
  transform: rotate(45deg);
}

.permission-check--crossed::after {
  transform: rotate(-45deg);
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
  letter-spacing: 0.01em;
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

@media (max-width: 1280px) {
  .table-head,
  .table-row {
    min-width: 1180px;
  }
}

@media (max-width: 960px) {
  .role-panel--content {
    padding: 16px;
  }

  .toolbar__top,
  .toolbar__bottom,
  .toolbar-search,
  .toolbar__actions,
  .batch-action-row {
    width: 100%;
    flex-wrap: wrap;
  }

  .role-tabs {
    width: 100%;
    overflow-x: auto;
  }

  .dialog-mask {
    padding: 12px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .form-row--span2,
  .form-row--span3 {
    grid-column: auto;
  }

  .form-row__label {
    padding-top: 0;
  }

  .permission-leaf-grid {
    grid-template-columns: 1fr 1fr;
    gap: 12px 18px;
  }
}
</style>
