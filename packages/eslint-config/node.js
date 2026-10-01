// Node.js variant — no React/DOM globals.
import base from './index.js';
import globals from 'globals';

export default [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
