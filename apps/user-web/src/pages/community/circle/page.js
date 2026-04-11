import mock from "./mock.js";
import { bindBottomTabBar, escapeHtml, renderBottomTabBar } from "/packages/page-core/src/runtime.js";

export const styles = `
  .circle-page {
    display: grid;
    gap: 18px;
  }

  .circle-header,
  .circle-banners,
  .circle-section,
  .circle-tabs {
    padding: 18px;
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 18px 42px rgba(34, 67, 118, 0.1);
  }

  .circle-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .circle-header h1,
  .circle-section h2 {
    margin: 6px 0 0;
  }

  .circle-header p,
  .circle-section p {
    margin: 0;
    color: #607089;
  }

  .circle-headset {
    width: 48px;
    height: 48px;
    border: 0;
    border-radius: 18px;
    background: rgba(36, 87, 245, 0.08);
    color: #2457f5;
    font-weight: 800;
  }

  .circle-banner-list,
  .circle-activity-list,
  .circle-post-list {
    display: grid;
    gap: 12px;
  }

  .circle-banner {
    padding: 18px;
    border-radius: 22px;
    background: linear-gradient(135deg, rgba(36, 87, 245, 0.16), rgba(255, 123, 97, 0.16));
  }

  .circle-banner strong,
  .circle-activity strong,
  .circle-post strong {
    display: block;
  }

  .circle-activity {
    padding: 16px;
    border-radius: 20px;
    border: 0;
    text-align: left;
    background: #f8fbff;
  }

  .circle-tabs {
    display: flex;
    gap: 12px;
  }

  .circle-tabs button {
    flex: 1;
    padding: 12px 14px;
    border-radius: 999px;
    border: 0;
    background: #edf3ff;
    color: #5c6f91;
    font-weight: 700;
  }

  .circle-tabs button.is-active {
    background: linear-gradient(135deg, #2457f5, #4f84ff);
    color: #fff;
  }

  .circle-post {
    padding: 16px;
    border-radius: 20px;
    background: #f9fbff;
  }

  .circle-post__meta {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
    color: #667790;
    font-size: 13px;
  }

  .circle-post__actions {
    display: flex;
    gap: 10px;
    margin-top: 12px;
    flex-wrap: wrap;
  }

  .circle-post__actions button {
    border: 0;
    border-radius: 999px;
    padding: 8px 12px;
    background: rgba(36, 87, 245, 0.08);
    color: #2457f5;
  }
`;

export async function mount({ root, navigate, showToast }) {
  const state = {
    activeFeedTab: "hot",
  };

  const render = () => {
    const currentPosts = mock.posts[state.activeFeedTab];

    root.innerHTML = `
      <section class="circle-page">
        <article class="circle-header">
          <div>
            <p class="page-eyebrow">Community</p>
            <h1>生活圈</h1>
            <p>${escapeHtml("看看社区活动、热门动态和邻里分享，和更多长者保持连接。")}</p>
          </div>
          <button class="circle-headset" type="button" data-action="support">客服</button>
        </article>

        <section class="circle-banners">
          <div class="circle-banner-list">
            ${mock.banners
              .map(
                (item) => `
                  <article class="circle-banner">
                    <p class="page-eyebrow">${escapeHtml(item.subtitle)}</p>
                    <strong>${escapeHtml(item.title)}</strong>
                  </article>
                `,
              )
              .join("")}
          </div>
        </section>

        <section class="circle-section">
          <div class="circle-header">
            <div>
              <p class="page-eyebrow">Activities</p>
              <h2>热门活动</h2>
            </div>
            <button class="command-chip" type="button" data-page-id="community/senior-activities">更多活动</button>
          </div>
          <div class="circle-activity-list">
            ${mock.activities
              .map(
                (item) => `
                  <button class="circle-activity" type="button" data-activity="${escapeHtml(item.title)}">
                    <strong>${escapeHtml(item.title)}</strong>
                    <span>${escapeHtml(item.count)}</span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </section>

        <section class="circle-tabs">
          <button type="button" class="${state.activeFeedTab === "hot" ? "is-active" : ""}" data-tab="hot">热门</button>
          <button type="button" class="${state.activeFeedTab === "follow" ? "is-active" : ""}" data-tab="follow">关注</button>
        </section>

        <section class="circle-section">
          <div class="circle-post-list">
            ${currentPosts
              .map(
                (post) => `
                  <article class="circle-post">
                    <div class="circle-post__meta">
                      <strong>${escapeHtml(post.author)}</strong>
                      <span>${escapeHtml(post.date)}</span>
                    </div>
                    <p>${escapeHtml(post.content)}</p>
                    <div class="circle-post__actions">
                      <button type="button" data-action="点赞">点赞 ${post.likes}</button>
                      <button type="button" data-action="评论">评论 ${post.comments}</button>
                      <button type="button" data-action="分享">分享</button>
                    </div>
                  </article>
                `,
              )
              .join("")}
          </div>
        </section>

        ${renderBottomTabBar("circle")}
      </section>
    `;

    root.querySelector('[data-action="support"]')?.addEventListener("click", () => {
      showToast("客服功能待接入");
    });

    root.querySelectorAll("[data-page-id]:not([data-bottom-tab])").forEach((button) => {
      button.addEventListener("click", () => {
        navigate(button.getAttribute("data-page-id"));
      });
    });

    root.querySelectorAll("[data-activity]").forEach((button) => {
      button.addEventListener("click", () => {
        showToast(`${button.getAttribute("data-activity")} 详情待接入`);
      });
    });

    root.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeFeedTab = button.getAttribute("data-tab");
        render();
      });
    });

    root.querySelectorAll(".circle-post [data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        showToast(`${button.getAttribute("data-action")}功能待接入`);
      });
    });

    bindBottomTabBar(root, { navigate });
  };

  render();
}
