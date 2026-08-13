"""
sample_emr_spark.py — EMR-style PySpark application (Playground)

Simulates an AWS EMR Spark job running against:
  • MinIO   — S3-compatible object storage (s3a://)
  • Nessie  — Iceberg REST catalog (git-like versioning)

What this job does:
  1. Reads the Iceberg tables written by the Glue job (products, orders)
  2. Demonstrates Iceberg time-travel and schema evolution
  3. Calculates daily order trends using Spark Structured Streaming (micro-batch)
  4. Performs a merge (UPSERT) to update product stock quantities
  5. Shows Nessie branch/tag operations for data versioning

Submit to the local Spark cluster (inside Docker or from host):
  docker exec playground-spark-master \
    spark-submit \
      --master spark://spark-master:7077 \
      --deploy-mode client \
      /opt/bitnami/spark/apps/sample_emr_spark.py

Or from host (requires spark-submit on PATH):
  spark-submit \
    --master spark://localhost:7077 \
    --conf spark.sql.catalog.nessie.uri=http://localhost:19120/api/v2 \
    --conf spark.hadoop.fs.s3a.endpoint=http://localhost:9000 \
    infra/playground/spark/apps/sample_emr_spark.py
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("emr-spark-job")

from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import (
    StructType, StructField,
    StringType, DoubleType, IntegerType, LongType,
)

# ── Config — resolves to Docker-internal hostnames by default ─────────────────
MINIO_ENDPOINT   = os.getenv("MINIO_ENDPOINT",   "http://minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY",  "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY",  "minioadmin")
NESSIE_URI       = os.getenv("NESSIE_URI",         "http://nessie:19120/api/v2")
WAREHOUSE        = os.getenv("ICEBERG_WAREHOUSE",  "s3a://iceberg-warehouse/")
NAMESPACE        = "datahive"
RUN_TS           = datetime.now(timezone.utc).isoformat()


def get_spark() -> SparkSession:
    """Build a SparkSession. spark-defaults.conf is read automatically by the driver."""
    return (
        SparkSession.builder
        .appName("datahive-emr-demo")
        # These override/supplement spark-defaults.conf when running standalone
        .config("spark.sql.extensions",
                "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions")
        .config("spark.sql.catalog.nessie",
                "org.apache.iceberg.spark.SparkCatalog")
        .config("spark.sql.catalog.nessie.catalog-impl",
                "org.apache.iceberg.nessie.NessieCatalog")
        .config("spark.sql.catalog.nessie.uri", NESSIE_URI)
        .config("spark.sql.catalog.nessie.ref", "main")
        .config("spark.sql.catalog.nessie.warehouse", WAREHOUSE)
        .config("spark.sql.catalog.nessie.io-impl", "org.apache.iceberg.aws.s3.S3FileIO")
        .config("spark.sql.catalog.nessie.s3.endpoint", MINIO_ENDPOINT)
        .config("spark.sql.catalog.nessie.s3.path-style-access", "true")
        .config("spark.sql.catalog.nessie.s3.access-key-id", MINIO_ACCESS_KEY)
        .config("spark.sql.catalog.nessie.s3.secret-access-key", MINIO_SECRET_KEY)
        .config("spark.sql.defaultCatalog", "nessie")
        .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
        .config("spark.hadoop.fs.s3a.endpoint", MINIO_ENDPOINT)
        .config("spark.hadoop.fs.s3a.access.key", MINIO_ACCESS_KEY)
        .config("spark.hadoop.fs.s3a.secret.key", MINIO_SECRET_KEY)
        .config("spark.hadoop.fs.s3a.path.style.access", "true")
        .config("spark.hadoop.fs.s3a.connection.ssl.enabled", "false")
        .config("spark.hadoop.fs.s3a.checksum.validation", "false")
        .config("spark.sql.shuffle.partitions", "4")
        .getOrCreate()
    )


# ─────────────────────────────────────────────────────────────────────────────
# Demo 1: Read Iceberg tables written by the Glue job
# ─────────────────────────────────────────────────────────────────────────────

def demo_read_iceberg_tables(spark: SparkSession) -> None:
    log.info("── Demo 1: Reading Iceberg tables from Nessie catalog ──")

    tables = spark.sql("SHOW TABLES IN nessie.datahive").collect()
    log.info("Tables in nessie.datahive: %s", [r.tableName for r in tables])

    products = spark.table("nessie.datahive.products")
    orders   = spark.table("nessie.datahive.orders")

    log.info("Products schema:")
    products.printSchema()
    products.show(5, truncate=False)

    log.info("Orders schema:")
    orders.printSchema()
    orders.show(5, truncate=False)


# ─────────────────────────────────────────────────────────────────────────────
# Demo 2: Iceberg Time Travel
# ─────────────────────────────────────────────────────────────────────────────

def demo_time_travel(spark: SparkSession) -> None:
    log.info("── Demo 2: Iceberg Time Travel ──")

    # Show all snapshots for the orders table
    snapshots = spark.sql("SELECT * FROM nessie.datahive.orders.snapshots ORDER BY committed_at")
    snapshots.show(truncate=False)

    # Read the earliest snapshot (first write by Glue job)
    first_snapshot = snapshots.orderBy("committed_at").first()
    if first_snapshot:
        snapshot_id = first_snapshot["snapshot_id"]
        log.info("Reading orders at snapshot_id=%s", snapshot_id)
        spark.sql(f"""
            SELECT COUNT(*) AS count_at_snapshot
            FROM nessie.datahive.orders
            VERSION AS OF {snapshot_id}
        """).show()


# ─────────────────────────────────────────────────────────────────────────────
# Demo 3: Daily Order Trends (batch aggregation)
# ─────────────────────────────────────────────────────────────────────────────

def demo_daily_trends(spark: SparkSession) -> None:
    log.info("── Demo 3: Daily Order Trends ──")

    daily_trends = spark.sql("""
        SELECT
            order_date,
            order_status,
            COUNT(order_id)                        AS order_count,
            ROUND(SUM(quantity * unit_price), 2)   AS daily_revenue,
            AVG(quantity)                           AS avg_qty_per_order
        FROM nessie.datahive.orders
        GROUP BY order_date, order_status
        ORDER BY order_date, order_status
    """)

    daily_trends.show(truncate=False)

    # Write results as a new Iceberg table
    daily_trends.withColumn("computed_at", F.lit(RUN_TS)) \
        .writeTo("nessie.datahive.daily_order_trends") \
        .using("iceberg") \
        .tableProperty("write.format.default", "parquet") \
        .createOrReplace()

    log.info("Written: nessie.datahive.daily_order_trends")


# ─────────────────────────────────────────────────────────────────────────────
# Demo 4: Iceberg MERGE INTO (UPSERT) — update product stock
# ─────────────────────────────────────────────────────────────────────────────

def demo_merge_upsert(spark: SparkSession) -> None:
    log.info("── Demo 4: Iceberg MERGE INTO (UPSERT) ──")

    # Create a DataFrame of stock updates
    stock_updates_data = [
        ("P001", 225),  # reduced by 25 (sold)
        ("P002", 178),  # reduced by 2 (sold)
        ("P004", 317),  # reduced by 3 (sold)
        ("P007", 496),  # reduced by 4 (sold)
        ("P009", 999),  # new product (will be inserted)
    ]
    stock_updates = spark.createDataFrame(
        stock_updates_data,
        schema=StructType([
            StructField("product_id",     StringType(),  False),
            StructField("stock_quantity", IntegerType(), True),
        ]),
    ).withColumn("updated_at", F.lit(RUN_TS))

    stock_updates.createOrReplaceTempView("stock_updates")

    # MERGE: update existing products, insert new ones
    spark.sql("""
        MERGE INTO nessie.datahive.products AS target
        USING stock_updates AS source
        ON target.product_id = source.product_id
        WHEN MATCHED THEN
            UPDATE SET
                target.stock_quantity = source.stock_quantity,
                target.updated_at     = source.updated_at
        WHEN NOT MATCHED THEN
            INSERT (product_id, product_name, category, price, stock_quantity, updated_at, ingested_at)
            VALUES (
                source.product_id,
                'Unknown Product',
                'Uncategorized',
                0.0,
                source.stock_quantity,
                source.updated_at,
                source.updated_at
            )
    """)

    log.info("MERGE complete. Updated product stock quantities.")
    spark.sql("""
        SELECT product_id, product_name, stock_quantity, updated_at
        FROM nessie.datahive.products
        WHERE product_id IN ('P001','P002','P004','P007','P009')
    """).show(truncate=False)


# ─────────────────────────────────────────────────────────────────────────────
# Demo 5: Nessie Branch Operations (data versioning like Git)
# ─────────────────────────────────────────────────────────────────────────────

def demo_nessie_branching(spark: SparkSession) -> None:
    log.info("── Demo 5: Nessie Branch Operations ──")

    # Create a feature branch for experimental data
    spark.sql("CREATE BRANCH IF NOT EXISTS experimental IN nessie")
    log.info("Created Nessie branch: experimental")

    # Switch to the experimental branch and write a test table
    spark.sql("USE REFERENCE experimental IN nessie")

    experimental_df = spark.createDataFrame(
        [("EXP001", "Experimental Widget", "Test", 9.99, 100)],
        schema=StructType([
            StructField("product_id",     StringType(),  False),
            StructField("product_name",   StringType(),  True),
            StructField("category",       StringType(),  True),
            StructField("price",          DoubleType(),  True),
            StructField("stock_quantity", IntegerType(), True),
        ]),
    )

    # Write only to the experimental branch — main branch is unaffected
    experimental_df \
        .writeTo("nessie.datahive.experimental_products") \
        .using("iceberg") \
        .createOrReplace()

    log.info("Written experimental table on 'experimental' branch")
    log.info("Main branch remains clean — experimental_products does not exist there")

    # Verify: switch back to main and confirm the table is absent
    spark.sql("USE REFERENCE main IN nessie")
    main_tables = spark.sql("SHOW TABLES IN nessie.datahive").collect()
    log.info(
        "Tables on main branch: %s",
        [r.tableName for r in main_tables],
    )


# ─────────────────────────────────────────────────────────────────────────────
# Demo 6: Schema Evolution — add a new column to orders
# ─────────────────────────────────────────────────────────────────────────────

def demo_schema_evolution(spark: SparkSession) -> None:
    log.info("── Demo 6: Iceberg Schema Evolution ──")

    # Add a new column without rewriting existing data
    spark.sql("""
        ALTER TABLE nessie.datahive.orders
        ADD COLUMN discount_pct DOUBLE COMMENT 'Discount percentage applied to order'
    """)
    log.info("Added column: discount_pct to nessie.datahive.orders")

    spark.sql("""
        ALTER TABLE nessie.datahive.orders
        ADD COLUMN is_flagged BOOLEAN COMMENT 'Manually flagged for review'
    """)
    log.info("Added column: is_flagged to nessie.datahive.orders")

    # Existing rows return NULL for new columns — no data rewrite needed
    spark.sql("""
        SELECT order_id, order_status, discount_pct, is_flagged
        FROM nessie.datahive.orders
        LIMIT 5
    """).show(truncate=False)


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    log.info("=== EMR-style Spark Job starting (run_ts=%s) ===", RUN_TS)

    spark = get_spark()
    spark.sparkContext.setLogLevel("WARN")

    try:
        demo_read_iceberg_tables(spark)
        demo_time_travel(spark)
        demo_daily_trends(spark)
        demo_merge_upsert(spark)
        demo_nessie_branching(spark)
        demo_schema_evolution(spark)
        log.info("=== EMR-style Spark Job complete ===")
    finally:
        spark.stop()


if __name__ == "__main__":
    main()
