import { ref } from "vue";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-vue-next";

/** toast types */
export const types = {
  info: {
    icon: Info,
    color: "text-sky-500",
  },
  success: {
    icon: CircleCheck,
    color: "text-green-500",
  },
  warning: {
    icon: CircleAlert,
    color: "text-amber-500",
  },
  error: {
    icon: TriangleAlert,
    color: "text-rose-500",
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
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }, duration);
};
