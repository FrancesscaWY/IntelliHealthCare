<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import { getAdminElders } from "@/shared/api/elders";
import { clearAdminAuthSession } from "@/shared/auth/session";
import mock, {
  getMemberSource,
  saveRemoteMembers,
  type MemberItem,
  type MemberTag,
  type MemberTagTone
} from "./mock";

type ViewMode = "grid" | "list";

const props = defineProps<PageComponentProps>();
const memberDetailStorageKey = "admin:elder:selected-member-id";
const deletedMemberIdsStorageKey = "admin:elder:deleted-member-ids";
const memberTagOverridesStorageKey = "admin:elder:member-tag-overrides";
const addedMembersStorageKey = "admin:elder:added-members";
const tagToneSequence: MemberTagTone[] = ["mint", "peach", "lavender", "gold"];
const avatarPalette = [
  { accent: "#8b97a4", shadow: "#33404d" },
  { accent: "#9c9084", shadow: "#4f4338" },
  { accent: "#88a096", shadow: "#345147" },
  { accent: "#938bb0", shadow: "#443d63" }
];

const selectedTags = ref<string[]>([]);
const registerDate = ref("");
const registerDateInput = ref<HTMLInputElement | null>(null);
const keyword = ref("");
const viewMode = ref<ViewMode>("grid");
const members = ref<MemberItem[]>(loadMembers());

const createMemberOpen = ref(false);
const createMemberTags = ref<string[]>([]);
const createCustomTagInput = ref("");
const createMemberForm = reactive({
  nickname: "",
  realName: "",
  phone: "",
  registeredDate: "",
  registeredTime: "10:00",
});

const batchMode = ref(false);
const selectedMemberIds = ref<string[]>([]);
const batchTagEditorOpen = ref(false);
const batchTagDraft = ref<string[]>([]);
const batchCustomTagInput = ref("");

const tagEditorOpen = ref(false);
const tagEditorMemberId = ref("");
const tagEditorDraft = ref<string[]>([]);
const customTagInput = ref("");

const quickTags = computed(() => collectQuickTags(members.value));
const tagEditorMember = computed(() => members.value.find((member) => member.id === tagEditorMemberId.value) ?? null);
const selectedBatchMembers = computed(() => members.value.filter((member) => selectedMemberIds.value.includes(member.id)));
const batchSelectionCount = computed(() => selectedBatchMembers.value.length);
const allFilteredSelected = computed(
  () => filteredMembers.value.length > 0 && filteredMembers.value.every((member) => selectedMemberIds.value.includes(member.id)),
);

const filteredMembers = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase();

  return members.value.filter((member) => {
    const dateToken = member.registeredAt.slice(0, 10);
    const matchesTag =
      selectedTags.value.length === 0 || selectedTags.value.every((tag) => member.tags.some((memberTag) => memberTag.label === tag));
    const matchesDate = !registerDate.value || dateToken === registerDate.value;
    const matchesKeyword =
      !normalizedKeyword ||
      [member.nickname, member.realName, member.phone, member.id].some((field) => field.toLowerCase().includes(normalizedKeyword));

    return matchesTag && matchesDate && matchesKeyword;
  });
});

function getBaseMemberIds() {
  return new Set(getMemberSource().map((member) => member.id));
}

function loadMembers() {
  const deletedIds = new Set(readDeletedMemberIds());
  const tagOverrides = readMemberTagOverrides();
  const addedMembers = readAddedMembers();

  return [...addedMembers, ...mock.members]
    .filter((member) => !deletedIds.has(member.id))
    .map((member) => ({
      ...member,
      tags: resolveMemberTags(member, tagOverrides[member.id]),
    }));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hour = `${date.getUTCHours()}`.padStart(2, "0");
  const minute = `${date.getUTCMinutes()}`.padStart(2, "0");
  const second = `${date.getUTCSeconds()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function pickAvatarPalette(id: string) {
  const seed = Array.from(id).reduce((total, char) => total + char.charCodeAt(0), 0);
  return avatarPalette[seed % avatarPalette.length] ?? avatarPalette[0];
}

async function syncMembersFromApi() {
  try {
    const response = await getAdminElders({
      page: 1,
      pageSize: 100
    });
    const remoteMembers: MemberItem[] = response.list.map((item) => {
      const palette = pickAvatarPalette(item.elderId);
      return {
        id: item.elderId,
        nickname: item.nickname || item.realName || item.displayName,
        realName: item.realName || item.displayName,
        phone: item.phone,
        registeredAt: formatDateTime(item.createdAt) || "未提供",
        tags: buildMemberTags(item.tags),
        avatarAccent: palette.accent,
        avatarShadow: palette.shadow
      };
    });

    if (remoteMembers.length > 0) {
      saveRemoteMembers(remoteMembers);
      members.value = loadMembers();
    }
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;

    if (status === 401 || status === 403) {
      clearAdminAuthSession();
      props.showToast(error instanceof Error ? error.message : "后台鉴权失败，请重新登录");
      props.navigation.reLaunch("auth/login");
      return;
    }

    props.showToast(error instanceof Error ? error.message : "长者列表加载失败，已回退到演示数据");
  }
}

function readDeletedMemberIds() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  const rawValue = window.sessionStorage.getItem(deletedMemberIdsStorageKey);

  if (!rawValue) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [] as string[];
  }
}

function saveDeletedMemberIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(deletedMemberIdsStorageKey, JSON.stringify(ids));
}

function readAddedMembers() {
  if (typeof window === "undefined") {
    return [] as MemberItem[];
  }

  const rawValue = window.sessionStorage.getItem(addedMembersStorageKey);

  if (!rawValue) {
    return [] as MemberItem[];
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [] as MemberItem[];
    }

    return parsed
      .filter((item): item is MemberItem => Boolean(item && typeof item === "object" && typeof item.id === "string"))
      .filter((item) => !getBaseMemberIds().has(item.id))
      .map((item) => ({
        ...item,
        nickname: String(item.nickname || "").trim(),
        realName: String(item.realName || "").trim(),
        phone: String(item.phone || "").trim(),
        registeredAt: String(item.registeredAt || "").trim(),
        avatarAccent: String(item.avatarAccent || avatarPalette[0].accent),
        avatarShadow: String(item.avatarShadow || avatarPalette[0].shadow),
        tags: Array.isArray(item.tags)
          ? item.tags
              .filter((tag): tag is MemberTag => Boolean(tag && typeof tag === "object" && typeof tag.label === "string"))
              .map((tag) => ({
                label: tag.label.trim(),
                tone: resolveTagTone(tag.label.trim()),
              }))
              .filter((tag) => tag.label)
          : [],
      }));
  } catch {
    return [] as MemberItem[];
  }
}

function saveAddedMembers(sourceMembers = members.value) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = sourceMembers
    .filter((member) => !getBaseMemberIds().has(member.id))
    .map((member) => ({
      ...member,
      tags: member.tags.map((tag) => ({ ...tag })),
    }));

  window.sessionStorage.setItem(addedMembersStorageKey, JSON.stringify(payload));
}

function readMemberTagOverrides() {
  if (typeof window === "undefined") {
    return {} as Record<string, string[]>;
  }

  const rawValue = window.sessionStorage.getItem(memberTagOverridesStorageKey);

  if (!rawValue) {
    return {} as Record<string, string[]>;
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {} as Record<string, string[]>;
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([memberId, labels]) => [
        memberId,
        Array.isArray(labels)
          ? labels.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
          : [],
      ]),
    ) as Record<string, string[]>;
  } catch {
    return {} as Record<string, string[]>;
  }
}

function saveMemberTagOverrides(sourceMembers = members.value) {
  if (typeof window === "undefined") {
    return;
  }

  const payload = Object.fromEntries(sourceMembers.map((member) => [member.id, member.tags.map((tag) => tag.label)]));
  window.sessionStorage.setItem(memberTagOverridesStorageKey, JSON.stringify(payload));
}

function persistMembers(sourceMembers = members.value) {
  saveMemberTagOverrides(sourceMembers);
  saveAddedMembers(sourceMembers);
}

function collectQuickTags(sourceMembers: MemberItem[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  const append = (label: string) => {
    const normalized = label.trim();

    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    result.push(normalized);
  };

  mock.tagOptions.forEach(append);
  sourceMembers.forEach((member) => member.tags.forEach((tag) => append(tag.label)));

  return result;
}

function resolveTagTone(label: string, currentTags: MemberTag[] = []) {
  const currentMatch = currentTags.find((tag) => tag.label === label);

  if (currentMatch) {
    return currentMatch.tone;
  }

  const existingTag = mock.members.flatMap((member) => member.tags).find((tag) => tag.label === label);

  if (existingTag) {
    return existingTag.tone;
  }

  const hash = Array.from(label).reduce((total, char) => total + char.charCodeAt(0), 0);
  return tagToneSequence[hash % tagToneSequence.length];
}

function buildMemberTags(labels: string[], currentTags: MemberTag[] = []) {
  return Array.from(new Set(labels.map((label) => label.trim()).filter(Boolean))).map((label) => ({
    label,
    tone: resolveTagTone(label, currentTags),
  }));
}

function resolveMemberTags(member: MemberItem, overrideLabels?: string[]) {
  if (!overrideLabels?.length) {
    return member.tags.map((tag) => ({ ...tag }));
  }

  return buildMemberTags(overrideLabels, member.tags);
}

function toggleTag(tag: string) {
  if (!tag) {
    selectedTags.value = [];
    return;
  }

  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter((item) => item !== tag)
    : [...selectedTags.value, tag];
}

function removeSelectedTag(tag: string) {
  selectedTags.value = selectedTags.value.filter((item) => item !== tag);
}

function openRegisterDatePicker() {
  const input = registerDateInput.value;

  if (!input) {
    return;
  }

  input.focus({ preventScroll: true });

  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }

  input.click();
}

function formatDateLabel(value: string) {
  if (!value) {
    return "请选择";
  }

  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  if (Number.isNaN(month) || Number.isNaN(day)) {
    return value;
  }

  return `${month}月${day}日`;
}

function runSearch() {
  props.showToast(`已筛选出 ${filteredMembers.value.length} 位用户`);
}

function resetFilters() {
  selectedTags.value = [];
  registerDate.value = "";
  keyword.value = "";
  props.showToast("已重置筛选条件");
}

function setViewMode(mode: ViewMode) {
  viewMode.value = mode;
}

function addMember() {
  const targetPageId = "elder/member-create";
  const previousStack = props.navigation.getStack();

  props.navigation.navigateTo(targetPageId);

  const nextStack = props.navigation.getStack();
  const activePageId = nextStack[nextStack.length - 1] || "";

  if (activePageId !== targetPageId) {
    props.navigation.reLaunch(targetPageId);
  }

  const finalStack = props.navigation.getStack();
  const resolvedPageId = finalStack[finalStack.length - 1] || "";

  if (resolvedPageId !== targetPageId) {
    props.showToast(`跳转失败，当前导航栈：${previousStack.join(" > ") || "空"}`);
  }
}

function batchOperate() {
  batchMode.value = !batchMode.value;

  if (!batchMode.value) {
    selectedMemberIds.value = [];
    closeBatchTagEditor();
    return;
  }

  props.showToast("已进入批量操作模式");
}

function openDetail(name: string) {
  props.showToast(`查看 ${name} 的用户详情`);
}

function resetCreateMemberForm() {
  createMemberForm.nickname = "";
  createMemberForm.realName = "";
  createMemberForm.phone = "";
  createMemberForm.registeredDate = new Date().toISOString().slice(0, 10);
  createMemberForm.registeredTime = "10:00";
  createMemberTags.value = [];
  createCustomTagInput.value = "";
}

function closeCreateMember() {
  createMemberOpen.value = false;
}

function toggleCreateMemberTag(tag: string) {
  const normalized = tag.trim();

  if (!normalized) {
    return;
  }

  createMemberTags.value = createMemberTags.value.includes(normalized)
    ? createMemberTags.value.filter((item) => item !== normalized)
    : [...createMemberTags.value, normalized];
}

function appendCreateCustomTag() {
  const normalized = createCustomTagInput.value.trim();

  if (!normalized) {
    return;
  }

  if (createMemberTags.value.includes(normalized)) {
    props.showToast("该标签已存在");
    createCustomTagInput.value = "";
    return;
  }

  createMemberTags.value = [...createMemberTags.value, normalized];
  createCustomTagInput.value = "";
}

function generateMemberId() {
  let candidate = "";

  do {
    const dateToken = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const suffix = `${Math.floor(Math.random() * 9000) + 1000}`;
    candidate = `${dateToken}${suffix}`;
  } while (members.value.some((member) => member.id === candidate));

  return candidate;
}

function buildRegisteredAt(dateValue: string, timeValue: string) {
  const normalizedDate = dateValue || new Date().toISOString().slice(0, 10);
  const normalizedTime = /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : "10:00";
  return `${normalizedDate} ${normalizedTime}:00`;
}

function createMemberAvatar(index: number) {
  return avatarPalette[index % avatarPalette.length];
}

function saveNewMember() {
  const nickname = createMemberForm.nickname.trim();
  const realName = createMemberForm.realName.trim();
  const phone = createMemberForm.phone.trim();

  if (!nickname || !realName || !phone) {
    props.showToast("请完整填写昵称、姓名和手机号");
    return;
  }

  if (!/^1\d{10}$/.test(phone)) {
    props.showToast("请输入有效的 11 位手机号");
    return;
  }

  const avatar = createMemberAvatar(members.value.length);
  const newMember: MemberItem = {
    id: generateMemberId(),
    nickname,
    realName,
    phone,
    registeredAt: buildRegisteredAt(createMemberForm.registeredDate, createMemberForm.registeredTime),
    tags: buildMemberTags(createMemberTags.value),
    avatarAccent: avatar.accent,
    avatarShadow: avatar.shadow,
  };

  const nextMembers = [newMember, ...members.value];
  members.value = nextMembers;
  persistMembers(nextMembers);
  closeCreateMember();
  props.showToast(`${newMember.nickname}已新增到用户列表`);
}

function toggleMemberSelection(memberId: string) {
  selectedMemberIds.value = selectedMemberIds.value.includes(memberId)
    ? selectedMemberIds.value.filter((item) => item !== memberId)
    : [...selectedMemberIds.value, memberId];
}

function toggleSelectAllFiltered() {
  if (!filteredMembers.value.length) {
    return;
  }

  if (allFilteredSelected.value) {
    const filteredIds = new Set(filteredMembers.value.map((member) => member.id));
    selectedMemberIds.value = selectedMemberIds.value.filter((id) => !filteredIds.has(id));
    return;
  }

  selectedMemberIds.value = Array.from(new Set([...selectedMemberIds.value, ...filteredMembers.value.map((member) => member.id)]));
}

function closeBatchMode() {
  batchMode.value = false;
  selectedMemberIds.value = [];
  closeBatchTagEditor();
}

function removeMembers(memberIds: string[]) {
  if (!memberIds.length) {
    return;
  }

  const nextMembers = members.value.filter((member) => !memberIds.includes(member.id));
  const deletedIds = Array.from(new Set([...readDeletedMemberIds(), ...memberIds]));

  members.value = nextMembers;
  saveDeletedMemberIds(deletedIds);
  persistMembers(nextMembers);
  selectedMemberIds.value = selectedMemberIds.value.filter((id) => !memberIds.includes(id));
}

function removeSelectedMembers() {
  if (!selectedMemberIds.value.length) {
    props.showToast("请先选择用户");
    return;
  }

  const removedCount = selectedMemberIds.value.length;
  removeMembers([...selectedMemberIds.value]);
  closeBatchMode();
  props.showToast(`已批量删除 ${removedCount} 位用户`);
}

function openBatchTagEditor() {
  if (!selectedMemberIds.value.length) {
    props.showToast("请先选择用户");
    return;
  }

  batchTagDraft.value = [];
  batchCustomTagInput.value = "";
  batchTagEditorOpen.value = true;
}

function closeBatchTagEditor() {
  batchTagEditorOpen.value = false;
  batchTagDraft.value = [];
  batchCustomTagInput.value = "";
}

function toggleBatchEditorTag(tag: string) {
  const normalized = tag.trim();

  if (!normalized) {
    return;
  }

  batchTagDraft.value = batchTagDraft.value.includes(normalized)
    ? batchTagDraft.value.filter((item) => item !== normalized)
    : [...batchTagDraft.value, normalized];
}

function appendBatchCustomTag() {
  const normalized = batchCustomTagInput.value.trim();

  if (!normalized) {
    return;
  }

  if (batchTagDraft.value.includes(normalized)) {
    props.showToast("该标签已存在");
    batchCustomTagInput.value = "";
    return;
  }

  batchTagDraft.value = [...batchTagDraft.value, normalized];
  batchCustomTagInput.value = "";
}

function saveBatchTags() {
  if (!selectedMemberIds.value.length) {
    props.showToast("请先选择用户");
    return;
  }

  if (!batchTagDraft.value.length) {
    props.showToast("请至少选择一个标签");
    return;
  }

  const nextMembers = members.value.map((member) =>
    selectedMemberIds.value.includes(member.id)
      ? {
          ...member,
          tags: buildMemberTags(
            [...member.tags.map((tag) => tag.label), ...batchTagDraft.value],
            member.tags,
          ),
        }
      : member,
  );

  members.value = nextMembers;
  persistMembers(nextMembers);
  const targetCount = selectedMemberIds.value.length;
  closeBatchTagEditor();
  props.showToast(`已为 ${targetCount} 位用户添加标签`);
}

function openTagEditor(member: MemberItem) {
  tagEditorMemberId.value = member.id;
  tagEditorDraft.value = member.tags.map((tag) => tag.label);
  customTagInput.value = "";
  tagEditorOpen.value = true;
}

function closeTagEditor() {
  tagEditorOpen.value = false;
  tagEditorMemberId.value = "";
  tagEditorDraft.value = [];
  customTagInput.value = "";
}

function toggleEditorTag(tag: string) {
  const normalized = tag.trim();

  if (!normalized) {
    return;
  }

  tagEditorDraft.value = tagEditorDraft.value.includes(normalized)
    ? tagEditorDraft.value.filter((item) => item !== normalized)
    : [...tagEditorDraft.value, normalized];
}

function appendCustomTag() {
  const normalized = customTagInput.value.trim();

  if (!normalized) {
    return;
  }

  if (tagEditorDraft.value.includes(normalized)) {
    props.showToast("该标签已存在");
    customTagInput.value = "";
    return;
  }

  tagEditorDraft.value = [...tagEditorDraft.value, normalized];
  customTagInput.value = "";
}

function saveMemberTags() {
  const targetMember = tagEditorMember.value;

  if (!targetMember) {
    return;
  }

  const nextMembers = members.value.map((member) =>
    member.id === targetMember.id
      ? {
          ...member,
          tags: buildMemberTags(tagEditorDraft.value, member.tags),
        }
      : member,
  );

  members.value = nextMembers;
  persistMembers(nextMembers);
  props.showToast(`${targetMember.nickname}的标签已更新`);
  closeTagEditor();
}

function addTag(member: MemberItem) {
  openTagEditor(member);
}

function removeMember(name: string) {
  props.showToast(`已将 ${name} 加入删除队列`);
}

function openDetailMember(member: MemberItem) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(memberDetailStorageKey, member.id);
  }

  const targetPageId = "elder/member-detail";
  const previousStack = props.navigation.getStack();

  props.navigation.navigateTo(targetPageId);

  const nextStack = props.navigation.getStack();
  const activePageId = nextStack[nextStack.length - 1] || "";

  if (activePageId !== targetPageId) {
    props.navigation.reLaunch(targetPageId);
  }

  const finalStack = props.navigation.getStack();
  const resolvedPageId = finalStack[finalStack.length - 1] || "";

  if (resolvedPageId !== targetPageId) {
    props.showToast(`跳转失败，当前导航栈：${previousStack.join(" > ") || "空"}`);
  }
}

function removeMemberItem(member: MemberItem) {
  removeMembers([member.id]);
  props.showToast(`${member.nickname}已删除`);
}

const pageShellHiddenClass = "member-list-shell-hidden";

onMounted(() => {
  document.body.classList.add(pageShellHiddenClass);
  void syncMembersFromApi();
});

onBeforeUnmount(() => {
  document.body.classList.remove(pageShellHiddenClass);
});
</script>

<template>
  <section class="member-list-page">
    <section class="filter-panel">
      <header class="filter-panel__header">
        <h2>{{ mock.title }}</h2>
      </header>

      <div class="selected-tags-bar">
        <span class="selected-tags-bar__label">已选标签</span>

        <div class="selected-tags-bar__list">
          <template v-if="selectedTags.length">
            <button
              v-for="tag in selectedTags"
              :key="tag"
              class="selected-tag"
              type="button"
              @click="removeSelectedTag(tag)"
            >
              <span>{{ tag }}</span>
              <span class="selected-tag__close" aria-hidden="true">+</span>
            </button>
          </template>

          <span v-else class="selected-tags-bar__placeholder">点击下方标签添加筛选</span>
        </div>

        <button v-if="selectedTags.length" class="selected-tags-bar__clear" type="button" @click="toggleTag('')">清空</button>
      </div>

      <div class="quick-selector">
        <button
          class="quick-tabs__all"
          :class="{ 'quick-tabs__all--active': !selectedTags.length }"
          type="button"
          @click="toggleTag('')"
        >
          全部
        </button>

        <div class="quick-tabs" aria-label="快捷标签筛选">
          <button
            v-for="item in quickTags"
            :key="item"
            class="quick-tab"
            :class="{ 'quick-tab--selected': selectedTags.includes(item) }"
            type="button"
            @click="toggleTag(item)"
          >
            <span>{{ item }}</span>
            <span class="quick-tab__action" :class="{ 'quick-tab__action--selected': selectedTags.includes(item) }" aria-hidden="true">
              {{ selectedTags.includes(item) ? "-" : "+" }}
            </span>
          </button>
        </div>
      </div>

      <div class="filter-grid">
        <div class="field field--date">
          <span class="field__label">注册日期</span>
          <div class="date-single">
            <button class="field__control field__control--date-single" type="button" @click="openRegisterDatePicker">
              <span class="date-single__content">
                <span class="date-single__icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 3v3M17 3v3M4 8h16M6 5h12a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
                    <path d="M8 12h3M8 16h6" />
                  </svg>
                </span>
                <span class="date-single__value" :class="{ 'date-single__value--placeholder': !registerDate }">
                  {{ formatDateLabel(registerDate) }}
                </span>
                <span class="date-single__caret">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" />
                  </svg>
                </span>
              </span>
            </button>

            <input ref="registerDateInput" v-model="registerDate" class="date-single__native-input" type="date" aria-label="注册日期" />
          </div>
        </div>

        <label class="field field--keyword">
          <span class="field__label">关键词</span>
          <div class="field__control">
            <input v-model="keyword" type="text" placeholder="请输入姓名、手机号或用户 ID" @keydown.enter="runSearch" />
          </div>
        </label>

        <div class="filter-actions">
          <button class="icon-btn icon-btn--primary" type="button" aria-label="搜索用户" @click="runSearch">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
          </button>

          <button class="icon-btn icon-btn--ghost" type="button" aria-label="重置条件" @click="resetFilters">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.5 8H2.8V4.3" />
              <path d="M3 8a9 9 0 1 1-1 4" />
            </svg>
          </button>
        </div>
      </div>
    </section>

    <section class="content-panel">
      <header class="toolbar">
        <div class="toolbar__left">
          <div class="view-switch" aria-label="视图切换">
            <button
              class="view-switch__btn"
              :class="{ 'view-switch__btn--active': viewMode === 'grid' }"
              type="button"
              aria-label="网格视图"
              @click="setViewMode('grid')"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
              </svg>
            </button>

            <button
              class="view-switch__btn"
              :class="{ 'view-switch__btn--active': viewMode === 'list' }"
              type="button"
              aria-label="列表视图"
              @click="setViewMode('list')"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h2v2H4zM4 11h2v2H4zM4 16h2v2H4zM9 7h11M9 12h11M9 17h11" />
              </svg>
            </button>
          </div>

          <span class="toolbar__count">共 {{ filteredMembers.length }} 位用户</span>
        </div>

        <div class="toolbar__actions">
          <button class="action-btn action-btn--primary" type="button" @click="addMember">新增</button>
          <button class="action-btn action-btn--ghost" type="button" @click="batchOperate">
            {{ batchMode ? "退出批量" : "批量操作" }}
          </button>
        </div>
      </header>

      <section v-if="batchMode" class="batch-bar">
        <div class="batch-bar__summary">
          <strong>已选择 {{ batchSelectionCount }} 位用户</strong>
        </div>

        <div class="batch-bar__actions">
          <button class="action-btn action-btn--ghost" type="button" @click="toggleSelectAllFiltered">
            {{ allFilteredSelected ? "取消全选" : "全选当前" }}
          </button>
          <button class="action-btn action-btn--ghost" type="button" @click="openBatchTagEditor">批量加标签</button>
          <button class="action-btn action-btn--danger" type="button" @click="removeSelectedMembers">批量删除</button>
          <button class="action-btn action-btn--ghost" type="button" @click="closeBatchMode">取消</button>
        </div>
      </section>

      <div v-if="filteredMembers.length && viewMode === 'grid'" class="member-grid member-grid--grid">
        <article
          v-for="member in filteredMembers"
          :key="member.id"
          class="member-card"
          :class="{ 'member-card--selected': selectedMemberIds.includes(member.id), 'member-card--batch': batchMode }"
          :style="{ '--avatar-accent': member.avatarAccent, '--avatar-shadow': member.avatarShadow }"
        >
          <button
            v-if="batchMode"
            class="member-card__select"
            :class="{ 'member-card__select--active': selectedMemberIds.includes(member.id) }"
            type="button"
            :aria-label="selectedMemberIds.includes(member.id) ? '取消选择用户' : '选择用户'"
            @click.stop="toggleMemberSelection(member.id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.5l4.2 4.2L19 7.4" />
            </svg>
          </button>

          <button class="member-card__delete" type="button" aria-label="删除用户" @click="removeMemberItem(member)">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 7h14M9 7V5h6v2M8 7v11m8-11v11M6 7v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
            </svg>
          </button>

          <header class="member-card__header">
            <div class="member-card__avatar">
              <span>{{ member.nickname.slice(0, 1) }}</span>
            </div>

            <div class="member-card__heading">
              <h3>{{ member.nickname }}</h3>
              <p>ID:{{ member.id }}</p>
            </div>
          </header>

          <div class="member-card__tags">
            <span v-for="tag in member.tags" :key="tag.label" class="tag-pill" :class="`tag-pill--${tag.tone}`">{{ tag.label }}</span>
          </div>

          <dl class="member-card__meta">
            <div>
              <dt>真实姓名</dt>
              <dd>{{ member.realName }}</dd>
            </div>
            <div>
              <dt>手机号码</dt>
              <dd>{{ member.phone }}</dd>
            </div>
            <div>
              <dt>注册时间</dt>
              <dd>{{ member.registeredAt }}</dd>
            </div>
          </dl>

          <footer class="member-card__footer">
            <button class="card-btn card-btn--primary" type="button" @click.stop="openDetailMember(member)">用户详情</button>
            <button class="card-btn card-btn--ghost" type="button" @click.stop="addTag(member)">添加标签</button>
          </footer>
        </article>
      </div>

      <section v-else-if="filteredMembers.length" class="member-table-wrap">
        <div class="member-table">
          <header class="member-table__head" :class="{ 'member-table__head--batch': batchMode }">
            <div v-if="batchMode" class="member-table__cell member-table__cell--check">
              <button
                class="table-check"
                :class="{ 'table-check--active': allFilteredSelected }"
                type="button"
                :aria-label="allFilteredSelected ? '取消全选当前列表' : '全选当前列表'"
                @click="toggleSelectAllFiltered"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12.5l4.2 4.2L19 7.4" />
                </svg>
              </button>
            </div>
            <div class="member-table__cell">用户信息</div>
            <div class="member-table__cell">ID</div>
            <div class="member-table__cell">真实姓名</div>
            <div class="member-table__cell">用户标签</div>
            <div class="member-table__cell">注册时间</div>
            <div class="member-table__cell">操作</div>
          </header>

          <div class="member-table__body">
            <article
              v-for="member in filteredMembers"
              :key="member.id"
              class="member-row"
              :class="{ 'member-row--selected': selectedMemberIds.includes(member.id), 'member-row--batch': batchMode }"
              :style="{ '--avatar-accent': member.avatarAccent, '--avatar-shadow': member.avatarShadow }"
            >
              <div v-if="batchMode" class="member-row__cell member-row__cell--check">
                <button
                  class="table-check"
                  :class="{ 'table-check--active': selectedMemberIds.includes(member.id) }"
                  type="button"
                  :aria-label="selectedMemberIds.includes(member.id) ? '取消选择用户' : '选择用户'"
                  @click.stop="toggleMemberSelection(member.id)"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12.5l4.2 4.2L19 7.4" />
                  </svg>
                </button>
              </div>

              <div class="member-row__cell member-row__cell--user">
                <div class="member-row__avatar">
                  <span>{{ member.nickname.slice(0, 1) }}</span>
                </div>

                <div class="member-row__user-text">
                  <strong>{{ member.nickname }}</strong>
                  <span>{{ member.phone }}</span>
                </div>
              </div>

              <div class="member-row__cell member-row__cell--id">{{ member.id }}</div>
              <div class="member-row__cell member-row__cell--name">{{ member.realName }}</div>

              <div class="member-row__cell member-row__cell--tags">
                <div v-if="member.tags.length" class="member-row__tags">
                  <span v-for="tag in member.tags" :key="tag.label" class="tag-pill" :class="`tag-pill--${tag.tone}`">{{ tag.label }}</span>
                </div>
                <span v-else class="member-row__empty">暂无标签</span>
              </div>

              <div class="member-row__cell member-row__cell--time">{{ member.registeredAt }}</div>

              <div class="member-row__cell member-row__cell--actions">
                <button class="row-action row-action--primary" type="button" @click.stop="openDetailMember(member)">用户详情</button>
                <button class="row-action row-action--ghost" type="button" @click.stop="addTag(member)">添加标签</button>
                <button class="row-action row-action--danger" type="button" @click.stop="removeMemberItem(member)">删除</button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section v-else class="empty-state">
        <strong>没有匹配结果</strong>
        <p>当前筛选条件下没有用户，建议重置筛选条件后重新搜索。</p>
      </section>
    </section>

    <section v-if="createMemberOpen" class="dialog-mask" @click.self="closeCreateMember">
      <article class="dialog-panel">
        <header class="dialog-panel__header">
          <div>
            <p class="dialog-panel__eyebrow">Create Member</p>
            <h3>新增用户</h3>
            <p class="dialog-panel__summary">录入基础档案和标签后，用户会立即出现在当前列表中。</p>
          </div>

          <button class="dialog-panel__close" type="button" aria-label="关闭新增用户弹层" @click="closeCreateMember">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </header>

        <div class="dialog-grid">
          <label class="dialog-field">
            <span>用户昵称</span>
            <input v-model="createMemberForm.nickname" type="text" maxlength="12" placeholder="请输入昵称" />
          </label>

          <label class="dialog-field">
            <span>真实姓名</span>
            <input v-model="createMemberForm.realName" type="text" maxlength="12" placeholder="请输入姓名" />
          </label>

          <label class="dialog-field">
            <span>手机号</span>
            <input v-model="createMemberForm.phone" type="text" maxlength="11" placeholder="请输入 11 位手机号" />
          </label>

          <label class="dialog-field">
            <span>注册日期</span>
            <input v-model="createMemberForm.registeredDate" type="date" />
          </label>

          <label class="dialog-field">
            <span>登记时间</span>
            <input v-model="createMemberForm.registeredTime" type="time" />
          </label>
        </div>

        <section class="dialog-section">
          <span class="dialog-section__label">用户标签</span>

          <div class="dialog-tags">
            <button
              v-for="tag in quickTags"
              :key="`create-${tag}`"
              class="quick-tab"
              :class="{ 'quick-tab--selected': createMemberTags.includes(tag) }"
              type="button"
              @click="toggleCreateMemberTag(tag)"
            >
              <span>{{ tag }}</span>
              <span class="quick-tab__action" :class="{ 'quick-tab__action--selected': createMemberTags.includes(tag) }" aria-hidden="true">
                {{ createMemberTags.includes(tag) ? "-" : "+" }}
              </span>
            </button>
          </div>
        </section>

        <section class="dialog-section">
          <span class="dialog-section__label">自定义标签</span>

          <div class="dialog-custom">
            <label class="dialog-field dialog-field--inline">
              <input
                v-model="createCustomTagInput"
                type="text"
                maxlength="12"
                placeholder="输入自定义标签名称"
                @keydown.enter.prevent="appendCreateCustomTag"
              />
            </label>

            <button class="action-btn action-btn--primary" type="button" @click="appendCreateCustomTag">加入</button>
          </div>

          <div v-if="createMemberTags.length" class="dialog-selected-tags">
            <button
              v-for="tag in createMemberTags"
              :key="`selected-${tag}`"
              class="selected-tag selected-tag--editor"
              type="button"
              @click="toggleCreateMemberTag(tag)"
            >
              <span>{{ tag }}</span>
              <span class="selected-tag__close" aria-hidden="true">+</span>
            </button>
          </div>
        </section>

        <footer class="dialog-panel__footer">
          <button class="action-btn action-btn--ghost" type="button" @click="closeCreateMember">取消</button>
          <button class="action-btn action-btn--primary" type="button" @click="saveNewMember">保存用户</button>
        </footer>
      </article>
    </section>

    <section v-if="batchTagEditorOpen" class="dialog-mask" @click.self="closeBatchTagEditor">
      <article class="dialog-panel">
        <header class="dialog-panel__header">
          <div>
            <p class="dialog-panel__eyebrow">Batch Tags</p>
            <h3>批量添加标签</h3>
            <p class="dialog-panel__summary">当前已选择 {{ batchSelectionCount }} 位用户，保存后会统一追加标签。</p>
          </div>

          <button class="dialog-panel__close" type="button" aria-label="关闭批量标签弹层" @click="closeBatchTagEditor">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </header>

        <section class="dialog-section">
          <span class="dialog-section__label">待添加标签</span>

          <div class="dialog-selected-tags">
            <button
              v-for="tag in batchTagDraft"
              :key="`batch-selected-${tag}`"
              class="selected-tag selected-tag--editor"
              type="button"
              @click="toggleBatchEditorTag(tag)"
            >
              <span>{{ tag }}</span>
              <span class="selected-tag__close" aria-hidden="true">+</span>
            </button>

            <span v-if="!batchTagDraft.length" class="tag-editor__empty">请从下方选择需要批量追加的标签。</span>
          </div>
        </section>

        <section class="dialog-section">
          <span class="dialog-section__label">常用标签</span>

          <div class="dialog-tags">
            <button
              v-for="tag in quickTags"
              :key="`batch-${tag}`"
              class="quick-tab"
              :class="{ 'quick-tab--selected': batchTagDraft.includes(tag) }"
              type="button"
              @click="toggleBatchEditorTag(tag)"
            >
              <span>{{ tag }}</span>
              <span class="quick-tab__action" :class="{ 'quick-tab__action--selected': batchTagDraft.includes(tag) }" aria-hidden="true">
                {{ batchTagDraft.includes(tag) ? "-" : "+" }}
              </span>
            </button>
          </div>
        </section>

        <section class="dialog-section">
          <span class="dialog-section__label">自定义标签</span>

          <div class="dialog-custom">
            <label class="dialog-field dialog-field--inline">
              <input
                v-model="batchCustomTagInput"
                type="text"
                maxlength="12"
                placeholder="输入要批量添加的标签"
                @keydown.enter.prevent="appendBatchCustomTag"
              />
            </label>

            <button class="action-btn action-btn--primary" type="button" @click="appendBatchCustomTag">加入</button>
          </div>
        </section>

        <footer class="dialog-panel__footer">
          <button class="action-btn action-btn--ghost" type="button" @click="closeBatchTagEditor">取消</button>
          <button class="action-btn action-btn--primary" type="button" @click="saveBatchTags">保存标签</button>
        </footer>
      </article>
    </section>

    <section v-if="tagEditorOpen && tagEditorMember" class="tag-editor-mask" @click.self="closeTagEditor">
      <article class="tag-editor">
        <header class="tag-editor__header">
          <div>
            <h3>添加标签</h3>
          </div>

          <button class="tag-editor__close" type="button" aria-label="关闭标签编辑器" @click="closeTagEditor">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </header>

        <section class="tag-editor__section">
          <span class="tag-editor__label">当前已选</span>

          <div class="tag-editor__selected">
            <button
              v-for="tag in tagEditorDraft"
              :key="tag"
              class="selected-tag selected-tag--editor"
              type="button"
              @click="toggleEditorTag(tag)"
            >
              <span>{{ tag }}</span>
              <span class="selected-tag__close" aria-hidden="true">+</span>
            </button>

            <span v-if="!tagEditorDraft.length" class="tag-editor__empty">当前还没有标签，可从下方选择或自定义添加。</span>
          </div>
        </section>

        <section class="tag-editor__section">
          <span class="tag-editor__label">常用标签</span>

          <div class="tag-editor__options">
            <button
              v-for="tag in quickTags"
              :key="tag"
              class="quick-tab"
              :class="{ 'quick-tab--selected': tagEditorDraft.includes(tag) }"
              type="button"
              @click="toggleEditorTag(tag)"
            >
              <span>{{ tag }}</span>
              <span class="quick-tab__action" :class="{ 'quick-tab__action--selected': tagEditorDraft.includes(tag) }" aria-hidden="true">
                {{ tagEditorDraft.includes(tag) ? "-" : "+" }}
              </span>
            </button>
          </div>
        </section>

        <section class="tag-editor__section">
          <span class="tag-editor__label">自定义标签</span>

          <div class="tag-editor__custom">
            <label class="tag-editor__input">
              <input
                v-model="customTagInput"
                type="text"
                maxlength="12"
                placeholder="输入自定义标签名称"
                @keydown.enter.prevent="appendCustomTag"
              />
            </label>

            <button class="action-btn action-btn--primary tag-editor__append" type="button" @click="appendCustomTag">加入</button>
          </div>
        </section>

        <footer class="tag-editor__footer">
          <button class="action-btn action-btn--ghost" type="button" @click="closeTagEditor">取消</button>
          <button class="action-btn action-btn--primary" type="button" @click="saveMemberTags">保存标签</button>
        </footer>
      </article>
    </section>
  </section>
</template>

<style scoped>
.member-list-page {
  --panel-bg: #ffffff;
  --panel-border: #dbe3e8;
  --text-strong: #1f2937;
  --text-soft: #6b7280;
  --tab-bg: #eef2f5;
  --brand: #2d8b68;
  --brand-deep: #2d8b68;
  display: grid;
  gap: 12px;
  padding: 0;
  background: transparent;
}

.filter-panel,
.content-panel {
  position: relative;
  border-radius: 16px;
}

.filter-panel {
  padding: 16px 18px 18px;
  border: 1px solid var(--panel-border);
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.content-panel {
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.filter-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.filter-panel__header h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.quick-selector {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.quick-tabs {
  display: flex;
  flex-wrap: wrap;
  flex: 1;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid #e3e8ee;
  background: #f4f6f8;
}

.quick-tabs__all {
  flex: 0 0 auto;
  min-width: 82px;
  height: 40px;
  padding: 0 20px;
  border: 1px solid #cfd8df;
  border-radius: 999px;
  background: #ffffff;
  color: #4b5563;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.quick-tabs__all--active {
  border-color: #8dc6ae;
  background: #eaf6f0;
  color: var(--brand);
  box-shadow: 0 1px 2px rgba(45, 139, 104, 0.08);
  transform: none;
}

.selected-tags-bar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: none;
}

.selected-tags-bar__label {
  color: #6f7b80;
  font-size: 11.5px;
  font-weight: 700;
}

.selected-tags-bar__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 30px;
  align-items: center;
}

.selected-tags-bar__placeholder {
  color: #99a2a5;
  font-size: 11.5px;
}

.selected-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 10px 0 12px;
  border: 1px solid #d6ece3;
  border-radius: 999px;
  background: #f5fbf8;
  color: var(--admin-brand);
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
}

.selected-tag__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(31, 122, 90, 0.08);
  color: var(--admin-brand);
  font-size: 10px;
  line-height: 1;
  transform: rotate(45deg);
}

.selected-tags-bar__clear {
  min-width: 52px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid #dbe3e8;
  border-radius: 999px;
  background: #fff;
  color: #667085;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
}

.quick-tab,
.icon-btn,
.action-btn,
.card-btn,
.view-switch__btn {
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.quick-tab {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 36px;
  padding: 0 10px 0 18px;
  border: 1px solid #e1e7ec;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #4b5563;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.quick-tab--selected {
  border-color: #9ed0ba;
  background: #ffffff;
  color: var(--admin-brand);
  box-shadow: 0 1px 2px rgba(45, 139, 104, 0.08);
}

.quick-tab__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(31, 122, 90, 0.12);
  background: #f3faf6;
  color: #217756;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

.quick-tab__action--selected {
  border-color: rgba(31, 122, 90, 0.18);
  background: #e5f4ec;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(220px, 1fr) auto;
  gap: 10px 14px;
  align-items: end;
}

.field {
  display: grid;
  gap: 6px;
}

.field__label {
  color: #7f8a90;
  font-size: 11.5px;
  font-weight: 600;
}

.field__label--ghost {
  opacity: 0;
  pointer-events: none;
}

.field__control {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 40px;
  border: 1px solid #dbe3e8;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: none;
  overflow: hidden;
}

.field__control:focus-within {
  border-color: rgba(31, 122, 90, 0.3);
  box-shadow:
    0 0 0 4px rgba(45, 139, 104, 0.08),
    0 1px 2px rgba(15, 23, 42, 0.04);
}

.field__control input,
.field__control select {
  width: 100%;
  min-width: 0;
  height: 38px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: #405463;
  font: inherit;
  font-size: 12.5px;
  outline: none;
}

.field__control input::placeholder,
.field__control select {
  color: #9ba8b3;
}

.field__control input[type="date"]::-webkit-calendar-picker-indicator {
  position: absolute;
  inset: 0 0 0 auto;
  width: 42px;
  opacity: 0;
  cursor: pointer;
}

.field__control--select select {
  appearance: none;
  padding-right: 38px;
}

.field__icon {
  position: absolute;
  right: 11px;
  color: #c3c8ce;
  pointer-events: none;
}

.field__icon svg,
.date-single__icon svg,
.date-single__caret svg,
.icon-btn svg,
.view-switch__btn svg,
.member-card__select svg,
.member-card__delete svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.date-single {
  position: relative;
}

.field__control--date-single {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  border-color: #dbe3e8;
  background: #ffffff;
  box-shadow: none;
  cursor: pointer;
}

.field__control--date-single:focus-within {
  border-color: rgba(31, 122, 90, 0.3);
  box-shadow:
    0 0 0 4px rgba(45, 139, 104, 0.08),
    0 1px 2px rgba(15, 23, 42, 0.04);
}

.date-single__content {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  width: 100%;
  gap: 8px;
  align-items: center;
}

.date-single__icon,
.date-single__caret {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #56635e;
}

.date-single__value {
  color: #2f4741;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  text-align: left;
}

.date-single__value--placeholder {
  color: #9aaba4;
}

.date-single__native-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  background: transparent;
  opacity: 0;
  pointer-events: none;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.icon-btn,
.action-btn,
.card-btn,
.view-switch__btn {
  border: 1px solid transparent;
  font: inherit;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 13px;
}

.icon-btn--primary,
.action-btn--primary,
.card-btn--primary {
  background: var(--brand);
  color: #fff;
  box-shadow: none;
}

.icon-btn--ghost,
.action-btn--ghost,
.card-btn--ghost {
  border-color: #dbe3e8;
  background: #fff;
  color: #25384c;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.toolbar__left,
.toolbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.view-switch {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 999px;
  background: #f3f4f6;
}

.view-switch__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: transparent;
  color: #aeb4bc;
}

.view-switch__btn--active {
  color: var(--admin-brand);
  background: #fff;
  box-shadow: none;
}

.toolbar__count {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid #dbe3e8;
  border-radius: 999px;
  background: #f8fafc;
  color: #667085;
  font-size: 11.5px;
  font-weight: 600;
}

.action-btn {
  min-width: 78px;
  height: 36px;
  padding: 0 15px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.action-btn--danger {
  background: #d8574f;
  color: #fff;
}

.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid #dbe3e8;
  border-radius: 16px;
  background: #ffffff;
}

.batch-bar__summary {
  display: grid;
  gap: 4px;
}

.batch-bar__summary strong {
  color: #22343b;
  font-size: 14px;
}

.batch-bar__summary span {
  color: #7e8b95;
  font-size: 12px;
}

.batch-bar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.member-grid {
  display: grid;
  gap: 12px;
}

.member-grid--grid {
  grid-template-columns: repeat(auto-fit, minmax(228px, 1fr));
}

.member-grid--list {
  grid-template-columns: 1fr;
}

.member-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.member-table {
  --member-table-columns:
    minmax(0, 1.52fr)
    minmax(0, 0.9fr)
    minmax(0, 0.82fr)
    minmax(0, 1.22fr)
    minmax(0, 1.04fr)
    minmax(0, 1.34fr);
  --member-table-columns-batch:
    42px
    minmax(0, 1.52fr)
    minmax(0, 0.9fr)
    minmax(0, 0.82fr)
    minmax(0, 1.22fr)
    minmax(0, 1.04fr)
    minmax(0, 1.34fr);
  min-width: 980px;
}

.member-table__head,
.member-row {
  display: grid;
  grid-template-columns: var(--member-table-columns);
  align-items: center;
}

.member-table__head--batch,
.member-row--batch {
  grid-template-columns: var(--member-table-columns-batch);
}

.member-table__head {
  min-height: 46px;
  padding: 0 6px;
  border-bottom: 1px solid #eef2f5;
  background: #f8fafb;
}

.member-table__cell {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0 6px;
  color: #55626e;
  font-size: 11.5px;
  font-weight: 700;
}

.member-table__cell--check,
.member-row__cell--check {
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-table__body {
  background: #ffffff;
}

.member-row {
  min-height: 74px;
  padding: 0 6px;
  border-bottom: 1px solid #eef2f5;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.member-row:last-child {
  border-bottom: 0;
}

.member-row--selected {
  background: #f8fcfa;
}

.member-row__cell {
  min-width: 0;
  padding: 10px 6px;
  color: #405463;
  font-size: 11.5px;
  overflow: hidden;
}

.member-row__cell--user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-row__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--avatar-shadow);
  color: rgba(255, 255, 255, 0.88);
  font-size: 13px;
  font-weight: 700;
}

.member-row__user-text {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.member-row__user-text strong,
.member-row__cell--name,
.member-row__cell--id {
  color: var(--text-strong);
}

.member-row__user-text strong {
  font-size: 13.5px;
  font-weight: 700;
}

.member-row__user-text span {
  color: #7e8b95;
  font-size: 10.5px;
}

.member-row__cell--id,
.member-row__cell--name,
.member-row__cell--time {
  font-size: 12.5px;
  line-height: 1.4;
}

.member-row__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.member-row__tags .tag-pill {
  padding: 2px 7px;
  font-size: 10.5px;
}

.member-row__empty {
  color: #9aa7b3;
  font-size: 10.5px;
}

.member-row__cell--actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.table-check,
.row-action {
  border: 1px solid transparent;
  font: inherit;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.table-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-color: #d6e3dd;
  border-radius: 6px;
  background: #ffffff;
  color: transparent;
}

.table-check--active {
  border-color: var(--brand);
  background: rgba(45, 139, 104, 0.08);
  color: var(--brand);
}

.table-check svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.row-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 27px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
  flex: 0 0 auto;
}

.row-action--primary {
  border-color: #d6ece3;
  background: #f5fbf8;
  color: var(--brand);
}

.row-action--ghost {
  border-color: #dbe3e8;
  background: #ffffff;
  color: #425466;
}

.row-action--danger {
  border-color: #f3d2d0;
  background: #fff7f6;
  color: #d8574f;
}

.member-card {
  position: relative;
  padding: 14px 14px 12px;
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.member-card--batch {
  padding-top: 46px;
}

.member-card--selected {
  border-color: rgba(31, 122, 90, 0.28);
  box-shadow: 0 8px 20px rgba(31, 122, 90, 0.08);
}

.member-card__select,
.member-card__delete {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #ffffff;
  z-index: 2;
}

.member-card__select {
  top: 10px;
  left: 10px;
  border: 1px solid #d6e3dd;
  color: transparent;
}

.member-card__select--active {
  border-color: var(--admin-brand);
  background: rgba(31, 122, 90, 0.08);
  color: var(--admin-brand);
}

.member-card__delete {
  top: 10px;
  right: 10px;
  border: 1px solid #e5e7eb;
  color: #b3b8bf;
}

.member-card__header {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 10px;
  padding-right: 24px;
}

.member-card__avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  color: rgba(255, 255, 255, 0.84);
  font-size: 15px;
  font-weight: 700;
  background: var(--avatar-shadow);
}

.member-card__heading h3 {
  margin: 0 0 3px;
  color: var(--text-strong);
  font-size: 14px;
}

.member-card__heading p {
  margin: 0;
  color: #99a4b2;
  font-size: 10.5px;
}

.member-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
}

.tag-pill--mint {
  background: rgba(70, 208, 168, 0.12);
  color: #32c08d;
}

.tag-pill--peach {
  background: rgba(255, 114, 86, 0.1);
  color: #ff7456;
}

.tag-pill--lavender {
  background: rgba(98, 120, 255, 0.12);
  color: #6677ff;
}

.tag-pill--gold {
  background: rgba(255, 201, 84, 0.16);
  color: #b17c1e;
}

.member-card__meta {
  display: grid;
  gap: 5px;
  margin: 0;
  color: #8a95a3;
  font-size: 11.5px;
  line-height: 1.4;
}

.member-card__meta div {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 6px;
}

.member-card__meta dt,
.member-card__meta dd {
  margin: 0;
}

.member-card__meta dt {
  color: #7e8895;
}

.member-card__meta dd {
  color: #4b5e6b;
}

.member-card__footer {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.card-btn {
  flex: 1;
  min-height: 34px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 600;
}

.empty-state {
  padding: 32px 18px;
  border-radius: 16px;
  border: 1px solid var(--panel-border);
  background: #ffffff;
  text-align: center;
}

.empty-state strong {
  display: block;
  margin-bottom: 8px;
  color: var(--text-strong);
  font-size: 14px;
}

.empty-state p {
  margin: 0;
  color: var(--text-soft);
  font-size: 12px;
}

.dialog-mask,
.tag-editor-mask {
  position: fixed;
  inset: 0;
  z-index: 48;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.32);
  backdrop-filter: blur(8px);
}

.dialog-panel,
.tag-editor {
  width: min(580px, 100%);
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 20px;
  border: 1px solid var(--panel-border);
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
}

.dialog-panel__header,
.dialog-panel__footer,
.tag-editor__header,
.tag-editor__footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.dialog-panel__eyebrow,
.tag-editor__eyebrow {
  margin: 0 0 6px;
  color: var(--admin-brand);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.dialog-panel__header h3,
.tag-editor__header h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 18px;
}

.dialog-panel__summary,
.tag-editor__summary {
  margin: 8px 0 0;
  color: var(--text-soft);
  font-size: 12.5px;
  line-height: 1.7;
}

.dialog-panel__close,
.tag-editor__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border: 1px solid #dbe3e8;
  border-radius: 999px;
  background: #fff;
  color: #7b8794;
}

.dialog-panel__close svg,
.tag-editor__close svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.dialog-field {
  display: grid;
  gap: 6px;
}

.dialog-field span,
.dialog-section__label {
  color: #687782;
  font-size: 12px;
  font-weight: 700;
}

.dialog-field input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #dbe3e8;
  border-radius: 12px;
  background: #f9fbfc;
  color: #30464c;
  font: inherit;
  font-size: 13px;
  outline: none;
}

.dialog-field input:focus {
  border-color: rgba(31, 122, 90, 0.3);
  box-shadow: 0 0 0 4px rgba(45, 139, 104, 0.08);
}

.dialog-field--inline {
  gap: 0;
}

.dialog-section {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.dialog-tags,
.dialog-selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dialog-custom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.tag-editor__section {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.tag-editor__label {
  color: #687782;
  font-size: 12px;
  font-weight: 700;
}

.tag-editor__selected,
.tag-editor__options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-tag--editor {
  min-height: 32px;
  background: #f6fbf8;
}

.tag-editor__empty {
  color: #97a3ad;
  font-size: 12px;
  line-height: 1.6;
}

.tag-editor__custom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.tag-editor__input {
  display: flex;
  align-items: center;
  min-height: 40px;
  border: 1px solid #dbe3e8;
  border-radius: 12px;
  background: #f9fbfc;
  overflow: hidden;
}

.tag-editor__input:focus-within {
  border-color: rgba(31, 122, 90, 0.3);
  box-shadow: 0 0 0 4px rgba(45, 139, 104, 0.08);
}

.tag-editor__input input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: #30464c;
  font: inherit;
  font-size: 13px;
  outline: none;
}

.tag-editor__input input::placeholder {
  color: #9aa7b3;
}

.tag-editor__append {
  min-width: 74px;
}

.dialog-panel__footer,
.tag-editor__footer {
  justify-content: flex-end;
  margin-top: 22px;
}

:global(body.member-list-shell-hidden .admin-topbar) {
  display: none;
}

:global(body.member-list-shell-hidden .admin-main) {
  gap: 0;
}

:global(body.member-list-shell-hidden .admin-content) {
  padding-top: 0;
}

@media (hover: hover) {
  .selected-tag:hover,
  .selected-tags-bar__clear:hover,
  .quick-tab:hover,
  .dialog-panel__close:hover,
  .tag-editor__close:hover,
  .view-switch__btn:hover,
  .action-btn--ghost:hover,
  .card-btn--ghost:hover,
  .icon-btn--ghost:hover {
    border-color: #bfdbcf;
    color: var(--admin-brand);
  }

  .quick-tabs__all:hover {
    border-color: #9ed0ba;
    background: #eef8f3;
    color: var(--admin-brand);
    box-shadow: 0 1px 2px rgba(45, 139, 104, 0.08);
    transform: none;
  }

  .quick-tab:hover {
    border-color: #cfd8df;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }

  .table-check:hover {
    border-color: rgba(31, 122, 90, 0.24);
  }

  .row-action--primary:hover {
    border-color: #bfdbcf;
    background: #eef8f3;
    color: var(--brand);
  }

  .row-action--ghost:hover {
    border-color: #bfdbcf;
    color: var(--brand);
  }

  .row-action--danger:hover {
    border-color: #efb8b3;
    background: #fff1ef;
  }

  .member-card__select:hover {
    border-color: rgba(31, 122, 90, 0.24);
  }

  .member-row:hover {
    background: #fbfcfd;
  }

  .member-row--selected:hover {
    background: #f8fcfa;
  }

  .member-card:hover {
    transform: translateY(-1px);
    border-color: #bfdbcf;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
  }
}

@media (max-width: 1180px) {
  .filter-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .dialog-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  .filter-panel,
  .content-panel {
    padding: 16px;
    border-radius: 18px;
  }

  .filter-grid,
  .selected-tags-bar,
  .quick-selector,
  .batch-bar,
  .toolbar,
  .toolbar__left,
  .toolbar__actions,
  .batch-bar__actions,
  .member-card__footer,
  .dialog-panel__footer,
  .tag-editor__footer {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .filter-grid {
    display: grid;
  }

  .selected-tags-bar {
    gap: 8px;
    align-items: stretch;
  }

  .quick-selector {
    align-items: stretch;
  }

  .filter-actions,
  .toolbar__left,
  .toolbar__actions {
    width: 100%;
  }

  .quick-tabs,
  .quick-tabs__all,
  .view-switch,
  .toolbar__count,
  .icon-btn,
  .action-btn,
  .card-btn,
  .dialog-custom .action-btn,
  .tag-editor__append {
    width: 100%;
  }

  .view-switch {
    justify-content: center;
  }

  .dialog-mask,
  .tag-editor-mask {
    padding: 16px;
  }

  .dialog-grid,
  .dialog-custom,
  .tag-editor__custom {
    grid-template-columns: 1fr;
  }
}
</style>
