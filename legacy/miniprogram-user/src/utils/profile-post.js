const STORAGE_KEY = "ihc_miniprogram_profile_posts";

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
  try {
    const storedValue = wx.getStorageSync(STORAGE_KEY);

    if (!Array.isArray(storedValue)) {
      return [];
    }

    return storedValue.map((item) => normalizePost(item)).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function saveProfilePosts(posts) {
  const normalizedPosts = Array.isArray(posts) ? posts.map((item) => normalizePost(item)).filter(Boolean) : [];
  wx.setStorageSync(STORAGE_KEY, normalizedPosts);
  return normalizedPosts;
}

function prependProfilePost(post) {
  const nextPost = normalizePost(post);

  if (!nextPost) {
    return loadProfilePosts();
  }

  return saveProfilePosts([nextPost, ...loadProfilePosts()]);
}

module.exports = {
  loadProfilePosts,
  saveProfilePosts,
  prependProfilePost
};
