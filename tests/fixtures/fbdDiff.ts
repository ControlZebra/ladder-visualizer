import type { NormalizedFBDBody } from '../../src/types';

/** Controlled comparison deltas on a parsed export fixture; not new parser compatibility evidence. */
export function changedFBDRevision(original: NormalizedFBDBody): NormalizedFBDBody {
  const newer = structuredClone(original);
  const sheet = newer.sheets[0];
  sheet.descriptions = ['Level control — revised feed and output'];
  const input = sheet.elements.find((element) => element.kind === 'reference');
  if (input?.kind === 'reference') input.operand = 'FlowIntoTank_Revised';
  const moved = sheet.elements.find((element) => element.id === '5');
  if (moved?.position) moved.position.x = String(Number(moved.position.x) + 100);
  const block = sheet.elements.find((element) => element.kind === 'block');
  if (block?.kind === 'block') block.operand = 'ADD_02';
  sheet.connections = sheet.connections.filter((_, index) => index !== 0);
  sheet.elements.push({
    kind: 'text-box',
    id: '100',
    position: { x: '500', y: '550' },
    width: '200',
    text: 'Check revised feed connection',
  });
  sheet.attachments.push({ fromElementId: '100', toElementId: '2' });
  return newer;
}
