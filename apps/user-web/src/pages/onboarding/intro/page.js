import mock from "./mock.js";
import { escapeHtml } from "/packages/page-core/src/runtime.js";

export const styles = `
  .intro-page {
    display: grid;
    gap: 18px;
    min-height: 100%;
  }

  .intro-card,
  .intro-slides,
  .intro-actions {
    padding: 20px;
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
  }

  .intro-card {
    background: linear-gradient(145deg, rgba(54, 108, 255, 0.18), rgba(255, 126, 97, 0.14)), #ffffff;
  }

  .intro-card h1 {
    margin: 8px 0 10px;
    font-size: 32px;
    line-height: 1.12;
  }

  .intro-card p {
    margin: 0;
    color: #5d6d87;
    line-height: 1.7;
  }

  .intro-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 16px;
  }

  .intro-chip {
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.76);
    color: #2a4ca8;
    font-size: 13px;
    font-weight: 700;
  }

  .intro-slides {
    display: grid;
    gap: 12px;
  }

  .intro-slide {
    padding: 16px;
    border-radius: 20px;
    background: linear-gradient(180deg, #f9fbff 0%, #edf3ff 100%);
    border: 1px solid rgba(36, 87, 245, 0.08);
  }

  .intro-slide h2 {
    margin: 8px 0 6px;
    font-size: 20px;
  }

  .intro-slide p {
    margin: 0;
    color: #657590;
    line-height: 1.6;
  }

  .intro-actions {
    display: grid;
    gap: 12px;
  }

  .intro-primary,
  .intro-secondary {
    width: 100%;
    padding: 14px 16px;
    border-radius: 18px;
    border: 0;
    font-weight: 700;
  }

  .intro-primary {
    background: linear-gradient(135deg, #265cf7, #4f84ff);
    color: #ffffff;
  }

  .intro-secondary {
    background: rgba(36, 87, 245, 0.08);
    color: #2457f5;
  }
`;

export async function mount({ root, navigate }) {
  root.innerHTML = `
    <section class="intro-page">
      <article class="intro-card">
        <p class="page-eyebrow">Welcome</p>
        <h1>让康养服务与健康管理更靠近老人家庭</h1>
        <p>${escapeHtml(
          "在线完成服务预约、健康管理与社区互动，让老人和家属都能更安心地使用康养服务。",
        )}</p>
        <div class="intro-chip-row">
          ${mock.highlights.map((item) => `<span class="intro-chip">${escapeHtml(item)}</span>`).join("")}
        </div>
      </article>

      <section class="intro-slides">
        ${mock.slides
          .map(
            (item, index) => `
              <article class="intro-slide">
                <p class="page-eyebrow">0${index + 1}</p>
                <h2>${escapeHtml(item.title)}</h2>
                <p>${escapeHtml(item.desc)}</p>
              </article>
            `,
          )
          .join("")}
      </section>

      <section class="intro-actions">
        <button class="intro-primary" type="button" data-action="start">立即体验</button>
        <button class="intro-secondary" type="button" data-action="home">进入首页</button>
      </section>
    </section>
  `;

  root.querySelector('[data-action="start"]')?.addEventListener("click", () => {
    navigate("auth/login");
  });

  root.querySelector('[data-action="home"]')?.addEventListener("click", () => {
    navigate("home/dashboard");
  });
}
