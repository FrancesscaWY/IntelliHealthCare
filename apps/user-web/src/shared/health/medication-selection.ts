import type { MedicationItem } from "@/shared/api/health";

const STORAGE_KEY = "ihc:health:selected-medication";

export type StoredMedicationSelection = Pick<
  MedicationItem,
  "medicationId" | "name" | "dosage" | "frequency" | "mealTiming" | "scheduleTimes"
>;

function hasSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isStoredMedicationSelection(value: unknown): value is StoredMedicationSelection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.medicationId === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.dosage === "string" &&
    typeof candidate.frequency === "string" &&
    (typeof candidate.mealTiming === "string" || candidate.mealTiming === null) &&
    Array.isArray(candidate.scheduleTimes) &&
    candidate.scheduleTimes.every((time) => typeof time === "string")
  );
}

export function setSelectedMedication(medication: MedicationItem) {
  if (!hasSessionStorage()) {
    return;
  }

  const payload: StoredMedicationSelection = {
    medicationId: medication.medicationId,
    name: medication.name,
    dosage: medication.dosage,
    frequency: medication.frequency,
    mealTiming: medication.mealTiming,
    scheduleTimes: medication.scheduleTimes
  };

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function getSelectedMedication() {
  if (!hasSessionStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!isStoredMedicationSelection(parsed)) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearSelectedMedication() {
  if (!hasSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
}
