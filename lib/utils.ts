import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Remove markdown formatting symbols from text
 * @param text - The text to clean
 * @returns Text with markdown symbols removed
 */
export function removeMarkdown(text: string): string {
  return text
    // Remove headers (# ## ### etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic (**text**, *text*, __text__, _text_)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Remove strikethrough (~~text~~)
    .replace(/~~(.*?)~~/g, '$1')
    // Remove inline code (`code`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove links [text](url)
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
    // Remove horizontal rules
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Truncate text to a specified character limit with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum character length (default: 150)
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number = 150, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text
  }
  
  // Find the last space before the limit to avoid cutting words
  const truncated = text.substring(0, maxLength - suffix.length)
  const lastSpaceIndex = truncated.lastIndexOf(' ')
  
  // If we found a space and it's not too close to the beginning, cut there
  if (lastSpaceIndex > maxLength * 0.7) {
    return truncated.substring(0, lastSpaceIndex) + suffix
  }
  
  // Otherwise, hard cut at the character limit
  return truncated + suffix
}

/**
 * Process course description by removing markdown and truncating
 * @param description - The raw description
 * @param maxLength - Maximum character length (default: 150)
 * @returns Processed description ready for display
 */
export function processCourseDescription(description: string | null | undefined, maxLength: number = 150): string {
  if (!description) {
    return ''
  }
  
  const cleanText = removeMarkdown(description)
  return truncateText(cleanText, maxLength)
}
