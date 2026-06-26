module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'bash -c "tsc --noEmit"'],
  '*.{json,md,yml}': ['prettier --write'],
}
