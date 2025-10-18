import { z } from 'zod'
import { router, protectedProcedure, pmProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import OpenAI from 'openai'
import { generateEmbedding } from '@/lib/services/embedding'
import { randomUUID } from 'crypto'
import { Competency } from '@prisma/client'

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
    . mutation(async function* ({ ctx, input }) {
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


      //       return {
      //           extractedCompetencies: [
      //   {
      //     name: "Statistical Analysis",
      //     type: "SKILL",
      //     description: "The ability to analyze data using statistical methods to draw conclusions and make predictions.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+2c4c6a62-eb8f-4076-b0be-98a304064bfa",
      //     similar: [
      //       {
      //         id: "1aba8cdf-2d72-453b-858b-011ba3f2c7d5",
      //         name: "Statistical Modeling",
      //         type: "KNOWLEDGE",
      //         description: "Understanding of statistical methods and their application in building predictive models.",
      //         similarity: 0.7380812388086692,
      //       },
      //       {
      //         id: "127df670-31df-4681-aaf0-016264671d21",
      //         name: "Regression Analysis",
      //         type: "KNOWLEDGE",
      //         description: "Knowledge of regression techniques, including linear regression, for predictive modeling.",
      //         similarity: 0.663676699180801,
      //       },
      //     ],
      //   },
      //   {
      //     name: "Descriptive Statistics",
      //     type: "KNOWLEDGE",
      //     description: "Understanding of basic statistical measures that summarize data characteristics, such as mean, median, and mode.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+19b9f7e0-bec4-45a2-a0b9-7885224a0514",
      //     similar: [
      //     ],
      //   },
      //   {
      //     name: "Data Science",
      //     type: "KNOWLEDGE",
      //     description: "Knowledge of data science principles and practices, including data manipulation, analysis, and visualization.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "980b84e9-2fb7-4570-887b-c3746c4b4824",
      //     similar: [
      //     ],
      //   },
      //   {
      //     name: "Sampling Techniques",
      //     type: "KNOWLEDGE",
      //     description: "Understanding of sampling methods and their application in statistical analysis to ensure data representativeness.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+98a73425-6447-4628-84c0-4a4f7db9eb51",
      //     similar: [
      //     ],
      //   },
      //   {
      //     name: "A/B Testing",
      //     type: "SKILL",
      //     description: "The ability to design and analyze A/B tests to compare two versions of a variable to determine which performs better.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+522df046-e351-452a-84a9-ab7150d0f5e6",
      //     similar: [
      //     ],
      //   },
      //   {
      //     name: "Statistical Inference",
      //     type: "KNOWLEDGE",
      //     description: "Knowledge of methods to make predictions or generalizations about a population based on sample data.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+db2ccdbc-fa55-4623-81ab-f8f04afa0445",
      //     similar: [
      //       {
      //         id: "1aba8cdf-2d72-453b-858b-011ba3f2c7d5",
      //         name: "Statistical Modeling",
      //         type: "KNOWLEDGE",
      //         description: "Understanding of statistical methods and their application in building predictive models.",
      //         similarity: 0.6843495949194274,
      //       },
      //     ],
      //   },
      //   {
      //     name: "Statistical Machine Learning",
      //     type: "KNOWLEDGE",
      //     description: "Understanding of machine learning techniques that incorporate statistical methods for model building and evaluation.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+2e31c2bd-80e2-4be7-90cc-577cbc01966f",
      //     similar: [
      //       {
      //         id: "1aba8cdf-2d72-453b-858b-011ba3f2c7d5",
      //         name: "Statistical Modeling",
      //         type: "KNOWLEDGE",
      //         description: "Understanding of statistical methods and their application in building predictive models.",
      //         similarity: 0.7038777856863233,
      //       },
      //     ],
      //   },
      //   {
      //     name: "Statistical Visualization",
      //     type: "SKILL",
      //     description: "The ability to create visual representations of data to communicate findings effectively.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+8acc6bab-10ce-43fa-a862-409e4537e3c9",
      //     similar: [
      //       {
      //         id: "1aba8cdf-2d72-453b-858b-011ba3f2c7d5",
      //         name: "Statistical Modeling",
      //         type: "KNOWLEDGE",
      //         description: "Understanding of statistical methods and their application in building predictive models.",
      //         similarity: 0.6460571307488933,
      //       },
      //     ],
      //   },
      //   {
      //     name: "Probability Distribution",
      //     type: "KNOWLEDGE",
      //     description: "Knowledge of various probability distributions and their properties, essential for modeling uncertainty in data.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+8b47ad0d-955e-448b-9239-ff5071c6a07d",
      //     similar: [
      //     ],
      //   },
      //   {
      //     name: "Exploratory Data Analysis (EDA)",
      //     type: "SKILL",
      //     description: "The ability to analyze datasets to summarize their main characteristics, often using visual methods.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+34636b30-8957-4208-bdb3-24a101f07f83",
      //     similar: [
      //     ],
      //   },
      //   {
      //     name: "Statistical Hypothesis Testing",
      //     type: "KNOWLEDGE",
      //     description: "Understanding of hypothesis testing concepts and methods to validate assumptions about data.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+e9a4b26a-e3d2-4508-b280-e13788c98561",
      //     similar: [
      //       {
      //         id: "1aba8cdf-2d72-453b-858b-011ba3f2c7d5",
      //         name: "Statistical Modeling",
      //         type: "KNOWLEDGE",
      //         description: "Understanding of statistical methods and their application in building predictive models.",
      //         similarity: 0.6120470944657058,
      //       },
      //     ],
      //   },
      //   {
      //     name: "Bayesian Statistics",
      //     type: "KNOWLEDGE",
      //     description: "Knowledge of Bayesian methods for statistical inference, allowing for the incorporation of prior knowledge into analysis.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+db4626b7-fc78-4f3c-92f0-d7f40bc33911",
      //     similar: [
      //       {
      //         id: "1aba8cdf-2d72-453b-858b-011ba3f2c7d5",
      //         name: "Statistical Modeling",
      //         type: "KNOWLEDGE",
      //         description: "Understanding of statistical methods and their application in building predictive models.",
      //         similarity: 0.5960150538687427,
      //       },
      //     ],
      //   },
      //   {
      //     name: "Python Programming",
      //     type: "TECH_TOOL",
      //     description: "Proficiency in Python programming, particularly for data analysis and machine learning applications.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+438547d6-f802-4905-b067-119d3adfc6f9",
      //     similar: [
      //       {
      //         id: "c42dfae7-8d5e-4c4d-82ba-04870a89861a",
      //         name: "Python",
      //         type: "TECH_TOOL",
      //         description: "Proficiency in Python programming, particularly with libraries like NumPy for implementing linear algebra operations.",
      //         similarity: 0.7089419923178639,
      //       },
      //     ],
      //   },
      //   {
      //     name: "Mathematical Foundations for Machine Learning",
      //     type: "KNOWLEDGE",
      //     description: "Understanding of mathematical concepts such as functions and algebra that underpin machine learning algorithms.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+71855303-c5b9-4658-acda-6b4f96c87aed",
      //     similar: [
      //     ],
      //   },
      //   {
      //     name: "Confidence Intervals",
      //     type: "KNOWLEDGE",
      //     description: "Knowledge of how to calculate and interpret confidence intervals to understand the reliability of estimates.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+3fe354c5-6354-402c-bb3d-9dcbebfde637",
      //     similar: [
      //     ],
      //   },
      //   {
      //     name: "Margin of Error Assessment",
      //     type: "SKILL",
      //     description: "The ability to calculate and interpret the margin of error in statistical estimates to assess accuracy.",
      //     suggestedProficiency: "INTERMEDIATE",
      //     id: "+b2b77dc4-ffe3-4a5d-9111-29b63d72897c",
      //     similar: [
      //     ],
      //   },
      //   {
      //     name: "Data Structures and Algorithms",
      //     type: "KNOWLEDGE",
      //     description: "Basic understanding of data structures and algorithms as they relate to programming and data manipulation.",
      //     suggestedProficiency: "BEGINNER",
      //     id: "+96829a86-1a89-46ca-9a7b-710d4faa35fa",
      //     similar: [
      //     ],
      //   },
      //   {
      //     name: "Debugging Skills",
      //     type: "SKILL",
      //     description: "The ability to identify and fix errors in code, essential for successful programming in data science.",
      //     suggestedProficiency: "BEGINNER",
      //     id: "+536573b4-2391-4d97-b767-e42264d1f763",
      //     similar: [
      //     ],
      //   },
      // ],
      //           entityName: input.entityName,
      //         }

      try {
        yield { type: 'info', message: "🧠 Querying OpenAI ..." }
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
        let i = 1;
        for (const extractedComp of responseData.competencies) {
          yield { type: 'info', message: `🔍 Processing competency (${i++}/${responseData.competencies.length}): ${extractedComp.name}` }
          try {
            let competency: {
              id: string
              name: string
              type: string
              description: string | null
              embeddings: string | null
            } | null = null;
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
              createdAt: Date
              updatedAt: Date
              embeddings: string | null
            }>

            competency = query[0] || null

            let vectorString = ''

            // Competency exists - use it and set similar to empty array
            if (competency) {
              vectorString = competency.embeddings || '';

              // If embeddings are missing, generate and store them
              if (vectorString === '') {
                const embedding = await generateEmbedding(extractedComp.name)
                vectorString = `[${embedding.join(',')}]`
                console.log("🔄 Generating missing embedding for existing competency:", competency.name)
                await ctx.db.$executeRawUnsafe(`
                INSERT INTO "competency_embeddings" ("id", "competencyId", "embeddings", "createdAt", "updatedAt")
                VALUES ($1, $2, $3::vector, NOW(), NOW())
              `, randomUUID(), competency.id, vectorString)
              }

              console.log("ℹ️ Competency already exists:", competency.name)
            } else {
              // 2. Competency doesn't exist - generate embedding and create as draft
              const embedding = await generateEmbedding(extractedComp.name)
              vectorString = `[${embedding.join(',')}]`

              // Create the competency as draft
              competency = {
                name: extractedComp.name,
                type: extractedComp.type,
                description: extractedComp.description,
                id: "+" + randomUUID(),
                embeddings: vectorString
              };

              console.log("➕ Drafte a new competency:", competency.name)
            }

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

        yield {
          type: 'result',
          message: "Finished processing competencies.",
          extractedCompetencies: processedCompetencies,
          entityName: input.entityName,
        }
      } catch (error: any) {
        yield { type: 'error', message: "❌ Error during extraction: " + (error.message || 'Unknown error') }
        console.error('OpenAI extraction error:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to extract competencies',
        })
      }
    }),
})