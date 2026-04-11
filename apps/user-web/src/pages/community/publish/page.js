import mock from "./mock.js";
import { escapeHtml } from "/packages/page-core/src/runtime.js";

export const styles = `
  .publish-page {
    display: grid;
    gap: 18px;
  }

  .publish-header,
  .publish-editor,
  .publish-tips {
    padding: 18px;
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
  }

  .publish-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
  }

  .publish-header h1 {
    margin: 6px 0 0;
  }

  .publish-header p,
  .publish-tips li {
    margin: 0;
    color: #607089;
    line-height: 1.6;
  }

  .publish-close,
  .publish-submit,
  .publish-upload {
    border: 0;
    border-radius: 18px;
    font-weight: 700;
  }

  .publish-close {
    width: 48px;
    height: 48px;
    background: rgba(36, 87, 245, 0.08);
    color: #2457f5;
  }

  .publish-submit {
    padding: 12px 18px;
    background: linear-gradient(135deg, #2457f5, #4f84ff);
    color: #ffffff;
  }

  .publish-editor {
    display: grid;
    gap: 12px;
  }

  .publish-editor input,
  .publish-editor textarea {
    width: 100%;
    padding: 14px 16px;
    border: 1px solid rgba(35, 82, 173, 0.12);
    border-radius: 18px;
    background: #f8fbff;
  }

  .publish-editor textarea {
    min-height: 180px;
    resize: vertical;
  }

  .publish-upload {
    padding: 12px 16px;
    background: rgba(36, 87, 245, 0.08);
    color: #2457f5;
  }

  .publish-image-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .publish-image-pill {
    padding: 8px 12px;
    border-radius: 999px;
    background: #edf3ff;
    color: #3f5d9b;
    font-size: 12px;
  }

  .publish-tips ul {
    margin: 10px 0 0;
    padding-left: 18px;
  }
`;

export async function mount({ root, navigate, showToast }) {
  const state = {
    title: "",
    content: "",
    images: [],
  };

  const render = () => {
    root.innerHTML = `
      <section class="publish-page">
        <article class="publish-header">
          <div>
            <p class="page-eyebrow">Create Post</p>
            <h1>发布动态</h1>
            <p>${escapeHtml("记录今天的康养生活，把照片和心情分享给家人和社区。")}</p>
          </div>
          <button type="button" class="publish-close" data-action="close">关</button>
        </article>

        <section class="publish-editor">
          <input type="text" placeholder="输入标题" value="${escapeHtml(state.title)}" data-field="title" />
          <textarea placeholder="输入内容" data-field="content">${escapeHtml(state.content)}</textarea>
          <div class="publish-image-list">
            ${state.images.map((item) => `<span class="publish-image-pill">${escapeHtml(item)}</span>`).join("")}
          </div>
          <button type="button" class="publish-upload" data-action="upload">添加图片</button>
          <input type="file" accept="image/*" multiple hidden data-input="file" />
          <button type="button" class="publish-submit" data-action="submit">发布</button>
        </section>

        <section class="publish-tips">
          <p class="page-eyebrow">Tips</p>
          <ul>
            ${mock.tips.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </section>
      </section>
    `;

    root.querySelector('[data-field="title"]')?.addEventListener("input", (event) => {
      state.title = event.target.value;
    });

    root.querySelector('[data-field="content"]')?.addEventListener("input", (event) => {
      state.content = event.target.value;
    });

    root.querySelector('[data-action="close"]')?.addEventListener("click", () => {
      navigate("community/circle");
    });

    root.querySelector('[data-action="upload"]')?.addEventListener("click", () => {
      root.querySelector('[data-input="file"]')?.click();
    });

    root.querySelector('[data-input="file"]')?.addEventListener("change", (event) => {
      state.images = Array.from(event.target.files || []).map((file) => file.name).slice(0, 6);
      render();
    });

    root.querySelector('[data-action="submit"]')?.addEventListener("click", () => {
      if (!state.title.trim()) {
        showToast("请输入标题");
        return;
      }

      if (!state.content.trim()) {
        showToast("请输入内容");
        return;
      }

      showToast("发布成功");
      window.setTimeout(() => navigate("community/circle"), 280);
    });
  };

  render();
}
