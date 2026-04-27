import { request } from "@/shared/api/client";

export interface CommunityTopicItem {
  topicId: string;
  id?: string;
  title: string;
  coverUrl: string;
  participantCount: number;
  tone?: string | null;
}

export interface CommunityAuthor {
  userId: string;
  name: string;
  avatar: string | null;
}

export interface CommunityPostItem {
  postId: string;
  id?: string;
  headline?: string | null;
  excerpt?: string | null;
  content: string;
  images: string[];
  primaryImage?: string | null;
  imageCount?: number;
  tagLabel?: string | null;
  likesCount?: number;
  favoritesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  createdAt: string;
  time?: string | null;
  author?: CommunityAuthor | null;
  authorName?: string | null;
  avatar?: string | null;
  badge?: string | null;
  topic?: {
    topicId: string;
    title: string;
  } | null;
  tag?: string | null;
  liked?: boolean;
  favorited?: boolean;
  isMine?: boolean;
  likes?: number;
  stars?: number;
  comments?: number;
  shares?: number;
}

export interface CommunityCommentUser {
  userId: string;
  name: string;
  avatar: string | null;
}

export interface CommunityCommentItem {
  commentId: string;
  id?: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  author?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  replyTo?: string;
  likes?: number;
  liked?: boolean;
  isMine?: boolean;
  user?: CommunityCommentUser | null;
}

export interface CommunityActivityItem {
  activityId: string;
  id?: string;
  title: string;
  category: string;
  type?: string | null;
  status: "UPCOMING" | "ONGOING" | "ENDED" | "CANCELLED" | string;
  fee?: number | null;
  price?: string | null;
  location: string;
  coverUrl?: string | null;
  image?: string | null;
  startAt: string;
  endAt: string;
  signupDeadline?: string | null;
  signupDeadlineText?: string | null;
  maxParticipants?: number | null;
  likesCount?: number;
  favoritesCount?: number;
  commentsCount?: number;
  registered?: boolean;
  liked?: boolean;
  favorited?: boolean;
  publishDate?: string | null;
  dateRange?: string | null;
  time?: string | null;
  stats?: {
    likes?: number;
    stars?: number;
    comments?: number;
  } | null;
}

export interface CommunityActivityDetail extends CommunityActivityItem {
  detailContent?: {
    sections?: Array<{
      title?: string | null;
      paragraphs: string[];
    }>;
  } | null;
  sections?: Array<{
    title?: string | null;
    paragraphs: string[];
  }>;
  comments?: CommunityCommentItem[];
  registration?: {
    registrationId?: string;
    status?: string;
    registeredAt?: string;
    checkedInAt?: string | null;
    cancellationReason?: string | null;
  } | null;
}

export interface CommunityActivityRegistrationItem {
  registrationId: string;
  status: "REGISTERED" | "CHECKED_IN" | "CANCELLED" | string;
  registeredAt: string;
  checkedInAt: string | null;
  cancellationReason: string | null;
  activity: {
    activityId: string;
    title: string;
    category: string;
    status: "UPCOMING" | "ONGOING" | "ENDED" | "CANCELLED" | string;
    location: string;
    coverUrl: string | null;
    startAt: string;
    endAt: string;
  };
}

export interface PaginatedResponse<T> {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ToggleActionResponse {
  postId?: string;
  activityId?: string;
  action?: string;
  recorded?: boolean;
  success?: boolean;
  count?: number;
}

function toQueryString(query: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    params.set(key, String(value));
  });

  const text = params.toString();
  return text ? `?${text}` : "";
}

export function getCommunityTopics() {
  return request<CommunityTopicItem[]>("/app/community/topics", {
    auth: true
  });
}

export function getCommunityPosts(query: {
  topicId?: string;
  feedType?: "following" | "recommended" | "latest" | "FOLLOWING" | "RECOMMENDED" | "LATEST";
  page?: number;
  pageSize?: number;
} = {}) {
  return request<PaginatedResponse<CommunityPostItem>>(
    `/app/community/posts${toQueryString(query)}`,
    {
      auth: true
    }
  );
}

export function createCommunityPost(payload: {
  topicId?: string;
  content: string;
  images?: string[];
  tagLabel?: string;
}) {
  return request<{ postId: string; created?: boolean; createdAt?: string }>(
    "/app/community/posts",
    {
      method: "POST",
      auth: true,
      body: payload
    }
  );
}

export function getCommunityPostDetail(postId: string) {
  return request<CommunityPostItem>(`/app/community/posts/${postId}`, {
    auth: true
  });
}

export function updateCommunityPost(
  postId: string,
  payload: {
    content?: string;
    images?: string[];
    tagLabel?: string;
  }
) {
  return request<{ postId: string; updated?: boolean }>(`/app/community/posts/${postId}`, {
    method: "PUT",
    auth: true,
    body: payload
  });
}

export function deleteCommunityPost(postId: string) {
  return request<{ postId: string; deleted?: boolean }>(`/app/community/posts/${postId}`, {
    method: "DELETE",
    auth: true
  });
}

export function getCommunityPostComments(
  postId: string,
  query: { page?: number; pageSize?: number } = {}
) {
  return request<PaginatedResponse<CommunityCommentItem>>(
    `/app/community/posts/${postId}/comments${toQueryString(query)}`,
    {
      auth: true
    }
  );
}

export function createCommunityPostComment(
  postId: string,
  payload: { parentId?: string; content: string }
) {
  return request<{ commentId: string; created?: boolean; createdAt?: string }>(
    `/app/community/posts/${postId}/comments`,
    {
      method: "POST",
      auth: true,
      body: payload
    }
  );
}

export function likeCommunityPost(postId: string) {
  return request<ToggleActionResponse>(`/app/community/posts/${postId}/like`, {
    method: "POST",
    auth: true
  });
}

export function favoriteCommunityPost(postId: string) {
  return request<ToggleActionResponse>(`/app/community/posts/${postId}/favorite`, {
    method: "POST",
    auth: true
  });
}

export function shareCommunityPost(postId: string) {
  return request<ToggleActionResponse>(`/app/community/posts/${postId}/share`, {
    method: "POST",
    auth: true
  });
}

export function getCommunityActivities(query: {
  status?: "UPCOMING" | "ONGOING" | "ENDED" | "CANCELLED";
  sort?: "latest" | "LATEST" | "hot" | "HOT";
  page?: number;
  pageSize?: number;
} = {}) {
  return request<PaginatedResponse<CommunityActivityItem>>(
    `/app/community/activities${toQueryString(query)}`,
    {
      auth: true
    }
  );
}

export function getMyCommunityActivities(query: { page?: number; pageSize?: number } = {}) {
  return request<PaginatedResponse<CommunityActivityRegistrationItem>>(
    `/app/community/activities/my${toQueryString(query)}`,
    {
      auth: true
    }
  );
}

export function getCommunityActivityDetail(activityId: string) {
  return request<CommunityActivityDetail>(`/app/community/activities/${activityId}`, {
    auth: true
  });
}

export function getCommunityActivityComments(
  activityId: string,
  query: { page?: number; pageSize?: number } = {}
) {
  return request<PaginatedResponse<CommunityCommentItem>>(
    `/app/community/activities/${activityId}/comments${toQueryString(query)}`,
    {
      auth: true
    }
  );
}

export function createCommunityActivityComment(
  activityId: string,
  payload: { parentId?: string; content: string }
) {
  return request<{ commentId: string; created?: boolean; createdAt?: string }>(
    `/app/community/activities/${activityId}/comments`,
    {
      method: "POST",
      auth: true,
      body: payload
    }
  );
}

export function likeCommunityActivity(activityId: string) {
  return request<ToggleActionResponse>(`/app/community/activities/${activityId}/like`, {
    method: "POST",
    auth: true
  });
}

export function favoriteCommunityActivity(activityId: string) {
  return request<ToggleActionResponse>(`/app/community/activities/${activityId}/favorite`, {
    method: "POST",
    auth: true
  });
}

export function shareCommunityActivity(activityId: string) {
  return request<ToggleActionResponse>(`/app/community/activities/${activityId}/share`, {
    method: "POST",
    auth: true
  });
}

export function registerCommunityActivity(activityId: string, payload: { remark?: string } = {}) {
  return request<{
    registrationId?: string;
    status?: string;
    registered?: boolean;
    registeredAt?: string;
    remarkAccepted?: boolean;
  }>(`/app/community/activities/${activityId}/register`, {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function cancelCommunityActivity(activityId: string, payload: { reason?: string } = {}) {
  return request<{
    activityId?: string;
    cancelled?: boolean;
    status?: string;
    cancellationReason?: string | null;
  }>(`/app/community/activities/${activityId}/cancel`, {
    method: "POST",
    auth: true,
    body: payload
  });
}
