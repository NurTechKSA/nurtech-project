export default {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-recess-order'],
  rules: {
    'no-empty-source': null,
    'selector-class-pattern': null,
    'property-no-vendor-prefix': [
      true,
      { ignoreProperties: ['-webkit-text-size-adjust'] },
    ],
  },
};
