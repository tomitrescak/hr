#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function populatePgVectorEmbeddings() {
  console.log('🚀 Starting to populate pgvector embeddings column...')
  
  try {
    // Get all competency embeddings that have embedding data but no pgvector embeddings
    const embeddings = await prisma.$queryRaw<Array<{
      id: string
      competencyId: string
      embedding: number[]
      competency: {
      name: string
      type: string
      }
    }>>`
      SELECT 
      ce.id,
      ce."competencyId",
      ce.embedding,
      json_build_object(
        'name', c.name,
        'type', c.type
      ) as competency
      FROM "competency_embeddings" ce
      JOIN "competencies" c ON c.id = ce."competencyId"
      WHERE ce.embedding IS NOT NULL 
      AND ce.embeddings IS NULL
    `

    console.log(`📊 Found ${embeddings.length} embeddings to convert to pgvector format`)

    if (embeddings.length === 0) {
      console.log('✅ All embeddings already have pgvector data!')
      return
    }

    let processed = 0
    let failed = 0

    for (const embeddingRecord of embeddings) {
      try {
        console.log(`⚡ Processing: ${embeddingRecord.competency.name} (${embeddingRecord.competency.type})`)
        
        // Convert embedding array to pgvector format
        const embeddingArray = embeddingRecord.embedding as number[]
        const vectorString = `[${embeddingArray.join(',')}]`
        
        // Update the record with pgvector data using raw SQL
        await prisma.$executeRawUnsafe(`
          UPDATE "competency_embeddings" 
          SET "embeddings" = $1::vector 
          WHERE "id" = $2
        `, vectorString, embeddingRecord.id)

        processed++
        console.log(`✅ Converted embedding for: ${embeddingRecord.competency.name}`)
        
      } catch (error) {
        failed++
        console.error(`❌ Failed to convert embedding for ${embeddingRecord.competency.name}:`, error)
      }
    }

    console.log(`\n📈 Summary:`)
    console.log(`   ✅ Successfully processed: ${processed}`)
    console.log(`   ❌ Failed: ${failed}`)
    console.log(`   📊 Total: ${embeddings.length}`)

  } catch (error) {
    console.error('💥 Script failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
populatePgVectorEmbeddings()
  .then(() => {
    console.log('🎉 Script completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script error:', error)
    process.exit(1)
  })