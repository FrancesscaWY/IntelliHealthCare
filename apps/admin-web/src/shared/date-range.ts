export function extractDatePart(value: string | null | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  return trimmed.length >= 10 ? trimmed.slice(0, 10) : "";
}

export function deriveDateRange(
  values: Array<string | null | undefined>,
  fallbackDays = 30
) {
  const dates = values
    .map((value) => extractDatePart(value))
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right));

  if (dates.length > 0) {
    return {
      start: dates[0] ?? "",
      end: dates[dates.length - 1] ?? dates[0] ?? ""
    };
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - Math.max(fallbackDays - 1, 0));

  return {
    start: formatDateInput(startDate),
    end: formatDateInput(endDate)
  };
}

function formatDateInput(value: Date) {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0")
  ].join("-");
}
