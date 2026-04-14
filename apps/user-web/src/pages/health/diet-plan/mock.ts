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
    { key: "breakfast", label: "早餐", desc: "清淡高纤" },
    { key: "lunch", label: "午餐", desc: "营养均衡" },
    { key: "dinner", label: "晚餐", desc: "低脂易消化" },
    { key: "snack", label: "加餐", desc: "少糖补能" },
  ],
  recipes: [
    { title: "虾仁蒸鸡蛋", energy: "168 kcal", time: "15分钟", tags: ["低盐", "高蛋白"], color: "green" },
    { title: "燕麦南瓜粥", energy: "226 kcal", time: "20分钟", tags: ["低糖", "高纤维"], color: "orange" },
    { title: "清炒西兰花", energy: "132 kcal", time: "12分钟", tags: ["低脂", "护心"], color: "mint" },
    { title: "番茄龙利鱼", energy: "248 kcal", time: "18分钟", tags: ["优质蛋白", "易消化"], color: "rose" },
  ],
};

export default mock;
