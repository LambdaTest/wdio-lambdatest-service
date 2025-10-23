module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings'
  ],
  env: {
    node: true,
    es6: true
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 2025,
    sourceType: 'module',
    requireConfigFile: false,
    babelOptions: {
      configFile: './babel.config.js'
    }
  },
  rules: {
    'import/no-unresolved': [2, { commonjs: true, amd: true }],
    'import/named': 2,
    'import/namespace': 2,
    'import/default': 2,
    'import/export': 2,
    'eqeqeq': ['error', 'always'],
    'prefer-const': ['error', {
      'destructuring': 'any',
      'ignoreReadBeforeAssign': false
    }],
    'no-unused-vars': ['error', { 
      'vars': 'all', 
      'args': 'after-used', 
      'ignoreRestSiblings': false 
    }],
    'no-multiple-empty-lines': [2, { 'max': 1, 'maxEOF': 1 }],
    'array-bracket-spacing': ['error', 'never'],
    camelcase: ['error', { properties: 'never' }],
    'comma-spacing': ['error', { before: false, after: true }],
    'no-lonely-if': 'error',
    'no-else-return': 'error',
    'no-tabs': 'error',
    'unicode-bom': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'require-atomic-updates': 0
  }
}
