<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(defineProps<{
  src?: string;
  name?: string;
  size?: number;
  alt?: string;
}>(), {
  src: "",
  name: "运营管理员",
  size: 40,
  alt: "登录用户头像",
});

const imageFailed = ref(false);

const initial = computed(() => {
  const normalizedName = props.name.trim();
  return normalizedName ? normalizedName.slice(0, 1) : "管";
});

const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  "--admin-avatar-size": `${props.size}px`,
}));

const shouldShowImage = computed(() => Boolean(props.src) && !imageFailed.value);

watch(
  () => props.src,
  () => {
    imageFailed.value = false;
  },
);
</script>

<template>
  <span class="admin-user-avatar" :style="avatarStyle">
    <img v-if="shouldShowImage" :src="src" :alt="alt" @error="imageFailed = true" />
    <span v-else class="admin-user-avatar__fallback" aria-hidden="true">{{ initial }}</span>
  </span>
</template>

<style scoped>
.admin-user-avatar {
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid rgba(198, 220, 214, 0.9);
  border-radius: 50%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.16), transparent 48%),
    linear-gradient(135deg, #16304a, #1f806f);
  color: #ffffff;
  box-shadow: 0 8px 18px rgba(31, 79, 89, 0.18);
}

.admin-user-avatar img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.admin-user-avatar__fallback {
  display: grid;
  place-items: center;
  width: calc(var(--admin-avatar-size) * 0.7);
  height: calc(var(--admin-avatar-size) * 0.7);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  color: #ffffff;
  font-size: max(12px, calc(var(--admin-avatar-size) * 0.38));
  font-weight: 900;
  line-height: 1;
}
</style>
