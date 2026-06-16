import lectureHotImage from "@/assets/content/health-lecture-hot.jpg";
import lectureLatestImage from "@/assets/content/health-lecture-latest.jpg";
import lectureDetailImage from "@/assets/content/health-lecture-detail.jpg";
import lectureDetailVideo from "@/assets/content/health-lecture-detail.mp4";
import avatarLiu from "@/assets/content/avatar-liu.jpg?inline";
import avatarWang from "@/assets/content/avatar-wang.jpg?inline";
import avatarZhao from "@/assets/content/avatar-zhao.jpg?inline";

const REMOTE_API_ORIGIN = "http://server.mctown.online:8190";
const demoAssetPrefix = "/api/v1/assets/";
const curatedAssetPrefix = "/api/v1/assets/curated/";
const localAvatarPool = [avatarLiu, avatarWang, avatarZhao];

export function resolveLectureAssetUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  if (/^data:/.test(value) || /^https?:\/\//.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return value.startsWith("/api/v1/") ? `${REMOTE_API_ORIGIN}${value}` : value;
  }

  const normalizedValue = `/${value.replace(/^\/+/, "")}`;
  return normalizedValue.startsWith("/api/v1/") ? `${REMOTE_API_ORIGIN}${normalizedValue}` : normalizedValue;
}

export function isBrokenLectureAsset(value: string | null | undefined) {
  const resolvedValue = resolveLectureAssetUrl(value);

  return (
    (resolvedValue.includes(demoAssetPrefix) && !resolvedValue.includes(curatedAssetPrefix)) ||
    resolvedValue.includes(".intellihealthcare.demo/")
  );
}

export function resolveLocalLectureImage(lectureId: string, title: string) {
  const key = `${lectureId} ${title}`.toLowerCase();

  if (key.includes("bp") || title.includes("血压") || title.includes("用药")) {
    return lectureDetailImage;
  }

  if (key.includes("rehab") || title.includes("康复") || title.includes("训练")) {
    return lectureLatestImage;
  }

  if (key.includes("nutrition") || title.includes("营养") || title.includes("搭配")) {
    return lectureHotImage;
  }

  return lectureHotImage;
}

export function resolveLectureImage(lectureId: string, title: string, ...candidates: Array<string | null | undefined>) {
  const remoteCandidate = candidates
    .map((item) => resolveLectureAssetUrl(item))
    .find((item) => Boolean(item) && !isBrokenLectureAsset(item));

  return remoteCandidate || resolveLocalLectureImage(lectureId, title);
}

export function resolveLectureVideoUrl(videoUrl: string | null | undefined) {
  const resolvedVideoUrl = resolveLectureAssetUrl(videoUrl);

  if (resolvedVideoUrl && !isBrokenLectureAsset(resolvedVideoUrl)) {
    return resolvedVideoUrl;
  }

  return lectureDetailVideo;
}

function hashAuthor(author: string) {
  return Array.from(author).reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function resolveLectureCommentAvatar(author: string, avatarUrl?: string | null) {
  const resolvedAvatarUrl = resolveLectureAssetUrl(avatarUrl);

  if (resolvedAvatarUrl && !isBrokenLectureAsset(resolvedAvatarUrl)) {
    return resolvedAvatarUrl;
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

  return localAvatarPool[hashAuthor(author || "user") % localAvatarPool.length];
}

export function normalizeLectureCommentContent(content: string) {
  const safeContent = (content || "").trim();

  if (/^lecture_comment_[a-z0-9_]+$/i.test(safeContent)) {
    return "该评论内容暂不可用";
  }

  return safeContent || "该评论内容暂不可用";
}
