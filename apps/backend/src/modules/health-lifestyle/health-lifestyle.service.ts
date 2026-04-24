import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  AssessmentLevel,
  DietMealType,
  UserType
} from "@prisma/client";
import type { AuthenticatedUser } from "../../common/auth/auth.types";
import {
  ensureArray,
  ensureRecord,
  getAge,
  paginate,
  toDateString,
  toDateTimeString,
  toPrismaJson
} from "../../common/utils/serializers";
import { PrismaService } from "../../infra/prisma/prisma.service";

const DIET_PLAN_TITLE = "健康膳食";
const DIET_PLAN_SEARCH_PLACEHOLDER = "搜索食材、菜谱或营养建议";
const DIET_RECORD_TITLE = "饮食记录";
const DIET_RECORD_DATE_SHEET_TITLE = "选择日期";
const DEFAULT_DIET_SUBTITLE = "少油少盐，多蔬果，蛋白质足量";

const DIET_MEAL_ORDER: DietMealType[] = [
  DietMealType.BREAKFAST,
  DietMealType.LUNCH,
  DietMealType.SNACK,
  DietMealType.DINNER
];

const DIET_MEAL_META = {
  [DietMealType.BREAKFAST]: {
    key: "breakfast",
    label: "早餐",
    desc: "清淡高纤",
    highlight: "晨间暖胃更轻盈"
  },
  [DietMealType.LUNCH]: {
    key: "lunch",
    label: "午餐",
    desc: "营养均衡",
    highlight: "补充蛋白和主菜"
  },
  [DietMealType.SNACK]: {
    key: "snack",
    label: "加餐",
    desc: "少糖补能",
    highlight: "少量补能不怕饿"
  },
  [DietMealType.DINNER]: {
    key: "dinner",
    label: "晚餐",
    desc: "低脂易消化",
    highlight: "晚间少负担更安心"
  }
} as const;

const DIET_MACRO_META = [
  { key: "carb", label: "碳水", color: "#f36f66" },
  { key: "protein", label: "蛋白质", color: "#f5c957" },
  { key: "fat", label: "脂肪", color: "#43c9a4" }
] as const;

type DietMealKey = (typeof DIET_MEAL_META)[DietMealType]["key"];
type DietFoodThumb = "bread" | "milk" | "oat" | "egg" | "fish" | "salad" | "fruit" | "porridge";

interface FrontendDietIngredient {
  name: string;
  amount: string;
}

interface FrontendDietMeal {
  key: DietMealKey;
  label: string;
  totalCalories: number;
  eatenAt?: string;
  foods: Array<{
    id: string;
    name: string;
    amount: string;
    caloriesLabel: string;
    thumb: DietFoodThumb;
  }>;
}

interface FrontendDietDay {
  id: string;
  titleDate: string;
  sheetLabel: string;
  totalCalories: number;
  macros: Array<{
    key: string;
    label: string;
    value: string;
    color: string;
  }>;
  meals: FrontendDietMeal[];
}

@Injectable()
export class AppHealthLifestyleService {
  constructor(private readonly prismaService: PrismaService) {}

  async getDietPlan(currentUser: AuthenticatedUser, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const [user, archive, recipes, records] = await Promise.all([
      this.prismaService.user.findUnique({
        where: { id: targetUserId }
      }),
      this.prismaService.healthArchive.findUnique({
        where: { userId: targetUserId },
        select: { baseProfile: true }
      }),
      this.prismaService.dietRecipe.findMany({
        orderBy: [{ mealType: "asc" }, { createdAt: "desc" }]
      }),
      this.prismaService.dietRecord.findMany({
        where: { userId: targetUserId },
        orderBy: { eatenAt: "desc" },
        include: {
          recipe: {
            select: {
              id: true,
              title: true
            }
          }
        }
      })
    ]);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const baseProfile = ensureRecord(archive?.baseProfile);
    const profile = {
      userId: user.id,
      name: user.realName ?? user.nickname ?? user.phone,
      age: getAge(user.birthday),
      dietPreference: baseProfile.dietPreference ?? "清淡均衡",
      allergyNotes: ensureArray<string>(baseProfile.foodAllergies)
    };

    const today = toDateString(new Date()) ?? new Date().toISOString().slice(0, 10);
    const days = this.buildFrontendDietDays(records);
    const todayDay = days.find((item) => item.id === today);
    const displayDay = todayDay ?? days[0] ?? this.createFrontendDietDay(today);
    const totalCaloriesToday = todayDay?.totalCalories ?? 0;
    const subtitleParts = [
      String(baseProfile.dietPreference ?? DEFAULT_DIET_SUBTITLE),
      ensureArray<string>(baseProfile.foodAllergies)
        .filter((item) => item.trim().length > 0)
        .slice(0, 2)
        .map((item) => `避开${item}`)
        .join("、")
    ].filter(Boolean);

    return {
      title: DIET_PLAN_TITLE,
      searchPlaceholder: DIET_PLAN_SEARCH_PLACEHOLDER,
      overview: {
        title: "今日均衡饮食",
        subtitle: subtitleParts.join("，") || DEFAULT_DIET_SUBTITLE,
        calories: String(displayDay.totalCalories),
        protein: this.findMacroValue(displayDay.macros, "protein"),
        fiber: this.estimateFiberLabel(records, displayDay)
      },
      mealTabs: DIET_MEAL_ORDER.map((mealType) => {
        const meta = DIET_MEAL_META[mealType];
        return {
          key: meta.key,
          label: meta.label,
          desc: meta.desc,
          highlight: meta.highlight
        };
      }),
      recipes: recipes.map((item) => this.toFrontendDietRecipe(item)),
      profile,
      recipeCount: recipes.length,
      totalCaloriesToday,
      latestMeals: records.slice(0, 4).map((item) => ({
        recordId: item.id,
        mealType: item.mealType,
        recipeTitle: item.recipe?.title ?? null,
        totalCalories: item.totalCalories,
        eatenAt: toDateTimeString(item.eatenAt)
      }))
    };
  }

  async listDietRecipes(
    page: number,
    pageSize: number,
    mealType?: "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER"
  ) {
    const recipes = await this.prismaService.dietRecipe.findMany({
      where: {
        mealType: mealType ? (mealType as DietMealType) : undefined
      },
      orderBy: [{ mealType: "asc" }, { createdAt: "desc" }]
    });

    return paginate(
      recipes.map((item) => ({
        recipeId: item.id,
        code: item.code,
        title: item.title,
        summary: item.summary,
        mealType: item.mealType,
        calories: item.calories,
        tags: item.tags,
        coverUrl: item.coverUrl,
        suitableFor: item.suitableFor
      })),
      page,
      pageSize
    );
  }

  async getDietRecipeDetail(recipeId: string) {
    const recipe = await this.prismaService.dietRecipe.findUnique({
      where: { id: recipeId }
    });

    if (!recipe) {
      throw new NotFoundException("Recipe not found");
    }

    const frontendRecipe = this.toFrontendDietRecipe(recipe);

    return {
      id: recipe.id,
      recipeId: recipe.id,
      code: recipe.code,
      title: recipe.title,
      summary: recipe.summary,
      mealType: recipe.mealType,
      calories: recipe.calories,
      tags: ensureArray<string>(recipe.tags),
      ingredients: frontendRecipe.ingredients,
      steps: frontendRecipe.steps,
      coverUrl: recipe.coverUrl,
      suitableFor: ensureArray<string>(recipe.suitableFor),
      subtitle: frontendRecipe.subtitle,
      publishDate: frontendRecipe.publishDate,
      mealKeys: frontendRecipe.mealKeys,
      energy: frontendRecipe.energy,
      time: frontendRecipe.time,
      imageUrl: frontendRecipe.imageUrl
    };
  }

  async getDietRecords(currentUser: AuthenticatedUser, elderId?: string, date?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const records = await this.prismaService.dietRecord.findMany({
      where: { userId: targetUserId },
      include: { recipe: true },
      orderBy: { eatenAt: "asc" }
    });

    const fallbackDate = date ?? toDateString(new Date()) ?? new Date().toISOString().slice(0, 10);
    const days = this.buildFrontendDietDays(records);
    const filteredDays = date
      ? days.filter((item) => item.id === date)
      : days;
    const normalizedDays =
      filteredDays.length > 0 ? filteredDays : [this.createFrontendDietDay(fallbackDate)];
    const selectedDate = normalizedDays[0]?.id ?? fallbackDate;
    const filtered = records.filter((item) => toDateString(item.eatenAt) === selectedDate);
    const totalCalories = normalizedDays[0]?.totalCalories ?? 0;

    return {
      title: DIET_RECORD_TITLE,
      dateSheetTitle: DIET_RECORD_DATE_SHEET_TITLE,
      days: normalizedDays,
      date: selectedDate,
      totalCalories,
      list: filtered.map((item) => ({
        recordId: item.id,
        recipeId: item.recipeId,
        recipeTitle: item.recipe?.title ?? null,
        mealType: item.mealType,
        foods: item.foods,
        totalCalories: item.totalCalories,
        macros: item.macros,
        note: item.note,
        eatenAt: toDateTimeString(item.eatenAt)
      }))
    };
  }

  async createDietRecord(
    currentUser: AuthenticatedUser,
    payload: {
      elderId?: string;
      recipeId?: string;
      mealType: "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";
      foods: Array<Record<string, unknown>>;
      totalCalories: number;
      macros?: Record<string, unknown>;
      note?: string;
      eatenAt?: string;
    }
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, payload.elderId);
    if (payload.recipeId) {
      const recipe = await this.prismaService.dietRecipe.findUnique({
        where: { id: payload.recipeId },
        select: { id: true }
      });
      if (!recipe) {
        throw new NotFoundException("Recipe not found");
      }
    }

    const record = await this.prismaService.dietRecord.create({
      data: {
        userId: targetUserId,
        recipeId: payload.recipeId ?? null,
        mealType: payload.mealType as DietMealType,
        foods: toPrismaJson(payload.foods),
        totalCalories: payload.totalCalories,
        macros: toPrismaJson(payload.macros ?? {}),
        note: payload.note,
        eatenAt: payload.eatenAt ? new Date(payload.eatenAt) : new Date()
      }
    });

    return {
      recordId: record.id,
      createdAt: toDateTimeString(record.createdAt)
    };
  }

  async getDietRecordHistory(
    currentUser: AuthenticatedUser,
    page: number,
    pageSize: number,
    elderId?: string
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const records = await this.prismaService.dietRecord.findMany({
      where: { userId: targetUserId },
      orderBy: { eatenAt: "desc" }
    });
    const days = this.buildFrontendDietDays(records);
    const list = days.map((item) => ({
      date: item.id,
      totalCalories: item.totalCalories,
      mealCount: item.meals.filter((meal) => meal.foods.length > 0).length
    }));

    return {
      ...this.buildDietRecordHistoryPage(days),
      ...paginate(list, page, pageSize)
    };
  }

  async listSelfTests() {
    const projects = await this.prismaService.selfTestProject.findMany({
      where: { enabled: true },
      orderBy: { createdAt: "asc" }
    });

    return projects.map((item) => ({
      testId: item.id,
      code: item.code,
      title: item.title,
      category: item.category,
      intro: item.intro,
      accentColor: item.accentColor,
      measuredCount: item.measuredCount
    }));
  }

  async getSelfTestDetail(currentUser: AuthenticatedUser, testId: string, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const project = await this.prismaService.selfTestProject.findUnique({
      where: { id: testId },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });
    if (!project || !project.enabled) {
      throw new NotFoundException("Self test project not found");
    }

    const latestAttempt = await this.prismaService.selfTestAttempt.findFirst({
      where: {
        projectId: testId,
        userId: targetUserId
      },
      orderBy: { completedAt: "desc" }
    });

    return {
      testId: project.id,
      title: project.title,
      category: project.category,
      intro: project.intro,
      accentColor: project.accentColor,
      measuredCount: project.measuredCount,
      resultAdvice: project.resultAdvice,
      questions: project.questions.map((item) => ({
        questionId: item.id,
        sortOrder: item.sortOrder,
        text: item.text,
        helper: item.helper,
        options: item.options
      })),
      latestAttempt: latestAttempt
        ? {
            attemptId: latestAttempt.id,
            totalScore: latestAttempt.totalScore,
            level: latestAttempt.level,
            summary: latestAttempt.summary,
            completedAt: toDateTimeString(latestAttempt.completedAt)
          }
        : null
    };
  }

  async submitSelfTest(
    currentUser: AuthenticatedUser,
    testId: string,
    payload: {
      elderId?: string;
      answers: Array<{
        questionId: string;
        optionIndex?: number;
        score?: number;
      }>;
    }
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, payload.elderId);
    const project = await this.prismaService.selfTestProject.findUnique({
      where: { id: testId },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });

    if (!project || !project.enabled) {
      throw new NotFoundException("Self test project not found");
    }

    const scoreByQuestionId = new Map(
      payload.answers.map((item) => [item.questionId, item.score ?? 0])
    );

    let totalScore = 0;
    const normalizedAnswers = project.questions.map((question) => {
      const submitted = payload.answers.find((item) => item.questionId === question.id);
      let questionScore = scoreByQuestionId.get(question.id) ?? 0;
      if (submitted && submitted.optionIndex !== undefined) {
        const options = ensureArray<Record<string, unknown>>(question.options);
        questionScore = Number(options[submitted.optionIndex]?.score ?? questionScore);
      }

      if (!Number.isFinite(questionScore) || questionScore < 0) {
        questionScore = 0;
      }

      totalScore += questionScore;
      return {
        questionId: question.id,
        optionIndex: submitted?.optionIndex ?? null,
        score: questionScore
      };
    });

    const level = this.resolveAssessmentLevel(totalScore);
    const advice = ensureRecord(project.resultAdvice);
    const summary =
      level === AssessmentLevel.HIGH
        ? String(advice.high ?? "当前风险较高，建议尽快线下复查。")
        : level === AssessmentLevel.MEDIUM
          ? String(advice.medium ?? "当前风险中等，建议持续观察并优化生活方式。")
          : String(advice.low ?? "当前风险较低，请保持健康习惯。");

    const attempt = await this.prismaService.$transaction(async (tx) => {
      const created = await tx.selfTestAttempt.create({
        data: {
          projectId: testId,
          userId: targetUserId,
          totalScore,
          level,
          answers: toPrismaJson(normalizedAnswers),
          summary,
          completedAt: new Date()
        }
      });

      await tx.selfTestProject.update({
        where: { id: testId },
        data: {
          measuredCount: { increment: 1 }
        }
      });

      return created;
    });

    return {
      attemptId: attempt.id,
      testId: attempt.projectId,
      totalScore: attempt.totalScore,
      level: attempt.level,
      summary: attempt.summary,
      completedAt: toDateTimeString(attempt.completedAt)
    };
  }

  async getSelfTestHistory(
    currentUser: AuthenticatedUser,
    page: number,
    pageSize: number,
    elderId?: string
  ) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const attempts = await this.prismaService.selfTestAttempt.findMany({
      where: { userId: targetUserId },
      include: { project: true },
      orderBy: { completedAt: "desc" }
    });

    return paginate(
      attempts.map((item) => ({
        attemptId: item.id,
        testId: item.projectId,
        title: item.project.title,
        category: item.project.category,
        totalScore: item.totalScore,
        level: item.level,
        summary: item.summary,
        completedAt: toDateTimeString(item.completedAt)
      })),
      page,
      pageSize
    );
  }

  private resolveAssessmentLevel(score: number) {
    if (score >= 10) {
      return AssessmentLevel.HIGH;
    }
    if (score >= 6) {
      return AssessmentLevel.MEDIUM;
    }
    return AssessmentLevel.LOW;
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

    if (
      ([UserType.ADMIN, UserType.ORG_MANAGER, UserType.STAFF] as UserType[]).includes(
        currentUser.type
      )
    ) {
      return elderId;
    }

    const binding = await this.prismaService.familyBinding.findFirst({
      where: {
        familyMemberId: currentUser.id,
        elderMemberId: elderId
      }
    });

    if (!binding) {
      throw new ForbiddenException("No permission to access elder data");
    }

    return elderId;
  }

  private buildFrontendDietDays(
    records: Array<{
      id: string;
      recipeId: string | null;
      recipe?: { id: string; title: string } | null;
      mealType: DietMealType;
      foods: unknown;
      totalCalories: number;
      macros: unknown;
      note?: string | null;
      eatenAt: Date;
    }>
  ) {
    const dayMap = new Map<string, FrontendDietDay>();
    const sortedRecords = [...records].sort((left, right) => left.eatenAt.getTime() - right.eatenAt.getTime());

    for (const item of sortedRecords) {
      const dayId = toDateString(item.eatenAt) ?? "";
      if (!dayId) {
        continue;
      }

      const day = dayMap.get(dayId) ?? this.createFrontendDietDay(dayId);
      if (!dayMap.has(dayId)) {
        dayMap.set(dayId, day);
      }

      day.totalCalories += item.totalCalories;
      this.appendMacroValues(day, item.macros, item.totalCalories);

      const meal = day.meals.find((entry) => entry.key === DIET_MEAL_META[item.mealType].key);
      if (!meal) {
        continue;
      }

      meal.totalCalories += item.totalCalories;
      meal.eatenAt ??= this.formatTime(item.eatenAt);
      meal.foods.push(...this.toFrontendDietFoods(item));
    }

    return Array.from(dayMap.values()).sort((left, right) => right.id.localeCompare(left.id));
  }

  private createFrontendDietDay(dayId: string): FrontendDietDay {
    return {
      id: dayId,
      titleDate: this.formatTitleDate(dayId),
      sheetLabel: this.formatSheetLabel(dayId),
      totalCalories: 0,
      macros: DIET_MACRO_META.map((item) => ({
        key: item.key,
        label: item.label,
        value: "0.0克",
        color: item.color
      })),
      meals: DIET_MEAL_ORDER.map((mealType) => ({
        key: DIET_MEAL_META[mealType].key,
        label: DIET_MEAL_META[mealType].label,
        totalCalories: 0,
        foods: []
      }))
    };
  }

  private toFrontendDietRecipe(recipe: {
    id: string;
    title: string;
    summary: string | null;
    mealType: DietMealType;
    calories: number;
    tags: unknown;
    ingredients: unknown;
    steps: unknown;
    coverUrl: string | null;
    suitableFor: unknown;
    createdAt: Date;
  }) {
    const ingredients = ensureArray<string>(recipe.ingredients).map((item) =>
      this.toFrontendDietIngredient(item)
    );
    const steps = ensureArray<string>(recipe.steps);

    return {
      id: recipe.id,
      title: recipe.title,
      subtitle: recipe.summary ?? "为长者设计的均衡轻食方案。",
      publishDate: this.formatPublishDate(recipe.createdAt),
      mealKeys: this.resolveRecipeMealKeys(recipe),
      energy: `${recipe.calories} kcal`,
      time: `${this.estimateRecipeDuration(recipe, ingredients.length, steps.length)}分钟`,
      tags: ensureArray<string>(recipe.tags),
      imageUrl: recipe.coverUrl ?? "",
      ingredients,
      steps
    };
  }

  private toFrontendDietIngredient(rawIngredient: string): FrontendDietIngredient {
    const text = rawIngredient.trim();
    const amountIndex = text.search(/\d/);
    if (amountIndex <= 0) {
      return {
        name: text || "食材",
        amount: "适量"
      };
    }

    return {
      name: text.slice(0, amountIndex).trim(),
      amount: text.slice(amountIndex).trim()
    };
  }

  private resolveRecipeMealKeys(recipe: {
    mealType: DietMealType;
    summary: string | null;
    tags: unknown;
    suitableFor: unknown;
  }) {
    const mealKeys = new Set<DietMealKey>([DIET_MEAL_META[recipe.mealType].key]);
    const mealHints = [
      recipe.summary ?? "",
      ...ensureArray<string>(recipe.tags),
      ...ensureArray<string>(recipe.suitableFor)
    ].join(" ");

    if (mealHints.includes("早餐")) {
      mealKeys.add("breakfast");
    }
    if (mealHints.includes("午餐")) {
      mealKeys.add("lunch");
    }
    if (mealHints.includes("晚餐")) {
      mealKeys.add("dinner");
    }
    if (mealHints.includes("加餐")) {
      mealKeys.add("snack");
    }

    return DIET_MEAL_ORDER.map((mealType) => DIET_MEAL_META[mealType].key).filter((key) =>
      mealKeys.has(key)
    );
  }

  private estimateRecipeDuration(
    recipe: { summary: string | null },
    ingredientCount: number,
    stepCount: number
  ) {
    const summary = recipe.summary ?? "";
    const explicitDuration = summary.match(/(\d+)\s*分钟/);
    if (explicitDuration) {
      return Number(explicitDuration[1]);
    }

    return Math.max(12, Math.min(30, ingredientCount + stepCount * 4 + 4));
  }

  private toFrontendDietFoods(record: {
    id: string;
    foods: unknown;
    totalCalories: number;
  }) {
    const foods = ensureArray<Record<string, unknown>>(record.foods);
    const calories = this.resolveFoodCalories(foods, record.totalCalories);

    return foods.map((food, index) => {
      const name = String(food.name ?? `食材${index + 1}`);
      return {
        id: String(food.id ?? `${record.id}_${index + 1}`),
        name,
        amount: String(food.amount ?? "1份"),
        caloriesLabel: `${calories[index] ?? 0}千卡`,
        thumb: this.resolveFoodThumb(name)
      };
    });
  }

  private resolveFoodCalories(foods: Array<Record<string, unknown>>, totalCalories: number) {
    if (foods.length === 0) {
      return [];
    }

    const parsedCalories = foods.map((food) =>
      this.toRoundedNumber(food.calories ?? food.kcal ?? food.energy)
    );
    const definedTotal = parsedCalories.reduce<number>((sum, item) => sum + (item ?? 0), 0);
    const missingIndexes = parsedCalories
      .map((item, index) => (item === null ? index : -1))
      .filter((index) => index >= 0);

    if (missingIndexes.length === 0) {
      return parsedCalories as number[];
    }

    const remaining = Math.max(0, totalCalories - definedTotal);
    const average = missingIndexes.length > 0 ? Math.round(remaining / missingIndexes.length) : 0;

    return parsedCalories.map((item) => item ?? average);
  }

  private resolveFoodThumb(foodName: string): DietFoodThumb {
    if (/(牛奶|酸奶|奶酪|豆奶|奶昔)/.test(foodName)) {
      return "milk";
    }
    if (/(燕麦|麦片|藜麦|谷物)/.test(foodName)) {
      return "oat";
    }
    if (/(鸡蛋|蒸蛋|蛋卷|蛋羹)/.test(foodName)) {
      return "egg";
    }
    if (/(鱼|虾|鸡胸|鸡肉|牛肉|三文鱼|龙利鱼)/.test(foodName)) {
      return "fish";
    }
    if (/(沙拉|西兰花|菠菜|黄瓜|生菜|青菜|蔬菜)/.test(foodName)) {
      return "salad";
    }
    if (/(苹果|香蕉|蓝莓|橙|梨|火龙果|水果)/.test(foodName)) {
      return "fruit";
    }
    if (/(粥|南瓜|小米|米糊|羹)/.test(foodName)) {
      return "porridge";
    }

    return "bread";
  }

  private appendMacroValues(day: FrontendDietDay, macros: unknown, totalCalories: number) {
    const macroRecord = ensureRecord(macros);
    const fallback = {
      carb: Number(((totalCalories * 0.5) / 4).toFixed(1)),
      protein: Number(((totalCalories * 0.2) / 4).toFixed(1)),
      fat: Number(((totalCalories * 0.3) / 9).toFixed(1))
    };

    for (const item of DIET_MACRO_META) {
      const target = day.macros.find((macro) => macro.key === item.key);
      if (!target) {
        continue;
      }

      const currentValue = this.extractNumericValue(target.value);
      const nextValue =
        this.toRoundedNumber(macroRecord[item.key]) ?? fallback[item.key as keyof typeof fallback];
      target.value = `${(currentValue + nextValue).toFixed(1)}克`;
    }
  }

  private findMacroValue(
    macros: Array<{ key: string; value: string }>,
    key: string,
    fallback = "0克"
  ) {
    return macros.find((item) => item.key === key)?.value ?? fallback;
  }

  private estimateFiberLabel(
    records: Array<{ foods: unknown; totalCalories: number; eatenAt: Date }>,
    day: FrontendDietDay
  ) {
    const matchingRecords = records.filter((item) => (toDateString(item.eatenAt) ?? "") === day.id);
    if (matchingRecords.length === 0) {
      return `${Math.max(12, Math.round(day.totalCalories / 70))}g`;
    }

    let fiber = 0;
    for (const record of matchingRecords) {
      const foods = ensureArray<Record<string, unknown>>(record.foods);
      for (const food of foods) {
        const foodName = String(food.name ?? "");
        if (/(燕麦|全麦|西兰花|菠菜|苹果|蓝莓|南瓜|玉米|糙米|杂粮|水果|蔬菜)/.test(foodName)) {
          fiber += 4;
        } else if (/(米饭|牛奶|鸡蛋|鱼|虾)/.test(foodName)) {
          fiber += 1;
        } else {
          fiber += 2;
        }
      }
    }

    return `${Math.max(8, fiber)}g`;
  }

  private buildDietRecordHistoryPage(days: FrontendDietDay[]) {
    const recordedDays = [...days].sort((left, right) => left.id.localeCompare(right.id));
    const recordDaySet = new Set(recordedDays.map((item) => item.id));
    const monthIds = Array.from(new Set(recordedDays.map((item) => item.id.slice(0, 7)))).sort();

    const months = monthIds.map((monthId) => this.createHistoryMonth(monthId, recordDaySet));
    const yearValues = Array.from(new Set(months.map((item) => item.year))).sort(
      (left, right) => left - right
    );
    const years = yearValues.map((year) => {
      const yearMonths = months.filter((item) => item.year === year);
      return {
        value: year,
        label: `${year}年`,
        monthCount: yearMonths.length,
        recordCount: yearMonths.reduce((sum, item) => sum + item.recordCount, 0)
      };
    });

    const monthOptions = yearValues.flatMap((year) =>
      Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const id = `${year}-${String(month).padStart(2, "0")}`;
        const matched = months.find((item) => item.id === id);
        return {
          id,
          year,
          month,
          label: `${year}年${month}月`,
          shortLabel: `${month}月`,
          hasRecords: Boolean(matched),
          recordCount: matched?.recordCount ?? 0
        };
      })
    );

    return {
      title: "历史数据",
      weekLabels: ["日", "一", "二", "三", "四", "五", "六"],
      viewOptions: [
        { key: "day", label: "日视图" },
        { key: "month", label: "月视图" },
        { key: "year", label: "年视图" }
      ],
      years,
      months,
      monthOptions,
      selectedDateId: recordedDays[recordedDays.length - 1]?.id ?? ""
    };
  }

  private createHistoryMonth(monthId: string, recordDaySet: Set<string>) {
    const [yearText, monthText] = monthId.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const cells: Array<{
      key: string;
      label: string;
      dateId: string | null;
      isRecorded: boolean;
    }> = [];

    for (let index = 0; index < firstWeekday; index += 1) {
      cells.push({
        key: `${monthId}-leading-${index}`,
        label: "",
        dateId: null,
        isRecorded: false
      });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const dateId = `${monthId}-${String(day).padStart(2, "0")}`;
      cells.push({
        key: dateId,
        label: String(day),
        dateId,
        isRecorded: recordDaySet.has(dateId)
      });
    }

    const trailingCount = (7 - (cells.length % 7)) % 7;
    for (let index = 0; index < trailingCount; index += 1) {
      cells.push({
        key: `${monthId}-trailing-${index}`,
        label: "",
        dateId: null,
        isRecorded: false
      });
    }

    return {
      id: monthId,
      year,
      month,
      label: `${year}年${month}月`,
      shortLabel: `${month}月`,
      recordCount: cells.filter((item) => item.isRecorded).length,
      cells
    };
  }

  private formatPublishDate(date: Date) {
    return `发布时间：${this.formatTitleDate(toDateString(date) ?? "")}`;
  }

  private formatTitleDate(dayId: string) {
    const [year, month, day] = dayId.split("-").map(Number);
    return `${year}年${month}月${day}日`;
  }

  private formatSheetLabel(dayId: string) {
    const [year, month, day] = dayId.split("-").map(Number);
    const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][
      new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    ];
    return `${month}月${day}日 ${weekday}`;
  }

  private formatTime(value: Date) {
    return value.toISOString().slice(11, 16);
  }

  private extractNumericValue(value: unknown) {
    const match = String(value ?? "").match(/[\d.]+/);
    return match ? Number(match[0]) : 0;
  }

  private toRoundedNumber(value: unknown) {
    const normalized = this.extractNumericValue(value);
    return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
  }
}
