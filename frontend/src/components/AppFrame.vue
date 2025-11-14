<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue";
import { useDebounce } from "@vueuse/core";

type Props = {
  title: string;
  styles: string;
  body: string;
  modify?: (html: Document) => Document;
};

const { title, styles, body, modify = undefined } = defineProps<Props>();

const element = useTemplateRef("element");

/** html src */
const rawSrc = computed(
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

/** throttle updates */
const debouncedSrc = useDebounce(rawSrc, 100, { maxWait: 500 });

/** scroll y */
const scroll = ref(0);

/** save scroll */
watch(
  debouncedSrc,
  () => (scroll.value = element.value?.contentWindow?.scrollY || 0),
);

/** restore scroll */
const restoreScroll = () =>
  element.value?.contentWindow?.scrollTo(0, scroll.value);

/** run parsed src through provided func */
const modifiedSrc = computed(() => {
  if (!modify) return debouncedSrc.value;
  const parser = new DOMParser();
  const document = parser.parseFromString(debouncedSrc.value, "text/html");
  return modify(document).documentElement.outerHTML;
});

defineExpose({ element, src: modifiedSrc });
</script>

<template>
  <iframe ref="element" :srcdoc="modifiedSrc" @load="restoreScroll" />
</template>
