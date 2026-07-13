<template>
  <Teleport to="body">
    <div v-if="visible" class="toast" :class="type">
      <span>{{ message }}</span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { visible, message, type } from './Toast';
</script>

<style scoped>
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  z-index: 9999;
  animation: slideDown 0.3s ease;
  box-shadow: var(--shadow-lg);
}

.toast.success {
  background: var(--color-success);
  color: white;
}

.toast.error {
  background: var(--color-error);
  color: white;
}

.toast.info {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-mask);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}

.modal-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-light);
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.modal-body {
  padding: var(--spacing-lg);
}

.modal-body p {
  color: var(--text-secondary);
  line-height: var(--line-height-normal);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-light);
}
</style>
