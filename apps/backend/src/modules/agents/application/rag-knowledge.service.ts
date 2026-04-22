import {
  BadRequestException,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import {
  Prisma,
  RagDocumentStatus,
  RagKnowledgeType,
  RagSourceType,
  RagVisibilityScope,
  UserType
} from "@prisma/client";
import type { AuthenticatedUser } from "../../../common/auth/auth.types";
import { PrismaService } from "../../../infra/prisma/prisma.service";
import type {
  AppRagSearchQueryDto,
  InternalRagKnowledgeBaseQueryDto,
  InternalRagSearchDto
} from "../dto/rag-search.dto";
import { EmbeddingGateway } from "../gateways/embedding.gateway";

type SearchMode = "app" | "internal" | "agent";

interface ScopeClause {
  visibility: RagVisibilityScope;
  ownerUserId?: string;
  institutionId?: string;
}

interface ChunkCandidate {
  id: string;
  chunkIndex: number;
  title: string | null;
  content: string;
  headings: Prisma.JsonValue | null;
  keywords: Prisma.JsonValue | null;
  embedding: Prisma.JsonValue | null;
  embeddingModel: string | null;
  visibility: RagVisibilityScope;
  ownerUserId: string | null;
  institutionId: string | null;
  document: {
    id: string;
    title: string;
    summary: string | null;
    sourceType: RagSourceType;
    sourceUri: string | null;
    publishedAt: Date | null;
    status: RagDocumentStatus;
  };
  knowledgeBase: {
    id: string;
    code: string;
    name: string;
    knowledgeType: RagKnowledgeType;
    visibility: RagVisibilityScope;
  };
}

export interface RagSearchCitation {
  knowledgeBaseCode: string;
  knowledgeType: RagKnowledgeType;
  visibility: RagVisibilityScope;
  documentId: string;
  chunkId: string;
  title: string;
  sourceType: RagSourceType;
  sourceUri: string | null;
  chunkIndex: number;
  ownerUserId: string | null;
  institutionId: string | null;
}

export interface RagSearchHit {
  score: number;
  excerpt: string;
  matchedTerms: string[];
  document: {
    id: string;
    title: string;
    summary: string | null;
    sourceType: RagSourceType;
    sourceUri: string | null;
    publishedAt: string | null;
  };
  knowledgeBase: {
    code: string;
    name: string;
    knowledgeType: RagKnowledgeType;
    visibility: RagVisibilityScope;
  };
  citation: RagSearchCitation;
}

export interface RagSearchResponse {
  query: string;
  limit: number;
  total: number;
  targetUserId: string | null;
  institutionId: string | null;
  appliedKnowledgeTypes: RagKnowledgeType[] | null;
  appliedVisibilityScopes: RagVisibilityScope[];
  results: RagSearchHit[];
  trace: {
    searchMode: SearchMode;
    queryTokens: string[];
    candidateCount: number;
    embedding: {
      provider: string;
      model: string;
      fallbackMode: boolean;
    } | null;
  };
}

export interface AgentRagSearchInput {
  query: string;
  knowledgeTypes?: RagKnowledgeType[];
  actorUserId?: string | null;
  targetUserId?: string | null;
  institutionId?: string | null;
  limit?: number;
}

@Injectable()
export class RagKnowledgeService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly embeddingGateway: EmbeddingGateway
  ) {}

  async listKnowledgeBasesForInternal(query: InternalRagKnowledgeBaseQueryDto) {
    const knowledgeTypes = this.normalizeKnowledgeTypes(query.knowledgeTypes);
    const visibilityScopes = this.normalizeVisibilityScopes(query.visibilityScopes);

    const items = await this.prismaService.ragKnowledgeBase.findMany({
      where: {
        ...(knowledgeTypes ? { knowledgeType: { in: knowledgeTypes } } : {}),
        ...(visibilityScopes ? { visibility: { in: visibilityScopes } } : {}),
        ...(query.ownerUserId ? { ownerUserId: query.ownerUserId } : {}),
        ...(query.institutionId ? { institutionId: query.institutionId } : {})
      },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        knowledgeType: true,
        visibility: true,
        description: true,
        ownerUserId: true,
        institutionId: true,
        createdAt: true,
        updatedAt: true,
        sourceConfig: true,
        refreshPolicy: true,
        chunkConfig: true,
        metadata: true,
        _count: {
          select: {
            documents: true,
            chunks: true,
            ingestionRuns: true
          }
        },
        ingestionRuns: {
          take: 1,
          orderBy: { startedAt: "desc" },
          select: {
            id: true,
            triggerSource: true,
            status: true,
            documentCount: true,
            chunkCount: true,
            startedAt: true,
            completedAt: true,
            errorMessage: true
          }
        }
      }
    });

    return {
      total: items.length,
      knowledgeBases: items.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        knowledgeType: item.knowledgeType,
        visibility: item.visibility,
        description: item.description,
        ownerUserId: item.ownerUserId,
        institutionId: item.institutionId,
        sourceConfig: item.sourceConfig,
        refreshPolicy: item.refreshPolicy,
        chunkConfig: item.chunkConfig,
        metadata: item.metadata,
        counts: item._count,
        latestIngestionRun: item.ingestionRuns[0] ?? null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      }))
    };
  }

  async searchForAppUser(
    currentUser: AuthenticatedUser,
    query: AppRagSearchQueryDto
  ): Promise<RagSearchResponse> {
    const knowledgeTypes = this.normalizeKnowledgeTypes(query.knowledgeTypes);
    const includePrivate = query.includePrivate === true;

    if (knowledgeTypes?.includes(RagKnowledgeType.INSTITUTION_RESOURCE)) {
      throw new BadRequestException("App search does not support institution resource knowledge");
    }

    if (
      knowledgeTypes?.includes(RagKnowledgeType.USER_PRIVATE_ARCHIVE) &&
      !includePrivate
    ) {
      throw new BadRequestException(
        "includePrivate=true is required when searching USER_PRIVATE_ARCHIVE"
      );
    }

    const scopeClauses: ScopeClause[] = [
      {
        visibility: RagVisibilityScope.PUBLIC
      }
    ];

    const targetUserId = includePrivate
      ? await this.resolveTargetUserId(currentUser, query.elderId)
      : null;

    if (targetUserId) {
      scopeClauses.push({
        visibility: RagVisibilityScope.USER_PRIVATE,
        ownerUserId: targetUserId
      });
    }

    return this.searchAuthorized({
      query: query.query,
      limit: query.limit,
      knowledgeTypes,
      scopeClauses,
      searchMode: "app",
      targetUserId,
      institutionId: null
    });
  }

  async searchForInternal(
    currentUser: AuthenticatedUser,
    input: InternalRagSearchDto
  ): Promise<RagSearchResponse> {
    if (currentUser.scope !== "admin") {
      throw new ForbiddenException("Internal RAG search requires admin scope");
    }

    const knowledgeTypes = this.normalizeKnowledgeTypes(input.knowledgeTypes);
    const visibilityScopes =
      this.normalizeVisibilityScopes(input.visibilityScopes) ?? [
        RagVisibilityScope.PUBLIC,
        RagVisibilityScope.INSTITUTION,
        RagVisibilityScope.USER_PRIVATE
      ];
    const scopeClauses = this.buildScopeClauses({
      visibilityScopes,
      ownerUserId: input.ownerUserId,
      institutionId: input.institutionId
    });

    return this.searchAuthorized({
      query: input.query,
      limit: input.limit,
      knowledgeTypes,
      scopeClauses,
      searchMode: "internal",
      targetUserId: input.ownerUserId ?? null,
      institutionId: input.institutionId ?? null
    });
  }

  private buildScopeClauses(input: {
    visibilityScopes: RagVisibilityScope[];
    ownerUserId?: string;
    institutionId?: string;
  }) {
    const clauses: ScopeClause[] = [];

    for (const visibility of input.visibilityScopes) {
      if (visibility === RagVisibilityScope.PUBLIC) {
        clauses.push({ visibility });
        continue;
      }

      if (visibility === RagVisibilityScope.USER_PRIVATE) {
        clauses.push({
          visibility,
          ...(input.ownerUserId ? { ownerUserId: input.ownerUserId } : {})
        });
        continue;
      }

      clauses.push({
        visibility,
        ...(input.institutionId ? { institutionId: input.institutionId } : {})
      });
    }

    return clauses;
  }

  async searchForAgent(input: AgentRagSearchInput): Promise<RagSearchResponse> {
    const limit = input.limit ?? 4;
    const knowledgeTypes = this.normalizeKnowledgeTypes(input.knowledgeTypes);
    const actor = input.actorUserId
      ? await this.prismaService.user.findUnique({
          where: { id: input.actorUserId },
          select: {
            id: true,
            type: true,
            realName: true,
            phone: true
          }
        })
      : null;

    const scopeClauses: ScopeClause[] = [
      {
        visibility: RagVisibilityScope.PUBLIC
      }
    ];

    let targetUserId: string | null = null;

    if (actor && input.targetUserId) {
      const allowedUserId = await this.resolveAuthorizedTargetUserId(actor, input.targetUserId);

      if (allowedUserId) {
        targetUserId = allowedUserId;
        scopeClauses.push({
          visibility: RagVisibilityScope.USER_PRIVATE,
          ownerUserId: allowedUserId
        });
      }
    }

    if (
      actor &&
      input.institutionId &&
      this.isPrivilegedUserType(actor.type)
    ) {
      scopeClauses.push({
        visibility: RagVisibilityScope.INSTITUTION,
        institutionId: input.institutionId
      });
    }

    return this.searchAuthorized({
      query: input.query,
      limit,
      knowledgeTypes,
      scopeClauses,
      searchMode: "agent",
      targetUserId,
      institutionId: input.institutionId ?? null
    });
  }

  private async searchAuthorized(input: {
    query: string;
    limit: number;
    knowledgeTypes: RagKnowledgeType[] | null;
    scopeClauses: ScopeClause[];
    searchMode: SearchMode;
    targetUserId: string | null;
    institutionId: string | null;
  }): Promise<RagSearchResponse> {
    const normalizedQuery = this.normalizeQuery(input.query);
    const tokens = this.tokenizeQuery(normalizedQuery);

    if (input.scopeClauses.length === 0) {
      return {
        query: normalizedQuery,
        limit: input.limit,
        total: 0,
        targetUserId: input.targetUserId,
        institutionId: input.institutionId,
        appliedKnowledgeTypes: input.knowledgeTypes,
        appliedVisibilityScopes: [],
        results: [],
        trace: {
          searchMode: input.searchMode,
          queryTokens: tokens,
          candidateCount: 0,
          embedding: null
        }
      };
    }

    const lexicalCandidates = await this.fetchCandidates({
      scopeClauses: input.scopeClauses,
      tokens,
      limit: this.getCandidateLimit(input.limit)
    });
    const candidates =
      lexicalCandidates.length > 0
        ? lexicalCandidates
        : await this.fetchCandidates({
            scopeClauses: input.scopeClauses,
            limit: this.getCandidateLimit(input.limit)
          });

    const filteredCandidates = candidates.filter((candidate) => {
      if (candidate.document.status !== RagDocumentStatus.ACTIVE) {
        return false;
      }

      if (
        input.knowledgeTypes &&
        !input.knowledgeTypes.includes(candidate.knowledgeBase.knowledgeType)
      ) {
        return false;
      }

      return true;
    });

    const embeddingResponse = await this.embeddingGateway
      .embedTexts({
        agentName: "RagKnowledgeService",
        texts: [normalizedQuery]
      })
      .catch(() => null);
    const queryVector = embeddingResponse?.vectors[0] ?? null;

    const scored = filteredCandidates
      .map((candidate) => this.scoreCandidate(candidate, normalizedQuery, tokens, queryVector))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score);

    const results = scored.slice(0, input.limit).map((item) => item.hit);

    return {
      query: normalizedQuery,
      limit: input.limit,
      total: scored.length,
      targetUserId: input.targetUserId,
      institutionId: input.institutionId,
      appliedKnowledgeTypes: input.knowledgeTypes,
      appliedVisibilityScopes: Array.from(
        new Set(input.scopeClauses.map((item) => item.visibility))
      ),
      results,
      trace: {
        searchMode: input.searchMode,
        queryTokens: tokens,
        candidateCount: filteredCandidates.length,
        embedding: embeddingResponse
          ? {
              provider: embeddingResponse.trace.provider,
              model: embeddingResponse.trace.model,
              fallbackMode: embeddingResponse.trace.fallbackMode
            }
          : null
      }
    };
  }

  private async fetchCandidates(input: {
    scopeClauses: ScopeClause[];
    tokens?: string[];
    limit: number;
  }) {
    const where: Prisma.RagChunkWhereInput = input.tokens?.length
      ? {
          AND: [
            {
              OR: this.buildScopeWhere(input.scopeClauses)
            },
            {
              OR: input.tokens.flatMap((token) => [
                {
                  title: {
                    contains: token,
                    mode: "insensitive"
                  }
                },
                {
                  content: {
                    contains: token,
                    mode: "insensitive"
                  }
                }
              ])
            }
          ]
        }
      : {
          OR: this.buildScopeWhere(input.scopeClauses)
        };

    return this.prismaService.ragChunk.findMany({
      where,
      take: input.limit,
      orderBy: { createdAt: "desc" },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            summary: true,
            sourceType: true,
            sourceUri: true,
            publishedAt: true,
            status: true
          }
        },
        knowledgeBase: {
          select: {
            id: true,
            code: true,
            name: true,
            knowledgeType: true,
            visibility: true
          }
        }
      }
    });
  }

  private buildScopeWhere(scopeClauses: ScopeClause[]) {
    return scopeClauses.map((scope) => ({
      visibility: scope.visibility,
      ...(scope.ownerUserId ? { ownerUserId: scope.ownerUserId } : {}),
      ...(scope.institutionId ? { institutionId: scope.institutionId } : {})
    }));
  }

  private scoreCandidate(
    candidate: ChunkCandidate,
    normalizedQuery: string,
    tokens: string[],
    queryVector: number[] | null
  ) {
    const matchedTerms = this.collectMatchedTerms(candidate, normalizedQuery, tokens);
    const lexicalScore = this.scoreLexical(candidate, normalizedQuery, tokens);
    const semanticScore = queryVector
      ? this.cosineSimilarity(queryVector, this.readVector(candidate.embedding))
      : 0;
    const score = Number((lexicalScore + semanticScore * 3).toFixed(4));
    const excerpt = this.buildExcerpt(candidate.content, normalizedQuery, matchedTerms);

    const hit: RagSearchHit = {
      score,
      excerpt,
      matchedTerms,
      document: {
        id: candidate.document.id,
        title: candidate.document.title,
        summary: candidate.document.summary,
        sourceType: candidate.document.sourceType,
        sourceUri: candidate.document.sourceUri,
        publishedAt: candidate.document.publishedAt?.toISOString() ?? null
      },
      knowledgeBase: {
        code: candidate.knowledgeBase.code,
        name: candidate.knowledgeBase.name,
        knowledgeType: candidate.knowledgeBase.knowledgeType,
        visibility: candidate.knowledgeBase.visibility
      },
      citation: {
        knowledgeBaseCode: candidate.knowledgeBase.code,
        knowledgeType: candidate.knowledgeBase.knowledgeType,
        visibility: candidate.visibility,
        documentId: candidate.document.id,
        chunkId: candidate.id,
        title: candidate.document.title,
        sourceType: candidate.document.sourceType,
        sourceUri: candidate.document.sourceUri,
        chunkIndex: candidate.chunkIndex,
        ownerUserId: candidate.ownerUserId,
        institutionId: candidate.institutionId
      }
    };

    return {
      score,
      hit
    };
  }

  private collectMatchedTerms(
    candidate: ChunkCandidate,
    normalizedQuery: string,
    tokens: string[]
  ) {
    const haystacks = [
      candidate.title ?? "",
      candidate.content,
      ...this.asStringArray(candidate.keywords),
      ...this.asStringArray(candidate.headings)
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

  private scoreLexical(
    candidate: ChunkCandidate,
    normalizedQuery: string,
    tokens: string[]
  ) {
    const title = (candidate.title ?? "").toLowerCase();
    const content = candidate.content.toLowerCase();
    const keywords = this.asStringArray(candidate.keywords).map((item) => item.toLowerCase());
    const headings = this.asStringArray(candidate.headings).map((item) => item.toLowerCase());
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

  private buildExcerpt(content: string, normalizedQuery: string, matchedTerms: string[]) {
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

  private readVector(value: Prisma.JsonValue | null) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => (typeof item === "number" ? item : Number(item)))
      .filter((item) => Number.isFinite(item));
  }

  private cosineSimilarity(left: number[], right: number[]) {
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

  private normalizeKnowledgeTypes(value: RagKnowledgeType[] | undefined) {
    return value?.length ? Array.from(new Set(value)) : null;
  }

  private normalizeVisibilityScopes(value: RagVisibilityScope[] | undefined) {
    return value?.length ? Array.from(new Set(value)) : null;
  }

  private normalizeQuery(value: string) {
    const normalized = value.trim().replace(/\s+/g, " ");

    if (normalized.length < 2) {
      throw new BadRequestException("Search query must contain at least 2 characters");
    }

    return normalized;
  }

  private tokenizeQuery(query: string) {
    const tokens = query.match(/[A-Za-z0-9]+|[\u4e00-\u9fa5]{1,4}/g) ?? [];
    return Array.from(
      new Set(
        tokens
          .map((item) => item.trim().toLowerCase())
          .filter((item) => item.length >= 2)
      )
    ).slice(0, 8);
  }

  private getCandidateLimit(limit: number) {
    return Math.min(Math.max(limit * 12, 40), 120);
  }

  private asStringArray(value: Prisma.JsonValue | null) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === "string");
  }

  private async resolveTargetUserId(currentUser: AuthenticatedUser, elderId?: string) {
    if (!elderId) {
      if (currentUser.type === UserType.ELDER) {
        return currentUser.id;
      }

      const binding = await this.prismaService.familyBinding.findFirst({
        where: { familyMemberId: currentUser.id },
        orderBy: { createdAt: "asc" }
      });

      return binding?.elderMemberId ?? currentUser.id;
    }

    if (elderId === currentUser.id) {
      return elderId;
    }

    if (this.isPrivilegedUserType(currentUser.type)) {
      return elderId;
    }

    const binding = await this.prismaService.familyBinding.findFirst({
      where: {
        familyMemberId: currentUser.id,
        elderMemberId: elderId
      }
    });

    if (!binding) {
      throw new ForbiddenException("No permission to access elder knowledge");
    }

    return elderId;
  }

  private async resolveAuthorizedTargetUserId(
    actor: {
      id: string;
      type: UserType;
    },
    targetUserId: string
  ) {
    if (targetUserId === actor.id || this.isPrivilegedUserType(actor.type)) {
      return targetUserId;
    }

    const binding = await this.prismaService.familyBinding.findFirst({
      where: {
        familyMemberId: actor.id,
        elderMemberId: targetUserId
      }
    });

    return binding ? targetUserId : null;
  }

  private isPrivilegedUserType(userType: UserType) {
    return ([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
      userType
    );
  }
}
