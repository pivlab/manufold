<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue";

type Props = {
  title: string;
  styles: string;
  stylesheets: string[];
  body: string;
};

const { title, styles, stylesheets, body } = defineProps<Props>();
const element = useTemplateRef("element");

/** html src */
const src = computed(
  () => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>${styles}</style>
    ${stylesheets.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
  </head>
  <body>${body}</body>
</html>
`,
);

/** scroll y */
const scroll = ref(0);

/** save scroll */
watch(src, () => (scroll.value = element.value?.contentWindow?.scrollY || 0));

/** restore scroll */
const restoreScroll = () =>
  element.value?.contentWindow?.scrollTo(0, scroll.value);

defineExpose({ element, src });
</script>

<template>
  <iframe ref="element" :srcdoc="src" @load="restoreScroll" />
</template>
