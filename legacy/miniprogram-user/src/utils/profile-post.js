const STORAGE_KEY = "ihc_miniprogram_profile_posts";
let cachedPosts = null;

function normalizePost(post = {}) {
  if (!post || typeof post !== "object") {
    return null;
  }

  const title = typeof post.title === "string" ? post.title.trim() : "";
  const content = typeof post.content === "string" ? post.content.trim() : "";

  if (!title || !content) {
    return null;
  }

  const images = Array.isArray(post.images)
    ? post.images.filter((item) => typeof item === "string" && item)
    : [];

  return {
    id: typeof post.id === "string" && post.id ? post.id : `post-${Date.now()}`,
    author: typeof post.author === "string" && post.author ? post.author : "笑看人生",
    date: typeof post.date === "string" && post.date ? post.date : "",
    title,
    content,
    images,
    likes: Number(post.likes) || 0,
    comments: Number(post.comments) || 0
  };
}

function loadProfilePosts() {
  if (cachedPosts) {
    return cachedPosts.slice();
  }

  try {
    const storedValue = wx.getStorageSync(STORAGE_KEY);

    if (!Array.isArray(storedValue)) {
      cachedPosts = [];
      return [];
    }

    cachedPosts = storedValue.map((item) => normalizePost(item)).filter(Boolean);
    return cachedPosts.slice();
  } catch (error) {
    cachedPosts = [];
    return [];
  }
}

function saveProfilePosts(posts) {
  const normalizedPosts = Array.isArray(posts) ? posts.map((item) => normalizePost(item)).filter(Boolean) : [];
  cachedPosts = normalizedPosts;
  wx.setStorageSync(STORAGE_KEY, normalizedPosts);
  return normalizedPosts.slice();
}

function prependProfilePost(post) {
  const nextPost = normalizePost(post);

  if (!nextPost) {
    return loadProfilePosts();
  }

  const storedPosts = loadProfilePosts().filter((item) => item.id !== nextPost.id);
  return saveProfilePosts([nextPost, ...storedPosts]);
}

module.exports = {
  loadProfilePosts,
  saveProfilePosts,
  prependProfilePost
};
