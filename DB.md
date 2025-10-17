# How to enable vector in the container

apk add --no-cache git build-base make clang19 llvm19
git clone --branch v0.7.4 https://github.com/pgvector/pgvector.git /pgvector
cd /pgvector
make
make install
su - postgres           
pg_ctl restart -D "/var/lib/postgresql/data" -m fast

# DB Setup

-- CREATE EXTENSION IF NOT EXISTS vector;
-- SELECT * FROM pg_available_extensions order by name
-- ALTER TABLE public.competency_embeddings ADD COLUMN "embeddings" vector(1536);
CREATE INDEX ON competency_embeddings USING hnsw (embeddings vector_cosine_ops)