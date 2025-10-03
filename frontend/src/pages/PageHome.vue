<script setup lang="ts">
import { useTemplateRef } from "vue";
import { Download, Lightbulb, Printer, Upload } from "lucide-vue-next";
import logo from "@/assets/logo.svg";
import AppBrain from "@/components/AppBrain.vue";
import AppButton from "@/components/AppButton.vue";

const { VITE_TITLE } = import.meta.env;

const inputElement = useTemplateRef("inputElement");
const outputElement = useTemplateRef("outputElement");
</script>

<template>
  <header
    class="bg-secondary border-primary flex flex-wrap items-center justify-between gap-4 border-b-1 p-4"
  >
    <div class="flex flex-wrap items-center gap-2">
      <AppButton v-tooltip="'Upload'"><Upload /></AppButton>
      <AppButton v-tooltip="'Example'"><Lightbulb /></AppButton>
    </div>

    <div
      class="text-primary relative flex items-center gap-4 text-2xl uppercase"
    >
      <img :src="logo" class="h-10" />
      <span>{{ VITE_TITLE }}</span>
      <AppBrain class="absolute inset-0 left-[calc(100%+1rem)] h-10" />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <AppButton v-tooltip="'Download'"><Download /></AppButton>
      <AppButton v-tooltip="'Print'"><Printer /></AppButton>
    </div>
  </header>

  <main class="flex grow gap-4 p-4">
    <textarea
      ref="inputElement"
      class="w-[50%] resize-x rounded-lg border-1 border-black/25 p-4"
    />

    <div
      ref="outputElement"
      class="grow rounded-lg border-black/25 bg-gray-50 p-4"
    />
  </main>
</template>
