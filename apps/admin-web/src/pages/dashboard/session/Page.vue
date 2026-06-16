<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import {
  endAdminConversation,
  getAdminConversationDetail,
  getAdminConversations,
  sendAdminConversationMessage,
} from "@/shared/api/messaging";
import { handleAdminPageError } from "@/shared/api/error";
import { currentAdminAvatarUrl, currentAdminDisplayName } from "@/shared/current-admin-user";
import AdminUserAvatar from "@/components/AdminUserAvatar.vue";
import { orderDetailStorageKey } from "../order-list/mock";
import mockSeed from "./mock";

type RightTab = "customer" | "goods";
type CustomerTagTone = "green" | "red" | "violet" | "amber";

const props = defineProps<PageComponentProps>();
const mock = ref<typeof mockSeed>(mockSeed);
const activeRightTab = ref<RightTab>("customer");
const goodsKeyword = ref("");
const conversationKeyword = ref("");
const messageDraft = ref("");
const activeConversationId = ref("");
const chatBodyRef = ref<HTMLElement | null>(null);
const customerTagTones: CustomerTagTone[] = ["green", "red", "violet", "amber"];
const customerAvatarFallback = "/api/v1/assets/demo/avatars/avatar-1.jpg";

type ConversationRow = {
  id: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
  avatar: string;
  active: boolean;
};

const filteredGoods = computed(() =>
  mock.value.goods.filter((item) => !goodsKeyword.value.trim() || item.title.includes(goodsKeyword.value.trim())),
);

const sessionHeroTitle = computed(() => (mock.value.title.includes("中心") ? mock.value.title : `${mock.value.title}中心`));
const unreadConversationCount = computed(() =>
  mock.value.conversations.reduce((total, item) => total + Number(item.unread || 0), 0),
);
const sessionSummary = computed(() => [
  { label: "活跃会话", value: String(mock.value.conversations.length).padStart(2, "0") },
  { label: "未读消息", value: String(unreadConversationCount.value).padStart(2, "0") },
  { label: "关联订单", value: String(mock.value.orders.length).padStart(2, "0") },
  { label: "推荐商品", value: String(mock.value.goods.length).padStart(2, "0") },
]);

function mapOrderStatus(status?: string) {
  switch (status) {
    case "COMPLETED":
      return "已完成";
    case "IN_SERVICE":
    case "SCHEDULED":
      return "服务中";
    case "CANCELLED":
      return "已关闭";
    case "AFTER_SALE":
      return "售后中";
    default:
      return status || "待处理";
  }
}

function buildCustomerTags(tags: unknown) {
  return Array.isArray(tags)
    ? tags
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((label, index) => ({
          label,
          tone: customerTagTones[index % customerTagTones.length],
        }))
    : [];
}

function scrollChatToBottom() {
  void nextTick(() => {
    const chatBody = chatBodyRef.value;

    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  });
}

function resolveMessageAvatar(item: Record<string, unknown>) {
  if (item.side !== "left") {
    return currentAdminAvatarUrl.value;
  }

  const avatar = String(item.avatar ?? "");

  if (avatar) {
    return avatar;
  }

  return mock.value.customer.avatar || customerAvatarFallback;
}

function normalizeConversationRows(rows: ConversationRow[]) {
  const groupedRows = new Map<string, ConversationRow>();

  rows.forEach((row) => {
    const groupKey = `${row.name || row.id}:${row.avatar || "default"}`;
    const existing = groupedRows.get(groupKey);

    if (!existing) {
      groupedRows.set(groupKey, { ...row, active: false });
      return;
    }

    existing.unread += row.unread;
    existing.preview = existing.preview || row.preview;
  });

  return Array.from(groupedRows.values());
}

async function syncConversationDetail(conversationId: string) {
  try {
    const detail = await getAdminConversationDetail(conversationId);
    activeConversationId.value = conversationId;
    mock.value = {
      ...mock.value,
      title: String(detail.title ?? mock.value.title),
      currentSessionName: String(detail.currentSessionName ?? ""),
      messages: Array.isArray(detail.messages)
        ? detail.messages.map((item: Record<string, unknown>) => ({
            id: String(item.id ?? ""),
            side: item.side === "left" ? "left" : "right",
            text: String(item.text ?? ""),
            avatar: resolveMessageAvatar(item),
          }))
        : [],
      customer: detail.customer
        ? {
            name: String(detail.customer.name ?? ""),
            avatar: String(detail.customer.avatar || customerAvatarFallback),
            tags: buildCustomerTags(detail.customer.tags),
            orderCount: Number(detail.customer.orderCount ?? 0),
            amount: String(detail.customer.amount ?? "0.00"),
          }
        : mock.value.customer,
      orders: Array.isArray(detail.orders)
        ? detail.orders.map((item: Record<string, unknown>) => ({
            id: String(item.id ?? ""),
            status: mapOrderStatus(String(item.status ?? "")),
            title: String(item.title ?? ""),
            image: String(item.image ?? ""),
            time: String(item.time ?? ""),
            amount: String(item.amount ?? ""),
          }))
        : [],
      goods: Array.isArray(detail.goods)
        ? detail.goods.map((item: Record<string, unknown>) => ({
            id: String(item.id ?? ""),
            title: String(item.title ?? ""),
            image: String(item.image ?? ""),
            price: String(item.price ?? ""),
          }))
        : [],
      conversations: mock.value.conversations.map((item) => ({
        ...item,
        active: item.id === conversationId,
      })),
    };
    scrollChatToBottom();
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "会话详情加载失败，已回退到演示数据",
    });
  }
}

async function syncConversationList() {
  try {
    const response = await getAdminConversations({
      page: 1,
      pageSize: 50,
      keyword: conversationKeyword.value.trim() || undefined,
    });
    const conversations = Array.isArray(response.conversations)
      ? normalizeConversationRows(response.conversations.map((item: Record<string, unknown>) => ({
          id: String(item.id ?? ""),
          name: String(item.name ?? ""),
          preview: String(item.preview ?? ""),
          time: String(item.time ?? ""),
          unread: Number(item.unread ?? 0),
          avatar: String(item.avatar || customerAvatarFallback),
          active: false,
        })))
      : [];

    mock.value = {
      ...mock.value,
      title: String(response.title ?? mock.value.title),
      conversations: conversations.length > 0 ? conversations : mock.value.conversations,
    };

    const availableConversations = mock.value.conversations;
    const nextConversationId =
      activeConversationId.value && availableConversations.some((item) => item.id === activeConversationId.value)
        ? activeConversationId.value
        : availableConversations[0]?.id ?? "";

    if (nextConversationId) {
      await syncConversationDetail(nextConversationId);
    }
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "会话列表加载失败，已回退到演示数据",
    });
  }
}

async function searchConversations() {
  await syncConversationList();
}

async function openConversation(conversationId: string) {
  await syncConversationDetail(conversationId);
}

async function sendMessage(content?: string) {
  const currentConversationId = activeConversationId.value;
  const nextContent = (content ?? messageDraft.value).trim();

  if (!currentConversationId || !nextContent) {
    return;
  }

  try {
    await sendAdminConversationMessage(currentConversationId, {
      contentType: "TEXT",
      content: nextContent,
    });
    messageDraft.value = "";
    await syncConversationDetail(currentConversationId);
    scrollChatToBottom();
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "消息发送失败，请稍后重试",
    });
  }
}

async function finishConversation() {
  if (!activeConversationId.value) {
    return;
  }

  try {
    await endAdminConversation(activeConversationId.value);
    props.showToast("会话已结束");
    await syncConversationList();
  } catch (error) {
    handleAdminPageError(error, {
      navigation: props.navigation,
      showToast: props.showToast,
      fallbackMessage: "结束会话失败，请稍后重试",
    });
  }
}

function openOrderDetail(orderId: string) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(orderDetailStorageKey, orderId);
  }

  props.navigation.navigateTo("dashboard/order-detail");
}

onMounted(() => {
  void syncConversationList();
});
</script>

<template>
  <section class="session-page">
    <article class="hero-card">
      <div class="hero-card__main">
        <div class="hero-card__copy">
          <h1>{{ sessionHeroTitle }}</h1>
          <p>统一查看用户咨询、客服响应与关联订单。</p>
        </div>

        <div class="hero-card__stats">
          <article v-for="item in sessionSummary" :key="item.label" class="hero-stat">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>
      </div>
    </article>

    <article class="session-shell surface-card">
      <header class="shell-head">
        <div>
          <h2>实时会话面板 <small>消息、订单、商品推荐联动查看</small></h2>
        </div>
        <button type="button" class="ghost-button" @click="finishConversation">结束当前会话</button>
      </header>

      <div class="session-layout">
        <aside class="conversation-pane">
          <header class="subpanel-head">
            <h3>会话列表</h3>
            <span>{{ mock.conversations.length }} 条</span>
          </header>

          <div class="search-field">
            <input v-model="conversationKeyword" type="text" placeholder="搜索会话" @keydown.enter="searchConversations" />
            <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
              <circle cx="9" cy="9" r="5.6" fill="none" stroke="currentColor" stroke-width="1.8" />
              <path d="m13.3 13.3 4 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
            </svg>
          </div>

          <div class="conversation-list">
            <button
              v-for="item in mock.conversations"
              :key="item.id"
              class="conversation-item"
              :class="{ 'conversation-item--active': item.active }"
              type="button"
              @click="openConversation(item.id)"
            >
              <img :src="item.avatar" :alt="item.name" />
              <div class="conversation-item__body">
                <div class="conversation-item__top">
                  <strong>{{ item.name }}</strong>
                  <span>{{ item.time }}</span>
                </div>
                <div class="conversation-item__bottom">
                  <span>{{ item.preview }}</span>
                  <i v-if="item.unread" class="conversation-item__badge">{{ item.unread }}</i>
                </div>
              </div>
            </button>
          </div>
        </aside>

        <section class="chat-pane">
          <header class="chat-head">
            <div>
              <strong>{{ mock.currentSessionName || "当前会话" }}</strong>
              <span>实时消息流</span>
            </div>
            <button type="button" class="ghost-button ghost-button--compact" @click="finishConversation">结束会话</button>
          </header>

          <div ref="chatBodyRef" class="chat-body">
            <div class="chat-timestamp">10:10</div>

            <article v-for="message in mock.messages" :key="message.id" class="message" :class="`message--${message.side}`">
              <img v-if="message.side === 'left'" :src="message.avatar" alt="客户头像" />
              <AdminUserAvatar
                v-else
                :src="currentAdminAvatarUrl"
                :name="currentAdminDisplayName"
                :size="44"
                alt="客服头像"
              />
              <div class="message__bubble">{{ message.text }}</div>
            </article>
          </div>

          <footer class="chat-input">
            <input v-model="messageDraft" type="text" placeholder="输入消息后按回车发送" @keydown.enter="sendMessage()" />
            <button type="button" @click="sendMessage()">发送</button>
          </footer>
        </section>

        <aside class="detail-pane">
          <header class="detail-tabs">
            <button
              class="detail-tabs__item"
              :class="{ 'detail-tabs__item--active': activeRightTab === 'customer' }"
              type="button"
              @click="activeRightTab = 'customer'"
            >
              客户资料
            </button>
            <button
              class="detail-tabs__item"
              :class="{ 'detail-tabs__item--active': activeRightTab === 'goods' }"
              type="button"
              @click="activeRightTab = 'goods'"
            >
              商品列表
            </button>
          </header>

          <template v-if="activeRightTab === 'customer'">
            <section class="customer-card inner-card">
              <div class="customer-card__top">
                <img :src="mock.customer.avatar" :alt="mock.customer.name" />
                <div class="customer-card__identity">
                  <div>
                    <strong>{{ mock.customer.name }}</strong>
                    <button type="button">查看资料</button>
                  </div>
                  <div class="customer-tags">
                    <span v-for="tag in mock.customer.tags" :key="tag.label" class="customer-tag" :class="`customer-tag--${tag.tone}`">
                      {{ tag.label }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="customer-stats">
                <div>
                  <span>累计订单数</span>
                  <strong>{{ mock.customer.orderCount }}</strong>
                </div>
                <div>
                  <span>累计消费金额（元）</span>
                  <strong>{{ mock.customer.amount }}</strong>
                </div>
              </div>
            </section>

            <section class="order-list">
              <header class="subpanel-head subpanel-head--compact">
                <h3>关联订单</h3>
                <span>{{ mock.orders.length }} 笔</span>
              </header>

              <article v-for="order in mock.orders" :key="order.id" class="order-card inner-card">
                <div class="order-card__status">{{ order.status }}</div>
                <div class="order-card__main">
                  <img :src="order.image" :alt="order.title" />
                  <div class="order-card__content">
                    <strong>{{ order.title }}</strong>
                    <button type="button" @click="openOrderDetail(order.id)">订单详情</button>
                  </div>
                </div>
                <div class="order-card__meta">
                  <span>下单时间：{{ order.time }}</span>
                  <span>订单金额：{{ order.amount }}</span>
                </div>
              </article>
            </section>
          </template>

          <section v-else class="goods-panel">
            <div class="search-field search-field--compact">
              <input v-model="goodsKeyword" type="text" placeholder="搜索商品" />
              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                <circle cx="9" cy="9" r="5.6" fill="none" stroke="currentColor" stroke-width="1.8" />
                <path d="m13.3 13.3 4 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
              </svg>
            </div>

            <div class="goods-list">
              <article v-for="item in filteredGoods" :key="item.id" class="goods-item inner-card">
                <img :src="item.image" :alt="item.title" />
                <div class="goods-item__content">
                  <strong>{{ item.title }}</strong>
                  <span>￥{{ item.price }}</span>
                </div>
                <button type="button" class="goods-item__send" @click="sendMessage(`为您推荐服务：${item.title} ￥${item.price}`)">发送</button>
              </article>
            </div>
          </section>
        </aside>
      </div>
    </article>
  </section>
</template>

<style scoped>
.session-page {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 18px;
  width: 100%;
  height: calc(100vh - 98px);
  min-width: 0;
  min-height: 720px;
  color: #253244;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.hero-card,
.surface-card {
  border: 1px solid rgba(224, 240, 238, 0.86);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 24px rgba(66, 122, 116, 0.08);
}

.hero-card {
  overflow: hidden;
  padding: 20px 22px;
  background:
    radial-gradient(circle at top right, rgba(170, 235, 255, 0.34), transparent 24%),
    radial-gradient(circle at left top, rgba(102, 214, 174, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.99), rgba(245, 251, 248, 0.96));
}

.hero-card__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.hero-card__copy h1 {
  margin: 0;
  color: #1f6f67;
  font-size: 28px;
  font-weight: 900;
  line-height: 1.15;
}

.hero-card__copy p {
  max-width: 720px;
  margin: 12px 0 0;
  color: #5d6876;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.65;
}

.hero-card__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(96px, 1fr));
  gap: 12px;
  min-width: 452px;
}

.hero-stat {
  padding: 14px 16px;
  border: 1px solid rgba(214, 233, 227, 0.94);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.hero-stat span {
  display: block;
  color: #7b8793;
  font-size: 12px;
  font-weight: 800;
}

.hero-stat strong {
  display: block;
  margin-top: 10px;
  color: #263244;
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
}

.session-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
}

.shell-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 16px;
  border-bottom: 1px solid #edf4f1;
}

.shell-head h2,
.subpanel-head h3 {
  margin: 0;
  color: #1f6f67;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.shell-head small {
  color: #557c77;
  font-size: 14px;
  font-weight: 900;
}

.ghost-button {
  min-width: 124px;
  height: 44px;
  padding: 0 16px;
  border: 1px solid #dbe9e4;
  border-radius: 12px;
  background: #ffffff;
  color: #33404d;
  font-size: 13px;
  font-weight: 700;
}

.ghost-button--compact {
  min-width: auto;
  height: 40px;
}

.session-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 392px;
  min-height: 0;
}

.conversation-pane,
.chat-pane,
.detail-pane {
  min-width: 0;
}

.conversation-pane,
.chat-pane {
  border-right: 1px solid #edf4f1;
}

.conversation-pane {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  background: linear-gradient(180deg, rgba(249, 252, 251, 0.9), rgba(255, 255, 255, 0.96));
}

.subpanel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 18px 14px;
}

.subpanel-head span {
  color: #7f8c98;
  font-size: 12px;
  font-weight: 800;
}

.subpanel-head--compact {
  padding: 0 0 14px;
}

.search-field {
  position: relative;
  margin: 0 18px 16px;
}

.search-field input {
  width: 100%;
  height: 48px;
  padding: 0 48px 0 16px;
  border: 1px solid #e0ebe7;
  border-radius: 14px;
  background: #ffffff;
  color: #44515d;
  font-size: 13px;
  font-weight: 500;
  outline: none;
}

.search-field input::placeholder {
  color: #b8c1c9;
}

.search-field svg {
  position: absolute;
  top: 50%;
  right: 14px;
  width: 20px;
  height: 20px;
  color: #b6c0c7;
  transform: translateY(-50%);
}

.search-field--compact {
  margin: 0 0 16px;
}

.conversation-list {
  display: grid;
  align-content: start;
  padding: 0 12px 12px;
  overflow: auto;
}

.conversation-item {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 16px;
  border: 1px solid transparent;
  border-radius: 16px;
  background: transparent;
  text-align: left;
}

.conversation-item + .conversation-item {
  margin-top: 8px;
}

.conversation-item--active {
  border-color: rgba(130, 215, 189, 0.6);
  background: linear-gradient(135deg, rgba(233, 251, 244, 0.94), rgba(248, 255, 252, 0.98));
  box-shadow: 0 12px 28px -24px rgba(66, 184, 132, 0.4);
}

.conversation-item img {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

.conversation-item__body {
  min-width: 0;
}

.conversation-item__top,
.conversation-item__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.conversation-item__top strong {
  color: #313b48;
  font-size: 14px;
  font-weight: 800;
}

.conversation-item__top span,
.conversation-item__bottom span {
  color: #8b96a2;
  font-size: 12px;
  font-weight: 600;
}

.conversation-item__bottom {
  margin-top: 8px;
}

.conversation-item__bottom span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-item__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ff7c74;
  color: #ffffff;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}

.chat-pane {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: linear-gradient(180deg, rgba(251, 253, 252, 0.72), rgba(255, 255, 255, 0.98));
}

.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 22px;
  border-bottom: 1px solid #edf4f1;
}

.chat-head strong {
  display: block;
  color: #313b48;
  font-size: 18px;
  font-weight: 900;
}

.chat-head span {
  display: block;
  margin-top: 6px;
  color: #7b8793;
  font-size: 12px;
  font-weight: 700;
}

.chat-body {
  min-height: 0;
  overflow: auto;
  padding: 20px 24px 12px;
}

.chat-timestamp {
  width: fit-content;
  margin: 0 auto 22px;
  padding: 6px 18px;
  border-radius: 999px;
  background: #eff4f2;
  color: #9eabb7;
  font-size: 12px;
  font-weight: 700;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.message--right {
  flex-direction: row-reverse;
  justify-content: flex-start;
}

.message img,
.message :deep(.admin-user-avatar) {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 8px 18px rgba(76, 120, 108, 0.12);
}

.message__bubble {
  max-width: min(460px, 72%);
  padding: 12px 18px;
  border-radius: 18px 18px 18px 8px;
  background: #ffffff;
  color: #3c4652;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
  box-shadow: 0 10px 24px rgba(61, 83, 73, 0.06);
}

.message--right .message__bubble {
  border-radius: 18px 18px 8px 18px;
  background: linear-gradient(135deg, #5ad1ab, #40bf97);
  color: #ffffff;
}

.chat-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 14px 18px;
  border-top: 1px solid #edf4f1;
  background: rgba(255, 255, 255, 0.98);
}

.chat-input input {
  width: 100%;
  height: 48px;
  padding: 0 18px;
  border: 1px solid #dfeae6;
  border-radius: 14px;
  background: #ffffff;
  color: #44515d;
  font-size: 13px;
  font-weight: 500;
  outline: none;
}

.chat-input input::placeholder {
  color: #bcc5cc;
}

.chat-input button {
  width: 84px;
  height: 48px;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #5ad1ab, #35b98e);
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 10px 20px rgba(53, 185, 142, 0.18);
}

.detail-pane {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  padding: 16px;
  background: linear-gradient(180deg, rgba(248, 252, 250, 0.88), rgba(255, 255, 255, 0.96));
}

.goods-panel,
.order-list {
  min-height: 0;
  overflow: auto;
}

.detail-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.detail-tabs__item {
  height: 44px;
  border: 1px solid #dfeae6;
  border-radius: 12px;
  background: #ffffff;
  color: #50606e;
  font-size: 13px;
  font-weight: 800;
}

.detail-tabs__item--active {
  border-color: rgba(82, 198, 175, 0.5);
  background: linear-gradient(135deg, rgba(230, 251, 246, 0.98), rgba(255, 255, 255, 0.98));
  color: #1f8c67;
}

.inner-card {
  border: 1px solid #e8f0ed;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 24px rgba(86, 120, 110, 0.05);
}

.customer-card {
  padding: 18px;
}

.customer-card__top {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.customer-card__top img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
}

.customer-card__identity > div:first-child {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.customer-card__identity strong {
  color: #313b48;
  font-size: 15px;
  font-weight: 900;
}

.customer-card__identity button,
.order-card__content button,
.goods-item__send {
  padding: 0;
  border: 0;
  background: transparent;
  color: #25a57c;
  font-size: 12px;
  font-weight: 800;
}

.customer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.customer-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  height: 28px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 800;
}

.customer-tag--green {
  background: #e8fbf5;
  color: #30ca97;
}

.customer-tag--red {
  background: #fff0ef;
  color: #ff7f78;
}

.customer-tag--violet {
  background: #eff0ff;
  color: #6c75f5;
}

.customer-tag--amber {
  background: #fff7e8;
  color: #d79b2d;
}

.customer-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.customer-stats div {
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(246, 251, 249, 0.96), rgba(255, 255, 255, 0.98));
  border: 1px solid #eef4f2;
}

.customer-stats span {
  color: #8d99a4;
  font-size: 12px;
  font-weight: 700;
}

.customer-stats strong {
  display: block;
  margin-top: 8px;
  color: #32404c;
  font-size: 18px;
  font-weight: 900;
}

.order-list,
.goods-panel {
  margin-top: 16px;
}

.order-card + .order-card,
.goods-item + .goods-item {
  margin-top: 12px;
}

.order-card {
  overflow: hidden;
}

.order-card__status {
  padding: 12px 16px;
  background: #f7faf8;
  color: #7f8b97;
  font-size: 12px;
  font-weight: 800;
}

.order-card__main {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 16px;
}

.order-card__main img,
.goods-item img {
  border-radius: 10px;
  object-fit: cover;
}

.order-card__main img {
  width: 68px;
  height: 56px;
}

.order-card__content strong,
.goods-item__content strong {
  display: block;
  color: #42505c;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.5;
}

.order-card__content button {
  margin-top: 8px;
}

.order-card__meta {
  display: grid;
  gap: 8px;
  padding: 0 16px 16px;
  color: #8995a0;
  font-size: 12px;
  font-weight: 700;
}

.goods-list {
  display: grid;
}

.goods-item {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
}

.goods-item img {
  width: 88px;
  height: 68px;
}

.goods-item__content {
  min-width: 0;
}

.goods-item__content strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goods-item__content span {
  display: block;
  margin-top: 10px;
  color: #32404c;
  font-size: 13px;
  font-weight: 900;
}

@media (max-width: 1560px) {
  .hero-card__main {
    flex-direction: column;
  }

  .hero-card__stats {
    min-width: 0;
    width: 100%;
  }

  .session-layout {
    grid-template-columns: 300px minmax(0, 1fr) 352px;
  }
}

@media (max-width: 1220px) {
  .session-page {
    height: auto;
    min-height: 0;
  }

  .session-layout {
    grid-template-columns: 1fr;
  }

  .conversation-pane,
  .chat-pane {
    border-right: 0;
    border-bottom: 1px solid #edf4f1;
  }
}

@media (max-width: 780px) {
  .hero-card,
  .shell-head,
  .detail-pane {
    padding-left: 16px;
    padding-right: 16px;
  }

  .hero-card__stats,
  .customer-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .shell-head {
    flex-direction: column;
    align-items: stretch;
  }

  .goods-item {
    grid-template-columns: 1fr;
  }

  .goods-item img {
    width: 100%;
    height: 160px;
  }
}
</style>
