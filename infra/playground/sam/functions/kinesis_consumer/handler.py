"""
kinesis_consumer/handler.py — Lambda function triggered by Kinesis data streams

Trigger: datahive-events Kinesis stream (configured in LocalStack init script)

What it does:
  1. Decodes base64-encoded Kinesis records
  2. Parses JSON payloads
  3. Enriches records with metadata (partition key, shard, sequence number)
  4. Batches enriched records and writes a Parquet file to MinIO processed/

Run locally (SAM CLI):
  sam local invoke KinesisConsumerFunction \
    --event events/kinesis_event.json \
    --env-vars env.json

Send a test record to LocalStack:
  aws --endpoint-url=http://localhost:4566 kinesis put-record \
    --stream-name datahive-events \
    --partition-key user-101 \
    --data '{"event_type":"purchase","user_id":"U101","amount":79.99}'
"""
from __future__ import annotations

import base64
import io
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger()
log.setLevel(logging.INFO)

PROCESSED_BUCKET = os.environ.get("PROCESSED_BUCKET", "processed")
OUTPUT_PREFIX    = os.environ.get("OUTPUT_PREFIX", "kinesis-output")
MINIO_ENDPOINT   = os.environ.get("MINIO_ENDPOINT", "http://localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")


def _s3_client():
    """Return a boto3 S3 client pointed at MinIO."""
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=MINIO_ENDPOINT,
        aws_access_key_id=MINIO_ACCESS_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        region_name="us-east-1",
        use_ssl=False,
    )


def decode_kinesis_record(record: dict[str, Any]) -> dict[str, Any]:
    """Decode a single Kinesis record into a structured dict."""
    kinesis_data = record["kinesis"]
    raw_bytes = base64.b64decode(kinesis_data["data"])

    try:
        payload = json.loads(raw_bytes.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        payload = {"raw": raw_bytes.hex()}

    return {
        "sequence_number":           kinesis_data["sequenceNumber"],
        "approximate_arrival_ts":    kinesis_data["approximateArrivalTimestamp"],
        "partition_key":             kinesis_data["partitionKey"],
        "shard_id":                  record.get("eventID", "").split(":")[0],
        "kinesis_stream":            record.get("eventSourceARN", "").split("/")[-1],
        "processed_at":              datetime.now(timezone.utc).isoformat(),
        **payload,
    }


def write_batch_to_minio(records: list[dict[str, Any]], s3) -> str:
    """Write a batch of decoded records as a JSON-lines file to MinIO."""
    now = datetime.now(timezone.utc)
    s3_key = (
        f"{OUTPUT_PREFIX}/"
        f"year={now.year}/month={now.month:02d}/day={now.day:02d}/"
        f"batch_{now.strftime('%H%M%S')}_{uuid.uuid4().hex[:8]}.jsonl"
    )

    body = "\n".join(json.dumps(r, default=str) for r in records)
    s3.put_object(
        Bucket=PROCESSED_BUCKET,
        Key=s3_key,
        Body=body.encode("utf-8"),
        ContentType="application/x-ndjson",
    )
    return f"s3://{PROCESSED_BUCKET}/{s3_key}"


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Main Lambda entry point — handles Kinesis trigger payload."""
    records_in  = event.get("Records", [])
    log.info("Received %d Kinesis records", len(records_in))

    if not records_in:
        return {"statusCode": 200, "body": json.dumps({"processed": 0})}

    decoded = []
    errors  = []

    for rec in records_in:
        try:
            decoded.append(decode_kinesis_record(rec))
        except Exception as exc:
            log.error("Failed to decode record %s: %s", rec.get("kinesis", {}).get("sequenceNumber"), exc)
            errors.append(str(exc))

    log.info("Decoded %d/%d records successfully", len(decoded), len(records_in))

    s3 = _s3_client()
    output_path = None

    if decoded:
        try:
            output_path = write_batch_to_minio(decoded, s3)
            log.info("Batch written to: %s", output_path)
        except Exception as exc:
            log.error("Failed to write batch to MinIO: %s", exc)
            errors.append(str(exc))

    result = {
        "statusCode": 200,
        "body": json.dumps({
            "records_received": len(records_in),
            "records_decoded":  len(decoded),
            "output_path":      output_path,
            "errors":           errors,
        }),
    }

    if errors:
        log.warning("Completed with %d errors", len(errors))
    else:
        log.info("Completed successfully")

    return result
