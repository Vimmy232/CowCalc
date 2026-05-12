import { sanitizeNumericInput } from './utils.js';

export function testSanitizeNumericInput({ assertEquals }) {
  // Happy paths
  assertEquals(sanitizeNumericInput('123'), '123', 'Should keep numeric strings');
  assertEquals(sanitizeNumericInput(456), '456', 'Should convert numbers to strings');
  assertEquals(sanitizeNumericInput(0), '0', 'Should handle the number 0 correctly');

  // Mixed characters
  assertEquals(sanitizeNumericInput('12a3b'), '123', 'Should remove alphabetic characters');
  assertEquals(sanitizeNumericInput('12.3'), '123', 'Should remove dots (only digits allowed)');
  assertEquals(sanitizeNumericInput('1,000'), '1000', 'Should remove commas');
  assertEquals(sanitizeNumericInput('$100'), '100', 'Should remove currency symbols');

  // Edge cases
  assertEquals(sanitizeNumericInput(''), '', 'Should handle empty string');
  assertEquals(sanitizeNumericInput(null), '', 'Should handle null');
  assertEquals(sanitizeNumericInput(undefined), '', 'Should handle undefined');

  // Special characters
  assertEquals(sanitizeNumericInput('!@#$%^&*()'), '', 'Should remove all special characters');
  assertEquals(sanitizeNumericInput('12-34'), '1234', 'Should remove hyphens');
  assertEquals(sanitizeNumericInput(' 12 34 '), '1234', 'Should remove spaces');
}
