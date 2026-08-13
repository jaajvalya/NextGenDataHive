#!/bin/bash
# init-aws.sh — runs inside LocalStack on startup (ready.d hook)
# Creates: Kinesis streams, SQS queues, SNS topics, and an S3 bucket in LocalStack.
# Note: Lambda functions are deployed via SAM CLI separately (see sam/ directory).
set -e

AWS="aws --endpoint-url=http://localhost:4566 --region ${AWS_DEFAULT_REGION:-us-east-1}"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

echo ">>> LocalStack init starting (region: ${REGION})"

# ── Kinesis Streams ───────────────────────────────────────────────────────────

create_kinesis_stream() {
  local name="$1"
  local shards="${2:-1}"
  if ${AWS} kinesis describe-stream --stream-name "${name}" > /dev/null 2>&1; then
    echo ">>> Kinesis stream already exists: ${name}"
  else
    ${AWS} kinesis create-stream \
      --stream-name "${name}" \
      --shard-count "${shards}"
    echo ">>> Created Kinesis stream: ${name} (shards: ${shards})"
  fi
}

# Primary event stream — all DataHive platform events
create_kinesis_stream "datahive-events" 1

# Stream for raw ingestion events (e.g. IoT, clickstream)
create_kinesis_stream "datahive-raw-ingest" 2

# Stream for processed / enriched records
create_kinesis_stream "datahive-processed" 1

# ── SQS Queues ────────────────────────────────────────────────────────────────

create_sqs_queue() {
  local name="$1"
  local extra_attrs="${2:-}"
  if ${AWS} sqs get-queue-url --queue-name "${name}" > /dev/null 2>&1; then
    echo ">>> SQS queue already exists: ${name}"
  else
    ${AWS} sqs create-queue --queue-name "${name}" ${extra_attrs}
    echo ">>> Created SQS queue: ${name}"
  fi
}

# Dead-letter queue for failed Lambda invocations
create_sqs_queue "datahive-dlq"

# Standard processing queue
create_sqs_queue "datahive-jobs"

# FIFO queue for ordered processing (requires .fifo suffix)
create_sqs_queue "datahive-ordered.fifo" \
  "--attributes FifoQueue=true,ContentBasedDeduplication=true"

# ── SNS Topics ────────────────────────────────────────────────────────────────

create_sns_topic() {
  local name="$1"
  if ${AWS} sns get-topic-attributes \
       --topic-arn "arn:aws:sns:${REGION}:000000000000:${name}" > /dev/null 2>&1; then
    echo ">>> SNS topic already exists: ${name}"
  else
    ${AWS} sns create-topic --name "${name}"
    echo ">>> Created SNS topic: ${name}"
  fi
}

create_sns_topic "datahive-alerts"
create_sns_topic "datahive-pipeline-events"

# ── Subscribe datahive-jobs SQS to datahive-pipeline-events SNS ───────────────
TOPIC_ARN=$(${AWS} sns list-topics --query "Topics[?ends_with(TopicArn,'datahive-pipeline-events')].TopicArn" --output text 2>/dev/null || true)
QUEUE_URL=$(${AWS} sqs get-queue-url --queue-name "datahive-jobs" --query "QueueUrl" --output text 2>/dev/null || true)
QUEUE_ARN=$(${AWS} sqs get-queue-attributes \
  --queue-url "${QUEUE_URL}" \
  --attribute-names QueueArn \
  --query "Attributes.QueueArn" --output text 2>/dev/null || true)

if [ -n "${TOPIC_ARN}" ] && [ -n "${QUEUE_ARN}" ]; then
  ${AWS} sns subscribe \
    --topic-arn "${TOPIC_ARN}" \
    --protocol sqs \
    --notification-endpoint "${QUEUE_ARN}" > /dev/null 2>&1 || true
  echo ">>> Subscribed datahive-jobs to datahive-pipeline-events"
fi

# ── S3 bucket in LocalStack (separate from MinIO) ────────────────────────────
# Used for Lambda deployment packages and event notifications.
if ${AWS} s3api head-bucket --bucket "datahive-lambda-artifacts" > /dev/null 2>&1; then
  echo ">>> S3 bucket already exists: datahive-lambda-artifacts"
else
  ${AWS} s3api create-bucket --bucket "datahive-lambda-artifacts"
  echo ">>> Created S3 bucket: datahive-lambda-artifacts"
fi

# ── IAM role for Lambda execution ─────────────────────────────────────────────
if ${AWS} iam get-role --role-name "datahive-lambda-role" > /dev/null 2>&1; then
  echo ">>> IAM role already exists: datahive-lambda-role"
else
  ${AWS} iam create-role \
    --role-name "datahive-lambda-role" \
    --assume-role-policy-document '{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
      }]
    }' > /dev/null

  ${AWS} iam attach-role-policy \
    --role-name "datahive-lambda-role" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaKinesisExecutionRole"

  ${AWS} iam attach-role-policy \
    --role-name "datahive-lambda-role" \
    --policy-arn "arn:aws:iam::aws:policy/AmazonS3FullAccess"

  echo ">>> Created IAM role: datahive-lambda-role"
fi

# ── Deploy a minimal inline Lambda (Python) to demonstrate Lambda invocation ──
ROLE_ARN="arn:aws:iam::000000000000:role/datahive-lambda-role"
FUNCTION_NAME="datahive-echo"

if ${AWS} lambda get-function --function-name "${FUNCTION_NAME}" > /dev/null 2>&1; then
  echo ">>> Lambda already exists: ${FUNCTION_NAME}"
else
  # Inline zip — base64 encoded minimal Python handler
  # Handler: index.handler
  TMPDIR=$(mktemp -d)
  cat > "${TMPDIR}/index.py" <<'PYEOF'
import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    """Echo Lambda: logs and returns the incoming event.

    Used to verify LocalStack Lambda + Kinesis trigger wiring.
    """
    logger.info("Received event: %s", json.dumps(event, default=str))

    # Handle Kinesis trigger payload
    records_processed = 0
    if "Records" in event:
        for record in event["Records"]:
            if record.get("eventSource") == "aws:kinesis":
                import base64
                data = base64.b64decode(record["kinesis"]["data"]).decode("utf-8")
                logger.info("Kinesis record: %s", data)
                records_processed += 1

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "echo",
            "records_processed": records_processed,
            "event_keys": list(event.keys()),
        }),
    }
PYEOF
  cd "${TMPDIR}" && zip function.zip index.py > /dev/null
  ${AWS} lambda create-function \
    --function-name "${FUNCTION_NAME}" \
    --runtime python3.12 \
    --role "${ROLE_ARN}" \
    --handler index.handler \
    --zip-file "fileb://${TMPDIR}/function.zip" \
    --timeout 30 \
    --memory-size 256 \
    --environment "Variables={KINESIS_STREAM=datahive-events,ENV=playground}" \
    > /dev/null
  echo ">>> Deployed Lambda: ${FUNCTION_NAME}"
  rm -rf "${TMPDIR}"
fi

# ── Wire Kinesis event source mapping → Lambda ────────────────────────────────
STREAM_ARN=$(${AWS} kinesis describe-stream \
  --stream-name "datahive-events" \
  --query "StreamDescription.StreamARN" \
  --output text 2>/dev/null || true)

EXISTING_ESM=$(${AWS} lambda list-event-source-mappings \
  --function-name "${FUNCTION_NAME}" \
  --query "EventSourceMappings[0].UUID" \
  --output text 2>/dev/null || true)

if [ -z "${EXISTING_ESM}" ] || [ "${EXISTING_ESM}" = "None" ]; then
  ${AWS} lambda create-event-source-mapping \
    --function-name "${FUNCTION_NAME}" \
    --event-source-arn "${STREAM_ARN}" \
    --starting-position LATEST \
    --batch-size 10 \
    > /dev/null 2>&1 || true
  echo ">>> Mapped Kinesis stream datahive-events -> Lambda ${FUNCTION_NAME}"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  LocalStack init complete                                 ║"
echo "║  Kinesis:  datahive-events, datahive-raw-ingest,          ║"
echo "║            datahive-processed                             ║"
echo "║  SQS:      datahive-dlq, datahive-jobs,                   ║"
echo "║            datahive-ordered.fifo                          ║"
echo "║  SNS:      datahive-alerts, datahive-pipeline-events      ║"
echo "║  Lambda:   datahive-echo (Kinesis trigger wired)          ║"
echo "║  Endpoint: http://localhost:4566                          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
