<script setup lang="ts">
import { computed, useTemplateRef } from "vue";

type Props = {
  title: string;
  styles: string;
  body: string;
};

const { title, styles, body } = defineProps<Props>();

const element = useTemplateRef("element");

const src = computed(
  () => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>${styles}</style>
  </head>
  <body>${body}</body>
</html>
`,
);

defineExpose({ element, src });
</script>

<template>
  <iframe ref="element" :srcdoc="src" />
</template>
