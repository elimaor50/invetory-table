import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
dotenv.config()

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/invetory-table/',
  plugins: [react()],
})
