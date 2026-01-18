// Shim to force Metro to load the CommonJS build of zustand, which avoids import.meta usage
export * from 'zustand/index.js';
export { default } from 'zustand/index.js';
