/*
 * @Description: 
 * @Author: liufeng
 * @Date: 2026-07-10 15:03:36
 * @LastEditors: liufeng
 * @LastEditTime: 2026-07-13 09:15:13
 */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});