import type { InlineTextChange } from './types';

export interface TruncateTextChangeOptions {
  maxLength?: number;
  ellipsis?: string;
}

const DEFAULT_MAX_LENGTH = 32;
const DEFAULT_ELLIPSIS = '...';

function truncateText(text: string, maxLength: number, ellipsis: string): string | undefined {
  if (text.length <= maxLength) {
    return undefined;
  }

  if (maxLength <= ellipsis.length) {
    return ellipsis.slice(0, maxLength);
  }

  return `${text.slice(0, maxLength - ellipsis.length)}${ellipsis}`;
}

export function truncateTextChange(
  oldText: string,
  newText: string,
  options: TruncateTextChangeOptions = {},
): InlineTextChange {
  const maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  const ellipsis = options.ellipsis ?? DEFAULT_ELLIPSIS;
  const truncatedOldText = truncateText(oldText, maxLength, ellipsis);
  const truncatedNewText = truncateText(newText, maxLength, ellipsis);

  return {
    oldText,
    newText,
    truncatedOldText,
    truncatedNewText,
    isTruncated: truncatedOldText !== undefined || truncatedNewText !== undefined,
  };
}