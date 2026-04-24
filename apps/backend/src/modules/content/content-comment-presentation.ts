const CURATED_AVATAR_BASE_PATH = "/api/v1/assets/curated/avatars";
const PLACEHOLDER_COMMENT_PATTERN = /^(?:news|lecture)_comment_[a-z0-9_]+$/i;
const DEMO_AVATAR_HOST_PATTERN = /^https?:\/\/cdn\.intellihealthcare\.demo\/avatars\/([^/?#]+)$/i;
const DEMO_AVATAR_PATH_PATTERN = /^\/api\/v1\/assets\/demo\/avatars\/([^/?#]+)$/i;
const CURATED_AVATAR_FILE_PATTERN = /^\/api\/v1\/assets\/curated\/avatars\/([^/?#]+)$/i;
const CURATED_AVATAR_POOL = [
  "shen-qingzhi.jpg",
  "wang-xiuzhen.jpg",
  "wang-lan.jpg",
  "li-yuan.jpg",
] as const;

const commentAvatarByUserId: Record<string, string> = {
  user_member_qingzhi: `${CURATED_AVATAR_BASE_PATH}/shen-qingzhi.jpg`,
  user_elder_joy: `${CURATED_AVATAR_BASE_PATH}/wang-xiuzhen.jpg`,
  user_family_wanglan: `${CURATED_AVATAR_BASE_PATH}/wang-lan.jpg`,
  user_family_liyuan: `${CURATED_AVATAR_BASE_PATH}/li-yuan.jpg`,
};

const placeholderCommentPoolByTargetId: Record<string, string[]> = {
  article_low_salt: [
    "准备先把腌菜和高钠调味料减下来，再连续记录一周晨起血压。",
    "家里已经把测压时间和服药提醒写到同一张表里，执行起来顺手很多。",
    "这篇把控盐和药盒管理放在一起讲，家属照着做很有参考价值。",
    "看完后准备先从汤底、酱油和熟食这几类高钠来源开始调整。",
    "对老人来说，先固定晨起测压和晚间复盘，比只看一次读数更实用。",
  ],
  article_fall_prevention: [
    "准备先把夜灯、防滑垫和床边通道整理好，避免起夜时绊倒。",
    "最近家里老人转身有点不稳，这篇提醒了我们要尽快复查视力和用药。",
    "比起反复提醒慢一点，还是每周固定复盘一次跌倒风险更有效。",
    "准备把卫生间扶手和玄关换鞋区一起改一下，减少容易滑倒的地方。",
    "家属最容易忽略的确实是药物影响，回头要把最近新开的药再核对一遍。",
  ],
  article_sleep_quality: [
    "准备先把午睡时长和晚上喝茶的习惯调整一下，再观察一周睡眠情况。",
    "把起夜次数、入睡时间和白天精神状态记下来，后面就医时会更有帮助。",
    "这篇很适合家属参考，很多睡眠问题确实是作息和环境一起造成的。",
    "卧室灯光和晚饭时间这两个点家里都容易忽略，准备先从这里改起。",
    "先不急着加助眠药，把午睡、起夜和睡前刷手机这些因素排查清楚更稳妥。",
  ],
  lecture_bp_manage: [
    "讲堂把家庭测压步骤拆得很细，家属陪着执行会更容易坚持。",
    "准备把晨起、晚间和服药后的读数分开记录，这样复诊时更有参考价值。",
    "讲到测量前静坐和袖带位置这部分很关键，家里以前确实容易做错。",
    "对高血压家庭来说，先把固定测压时段和药盒核对做扎实最重要。",
    "如果再补一个家庭测压记录表模板，老人和家属照着填会更顺手。",
  ],
  lecture_rehab_train: [
    "讲堂提醒了训练不能只追求次数，动作质量和疲劳恢复同样重要。",
    "家里老人最近练完容易酸痛，看完后知道要先把动作幅度和节奏调下来。",
    "辅助器具怎么用这部分很实用，之前家里确实有很多凭感觉操作的地方。",
    "把居家训练、步行和复诊计划放到同一周安排里，执行起来会更稳定。",
    "这种把常见误区逐条拆开的讲法，比单纯讲理论更适合家属照护场景。",
  ],
  lecture_nutrition: [
    "一周营养搭配这部分很接地气，照着准备早餐和加餐会省很多事。",
    "讲堂把控盐、优质蛋白和蔬果安排放在一起讲，家里老人更容易理解。",
    "准备先把早餐和晚餐做成固定模板，再根据血压血糖情况慢慢调整。",
    "这种按一周节奏来安排饮食的方法，比临时想吃什么做什么更容易坚持。",
    "对家属来说，先把能长期执行的搭配方案做出来，比追求复杂食谱更重要。",
  ],
  default: [
    "这条内容很有参考价值，准备按文中的建议先做一轮家庭调整。",
    "家里已经开始照着执行了，先记录一周数据再继续观察变化。",
    "这种按场景拆开的建议比较容易落地，家属照着做也更省心。",
  ],
};

type CommentAvatarContext = {
  userId: string;
  avatarUrl: string | null;
};

type CommentContentContext = {
  targetId: string;
  content: string;
  commentId: string;
};

export function resolvePresentedContentCommentAvatar(
  context: CommentAvatarContext
) {
  const avatarUrl = context.avatarUrl?.trim() || "";
  const mappedAvatar = commentAvatarByUserId[context.userId];

  if (mappedAvatar) {
    return mappedAvatar;
  }

  const demoAvatarMatch = avatarUrl.match(DEMO_AVATAR_HOST_PATTERN);
  if (demoAvatarMatch?.[1]) {
    return resolveCuratedAvatarUrl(demoAvatarMatch[1], context.userId);
  }

  const demoAvatarPathMatch = avatarUrl.match(DEMO_AVATAR_PATH_PATTERN);
  if (demoAvatarPathMatch?.[1]) {
    return resolveCuratedAvatarUrl(demoAvatarPathMatch[1], context.userId);
  }

  if (avatarUrl.match(CURATED_AVATAR_FILE_PATTERN)) {
    return avatarUrl;
  }

  if (avatarUrl.startsWith("data:image/") || !avatarUrl) {
    return resolveCuratedAvatarUrl(undefined, context.userId);
  }

  if (avatarUrl.startsWith("/api/v1/assets/")) {
    return resolveCuratedAvatarUrl(undefined, context.userId);
  }

  return resolveCuratedAvatarUrl(undefined, context.userId);
}

export function normalizePresentedContentComment(
  context: CommentContentContext
) {
  const trimmedContent = context.content.trim();

  if (!trimmedContent) {
    return "";
  }

  if (!PLACEHOLDER_COMMENT_PATTERN.test(trimmedContent)) {
    return trimmedContent;
  }

  const pool =
    placeholderCommentPoolByTargetId[context.targetId] ??
    placeholderCommentPoolByTargetId.default;
  const seed = `${context.targetId}:${context.commentId}:${trimmedContent}`;
  const index = hashString(seed) % pool.length;

  return pool[index] ?? pool[0] ?? "这条评论已更新为可读内容。";
}

export function isInvalidPlaceholderContentComment(content: string) {
  return PLACEHOLDER_COMMENT_PATTERN.test(content.trim());
}

function hashString(value: string) {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function resolveCuratedAvatarUrl(fileName: string | undefined, userId: string) {
  const normalizedFileName = fileName?.trim().toLowerCase() || "";

  if (
    normalizedFileName &&
    CURATED_AVATAR_POOL.includes(
      normalizedFileName as (typeof CURATED_AVATAR_POOL)[number]
    )
  ) {
    return `${CURATED_AVATAR_BASE_PATH}/${normalizedFileName}`;
  }

  const fallbackFileName =
    CURATED_AVATAR_POOL[hashString(userId) % CURATED_AVATAR_POOL.length] ??
    CURATED_AVATAR_POOL[0];

  return `${CURATED_AVATAR_BASE_PATH}/${fallbackFileName}`;
}
