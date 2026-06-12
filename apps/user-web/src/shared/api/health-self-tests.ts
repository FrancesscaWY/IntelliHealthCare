import { request } from '@/shared/api/client'

export type SelfTestAssessmentLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface SelfTestProjectSummary {
  testId: string
  code: string
  title: string
  category: string
  intro: string
  accentColor: string
  measuredCount: number
}

export interface SelfTestQuestionOption {
  label: string
  score: number
}

export interface SelfTestQuestionDetail {
  questionId: string
  sortOrder: number
  text: string
  helper: string | null
  options: SelfTestQuestionOption[]
}

export interface SelfTestAttemptSummary {
  attemptId: string
  totalScore: number
  level: SelfTestAssessmentLevel
  summary: string
  completedAt: string
}

export interface SelfTestResultAdvice {
  low?: string
  medium?: string
  high?: string
  [key: string]: unknown
}

export interface SelfTestDetailResponse extends SelfTestProjectSummary {
  resultAdvice: SelfTestResultAdvice | null
  questions: SelfTestQuestionDetail[]
  latestAttempt: SelfTestAttemptSummary | null
}

export interface SubmitSelfTestPayload {
  elderId?: string
  answers: Array<{
    questionId: string
    optionIndex?: number
    score?: number
  }>
}

export interface SubmitSelfTestResponse extends SelfTestAttemptSummary {
  testId: string
}

export interface SelfTestHistoryItem extends SelfTestAttemptSummary {
  testId: string
  title: string
  category: string
}

export interface SelfTestHistoryResponse {
  list: SelfTestHistoryItem[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export function getSelfTests() {
  return request<SelfTestProjectSummary[]>('/app/health/self-tests', {
    auth: true,
  })
}

export function getSelfTestDetail(testId: string, params?: { elderId?: string }) {
  const search = new URLSearchParams()

  if (params?.elderId) {
    search.set('elderId', params.elderId)
  }

  const suffix = search.size > 0 ? `?${search.toString()}` : ''
  return request<SelfTestDetailResponse>(`/app/health/self-tests/${testId}${suffix}`, {
    auth: true,
  })
}

export function submitSelfTest(testId: string, payload: SubmitSelfTestPayload) {
  return request<SubmitSelfTestResponse>(`/app/health/self-tests/${testId}/submit`, {
    method: 'POST',
    auth: true,
    body: payload,
  })
}

export function getSelfTestHistory(params?: { elderId?: string; page?: number; pageSize?: number }) {
  const search = new URLSearchParams()

  if (params?.elderId) {
    search.set('elderId', params.elderId)
  }

  search.set('page', String(params?.page ?? 1))
  search.set('pageSize', String(params?.pageSize ?? 20))

  return request<SelfTestHistoryResponse>(`/app/health/self-tests/history?${search.toString()}`, {
    auth: true,
  })
}
