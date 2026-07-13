<template>
  <div id="app">
    <AppLayout>
      <router-view />
    </AppLayout>
  </div>
</template>

<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue';
</script>

<style>
#app {
  min-height: 100vh;
}
</style>
