export { onRequestPost } from './analyze.js';

// Mark dependencies as external
export const config = {
  bundle: {
    external: [
      '@google/generative-ai',
      'pdf-parse',
      'node-fetch',
    ],
  },
}; 