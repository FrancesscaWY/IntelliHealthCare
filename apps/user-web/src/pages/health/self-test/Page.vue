<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PageComponentProps } from '@ihc/page-core/types'
import mock from './mock'
import type { SelfTestProject } from './mock'

const props = defineProps<PageComponentProps>()

const activeTab = ref<'tests' | 'records'>('tests')
const phase = ref<'list' | 'quiz' | 'result'>('list')
const selectedProject = ref<SelfTestProject | null>(null)
const currentIndex = ref(0)
const answers = ref<number[]>([])

const currentQuestion = computed(() => selectedProject.value?.questions[currentIndex.value])
const progressPercent = computed(() => {
  if (!selectedProject.value) {
    return 0
  }

  return Math.round(((currentIndex.value + 1) / selectedProject.value.questions.length) * 100)
})

const totalScore = computed(() => answers.value.reduce((sum, score) => sum + score, 0))
const maxScore = computed(() => (selectedProject.value?.questions.length || 1) * 3)
const riskPercent = computed(() => Math.round((totalScore.value / maxScore.value) * 100))
const riskLevel = computed<'low' | 'medium' | 'high'>(() => {
  if (riskPercent.value >= 68) {
    return 'high'
  }

  if (riskPercent.value >= 36) {
    return 'medium'
  }

  return 'low'
})

const riskText = computed(() => {
  const map = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  }

  return map[riskLevel.value]
})

const riskClass = computed(() => `risk-${riskLevel.value}`)
const resultAdvice = computed(() => selectedProject.value?.resultAdvice[riskLevel.value] || '')

function goBack() {
  if (phase.value === 'result') {
    phase.value = 'list'
    return
  }

  if (phase.value === 'quiz') {
    if (currentIndex.value > 0) {
      currentIndex.value -= 1
      return
    }
    phase.value = 'list'
    return
  }

  if (!props.navigation.navigateBack()) {
    props.navigation.reLaunch('home/dashboard')
  }
}

function startTest(project: SelfTestProject) {
  selectedProject.value = project
  currentIndex.value = 0
  answers.value = []
  phase.value = 'quiz'
}

function selectOption(score: number) {
  answers.value[currentIndex.value] = score
}

function nextQuestion() {
  if (answers.value[currentIndex.value] === undefined) {
    props.showToast('请先选择一个答案')
    return
  }

  if (!selectedProject.value) {
    return
  }

  if (currentIndex.value < selectedProject.value.questions.length - 1) {
    currentIndex.value += 1
    return
  }

  phase.value = 'result'
}

function resetTest() {
  if (selectedProject.value) {
    startTest(selectedProject.value)
  }
}
</script>

<template>
  <section class="self-test-page">
    <header class="page-header">
      <button class="back-button" type="button" aria-label="返回" @click="goBack">‹</button>
      <h1>{{ phase === 'list' ? '健康自测' : selectedProject?.title }}</h1>
      <span></span>
    </header>

    <template v-if="phase === 'list'">
      <nav class="top-tabs" aria-label="健康自测栏目">
        <button
          v-for="tab in mock.tabs"
          :key="tab.key"
          type="button"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key as 'tests' | 'records'"
        >
          {{ tab.label }}
        </button>
      </nav>

      <main class="test-scroll">
        <section v-if="activeTab === 'tests'" class="project-list">
          <article v-for="project in mock.projects" :key="project.id" class="project-card" @click="startTest(project)">
            <div class="project-icon" :style="{ '--accent': project.accent }">
              <span></span>
              <i></i>
            </div>
            <div class="project-copy">
              <small>{{ project.category }}</small>
              <h2>{{ project.title }}</h2>
              <p>{{ project.intro }}</p>
              <em>{{ project.measuredCount }}人 已测评</em>
            </div>
          </article>
        </section>

        <section v-else class="record-list">
          <article v-for="project in mock.projects.slice(0, 3)" :key="project.id" class="record-card">
            <div>
              <strong>{{ project.title }}</strong>
              <span>上次测评：{{ project.id === 'stroke' ? '中风险' : '低风险' }}</span>
            </div>
            <button type="button" @click="startTest(project)">重新测评</button>
          </article>
        </section>
      </main>
    </template>

    <main v-else-if="phase === 'quiz' && currentQuestion && selectedProject" class="quiz-panel">
      <div class="quiz-meta">
        <span>第 {{ currentIndex + 1 }} / {{ selectedProject.questions.length }} 题</span>
        <strong>{{ progressPercent }}%</strong>
      </div>
      <div class="progress-bar">
        <i :style="{ width: `${progressPercent}%` }"></i>
      </div>

      <section class="question-card">
        <small>{{ selectedProject.category }}</small>
        <h2>{{ currentQuestion.text }}</h2>
        <p>{{ currentQuestion.helper }}</p>
      </section>

      <section class="option-list">
        <button
          v-for="option in currentQuestion.options"
          :key="option.label"
          type="button"
          :class="{ selected: answers[currentIndex] === option.score }"
          @click="selectOption(option.score)"
        >
          <span>{{ option.label }}</span>
          <i></i>
        </button>
      </section>

      <button class="next-button" type="button" @click="nextQuestion">
        {{ currentIndex === selectedProject.questions.length - 1 ? '提交测评' : '下一题' }}
      </button>
    </main>

    <main v-else-if="phase === 'result' && selectedProject" class="result-panel">
      <section class="result-card" :class="riskClass">
        <span class="result-label">测评结果</span>
        <h2>{{ selectedProject.title }}</h2>
        <div class="risk-ring">
          <strong>{{ riskText }}</strong>
          <span>{{ riskPercent }}%</span>
        </div>
        <p>{{ resultAdvice }}</p>
      </section>

      <section class="risk-scale">
        <div>
          <span>低风险</span>
          <i></i>
        </div>
        <div>
          <span>中风险</span>
          <i></i>
        </div>
        <div>
          <span>高风险</span>
          <i></i>
        </div>
      </section>

      <div class="result-actions">
        <button type="button" @click="resetTest">重新测试</button>
        <button type="button" class="primary" @click="phase = 'list'">返回项目</button>
      </div>
    </main>
  </section>
</template>

<style scoped>
.self-test-page {
  position: relative;
  left: 50%;
  width: min(402px, 100vw);
  height: min(874px, calc(100vh - 36px));
  min-height: min(874px, calc(100vh - 36px));
  max-height: 874px;
  margin: -18px 0;
  padding: 16px 18px 28px;
  box-sizing: border-box;
  transform: translateX(-50%);
  overflow: hidden;
  background: #f5f6f7;
  color: #252939;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.page-header {
  height: 52px;
  display: grid;
  grid-template-columns: 34px 1fr 34px;
  align-items: center;
}

.back-button {
  width: 32px;
  height: 38px;
  padding: 0;
  color: #34383f;
  font-size: 38px;
  font-weight: 300;
  line-height: 30px;
}

.page-header h1 {
  margin: 0;
  overflow: hidden;
  color: #34383f;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
  padding: 6px;
  margin: 8px 0 18px;
  border-radius: 14px;
  background: #eef0f2;
}

.top-tabs button {
  height: 42px;
  border-radius: 11px;
  color: #9b9fa7;
  font-size: 15px;
  font-weight: 900;
}

.top-tabs button.active {
  background: #fff;
  color: #6872f0;
  box-shadow: 0 8px 18px rgba(31, 40, 58, 0.04);
}

.test-scroll {
  height: calc(100% - 132px);
  overflow-y: auto;
  scrollbar-width: none;
}

.test-scroll::-webkit-scrollbar {
  display: none;
}

.project-list {
  display: grid;
  gap: 14px;
  padding-bottom: 12px;
}

.project-card {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 14px;
  align-items: center;
  padding: 18px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 10px 28px rgba(31, 40, 58, 0.045);
}

.project-icon {
  width: 78px;
  height: 78px;
  position: relative;
  display: grid;
  place-items: center;
  border-radius: 22px;
  background: color-mix(in srgb, var(--accent) 20%, white);
  color: var(--accent);
}

.project-icon span {
  width: 42px;
  height: 50px;
  border-radius: 5px;
  background: currentColor;
  opacity: 0.78;
}

.project-icon span::before,
.project-icon span::after {
  content: '';
  position: absolute;
  background: #fff;
  opacity: 0.85;
}

.project-icon span::before {
  top: 25px;
  left: 35px;
  width: 16px;
  height: 24px;
}

.project-icon span::after {
  right: 20px;
  bottom: 18px;
  width: 9px;
  height: 9px;
}

.project-icon i {
  position: absolute;
  right: 13px;
  bottom: 14px;
  width: 17px;
  height: 50px;
  border-radius: 5px;
  background: currentColor;
  opacity: 0.58;
  transform: rotate(-10deg);
}

.project-copy {
  min-width: 0;
}

.project-copy small {
  color: #6872f0;
  font-size: 12px;
  font-weight: 900;
}

.project-copy h2 {
  margin: 4px 0 8px;
  color: #34383f;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.35;
}

.project-copy p {
  display: -webkit-box;
  margin: 0 0 10px;
  overflow: hidden;
  color: #9499a2;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.project-copy em {
  display: inline-flex;
  padding: 5px 12px;
  border-radius: 999px;
  background: #f1f2ff;
  color: #6872f0;
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
}

.record-list {
  display: grid;
  gap: 12px;
}

.record-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-radius: 16px;
  background: #fff;
}

.record-card strong {
  display: block;
  margin-bottom: 6px;
  color: #34383f;
  font-size: 15px;
  font-weight: 900;
}

.record-card span {
  color: #9a9fa8;
  font-size: 12px;
  font-weight: 800;
}

.record-card button {
  height: 34px;
  padding: 0 14px;
  border-radius: 12px;
  background: #6872f0;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
}

.quiz-panel,
.result-panel {
  height: calc(100% - 52px);
  display: flex;
  flex-direction: column;
}

.quiz-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 14px 0 8px;
  color: #8f949d;
  font-size: 13px;
  font-weight: 900;
}

.quiz-meta strong {
  color: #6872f0;
}

.progress-bar {
  height: 8px;
  border-radius: 999px;
  background: #e7e9ef;
  overflow: hidden;
}

.progress-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #6872f0 0%, #ed6d88 100%);
}

.question-card {
  padding: 22px;
  margin: 20px 0 18px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(31, 40, 58, 0.05);
}

.question-card small {
  color: #6872f0;
  font-size: 13px;
  font-weight: 900;
}

.question-card h2 {
  margin: 10px 0 12px;
  color: #252939;
  font-size: 21px;
  font-weight: 900;
  line-height: 1.45;
}

.question-card p {
  margin: 0;
  color: #9499a2;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.55;
}

.option-list {
  display: grid;
  gap: 12px;
}

.option-list button {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border: 2px solid transparent;
  border-radius: 16px;
  background: #fff;
  color: #34383f;
  font-size: 15px;
  font-weight: 900;
  box-shadow: 0 8px 24px rgba(31, 40, 58, 0.04);
}

.option-list button.selected {
  border-color: #6872f0;
  background: #f3f4ff;
  color: #6872f0;
}

.option-list i {
  width: 18px;
  height: 18px;
  border: 2px solid #d2d5dc;
  border-radius: 50%;
  box-sizing: border-box;
}

.option-list button.selected i {
  border: 6px solid #6872f0;
}

.next-button {
  height: 50px;
  margin-top: auto;
  border-radius: 16px;
  background: #6872f0;
  color: #fff;
  font-size: 16px;
  font-weight: 900;
  box-shadow: 0 14px 28px rgba(104, 114, 240, 0.2);
}

.result-panel {
  justify-content: center;
  gap: 16px;
}

.result-card {
  padding: 24px;
  border-radius: 24px;
  background: #fff;
  text-align: center;
  box-shadow: 0 14px 34px rgba(31, 40, 58, 0.06);
}

.result-label {
  color: #8f949d;
  font-size: 13px;
  font-weight: 900;
}

.result-card h2 {
  margin: 10px 0 20px;
  color: #252939;
  font-size: 20px;
  font-weight: 900;
  line-height: 1.4;
}

.risk-ring {
  width: 148px;
  height: 148px;
  display: grid;
  place-content: center;
  gap: 6px;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: conic-gradient(#6872f0 calc(var(--risk, 50) * 1%), #eceef3 0);
}

.risk-ring strong,
.risk-ring span {
  position: relative;
  z-index: 1;
}

.risk-ring::before {
  content: '';
  position: absolute;
}

.risk-ring strong {
  color: #fff;
  font-size: 22px;
  font-weight: 900;
}

.risk-ring span {
  color: rgba(255, 255, 255, 0.88);
  font-size: 13px;
  font-weight: 900;
}

.result-card p {
  margin: 0;
  color: #6e737c;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.65;
}

.result-card.risk-low .risk-ring {
  background: linear-gradient(135deg, #4fd3aa 0%, #72e6c7 100%);
}

.result-card.risk-medium .risk-ring {
  background: linear-gradient(135deg, #f2bd3e 0%, #ffd772 100%);
}

.result-card.risk-high .risk-ring {
  background: linear-gradient(135deg, #ff647b 0%, #ef4c62 100%);
}

.risk-scale {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.risk-scale div {
  padding: 12px;
  border-radius: 16px;
  background: #fff;
}

.risk-scale span {
  color: #6e737c;
  font-size: 12px;
  font-weight: 900;
}

.risk-scale i {
  display: block;
  height: 8px;
  margin-top: 9px;
  border-radius: 999px;
}

.risk-scale div:nth-child(1) i {
  background: #4fd3aa;
}

.risk-scale div:nth-child(2) i {
  background: #f2bd3e;
}

.risk-scale div:nth-child(3) i {
  background: #ff647b;
}

.result-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.result-actions button {
  height: 48px;
  border-radius: 16px;
  background: #fff;
  color: #6872f0;
  font-size: 15px;
  font-weight: 900;
}

.result-actions .primary {
  background: #6872f0;
  color: #fff;
}
</style>
