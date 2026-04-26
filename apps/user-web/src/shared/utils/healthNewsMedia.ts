import fallbackNewsImage from "@/assets/content/health-lecture-hot.jpg";
import detailNewsImage from "@/assets/content/health-lecture-detail.jpg";
import latestNewsImage from "@/assets/content/health-lecture-latest.jpg";
import recipeBroccoliImage from "@/assets/recipes/recipe-broccoli.jpg";
import recipeFishTomatoImage from "@/assets/recipes/recipe-fish-tomato.jpg";
import avatarLiu from "@/assets/content/avatar-liu.jpg?inline";
import avatarWang from "@/assets/content/avatar-wang.jpg?inline";
import avatarZhao from "@/assets/content/avatar-zhao.jpg?inline";

const demoAssetPrefix = "/api/v1/assets/";
const curatedAssetPrefix = "/api/v1/assets/curated/";
const commentAvatarPool = [avatarLiu, avatarWang, avatarZhao];

export function resolveAssetUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  if (/^data:image\//.test(value) || /^https?:\/\//.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return value;
  }

  return `/${value.replace(/^\/+/, "")}`;
}

export function isBrokenDemoAsset(value: string | null | undefined) {
  const resolved = resolveAssetUrl(value);

  if (!resolved.startsWith(demoAssetPrefix)) {
    return false;
  }

  return !resolved.startsWith(curatedAssetPrefix);
}

export function resolveLocalNewsImage(newsId: string, title: string) {
  const key = `${newsId} ${title}`.toLowerCase();

  if (key.includes("salt") || title.includes("盐")) {
    return recipeFishTomatoImage;
  }

  if (key.includes("fall") || title.includes("跌倒")) {
    return detailNewsImage;
  }

  if (key.includes("sleep") || title.includes("睡眠")) {
    return latestNewsImage;
  }

  if (title.includes("饮食") || title.includes("营养") || title.includes("膳食")) {
    return recipeBroccoliImage;
  }

  return fallbackNewsImage;
}

export function normalizeNewsImages(newsId: string, title: string, images: string[], coverUrl?: string | null, limit = 3) {
  const localImage = resolveLocalNewsImage(newsId, title);
  const resolvedImages = [...images, coverUrl || ""]
    .map((item) => resolveAssetUrl(item))
    .filter((item) => Boolean(item) && !isBrokenDemoAsset(item));

  return [...new Set(resolvedImages.length > 0 ? resolvedImages : [localImage])].slice(0, limit);
}

export function resolveNewsHeroImage(newsId: string, title: string, heroImage?: string | null, coverUrl?: string | null) {
  const candidate = [heroImage, coverUrl]
    .map((item) => resolveAssetUrl(item))
    .find((item) => Boolean(item) && !isBrokenDemoAsset(item));

  return candidate || resolveLocalNewsImage(newsId, title);
}

function hashAuthor(author: string) {
  return Array.from(author).reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function resolveCommentAvatar(author: string, avatarUrl?: string | null) {
  const resolvedAvatar = resolveAssetUrl(avatarUrl);

  if (resolvedAvatar && !isBrokenDemoAsset(resolvedAvatar)) {
    return resolvedAvatar;
  }

  if (author.includes("刘")) {
    return avatarLiu;
  }

  if (author.includes("王")) {
    return avatarWang;
  }

  if (author.includes("赵")) {
    return avatarZhao;
  }

  return commentAvatarPool[hashAuthor(author || "user") % commentAvatarPool.length];
}
