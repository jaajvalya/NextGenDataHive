"""On-premise RDBMS validation: Postgres, MySQL, SQL Server, Oracle, Db2."""
from __future__ import annotations

from typing import Any

from core.validators.base import ConnectionValidationError, norm, safe_error

RDBMS_DEFAULT_PORTS = {
    "postgresql": 5432,
    "postgres": 5432,
    "mysql": 3306,
    "mariadb": 3306,
    "sqlserver": 1433,
    "mssql": 1433,
    "oracle": 1521,
    "db2": 50000,
    "mongodb": 27017,
}


def _rdbms_probe_sql(engine: str) -> str:
    if engine in {"oracle"}:
        return "SELECT banner FROM v$version WHERE ROWNUM = 1"
    if engine in {"sqlserver", "mssql"}:
        return "SELECT @@VERSION"
    if engine in {"db2"}:
        return "SELECT service_level FROM TABLE(sysproc.env_get_inst_info()) AS x"
    return "SELECT 1"


def validate_rdbms(payload: dict[str, Any]) -> dict[str, Any]:
    """Live-validate an on-premises RDBMS connection (Postgres/MySQL/SQL Server/Oracle/…)."""
    engine = norm(payload.get("engine") or payload.get("dialect") or "postgresql").lower()
    if engine in {"postgres", "pg"}:
        engine = "postgresql"
    if engine in {"mssql"}:
        engine = "sqlserver"

    host = norm(payload.get("host") or payload.get("account_id"))
    port_raw = norm(payload.get("port"))
    database = norm(payload.get("database"))
    user = norm(payload.get("access_key_id") or payload.get("username") or payload.get("user"))
    password = norm(payload.get("secret_access_key") or payload.get("password"))
    jdbc_url = norm(payload.get("jdbc_url") or payload.get("connection_url"))

    if engine == "other":
        if not jdbc_url:
            raise ConnectionValidationError(
                "Connection URL is required for engine=Other.",
                platform="rdbms",
                error_type="validation",
            )
        return _validate_rdbms_url(jdbc_url, user=user, password=password)

    if not host:
        raise ConnectionValidationError(
            "Host / IP is required for on-premises RDBMS.",
            platform="rdbms",
            error_type="validation",
        )
    if not user:
        raise ConnectionValidationError(
            "Username is required for on-premises RDBMS.",
            platform="rdbms",
            error_type="validation",
        )
    if not database:
        raise ConnectionValidationError(
            "Database / service name is required.",
            platform="rdbms",
            error_type="validation",
        )

    try:
        port = int(port_raw) if port_raw else RDBMS_DEFAULT_PORTS.get(engine, 5432)
    except ValueError as exc:
        raise ConnectionValidationError(
            "Port must be a number.",
            platform="rdbms",
            error_type="validation",
        ) from exc

    try:
        if engine == "postgresql":
            version = _rdbms_connect_postgres(host, port, database, user, password)
        elif engine in {"mysql", "mariadb"}:
            version = _rdbms_connect_mysql(host, port, database, user, password)
        elif engine == "sqlserver":
            version = _rdbms_connect_sqlserver(host, port, database, user, password)
        elif engine == "oracle":
            version = _rdbms_connect_oracle(host, port, database, user, password)
        elif engine == "db2":
            version = _rdbms_connect_db2(host, port, database, user, password)
        else:
            raise ConnectionValidationError(
                f"Unsupported RDBMS engine '{engine}'.",
                platform="rdbms",
                error_type="unsupported",
            )
    except ConnectionValidationError:
        raise
    except Exception as exc:
        raise ConnectionValidationError(
            f"RDBMS connection failed: {safe_error(exc)}",
            platform="rdbms",
            error_type="auth",
        ) from exc

    return {
        "ok": True,
        "platform": "rdbms",
        "message": f"{engine} connection successful",
        "details": {
            "engine": engine,
            "host": host,
            "port": port,
            "database": database,
            "version": str(version)[:160],
        },
    }


def _validate_rdbms_url(url: str, *, user: str, password: str) -> dict[str, Any]:
    """Best-effort URL validation via SQLAlchemy when available."""
    try:
        from sqlalchemy import create_engine, text
    except ImportError as exc:
        raise ConnectionValidationError(
            "SQLAlchemy is required for generic RDBMS URLs. "
            "Install with: pip install sqlalchemy",
            platform="rdbms",
            error_type="dependency",
        ) from exc

    connect_args: dict[str, Any] = {}
    # Prefer embedded credentials; otherwise inject user/password kwargs when driver supports it.
    try:
        engine = create_engine(url, pool_pre_ping=True, connect_args=connect_args)
        with engine.connect() as conn:
            if user and "://" in url and "@" not in url.split("://", 1)[1]:
                # Some drivers accept connect_args; if URL has no user, retry with query params is driver-specific.
                pass
            row = conn.execute(text("SELECT 1")).fetchone()
        return {
            "ok": True,
            "platform": "rdbms",
            "message": "RDBMS URL connection successful",
            "details": {"engine": "other", "probe": str(row[0]) if row else "ok"},
        }
    except Exception as exc:
        # Second attempt: rebuild URL with user/password if provided.
        if user and "://" in url and "@" not in url.split("://", 1)[1]:
            try:
                from urllib.parse import quote_plus

                scheme, rest = url.split("://", 1)
                auth = quote_plus(user)
                if password:
                    auth += ":" + quote_plus(password)
                rebuilt = f"{scheme}://{auth}@{rest}"
                engine = create_engine(rebuilt, pool_pre_ping=True)
                with engine.connect() as conn:
                    row = conn.execute(text("SELECT 1")).fetchone()
                return {
                    "ok": True,
                    "platform": "rdbms",
                    "message": "RDBMS URL connection successful",
                    "details": {"engine": "other", "probe": str(row[0]) if row else "ok"},
                }
            except Exception as exc2:
                raise ConnectionValidationError(
                    f"RDBMS URL connection failed: {safe_error(exc2)}",
                    platform="rdbms",
                    error_type="auth",
                ) from exc2
        raise ConnectionValidationError(
            f"RDBMS URL connection failed: {safe_error(exc)}",
            platform="rdbms",
            error_type="auth",
        ) from exc


def _rdbms_connect_postgres(host: str, port: int, database: str, user: str, password: str) -> str:
    try:
        import psycopg
    except ImportError as exc:
        raise ConnectionValidationError(
            "psycopg is not installed. Run: pip install 'psycopg[binary]'",
            platform="rdbms",
            error_type="dependency",
        ) from exc
    with psycopg.connect(
        host=host,
        port=port,
        dbname=database,
        user=user,
        password=password or None,
        connect_timeout=10,
    ) as conn, conn.cursor() as cur:
        cur.execute("SELECT version()")
        return str(cur.fetchone()[0])


def _rdbms_connect_mysql(host: str, port: int, database: str, user: str, password: str) -> str:
    try:
        import pymysql
    except ImportError as exc:
        raise ConnectionValidationError(
            "pymysql is not installed. Run: pip install pymysql",
            platform="rdbms",
            error_type="dependency",
        ) from exc
    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password or "",
        database=database,
        connect_timeout=10,
        read_timeout=10,
        write_timeout=10,
    )
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT VERSION()")
            return str(cur.fetchone()[0])
    finally:
        conn.close()


def _rdbms_connect_sqlserver(host: str, port: int, database: str, user: str, password: str) -> str:
    # Prefer pymssql (simpler install); fall back to pyodbc.
    try:
        import pymssql  # type: ignore
    except ImportError:
        pymssql = None  # type: ignore
    if pymssql is not None:
        conn = pymssql.connect(
            server=host,
            port=port,
            user=user,
            password=password or "",
            database=database,
            login_timeout=10,
            timeout=10,
        )
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT @@VERSION")
                row = cur.fetchone()
                return str(row[0] if row else "ok")
        finally:
            conn.close()

    try:
        import pyodbc  # type: ignore
    except ImportError as exc:
        raise ConnectionValidationError(
            "SQL Server driver missing. Install one of: pip install pymssql  OR  pip install pyodbc",
            platform="rdbms",
            error_type="dependency",
        ) from exc

    # Common free ODBC drivers; try a few names.
    drivers = [
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server",
        "SQL Server",
    ]
    last_err: Exception | None = None
    for driver in drivers:
        conn_str = (
            f"DRIVER={{{driver}}};SERVER={host},{port};DATABASE={database};"
            f"UID={user};PWD={password or ''};TrustServerCertificate=yes;"
        )
        try:
            conn = pyodbc.connect(conn_str, timeout=10)
            try:
                cur = conn.cursor()
                cur.execute("SELECT @@VERSION")
                row = cur.fetchone()
                return str(row[0] if row else "ok")
            finally:
                conn.close()
        except Exception as exc:
            last_err = exc
            continue
    raise ConnectionValidationError(
        f"SQL Server connection failed: {safe_error(last_err or Exception('no ODBC driver worked'))}",
        platform="rdbms",
        error_type="auth",
    )


def _rdbms_connect_oracle(host: str, port: int, database: str, user: str, password: str) -> str:
    try:
        import oracledb  # type: ignore
    except ImportError as exc:
        raise ConnectionValidationError(
            "oracledb is not installed. Run: pip install oracledb",
            platform="rdbms",
            error_type="dependency",
        ) from exc
    dsn = oracledb.makedsn(host, port, service_name=database)
    conn = oracledb.connect(user=user, password=password or "", dsn=dsn)
    try:
        with conn.cursor() as cur:
            cur.execute(_rdbms_probe_sql("oracle"))
            row = cur.fetchone()
            return str(row[0] if row else "ok")
    finally:
        conn.close()


def _rdbms_connect_db2(host: str, port: int, database: str, user: str, password: str) -> str:
    try:
        import ibm_db  # type: ignore
    except ImportError as exc:
        raise ConnectionValidationError(
            "ibm_db is not installed. Run: pip install ibm_db",
            platform="rdbms",
            error_type="dependency",
        ) from exc
    conn_str = (
        f"DATABASE={database};HOSTNAME={host};PORT={port};PROTOCOL=TCPIP;"
        f"UID={user};PWD={password or ''};"
    )
    conn = ibm_db.connect(conn_str, "", "")
    try:
        stmt = ibm_db.exec_immediate(conn, "SELECT 1 FROM SYSIBM.SYSDUMMY1")
        row = ibm_db.fetch_tuple(stmt)
        return str(row[0] if row else "ok")
    finally:
        ibm_db.close(conn)
