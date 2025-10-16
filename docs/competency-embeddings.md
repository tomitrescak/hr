# Competency Embeddings Feature

## Overview

The competency embedding feature uses OpenAI's embedding API to create semantic representations of competency names, enabling intelligent similarity detection and deduplication during competency extraction.

## Architecture

### Database Schema

- **CompetencyEmbedding**: New table storing vector embeddings for each competency
  - `id`: Primary key
  - `competencyId`: Foreign key to the competency
  - `embedding`: Float array containing the vector representation
  - `createdAt`, `updatedAt`: Timestamps

### Services

- **embedding.ts**: Core service handling:
  - OpenAI API integration for embedding generation
  - Cosine similarity calculations
  - Similarity search with configurable thresholds

## Features

### 1. Automatic Embedding Generation

- Every competency creation automatically generates embeddings
- Embeddings are updated when competency names change
- Bulk operations include embedding generation
- Graceful error handling (competency creation succeeds even if embedding fails)

### 2. Similarity Detection in CompetencyExtractor

- When extracting competencies from content (CVs, courses), the system:
  1. Generates embeddings for extracted competency names
  2. Searches existing competencies using 75% similarity threshold
  3. Presents similar competencies to users
  4. Allows selection of existing competency or creation of new one

### 3. User Interface

The CompetencyExtractor now includes:
- **Similar Competencies Panel**: Shows when matches are found above 75% threshold
- **Interactive Selection**: Click to select similar competency
- **Similarity Scores**: Visual percentage match indicators  
- **Original Option**: Button to use extracted name instead of similar match

## Configuration

### Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key
```

### Similarity Threshold

Default threshold is 75% (0.75) but can be adjusted in:
- `CompetencyExtractor.tsx`: For UI similarity detection
- `competencies.findSimilar` endpoint: For API calls

## Usage

### For Existing Data

Run the migration script to generate embeddings for existing competencies:

```bash
npx tsx scripts/generate-embeddings.ts
```

### Testing Similarity

Test the similarity functionality:

```bash  
npx tsx scripts/test-similarity.ts
```

### API Endpoints

**Find Similar Competencies**
```typescript
trpc.competencies.findSimilar.mutate({
  name: "JavaScript Programming",
  threshold: 0.75 // optional, defaults to 0.75
})
```

## Technical Details

### Embedding Model
- Uses OpenAI's `text-embedding-3-small` model
- Cost-effective while maintaining good accuracy
- 1536-dimensional vectors

### Similarity Algorithm
- Cosine similarity calculation
- Normalized to 0-1 range (1 = most similar)
- Efficient vector comparison using dot product and magnitude calculations

### Performance Considerations
- Embeddings are generated asynchronously
- Database queries include embedding data
- Small delay (100ms) between API calls to avoid rate limiting
- Caching of embeddings prevents repeated API calls for same competency

## Error Handling

- Embedding generation failures don't block competency operations
- Graceful degradation when OpenAI API is unavailable
- Proper error logging for debugging
- UI continues to work without similarity features if embedding fails

## Future Enhancements

1. **Batch Embedding Generation**: Process multiple competencies in single API call
2. **Embedding Update Queue**: Background job for updating embeddings
3. **Advanced Similarity Metrics**: Multiple similarity algorithms
4. **Competency Clustering**: Group related competencies automatically
5. **Semantic Search**: Full-text search using embeddings across all competencies