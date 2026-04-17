import { dietRecipes } from "../diet-recipes";

const mock = {
  title: "健康膳食",
  searchPlaceholder: "搜索食材、菜谱或营养建议",
  overview: {
    title: "今日均衡饮食",
    subtitle: "少油少盐，多蔬果，蛋白质足量",
    calories: "1380",
    protein: "62g",
    fiber: "28g",
  },
  mealTabs: [
    { key: "breakfast", label: "早餐", desc: "清淡高纤", highlight: "晨间暖胃更轻盈" },
    { key: "lunch", label: "午餐", desc: "营养均衡", highlight: "补充蛋白和主菜" },
    { key: "dinner", label: "晚餐", desc: "低脂易消化", highlight: "晚间少负担更安心" },
    { key: "snack", label: "加餐", desc: "少糖补能", highlight: "少量补能不怕饿" },
  ],
  recipes: dietRecipes,
};

export default mock;
