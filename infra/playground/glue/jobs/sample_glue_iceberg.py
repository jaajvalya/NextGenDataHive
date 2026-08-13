"""
sample_glue_iceberg.py — AWS Glue 4.0 local job (Playground)

What this job does:
  1. Reads products.csv and orders.csv from MinIO (raw-landing/)
  2. Enriches orders with product data (join)
  3. Calculates revenue metrics per product category
  4. Writes three Iceberg tables into the Nessie catalog:
       nessie.datahive.products
       nessie.datahive.orders
       nessie.datahive.revenue_by_category

Run locally (inside Glue Docker container):
  python /home/glue_user/workspace/jobs/sample_glue_iceberg.py

Run via JupyterLab:
  Open http://localhost:8888?token=datahive and run the cells
  from notebooks/glue_iceberg_demo.ipynb

Run from host machine:
  docker exec playground-glue \
    python /home/glue_user/workspace/jobs/sample_glue_iceberg.py
"""
from __future__ import annotations

import os
import sys
import logging
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("glue-iceberg-job")

# ── PySpark / Glue imports ────────────────────────────────────────────────────
try:
    from pyspark.sql import SparkSession
    from pyspark.sql import functions as F
    from pyspark.sql.types import (
        StructType, StructField,
        StringType, DoubleType, IntegerType, TimestampType,
    )
    HAS_GLUE_CONTEXT = False
    try:
        from awsglue.context import GlueContext
        from awsglue.job import Job
        from awsglue.utils import getResolvedOptions
        HAS_GLUE_CONTEXT = True
    except ImportError:
        log.info("awsglue SDK not found — running in plain PySpark mode (local dev)")
except ImportError as exc:
    log.error("PySpark not found. Ensure you are running inside the Glue Docker container.")
    raise SystemExit(1) from exc

# ── Environment / config ──────────────────────────────────────────────────────
MINIO_ENDPOINT   = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
NESSIE_URI       = os.getenv("NESSIE_URI", "http://nessie:19120/api/v2")
WAREHOUSE        = os.getenv("ICEBERG_WAREHOUSE", "s3a://iceberg-warehouse/")
RAW_BUCKET       = "s3a://raw-landing"
JOB_NAME         = "sample-glue-iceberg"
NAMESPACE        = "datahive"
RUN_TS           = datetime.now(timezone.utc).isoformat()


def build_spark_session() -> SparkSession:
    """Build a SparkSession with Iceberg + Nessie + MinIO/S3A config."""
    builder = (
        SparkSession.builder.appName(JOB_NAME)
        # Iceberg
        .config(
            "spark.sql.extensions",
            "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions",
        )
        # Nessie catalog
        .config("spark.sql.catalog.nessie", "org.apache.iceberg.spark.SparkCatalog")
        .config("spark.sql.catalog.nessie.catalog-impl", "org.apache.iceberg.nessie.NessieCatalog")
        .config("spark.sql.catalog.nessie.uri", NESSIE_URI)
        .config("spark.sql.catalog.nessie.ref", "main")
        .config("spark.sql.catalog.nessie.warehouse", WAREHOUSE)
        .config("spark.sql.catalog.nessie.io-impl", "org.apache.iceberg.aws.s3.S3FileIO")
        .config("spark.sql.catalog.nessie.s3.endpoint", MINIO_ENDPOINT)
        .config("spark.sql.catalog.nessie.s3.path-style-access", "true")
        .config("spark.sql.catalog.nessie.s3.access-key-id", MINIO_ACCESS_KEY)
        .config("spark.sql.catalog.nessie.s3.secret-access-key", MINIO_SECRET_KEY)
        .config("spark.sql.defaultCatalog", "nessie")
        # MinIO / S3A
        .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
        .config("spark.hadoop.fs.s3a.endpoint", MINIO_ENDPOINT)
        .config("spark.hadoop.fs.s3a.access.key", MINIO_ACCESS_KEY)
        .config("spark.hadoop.fs.s3a.secret.key", MINIO_SECRET_KEY)
        .config("spark.hadoop.fs.s3a.path.style.access", "true")
        .config("spark.hadoop.fs.s3a.connection.ssl.enabled", "false")
        .config("spark.hadoop.fs.s3a.checksum.validation", "false")
        # Tune for local
        .config("spark.sql.shuffle.partitions", "4")
        .config("spark.driver.memory", "1g")
    )
    return builder.getOrCreate()


def ensure_namespace(spark: SparkSession, namespace: str) -> None:
    spark.sql(f"CREATE NAMESPACE IF NOT EXISTS nessie.{namespace}")
    log.info("Namespace ready: nessie.%s", namespace)


# ── Schema definitions ────────────────────────────────────────────────────────

PRODUCTS_SCHEMA = StructType([
    StructField("product_id",     StringType(),  False),
    StructField("product_name",   StringType(),  True),
    StructField("category",       StringType(),  True),
    StructField("price",          DoubleType(),  True),
    StructField("stock_quantity", IntegerType(), True),
    StructField("updated_at",     StringType(),  True),
])

ORDERS_SCHEMA = StructType([
    StructField("order_id",     StringType(), False),
    StructField("customer_id",  StringType(), True),
    StructField("product_id",   StringType(), True),
    StructField("quantity",     IntegerType(), True),
    StructField("unit_price",   DoubleType(),  True),
    StructField("order_status", StringType(), True),
    StructField("order_date",   StringType(), True),
])


def read_csv(spark: SparkSession, path: str, schema: StructType):
    log.info("Reading CSV: %s", path)
    return (
        spark.read
        .option("header", "true")
        .schema(schema)
        .csv(path)
    )


def write_iceberg(df, table: str, partition_cols: list[str] | None = None) -> None:
    """Create-or-replace an Iceberg table in the Nessie catalog."""
    full_table = f"nessie.{NAMESPACE}.{table}"
    log.info("Writing Iceberg table: %s (rows=%d)", full_table, df.count())

    writer = df.writeTo(full_table).using("iceberg")

    if partition_cols:
        from pyspark.sql.functions import col as scol
        writer = writer.partitionedBy(*[scol(c) for c in partition_cols])

    writer.tableProperty("write.format.default", "parquet") \
          .tableProperty("write.parquet.compression-codec", "snappy") \
          .tableProperty("history.expire.min-snapshots-to-keep", "3") \
          .createOrReplace()

    log.info("Written: %s", full_table)


def main() -> None:
    log.info("=== Glue Iceberg Job starting (run_ts=%s) ===", RUN_TS)

    spark = build_spark_session()
    spark.sparkContext.setLogLevel("WARN")

    # ── Step 1: Ensure the namespace exists ───────────────────────────────────
    ensure_namespace(spark, NAMESPACE)

    # ── Step 2: Read raw CSVs from MinIO ─────────────────────────────────────
    products_df = read_csv(
        spark,
        f"{RAW_BUCKET}/products/",
        PRODUCTS_SCHEMA,
    ).withColumn("ingested_at", F.lit(RUN_TS))

    orders_df = read_csv(
        spark,
        f"{RAW_BUCKET}/orders/",
        ORDERS_SCHEMA,
    ).withColumn("order_date", F.to_date("order_date")) \
     .withColumn("ingested_at", F.lit(RUN_TS))

    log.info("Products loaded: %d rows", products_df.count())
    log.info("Orders loaded: %d rows", orders_df.count())

    products_df.printSchema()
    orders_df.printSchema()

    # ── Step 3: Write base Iceberg tables ─────────────────────────────────────
    write_iceberg(products_df, "products")
    write_iceberg(orders_df,   "orders", partition_cols=["order_status"])

    # ── Step 4: Revenue aggregation (enriched view) ───────────────────────────
    revenue_df = (
        orders_df
        .filter(F.col("order_status") == "completed")
        .join(products_df.select("product_id", "product_name", "category"), "product_id")
        .withColumn("line_total", F.col("quantity") * F.col("unit_price"))
        .groupBy("category")
        .agg(
            F.count("order_id").alias("total_orders"),
            F.sum("line_total").alias("total_revenue"),
            F.avg("unit_price").alias("avg_unit_price"),
            F.sum("quantity").alias("total_units_sold"),
            F.max("order_date").alias("last_order_date"),
        )
        .withColumn("total_revenue", F.round("total_revenue", 2))
        .withColumn("avg_unit_price", F.round("avg_unit_price", 2))
        .withColumn("computed_at", F.lit(RUN_TS))
        .orderBy(F.desc("total_revenue"))
    )

    write_iceberg(revenue_df, "revenue_by_category", partition_cols=["category"])

    # ── Step 5: Show results ──────────────────────────────────────────────────
    log.info("=== Revenue by Category ===")
    revenue_df.show(truncate=False)

    # Verify Iceberg tables are queryable
    log.info("=== Verifying Iceberg tables via Nessie catalog ===")
    spark.sql("SHOW TABLES IN nessie.datahive").show()
    spark.sql("SELECT COUNT(*) AS product_count FROM nessie.datahive.products").show()
    spark.sql("SELECT COUNT(*) AS order_count FROM nessie.datahive.orders").show()

    # Show Iceberg snapshot history
    spark.sql("SELECT * FROM nessie.datahive.orders.snapshots").show(5, truncate=False)

    log.info("=== Glue Iceberg Job complete ===")
    spark.stop()


if __name__ == "__main__":
    # Handle Glue job parameters when running on real AWS Glue
    if HAS_GLUE_CONTEXT and "--JOB_NAME" in sys.argv:
        args = getResolvedOptions(sys.argv, ["JOB_NAME"])
        JOB_NAME = args["JOB_NAME"]
    main()
