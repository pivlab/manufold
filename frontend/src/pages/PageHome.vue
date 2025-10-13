<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useStorage } from "@vueuse/core";
import {
  Code,
  Download,
  Lightbulb,
  Printer,
  Type,
  Upload,
} from "lucide-vue-next";
import { micromark } from "micromark";
import logo from "@/assets/logo.svg";
import AppBrain from "@/components/AppBrain.vue";
import AppButton from "@/components/AppButton.vue";
import AppUpload from "@/components/AppUpload.vue";
import styles from "@/styles.css?inline";
import { downloadHtml, downloadMd } from "@/util/download";
import example from "./example.md?raw";

const { VITE_TITLE } = import.meta.env;

/** elements */
const inputElement = useTemplateRef("inputElement");
const outputElement = useTemplateRef("outputElement");

/** current input */
const input = useStorage("input", "");

/** current output */
const output = computed(() => micromark(input.value));

/** save output as markdown */
const saveMd = () => downloadMd(output.value, "manuscript");

/** save output as html */
const saveHtml = () => {
  let content = outputElement.value?.outerHTML;
  if (!content) return;
  content = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>${styles}</style>
</head>
<body>
${content}
</body>
</html>
`;
  downloadHtml(content, "manuscript");
};

/** print output as pdf */
const savePdf = () => {
  outputElement.value?.classList.add("print");
  window.print();
  outputElement.value?.classList.remove("print");
};

/** upload file types */
const accept = [
  ".txt",
  ".md",
  ".pdf",
  ".doc",
  ".docx",
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/msword",
];
</script>

<template>
  <header
    class="bg-secondary border-primary flex flex-wrap items-center justify-between gap-4 border-b-1 p-4"
  >
    <div class="flex flex-wrap items-center gap-2">
      <AppUpload
        tooltip="Upload input file"
        :accept="accept"
        :drop-zone="inputElement"
        @files="(files) => files[0] && (input = files[0].text ?? '')"
      >
        <Upload />
      </AppUpload>
      <AppButton v-tooltip="'Try example input'" @click="input = example">
        <Lightbulb />
      </AppButton>
    </div>

    <div
      class="text-primary relative flex items-center gap-4 text-2xl uppercase"
    >
      <img :src="logo" class="h-10" />
      <span>{{ VITE_TITLE }}</span>
      <AppBrain class="absolute inset-0 left-[calc(100%+1rem)] h-10" />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <VDropdown>
        <AppButton v-tooltip="'Download output'">
          <Download />
        </AppButton>

        <template #popper>
          <div class="flex flex-wrap items-center gap-2">
            <AppButton v-tooltip="'Markdown'" @click="saveMd">
              <Type />
            </AppButton>
            <AppButton v-tooltip="'HTML'" @click="saveHtml">
              <Code />
            </AppButton>
            <AppButton v-tooltip="'Print to PDF'" @click="savePdf">
              <Printer />
            </AppButton>
          </div>
        </template>
      </VDropdown>
    </div>
  </header>

  <main class="flex grow gap-4 p-4">
    <textarea
      ref="inputElement"
      v-model="input"
      placeholder="Start writing your manuscript Markdown here"
      class="w-[50%] shrink-0 resize-x rounded-lg border-1 border-gray-300 p-4"
    />

    <div
      ref="outputElement"
      class="flex flex-grow flex-col gap-4 rounded-lg border-1 border-gray-300 bg-gray-50 p-4"
      v-html="output"
    />
  </main>
</template>
