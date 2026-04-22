import { Prisma } from "@prisma/client";

export interface RagSearchCandidateInput {
  title: string | null;
  content: string;
  headings: Prisma.JsonValue | null;
  keywords: Prisma.JsonValue | null;
  embedding: Prisma.JsonValue | null;
}

export interface RagSearchScoreResult {
  score: number;
  matchedTerms: string[];
  excerpt: string;
}

export function normalizeRagQuery(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function tokenizeRagQuery(query: string) {
  const tokens = query.match(/[A-Za-z0-9]+|[\u4e00-\u9fa5]{1,4}/g) ?? [];
  return Array.from(
    new Set(
      tokens
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item.length >= 2)
    )
  ).slice(0, 8);
}

export function scoreRagCandidate(
  candidate: RagSearchCandidateInput,
  normalizedQuery: string,
  tokens: string[],
  queryVector: number[] | null
): RagSearchScoreResult {
  const matchedTerms = collectMatchedTerms(candidate, normalizedQuery, tokens);
  const lexicalScore = scoreLexical(candidate, normalizedQuery, tokens);
  const semanticScore = queryVector
    ? cosineSimilarity(queryVector, readRagVector(candidate.embedding))
    : 0;
  const score = Number((lexicalScore + semanticScore * 3).toFixed(4));

  return {
    score,
    matchedTerms,
    excerpt: buildRagExcerpt(candidate.content, normalizedQuery, matchedTerms)
  };
}

export function readRagVector(value: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isFinite(item));
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export function buildRagExcerpt(
  content: string,
  normalizedQuery: string,
  matchedTerms: string[]
) {
  const tokens = [normalizedQuery, ...matchedTerms].filter(Boolean);
  const lowerContent = content.toLowerCase();
  let index = -1;

  for (const token of tokens) {
    index = lowerContent.indexOf(token.toLowerCase());

    if (index >= 0) {
      break;
    }
  }

  if (index < 0) {
    return content.slice(0, 220).trim();
  }

  const start = Math.max(0, index - 80);
  const end = Math.min(content.length, index + 160);
  return content.slice(start, end).trim();
}

function collectMatchedTerms(
  candidate: RagSearchCandidateInput,
  normalizedQuery: string,
  tokens: string[]
) {
  const haystacks = [
    candidate.title ?? "",
    candidate.content,
    ...asStringArray(candidate.keywords),
    ...asStringArray(candidate.headings)
  ]
    .join(" ")
    .toLowerCase();
  const matches = new Set<string>();

  if (haystacks.includes(normalizedQuery.toLowerCase())) {
    matches.add(normalizedQuery);
  }

  for (const token of tokens) {
    if (haystacks.includes(token.toLowerCase())) {
      matches.add(token);
    }
  }

  return Array.from(matches).slice(0, 8);
}

function scoreLexical(
  candidate: RagSearchCandidateInput,
  normalizedQuery: string,
  tokens: string[]
) {
  const title = (candidate.title ?? "").toLowerCase();
  const content = candidate.content.toLowerCase();
  const keywords = asStringArray(candidate.keywords).map((item) => item.toLowerCase());
  const headings = asStringArray(candidate.headings).map((item) => item.toLowerCase());
  const queryLower = normalizedQuery.toLowerCase();
  let score = 0;

  if (title.includes(queryLower)) {
    score += 10;
  }

  if (content.includes(queryLower)) {
    score += 8;
  }

  for (const token of tokens) {
    const lowerToken = token.toLowerCase();

    if (title.includes(lowerToken)) {
      score += 4;
    }

    if (content.includes(lowerToken)) {
      score += lowerToken.length >= 2 ? 2 : 0.5;
    }

    if (keywords.some((item) => item.includes(lowerToken))) {
      score += 3;
    }

    if (headings.some((item) => item.includes(lowerToken))) {
      score += 1.5;
    }
  }

  return score;
}

function asStringArray(value: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}
