import { resolvePresentedContentCommentAvatar } from "../content/content-comment-presentation";

const PEXELS_IMAGE_BASE_URL = "https://images.pexels.com/photos";

function buildPexelsImageUrl(photoId: string) {
  return `${PEXELS_IMAGE_BASE_URL}/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1600`;
}

const topicCoverByTopicId: Record<string, string> = {
  topic_scenery: buildPexelsImageUrl("775417"),
  topic_food: buildPexelsImageUrl("18476165"),
  topic_sunset: buildPexelsImageUrl("13659778"),
  topic_photo: buildPexelsImageUrl("7445404"),
};

const postImagesByPostId: Record<string, string[]> = {
  post_kitchen: [
    buildPexelsImageUrl("18476165"),
    buildPexelsImageUrl("15779235"),
    buildPexelsImageUrl("15913456"),
  ],
  post_sunset: [buildPexelsImageUrl("13659778"), buildPexelsImageUrl("8953853")],
  post_river: [buildPexelsImageUrl("775417"), buildPexelsImageUrl("13659778")],
  post_light_meal: [buildPexelsImageUrl("15779235"), buildPexelsImageUrl("18476165")],
  post_photo_contest: [
    buildPexelsImageUrl("7445404"),
    buildPexelsImageUrl("8953853"),
    buildPexelsImageUrl("1337308"),
  ],
};

const activityCoverByActivityId: Record<string, string> = {
  activity_photography: buildPexelsImageUrl("7445404"),
  activity_seaside_walk: buildPexelsImageUrl("13659778"),
  activity_photo_salon: buildPexelsImageUrl("1337308"),
  activity_coast_walk: buildPexelsImageUrl("775417"),
};

export function resolvePresentedCommunityAvatar(context: {
  userId: string;
  avatarUrl: string | null;
}) {
  return resolvePresentedContentCommentAvatar(context);
}

export function resolvePresentedCommunityTopicCover(topic: {
  id: string;
  coverUrl: string | null;
}) {
  return topicCoverByTopicId[topic.id] ?? topic.coverUrl;
}

export function resolvePresentedCommunityPostImages(post: {
  id: string;
  images: string[];
}) {
  return postImagesByPostId[post.id] ?? post.images;
}

export function resolvePresentedCommunityActivityCover(activity: {
  id: string;
  coverUrl: string | null;
}) {
  return activityCoverByActivityId[activity.id] ?? activity.coverUrl;
}
