#!/bin/sh
# init-minio.sh — runs inside minio/mc container after MinIO is healthy
# Creates all buckets required by the playground and uploads sample data.
set -e

MINIO_ALIAS="playground"
MINIO_HOST="http://minio:9000"
ACCESS_KEY="${MINIO_ROOT_USER:-minioadmin}"
SECRET_KEY="${MINIO_ROOT_PASSWORD:-minioadmin}"

echo ">>> Configuring mc alias: ${MINIO_ALIAS} -> ${MINIO_HOST}"
mc alias set "${MINIO_ALIAS}" "${MINIO_HOST}" "${ACCESS_KEY}" "${SECRET_KEY}"

# ── Create buckets ────────────────────────────────────────────────────────────
for BUCKET in iceberg-warehouse raw-landing processed checkpoints; do
  if mc ls "${MINIO_ALIAS}/${BUCKET}" > /dev/null 2>&1; then
    echo ">>> Bucket already exists: ${BUCKET}"
  else
    mc mb "${MINIO_ALIAS}/${BUCKET}"
    echo ">>> Created bucket: ${BUCKET}"
  fi
done

# ── Bucket layout ─────────────────────────────────────────────────────────────
# iceberg-warehouse/   — Iceberg table data & metadata (Nessie catalog warehouse)
#   datahive/          — default namespace for all playground Iceberg tables
#
# raw-landing/         — ingest zone; drop raw CSV / JSON / Parquet here
#   events/            — sample Kinesis-like event payloads (JSON)
#   products/          — sample product CSV files
#   orders/            — sample order CSV files
#
# processed/           — output zone for Glue / Spark job results
#   reports/
#   exports/
#
# checkpoints/         — Spark Structured Streaming checkpoint location

# ── Upload sample CSV data into raw-landing/ ──────────────────────────────────

# products.csv
cat > /tmp/products.csv <<'CSV'
product_id,product_name,category,price,stock_quantity,updated_at
P001,Wireless Headphones,Electronics,79.99,250,2026-08-01T10:00:00Z
P002,Running Shoes,Footwear,129.99,180,2026-08-01T10:05:00Z
P003,Coffee Maker,Appliances,49.99,90,2026-08-01T10:10:00Z
P004,Yoga Mat,Sports,29.99,320,2026-08-01T10:15:00Z
P005,Mechanical Keyboard,Electronics,149.99,75,2026-08-01T10:20:00Z
P006,Desk Lamp,Home Office,39.99,200,2026-08-01T10:25:00Z
P007,Water Bottle,Sports,19.99,500,2026-08-01T10:30:00Z
P008,Notebook Set,Stationery,14.99,400,2026-08-01T10:35:00Z
CSV
mc cp /tmp/products.csv "${MINIO_ALIAS}/raw-landing/products/products_2026_08_01.csv"
echo ">>> Uploaded sample: raw-landing/products/products_2026_08_01.csv"

# orders.csv
cat > /tmp/orders.csv <<'CSV'
order_id,customer_id,product_id,quantity,unit_price,order_status,order_date
O1001,C101,P001,1,79.99,completed,2026-08-01
O1002,C102,P002,2,129.99,completed,2026-08-01
O1003,C103,P003,1,49.99,pending,2026-08-02
O1004,C104,P005,1,149.99,shipped,2026-08-02
O1005,C105,P004,3,29.99,completed,2026-08-03
O1006,C101,P007,2,19.99,completed,2026-08-03
O1007,C106,P001,1,79.99,cancelled,2026-08-04
O1008,C107,P006,1,39.99,completed,2026-08-04
O1009,C102,P008,4,14.99,pending,2026-08-05
O1010,C108,P002,1,129.99,shipped,2026-08-05
CSV
mc cp /tmp/orders.csv "${MINIO_ALIAS}/raw-landing/orders/orders_2026_08_01.csv"
echo ">>> Uploaded sample: raw-landing/orders/orders_2026_08_01.csv"

# events.json (one JSON object per line — Kinesis-like payload)
cat > /tmp/events.json <<'JSON'
{"event_id":"E001","event_type":"page_view","user_id":"U101","session_id":"S9001","page":"/home","timestamp":"2026-08-01T10:00:01Z","properties":{"device":"mobile","os":"iOS"}}
{"event_id":"E002","event_type":"product_view","user_id":"U102","session_id":"S9002","page":"/product/P001","timestamp":"2026-08-01T10:00:05Z","properties":{"device":"desktop","os":"macOS"}}
{"event_id":"E003","event_type":"add_to_cart","user_id":"U101","session_id":"S9001","page":"/cart","timestamp":"2026-08-01T10:00:20Z","properties":{"product_id":"P001","quantity":1}}
{"event_id":"E004","event_type":"purchase","user_id":"U101","session_id":"S9001","page":"/checkout","timestamp":"2026-08-01T10:01:00Z","properties":{"order_id":"O1001","total":79.99}}
{"event_id":"E005","event_type":"page_view","user_id":"U103","session_id":"S9003","page":"/sale","timestamp":"2026-08-01T10:01:30Z","properties":{"device":"tablet","os":"Android"}}
JSON
mc cp /tmp/events.json "${MINIO_ALIAS}/raw-landing/events/events_2026_08_01.json"
echo ">>> Uploaded sample: raw-landing/events/events_2026_08_01.json"

# ── Set public read policy on raw-landing (convenient for playground) ─────────
mc anonymous set download "${MINIO_ALIAS}/raw-landing"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  MinIO playground init complete                          ║"
echo "║  Buckets: iceberg-warehouse, raw-landing,                ║"
echo "║           processed, checkpoints                         ║"
echo "║  Console: http://localhost:9001  (minioadmin/minioadmin)  ║"
echo "╚══════════════════════════════════════════════════════════╝"
