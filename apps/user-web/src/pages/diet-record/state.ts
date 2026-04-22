import mock, {
  type DietFoodItem,
  type DietFoodThumb,
  type DietMacro,
  type DietMealKey,
  type DietMealRecord,
  type DietRecordDay,
} from "./mock";

export interface DietCustomRecord {
  id: string;
  date: string;
  mealKey: DietMealKey;
  foodName: string;
  amount: string;
  calories: number;
  eatenAt: string;
  thumb: DietFoodThumb;
}

export interface DietMealOption {
  key: DietMealKey;
  label: string;
}

export interface DietThumbOption {
  key: DietFoodThumb;
  label: string;
}

const STORAGE_KEY = "ihc:diet-record:custom-records";

const mealLabelMap: Record<DietMealKey, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  snack: "加餐",
  dinner: "晚餐",
};

const macroMeta: Array<Pick<DietMacro, "key" | "label" | "color">> = [
  { key: "carb", label: "碳水", color: "#f36f66" },
  { key: "protein", label: "蛋白质", color: "#f5c957" },
  { key: "fat", label: "脂肪", color: "#43c9a4" },
];

export const dietMealOptions: DietMealOption[] = Object.entries(mealLabelMap).map(([key, label]) => ({
  key: key as DietMealKey,
  label,
}));

export const dietThumbOptions: DietThumbOption[] = [
  { key: "bread", label: "主食" },
  { key: "milk", label: "奶类" },
  { key: "oat", label: "谷物" },
  { key: "egg", label: "蛋类" },
  { key: "fish", label: "肉类" },
  { key: "salad", label: "蔬菜" },
  { key: "fruit", label: "水果" },
  { key: "porridge", label: "粥品" },
];

function cloneFood(food: DietFoodItem): DietFoodItem {
  return { ...food };
}

function cloneMeal(meal: DietMealRecord): DietMealRecord {
  return {
    ...meal,
    foods: meal.foods.map(cloneFood),
  };
}

function cloneMacro(macro: DietMacro): DietMacro {
  return { ...macro };
}

function cloneDay(day: DietRecordDay): DietRecordDay {
  return {
    ...day,
    macros: day.macros.map(cloneMacro),
    meals: day.meals.map(cloneMeal),
  };
}

function safeJsonParse(value: string | null): DietCustomRecord[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as DietCustomRecord[]) : [];
  } catch {
    return [];
  }
}

function readStorage(): DietCustomRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  return safeJsonParse(window.localStorage.getItem(STORAGE_KEY));
}

function writeStorage(records: DietCustomRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getNumericValue(text: string) {
  const match = text.match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function createMacroDefaults(): DietMacro[] {
  return macroMeta.map((item) => ({
    ...item,
    value: "0.0g",
  }));
}

function createMealDefaults(): DietMealRecord[] {
  return dietMealOptions.map((item) => ({
    key: item.key,
    label: item.label,
    totalCalories: 0,
    foods: [],
  }));
}

function formatTitleDate(dateText: string) {
  const [year, month, day] = dateText.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function formatSheetLabel(dateText: string) {
  const [year, month, day] = dateText.split("-").map(Number);
  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][new Date(year, month - 1, day).getDay()];
  return `${month}月${day}日 ${weekday}`;
}

function createEmptyDay(date: string): DietRecordDay {
  return {
    id: date,
    titleDate: formatTitleDate(date),
    sheetLabel: formatSheetLabel(date),
    totalCalories: 0,
    macros: createMacroDefaults(),
    meals: createMealDefaults(),
  };
}

function ensureMacro(day: DietRecordDay, macroKey: string) {
  const found = day.macros.find((item) => item.key === macroKey);
  if (found) {
    return found;
  }

  const template = macroMeta.find((item) => item.key === macroKey);
  const nextMacro: DietMacro = {
    key: macroKey,
    label: template?.label ?? macroKey,
    value: "0.0g",
    color: template?.color ?? "#d9dde4",
  };
  day.macros.push(nextMacro);
  return nextMacro;
}

function appendMacroValue(day: DietRecordDay, macroKey: "carb" | "protein" | "fat", calories: number) {
  const gramsMap = {
    carb: (calories * 0.5) / 4,
    protein: (calories * 0.2) / 4,
    fat: (calories * 0.3) / 9,
  } as const;
  const macro = ensureMacro(day, macroKey);
  const nextValue = getNumericValue(macro.value) + gramsMap[macroKey];
  macro.value = `${nextValue.toFixed(1)}g`;
}

function ensureDay(dayMap: Map<string, DietRecordDay>, date: string) {
  const existing = dayMap.get(date);
  if (existing) {
    return existing;
  }

  const nextDay = createEmptyDay(date);
  dayMap.set(date, nextDay);
  return nextDay;
}

function normalizeDays(baseDays: DietRecordDay[], customRecords: DietCustomRecord[]) {
  const dayMap = new Map(baseDays.map((day) => [day.id, cloneDay(day)]));
  const sortedCustomRecords = [...customRecords].sort((left, right) => {
    const leftKey = `${left.date} ${left.eatenAt || "00:00"} ${left.id}`;
    const rightKey = `${right.date} ${right.eatenAt || "00:00"} ${right.id}`;
    return rightKey.localeCompare(leftKey);
  });

  for (const record of sortedCustomRecords) {
    const day = ensureDay(dayMap, record.date);
    const meal = day.meals.find((item) => item.key === record.mealKey);

    if (!meal) {
      continue;
    }

    meal.foods.push({
      id: record.id,
      name: record.foodName,
      amount: record.amount,
      caloriesLabel: `${record.calories}千卡`,
      thumb: record.thumb,
    });
    meal.totalCalories += record.calories;

    if (!meal.eatenAt || record.eatenAt > meal.eatenAt) {
      meal.eatenAt = record.eatenAt;
    }

    appendMacroValue(day, "carb", record.calories);
    appendMacroValue(day, "protein", record.calories);
    appendMacroValue(day, "fat", record.calories);
  }

  return Array.from(dayMap.values())
    .map((day) => ({
      ...day,
      totalCalories: day.meals.reduce((sum, meal) => sum + meal.totalCalories, 0),
    }))
    .sort((left, right) => right.id.localeCompare(left.id));
}

export function getDietRecordDays() {
  return normalizeDays(mock.days, readStorage());
}

export function saveDietCustomRecord(record: Omit<DietCustomRecord, "id">) {
  const nextRecord: DietCustomRecord = {
    ...record,
    id: `diet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  const records = readStorage();
  records.unshift(nextRecord);
  writeStorage(records);
  return nextRecord;
}

export function getDietRecordedDateIds() {
  return getDietRecordDays().map((item) => item.id);
}

export function getDefaultMealKey() {
  return dietMealOptions[0]?.key ?? "breakfast";
}

export function getMealLabel(mealKey: DietMealKey) {
  return mealLabelMap[mealKey] ?? mealLabelMap.breakfast;
}
