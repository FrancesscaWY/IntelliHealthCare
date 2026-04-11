import mock from "./mock.js";
import { bindBottomTabBar, escapeHtml, renderBottomTabBar } from "/packages/page-core/src/runtime.js";

export const styles = `
  .home-page {
    display: grid;
    gap: 18px;
  }

  .home-panel,
  .home-search,
  .home-section,
  .home-reminder {
    padding: 18px;
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
  }

  .home-panel {
    background: linear-gradient(145deg, rgba(79, 132, 255, 0.16), rgba(255, 123, 97, 0.12)), #ffffff;
  }

  .home-panel__top,
  .home-section__header,
  .home-reminder {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .home-panel h1,
  .home-section h2 {
    margin: 6px 0 0;
  }

  .home-panel p,
  .home-section p {
    margin: 0;
    color: #607089;
    line-height: 1.6;
  }

  .home-panel__scan {
    width: 52px;
    height: 52px;
    border-radius: 18px;
    border: 0;
    background: rgba(255, 255, 255, 0.68);
    font-weight: 800;
    color: #1d2438;
  }

  .home-search {
    display: grid;
    gap: 14px;
  }

  .home-search__box {
    display: flex;
    gap: 10px;
  }

  .home-search__box input {
    flex: 1;
    padding: 14px 16px;
    border-radius: 18px;
    border: 0;
    background: linear-gradient(90deg, #6372f1 0%, #ff7c6f 100%);
    color: #fff;
  }

  .home-search__box input::placeholder {
    color: rgba(255, 255, 255, 0.9);
  }

  .home-tags,
  .home-diseases {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .home-tags button,
  .home-diseases button {
    padding: 8px 12px;
    border: 0;
    border-radius: 999px;
    background: #eff4ff;
    color: #415b97;
  }

  .home-service-grid,
  .home-feature-grid {
    display: grid;
    gap: 12px;
  }

  .home-service-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .home-feature-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 16px;
  }

  .home-card-button {
    padding: 16px 12px;
    border-radius: 20px;
    border: 0;
    background: linear-gradient(180deg, #f8fbff 0%, #eef3ff 100%);
    text-align: left;
  }

  .home-card-button strong {
    display: block;
    margin-top: 10px;
    font-size: 15px;
  }

  .home-card-button span,
  .home-article span {
    color: #63728b;
    font-size: 13px;
  }

  .home-card-icon {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(36, 87, 245, 0.12);
    color: #2457f5;
    font-weight: 800;
  }

  .home-reminder {
    align-items: stretch;
    background: linear-gradient(135deg, rgba(255, 123, 97, 0.12), rgba(255, 194, 71, 0.16)), #ffffff;
  }

  .home-reminder__label {
    min-width: 88px;
    display: grid;
    place-items: center;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.6);
    font-weight: 700;
    color: #c45945;
  }

  .home-article-list {
    display: grid;
    gap: 12px;
    margin-top: 14px;
  }

  .home-article {
    padding: 16px;
    border-radius: 20px;
    background: #f9fbff;
  }

  .home-article h3 {
    margin: 0 0 8px;
    font-size: 17px;
  }

  .home-article__actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 12px;
  }

  .home-article__actions button {
    border: 0;
    border-radius: 999px;
    padding: 8px 12px;
    background: rgba(36, 87, 245, 0.08);
    color: #2457f5;
  }
`;

export async function mount({ root, navigate, showToast }) {
  const state = {
    searchValue: "",
  };

  const render = () => {
    root.innerHTML = `
      <section class="home-page">
        <article class="home-panel">
          <div class="home-panel__top">
            <div>
              <p class="page-eyebrow">Dashboard</p>
              <h1>欢迎回到智诊康养</h1>
              <p>${escapeHtml("在这里快速查看服务入口、健康提醒、疾病内容和社区动态。")}</p>
            </div>
            <button class="home-panel__scan" type="button" data-action="scan">扫码</button>
          </div>
        </article>

        <section class="home-search">
          <div class="home-search__box">
            <input value="${escapeHtml(state.searchValue)}" placeholder="搜索健康问题、服务或资讯" />
          </div>
          <div class="home-tags">
            ${mock.searchTags.map((item) => `<button type="button" data-tag="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")}
          </div>
        </section>

        <section class="home-section">
          <div class="home-section__header">
            <div>
              <p class="page-eyebrow">Services</p>
              <h2>上门服务</h2>
            </div>
          </div>
          <div class="home-service-grid">
            ${mock.services
              .map(
                (item) => `
                  <button type="button" class="home-card-button" data-page-id="${item.pageId}">
                    <div class="home-card-icon">${escapeHtml(item.icon)}</div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <span>${escapeHtml(item.desc)}</span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>

        <section class="home-section">
          <div class="home-section__header">
            <div>
              <p class="page-eyebrow">Feature Matrix</p>
              <h2>功能导航</h2>
            </div>
          </div>
          <div class="home-feature-grid">
            ${mock.features
              .map(
                (item) => `
                  <button type="button" class="home-card-button" data-page-id="${item.pageId}">
                    <div class="home-card-icon">${escapeHtml(item.icon)}</div>
                    <strong>${escapeHtml(item.title)}</strong>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>

        <section class="home-reminder">
          <div class="home-reminder__label">健康提醒</div>
          <div>
            <strong>用药提醒</strong>
            <p>${escapeHtml("06:30 卡托普利 2 片，服药后请记录血压数值。")}</p>
          </div>
        </section>

        <section class="home-section">
          <div class="home-section__header">
            <div>
              <p class="page-eyebrow">Disease Guide</p>
              <h2>疾病宝典</h2>
            </div>
            <button type="button" class="command-chip" data-page-id="content/disease-guide">更多</button>
          </div>
          <div class="home-diseases">
            ${mock.diseases.map((item) => `<button type="button" data-disease="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")}
          </div>
        </section>

        <section class="home-section">
          <div class="home-section__header">
            <div>
              <p class="page-eyebrow">Health News</p>
              <h2>健康资讯</h2>
            </div>
          </div>
          <div class="home-article-list">
            ${mock.articles
              .map(
                (item) => `
                  <article class="home-article">
                    <h3>${escapeHtml(item.title)}</h3>
                    <span>${escapeHtml(item.desc)}</span>
                    <div class="home-article__actions">
                      <button type="button" data-action="share">分享</button>
                      <button type="button" data-action="like">点赞 ${item.likes}</button>
                      <button type="button" data-action="star">收藏 ${item.stars}</button>
                      <button type="button" data-action="comment">评论 ${item.comments}</button>
                    </div>
                  </article>
                `,
              )
              .join("")}
          </div>
        </section>

        ${renderBottomTabBar("home")}
      </section>
    `;

    root.querySelector(".home-search__box input")?.addEventListener("input", (event) => {
      state.searchValue = event.target.value;
    });

    root.querySelector('[data-action="scan"]')?.addEventListener("click", () => {
      showToast("设备扫码流程待接入");
    });

    root.querySelectorAll("[data-tag]").forEach((button) => {
      button.addEventListener("click", () => {
        state.searchValue = button.getAttribute("data-tag");
        render();
      });
    });

    root.querySelectorAll("[data-page-id]:not([data-bottom-tab])").forEach((button) => {
      button.addEventListener("click", () => {
        navigate(button.getAttribute("data-page-id"));
      });
    });

    root.querySelectorAll("[data-disease]").forEach((button) => {
      button.addEventListener("click", () => {
        showToast(`${button.getAttribute("data-disease")} 详情待补充`);
      });
    });

    root.querySelectorAll(".home-article [data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        showToast(`${button.getAttribute("data-action")}功能待接入`);
      });
    });

    bindBottomTabBar(root, { navigate });
  };

  render();
}
