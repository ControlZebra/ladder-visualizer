import type { Tag, DataType, ControllerExport, ParsedRoutine } from '../types';
import { parseRoutine } from './routine-parser';

/**
 * Tag usage information - which rungs reference a tag
 */
export interface TagUsage {
  tag: Tag;
  /** Array of [programIndex, routineIndex, rungIndex] tuples */
  usages: Array<{ programIndex: number; routineIndex: number; rungIndex: number }>;
}

/**
 * TagResolver provides lookup and cross-reference capabilities for tags.
 */
export class TagResolver {
  private tagMap: Map<string, Tag>;
  private dataTypeMap: Map<string, DataType>;
  private tagUsages: Map<string, TagUsage>;

  constructor(private controller: ControllerExport) {
    this.tagMap = new Map();
    this.dataTypeMap = new Map();
    this.tagUsages = new Map();

    this.buildTagMap();
    this.buildDataTypeMap();
    this.buildTagUsages();
  }

  private buildTagMap(): void {
    for (const tag of this.controller.tags) {
      this.tagMap.set(tag.name, tag);
    }
  }

  private buildDataTypeMap(): void {
    for (const dataType of this.controller.data_types) {
      this.dataTypeMap.set(dataType.name, dataType);
    }
  }

  private buildTagUsages(): void {
    // Initialize all tags with empty usages
    for (const tag of this.controller.tags) {
      this.tagUsages.set(tag.name, { tag, usages: [] });
    }

    // Scan all routines for tag references
    for (let pIdx = 0; pIdx < this.controller.programs.length; pIdx++) {
      const program = this.controller.programs[pIdx];
      for (let rIdx = 0; rIdx < program.routines.length; rIdx++) {
        const routine = program.routines[rIdx];
        const parsed = parseRoutine(routine);
        this.scanRoutineForTags(parsed, pIdx, rIdx);
      }
    }
  }

  private scanRoutineForTags(routine: ParsedRoutine, programIndex: number, routineIndex: number): void {
    for (let rungIdx = 0; rungIdx < routine.rungs.length; rungIdx++) {
      const rung = routine.rungs[rungIdx];
      for (const instruction of rung.instructions) {
        for (const operand of instruction.operands) {
          // Check if operand matches a known tag name
          const tagUsage = this.tagUsages.get(operand);
          if (tagUsage) {
            tagUsage.usages.push({
              programIndex,
              routineIndex,
              rungIndex: rungIdx,
            });
          }
        }
      }
    }
  }

  /**
   * Get a tag by name.
   */
  getTag(name: string): Tag | undefined {
    return this.tagMap.get(name);
  }

  /**
   * Get all tags.
   */
  getAllTags(): Tag[] {
    return Array.from(this.tagMap.values());
  }

  /**
   * Get a data type by name.
   */
  getDataType(name: string): DataType | undefined {
    return this.dataTypeMap.get(name);
  }

  /**
   * Get all data types.
   */
  getAllDataTypes(): DataType[] {
    return Array.from(this.dataTypeMap.values());
  }

  /**
   * Get the data type definition for a tag.
   */
  getTagDataType(tag: Tag): DataType | undefined {
    return this.dataTypeMap.get(tag.data_type);
  }

  /**
   * Get all usages for a tag.
   */
  getTagUsages(tagName: string): TagUsage | undefined {
    return this.tagUsages.get(tagName);
  }

  /**
   * Get tags that are used in at least one rung.
   */
  getUsedTags(): Tag[] {
    return Array.from(this.tagUsages.values())
      .filter((usage) => usage.usages.length > 0)
      .map((usage) => usage.tag);
  }

  /**
   * Get tags that are never referenced in any rung.
   */
  getUnusedTags(): Tag[] {
    return Array.from(this.tagUsages.values())
      .filter((usage) => usage.usages.length === 0)
      .map((usage) => usage.tag);
  }
}

/**
 * Create a TagResolver for a controller export.
 */
export function createTagResolver(controller: ControllerExport): TagResolver {
  return new TagResolver(controller);
}
