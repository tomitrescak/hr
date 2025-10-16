#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { generateEmbedding, findSimilarCompetencies } from '../lib/services/embedding'

const prisma = new PrismaClient()

async function testSimilaritySearch() {
  console.log('🔍 Testing competency similarity search...')
  
  try {
    // Get all competencies with embeddings
    const competenciesWithEmbeddings = await prisma.competency.findMany({
      include: {
        embeddings: true,
      },
      where: {
        embeddings: {
          isNot: null,
        },
      },
    })

    if (competenciesWithEmbeddings.length === 0) {
      console.log('❌ No competencies with embeddings found. Run generate-embeddings.ts first.')
      return
    }

    console.log(`📊 Found ${competenciesWithEmbeddings.length} competencies with embeddings`)

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

        // Format data for similarity search
        const competencyEmbeddings = competenciesWithEmbeddings
          .filter(comp => comp.embeddings?.embedding)
          .map(comp => ({
            id: comp.id,
            name: comp.name,
            type: comp.type,
            embedding: comp.embeddings!.embedding,
          }))

        // Find similar competencies
        const similarCompetencies = findSimilarCompetencies(
          targetEmbedding,
          competencyEmbeddings,
          0.75 // 75% threshold
        )

        if (similarCompetencies.length === 0) {
          console.log('   📭 No similar competencies found above 75% threshold')
        } else {
          console.log(`   ✅ Found ${similarCompetencies.length} similar competencies:`)
          similarCompetencies.forEach((comp, index) => {
            console.log(`   ${index + 1}. ${comp.name} (${comp.type}) - ${Math.round(comp.similarity * 100)}% match`)
          })
        }

        // Also test with lower threshold for more results
        const lowerThresholdResults = findSimilarCompetencies(
          targetEmbedding,
          competencyEmbeddings,
          0.5 // 50% threshold
        )

        if (lowerThresholdResults.length > similarCompetencies.length) {
          console.log(`   📊 With 50% threshold: ${lowerThresholdResults.length} total matches`)
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