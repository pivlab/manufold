<script setup lang="ts">
import { useTemplateRef } from "vue";

type Props = {
  design?: "primary" | "secondary";
  active?: boolean;
};

const { design = "secondary", active = false } = defineProps<Props>();

const element = useTemplateRef("element");

defineExpose({ element });
</script>

<template>
  <button
    ref="element"
    class="relative min-h-8 min-w-8! rounded-full border-2"
    :class="[
      active ? 'border-current' : 'border-transparent',
      design === 'primary'
        ? 'bg-primary text-white hover:bg-slate-700'
        : 'text-primary hover:text-slate-700',
    ]"
  >
    <slot />
  </button>
</template>

<style scoped>
@reference "tailwindcss";

button:has(span) {
  @apply px-3;
}
</style>
