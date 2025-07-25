// Mock for Next.js Image component
import React from 'react';

const MockNextImage = ({ src, alt, ...props }) => {
  return React.createElement('img', {
    src,
    alt,
    ...props,
    'data-testid': 'next-image'
  });
};

module.exports = MockNextImage;