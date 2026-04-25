import { request } from "@/shared/api/client";

export interface PaginatedResponse<T> {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface HealthNewsListItem {
  newsId: string;
  id: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  images: string[];
  authorName: string | null;
  sourceName: string | null;
  tags: string[];
  publishedAt: string;
  liked: boolean;
  favorited: boolean;
  likesCount: number;
  favoritesCount: number;
  sharesCount: number;
  viewsCount: number;
  commentsCount: number;
}

export interface HealthNewsCommentItem {
  commentId: string;
  id: string;
  parentId?: string | null;
  content: string;
  createdAt: string;
  author: string;
  avatarUrl: string | null;
  city: string | null;
  replyTo?: string;
  likes: number;
  liked: boolean;
  isMine: boolean;
}

export interface HealthNewsDetail {
  newsId: string;
  id: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  heroImage: string | null;
  authorName: string | null;
  sourceName: string | null;
  tags: string[];
  content: Record<string, unknown> | null;
  sections: Array<{
    title: string;
    paragraphs: string[];
  }>;
  paragraphs: string[];
  publishedAt: string;
  liked: boolean;
  favorited: boolean;
  likesCount: number;
  favoritesCount: number;
  sharesCount: number;
  viewsCount: number;
  commentsCount: number;
  comments: HealthNewsCommentItem[];
}

export interface HealthLectureListItem {
  lectureId: string;
  id: string;
  title: string;
  summary: string;
  speakerName: string | null;
  speakerTitle: string | null;
  coverUrl: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  durationMinutes: number | null;
  publishedAt: string;
  liked: boolean;
  favorited: boolean;
  likesCount: number;
  favoritesCount: number;
  sharesCount: number;
  viewsCount: number;
  commentsCount: number;
  stats?: {
    likes?: number;
    stars?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
}

export interface HealthLectureCommentItem {
  commentId: string;
  id: string;
  parentId?: string | null;
  content: string;
  createdAt: string;
  author: string;
  avatarUrl: string | null;
  city: string | null;
  replyTo?: string;
  likes: number;
  liked: boolean;
  isMine: boolean;
}

export interface HealthLectureDetail {
  lectureId: string;
  id: string;
  title: string;
  summary: string;
  speakerName: string | null;
  speakerTitle: string | null;
  coverUrl: string | null;
  heroImage: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  gallery: Array<{
    url: string;
    alt: string | null;
    caption: string | null;
    credit: string | null;
  }>;
  durationMinutes: number | null;
  publishedAt: string;
  outline: string[];
  highlights: string[];
  liked: boolean;
  favorited: boolean;
  likesCount: number;
  favoritesCount: number;
  sharesCount: number;
  viewsCount: number;
  commentsCount: number;
  comments: HealthLectureCommentItem[];
  stats?: {
    likes?: number;
    stars?: number;
    comments?: number;
    shares?: number;
    views?: number;
  };
}

export interface DiseaseDepartmentItem {
  departmentId: string;
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}

export interface DiseaseListItem {
  diseaseId: string;
  id: string;
  title: string;
  name: string;
  summary: string;
  department: {
    departmentId: string;
    code: string;
    name: string;
  } | null;
  viewed: boolean;
  publishedAt: string;
}

export interface DiseaseDetail {
  diseaseId: string;
  id: string;
  title: string;
  diseaseName: string;
  summary: string;
  department: {
    departmentId: string;
    code: string;
    name: string;
  } | null;
  symptoms: string[];
  causes: string[];
  preventions: string[];
  treatments: string[];
  tags: string[];
  quickFacts: Array<{
    label: string;
    value: string;
  }>;
  sections: Array<{
    title: string;
    content: string;
  }>;
  publishedAt: string;
}

export function listHealthNews(params?: {
  page?: number;
  pageSize?: number;
  sort?: "latest" | "LATEST" | "hot" | "HOT";
}) {
  const search = new URLSearchParams();

  if (params?.page) {
    search.set("page", String(params.page));
  }
  if (params?.pageSize) {
    search.set("pageSize", String(params.pageSize));
  }
  if (params?.sort) {
    search.set("sort", params.sort);
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return request<PaginatedResponse<HealthNewsListItem>>(`/app/content/news${suffix}`, {
    auth: true
  });
}

export function likeHealthNews(newsId: string) {
  return request<{ newsId: string; action: "LIKE"; recorded: boolean }>(
    `/app/content/news/${newsId}/like`,
    {
      method: "POST",
      auth: true
    }
  );
}

export function getHealthNewsDetail(newsId: string) {
  return request<HealthNewsDetail>(`/app/content/news/${newsId}`, {
    auth: true
  });
}

export function listHealthNewsComments(
  newsId: string,
  params?: {
    page?: number;
    pageSize?: number;
  }
) {
  const search = new URLSearchParams();

  if (params?.page) {
    search.set("page", String(params.page));
  }
  if (params?.pageSize) {
    search.set("pageSize", String(params.pageSize));
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return request<PaginatedResponse<HealthNewsCommentItem>>(
    `/app/content/news/${newsId}/comments${suffix}`,
    {
      auth: true
    }
  );
}

export function createHealthNewsComment(
  newsId: string,
  payload: {
    parentId?: string;
    content: string;
  }
) {
  return request<{ commentId: string; createdAt: string }>(`/app/content/news/${newsId}/comments`, {
    method: "POST",
    auth: true,
    body: payload
  });
}

export function favoriteHealthNews(newsId: string) {
  return request<{ newsId: string; action: "FAVORITE"; recorded: boolean }>(
    `/app/content/news/${newsId}/favorite`,
    {
      method: "POST",
      auth: true
    }
  );
}

export function shareHealthNews(newsId: string) {
  return request<{ newsId: string; action: "SHARE"; recorded: boolean }>(
    `/app/content/news/${newsId}/share`,
    {
      method: "POST",
      auth: true
    }
  );
}

export function listHealthLectures(params?: {
  page?: number;
  pageSize?: number;
  sort?: "latest" | "LATEST" | "hot" | "HOT";
}) {
  const search = new URLSearchParams();

  if (params?.page) {
    search.set("page", String(params.page));
  }
  if (params?.pageSize) {
    search.set("pageSize", String(params.pageSize));
  }
  if (params?.sort) {
    search.set("sort", params.sort);
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return request<PaginatedResponse<HealthLectureListItem>>(`/app/content/lectures${suffix}`, {
    auth: true
  });
}

export function getHealthLectureDetail(lectureId: string) {
  return request<HealthLectureDetail>(`/app/content/lectures/${lectureId}`, {
    auth: true
  });
}

export function listHealthLectureComments(
  lectureId: string,
  params?: {
    page?: number;
    pageSize?: number;
  }
) {
  const search = new URLSearchParams();

  if (params?.page) {
    search.set("page", String(params.page));
  }
  if (params?.pageSize) {
    search.set("pageSize", String(params.pageSize));
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return request<PaginatedResponse<HealthLectureCommentItem>>(
    `/app/content/lectures/${lectureId}/comments${suffix}`,
    {
      auth: true
    }
  );
}

export function likeHealthLecture(lectureId: string) {
  return request<{ lectureId: string; action: "LIKE"; recorded: boolean }>(
    `/app/content/lectures/${lectureId}/like`,
    {
      method: "POST",
      auth: true
    }
  );
}

export function favoriteHealthLecture(lectureId: string) {
  return request<{ lectureId: string; action: "FAVORITE"; recorded: boolean }>(
    `/app/content/lectures/${lectureId}/favorite`,
    {
      method: "POST",
      auth: true
    }
  );
}

export function shareHealthLecture(lectureId: string) {
  return request<{ lectureId: string; action: "SHARE"; recorded: boolean }>(
    `/app/content/lectures/${lectureId}/share`,
    {
      method: "POST",
      auth: true
    }
  );
}

export function listDiseaseDepartments() {
  return request<DiseaseDepartmentItem[]>(`/app/content/diseases/departments`, {
    auth: true
  });
}

export function listDiseases(params?: {
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams();

  if (params?.page) {
    search.set("page", String(params.page));
  }
  if (params?.pageSize) {
    search.set("pageSize", String(params.pageSize));
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return request<PaginatedResponse<DiseaseListItem>>(`/app/content/diseases${suffix}`, {
    auth: true
  });
}

export function getDiseaseDetail(diseaseId: string) {
  return request<DiseaseDetail>(`/app/content/diseases/${diseaseId}`, {
    auth: true
  });
}
