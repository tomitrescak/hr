import { z } from 'zod'
import { router, protectedProcedure, pmProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import OpenAI from 'openai'
import { generateEmbedding } from '@/lib/services/embedding'
import { randomUUID } from 'crypto'

export const extractionRouter = router({
  // Generic competency extraction endpoint
  extractCompetencies: pmProcedure
    .input(
      z.object({
        content: z.string().min(10, 'Content must be at least 10 characters'),
        contextMessage: z.string().optional(),
        entityName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!process.env.OPENAI_API_KEY) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'OpenAI API key not configured',
        })
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      })

      const competencySchema = {
        type: "object",
        properties: {
          competencies: {
            type: "array",
            description: "Array of extracted competencies from the provided content",
            minItems: 5,
            maxItems: 20,
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "The name of the competency - be specific and actionable"
                },
                type: {
                  type: "string",
                  enum: ["KNOWLEDGE", "SKILL", "TECH_TOOL", "ABILITY", "VALUE", "BEHAVIOUR", "ENABLER"],
                  description: "Competency type: KNOWLEDGE (theoretical understanding), SKILL (practical abilities), TECH_TOOL (technologies/software), ABILITY (general capabilities), VALUE (principles/beliefs), BEHAVIOUR (soft skills), ENABLER (supporting capabilities)"
                },
                description: {
                  type: "string",
                  description: "Brief but clear description of what this competency entails and why it's relevant to the content"
                },
                suggestedProficiency: {
                  type: "string",
                  enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"],
                  description: "Proficiency level based on content evidence: BEGINNER (mentioned/basic), INTERMEDIATE (demonstrated use), ADVANCED (proven expertise), EXPERT (leadership/mastery)"
                }
              },
              required: ["name", "type", "description", "suggestedProficiency"],
              additionalProperties: false
            }
          }
        },
        required: ["competencies"],
        additionalProperties: false
      }

      const basePrompt = `Analyze the following content and extract competencies.

Content:
${input.content}

${input.contextMessage || ''}

Extract 5-20 relevant competencies, focusing on:
- Specific skills, technologies, and tools mentioned
- Professional abilities demonstrated through the content
- Knowledge areas evident from the information
- Soft skills and behaviors shown
- Suggest realistic proficiency levels based on evidence depth`

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: basePrompt,
          }],
          temperature: 0.3,
          max_tokens: 2500,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'competency_extraction',
              description: 'Extract competencies from content',
              schema: competencySchema,
              strict: true
            }
          }
        })

        const responseText = completion.choices[0]?.message?.content
        if (!responseText) {
          throw new Error('No response from OpenAI')
        }

        // Parse the structured JSON response
        let responseData
        try {
          responseData = JSON.parse(responseText)
        } catch (parseError) {
          console.error('Failed to parse OpenAI response:', parseError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to parse competency extraction results',
          })
        }

        // Validate the response structure
        if (!responseData.competencies || !Array.isArray(responseData.competencies)) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Invalid response format from competency extraction',
          })
        }

        console.log("🧠 Extracted Competencies")
        console.log(responseData.competencies)

        // Process each competency: check if exists, create if needed, find similar
        const processedCompetencies = []

        for (const extractedComp of responseData.competencies) {
          try {
            let competency
            let similar: Array<{
              id: string
              name: string
              type: string
              description: string
              similarity: number
            }> = []

            // 1. Check if competency with exact name and type exists
            const query = await ctx.db.$queryRawUnsafe(`
              SELECT c.*, ce.embeddings::text
              FROM "competencies" c
              LEFT JOIN "competency_embeddings" ce ON c.id = ce."competencyId"
              WHERE LOWER(c.name) = LOWER($1) AND c.type = $2::"CompetencyType"
              LIMIT 1
            `, extractedComp.name, extractedComp.type) as Array<{
              id: string
              name: string
              type: string
              description: string | null
              isDraft: boolean
              createdAt: Date
              updatedAt: Date
              embeddings: string | null
            }>

            const existing = query[0] || null

            let vectorString = ''

            if (existing) {
              // Competency exists - use it and set similar to empty array
              competency = existing;
              vectorString = existing.embeddings || '';

              if (vectorString === '') {
                const embedding = await generateEmbedding(extractedComp.name)
                vectorString = `[${embedding.join(',')}]`
                console.log("🔄 Generating missing embedding for existing competency:", existing.name)
                await ctx.db.$executeRawUnsafe(`
                INSERT INTO "competency_embeddings" ("id", "competencyId", "embeddings", "createdAt", "updatedAt")
                VALUES ($1, $2, $3::vector, NOW(), NOW())
              `, randomUUID(), existing.id, vectorString)
              }

              console.log("ℹ️ Competency already exists:", existing.name)
            } else {
              // 2. Competency doesn't exist - generate embedding and create as draft
              const embedding = await generateEmbedding(extractedComp.name)
              vectorString = `[${embedding.join(',')}]`

              // Create the competency as draft
              competency = await ctx.db.competency.create({
                data: {
                  name: extractedComp.name,
                  type: extractedComp.type,
                  description: extractedComp.description,
                  isDraft: true,
                },
              })

              await ctx.db.$executeRawUnsafe(`
                INSERT INTO "competency_embeddings" ("id", "competencyId", "embeddings", "createdAt", "updatedAt")
                VALUES ($1, $2, $3::vector, NOW(), NOW())
              `, randomUUID(), competency.id, vectorString)

              console.log("➕ Created new draft competency:", competency.name)
            }

            // Store embedding with pgvector format


            // 3. Find similar competencies with >75% match
            const similarResults = await ctx.db.$queryRawUnsafe(`
                SELECT 
                  c.id, 
                  c.name, 
                  c.type, 
                  c.description,
                  1 - (ce.embeddings <=> $1::vector) AS similarity
                FROM "competencies" c
                INNER JOIN "competency_embeddings" ce ON c.id = ce."competencyId"
                WHERE 
                  c.id != $2 AND
                  ce.embeddings IS NOT NULL AND
                  1 - (ce.embeddings <=> $1::vector) >= 0.55
                ORDER BY similarity DESC
                LIMIT 5
              `, vectorString, competency.id) as Array<{
              id: string
              name: string
              type: string
              description: string | null
              similarity: number
            }>

            similar = similarResults.map(result => ({
              id: result.id,
              name: result.name,
              type: result.type,
              description: result.description || '',
              similarity: Number(result.similarity),
            }))

            // Add processed competency to results
            processedCompetencies.push({
              name: extractedComp.name,
              type: extractedComp.type,
              description: extractedComp.description,
              suggestedProficiency: extractedComp.suggestedProficiency,
              id: competency.id,
              similar: similar,
            })

            
            if (similar.length > 0) {
              console.log("🔍 Found similar competencies:", similar.length)
              for (const sim of similar) {
                console.log(`   - ${sim.name} (${(sim.similarity * 100).toFixed(2)}% similar)`)
              }
            }
          } catch (compError) {
            console.error(`Error processing competency ${extractedComp.name}:`, compError)
            // Skip this competency but continue with others
          }
        }

        return {
          extractedCompetencies: processedCompetencies,
          entityName: input.entityName,
        }
      } catch (error: any) {
        console.error('OpenAI extraction error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to extract competencies',
        })
      }
    }),
})