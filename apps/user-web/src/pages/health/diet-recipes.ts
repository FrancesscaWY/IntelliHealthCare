import recipeBroccoli from "@/assets/recipes/recipe-broccoli.jpg";
import recipeFishTomato from "@/assets/recipes/recipe-fish-tomato.jpg";
import recipePumpkinPorridge from "@/assets/recipes/recipe-pumpkin-porridge.jpg";
import recipeShrimpEgg from "@/assets/recipes/recipe-shrimp-egg.jpg";

export interface DietRecipeIngredient {
  name: string;
  amount: string;
}

export interface DietRecipe {
  id: string;
  title: string;
  subtitle: string;
  publishDate: string;
  energy: string;
  time: string;
  tags: string[];
  imageUrl: string;
  ingredients: DietRecipeIngredient[];
  steps: string[];
}

export const dietRecipes: DietRecipe[] = [
  {
    id: "shrimp-egg",
    title: "虾仁蒸蛋",
    subtitle: "鲜嫩清淡，适合长者日常补充优质蛋白。",
    publishDate: "发布时间：2024年1月13日",
    energy: "168 kcal",
    time: "15分钟",
    tags: ["低盐", "高蛋白"],
    imageUrl: recipeShrimpEgg,
    ingredients: [
      { name: "鸡蛋", amount: "4个" },
      { name: "鲜虾", amount: "20只" },
      { name: "香葱", amount: "1根" },
      { name: "温水", amount: "280毫升" },
      { name: "盐", amount: "2克" },
      { name: "香油", amount: "1勺" },
    ],
    steps: [
      "处理虾仁。去掉虾头、虾线以及外壳，冲洗后用少量料酒和盐轻轻抓匀，静置5分钟。",
      "调制蛋液。鸡蛋打散后加入温水和少量盐，再过筛一次，让蛋液更细腻。",
      "开始蒸制。将虾仁放入蒸碗，缓缓倒入蛋液，盖上耐热保鲜膜并扎几个小孔。",
      "完成调味。水开后上锅，中小火蒸10至12分钟，焖2分钟后取出，淋少量香油并撒上葱花即可。",
    ],
  },
  {
    id: "pumpkin-porridge",
    title: "燕麦南瓜粥",
    subtitle: "绵软顺口，膳食纤维更足，早餐和加餐都合适。",
    publishDate: "发布时间：2024年1月16日",
    energy: "226 kcal",
    time: "20分钟",
    tags: ["低糖", "高纤维"],
    imageUrl: recipePumpkinPorridge,
    ingredients: [
      { name: "南瓜", amount: "220克" },
      { name: "即食燕麦", amount: "45克" },
      { name: "小米", amount: "30克" },
      { name: "牛奶", amount: "180毫升" },
      { name: "清水", amount: "500毫升" },
      { name: "枸杞", amount: "8粒" },
    ],
    steps: [
      "准备食材。南瓜去皮切小块，小米提前淘洗干净备用。",
      "煮制底粥。锅中加入清水、小米和南瓜，大火煮开后转小火煮12分钟。",
      "加入燕麦。放入燕麦继续搅拌煮3分钟，再倒入牛奶，小火煮到粥体浓稠。",
      "整理出锅。出锅前撒入枸杞即可，口味清淡的话无需额外加糖。",
    ],
  },
  {
    id: "broccoli",
    title: "清炒西兰花",
    subtitle: "口感爽脆，油脂更低，适合晚餐搭配主食和瘦肉。",
    publishDate: "发布时间：2024年1月18日",
    energy: "132 kcal",
    time: "12分钟",
    tags: ["低脂", "护心"],
    imageUrl: recipeBroccoli,
    ingredients: [
      { name: "西兰花", amount: "300克" },
      { name: "胡萝卜", amount: "40克" },
      { name: "蒜片", amount: "3片" },
      { name: "橄榄油", amount: "1勺" },
      { name: "盐", amount: "2克" },
      { name: "清水", amount: "适量" },
    ],
    steps: [
      "处理蔬菜。西兰花剪成小朵，放入淡盐水中浸泡后冲洗干净，胡萝卜切片。",
      "快速焯水。锅中烧水，西兰花和胡萝卜焯水40秒，捞出沥干。",
      "下锅翻炒。热锅加少量橄榄油，下蒜片炒香后倒入西兰花和胡萝卜快速翻炒。",
      "调味收尾。最后加盐调味，沿锅边淋少量清水翻匀，保持脆嫩口感后出锅。",
    ],
  },
  {
    id: "fish-tomato",
    title: "番茄龙利鱼",
    subtitle: "酸甜开胃，鱼肉细嫩，适合牙口一般的长者。",
    publishDate: "发布时间：2024年1月21日",
    energy: "248 kcal",
    time: "18分钟",
    tags: ["优质蛋白", "易消化"],
    imageUrl: recipeFishTomato,
    ingredients: [
      { name: "龙利鱼柳", amount: "220克" },
      { name: "番茄", amount: "2个" },
      { name: "洋葱", amount: "30克" },
      { name: "番茄酱", amount: "1勺" },
      { name: "黑胡椒", amount: "少许" },
      { name: "盐", amount: "2克" },
    ],
    steps: [
      "腌制鱼肉。龙利鱼切块后用少量黑胡椒和盐腌5分钟，番茄去皮切丁，洋葱切碎。",
      "炒香底料。锅中少量油炒香洋葱，倒入番茄丁和番茄酱，小火炒出沙。",
      "煮制入味。加入半碗清水煮开，再放入龙利鱼块，中小火煮4至5分钟。",
      "完成装盘。汤汁稍微收浓后关火，口味偏淡更适合长者日常食用。",
    ],
  },
];

export function getDietRecipeById(recipeId: string) {
  return dietRecipes.find((item) => item.id === recipeId) ?? dietRecipes[0];
}
