import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ParserRegistry,
  createParserRegistry,
  parserRegistry,
  PLCParser,
  ParseResult,
  createSuccessResult,
  createFailureResult,
  createParseError,
} from '../../src/parsers';
import type { NormalizedController } from '../../src/types/normalized';

/**
 * Mock parser for testing
 */
class MockParser implements PLCParser {
  readonly id = 'mock-parser';
  readonly name = 'Mock Parser';
  readonly supportedExtensions = ['.mock', '.test'];
  readonly supportedMimeTypes = ['application/x-mock'];

  canParse(input: string | ArrayBuffer): boolean {
    const content = typeof input === 'string' ? input : new TextDecoder().decode(input);
    return content.includes('MOCK_SIGNATURE');
  }

  parse(input: string | ArrayBuffer): ParseResult<NormalizedController> {
    const content = typeof input === 'string' ? input : new TextDecoder().decode(input);
    
    if (!this.canParse(content)) {
      return createFailureResult([createParseError('Not a mock file')]);
    }

    return createSuccessResult({
      name: 'Mock Controller',
      dataTypes: [],
      tags: [],
      programs: [],
      aois: [],
      modules: [],
      vendor: 'other',
      sourceFormat: 'other',
    });
  }
}

describe('ParserRegistry', () => {
  let registry: ParserRegistry;
  let mockParser: MockParser;

  beforeEach(() => {
    registry = createParserRegistry();
    mockParser = new MockParser();
  });

  describe('register', () => {
    it('should register a parser', () => {
      registry.register(mockParser);
      expect(registry.getParser('mock-parser')).toBe(mockParser);
    });

    it('should throw when registering duplicate parser ID', () => {
      registry.register(mockParser);
      expect(() => registry.register(mockParser)).toThrow('already registered');
    });
  });

  describe('unregister', () => {
    it('should unregister a parser', () => {
      registry.register(mockParser);
      expect(registry.unregister('mock-parser')).toBe(true);
      expect(registry.getParser('mock-parser')).toBeUndefined();
    });

    it('should return false for non-existent parser', () => {
      expect(registry.unregister('non-existent')).toBe(false);
    });
  });

  describe('getParser', () => {
    it('should return undefined for non-existent parser', () => {
      expect(registry.getParser('non-existent')).toBeUndefined();
    });
  });

  describe('getAllParsers', () => {
    it('should return all registered parsers', () => {
      registry.register(mockParser);
      const parsers = registry.getAllParsers();
      expect(parsers).toHaveLength(1);
      expect(parsers[0]).toBe(mockParser);
    });

    it('should return empty array when no parsers registered', () => {
      expect(registry.getAllParsers()).toHaveLength(0);
    });
  });

  describe('getParsersByExtension', () => {
    it('should find parsers by extension with dot', () => {
      registry.register(mockParser);
      const parsers = registry.getParsersByExtension('.mock');
      expect(parsers).toHaveLength(1);
    });

    it('should find parsers by extension without dot', () => {
      registry.register(mockParser);
      const parsers = registry.getParsersByExtension('mock');
      expect(parsers).toHaveLength(1);
    });

    it('should be case-insensitive', () => {
      registry.register(mockParser);
      const parsers = registry.getParsersByExtension('.MOCK');
      expect(parsers).toHaveLength(1);
    });
  });

  describe('getParsersByMimeType', () => {
    it('should find parsers by MIME type', () => {
      registry.register(mockParser);
      const parsers = registry.getParsersByMimeType('application/x-mock');
      expect(parsers).toHaveLength(1);
    });
  });

  describe('detectParser', () => {
    it('should detect parser from content', () => {
      registry.register(mockParser);
      const parser = registry.detectParser('MOCK_SIGNATURE content');
      expect(parser).toBe(mockParser);
    });

    it('should return null when no parser matches', () => {
      registry.register(mockParser);
      const parser = registry.detectParser('random content');
      expect(parser).toBeNull();
    });
  });

  describe('parse', () => {
    it('should parse using detected parser', () => {
      registry.register(mockParser);
      const result = registry.parse('MOCK_SIGNATURE content');
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Mock Controller');
    });

    it('should parse using specified parser ID', () => {
      registry.register(mockParser);
      const result = registry.parse('MOCK_SIGNATURE content', 'mock-parser');
      expect(result.success).toBe(true);
    });

    it('should fail when specified parser not found', () => {
      const result = registry.parse('content', 'non-existent');
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toContain('not found');
    });

    it('should fail when no parser matches content', () => {
      const result = registry.parse('random content');
      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toContain('Unable to detect');
    });
  });

  describe('utility methods', () => {
    it('should report hasAnyParsers correctly', () => {
      expect(registry.hasAnyParsers()).toBe(false);
      registry.register(mockParser);
      expect(registry.hasAnyParsers()).toBe(true);
    });

    it('should report size correctly', () => {
      expect(registry.size).toBe(0);
      registry.register(mockParser);
      expect(registry.size).toBe(1);
    });

    it('should clear all parsers', () => {
      registry.register(mockParser);
      registry.clear();
      expect(registry.size).toBe(0);
    });
  });
});

describe('Global Parser Registry', () => {
  it('should have JSON parser registered by default', () => {
    expect(parserRegistry.getParser('rockwell-json')).toBeDefined();
  });

  it('should be able to parse JSON content', () => {
    const jsonContent = JSON.stringify({
      serial_number: '12345',
      comm_path: 'path',
      sfc_execution_control: 'CurrentActive',
      sfc_restart_position: 'MostRecent',
      sfc_last_scan: 'DontScan',
      created_date: '2024-01-01',
      modified_date: '2024-01-02',
      data_types: [],
      tags: [],
      programs: [],
      aois: [],
      map_devices: [],
    });

    const result = parserRegistry.parse(jsonContent);
    expect(result.success).toBe(true);
    expect(result.data?.serialNumber).toBe('12345');
  });
});
