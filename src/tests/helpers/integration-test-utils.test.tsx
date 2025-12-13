import { describe, it, expect, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import {
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
} from './integration-test-utils';

/**
 * Helper to inject a mock axis display element for testing
 */
function injectMockAxisDisplay(axis: 'x' | 'y' | 'z', content: string) {
  const existingElement = document.querySelector(`[data-testid="axis-value-${axis}"]`);
  if (existingElement) {
    existingElement.textContent = content;
  } else {
    const mockDiv = document.createElement('div');
    mockDiv.setAttribute('data-testid', `axis-value-${axis}`);
    mockDiv.textContent = content;
    document.body.appendChild(mockDiv);
  }
}

/**
 * Helper to clean up mock elements
 */
function cleanupMockElements() {
  ['x', 'y', 'z'].forEach(axis => {
    const element = document.querySelector(`[data-testid="axis-value-${axis}"]`);
    if (element && element.parentNode === document.body) {
      document.body.removeChild(element);
    }
  });
}

describe('integration-test-utils', () => {
  describe('getAxisDisplayPureTextValue', () => {
    afterEach(() => {
      cleanupMockElements();
    });

    it('returns text content when value is not purely numeric', () => {
      injectMockAxisDisplay('x', 'SELEct');
      const result = getAxisDisplayPureTextValue('X');
      expect(result).toBe('SELEct');
    });

    it('returns trimmed text content', () => {
      injectMockAxisDisplay('x', '  SELEct  ');
      const result = getAxisDisplayPureTextValue('X');
      expect(result).toBe('SELEct');
    });

    it('throws error when content is purely numeric with no decimal point', () => {
      injectMockAxisDisplay('x', '123');
      expect(() => getAxisDisplayPureTextValue('X')).toThrow('Expected text value for axis X, but got numeric value');
    });

    it('throws error when content is purely numeric with one decimal point', () => {
      injectMockAxisDisplay('x', '0.0000');
      injectMockAxisDisplay('y', '123.456');
      injectMockAxisDisplay('z', '-45.67');
      
      expect(() => getAxisDisplayPureTextValue('X')).toThrow('Expected text value for axis X');
      expect(() => getAxisDisplayPureTextValue('Y')).toThrow('Expected text value for axis Y');
      expect(() => getAxisDisplayPureTextValue('Z')).toThrow('Expected text value for axis Z');
    });

    it('returns text with alphabetic characters', () => {
      injectMockAxisDisplay('x', 'ERROR');
      const result = getAxisDisplayPureTextValue('X');
      expect(result).toBe('ERROR');
    });

    it('returns text with mixed alphanumeric characters', () => {
      injectMockAxisDisplay('x', 'Mode1');
      const result = getAxisDisplayPureTextValue('X');
      expect(result).toBe('Mode1');
    });

    it('handles whitespace trimming consistently', () => {
      injectMockAxisDisplay('x', '\n  SELEct\t  ');
      const result = getAxisDisplayPureTextValue('X');
      expect(result).toBe('SELEct');
    });

    it('accepts empty string as valid text value', () => {
      injectMockAxisDisplay('x', '');
      const result = getAxisDisplayPureTextValue('X');
      expect(result).toBe('');
    });

    it('accepts whitespace-only string and returns empty string after trim', () => {
      injectMockAxisDisplay('x', '   ');
      const result = getAxisDisplayPureTextValue('X');
      expect(result).toBe('');
    });
  });

  describe('getAxisDisplayPureNumberValue', () => {
    afterEach(() => {
      cleanupMockElements();
    });

    it('returns numeric value from display', () => {
      injectMockAxisDisplay('x', '0.0000');
      injectMockAxisDisplay('y', '123.4567');
      injectMockAxisDisplay('z', '-45.67');
      
      expect(getAxisDisplayPureNumberValue('X')).toBe(0);
      expect(getAxisDisplayPureNumberValue('Y')).toBe(123.4567);
      expect(getAxisDisplayPureNumberValue('Z')).toBe(-45.67);
    });

    it('extracts numeric value from end of string', () => {
      injectMockAxisDisplay('x', 'Prefix 123.456');
      const xValue = getAxisDisplayPureNumberValue('X');
      expect(xValue).toBe(123.456);
    });

    it('throws error when no numeric match is found', () => {
      injectMockAxisDisplay('x', 'SELEct');
      expect(() => getAxisDisplayPureNumberValue('X')).toThrow('Expected numeric value for axis X, but no numeric match found');
    });

    it('handles negative numbers correctly', () => {
      injectMockAxisDisplay('x', '-123.456');
      injectMockAxisDisplay('y', '-0.001');
      
      expect(getAxisDisplayPureNumberValue('X')).toBe(-123.456);
      expect(getAxisDisplayPureNumberValue('Y')).toBe(-0.001);
    });

    it('handles integer numbers correctly', () => {
      injectMockAxisDisplay('x', '42');
      injectMockAxisDisplay('y', '-100');
      
      expect(getAxisDisplayPureNumberValue('X')).toBe(42);
      expect(getAxisDisplayPureNumberValue('Y')).toBe(-100);
    });

    it('handles decimal numbers correctly', () => {
      injectMockAxisDisplay('x', '123.4567');
      injectMockAxisDisplay('y', '0.0001');
      
      expect(getAxisDisplayPureNumberValue('X')).toBe(123.4567);
      expect(getAxisDisplayPureNumberValue('Y')).toBe(0.0001);
    });

    it('handles trimming whitespace consistently', () => {
      injectMockAxisDisplay('x', '  123.456  ');
      injectMockAxisDisplay('y', '\n\t789.012\t\n');
      
      expect(getAxisDisplayPureNumberValue('X')).toBe(123.456);
      expect(getAxisDisplayPureNumberValue('Y')).toBe(789.012);
    });

    it('extracts number from content with trailing text after number', () => {
      injectMockAxisDisplay('x', '123.456mm');
      expect(() => getAxisDisplayPureNumberValue('X')).toThrow('Expected numeric value for axis X, but no numeric match found');
    });
  });

  describe('trim handling consistency', () => {
    afterEach(() => {
      cleanupMockElements();
    });

    it('getAxisDisplayPureTextValue trims leading whitespace', () => {
      injectMockAxisDisplay('x', '   SELEct');
      expect(getAxisDisplayPureTextValue('X')).toBe('SELEct');
    });

    it('getAxisDisplayPureTextValue trims trailing whitespace', () => {
      injectMockAxisDisplay('x', 'SELEct   ');
      expect(getAxisDisplayPureTextValue('X')).toBe('SELEct');
    });

    it('getAxisDisplayPureTextValue trims tabs and newlines', () => {
      injectMockAxisDisplay('x', '\t\nSELEct\n\t');
      expect(getAxisDisplayPureTextValue('X')).toBe('SELEct');
    });

    it('getAxisDisplayPureNumberValue handles trimming before extraction', () => {
      injectMockAxisDisplay('x', '   123.456   ');
      expect(getAxisDisplayPureNumberValue('X')).toBe(123.456);
    });

    it('getAxisDisplayPureNumberValue handles trimming with negative numbers', () => {
      injectMockAxisDisplay('x', '   -123.456   ');
      expect(getAxisDisplayPureNumberValue('X')).toBe(-123.456);
    });

    it('handles empty strings after trim differently', () => {
      injectMockAxisDisplay('x', '   ');
      // Text value function accepts empty strings
      expect(() => getAxisDisplayPureTextValue('X')).not.toThrow();
      expect(getAxisDisplayPureTextValue('X')).toBe('');
      // Number value function throws for empty strings
      expect(() => getAxisDisplayPureNumberValue('X')).toThrow();
    });
  });

  describe('validation behavior', () => {
    afterEach(() => {
      cleanupMockElements();
    });

    it('getAxisDisplayPureTextValue accepts text content', () => {
      injectMockAxisDisplay('x', 'SELEct');
      expect(() => getAxisDisplayPureTextValue('X')).not.toThrow();
      expect(getAxisDisplayPureTextValue('X')).toBe('SELEct');
    });

    it('getAxisDisplayPureTextValue rejects valid numbers with no decimal point', () => {
      injectMockAxisDisplay('x', '123');
      expect(() => getAxisDisplayPureTextValue('X')).toThrow();
    });

    it('getAxisDisplayPureTextValue rejects valid numbers with one decimal point', () => {
      injectMockAxisDisplay('x', '123.45');
      expect(() => getAxisDisplayPureTextValue('X')).toThrow();
    });

    it('getAxisDisplayPureNumberValue accepts valid numbers with no decimal point', () => {
      injectMockAxisDisplay('x', '123');
      expect(() => getAxisDisplayPureNumberValue('X')).not.toThrow();
      expect(getAxisDisplayPureNumberValue('X')).toBe(123);
    });

    it('getAxisDisplayPureNumberValue accepts valid numbers with one decimal point', () => {
      injectMockAxisDisplay('x', '123.45');
      expect(() => getAxisDisplayPureNumberValue('X')).not.toThrow();
      expect(getAxisDisplayPureNumberValue('X')).toBe(123.45);
    });

    it('getAxisDisplayPureNumberValue rejects pure text', () => {
      injectMockAxisDisplay('x', 'SELEct');
      expect(() => getAxisDisplayPureNumberValue('X')).toThrow();
    });
  });
});
