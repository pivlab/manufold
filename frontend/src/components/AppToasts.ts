import { ref } from "vue";
import {
  CircleAlert,
  CircleCheck,
  Info,
  Loader2,
  TriangleAlert,
} from "lucide-vue-next";

/** toast types */
export const types = {
  loading: {
    icon: Loader2,
    class: "animate-spin text-gray-500",
  },
  info: {
    icon: Info,
    class: "text-sky-500",
  },
  success: {
    icon: CircleCheck,
    class: "text-green-500",
  },
  warning: {
    icon: CircleAlert,
    class: "text-amber-500",
  },
  error: {
    icon: TriangleAlert,
    class: "text-rose-500",
  },
};

/** toast props */
type Toast = { id: number; message: string; type: keyof typeof types };

/** current toasts */
export const toasts = ref<Toast[]>([]);

/** create toast */
export const toast = (message: string, type: Toast["type"] = "info") => {
  const id = Date.now();
  toasts.value.push({ id, message, type });
  const duration = 2000 + message.length * 50;
  const removeToast = () =>
    (toasts.value = toasts.value.filter((toast) => toast.id !== id));
  window.setTimeout(removeToast, duration);
  return removeToast;
};
