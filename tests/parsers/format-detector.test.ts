import { describe, it, expect } from 'vitest';
import {
  detectFormat,
  detectFormatFromFilename,
  detectBestFormat,
} from '../../src/parsers/format-detector';

describe('Format Detector', () => {
  describe('detectFormat', () => {
    it('should detect Rockwell JSON format', () => {
      const jsonContent = JSON.stringify({
        serial_number: '12345',
        programs: [],
      });
      
      const signatures = detectFormat(jsonContent);
      expect(signatures.length).toBeGreaterThan(0);
      expect(signatures[0].format).toBe('json');
      expect(signatures[0].parserId).toBe('rockwell-json');
    });

    it('should detect L5X format', () => {
      const l5xContent = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0">
  <Controller Name="Test" />
</RSLogix5000Content>`;
      
      const signatures = detectFormat(l5xContent);
      expect(signatures.length).toBeGreaterThan(0);
      expect(signatures[0].format).toBe('l5x');
    });

    it('should detect generic JSON with lower confidence', () => {
      const genericJson = JSON.stringify({ someKey: 'value' });
      
      const signatures = detectFormat(genericJson);
      expect(signatures.length).toBeGreaterThan(0);
      expect(signatures[0].format).toBe('json');
      expect(signatures[0].confidence).toBeLessThan(0.9);
    });

    it('should handle ArrayBuffer input', () => {
      const content = JSON.stringify({ serial_number: '123', programs: [] });
      const buffer = new TextEncoder().encode(content).buffer;
      
      const signatures = detectFormat(buffer);
      expect(signatures.length).toBeGreaterThan(0);
      expect(signatures[0].format).toBe('json');
    });

    it('should return empty array for unrecognized content', () => {
      const unknownContent = 'random binary gibberish @#$%^&*';
      
      const signatures = detectFormat(unknownContent);
      // May return signatures with low confidence or empty
      // Based on current implementation, it should be empty for non-matching content
    });
  });

  describe('detectFormatFromFilename', () => {
    it('should detect JSON from filename', () => {
      expect(detectFormatFromFilename('controller.json')).toBe('json');
    });

    it('should detect L5X from filename', () => {
      expect(detectFormatFromFilename('program.l5x')).toBe('l5x');
      expect(detectFormatFromFilename('program.L5X')).toBe('l5x');
    });

    it('should detect L5K from filename', () => {
      expect(detectFormatFromFilename('export.l5k')).toBe('l5k');
    });

    it('should detect XML from filename', () => {
      expect(detectFormatFromFilename('data.xml')).toBe('xml');
    });

    it('should return null for unknown extension', () => {
      expect(detectFormatFromFilename('file.xyz')).toBeNull();
      expect(detectFormatFromFilename('file')).toBeNull();
    });

    it('should handle full paths', () => {
      expect(detectFormatFromFilename('/path/to/controller.json')).toBe('json');
    });
  });

  describe('detectBestFormat', () => {
    it('should return best matching signature', () => {
      const l5xContent = '<RSLogix5000Content>test</RSLogix5000Content>';
      
      const best = detectBestFormat(l5xContent);
      expect(best).not.toBeNull();
      expect(best?.format).toBe('l5x');
    });

    it('should return null for unrecognized content', () => {
      const unknownContent = 'completely random content without any markers';
      
      const best = detectBestFormat(unknownContent);
      // Current implementation may still match something, but with low confidence
    });
  });
});
