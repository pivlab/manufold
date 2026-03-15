import { ref, type Ref } from "vue";
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
    class: "animate-spin text-slate-500",
    durationMult: 100,
  },
  info: {
    icon: Info,
    class: "text-sky-500",
    durationMult: 2,
  },
  success: {
    icon: CircleCheck,
    class: "text-green-500",
    durationMult: 1,
  },
  warning: {
    icon: CircleAlert,
    class: "text-amber-500",
    durationMult: 2,
  },
  error: {
    icon: TriangleAlert,
    class: "text-rose-500",
    durationMult: 3,
  },
};

/** toast props */
type Toast = {
  id: string;
  message: string;
  type: keyof typeof types;
  close: () => void;
};

/** current toasts */
export const toasts = ref<Ref<Toast>[]>([]);

/** create toast */
export const toast = (
  message: string,
  type: Toast["type"] = "info",
  id?: Toast["id"],
) => {
  /** unique id for toast */
  id ??= String(Date.now());

  /** close toast */
  const close = () =>
    (toasts.value = toasts.value.filter((toast) => toast.value.id !== id));

  const toast = ref<Toast>({ id, message, type, close });

  /** add toast */
  toasts.value.push(toast);

  let timer: number;
  const autoClose = () => {
    /** time before auto-close */
    const duration =
      /** make longer for longer messages */
      (1000 + toast.value.message.length * 50) *
      /** make longer/shorter based on type/criticality */
      (types[toast.value.type]?.durationMult ?? 1);

    /** close after delay */
    window.clearTimeout(timer);
    timer = window.setTimeout(close, duration);
  };

  autoClose();

  /** update toast details */
  const update = (message: string, type: Toast["type"] = "info") => {
    toast.value.message = message;
    toast.value.type = type;
    autoClose();
  };

  return { close, update };
};
