"""
s3_event_handler/handler.py — Lambda triggered by S3/MinIO PutObject events

Trigger: S3 event notifications from raw-landing/ bucket (configured via LocalStack)

What it does:
  1. Parses S3 event (or HTTP POST body when invoked via SAM start-api)
  2. Reads the uploaded file from raw-landing/ bucket (MinIO)
  3. Validates file format (CSV / JSON / Parquet)
  4. Copies the file to processed/catalogued/ with enriched metadata
  5. Returns a catalogue record (file stats, schema hint, destination path)

Trigger via LocalStack S3 notification:
  aws --endpoint-url=http://localhost:4566 s3api put-bucket-notification-configuration \
    --bucket raw-landing \
    --notification-configuration '{
      "LambdaFunctionConfigurations": [{
        "LambdaFunctionArn": "arn:aws:lambda:us-east-1:000000000000:function:datahive-s3-event-handler",
        "Events": ["s3:ObjectCreated:*"]
      }]
    }'

Trigger via HTTP (SAM local start-api):
  curl -X POST http://localhost:3001/playground/process \
    -H 'Content-Type: application/json' \
    -d '{"bucket":"raw-landing","key":"products/products_2026_08_01.csv"}'
"""
from __future__ import annotations

import csv
import io
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any
from urllib.parse import unquote_plus

log = logging.getLogger()
log.setLevel(logging.INFO)

SOURCE_BUCKET      = os.environ.get("SOURCE_BUCKET",      "raw-landing")
DESTINATION_BUCKET = os.environ.get("PROCESSED_BUCKET",   "processed")
DESTINATION_PREFIX = os.environ.get("DESTINATION_PREFIX", "catalogued")
MINIO_ENDPOINT     = os.environ.get("MINIO_ENDPOINT",     "http://localhost:9000")
MINIO_ACCESS_KEY   = os.environ.get("MINIO_ACCESS_KEY",   "minioadmin")
MINIO_SECRET_KEY   = os.environ.get("MINIO_SECRET_KEY",   "minioadmin")


def _s3_client():
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=MINIO_ENDPOINT,
        aws_access_key_id=MINIO_ACCESS_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        region_name="us-east-1",
        use_ssl=False,
    )


def _infer_format(key: str) -> str:
    ext = key.rsplit(".", 1)[-1].lower()
    return {"csv": "csv", "json": "json", "jsonl": "json", "parquet": "parquet"}.get(ext, "unknown")


def _validate_csv(content: bytes) -> dict[str, Any]:
    text   = content.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    rows   = list(reader)
    return {
        "format":      "csv",
        "row_count":   len(rows),
        "columns":     list(reader.fieldnames or []),
        "size_bytes":  len(content),
        "valid":       True,
    }


def _validate_json(content: bytes) -> dict[str, Any]:
    text  = content.decode("utf-8", errors="replace")
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    parsed = []
    for line in lines:
        try:
            parsed.append(json.loads(line))
        except json.JSONDecodeError:
            pass
    sample_keys = list(parsed[0].keys()) if parsed else []
    return {
        "format":     "json",
        "row_count":  len(parsed),
        "columns":    sample_keys,
        "size_bytes": len(content),
        "valid":      len(parsed) > 0,
    }


def _validate_parquet(content: bytes) -> dict[str, Any]:
    # Basic magic byte check (Parquet files start with PAR1)
    is_valid = content[:4] == b"PAR1" and content[-4:] == b"PAR1"
    return {
        "format":     "parquet",
        "row_count":  None,
        "columns":    [],
        "size_bytes": len(content),
        "valid":      is_valid,
    }


def validate_file(content: bytes, file_format: str) -> dict[str, Any]:
    """Validate and profile the file content."""
    validators = {
        "csv":     _validate_csv,
        "json":    _validate_json,
        "parquet": _validate_parquet,
    }
    validator = validators.get(file_format)
    if not validator:
        return {"format": file_format, "valid": False, "error": "Unsupported format"}
    try:
        return validator(content)
    except Exception as exc:
        return {"format": file_format, "valid": False, "error": str(exc)}


def process_s3_object(bucket: str, key: str, s3) -> dict[str, Any]:
    """Download, validate, and re-upload a file with enriched metadata."""
    log.info("Processing s3://%s/%s", bucket, key)

    obj = s3.get_object(Bucket=bucket, Key=key)
    content     = obj["Body"].read()
    file_format = _infer_format(key)
    profile     = validate_file(content, file_format)

    now      = datetime.now(timezone.utc)
    dest_key = (
        f"{DESTINATION_PREFIX}/"
        f"year={now.year}/month={now.month:02d}/day={now.day:02d}/"
        f"{key.replace('/', '_')}"
    )

    metadata = {
        "source-bucket":   bucket,
        "source-key":      key,
        "file-format":     file_format,
        "row-count":       str(profile.get("row_count", "")),
        "catalogued-at":   now.isoformat(),
        "is-valid":        str(profile.get("valid", False)),
    }

    s3.put_object(
        Bucket=DESTINATION_BUCKET,
        Key=dest_key,
        Body=content,
        ContentType="application/octet-stream",
        Metadata=metadata,
    )

    log.info("Catalogued to s3://%s/%s", DESTINATION_BUCKET, dest_key)

    return {
        "source":      f"s3://{bucket}/{key}",
        "destination": f"s3://{DESTINATION_BUCKET}/{dest_key}",
        "profile":     profile,
        "metadata":    metadata,
    }


def _parse_event(event: dict[str, Any]) -> list[tuple[str, str]]:
    """Extract (bucket, key) pairs from either S3 event or HTTP body."""
    objects: list[tuple[str, str]] = []

    # S3 notification event
    for record in event.get("Records", []):
        s3_info = record.get("s3", {})
        bucket  = s3_info.get("bucket", {}).get("name", SOURCE_BUCKET)
        key     = unquote_plus(s3_info.get("object", {}).get("key", ""))
        if key:
            objects.append((bucket, key))

    # HTTP POST body (SAM local start-api)
    if not objects and "body" in event:
        try:
            body   = json.loads(event["body"] or "{}")
            bucket = body.get("bucket", SOURCE_BUCKET)
            key    = body.get("key", "")
            if key:
                objects.append((bucket, key))
        except json.JSONDecodeError:
            pass

    return objects


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Main Lambda entry point."""
    objects = _parse_event(event)
    log.info("Objects to process: %d", len(objects))

    if not objects:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "No S3 objects found in event"}),
        }

    s3      = _s3_client()
    results = []
    errors  = []

    for bucket, key in objects:
        try:
            result = process_s3_object(bucket, key, s3)
            results.append(result)
        except Exception as exc:
            log.error("Failed to process s3://%s/%s: %s", bucket, key, exc)
            errors.append({"key": key, "error": str(exc)})

    status = 200 if not errors else 207

    return {
        "statusCode": status,
        "headers":    {"Content-Type": "application/json"},
        "body": json.dumps({
            "processed": len(results),
            "errors":    errors,
            "results":   results,
        }, default=str),
    }
