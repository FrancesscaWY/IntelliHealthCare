const DEMO_MEDIA_HOSTS = new Set(["cdn.intellihealthcare.demo"]);
const AVATAR_KEY_PATTERN = /avatar/i;
const IMAGE_KEY_PATTERN =
  /(^|_)(image|cover|banner)(_|$)|imageUrl|coverUrl|heroImage|productImage|serviceCover/i;
const VIDEO_KEY_PATTERN = /(^|_)(video)(_|$)|videoUrl/i;
const AVATAR_ARRAY_KEY_PATTERN = /avatars/i;
const IMAGE_ARRAY_KEY_PATTERN = /images|covers|banners/i;
const PEXELS_IMAGE_BASE_URL = "https://images.pexels.com/photos";
const CURATED_AVATAR_BASE_URL = "/api/v1/assets/curated/avatars";
const AVATAR_POOL = [
  `${CURATED_AVATAR_BASE_URL}/wang-xiuzhen.jpg`,
  `${CURATED_AVATAR_BASE_URL}/shen-qingzhi.jpg`,
  `${CURATED_AVATAR_BASE_URL}/wang-lan.jpg`,
  `${CURATED_AVATAR_BASE_URL}/li-yuan.jpg`
] as const;
const STAFF_POOL = AVATAR_POOL;
const SERVICE_POOL = [
  buildPexelsImageUrl("8055825"),
  buildPexelsImageUrl("8413217"),
  buildPexelsImageUrl("6922186"),
  buildPexelsImageUrl("30483052"),
  buildPexelsImageUrl("14532311")
] as const;
const CONTENT_POOL = [
  buildPexelsImageUrl("4975654"),
  buildPexelsImageUrl("775417"),
  buildPexelsImageUrl("8865662"),
  buildPexelsImageUrl("8088856"),
  buildPexelsImageUrl("11583653")
] as const;
const ACTIVITY_POOL = [
  buildPexelsImageUrl("7445404"),
  buildPexelsImageUrl("13659778"),
  buildPexelsImageUrl("775417"),
  buildPexelsImageUrl("18509799")
] as const;
const RECIPE_POOL = [
  buildPexelsImageUrl("4725729"),
  buildPexelsImageUrl("6740517"),
  buildPexelsImageUrl("8983415"),
  buildPexelsImageUrl("8286788"),
  buildPexelsImageUrl("704569"),
  buildPexelsImageUrl("5835353"),
  buildPexelsImageUrl("13630358"),
  buildPexelsImageUrl("1029582")
] as const;
const DEVICE_POOL = [
  buildPexelsImageUrl("18870282"),
  buildPexelsImageUrl("8413217")
] as const;
const REPORT_POOL = [
  buildPexelsImageUrl("590022"),
  buildPexelsImageUrl("669610")
] as const;

type MediaNormalizationOptions = {
  disableDemoContentImageFallback?: boolean;
  absoluteBaseUrl?: string;
};

type MediaKind = "avatar" | "image" | "video";
type NonVideoMediaKind = Exclude<MediaKind, "video">;

function buildPexelsImageUrl(photoId: string) {
  return `${PEXELS_IMAGE_BASE_URL}/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1600`;
}

export function normalizeApiMediaPayload<T>(
  input: T,
  options: MediaNormalizationOptions = {}
): T {
  return normalizeValue(input, undefined, undefined, options) as T;
}

function normalizeValue(
  value: unknown,
  key?: string,
  context?: Record<string, unknown>,
  options: MediaNormalizationOptions = {}
): unknown {
  if (Array.isArray(value)) {
    if (key && isMediaArrayKey(key)) {
      return value.map((item, index) =>
        normalizeMediaField(toSingularMediaKey(key), item, context, index, options)
      );
    }

    return value.map((item) => normalizeValue(item, undefined, undefined, options));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const source = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [childKey, childValue] of Object.entries(source)) {
    if (isMediaKey(childKey)) {
      next[childKey] = normalizeMediaField(childKey, childValue, source, 0, options);
      continue;
    }

    if (Array.isArray(childValue) && isMediaArrayKey(childKey)) {
      next[childKey] = childValue.map((item, index) =>
        normalizeMediaField(toSingularMediaKey(childKey), item, source, index, options)
      );
      continue;
    }

    next[childKey] = normalizeValue(childValue, childKey, source, options);
  }

  return next;
}

function normalizeMediaField(
  key: string,
  value: unknown,
  context?: Record<string, unknown>,
  index = 0,
  options: MediaNormalizationOptions = {}
) {
  const kind = getMediaKind(key);

  if (!kind) {
    return value;
  }

  if (kind === "image" && options.disableDemoContentImageFallback) {
    return typeof value === "string"
      ? absolutizeMediaUrl(value, options.absoluteBaseUrl)
      : value;
  }

  const normalized =
    typeof value === "string"
      ? normalizeProvidedMediaUrl(value, kind, key, context, index, options)
      : "";
  if (normalized) {
    return normalized;
  }

  if (kind === "video") {
    return value;
  }

  const localFallback = buildLocalFallbackMediaUrl(kind, key, context, index);
  if (localFallback) {
    return absolutizeMediaUrl(localFallback, options.absoluteBaseUrl);
  }

  if (kind === "avatar") {
    return buildAvatarPlaceholderDataUri(resolveAvatarLabel(context, index));
  }

  return buildImagePlaceholderDataUri(
    resolveImageTitle(context, key, index),
    resolveImageSubtitle(context, key)
  );
}

function normalizeProvidedMediaUrl(
  value: string,
  kind: MediaKind,
  key: string,
  context?: Record<string, unknown>,
  index = 0,
  options: MediaNormalizationOptions = {}
) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return absolutizeMediaUrl(trimmed, options.absoluteBaseUrl);
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    if (kind !== "video" && DEMO_MEDIA_HOSTS.has(url.hostname.toLowerCase())) {
      return absolutizeMediaUrl(
        buildDemoMediaUrl(url.pathname, kind as NonVideoMediaKind, key, context, index),
        options.absoluteBaseUrl
      );
    }
  } catch {
    return "";
  }

  return trimmed;
}

function isMediaKey(key: string) {
  return (
    AVATAR_KEY_PATTERN.test(key) ||
    IMAGE_KEY_PATTERN.test(key) ||
    VIDEO_KEY_PATTERN.test(key)
  );
}

function isMediaArrayKey(key: string) {
  return AVATAR_ARRAY_KEY_PATTERN.test(key) || IMAGE_ARRAY_KEY_PATTERN.test(key);
}

function toSingularMediaKey(key: string) {
  if (AVATAR_ARRAY_KEY_PATTERN.test(key)) {
    return "avatar";
  }

  return "image";
}

function getMediaKind(key: string) {
  if (AVATAR_KEY_PATTERN.test(key)) {
    return "avatar" as const;
  }

  if (IMAGE_KEY_PATTERN.test(key)) {
    return "image" as const;
  }

  if (VIDEO_KEY_PATTERN.test(key)) {
    return "video" as const;
  }

  return null;
}

function resolveAvatarLabel(context?: Record<string, unknown>, index = 0) {
  const label =
    pickFirstString(context, [
      "name",
      "nickname",
      "realName",
      "userName",
      "buyerName",
      "customerName",
      "ownerName",
      "assigneeName",
      "operatorName",
      "staffName",
      "label",
      "title"
    ]) || "IntelliHealthCare";

  return index > 0 ? `${label}-${index + 1}` : label;
}

function resolveImageTitle(
  context: Record<string, unknown> | undefined,
  key: string,
  index = 0
) {
  const label =
    pickFirstString(context, [
      "title",
      "name",
      "productTitle",
      "serviceTitle",
      "institutionName",
      "orderName",
      "userName",
      "buyerName",
      "customerName",
      "label",
      "topic",
      "content"
    ]) || defaultImageTitleForKey(key);

  return index > 0 ? `${label} ${index + 1}` : label;
}

function resolveImageSubtitle(
  context: Record<string, unknown> | undefined,
  key: string
) {
  const explicit = pickFirstString(context, [
    "category",
    "scene",
    "roleLabel",
    "type",
    "statusText"
  ]);

  if (explicit) {
    return humanizeToken(explicit);
  }

  if (/cover/i.test(key)) {
    return "Service Cover";
  }

  if (/banner/i.test(key)) {
    return "Display Banner";
  }

  return "IntelliHealthCare";
}

function defaultImageTitleForKey(key: string) {
  if (/cover/i.test(key)) {
    return "Service Cover";
  }

  if (/banner/i.test(key)) {
    return "Display Banner";
  }

  return "IntelliHealthCare";
}

function buildDemoMediaUrl(
  pathname: string,
  kind: NonVideoMediaKind,
  key: string,
  context?: Record<string, unknown>,
  index = 0
) {
  const normalizedPath = pathname.replace(/^\/+/, "").toLowerCase();
  const [scope] = normalizedPath.split("/");
  const seed = `${normalizedPath}:${resolveAvatarLabel(context, index)}:${resolveImageTitle(
    context,
    key,
    index
  )}`;

  if (kind === "avatar") {
    const pool = scope === "staff" ? STAFF_POOL : AVATAR_POOL;
    return pickFromPool(pool, seed);
  }

  if (scope === "services") {
    return selectServiceAsset(normalizedPath, seed);
  }

  if (scope === "diet") {
    return pickFromPool(RECIPE_POOL, seed);
  }

  if (scope === "content") {
    return pickFromPool(CONTENT_POOL, seed);
  }

  if (scope === "community" || scope === "activities") {
    return pickFromPool(ACTIVITY_POOL, seed);
  }

  if (scope === "reports") {
    return pickFromPool(REPORT_POOL, seed);
  }

  return buildLocalFallbackMediaUrl(kind, key, context, index);
}

function buildLocalFallbackMediaUrl(
  kind: NonVideoMediaKind,
  key: string,
  context?: Record<string, unknown>,
  index = 0
) {
  const seed = `${resolveAvatarLabel(context, index)}:${resolveImageTitle(
    context,
    key,
    index
  )}:${resolveImageSubtitle(context, key)}`;

  if (kind === "avatar") {
    const pool = /staff|assignee|operator/i.test(key) ? STAFF_POOL : AVATAR_POOL;
    return pickFromPool(pool, seed);
  }

  if (/report/i.test(key)) {
    return pickFromPool(REPORT_POOL, seed);
  }

  if (/device|exam|health|bp|glucose/i.test(seed)) {
    return pickFromPool(DEVICE_POOL, seed);
  }

  if (/recipe|diet|meal|food|nutrition/i.test(seed)) {
    return pickFromPool(RECIPE_POOL, seed);
  }

  if (/activity|lecture|article|topic|community|content|banner/i.test(seed)) {
    return pickFromPool(ACTIVITY_POOL, seed);
  }

  return selectServiceAsset(seed.toLowerCase(), seed);
}

function pickFirstString(
  source: Record<string, unknown> | undefined,
  keys: string[]
) {
  if (!source) {
    return "";
  }

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function selectServiceAsset(seedText: string, seed: string) {
  if (/clean|housekeep|home clean|daily clean/.test(seedText)) {
    return buildPexelsImageUrl("8055825");
  }

  if (/rehab|stroke|knee|therapy|recover/.test(seedText)) {
    return /knee|joint/i.test(seedText)
      ? buildPexelsImageUrl("30483052")
      : buildPexelsImageUrl("6922186");
  }

  if (/exam|doctor|checkup|device|monitor|clinic/.test(seedText)) {
    return /doctor|clinic/i.test(seedText)
      ? buildPexelsImageUrl("8413217")
      : buildPexelsImageUrl("18870282");
  }

  if (/elder|room|institution|nursing|care/.test(seedText)) {
    return /day|community/i.test(seedText)
      ? buildPexelsImageUrl("18509799")
      : buildPexelsImageUrl("14532311");
  }

  return pickFromPool(SERVICE_POOL, seed);
}

function pickFromPool(pool: readonly string[], seed: string) {
  return pool[hashString(seed) % pool.length] ?? pool[0] ?? "";
}

function absolutizeMediaUrl(value: string, absoluteBaseUrl?: string) {
  const trimmed = value.trim();

  if (
    !absoluteBaseUrl ||
    !trimmed ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }

  if (!trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    return new URL(trimmed, `${absoluteBaseUrl.replace(/\/+$/, "")}/`).toString();
  } catch {
    return trimmed;
  }
}

function buildAvatarPlaceholderDataUri(label: string) {
  const initials = extractAvatarText(label);
  const [startColor, endColor, shadowColor] = createPalette(label);
  const title = escapeXml(truncateText(label, 14));
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="${startColor}" />
      <stop offset="100%" stop-color="${endColor}" />
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="40" fill="url(#bg)" />
  <circle cx="80" cy="76" r="40" fill="rgba(255,255,255,0.16)" />
  <circle cx="80" cy="76" r="29" fill="${shadowColor}" fill-opacity="0.22" />
  <text x="80" y="88" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="34" font-weight="700">${escapeXml(initials)}</text>
  <text x="80" y="130" text-anchor="middle" fill="rgba(255,255,255,0.92)" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="11" letter-spacing="1.2">${title}</text>
</svg>`.trim();

  return svgToDataUri(svg);
}

function buildImagePlaceholderDataUri(title: string, subtitle: string) {
  const [startColor, endColor, shadowColor] = createPalette(`${title}:${subtitle}`);
  const [primaryLine, secondaryLine] = splitTextLines(title, 18);
  const primaryTitle = escapeXml(primaryLine);
  const secondaryTitle = escapeXml(secondaryLine);
  const resolvedSubtitle = escapeXml(truncateText(subtitle, 24));
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 540" role="img" aria-label="${primaryTitle}">
  <defs>
    <linearGradient id="hero" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="${startColor}" />
      <stop offset="100%" stop-color="${endColor}" />
    </linearGradient>
  </defs>
  <rect width="720" height="540" rx="36" fill="url(#hero)" />
  <circle cx="612" cy="118" r="116" fill="rgba(255,255,255,0.12)" />
  <circle cx="148" cy="438" r="96" fill="rgba(255,255,255,0.10)" />
  <rect x="54" y="58" width="612" height="424" rx="28" fill="rgba(16,24,40,0.14)" stroke="rgba(255,255,255,0.2)" />
  <rect x="88" y="102" width="130" height="16" rx="8" fill="rgba(255,255,255,0.28)" />
  <rect x="88" y="138" width="212" height="14" rx="7" fill="rgba(255,255,255,0.16)" />
  <rect x="88" y="198" width="214" height="152" rx="24" fill="rgba(255,255,255,0.16)" />
  <rect x="332" y="198" width="298" height="18" rx="9" fill="rgba(255,255,255,0.26)" />
  <rect x="332" y="234" width="256" height="14" rx="7" fill="rgba(255,255,255,0.16)" />
  <rect x="332" y="266" width="214" height="14" rx="7" fill="rgba(255,255,255,0.14)" />
  <rect x="332" y="310" width="120" height="40" rx="20" fill="${shadowColor}" fill-opacity="0.26" />
  <text x="88" y="406" fill="rgba(255,255,255,0.9)" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="14" letter-spacing="1.8">${resolvedSubtitle}</text>
  <text x="88" y="448" fill="#ffffff" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="34" font-weight="700">${primaryTitle}</text>
  <text x="88" y="486" fill="rgba(255,255,255,0.96)" font-family="Segoe UI, PingFang SC, Microsoft YaHei, sans-serif" font-size="24" font-weight="600">${secondaryTitle}</text>
</svg>`.trim();

  return svgToDataUri(svg);
}

function extractAvatarText(label: string) {
  const normalized = label.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "IH";
  }

  const parts = normalized.split(" ");
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  const chars = Array.from(normalized);
  return chars.slice(-2).join("").toUpperCase();
}

function createPalette(seed: string) {
  const hash = hashString(seed);
  const hue = hash % 360;
  return [
    `hsl(${hue} 64% 58%)`,
    `hsl(${(hue + 38) % 360} 72% 42%)`,
    `hsl(${(hue + 72) % 360} 58% 28%)`
  ] as const;
}

function hashString(seed: string) {
  return Array.from(seed).reduce(
    (value, char) => (value * 33 + char.charCodeAt(0)) >>> 0,
    5381
  );
}

function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function truncateText(value: string, maxLength: number) {
  const chars = Array.from(value.trim());
  return chars.length > maxLength ? `${chars.slice(0, maxLength).join("")}...` : chars.join("");
}

function splitTextLines(value: string, maxLength: number) {
  const chars = Array.from(value.trim());
  const firstLine = chars.slice(0, maxLength).join("") || "IntelliHealthCare";
  const remainder = chars.slice(maxLength).join("");
  return [firstLine, truncateText(remainder, maxLength)] as const;
}

function humanizeToken(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isPlainObject(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (value instanceof Date) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
