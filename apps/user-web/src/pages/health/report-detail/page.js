import mock from "./mock.js";
import { escapeHtml } from "/packages/page-core/src/runtime.js";

export const styles = `
.placeholder-page {
  display: grid;
  gap: 16px;
}

.placeholder-page__card {
  padding: 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 40px rgba(21, 44, 88, 0.08);
}
`;

export function mount({ root }) {
  root.innerHTML = `
    <section class="placeholder-page">
      <div class="placeholder-page__card">
        <p class="page-eyebrow">HEALTH</p>
        <h1>健康报告详情</h1>
        <p>${escapeHtml(mock.summary)}</p>
      </div>
      <div class="placeholder-page__card">
        <strong>下一步建议</strong>
        <p>1. 在当前目录补充页面结构。</p>
        <p>2. 在 mock.js 中沉淀单页调试数据。</p>
        <p>3. 通过 npm run dev:page -- --page health/report-detail 进行联调。</p>
      </div>
    </section>`;
}
