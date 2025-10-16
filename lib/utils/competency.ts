/**
 * Competency types that support proficiency levels
 */
export const PROFICIENCY_SUPPORTING_TYPES = ['SKILL', 'TECH_TOOL', 'ABILITY', 'KNOWLEDGE'] as const

/**
 * Type definition for competency types that support proficiency
 */
export type ProficiencySupportingType = typeof PROFICIENCY_SUPPORTING_TYPES[number]

/**
 * All competency types
 */
export type CompetencyType = 'KNOWLEDGE' | 'SKILL' | 'TECH_TOOL' | 'ABILITY' | 'VALUE' | 'BEHAVIOUR' | 'ENABLER'

/**
 * Checks if a competency type supports proficiency levels
 * @param type The competency type to check
 * @returns True if the type supports proficiency levels
 */
export function supportsProficiency(type: CompetencyType): boolean {
  return PROFICIENCY_SUPPORTING_TYPES.includes(type as ProficiencySupportingType)
}

/**
 * Checks if a competency type supports proficiency levels (type guard)
 * @param type The competency type to check
 * @returns True if the type supports proficiency levels, with type narrowing
 */
export function isProficiencySupportingType(type: CompetencyType): type is ProficiencySupportingType {
  return PROFICIENCY_SUPPORTING_TYPES.includes(type as ProficiencySupportingType)
}