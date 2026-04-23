import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages base path — يُحدّث تلقائياً بناءً على متغير البيئة
// للتطوير المحلي: base = '/'
// للنشر على GitHub Pages: base = '/smarats/' (غيّر الاسم لو المستودع اسمه مختلف)
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})
