<template>
  <svg viewBox="-1 -1 2 2" class="overflow-visible">
    <line
      v-for="([a, b], index) in links"
      :key="index"
      stroke="currentColor"
      :stroke-width="size / 3"
      :x1="a.x"
      :y1="a.y"
      :x2="b.x"
      :y2="b.y"
      path-length="1"
      class="animate"
      :style="{
        animationDuration: duration + 's',
        animationDelay: linkDelay + a.d * stagger + 's',
      }"
    />
    <circle
      v-for="({ x, y, d }, index) in points"
      :key="index"
      fill="currentColor"
      :r="size"
      :cx="x"
      :cy="y"
      class="animate"
      :style="{
        animationDuration: duration + 's',
        animationDelay: d * stagger + 's',
      }"
    />
  </svg>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";
import { useIntervalFn } from "@vueuse/core";
import { range } from "lodash";
import PoissonDiskSampling from "poisson-disk-sampling";

/** dot size */
const size = 0.1;
/** spacing (as multiple of size) */
const spacing = 4;
/** min dist between generated points */
const minDistance = size * spacing;
/** max dist between generated points */
const maxDistance = size * (spacing + 1);
/** max dist at which points will be linked */
const linkDistance = size * (spacing + 2);
/** animation duration */
const duration = 1;
/** delay between successive animations */
const stagger = 1;
/** how much link animation delayed after point animation */
const linkDelay = 0.25;

const dist = (ax: number, ay: number, bx = 0, by = 0) =>
  Math.hypot(ax - bx, ay - by);

type Point = { x: number; y: number; d: number };

const points = ref<Point[]>([]);
const links = ref<[Point, Point][]>([]);

/** start new animation */
const animate = async () => {
  /** reset options */
  points.value = [];
  links.value = [];

  /** wait for previous dom nodes to unmount so animations restart */
  await nextTick();

  /** generate evenly spaced random points in a circle */
  points.value = new PoissonDiskSampling({
    /** generate in [0, 2] */
    shape: [2, 2],
    minDistance,
    maxDistance,
    tries: 10,
  })
    .fill()
    .map(([x, y]) => ({
      /** shift to [-1, 1] */
      x: x! - 1,
      y: y! - 1,
      /** calc dist to center */
      d: dist(x! - 1, y! - 1),
    }))
    /** make circle */
    .filter(({ d }) => d <= 1)
    /** order by dist to center */
    .sort((a, b) => a.d - b.d);

  /** link close points together */
  const indices = range(points.value.length);
  for (const ai of indices)
    for (const bi of indices) {
      /** avoid doubling links (a->b and b->a) */
      if (bi > ai) {
        const a = points.value[ai]!;
        const b = points.value[bi]!;
        if (dist(a.x, a.y, b.x, b.y) < linkDistance) links.value.push([a, b]);
      }
    }
};

/** periodically animate */
animate();
useIntervalFn(animate, (duration + stagger) * 1000);
</script>

<style scoped>
circle.animate {
  animation: pulse both linear;
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes pulse {
  0% {
    scale: 0;
  }

  50% {
    scale: 1;
  }

  100% {
    scale: 0;
  }
}

line.animate {
  animation: draw both linear;
  stroke-dasharray: 1 1;
}

@keyframes draw {
  0% {
    stroke-dashoffset: 3;
  }

  100% {
    stroke-dashoffset: 1;
  }
}
</style>
