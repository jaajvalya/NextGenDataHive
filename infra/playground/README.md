# NextGenDataHive — Local AWS Playground

A fully local development environment that emulates AWS Glue, EMR, Lambda, and Kinesis
using open-source Docker images, wired together with Apache Iceberg and Project Nessie.

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Docker Compose Network: playground                   │
│                                                                             │
│  ┌─────────────┐   ┌──────────────────┐   ┌─────────────────────────────┐  │
│  │   MinIO     │   │   LocalStack CE  │   │   Project Nessie            │  │
│  │  (S3 / API) │   │  Lambda · Kinesis│   │  (Iceberg REST catalog)     │  │
│  │  port 9000  │   │  SQS · SNS · STS │   │  port 19120                 │  │
│  │  port 9001  │   │  port 4566       │   │  /api/v2  /iceberg          │  │
│  └──────┬──────┘   └────────┬─────────┘   └──────────────┬──────────────┘  │
│         │ s3a://            │ boto3                       │ NessieCatalog   │
│  ┌──────▼──────────────────▼─────────────────────────────▼──────────────┐  │
│  │                 Apache Spark 3.5 (bitnami/spark)                     │  │
│  │          spark-master (:8080, :7077)  +  spark-worker(s)             │  │
│  │          — EMR simulation — Iceberg + Nessie + S3A config            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │       AWS Glue Docker (glue4_image_01)  — port 8888 JupyterLab      │  │
│  │       Glue 4.0 · Spark 3.3 · Iceberg 1.2 · Nessie catalog           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

  AWS SAM CLI (host machine)  →  sam local invoke / start-api  →  LocalStack
```

## Service Map

| Service | Local URL | Credentials |
|---------|-----------|-------------|
| MinIO API (S3) | http://localhost:9000 | minioadmin / minioadmin |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| LocalStack (Lambda/Kinesis/SQS) | http://localhost:4566 | test / test |
| Project Nessie UI + REST | http://localhost:19120 | none (open) |
| Spark Master UI | http://localhost:8080 | none |
| Spark cluster endpoint | spark://localhost:7077 | none |
| Glue JupyterLab | http://localhost:8888?token=datahive | token: datahive |
| Spark job UI (active job) | http://localhost:4040 | none |
| SAM API (when running) | http://localhost:3001 | none |

## Prerequisites

| Tool | Install | Purpose |
|------|---------|---------|
| Docker Desktop | https://docs.docker.com/desktop/ | Runs all containers |
| docker compose v2 | Bundled with Docker Desktop | Orchestration |
| AWS CLI | `brew install awscli` | Talk to LocalStack |
| AWS SAM CLI | `brew install aws-sam-cli` | Lambda dev/hot-reload |
| Python 3.10+ | system / pyenv | Run local scripts |

## Quick Start

```bash
# 1. Navigate to the playground directory
cd infra/playground

# 2. Start all services (first run pulls images — may take a few minutes)
docker compose --env-file .env.playground up -d

# 3. Watch startup progress
docker compose logs -f

# 4. Verify all services are healthy
docker compose ps

# 5. Open MinIO console to confirm buckets were created
open http://localhost:9001          # minioadmin / minioadmin

# 6. Open Nessie UI
open http://localhost:19120

# 7. Open JupyterLab (Glue)
open "http://localhost:8888?token=datahive"
```

## Stop / Reset

```bash
# Stop containers (preserves volumes / data)
docker compose --env-file .env.playground down

# Stop and wipe all data (full reset)
docker compose --env-file .env.playground down -v

# Restart a single service
docker compose --env-file .env.playground restart glue
```

## Scale Spark Workers

```bash
# Start with 3 workers (EMR multi-node simulation)
docker compose --env-file .env.playground up --scale spark-worker=3 -d
```

---

## Workflows

### 1. Glue Job Development

Write and test Glue ETL scripts locally using the official Glue Docker image.

```bash
# Run the sample Glue job (reads MinIO CSVs → writes Iceberg tables to Nessie)
docker exec playground-glue \
  python /home/glue_user/workspace/jobs/sample_glue_iceberg.py

# Or open JupyterLab and run the notebook
open "http://localhost:8888?token=datahive"
# Notebook: notebooks/glue_iceberg_demo.ipynb
```

Add your own jobs to `glue/jobs/` — they are mounted into the container.

```bash
# Install extra Python packages inside the running Glue container
docker exec playground-glue pip install -r /home/glue_user/workspace/requirements.txt
```

---

### 2. EMR / Spark Job Development

Submit Spark applications to the local Spark cluster (simulates EMR).

```bash
# Submit the sample EMR Spark job
docker exec playground-spark-master \
  spark-submit \
    --master spark://spark-master:7077 \
    --deploy-mode client \
    /opt/bitnami/spark/apps/sample_emr_spark.py

# Monitor the running job
open http://localhost:8080   # Spark Master UI

# Submit from host (if spark-submit is on PATH)
spark-submit \
  --master spark://localhost:7077 \
  --conf spark.sql.catalog.nessie.uri=http://localhost:19120/api/v2 \
  --conf spark.hadoop.fs.s3a.endpoint=http://localhost:9000 \
  spark/apps/sample_emr_spark.py
```

Spark SQL shell inside the cluster:

```bash
docker exec -it playground-spark-master \
  spark-sql --master spark://spark-master:7077
```

---

### 3. Lambda Development

Two modes: **hot-reload** (SAM CLI, best DX) and **integration** (LocalStack).

#### SAM CLI — local iteration

```bash
cd infra/playground/sam
sam build

# Invoke the Kinesis consumer Lambda with a test event
sam local invoke KinesisConsumerFunction \
  --event events/kinesis_event.json \
  --env-vars env.json

# Invoke the S3 event handler
sam local invoke S3EventHandlerFunction \
  --event events/s3_event.json \
  --env-vars env.json

# Start HTTP API (hot-reload on code changes)
sam local start-api --env-vars env.json --port 3001

# Test via HTTP
curl -X POST http://localhost:3001/playground/process \
  -H 'Content-Type: application/json' \
  -d '{"bucket":"raw-landing","key":"products/products_2026_08_01.csv"}'
```

#### LocalStack — integration testing

```bash
# Invoke the echo Lambda deployed by the init script
aws --endpoint-url=http://localhost:4566 \
    lambda invoke \
    --function-name datahive-echo \
    --payload '{"hello":"world"}' \
    /tmp/response.json
cat /tmp/response.json
```

---

### 4. Kinesis Stream Testing

```bash
# Send a test event to the datahive-events stream
aws --endpoint-url=http://localhost:4566 \
    kinesis put-record \
    --stream-name datahive-events \
    --partition-key "user-U101" \
    --data '{"event_type":"purchase","user_id":"U101","amount":79.99,"product_id":"P001"}'

# List streams
aws --endpoint-url=http://localhost:4566 kinesis list-streams

# Describe a stream
aws --endpoint-url=http://localhost:4566 \
    kinesis describe-stream \
    --stream-name datahive-events

# Read records manually
SHARD_ITERATOR=$(aws --endpoint-url=http://localhost:4566 \
  kinesis get-shard-iterator \
  --stream-name datahive-events \
  --shard-id shardId-000000000000 \
  --shard-iterator-type LATEST \
  --query ShardIterator --output text)

aws --endpoint-url=http://localhost:4566 \
  kinesis get-records --shard-iterator "$SHARD_ITERATOR"
```

---

### 5. MinIO / S3 Operations

```bash
# Configure AWS CLI profile for MinIO
aws configure set aws_access_key_id minioadmin
aws configure set aws_secret_access_key minioadmin
aws configure set default.region us-east-1

# List buckets
aws --endpoint-url=http://localhost:9000 s3 ls

# Upload a file
aws --endpoint-url=http://localhost:9000 \
    s3 cp myfile.csv s3://raw-landing/products/myfile.csv

# List files in a bucket
aws --endpoint-url=http://localhost:9000 s3 ls s3://iceberg-warehouse/ --recursive

# Browse the Iceberg warehouse
aws --endpoint-url=http://localhost:9000 \
    s3 ls s3://iceberg-warehouse/datahive/ --recursive
```

---

### 6. Nessie Catalog Operations

Nessie exposes both a REST API and a Git-like branching model.

```bash
# List branches
curl -s http://localhost:19120/api/v2/trees | python3 -m json.tool

# List all tables on main branch
curl -s http://localhost:19120/api/v2/trees/main/entries | python3 -m json.tool

# Create a branch via API
curl -X POST http://localhost:19120/api/v2/trees \
  -H 'Content-Type: application/json' \
  -d '{"name":"feature-xyz","type":"BRANCH","reference":{"type":"BRANCH","name":"main"}}'
```

In Spark SQL:

```sql
-- Create a branch
CREATE BRANCH dev IN nessie;

-- Switch to a branch
USE REFERENCE dev IN nessie;

-- Show current reference
SELECT CURRENT_BRANCH() FROM nessie.system.refs;

-- Merge branch into main
CALL nessie.system.merge('dev', 'main');
```

---

## Integration with NextGenDataHive API

Load the playground environment before starting the DataHive API:

```bash
# Option 1: source env vars into shell
cd infra/playground
source .env.playground   # or: export $(grep -v '^#' .env.playground | xargs)
cd ../..
python -m api

# Option 2: use python-dotenv (already in project deps)
# Set DOTENV_PATH=infra/playground/.env.playground in your IDE run config
```

The existing `core/validators/aws.py` (STS validation) will pass because LocalStack
supports `sts:GetCallerIdentity` at `http://localhost:4566` with the `test`/`test` creds.

The existing `core/connector_runtime.py` injects `AWS_*` env vars into ETL runtime —
those vars, sourced from `.env.playground`, will automatically redirect boto3 calls to
LocalStack and MinIO.

---

## Working with Apache Iceberg

### Table operations (Spark SQL)

```sql
-- Create a table
CREATE TABLE nessie.datahive.my_table (
    id     BIGINT,
    name   STRING,
    value  DOUBLE,
    ts     TIMESTAMP
)
USING iceberg
PARTITIONED BY (days(ts));

-- Insert data
INSERT INTO nessie.datahive.my_table VALUES (1, 'Alice', 9.99, now());

-- Time travel: query a previous snapshot
SELECT * FROM nessie.datahive.my_table VERSION AS OF 12345678;

-- Time travel: query by timestamp
SELECT * FROM nessie.datahive.my_table TIMESTAMP AS OF '2026-08-01 00:00:00';

-- View table history
SELECT * FROM nessie.datahive.my_table.snapshots;
SELECT * FROM nessie.datahive.my_table.history;

-- Schema evolution
ALTER TABLE nessie.datahive.my_table ADD COLUMN new_col STRING;
ALTER TABLE nessie.datahive.my_table RENAME COLUMN old_name TO new_name;
ALTER TABLE nessie.datahive.my_table DROP COLUMN deprecated_col;

-- Compaction (merges small files)
CALL nessie.system.rewrite_data_files(table => 'datahive.my_table');

-- Expire old snapshots
CALL nessie.system.expire_snapshots(
    table => 'datahive.my_table',
    older_than => TIMESTAMP '2026-08-01 00:00:00',
    retain_last => 3
);
```

---

## Directory Structure

```
infra/playground/
├── docker-compose.yml          # All 5 services
├── .env.playground             # Env vars (credentials, ports, bucket names)
├── README.md                   # This file
│
├── localstack/
│   └── init-aws.sh             # Creates Kinesis streams, SQS queues, Lambda
│
├── minio/
│   └── init-minio.sh           # Creates buckets + uploads sample CSV/JSON data
│
├── glue/
│   ├── requirements.txt        # Extra Python packages for Glue container
│   └── jobs/
│       └── sample_glue_iceberg.py  # Glue job: CSV → Iceberg via Nessie
│
├── spark/
│   ├── spark-defaults.conf         # Iceberg + Nessie + S3A Spark config
│   └── apps/
│       └── sample_emr_spark.py     # EMR-style PySpark app (MERGE, time travel, branching)
│
├── sam/
│   ├── template.yaml               # SAM CloudFormation template
│   ├── env.json                    # Lambda env vars for sam local
│   ├── events/
│   │   ├── kinesis_event.json      # Test Kinesis trigger event
│   │   └── s3_event.json           # Test S3 PutObject event
│   └── functions/
│       ├── kinesis_consumer/       # Lambda: Kinesis → MinIO processed/
│       │   ├── handler.py
│       │   └── requirements.txt
│       └── s3_event_handler/       # Lambda: S3 upload → catalogue + copy
│           ├── handler.py
│           └── requirements.txt
│
└── notebooks/
    ├── glue_iceberg_demo.ipynb     # Glue + Iceberg interactive walkthrough
    └── emr_spark_demo.ipynb        # EMR/Spark: time travel, MERGE, branching
```

---

## Troubleshooting

**LocalStack containers restart repeatedly**
```bash
docker compose logs localstack
# Increase Docker Desktop memory to at least 6GB (Settings → Resources)
```

**Glue container exits immediately**
```bash
# The image is large (~8GB). Ensure Docker has enough disk space.
docker system df
docker image prune  # clean up unused images if needed
```

**Spark job fails with S3A errors**
```bash
# Verify MinIO is healthy
curl http://localhost:9000/minio/health/live

# Check that spark-defaults.conf is mounted
docker exec playground-spark-master cat /opt/bitnami/spark/conf/spark-defaults.conf
```

**Nessie catalog not reachable from Spark**
```bash
# Test Nessie REST API
curl http://localhost:19120/api/v2/config
# Inside Docker use the container hostname:
docker exec playground-spark-master curl http://nessie:19120/api/v2/config
```

**SAM CLI cannot find Docker**
```bash
# Ensure Docker Desktop is running and Docker socket is accessible
docker info
# On macOS, set:
export DOCKER_HOST=unix:///var/run/docker.sock
```

**boto3 hits real AWS instead of LocalStack**
```bash
# Ensure env vars are exported in the current shell
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
# Or source the playground env file:
export $(grep -v '^#' infra/playground/.env.playground | xargs)
```

---

## What Is Not Emulated

| AWS Feature | Status | Alternative |
|-------------|--------|-------------|
| Glue Crawlers | Not supported | Define schemas manually via Iceberg DDL |
| Glue Data Catalog (schema registry) | Not needed | Nessie + Iceberg REST catalog replaces it |
| EMR cluster management API | LocalStack Pro only | Use Spark cluster directly |
| Kinesis Data Firehose | Not in LocalStack CE | Use Kinesis → Lambda → MinIO pattern |
| EMR Serverless | Not supported | Use `spark-submit --master local` |
| Glue Studio visual ETL | Not available | Write PySpark / use JupyterLab |
