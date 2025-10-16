#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { generateEmbedding } from '../lib/services/embedding'

const prisma = new PrismaClient()

async function generateEmbeddingsForExistingCompetencies() {
  console.log('🚀 Starting to generate embeddings for existing competencies...')
  
  try {
    // Get all competencies that don't have embeddings yet
    const competencies = await prisma.competency.findMany({
      where: {
        embeddings: null
      },
      select: {
        id: true,
        name: true,
        type: true
      }
    })

    console.log(`📊 Found ${competencies.length} competencies without embeddings`)

    if (competencies.length === 0) {
      console.log('✅ All competencies already have embeddings!')
      return
    }

    let processed = 0
    let failed = 0

    for (const competency of competencies) {
      try {
        console.log(`⚡ Processing: ${competency.name} (${competency.type})`)
        
        const embedding = await generateEmbedding(competency.name)
        
        await prisma.competencyEmbedding.create({
          data: {
            competencyId: competency.id,
            embedding
          }
        })

        processed++
        console.log(`✅ Generated embedding for: ${competency.name}`)
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        failed++
        console.error(`❌ Failed to generate embedding for ${competency.name}:`, error)
      }
    }

    console.log(`\n📈 Summary:`)
    console.log(`   ✅ Successfully processed: ${processed}`)
    console.log(`   ❌ Failed: ${failed}`)
    console.log(`   📊 Total: ${competencies.length}`)

  } catch (error) {
    console.error('💥 Script failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
generateEmbeddingsForExistingCompetencies()
  .then(() => {
    console.log('🎉 Script completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script error:', error)
    process.exit(1)
  })