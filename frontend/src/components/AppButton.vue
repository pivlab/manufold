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
    class="relative min-h-10 min-w-10! rounded-full border-2 text-xl"
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
