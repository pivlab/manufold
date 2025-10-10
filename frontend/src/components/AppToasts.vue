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
      :key="toast.id"
      class="flex items-center gap-2 rounded-lg border-1 border-black/10 bg-white p-4 shadow-lg"
      role="alert"
    >
      <component
        :is="types[toast.type].icon"
        class="h-5 w-5"
        :class="types[toast.type].color"
      />
      <span class="flex-1">{{ toast.message }}</span>
      <button
        class="h-5 w-5 text-gray-500 hover:text-gray-900"
        aria-label="Close"
        @click="toasts = toasts.filter((t) => t.id !== toast.id)"
      >
        <X />
      </button>
    </div>
  </TransitionGroup>
</template>

<style scoped>
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
