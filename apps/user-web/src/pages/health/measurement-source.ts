import {
  getHealthDevices,
  getHealthMetricRecords,
  getHealthMetricTrend,
  getHealthMetricsOverview,
  type HealthDeviceItem,
  type HealthDeviceMeasurement,
  type HealthMetricKey,
  type TrendDataPoint
} from "@/shared/api/health";


type BloodPressureParts = {
  systolic: number;
  diastolic: number;
};

type SleepDayRecord = {
  date: string;
  sleep: number;
  deepSleep: number;
  lightSleep: number;
  remSleep: number;
  awakeCount: number;
  sleepStart: string;
  wakeTime: string;
  sleepStartHour: number;
  wakeTimeHour: number;
};

const ALL_METRICS: HealthMetricKey[] = [
  "steps",
  "heartRate",
  "sleep",
  "weight",
  "bloodSugar",
  "bloodPressure",
  "oxygen",
  "stress"
];

function createEmptyMeasurementMap() {
  return {
    steps: [] as HealthDeviceMeasurement[],
    heartRate: [] as HealthDeviceMeasurement[],
    sleep: [] as HealthDeviceMeasurement[],
    weight: [] as HealthDeviceMeasurement[],
    bloodSugar: [] as HealthDeviceMeasurement[],
    bloodPressure: [] as HealthDeviceMeasurement[],
    oxygen: [] as HealthDeviceMeasurement[],
    stress: [] as HealthDeviceMeasurement[]
  };
}

function toRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }

  return value as Record<string, unknown>;
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[], digits = 1) {
  if (!values.length) {
    return 0;
  }

  return round(sum(values) / values.length, digits);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(isoString: string) {
  const date = new Date(isoString);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeKey(isoString: string) {
  const date = new Date(isoString);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatShortDate(dateKey: string) {
  return dateKey.slice(5).replace("-", "/");
}

function formatDurationHours(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const hourPart = Math.floor(totalMinutes / 60);
  const minutePart = totalMinutes % 60;

  if (!hourPart) {
    return `${minutePart}分钟`;
  }

  if (!minutePart) {
    return `${hourPart}小时`;
  }

  return `${hourPart}小时${minutePart}分钟`;
}

function formatClockHour(hourValue: number) {
  const hours = Math.floor(hourValue);
  const minutes = Math.round((hourValue - hours) * 60);
  const normalizedHours = minutes === 60 ? hours + 1 : hours;
  const normalizedMinutes = minutes === 60 ? 0 : minutes;
  return `${pad(normalizedHours)}:${pad(normalizedMinutes)}`;
}

function sortMeasurementsAsc(measurements: HealthDeviceMeasurement[]) {
  return [...measurements].sort(
    (left, right) =>
      new Date(left.measuredAt).getTime() - new Date(right.measuredAt).getTime()
  );
}

function groupMeasurementsByDate<T extends { measuredAt: string }>(items: T[]) {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const dateKey = toDateKey(item.measuredAt);
    const list = groups.get(dateKey) ?? [];
    list.push(item);
    groups.set(dateKey, list);
  }

  return groups;
}

function groupSequentialWeeks<T extends { date: string }>(items: T[]) {
  const groups: Array<{ label: string; items: T[] }> = [];

  for (let index = 0; index < items.length; index += 7) {
    const chunk = items.slice(index, index + 7);
    if (!chunk.length) {
      continue;
    }

    groups.push({
      label: `${formatShortDate(chunk[0].date)}-${formatShortDate(chunk[chunk.length - 1].date)}`,
      items: chunk
    });
  }

  return groups;
}

function getLatestOfDay<T>(items: T[]) {
  return items[items.length - 1] ?? null;
}

function getStepsDistance(record: HealthDeviceMeasurement) {
  const payload = toRecord(record.payload);
  return toFiniteNumber(payload.distanceKm) ?? 0;
}

function getBloodPressureParts(record: HealthDeviceMeasurement): BloodPressureParts {
  const payload = toRecord(record.payload);
  const systolic =
    toFiniteNumber(payload.systolic) ??
    toFiniteNumber(record.value) ??
    0;

  const displayValue = typeof record.displayValue === "string" ? record.displayValue : "";
  const displayDiastolic = displayValue.includes("/")
    ? toFiniteNumber(displayValue.split("/")[1])
    : null;

  const diastolic =
    toFiniteNumber(payload.diastolic) ??
    displayDiastolic ??
    0;

  return {
    systolic: Math.round(systolic),
    diastolic: Math.round(diastolic)
  };
}

function getHeartRateBounds(record: HealthDeviceMeasurement) {
  const payload = toRecord(record.payload);
  const value = Math.round(toFiniteNumber(record.value) ?? 0);
  const lowHeartRate = Math.round(
    toFiniteNumber(payload.lowHeartRate) ??
      Math.max(40, value - 8)
  );
  const highHeartRate = Math.round(
    toFiniteNumber(payload.highHeartRate) ??
      Math.max(lowHeartRate, value + 8)
  );

  return {
    heartRate: value,
    lowHeartRate,
    highHeartRate
  };
}

function deriveWeightHeightSquare(device: HealthDeviceItem | null) {
  const payload = toRecord(device?.latestPayload);
  const weight = toFiniteNumber(payload.weight);
  const bmi = toFiniteNumber(payload.bmi);

  if (!weight || !bmi) {
    return null;
  }

  return weight / bmi;
}

function getWeightBmi(
  record: HealthDeviceMeasurement,
  heightSquare: number | null
) {
  const payload = toRecord(record.payload);
  const payloadBmi = toFiniteNumber(payload.bmi);
  const weight = toFiniteNumber(record.value) ?? 0;

  if (payloadBmi) {
    return round(payloadBmi, 1);
  }

  if (heightSquare) {
    return round(weight / heightSquare, 1);
  }

  return 0;
}

function getSleepRecord(record: HealthDeviceMeasurement): SleepDayRecord {
  const payload = toRecord(record.payload);
  const sleep = round(toFiniteNumber(record.value) ?? 0, 1);
  const deepSleep = round(
    toFiniteNumber(payload.deepSleepHours) ?? sleep * 0.38,
    1
  );
  const remSleep = round(
    toFiniteNumber(payload.remSleepHours) ?? sleep * 0.22,
    1
  );
  const lightSleep = round(Math.max(0, sleep - deepSleep - remSleep), 1);
  const awakeCount = Math.max(
    0,
    Math.round(toFiniteNumber(payload.awakeCount) ?? (sleep < 5 ? 2 : 1))
  );
  const sleepStartHour = round(
    toFiniteNumber(payload.sleepStartHour) ?? Math.max(0.2, 7.4 - sleep),
    1
  );
  const wakeTimeHour = round(
    toFiniteNumber(payload.wakeTimeHour) ?? sleepStartHour + sleep,
    1
  );

  return {
    date: toDateKey(record.measuredAt),
    sleep,
    deepSleep,
    lightSleep,
    remSleep,
    awakeCount,
    sleepStartHour,
    wakeTimeHour,
    sleepStart: formatClockHour(sleepStartHour),
    wakeTime: formatClockHour(wakeTimeHour)
  };
}

async function loadMetricRecordsBundle(metricKeys: HealthMetricKey[]) {
  const devices = await getHealthDevices();
  const measurementsByMetric = createEmptyMeasurementMap();
  const metricEntries = await Promise.all(
    metricKeys.map(async (metricKey) => {
      const response = await getHealthMetricRecords(metricKey, {
        page: 1,
        pageSize: 100
      });

      return [metricKey, sortMeasurementsAsc(response.list)] as const;
    })
  );

  for (const [metricKey, measurements] of metricEntries) {
    measurementsByMetric[metricKey] = measurements;
  }

  return {
    devices,
    measurementsByMetric
  };
}

function buildStepsSource(measurements: HealthDeviceMeasurement[]) {
  const groups = groupMeasurementsByDate(measurements);
  const list = Array.from(groups.entries()).map(([date, items]) => {
    const selected = [...items].sort(
      (left, right) =>
        (toFiniteNumber(right.value) ?? 0) - (toFiniteNumber(left.value) ?? 0)
    )[0];

    return {
      date,
      steps: Math.round(toFiniteNumber(selected?.value) ?? 0),
      distance: round(getStepsDistance(selected), 1)
    };
  });

  return { list };
}

function buildHeartRateSource(measurements: HealthDeviceMeasurement[]) {
  const groups = groupMeasurementsByDate(measurements);
  const dailyTimeline = Array.from(groups.entries()).map(([date, items]) => ({
    date,
    items: items.map((item) => ({
      time: toTimeKey(item.measuredAt),
      ...getHeartRateBounds(item)
    }))
  }));

  const list = dailyTimeline.map((entry) => ({
    date: entry.date,
    heartRate: Math.round(average(entry.items.map((item) => item.heartRate), 0)),
    lowHeartRate: Math.min(...entry.items.map((item) => item.lowHeartRate)),
    highHeartRate: Math.max(...entry.items.map((item) => item.highHeartRate))
  }));

  const monthlyData = groupSequentialWeeks(list).map((group) => ({
    week: group.label,
    heartRate: Math.round(average(group.items.map((item) => item.heartRate), 0)),
    lowHeartRate: Math.min(...group.items.map((item) => item.lowHeartRate)),
    highHeartRate: Math.max(...group.items.map((item) => item.highHeartRate))
  }));

  return {
    list,
    dailyTimeline,
    monthlyData
  };
}

function buildWeightSource(
  measurements: HealthDeviceMeasurement[],
  device: HealthDeviceItem | null
) {
  const heightSquare = deriveWeightHeightSquare(device);
  const groups = groupMeasurementsByDate(measurements);
  const list = Array.from(groups.entries()).map(([date, items]) => {
    const latest = getLatestOfDay(items) ?? items[items.length - 1];
    const weight = round(toFiniteNumber(latest?.value) ?? 0, 1);

    return {
      date,
      weight,
      bmi: getWeightBmi(latest, heightSquare)
    };
  });

  return { list };
}

function buildBloodGlucoseSource(measurements: HealthDeviceMeasurement[]) {
  const groups = groupMeasurementsByDate(measurements);
  const dailyTimeline = Array.from(groups.entries()).map(([date, items]) => ({
    date,
    items: items.map((item) => ({
      time: toTimeKey(item.measuredAt),
      value: round(toFiniteNumber(item.value) ?? 0, 1)
    }))
  }));

  const list = dailyTimeline.map((entry) => {
    const values = entry.items.map((item) => item.value);
    return {
      date: entry.date,
      fasting: values.length ? Math.min(...values) : 0,
      postMealPeak: values.length ? Math.max(...values) : 0,
      bloodSugar: average(values, 1)
    };
  });

  const monthlyData = groupSequentialWeeks(list).map((group) => ({
    label: group.label,
    min: Math.min(...group.items.map((item) => item.fasting)),
    max: Math.max(...group.items.map((item) => item.postMealPeak)),
    avg: average(group.items.map((item) => item.bloodSugar), 1)
  }));

  return {
    list,
    dailyTimeline,
    monthlyData
  };
}

function buildBloodPressureSource(measurements: HealthDeviceMeasurement[]) {
  const groups = groupMeasurementsByDate(measurements);
  const dailyTimeline = Array.from(groups.entries()).map(([date, items]) => ({
    date,
    items: items.map((item) => ({
      time: toTimeKey(item.measuredAt),
      ...getBloodPressureParts(item)
    }))
  }));

  const list = dailyTimeline.map((entry) => {
    const latest = getLatestOfDay(entry.items);
    return {
      date: entry.date,
      time: latest?.time ?? "",
      systolic: latest?.systolic ?? 0,
      diastolic: latest?.diastolic ?? 0
    };
  });

  const monthlyData = groupSequentialWeeks(list).map((group) => ({
    label: group.label,
    systolic: Math.round(average(group.items.map((item) => item.systolic), 0)),
    diastolic: Math.round(average(group.items.map((item) => item.diastolic), 0)),
    maxSystolic: Math.max(...group.items.map((item) => item.systolic)),
    minDiastolic: Math.min(...group.items.map((item) => item.diastolic))
  }));

  return {
    list,
    dailyTimeline,
    monthlyData
  };
}

function buildOxygenSource(measurements: HealthDeviceMeasurement[]) {
  const groups = groupMeasurementsByDate(measurements);
  const dailyTimeline = Array.from(groups.entries()).map(([date, items]) => ({
    date,
    items: items.map((item) => ({
      time: toTimeKey(item.measuredAt),
      value: Math.round(toFiniteNumber(item.value) ?? 0)
    }))
  }));

  const list = dailyTimeline.map((entry) => {
    const latest = getLatestOfDay(entry.items);
    return {
      date: entry.date,
      time: latest?.time ?? "",
      oxygen: latest?.value ?? 0
    };
  });

  const monthlyData = groupSequentialWeeks(list).map((group) => ({
    label: group.label,
    min: Math.min(...group.items.map((item) => item.oxygen)),
    max: Math.max(...group.items.map((item) => item.oxygen)),
    avg: Math.round(average(group.items.map((item) => item.oxygen), 0))
  }));

  return {
    list,
    dailyTimeline,
    monthlyData
  };
}

function buildStressSource(measurements: HealthDeviceMeasurement[]) {
  const groups = groupMeasurementsByDate(measurements);
  const dailyTimeline = Array.from(groups.entries()).map(([date, items]) => ({
    date,
    items: items.map((item) => ({
      time: toTimeKey(item.measuredAt),
      value: Math.round(toFiniteNumber(item.value) ?? 0)
    }))
  }));

  const list = dailyTimeline.map((entry) => {
    const latest = getLatestOfDay(entry.items);
    return {
      date: entry.date,
      time: latest?.time ?? "",
      stress: latest?.value ?? 0
    };
  });

  const monthlyData = groupSequentialWeeks(list).map((group) => ({
    label: group.label,
    min: Math.min(...group.items.map((item) => item.stress)),
    max: Math.max(...group.items.map((item) => item.stress)),
    avg: Math.round(average(group.items.map((item) => item.stress), 0))
  }));

  return {
    list,
    dailyTimeline,
    monthlyData
  };
}

function buildSleepSource(measurements: HealthDeviceMeasurement[]) {
  const groups = groupMeasurementsByDate(measurements);
  const list = Array.from(groups.values()).map((items) => getSleepRecord(getLatestOfDay(items)!));

  const dailyTimeline = list.length
    ? [
        {
          date: list[list.length - 1].date,
          items: measurements
            .filter((item) => toDateKey(item.measuredAt) === list[list.length - 1].date)
            .map((item) => ({
              time: toTimeKey(item.measuredAt),
              value: round(toFiniteNumber(item.value) ?? 0, 1)
            }))
        }
      ]
    : [];

  const weeklySchedule = list.slice(-7).map((item) => ({
    label: formatShortDate(item.date),
    sleepStartHour: item.sleepStartHour,
    wakeTimeHour: item.wakeTimeHour
  }));

  const monthlyData = groupSequentialWeeks(list).map((group, index) => ({
    label: `第${index + 1}周`,
    deepSleep: average(group.items.map((item) => item.deepSleep), 1),
    lightSleep: average(group.items.map((item) => item.lightSleep), 1),
    remSleep: average(group.items.map((item) => item.remSleep), 1)
  }));

  const monthlySchedule = groupSequentialWeeks(list).map((group) => ({
    label: group.label,
    sleepStartHour: average(group.items.map((item) => item.sleepStartHour), 1),
    wakeTimeHour: average(group.items.map((item) => item.wakeTimeHour), 1)
  }));

  const averageDuration = average(list.map((item) => item.sleep), 1);
  const earlierHalf = list.slice(0, Math.floor(list.length / 2));
  const laterHalf = list.slice(Math.floor(list.length / 2));
  const earlierAverage = average(earlierHalf.map((item) => item.sleep), 1);
  const laterAverage = average(laterHalf.map((item) => item.sleep), 1);
  const compareMinutes = Math.round((laterAverage - earlierAverage) * 60);
  const compareText =
    !earlierHalf.length || !laterHalf.length
      ? "样本不足"
      : compareMinutes === 0
        ? "较前一阶段持平"
        : `较前一阶段${compareMinutes > 0 ? "增加" : "减少"}${Math.abs(compareMinutes)}分钟`;

  return {
    list,
    dailyTimeline,
    weeklySummary: {
      averageSleepTime: formatClockHour(average(list.map((item) => item.sleepStartHour), 2)),
      averageWakeTime: formatClockHour(average(list.map((item) => item.wakeTimeHour), 2))
    },
    weeklySchedule,
    monthlySummary: {
      averageDuration: formatDurationHours(averageDuration),
      compareText,
      averageSleepTime: formatClockHour(average(list.map((item) => item.sleepStartHour), 2)),
      averageWakeTime: formatClockHour(average(list.map((item) => item.wakeTimeHour), 2))
    },
    monthlyData,
    monthlySchedule
  };
}

// ─── 基于趋势接口的加载函数 ────────────────────────────

/**
 * 从趋势接口数据构建 steps 源
 */
function buildStepsSourceFromTrend(trendList: TrendDataPoint[]) {
  const list = trendList.map((item) => ({
    date: item.date,
    steps: Math.round(item.value),
    distance: round(
      toFiniteNumber((item.payload as Record<string, unknown> | undefined)?.distanceKm) ?? 0,
      1
    )
  }));

  return { list };
}

/**
 * 从趋势接口数据构建 heartRate 源
 */
function buildHeartRateSourceFromTrend(trendList: TrendDataPoint[]) {
  const dailyTimeline = trendList.map((item) => {
    const payload = toRecord(item.payload);
    const lowHeartRate = Math.round(
      toFiniteNumber(payload.lowHeartRate) ?? Math.max(40, item.value - 8)
    );
    const highHeartRate = Math.round(
      toFiniteNumber(payload.highHeartRate) ?? Math.max(lowHeartRate, item.value + 8)
    );

    return {
      date: item.date,
      items: [
        {
          time: "",
          heartRate: Math.round(item.value),
          lowHeartRate,
          highHeartRate
        }
      ]
    };
  });

  const list = dailyTimeline.map((entry) => ({
    date: entry.date,
    heartRate: entry.items[0].heartRate,
    lowHeartRate: entry.items[0].lowHeartRate,
    highHeartRate: entry.items[0].highHeartRate
  }));

  const monthlyData = groupSequentialWeeks(list).map((group) => ({
    week: group.label,
    heartRate: Math.round(average(group.items.map((item) => item.heartRate), 0)),
    lowHeartRate: Math.min(...group.items.map((item) => item.lowHeartRate)),
    highHeartRate: Math.max(...group.items.map((item) => item.highHeartRate))
  }));

  return { list, dailyTimeline, monthlyData };
}

/**
 * 从趋势接口数据构建 weight 源
 */
function buildWeightSourceFromTrend(trendList: TrendDataPoint[]) {
  const list = trendList.map((item) => ({
    date: item.date,
    weight: round(item.value, 1),
    bmi: round(
      toFiniteNumber((item.payload as Record<string, unknown> | undefined)?.bmi) ?? 0,
      1
    )
  }));

  return { list };
}

/**
 * 从趋势接口数据构建 bloodSugar 源
 */
function buildBloodGlucoseSourceFromTrend(trendList: TrendDataPoint[]) {
  const dailyTimeline = trendList.map((item) => ({
    date: item.date,
    items: [
      {
        time: "",
        value: round(item.value, 1)
      }
    ]
  }));

  const list = dailyTimeline.map((entry) => ({
    date: entry.date,
    fasting: entry.items[0].value,
    postMealPeak: entry.items[0].value,
    bloodSugar: entry.items[0].value
  }));

  const monthlyData = groupSequentialWeeks(list).map((group) => ({
    label: group.label,
    min: Math.min(...group.items.map((item) => item.fasting)),
    max: Math.max(...group.items.map((item) => item.postMealPeak)),
    avg: average(group.items.map((item) => item.bloodSugar), 1)
  }));

  return { list, dailyTimeline, monthlyData };
}

/**
 * 从趋势接口数据构建 bloodPressure 源
 */
function buildBloodPressureSourceFromTrend(trendList: TrendDataPoint[]) {
  const dailyTimeline = trendList.map((item) => ({
    date: item.date,
    items: [
      {
        time: "",
        systolic: item.systolic ?? Math.round(item.value),
        diastolic: item.diastolic ?? 0
      }
    ]
  }));

  const list = dailyTimeline.map((entry) => ({
    date: entry.date,
    time: "",
    systolic: entry.items[0].systolic,
    diastolic: entry.items[0].diastolic
  }));

  const monthlyData = groupSequentialWeeks(list).map((group) => ({
    label: group.label,
    systolic: Math.round(average(group.items.map((item) => item.systolic), 0)),
    diastolic: Math.round(average(group.items.map((item) => item.diastolic), 0)),
    maxSystolic: Math.max(...group.items.map((item) => item.systolic)),
    minDiastolic: Math.min(...group.items.map((item) => item.diastolic))
  }));

  return { list, dailyTimeline, monthlyData };
}

/**
 * 从趋势接口数据构建 oxygen 源
 */
function buildOxygenSourceFromTrend(trendList: TrendDataPoint[]) {
  const dailyTimeline = trendList.map((item) => ({
    date: item.date,
    items: [
      {
        time: "",
        value: Math.round(item.value)
      }
    ]
  }));

  const list = dailyTimeline.map((entry) => ({
    date: entry.date,
    time: "",
    oxygen: entry.items[0].value
  }));

  const monthlyData = groupSequentialWeeks(list).map((group) => ({
    label: group.label,
    min: Math.min(...group.items.map((item) => item.oxygen)),
    max: Math.max(...group.items.map((item) => item.oxygen)),
    avg: Math.round(average(group.items.map((item) => item.oxygen), 0))
  }));

  return { list, dailyTimeline, monthlyData };
}

/**
 * 从趋势接口数据构建 stress 源
 */
function buildStressSourceFromTrend(trendList: TrendDataPoint[]) {
  const dailyTimeline = trendList.map((item) => ({
    date: item.date,
    items: [
      {
        time: "",
        value: Math.round(item.value)
      }
    ]
  }));

  const list = dailyTimeline.map((entry) => ({
    date: entry.date,
    time: "",
    stress: entry.items[0].value
  }));

  const monthlyData = groupSequentialWeeks(list).map((group) => ({
    label: group.label,
    min: Math.min(...group.items.map((item) => item.stress)),
    max: Math.max(...group.items.map((item) => item.stress)),
    avg: Math.round(average(group.items.map((item) => item.stress), 0))
  }));

  return { list, dailyTimeline, monthlyData };
}

/**
 * 从趋势接口数据构建 sleep 源
 */
function buildSleepSourceFromTrend(trendList: TrendDataPoint[]) {
  const list = trendList.map((item) => ({
    date: item.date,
    sleep: round(item.value, 1),
    deepSleep: round(item.deepSleep ?? item.value * 0.38, 1),
    lightSleep: round(item.lightSleep ?? Math.max(0, item.value - (item.deepSleep ?? item.value * 0.38) - (item.remSleep ?? item.value * 0.22)), 1),
    remSleep: round(item.remSleep ?? item.value * 0.22, 1),
    awakeCount: Math.max(0, Math.round(toFiniteNumber((item.payload as Record<string, unknown> | undefined)?.awakeCount) ?? (item.value < 5 ? 2 : 1))),
    sleepStart: "",
    wakeTime: "",
    sleepStartHour: 0,
    wakeTimeHour: 0
  }));

  const dailyTimeline = list.length
    ? [
        {
          date: list[list.length - 1].date,
          items: trendList
            .filter((item) => item.date === list[list.length - 1].date)
            .map((item) => ({
              time: "",
              value: round(item.value, 1)
            }))
        }
      ]
    : [];

  const weeklySchedule = list.slice(-7).map((item) => ({
    label: formatShortDate(item.date),
    sleepStartHour: 0,
    wakeTimeHour: 0
  }));

  const monthlyData = groupSequentialWeeks(list).map((group, index) => ({
    label: `第${index + 1}周`,
    deepSleep: average(group.items.map((item) => item.deepSleep), 1),
    lightSleep: average(group.items.map((item) => item.lightSleep), 1),
    remSleep: average(group.items.map((item) => item.remSleep), 1)
  }));

  const monthlySchedule = groupSequentialWeeks(list).map((group) => ({
    label: group.label,
    sleepStartHour: 0,
    wakeTimeHour: 0
  }));

  const averageDuration = average(list.map((item) => item.sleep), 1);
  const earlierHalf = list.slice(0, Math.floor(list.length / 2));
  const laterHalf = list.slice(Math.floor(list.length / 2));
  const earlierAverage = average(earlierHalf.map((item) => item.sleep), 1);
  const laterAverage = average(laterHalf.map((item) => item.sleep), 1);
  const compareMinutes = Math.round((laterAverage - earlierAverage) * 60);
  const compareText =
    !earlierHalf.length || !laterHalf.length
      ? "样本不足"
      : compareMinutes === 0
        ? "较前一阶段持平"
        : `较前一阶段${compareMinutes > 0 ? "增加" : "减少"}${Math.abs(compareMinutes)}分钟`;

  return {
    list,
    dailyTimeline,
    weeklySummary: {
      averageSleepTime: "--:--",
      averageWakeTime: "--:--"
    },
    weeklySchedule,
    monthlySummary: {
      averageDuration: formatDurationHours(averageDuration),
      compareText,
      averageSleepTime: "--:--",
      averageWakeTime: "--:--"
    },
    monthlyData,
    monthlySchedule
  };
}

// ─── 基于总览接口的健康数据总览 ────────────────────────

/**
 * 通过总览接口 + 各指标趋势接口加载健康数据总览
 * 优先使用 GET /app/health/metrics/overview 获取最新值，
 * 再通过 GET /app/health/metrics/{metricKey}/trend 获取趋势数据
 */
export async function loadHealthDataOverviewSource() {
  try {
    // 先尝试通过总览接口获取最新数据
    const overview = await getHealthMetricsOverview();

    // 并行获取各指标趋势数据（与详情页保持一致，请求 30 天）
    const trendResults = await Promise.allSettled(
      ALL_METRICS.map(async (metricKey) => {
        const response = await getHealthMetricTrend(metricKey, { days: 30 });
        return { metricKey, trend: response };
      })
    );


    const trendMap = new Map<HealthMetricKey, TrendDataPoint[]>();
    for (const result of trendResults) {
      if (result.status === "fulfilled") {
        trendMap.set(result.value.metricKey, result.value.trend.list);
      }
    }

    // 从趋势数据构建行数据
    const rowMap = new Map<
      string,
      Partial<{
        steps: number;
        sleep: number;
        weight: number;
        heartRate: number;
        bloodSugar: number;
        bloodPressure: string;
        oxygen: number;
        stress: number;
      }>
    >();

    const ensureRow = (date: string) => {
      const row = rowMap.get(date) ?? {};
      rowMap.set(date, row);
      return row;
    };

    // 从各指标趋势数据填充行
    for (const [metricKey, trendList] of trendMap.entries()) {
      for (const point of trendList) {
        const row = ensureRow(point.date);

        switch (metricKey) {
          case "steps":
            row.steps = Math.round(point.value);
            break;
          case "heartRate":
            row.heartRate = Math.round(point.value);
            break;
          case "sleep":
            row.sleep = round(point.value, 1);
            break;
          case "weight":
            row.weight = round(point.value, 1);
            break;
          case "bloodSugar":
            row.bloodSugar = round(point.value, 1);
            break;
          case "bloodPressure":
            row.bloodPressure = `${point.systolic ?? Math.round(point.value)}/${point.diastolic ?? 0}`;
            break;
          case "oxygen":
            row.oxygen = Math.round(point.value);
            break;
          case "stress":
            row.stress = Math.round(point.value);
            break;
        }
      }
    }

    // 将总览接口中的今日最新数据合并到 rowMap 中
    // 总览接口返回的是最新值（可能是今日），趋势接口可能不包含今日数据
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const todayRow = ensureRow(todayKey);

    for (const item of overview.list) {
      if (item.value === null) continue;

      switch (item.metricKey) {
        case "steps":
          todayRow.steps = Math.round(item.value);
          break;
        case "heartRate":
          todayRow.heartRate = Math.round(item.value);
          break;
        case "sleep":
          todayRow.sleep = round(item.value, 1);
          break;
        case "weight":
          todayRow.weight = round(item.value, 1);
          break;
        case "bloodSugar":
          todayRow.bloodSugar = round(item.value, 1);
          break;
        case "bloodPressure": {
          const displayValue = typeof item.displayValue === "string" ? item.displayValue : "";
          todayRow.bloodPressure = displayValue || `${item.value}/0`;
          break;
        }
        case "oxygen":
          todayRow.oxygen = Math.round(item.value);
          break;
        case "stress":
          todayRow.stress = Math.round(item.value);
          break;
      }
    }

    const sortedDates = [...rowMap.keys()].sort();
    const list = sortedDates.map((date, index) => {
      const previous = index > 0 ? rowMap.get(sortedDates[index - 1]) : undefined;
      const current = rowMap.get(date) ?? {};

      return {
        date,
        steps: Math.round(current.steps ?? previous?.steps ?? 0),
        sleep: round(current.sleep ?? previous?.sleep ?? 0, 1),
        weight: round(current.weight ?? previous?.weight ?? 0, 1),
        heartRate: Math.round(current.heartRate ?? previous?.heartRate ?? 0),
        bloodSugar: round(current.bloodSugar ?? previous?.bloodSugar ?? 0, 1),
        bloodPressure: current.bloodPressure ?? previous?.bloodPressure ?? "0/0",
        oxygen: Math.round(current.oxygen ?? previous?.oxygen ?? 0),
        stress: Math.round(current.stress ?? previous?.stress ?? 0)
      };
    });

    return {
      list: list.slice(-10)
    };

  } catch {
    // fallback: 使用原有的基于记录的方式
    const bundle = await loadMetricRecordsBundle(ALL_METRICS);
    const stepsSource = buildStepsSource(bundle.measurementsByMetric.steps);
    const heartRateSource = buildHeartRateSource(bundle.measurementsByMetric.heartRate);
    const sleepSource = buildSleepSource(bundle.measurementsByMetric.sleep);
    const weightSource = buildWeightSource(
      bundle.measurementsByMetric.weight,
      bundle.devices.find((item) => item.type === "SMART_SCALE") ?? null
    );
    const bloodGlucoseSource = buildBloodGlucoseSource(bundle.measurementsByMetric.bloodSugar);
    const bloodPressureSource = buildBloodPressureSource(bundle.measurementsByMetric.bloodPressure);
    const oxygenSource = buildOxygenSource(bundle.measurementsByMetric.oxygen);
    const stressSource = buildStressSource(bundle.measurementsByMetric.stress);

    const rowMap = new Map<
      string,
      Partial<{
        steps: number;
        sleep: number;
        weight: number;
        heartRate: number;
        bloodSugar: number;
        bloodPressure: string;
        oxygen: number;
        stress: number;
      }>
    >();

    const ensureRow = (date: string) => {
      const row = rowMap.get(date) ?? {};
      rowMap.set(date, row);
      return row;
    };

    for (const item of stepsSource.list) {
      ensureRow(item.date).steps = item.steps;
    }

    for (const item of heartRateSource.list) {
      ensureRow(item.date).heartRate = item.heartRate;
    }

    for (const item of sleepSource.list) {
      ensureRow(item.date).sleep = item.sleep;
    }

    for (const item of weightSource.list) {
      ensureRow(item.date).weight = item.weight;
    }

    for (const item of bloodGlucoseSource.list) {
      ensureRow(item.date).bloodSugar = item.bloodSugar;
    }

    for (const item of bloodPressureSource.list) {
      ensureRow(item.date).bloodPressure = `${item.systolic}/${item.diastolic}`;
    }

    for (const item of oxygenSource.list) {
      ensureRow(item.date).oxygen = item.oxygen;
    }

    for (const item of stressSource.list) {
      ensureRow(item.date).stress = item.stress;
    }

    const sortedDates = [...rowMap.keys()].sort();
    const list = sortedDates.map((date, index) => {
      const previous = index > 0 ? rowMap.get(sortedDates[index - 1]) : undefined;
      const current = rowMap.get(date) ?? {};

      return {
        date,
        steps: Math.round(current.steps ?? previous?.steps ?? 0),
        sleep: round(current.sleep ?? previous?.sleep ?? 0, 1),
        weight: round(current.weight ?? previous?.weight ?? 0, 1),
        heartRate: Math.round(current.heartRate ?? previous?.heartRate ?? 0),
        bloodSugar: round(current.bloodSugar ?? previous?.bloodSugar ?? 0, 1),
        bloodPressure: current.bloodPressure ?? previous?.bloodPressure ?? "0/0",
        oxygen: Math.round(current.oxygen ?? previous?.oxygen ?? 0),
        stress: Math.round(current.stress ?? previous?.stress ?? 0)
      };
    });

    return {
      list: list.slice(-10)
    };
  }
}

// ─── 基于趋势接口的单项加载函数 ────────────────────────

/**
 * 加载步数数据（优先使用趋势接口）
 */
export async function loadStepsSource() {
  try {
    const response = await getHealthMetricTrend("steps", { days: 30 });
    return buildStepsSourceFromTrend(response.list);
  } catch {
    const bundle = await loadMetricRecordsBundle(["steps"]);
    return buildStepsSource(bundle.measurementsByMetric.steps);
  }
}

/**
 * 加载心率数据（优先使用趋势接口）
 */
export async function loadHeartRateSource() {
  try {
    const response = await getHealthMetricTrend("heartRate", { days: 30 });
    return buildHeartRateSourceFromTrend(response.list);
  } catch {
    const bundle = await loadMetricRecordsBundle(["heartRate"]);
    return buildHeartRateSource(bundle.measurementsByMetric.heartRate);
  }
}

/**
 * 加载体重数据（优先使用趋势接口）
 */
export async function loadWeightSource() {
  try {
    const response = await getHealthMetricTrend("weight", { days: 30 });
    return buildWeightSourceFromTrend(response.list);
  } catch {
    const bundle = await loadMetricRecordsBundle(["weight"]);
    return buildWeightSource(
      bundle.measurementsByMetric.weight,
      bundle.devices.find((item) => item.type === "SMART_SCALE") ?? null
    );
  }
}

/**
 * 加载血糖数据（优先使用趋势接口）
 */
export async function loadBloodGlucoseSource() {
  try {
    const response = await getHealthMetricTrend("bloodSugar", { days: 30 });
    return buildBloodGlucoseSourceFromTrend(response.list);
  } catch {
    const bundle = await loadMetricRecordsBundle(["bloodSugar"]);
    return buildBloodGlucoseSource(bundle.measurementsByMetric.bloodSugar);
  }
}

/**
 * 加载血压数据（优先使用趋势接口）
 */
export async function loadBloodPressureSource() {
  try {
    const response = await getHealthMetricTrend("bloodPressure", { days: 30 });
    return buildBloodPressureSourceFromTrend(response.list);
  } catch {
    const bundle = await loadMetricRecordsBundle(["bloodPressure"]);
    return buildBloodPressureSource(bundle.measurementsByMetric.bloodPressure);
  }
}

/**
 * 加载血氧数据（优先使用趋势接口）
 */
export async function loadOxygenSource() {
  try {
    const response = await getHealthMetricTrend("oxygen", { days: 30 });
    return buildOxygenSourceFromTrend(response.list);
  } catch {
    const bundle = await loadMetricRecordsBundle(["oxygen"]);
    return buildOxygenSource(bundle.measurementsByMetric.oxygen);
  }
}

/**
 * 加载压力数据（优先使用趋势接口）
 */
export async function loadStressSource() {
  try {
    const response = await getHealthMetricTrend("stress", { days: 30 });
    return buildStressSourceFromTrend(response.list);
  } catch {
    const bundle = await loadMetricRecordsBundle(["stress"]);
    return buildStressSource(bundle.measurementsByMetric.stress);
  }
}

/**
 * 加载睡眠数据（优先使用趋势接口）
 */
export async function loadSleepSource() {
  try {
    const response = await getHealthMetricTrend("sleep", { days: 30 });
    return buildSleepSourceFromTrend(response.list);
  } catch {
    const bundle = await loadMetricRecordsBundle(["sleep"]);
    return buildSleepSource(bundle.measurementsByMetric.sleep);
  }
}

