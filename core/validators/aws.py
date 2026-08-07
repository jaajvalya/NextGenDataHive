"""AWS credential validation via STS."""
from __future__ import annotations

from typing import Any

from core.validators.base import ConnectionValidationError, norm, safe_error


def validate_aws(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        import boto3
        from botocore.exceptions import BotoCoreError, ClientError
    except ImportError as exc:
        raise ConnectionValidationError(
            "boto3 is not installed on the API server. Run: pip install boto3",
            platform="aws",
            error_type="dependency",
        ) from exc

    auth_type = norm(payload.get("auth_type")).lower() or "access_keys"
    region = norm(payload.get("region")) or "us-east-1"
    access_key = norm(payload.get("access_key_id"))
    secret_key = norm(payload.get("secret_access_key"))
    role_arn = norm(payload.get("role_arn"))

    try:
        if auth_type in {"access_keys"}:
            if not access_key or not secret_key:
                raise ConnectionValidationError(
                    "AWS access key ID and secret access key are required.",
                    platform="aws",
                    error_type="validation",
                )
            session = boto3.Session(
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region,
            )
            sts = session.client("sts")
            ident = sts.get_caller_identity()
        elif auth_type in {"iam_role", "assume_role"}:
            if not role_arn:
                raise ConnectionValidationError(
                    "IAM role ARN is required.",
                    platform="aws",
                    error_type="validation",
                )
            if access_key and secret_key:
                base = boto3.Session(
                    aws_access_key_id=access_key,
                    aws_secret_access_key=secret_key,
                    region_name=region,
                )
            else:
                base = boto3.Session(region_name=region)
            sts = base.client("sts")
            assumed = sts.assume_role(RoleArn=role_arn, RoleSessionName="datahive-validate")
            creds = assumed["Credentials"]
            session = boto3.Session(
                aws_access_key_id=creds["AccessKeyId"],
                aws_secret_access_key=creds["SecretAccessKey"],
                aws_session_token=creds["SessionToken"],
                region_name=region,
            )
            ident = session.client("sts").get_caller_identity()
        else:
            raise ConnectionValidationError(
                f"Unsupported AWS auth type '{auth_type}'.",
                platform="aws",
                error_type="validation",
            )
        return {
            "ok": True,
            "platform": "aws",
            "message": "AWS credentials validated (STS GetCallerIdentity)",
            "details": {
                "account": ident.get("Account"),
                "arn": ident.get("Arn"),
                "region": region,
                "auth_type": auth_type,
            },
        }
    except ConnectionValidationError:
        raise
    except (BotoCoreError, ClientError, Exception) as exc:
        raise ConnectionValidationError(
            f"AWS authentication failed: {safe_error(exc)}",
            platform="aws",
            error_type="auth",
        ) from exc
