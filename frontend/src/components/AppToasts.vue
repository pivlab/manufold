<script setup lang="ts">
import { X } from "lucide-vue-next";
import { toasts, types } from "./AppToasts";
</script>

<template>
  <TransitionGroup
    class="absolute right-2 bottom-2 flex flex-col gap-4"
    role="region"
    aria-label="Notifications"
    name="toasts"
    tag="div"
  >
    <div
      v-for="toast in toasts"
      :key="toast.value.id"
      class="flex max-w-80 items-center gap-2 rounded border border-slate-300 bg-white p-4"
      role="alert"
    >
      <component
        :is="types[toast.value.type].icon"
        class="h-5 w-5"
        :class="types[toast.value.type].class"
      />
      <span class="flex-1" v-html="toast.value.message" />
      <button
        class="hover:text-primary h-5 w-5 text-slate-500"
        aria-label="Close"
        @click="toast.value.close"
      >
        <X />
      </button>
    </div>
  </TransitionGroup>
</template>

<style scoped>
@reference "tailwindcss";

.toasts-move,
.toasts-enter-active,
.toasts-leave-active {
  @apply transition-all duration-250;
}

.toasts-enter-from,
.toasts-leave-to {
  @apply translate-x-full;
}
</style>
