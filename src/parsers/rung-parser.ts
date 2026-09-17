import type {
  BranchGroup,
  Instruction,
  ParsedRung,
  RungElement,
  RungParseDiagnostic,
  RungSourceSpan,
  RungToken,
  RungTokenKind,
} from '../types';
import { getInstructionCategory, isBranchGroup } from '../types';

const SINGLE_CHARACTER_TOKENS: Record<string, RungTokenKind> = {
  '(': 'open-paren',
  ')': 'close-paren',
  '[': 'open-bracket',
  ']': 'close-bracket',
  '{': 'open-brace',
  '}': 'close-brace',
  ',': 'comma',
  ';': 'semicolon',
};

const EXPECTED_CLOSER: Partial<Record<RungTokenKind, RungTokenKind>> = {
  'open-paren': 'close-paren',
  'open-bracket': 'close-bracket',
  'open-brace': 'close-brace',
};

/** Convert rung text into source-located lexical tokens. */
export function tokenizeRung(source: string): RungToken[] {
  const tokens: RungToken[] = [];
  let position = 0;

  while (position < source.length) {
    if (/\s/.test(source[position])) {
      position++;
      continue;
    }

    const start = position;
    const singleKind = SINGLE_CHARACTER_TOKENS[source[position]];
    if (singleKind) {
      position++;
      tokens.push({ kind: singleKind, value: source.slice(start, position), span: { start, end: position } });
      continue;
    }

    if (/[A-Z_]/i.test(source[position])) {
      position++;
      while (/[A-Z0-9_]/i.test(source[position] ?? '')) position++;
      tokens.push({ kind: 'identifier', value: source.slice(start, position), span: { start, end: position } });
      continue;
    }

    if (source[position] === '"' || source[position] === "'") {
      const quote = source[position++];
      let terminated = false;
      while (position < source.length) {
        if (source[position] === '\\' || source[position] === '$') {
          position += Math.min(2, source.length - position);
          continue;
        }
        if (source[position] === quote) {
          position++;
          terminated = true;
          break;
        }
        position++;
      }
      tokens.push({
        kind: 'string',
        value: source.slice(start, position),
        span: { start, end: position },
        terminated,
      });
      continue;
    }

    position++;
    while (
      position < source.length
      && !/\s/.test(source[position])
      && !SINGLE_CHARACTER_TOKENS[source[position]]
      && !/[A-Z_]/i.test(source[position])
      && source[position] !== '"'
      && source[position] !== "'"
    ) {
      position++;
    }
    tokens.push({ kind: 'raw', value: source.slice(start, position), span: { start, end: position } });
  }

  return tokens;
}

class RungGrammarParser {
  private position = 0;
  private readonly tokens: RungToken[];
  private readonly diagnostics: RungParseDiagnostic[] = [];

  constructor(private readonly source: string) {
    this.tokens = tokenizeRung(source);
  }

  parse(): ParsedRung {
    const elements = this.parseElements(new Set());
    return {
      elements,
      instructions: flattenElements(elements),
      diagnostics: this.diagnostics,
    };
  }

  private parseElements(stopKinds: ReadonlySet<RungTokenKind>): RungElement[] {
    const elements: RungElement[] = [];

    while (this.current) {
      if (stopKinds.has(this.current.kind)) break;
      if (this.current.kind === 'semicolon') {
        this.position++;
        continue;
      }
      if (this.current.kind === 'open-bracket') {
        elements.push(this.parseBranch());
        continue;
      }
      if (this.current.kind === 'identifier') {
        elements.push(this.parseInstruction());
        continue;
      }

      const token = this.current;
      this.addDiagnostic(
        'RLL_UNEXPECTED_TOKEN',
        `Unexpected rung token ${JSON.stringify(token.value)}.`,
        token.span
      );
      this.position++;
    }

    return elements;
  }

  private parseBranch(): BranchGroup {
    const start = this.current!.span.start;
    this.position++;
    const branches: RungElement[][] = [];
    let closed = false;

    while (this.current) {
      branches.push(this.parseElements(new Set(['comma', 'close-bracket'])));
      if (this.current?.kind === 'comma') {
        this.position++;
        continue;
      }
      if (this.current?.kind === 'close-bracket') {
        this.position++;
        closed = true;
      }
      break;
    }

    if (!closed) {
      this.addDiagnostic(
        'RLL_UNTERMINATED_BRANCH',
        'Expected "]" before the end of the rung.',
        { start, end: this.source.length }
      );
    }

    const end = this.previous?.span.end ?? start + 1;
    return {
      type: 'branch',
      branches,
      source: this.source.slice(start, end),
      sourceSpan: { start, end },
    };
  }

  private parseInstruction(): Instruction {
    const mnemonicToken = this.current!;
    const mnemonic = mnemonicToken.value;
    const start = mnemonicToken.span.start;
    this.position++;

    if (this.current?.kind !== 'open-paren') {
      const end = mnemonicToken.span.end;
      this.addDiagnostic(
        'RLL_EXPECTED_OPEN_PAREN',
        `Expected "(" after instruction ${JSON.stringify(mnemonic)}.`,
        { start, end }
      );
      return this.instruction(mnemonic, [], [], start, end);
    }

    const openingParen = this.current;
    this.position++;
    let operandStart = openingParen.span.end;
    const operands: string[] = [];
    const operandSpans: RungSourceSpan[] = [];
    const delimiterStack: RungTokenKind[] = [];

    while (this.current) {
      const token = this.current;

      if (token.kind === 'string' && token.terminated === false) {
        this.addDiagnostic(
          'RLL_UNTERMINATED_STRING',
          `Expected ${JSON.stringify(token.value[0])} before the end of the rung.`,
          token.span
        );
        this.position++;
        continue;
      }

      const closer = EXPECTED_CLOSER[token.kind];
      if (closer) {
        delimiterStack.push(closer);
        this.position++;
        continue;
      }

      if (delimiterStack.length > 0 && token.kind === delimiterStack[delimiterStack.length - 1]) {
        delimiterStack.pop();
        this.position++;
        continue;
      }

      if (token.kind === 'comma' && delimiterStack.length === 0) {
        this.pushOperand(operands, operandSpans, operandStart, token.span.start);
        this.position++;
        operandStart = token.span.end;
        continue;
      }

      if (token.kind === 'close-paren' && delimiterStack.length === 0) {
        this.pushOperand(operands, operandSpans, operandStart, token.span.start);
        this.position++;
        return this.instruction(mnemonic, operands, operandSpans, start, token.span.end);
      }

      if (token.kind.startsWith('close-')) {
        const expectedKind = delimiterStack.at(-1) ?? 'close-paren';
        const expected = this.tokenValue(expectedKind);
        this.pushOperand(operands, operandSpans, operandStart, token.span.start);
        this.addDiagnostic(
          'RLL_MISMATCHED_DELIMITER',
          `Expected ${JSON.stringify(expected)} before ${JSON.stringify(token.value)}.`,
          token.span
        );
        this.position++;
        return this.instruction(mnemonic, operands, operandSpans, start, token.span.end);
      }

      this.position++;
    }

    this.pushOperand(operands, operandSpans, operandStart, this.source.length);
    this.addDiagnostic(
      'RLL_UNTERMINATED_INSTRUCTION',
      `Expected ")" before the end of instruction ${JSON.stringify(mnemonic)}.`,
      { start, end: this.source.length }
    );
    return this.instruction(mnemonic, operands, operandSpans, start, this.source.length);
  }

  private instruction(
    mnemonic: string,
    operands: string[],
    operandSpans: RungSourceSpan[],
    start: number,
    end: number
  ): Instruction {
    return {
      mnemonic,
      operands,
      category: getInstructionCategory(mnemonic),
      source: this.source.slice(start, end),
      sourceSpan: { start, end },
      operandSpans,
    };
  }

  private pushOperand(
    operands: string[],
    spans: RungSourceSpan[],
    untrimmedStart: number,
    untrimmedEnd: number
  ): void {
    let start = untrimmedStart;
    let end = untrimmedEnd;
    while (start < end && /\s/.test(this.source[start])) start++;
    while (end > start && /\s/.test(this.source[end - 1])) end--;
    if (start === end) return;
    operands.push(this.source.slice(start, end));
    spans.push({ start, end });
  }

  private tokenValue(kind: RungTokenKind): string {
    return Object.entries(SINGLE_CHARACTER_TOKENS).find(([, candidate]) => candidate === kind)?.[0] ?? kind;
  }

  private addDiagnostic(
    code: RungParseDiagnostic['code'],
    message: string,
    span: RungSourceSpan
  ): void {
    this.diagnostics.push({ code, message, span });
  }

  private get current(): RungToken | undefined {
    return this.tokens[this.position];
  }

  private get previous(): RungToken | undefined {
    return this.tokens[this.position - 1];
  }
}

function flattenElements(elements: RungElement[]): Instruction[] {
  const instructions: Instruction[] = [];
  for (const element of elements) {
    if (isBranchGroup(element)) {
      for (const branch of element.branches) instructions.push(...flattenElements(branch));
    } else {
      instructions.push(element);
    }
  }
  return instructions;
}

function compatibilityElements(elements: RungElement[]): RungElement[] {
  return elements.map((element) => {
    if (isBranchGroup(element)) {
      return {
        type: 'branch',
        branches: element.branches.map(compatibilityElements),
      };
    }
    return {
      mnemonic: element.mnemonic,
      operands: element.operands,
      category: element.category,
    };
  });
}

/** Parse a rung with source spans and recovery diagnostics. */
export function parseRungDetailed(rungString: string): ParsedRung {
  return new RungGrammarParser(rungString).parse();
}

/** Parse a raw rung into a flat, backward-compatible instruction list. */
export function parseRung(rungString: string): Instruction[] {
  return flattenElements(compatibilityElements(parseRungDetailed(rungString).elements));
}

/** Parse a raw rung while preserving backward-compatible branch structure. */
export function parseRungWithBranches(rungString: string): RungElement[] {
  return compatibilityElements(parseRungDetailed(rungString).elements);
}

export function parseRungs(rungs: string[]): Instruction[][] {
  return rungs.map(parseRung);
}
