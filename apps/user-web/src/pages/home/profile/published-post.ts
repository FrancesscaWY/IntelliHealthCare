export type ProfileGalleryItem = {
  src: string;
  position?: string;
};

export type ProfilePost = {
  id: string;
  author: string;
  date: string;
  title?: string;
  content: string;
  likes: number;
  favorites: number;
  comments: number;
  gallery: ProfileGalleryItem[];
};

export const PUBLISHED_PROFILE_POST_KEY = "ihc_profile_published_post";

export function savePublishedProfilePost(post: ProfilePost) {
  window.localStorage.setItem(PUBLISHED_PROFILE_POST_KEY, JSON.stringify(post));
}

export function loadPublishedProfilePost(): ProfilePost | null {
  const rawValue = window.localStorage.getItem(PUBLISHED_PROFILE_POST_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as ProfilePost;
  } catch {
    return null;
  }
}
