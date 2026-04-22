import dietRecordMock, { type DietRecordDay } from "../mock";

export type HistoryViewKey = "day" | "month" | "year";

export interface HistoryViewOption {
  key: HistoryViewKey;
  label: string;
}

export interface HistoryDayCell {
  key: string;
  label: string;
  dateId: string | null;
  isRecorded: boolean;
}

export interface HistoryMonth {
  id: string;
  year: number;
  month: number;
  label: string;
  shortLabel: string;
  recordCount: number;
  cells: HistoryDayCell[];
}

export interface HistoryMonthOption {
  id: string;
  year: number;
  month: number;
  label: string;
  shortLabel: string;
  hasRecords: boolean;
  recordCount: number;
}

export interface HistoryYearSummary {
  value: number;
  label: string;
  monthCount: number;
  recordCount: number;
}

function padMonth(value: number) {
  return String(value).padStart(2, "0");
}

function createBlankCell(key: string): HistoryDayCell {
  return {
    key,
    label: "",
    dateId: null,
    isRecorded: false,
  };
}

export function createHistoryData(days: DietRecordDay[] = dietRecordMock.days) {
  const recordDays = days
    .map((item) => ({
      id: item.id,
      calories: item.totalCalories,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const recordDaySet = new Set(recordDays.map((item) => item.id));
  const monthIds = Array.from(new Set(recordDays.map((item) => item.id.slice(0, 7)))).sort();

  function createMonth(monthId: string): HistoryMonth {
    const [yearText, monthText] = monthId.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const totalDays = new Date(year, month, 0).getDate();
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const cells: HistoryDayCell[] = [];

    for (let index = 0; index < firstWeekday; index += 1) {
      cells.push(createBlankCell(`${monthId}-leading-${index}`));
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const dateId = `${monthId}-${String(day).padStart(2, "0")}`;
      cells.push({
        key: dateId,
        label: String(day),
        dateId,
        isRecorded: recordDaySet.has(dateId),
      });
    }

    const trailingCount = (7 - (cells.length % 7)) % 7;
    for (let index = 0; index < trailingCount; index += 1) {
      cells.push(createBlankCell(`${monthId}-trailing-${index}`));
    }

    return {
      id: monthId,
      year,
      month,
      label: `${year}年${month}月`,
      shortLabel: `${month}月`,
      recordCount: cells.filter((item) => item.isRecorded).length,
      cells,
    };
  }

  const months = monthIds.map(createMonth);
  const yearValues = Array.from(new Set(months.map((item) => item.year))).sort((left, right) => left - right);

  const years: HistoryYearSummary[] = yearValues.map((year) => {
    const yearMonths = months.filter((item) => item.year === year);
    return {
      value: year,
      label: `${year}年`,
      monthCount: yearMonths.length,
      recordCount: yearMonths.reduce((total, item) => total + item.recordCount, 0),
    };
  });

  const monthOptions: HistoryMonthOption[] = yearValues.flatMap((year) =>
    Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const id = `${year}-${padMonth(month)}`;
      const matched = months.find((item) => item.id === id);

      return {
        id,
        year,
        month,
        label: `${year}年${month}月`,
        shortLabel: `${month}月`,
        hasRecords: Boolean(matched),
        recordCount: matched?.recordCount ?? 0,
      };
    }),
  );

  return {
    title: "历史数据",
    weekLabels: ["日", "一", "二", "三", "四", "五", "六"],
    viewOptions: [
      { key: "day", label: "日视图" },
      { key: "month", label: "月视图" },
      { key: "year", label: "年视图" },
    ] as HistoryViewOption[],
    years,
    months,
    monthOptions,
    selectedDateId: recordDays[recordDays.length - 1]?.id ?? "",
  };
}

const mock = createHistoryData();

export default mock;
