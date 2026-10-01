import config from '@fastfood/eslint-config/node';

export default [
  ...config,
  { ignores: ['dist/**', '.fastfood-controller/**'] },
  {
    // Test files intentionally use non-null assertions when asserting
    // controller state after known-successful transitions.
    files: ['src/tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },
];
