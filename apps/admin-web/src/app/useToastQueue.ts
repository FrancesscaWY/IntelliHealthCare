import { ref } from "vue";

export interface ToastItem {
  id: number;
  message: string;
}

export function useToastQueue() {
  const items = ref<ToastItem[]>([]);
  let seed = 0;

  const dismissToast = (id: number) => {
    items.value = items.value.filter((item) => item.id !== id);
  };

  const showToast = (message: string) => {
    const id = seed += 1;
    items.value = [...items.value, { id, message }];

    window.setTimeout(() => {
      dismissToast(id);
    }, 1800);
  };

  return {
    items,
    showToast,
  };
}
