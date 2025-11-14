<script setup lang="ts">
import { ref, useTemplateRef, watchEffect } from "vue";
import draggable from "vuedraggable";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/vue";
import { Plus, X } from "lucide-vue-next";
import { sleep } from "@/util/misc";

type Tab = {
  name: string;
};

type Props = {
  tabs: Tab[];
  modelValue: number;
};

const { tabs, modelValue } = defineProps<Props>();

type Emits = {
  "update:modelValue": [number];
  add: [];
  close: [number];
  reorder: [from: number, to: number];
  rename: [index: number, name: string];
};

const emit = defineEmits<Emits>();

watchEffect(() => {
  if (tabs.length === 0) emit("update:modelValue", 0);
  else if (modelValue > tabs.length - 1)
    emit("update:modelValue", tabs.length - 1);
  else if (modelValue < 0) emit("update:modelValue", 0);
});

const add = async () => {
  emit("add");
  await sleep();
  emit("update:modelValue", tabs.length - 1);
  startRename(tabs.length - 1);
};

const reorder = ({
  oldIndex,
  newIndex,
}: {
  oldIndex: number;
  newIndex: number;
}) => emit("reorder", oldIndex, newIndex);

const renaming = ref(-1);

const input = useTemplateRef("input");

const startRename = async (index: number) => {
  renaming.value = index;
  await sleep();
  input.value?.focus();
  await sleep();
  input.value?.select();
};

const finishRename = () => {
  emit("rename", renaming.value, input.value?.value ?? "");
  renaming.value = -1;
};
</script>

<template>
  <TabGroup
    :selected-index="modelValue"
    @change="(index) => $emit('update:modelValue', index)"
  >
    <TabList class="flex flex-wrap items-center gap-2">
      <draggable
        :model-value="tabs"
        item-key="name"
        class="contents"
        handle=".handle"
        @update="reorder"
      >
        <template #item="{ element, index }: { element: Tab; index: number }">
          <Tab v-slot="{ selected }" as="template">
            <div
              class="flex cursor-pointer items-stretch border-b-2 transition-colors hover:bg-slate-100"
              :class="[selected ? 'border-primary' : 'border-slate-300']"
              @dblclick="startRename(index)"
            >
              <input
                v-if="renaming === index"
                ref="input"
                class="field-sizing-content border-none px-2! py-1! focus:outline-none"
                :defaultValue="element.name"
                @keydown.stop
                @mousedown.stop
                @mouseup.stop
                @click.stop
                @touchstart.stop
                @change="finishRename"
                @blur="finishRename"
              />
              <span
                v-else
                v-tooltip="'Drag to reorder. Double-click to rename.'"
                class="handle px-2 py-1"
                @mousedown.stop
                @touchstart.stop
                >{{ element.name }}</span
              >
              <button
                class="hover:text-primary px-1 text-slate-300"
                aria-label="Close tab"
                @mousedown.stop
                @touchstart.stop
                @click.stop="$emit('close', index)"
              >
                <X />
              </button>
            </div>
          </Tab>
        </template>
      </draggable>
      <button
        v-tooltip="'Add tab'"
        class="flex cursor-pointer items-center border-b-2 border-slate-300 p-2 transition-colors hover:bg-slate-100"
        @click="add"
      >
        <Plus />
      </button>
    </TabList>
    <TabPanels class="contents">
      <TabPanel v-for="(tab, index) in tabs" :key="index" class="contents">
        <slot :name="index" />
      </TabPanel>
    </TabPanels>
  </TabGroup>
</template>
