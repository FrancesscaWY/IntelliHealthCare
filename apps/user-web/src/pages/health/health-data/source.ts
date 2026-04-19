const STORAGE_KEY = "ihc:health-data:back-target";

export function setHealthDataBackTarget(target: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, target);
}

export function peekHealthDataBackTarget() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem(STORAGE_KEY) || "";
}

export function takeHealthDataBackTarget() {
  if (typeof window === "undefined") {
    return "";
  }

  const target = window.sessionStorage.getItem(STORAGE_KEY) || "";
  window.sessionStorage.removeItem(STORAGE_KEY);
  return target;
}
