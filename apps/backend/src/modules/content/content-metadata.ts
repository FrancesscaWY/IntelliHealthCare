import {
  ensureArray,
  ensureRecord,
  toDateTimeString,
  toNumber,
} from "../../common/utils/serializers";

export type PublishedContentGalleryItem = {
  url: string;
  alt: string | null;
  caption: string | null;
  credit: string | null;
};

export type PublishedContentReference = {
  title: string;
  url: string;
  sourceName: string | null;
};

export type PublishedContentMeta = {
  sourceName: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceDescription: string | null;
  sourcePublishedAt: string | null;
  watchUrl: string | null;
  watchLabel: string | null;
  readingMinutes: number | null;
  imageAlt: string | null;
  gallery: PublishedContentGalleryItem[];
  references: PublishedContentReference[];
};

export function extractPublishedContentMeta(
  content: unknown,
  fallbackCoverUrl?: string | null
): PublishedContentMeta {
  const record = ensureRecord(content);
  const imageAlt = readString(record.imageAlt);
  const gallery = ensureArray<Record<string, unknown>>(record.gallery)
    .map((item) => ({
      url: readString(item.url) ?? "",
      alt: readString(item.alt),
      caption: readString(item.caption),
      credit: readString(item.credit),
    }))
    .filter((item) => item.url);

  if (gallery.length === 0 && fallbackCoverUrl) {
    gallery.push({
      url: fallbackCoverUrl,
      alt: imageAlt,
      caption: null,
      credit: null,
    });
  }

  const references = ensureArray<Record<string, unknown>>(record.references)
    .map((item) => ({
      title: readString(item.title) ?? "",
      url: readString(item.url) ?? "",
      sourceName: readString(item.sourceName),
    }))
    .filter((item) => item.title && item.url);

  return {
    sourceName: readString(record.sourceName),
    sourceUrl: readString(record.sourceUrl),
    sourceTitle: readString(record.sourceTitle),
    sourceDescription: readString(record.sourceDescription),
    sourcePublishedAt: normalizeDateTime(record.sourcePublishedAt),
    watchUrl: readString(record.watchUrl),
    watchLabel: readString(record.watchLabel),
    readingMinutes: toNumber(record.readingMinutes),
    imageAlt,
    gallery,
    references,
  };
}

function normalizeDateTime(value: unknown) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return toDateTimeString(value);
  }

  if (typeof value === "string") {
    return toDateTimeString(value);
  }

  return null;
}

function readString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}
