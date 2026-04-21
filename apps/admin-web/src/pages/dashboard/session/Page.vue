<script setup lang="ts">
import { computed, ref } from "vue";
import type { PageComponentProps } from "@ihc/page-core/types";
import mock from "./mock";

const props = defineProps<PageComponentProps>();

const activeRightTab = ref<"customer" | "goods">("customer");
const goodsKeyword = ref("");

const filteredGoods = computed(() =>
  mock.goods.filter((item) => !goodsKeyword.value.trim() || item.title.includes(goodsKeyword.value.trim())),
);
</script>

<template>
  <section class="session-page">
    <article class="session-shell">
      <header class="shell-head">
        <div class="section-head">
          <span class="section-head__accent"></span>
          <h1>{{ mock.title }}</h1>
        </div>
      </header>

      <div class="session-layout">
        <aside class="conversation-pane">
          <div class="conversation-search">
            <input type="text" placeholder="搜索会话" />
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
            <strong>{{ mock.currentSessionName }}</strong>
            <button type="button" class="chat-head__action" @click="props.showToast('结束会话功能为演示状态')">结束会话</button>
          </header>

          <div class="chat-body">
            <div class="chat-timestamp">10:10</div>

            <article v-for="message in mock.messages" :key="message.id" class="message" :class="`message--${message.side}`">
              <img :src="message.avatar" :alt="message.side === 'left' ? '客服头像' : '客户头像'" />
              <div class="message__bubble">{{ message.text }}</div>
            </article>
          </div>

          <footer class="chat-input">
            <input type="text" placeholder="请输入" />
          </footer>
        </section>

        <aside class="detail-pane">
          <header class="detail-tabs">
            <button type="button" class="detail-tabs__action" @click="props.showToast('结束会话功能为演示状态')">结束会话</button>
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
            <section class="customer-card">
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
              <header class="order-list__head">订单列表（{{ mock.orders.length }}）</header>

              <article v-for="order in mock.orders" :key="order.id" class="order-card">
                <div class="order-card__status">{{ order.status }}</div>
                <div class="order-card__main">
                  <img :src="order.image" :alt="order.title" />
                  <div class="order-card__content">
                    <strong>{{ order.title }}</strong>
                    <button type="button">订单详情</button>
                  </div>
                </div>
                <div class="order-card__meta">
                  <span>下单时间: {{ order.time }}</span>
                  <span>订单金额: {{ order.amount }}</span>
                </div>
              </article>
            </section>
          </template>

          <section v-else class="goods-panel">
            <div class="goods-search">
              <input v-model="goodsKeyword" type="text" placeholder="搜索商品" />
              <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                <circle cx="9" cy="9" r="5.6" fill="none" stroke="currentColor" stroke-width="1.8" />
                <path d="m13.3 13.3 4 4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
              </svg>
            </div>

            <div class="goods-list">
              <article v-for="item in filteredGoods" :key="item.id" class="goods-item">
                <img :src="item.image" :alt="item.title" />
                <div class="goods-item__content">
                  <strong>{{ item.title }}</strong>
                  <span>￥{{ item.price }}</span>
                </div>
                <button type="button" class="goods-item__send" @click="props.showToast(`已发送商品：${item.title}`)">发送</button>
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
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.session-shell {
  overflow: hidden;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(59, 103, 82, 0.05);
}

.shell-head {
  padding: 18px 20px 14px;
  border-bottom: 1px solid #eef2ef;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
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

.session-layout {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr) 420px;
  min-height: 780px;
}

.conversation-pane,
.chat-pane,
.detail-pane {
  min-width: 0;
}

.conversation-pane {
  border-right: 1px solid #eef2ef;
}

.conversation-search {
  position: relative;
  padding: 18px 16px;
  border-bottom: 1px solid #eef2ef;
}

.conversation-search input {
  width: 100%;
  height: 46px;
  padding: 0 48px 0 18px;
  border: 1px solid #e6ece9;
  border-radius: 10px;
  color: #44515d;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  outline: none;
}

.conversation-search input::placeholder {
  color: #c1c8cf;
}

.conversation-search svg {
  position: absolute;
  top: 50%;
  right: 30px;
  width: 22px;
  height: 22px;
  color: #c7cdd4;
  transform: translateY(-50%);
}

.conversation-list {
  display: grid;
}

.conversation-item {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 18px 20px;
  border: 0;
  border-bottom: 1px solid #f1f4f2;
  background: #ffffff;
  text-align: left;
}

.conversation-item--active {
  background: #fbfbfb;
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
  font-weight: 500;
  letter-spacing: 0.01em;
}

.conversation-item__top span,
.conversation-item__bottom span {
  color: #a8b0b9;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
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
  font-weight: 500;
}

.chat-pane {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) 108px;
  border-right: 1px solid #eef2ef;
}

.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid #eef2ef;
}

.chat-head strong {
  color: #313b48;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.chat-head__action {
  border: 0;
  background: transparent;
  color: #42d1a6;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.chat-body {
  overflow: auto;
  padding: 18px 24px 10px;
  background: #ffffff;
}

.chat-timestamp {
  width: fit-content;
  margin: 0 auto 22px;
  padding: 6px 18px;
  border-radius: 999px;
  background: #f2f3f5;
  color: #b6bdc5;
  font-size: 12px;
  font-weight: 400;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}

.message--right {
  justify-content: flex-end;
}

.message img {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}

.message__bubble {
  max-width: 320px;
  padding: 12px 18px;
  border-radius: 18px;
  background: #f9f9f9;
  color: #3c4652;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.5;
  box-shadow: 0 8px 22px rgba(61, 83, 73, 0.05);
}

.message--right .message__bubble {
  background: #42d1a6;
  color: #ffffff;
}

.chat-input {
  border-top: 1px solid #eef2ef;
  padding: 18px 20px;
}

.chat-input input {
  width: 100%;
  height: 58px;
  border: 0;
  color: #444f5a;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  outline: none;
}

.chat-input input::placeholder {
  color: #c1c8cf;
}

.detail-pane {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.detail-tabs {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1fr;
  border-bottom: 1px solid #eef2ef;
}

.detail-tabs__action,
.detail-tabs__item {
  height: 68px;
  border: 0;
  background: #ffffff;
  color: #353f4b;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.detail-tabs__action {
  color: #42d1a6;
}

.detail-tabs__item--active {
  color: #42d1a6;
  box-shadow: inset 0 -4px 0 #42d1a6;
}

.customer-card {
  padding: 22px 24px 18px;
  border-bottom: 1px solid #eef2ef;
}

.customer-card__top {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.customer-card__top img {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  object-fit: cover;
}

.customer-card__identity > div:first-child {
  display: flex;
  align-items: center;
  gap: 12px;
}

.customer-card__identity strong {
  color: #313b48;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.customer-card__identity button,
.order-card__content button {
  padding: 0;
  border: 0;
  background: transparent;
  color: #42d1a6;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
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
  font-weight: 400;
  letter-spacing: 0.01em;
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

.customer-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 22px;
}

.customer-stats span {
  color: #a5aeb7;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.customer-stats strong {
  display: block;
  margin-top: 8px;
  color: #3a4551;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.order-list {
  padding: 16px 24px 24px;
}

.order-list__head {
  color: #313b48;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.order-card {
  margin-top: 16px;
  border: 1px solid #edf2ef;
  border-radius: 12px;
  overflow: hidden;
}

.order-card__status {
  padding: 14px 16px;
  background: #fafafa;
  color: #8b96a2;
  font-size: 12px;
  font-weight: 500;
}

.order-card__main {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding: 16px;
}

.order-card__main img {
  width: 68px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
}

.order-card__content strong {
  display: block;
  color: #4a5561;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.45;
}

.order-card__content button {
  margin-top: 8px;
}

.order-card__meta {
  display: grid;
  gap: 10px;
  padding: 0 16px 16px;
  color: #a0a9b2;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.01em;
}

.goods-panel {
  padding: 18px 18px 20px;
}

.goods-search {
  position: relative;
  margin-bottom: 16px;
}

.goods-search input {
  width: 100%;
  height: 46px;
  padding: 0 48px 0 16px;
  border: 1px solid #e6ece9;
  border-radius: 10px;
  color: #44515d;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.01em;
  outline: none;
}

.goods-search input::placeholder {
  color: #c1c8cf;
}

.goods-search svg {
  position: absolute;
  top: 50%;
  right: 14px;
  width: 22px;
  height: 22px;
  color: #c7cdd4;
  transform: translateY(-50%);
}

.goods-list {
  display: grid;
}

.goods-item {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #eef2ef;
}

.goods-item img {
  width: 90px;
  height: 68px;
  border-radius: 8px;
  object-fit: cover;
}

.goods-item__content {
  min-width: 0;
}

.goods-item__content strong {
  display: block;
  color: #404a55;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  line-height: 1.45;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goods-item__content span {
  display: block;
  margin-top: 10px;
  color: #3d4651;
  font-size: 13px;
  font-weight: 500;
}

.goods-item__send {
  padding: 0;
  border: 0;
  background: transparent;
  color: #42d1a6;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

@media (max-width: 1560px) {
  .session-layout {
    grid-template-columns: 300px minmax(0, 1fr) 360px;
  }
}

@media (max-width: 1220px) {
  .session-layout {
    grid-template-columns: 1fr;
  }

  .conversation-pane,
  .chat-pane {
    border-right: 0;
    border-bottom: 1px solid #eef2ef;
  }
}
</style>
