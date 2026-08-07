"""The read-only guard is the only thing standing between the SQL explorer
and a destructive statement, so it is tested directly rather than through HTTP.
"""
from __future__ import annotations

import pytest

from core.postgres_store import _assert_readonly_sql

READ_ONLY = [
    "select 1",
    "SELECT * FROM public.orders",
    "  select id, name from silver.customer  ",
    "with recent as (select 1 as n) select n from recent",
    "select 1;",  # a single trailing semicolon is tolerated
    "-- a leading comment\nselect 1",
]

REJECTED = [
    "delete from orders",
    "DROP TABLE orders",
    "truncate table orders",
    "insert into orders (id) values (1)",
    "update orders set id = 2",
    "alter table orders add column x int",
    "create table t (id int)",
    "grant select on orders to bob",
    "select 1; drop table orders",       # statement stacking
    "select 1; select 2",
    "/* sneaky */ delete from orders",   # comment-hidden DML
    "",
    "   ",
]


@pytest.mark.parametrize("sql", READ_ONLY)
def test_read_only_statements_are_allowed(sql):
    assert _assert_readonly_sql(sql)


@pytest.mark.parametrize("sql", REJECTED)
def test_writes_and_stacked_statements_are_rejected(sql):
    with pytest.raises(ValueError):
        _assert_readonly_sql(sql)


def test_trailing_semicolon_is_stripped_from_the_returned_statement():
    assert _assert_readonly_sql("select 1;") == "select 1"
