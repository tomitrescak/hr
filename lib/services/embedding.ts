import { OpenAI } from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Generate embedding for a competency name using OpenAI's embedding API
 * @param text - The competency name to generate embedding for
 * @returns Promise<number[]> - The embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // More cost-effective than text-embedding-3-large
      input: text.trim(),
    })

    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw new Error(`Failed to generate embedding for text: ${text}`)
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * @param embedding1 - First embedding vector
 * @param embedding2 - Second embedding vector
 * @returns number - Similarity score between 0 and 1 (1 being most similar)
 */
export function calculateCosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have the same dimensions')
  }

  // Calculate dot product
  let dotProduct = 0
  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i]
  }

  // Calculate magnitudes
  let magnitude1 = 0
  let magnitude2 = 0
  for (let i = 0; i < embedding1.length; i++) {
    magnitude1 += embedding1[i] * embedding1[i]
    magnitude2 += embedding2[i] * embedding2[i]
  }

  magnitude1 = Math.sqrt(magnitude1)
  magnitude2 = Math.sqrt(magnitude2)

  // Avoid division by zero
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0
  }

  // Calculate cosine similarity
  const similarity = dotProduct / (magnitude1 * magnitude2)
  
  // Ensure the result is between 0 and 1 (convert from [-1, 1] range)
  return (similarity + 1) / 2
}

/**
 * Find similar competencies based on embedding similarity
 * @param targetEmbedding - The embedding to compare against
 * @param competencyEmbeddings - Array of competencies with their embeddings
 * @param threshold - Minimum similarity threshold (default 0.75)
 * @returns Array of similar competencies sorted by similarity (highest first)
 */
export function findSimilarCompetencies(
  targetEmbedding: number[],
  competencyEmbeddings: Array<{
    id: string
    name: string
    type: string
    description?: string
    embedding: number[]
  }>,
  threshold: number = 0.75
): Array<{
  id: string
  name: string
  type: string
  description?: string
  similarity: number
  embedding: number[]
}> {
  const similarities = competencyEmbeddings
    .map((competency) => ({
      id: competency.id,
      name: competency.name,
      type: competency.type,
      description: competency.description,
      similarity: calculateCosineSimilarity(targetEmbedding, competency.embedding),
      embedding: competency.embedding,
    }))
    .filter((result) => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity) // Sort by similarity (highest first)

  return similarities
}
