import {defineConfig} from '@playwright/test';
// Native Metal avoids Chromium headless's CPU-only SwiftShader fallback on macOS.
const launchOptions={...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),...(process.platform==='darwin'?{args:['--enable-gpu','--use-angle=metal']}:{})};
export default defineConfig({testDir:'tests/browser',use:{baseURL:process.env.PLAYWRIGHT_BASE_URL??'http://127.0.0.1:5174',launchOptions,viewport:{width:1440,height:1100}},workers:1});
