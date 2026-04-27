import assert from "node:assert/strict";
import test from "node:test";
import { ServiceCategory } from "@prisma/client";
import { AgentOrchestratorService } from "../../src/modules/agents/application/agent-orchestrator.service";

function createService() {
  return new AgentOrchestratorService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never
  );
}

test("assistant fallback replies to greetings with a natural helper message", () => {
  const service = createService();
  const result = (service as any).buildAssistantConversationFallback({
    sessionId: "conversation_001",
    userMessage: "你好",
    pageContext: {
      pageId: "home/assistant-chat",
      route: "/home/assistant-chat"
    },
    contextSnapshot: {
      ownerUserId: "user_001",
      targetUserId: "user_001",
      authorizedScope: ["self"]
    },
    domainInsights: []
  });

  assert.match(result.assistantReply, /你好，我在/);
  assert.doesNotMatch(result.assistantReply, /已收到你的问题/);
  assert.match(result.followUpQuestion, /报告解读|健康摘要|服务推荐/);
});

test("assistant fallback uses current report context when available", () => {
  const service = createService();
  const result = (service as any).buildAssistantConversationFallback({
    sessionId: "conversation_002",
    userMessage: "你好",
    pageContext: {
      pageId: "orders/checkup-ai-analysis",
      route: "/orders/checkup-ai-analysis"
    },
    contextSnapshot: {
      ownerUserId: "user_001",
      targetUserId: "user_001",
      authorizedScope: ["self"],
      latestReportId: "report_001",
      latestReportTitle: "慢病随访体检报告",
      preferredServiceCategory: ServiceCategory.HOME_EXAM
    },
    domainInsights: []
  });

  assert.match(result.assistantReply, /慢病随访体检报告/);
  assert.match(result.followUpQuestion, /帮我解读这份报告/);
  assert.doesNotMatch(result.assistantReply, /已收到你的问题/);
});

test("assistant fallback introduces itself as 豆沙包", () => {
  const service = createService();
  const result = (service as any).buildAssistantConversationFallback({
    sessionId: "conversation_003",
    userMessage: "你叫什么",
    pageContext: {
      pageId: "home/assistant-chat",
      route: "/home/assistant-chat"
    },
    contextSnapshot: {
      ownerUserId: "user_001",
      targetUserId: "user_001",
      authorizedScope: ["self"]
    },
    domainInsights: []
  });

  assert.match(result.assistantReply, /豆沙包/);
  assert.doesNotMatch(result.assistantReply, /已收到你的问题/);
});

test("assistant fallback tells an actual joke for joke requests", () => {
  const service = createService();
  const result = (service as any).buildAssistantConversationFallback({
    sessionId: "conversation_004",
    userMessage: "给我讲个笑话",
    pageContext: {
      pageId: "home/assistant-chat",
      route: "/home/assistant-chat"
    },
    contextSnapshot: {
      ownerUserId: "user_001",
      targetUserId: "user_001",
      authorizedScope: ["self"]
    },
    domainInsights: []
  });

  assert.match(result.assistantReply, /笑话|段子|闹钟|体重秤|血压计/);
  assert.doesNotMatch(result.assistantReply, /已收到你的问题/);
});

test("assistant fallback explains when a voice message has no transcript", () => {
  const service = createService();
  const result = (service as any).buildAssistantConversationFallback({
    sessionId: "conversation_005",
    userMessage: "用户发来一条未转写的语音，请明确说明当前环境暂时无法直接理解纯音频内容，并请用户重试语音或补充文字。",
    pageContext: {
      pageId: "home/assistant-chat",
      route: "/home/assistant-chat"
    },
    contextSnapshot: {
      ownerUserId: "user_001",
      targetUserId: "user_001",
      authorizedScope: ["self"]
    },
    domainInsights: []
  });

  assert.match(result.assistantReply, /语音|转写|打字|再说一遍/);
  assert.doesNotMatch(result.assistantReply, /已收到你的问题/);
});

test("assistant fallback answers common knowledge questions directly without repeating report context", () => {
  const service = createService();
  const result = (service as any).buildAssistantConversationFallback({
    sessionId: "conversation_006",
    userMessage: "HPV2价、4价、9价有什么区别？",
    pageContext: {
      pageId: "home/assistant-chat",
      route: "/home/assistant-chat"
    },
    contextSnapshot: {
      ownerUserId: "user_001",
      targetUserId: "user_001",
      authorizedScope: ["self"],
      latestReportId: "report_001",
      latestReportTitle: "血压血糖月度随访体检报告"
    },
    domainInsights: []
  });

  assert.match(result.assistantReply, /16|18|6|11|31|33|45|52|58/);
  assert.doesNotMatch(result.assistantReply, /血压血糖月度随访体检报告/);
});

test("assistant workflow does not auto-trigger report interpretation for unrelated questions", () => {
  const service = createService();
  const requests = (service as any).buildAssistantWorkflowRequests({
    sessionId: "conversation_007",
    userMessage: "HPV2价、4价、9价有什么区别？",
    pageContext: {
      pageId: "orders/checkup-ai-analysis",
      route: "/orders/checkup-ai-analysis"
    },
    contextSnapshot: {
      ownerUserId: "user_001",
      targetUserId: "user_001",
      authorizedScope: ["self"],
      latestReportId: "report_001",
      latestReportTitle: "慢病随访体检报告"
    },
    domainInsights: []
  });

  assert.equal(requests.length, 0);
});

test("assistant workflow keeps general health knowledge questions on the direct-answer path", () => {
  const service = createService();
  const requests = (service as any).buildAssistantWorkflowRequests({
    sessionId: "conversation_008",
    userMessage: "高血压一般应该怎么预防？",
    pageContext: {
      pageId: "health/metrics",
      route: "/health/metrics"
    },
    contextSnapshot: {
      ownerUserId: "user_001",
      targetUserId: "user_001",
      authorizedScope: ["self"],
      latestReportId: "report_001",
      latestReportTitle: "慢病随访体检报告"
    },
    domainInsights: []
  });

  assert.equal(requests.length, 0);
});

test("assistant workflow does not auto-trigger service recommendation for generic care knowledge questions", () => {
  const service = createService();
  const requests = (service as any).buildAssistantWorkflowRequests({
    sessionId: "conversation_009",
    userMessage: "养老护理和康复护理有什么区别？",
    pageContext: {
      pageId: "service/home-care-recommend",
      route: "/service/home-care-recommend"
    },
    contextSnapshot: {
      ownerUserId: "user_001",
      targetUserId: "user_001",
      authorizedScope: ["self"],
      preferredServiceCategory: ServiceCategory.HOME_CARE
    },
    domainInsights: []
  });

  assert.equal(requests.length, 0);
});
