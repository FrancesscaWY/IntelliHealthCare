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

@Injectable()
export class AppHealthLifestyleService {
  constructor(private readonly prismaService: PrismaService) {}

  async getDietPlan(currentUser: AuthenticatedUser, elderId?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const [user, archive, recipeCount, latestRecords] = await Promise.all([
      this.prismaService.user.findUnique({
        where: { id: targetUserId }
      }),
      this.prismaService.healthArchive.findUnique({
        where: { userId: targetUserId }
      }),
      this.prismaService.dietRecipe.count(),
      this.prismaService.dietRecord.findMany({
        where: { userId: targetUserId },
        orderBy: { eatenAt: "desc" },
        take: 4,
        include: { recipe: true }
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

    const today = new Date().toISOString().slice(0, 10);
    const totalCaloriesToday = latestRecords
      .filter((item) => toDateString(item.eatenAt) === today)
      .reduce((sum, item) => sum + item.totalCalories, 0);

    return {
      profile,
      recipeCount,
      totalCaloriesToday,
      latestMeals: latestRecords.map((item) => ({
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

    return {
      recipeId: recipe.id,
      code: recipe.code,
      title: recipe.title,
      summary: recipe.summary,
      mealType: recipe.mealType,
      calories: recipe.calories,
      tags: recipe.tags,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      coverUrl: recipe.coverUrl,
      suitableFor: recipe.suitableFor
    };
  }

  async getDietRecords(currentUser: AuthenticatedUser, elderId?: string, date?: string) {
    const targetUserId = await this.resolveTargetUserId(currentUser, elderId);
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    const records = await this.prismaService.dietRecord.findMany({
      where: { userId: targetUserId },
      include: { recipe: true },
      orderBy: { eatenAt: "asc" }
    });

    const filtered = records.filter((item) => toDateString(item.eatenAt) === targetDate);
    const totalCalories = filtered.reduce((sum, item) => sum + item.totalCalories, 0);

    return {
      date: targetDate,
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

    const grouped = new Map<string, { date: string; totalCalories: number; mealCount: number }>();
    for (const item of records) {
      const key = toDateString(item.eatenAt) as string;
      const current = grouped.get(key) ?? { date: key, totalCalories: 0, mealCount: 0 };
      current.totalCalories += item.totalCalories;
      current.mealCount += 1;
      grouped.set(key, current);
    }

    const list = Array.from(grouped.values()).sort((a, b) => b.date.localeCompare(a.date));
    return paginate(list, page, pageSize);
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
}
