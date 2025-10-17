#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { generateEmbedding } from '../lib/services/embedding'

const prisma = new PrismaClient()

async function testSimilaritySearch() {
  console.log('🔍 Testing competency similarity search...')
  
  try {
    // Check if there are competencies with pgvector embeddings
    const embeddingCount = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM "competency_embeddings" 
      WHERE "embeddings" IS NOT NULL
    `) as [{ count: bigint }]

    const totalEmbeddings = Number(embeddingCount[0].count)
    if (totalEmbeddings === 0) {
      console.log('❌ No competencies with pgvector embeddings found. Run populate-pgvector-embeddings.ts first.')
      return
    }

    console.log(`📊 Found ${totalEmbeddings} competencies with pgvector embeddings`)

    // Test queries
    const testQueries = [
      'JavaScript programming',
      'React development',
      'Database design',
      'Machine Learning',
      'Project management',
      'Communication skills'
    ]

    for (const query of testQueries) {
      console.log(`\n🔍 Testing query: "${query}"`)
      
      try {
        // Generate embedding for test query
        const targetEmbedding = await generateEmbedding(query)
        const vectorString = `[${targetEmbedding.join(',')}]`

        // Use pgvector for similarity search with 75% threshold
        const similarCompetencies = await prisma.$queryRawUnsafe(`
          SELECT 
            c.id, 
            c.name, 
            c.type, 
            c.description,
            1 - (ce.embeddings <=> $1::vector) AS similarity
          FROM "competencies" c
          INNER JOIN "competency_embeddings" ce ON c.id = ce."competencyId"
          WHERE 
            c."isDraft" = false AND
            ce.embeddings IS NOT NULL AND
            1 - (ce.embeddings <=> $1::vector) >= 0.75
          ORDER BY similarity DESC
          LIMIT 10
        `, vectorString) as Array<{
          id: string
          name: string
          type: string
          description: string | null
          similarity: number
        }>

        if (similarCompetencies.length === 0) {
          console.log('   📭 No similar competencies found above 75% threshold')
        } else {
          console.log(`   ✅ Found ${similarCompetencies.length} similar competencies:`)
          similarCompetencies.forEach((comp, index) => {
            console.log(`   ${index + 1}. ${comp.name} (${comp.type}) - ${Math.round(Number(comp.similarity) * 100)}% match`)
          })
        }

        // Also test with lower threshold for more results
        const lowerThresholdResults = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*) as count
          FROM "competencies" c
          INNER JOIN "competency_embeddings" ce ON c.id = ce."competencyId"
          WHERE 
            c."isDraft" = false AND
            ce.embeddings IS NOT NULL AND
            1 - (ce.embeddings <=> $1::vector) >= 0.5
        `, vectorString) as [{ count: bigint }]

        const lowerThresholdCount = Number(lowerThresholdResults[0].count)
        if (lowerThresholdCount > similarCompetencies.length) {
          console.log(`   📊 With 50% threshold: ${lowerThresholdCount} total matches`)
        }

      } catch (error) {
        console.error(`   ❌ Error testing query "${query}":`, error)
      }
    }

  } catch (error) {
    console.error('💥 Script failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
testSimilaritySearch()
  .then(() => {
    console.log('\n🎉 Similarity test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script error:', error)
    process.exit(1)
  })