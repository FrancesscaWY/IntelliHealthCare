import { Injectable } from "@nestjs/common";
import { RagKnowledgeType } from "@prisma/client";
import {
  type AgentRagSearchInput,
  RagKnowledgeService
} from "../application/rag-knowledge.service";

interface SearchKnowledgeInput extends AgentRagSearchInput {
  knowledgeTypes?: RagKnowledgeType[];
}

@Injectable()
export class RagRetrievalTool {
  constructor(private readonly ragKnowledgeService: RagKnowledgeService) {}

  searchKnowledge(input: SearchKnowledgeInput) {
    return this.ragKnowledgeService.searchForAgent(input);
  }
}
