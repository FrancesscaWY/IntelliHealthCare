import { ref } from "vue";

export interface ToastItem {
  id: number;
  message: string;
}

const items = ref<ToastItem[]>([]);
let seed = 0;

function dismissToast(id: number) {
  items.value = items.value.filter((item) => item.id !== id);
}

function showToast(message: string) {
  const id = seed += 1;
  items.value = [...items.value, { id, message }];

  window.setTimeout(() => {
    dismissToast(id);
  }, 1800);
}

export function useToastQueue() {
  return {
    items,
    showToast,
  };
}
