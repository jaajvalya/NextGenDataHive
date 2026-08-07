"""Uploaded filenames reach the filesystem, so they must not be able to
escape the landing directory or smuggle in shell/path characters.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from api.files import safe_stored_name

TRAVERSAL_ATTEMPTS = [
    "../../etc/passwd",
    "..\\..\\windows\\system32\\config",
    "/etc/passwd",
    "./../.env",
    "subdir/nested/file.csv",
]


@pytest.mark.parametrize("original", TRAVERSAL_ATTEMPTS)
def test_the_result_is_a_single_flat_filename(original):
    """No separator survives, so the name cannot describe a nested path.

    Backslashes become underscores rather than being treated as separators,
    which is why a literal ".." may remain — harmless once it can no longer
    be followed by a separator.
    """
    stored = safe_stored_name(original)
    assert "/" not in stored
    assert "\\" not in stored
    assert Path(stored).name == stored


@pytest.mark.parametrize("original", TRAVERSAL_ATTEMPTS)
def test_the_stored_path_cannot_escape_the_upload_directory(original):
    upload_dir = Path("/tmp/datahive-upload-test").resolve()
    resolved = (upload_dir / safe_stored_name(original)).resolve()
    assert resolved.parent == upload_dir


def test_the_base_name_is_preserved():
    assert safe_stored_name("quarterly report.csv").endswith("quarterly report.csv")


def test_a_unique_prefix_is_added_so_uploads_never_collide():
    a = safe_stored_name("data.csv")
    b = safe_stored_name("data.csv")
    assert a != b
    assert a.endswith("_data.csv") and b.endswith("_data.csv")
    assert len(a.split("_")[0]) == 12


def test_awkward_characters_are_replaced():
    stored = safe_stored_name("we;ird$na|me*.csv")
    assert stored.endswith("we_ird_na_me_.csv")


def test_an_empty_name_still_produces_something_usable():
    assert safe_stored_name("").endswith("upload")
