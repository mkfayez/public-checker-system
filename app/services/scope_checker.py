"""Business logic for the Scope Checker.

This module loads an Excel workbook from a remote URL (configured via
``SCOPE_SOURCE_URL`` environment variable) and exposes a function to
check scope status by either Unified Site ID or TAWAL ID. Data is
cached in memory to avoid repeated downloads.

The expected workbook has a sheet named ``AllSites`` with at least the
following columns:
    - 'Unified Site ID'
    - 'TAWAL ID'
    - 'SubProject'
    - 'Scope Status'

See the original ``Scope checker.py`` for reference.
"""

from __future__ import annotations

import os
import threading
import time
import tempfile
import shutil
from typing import Dict, List, Any, Optional

import requests
import pandas as pd

__all__ = ["check_scope"]

# Environment configuration
SCOPE_SOURCE_URL = os.getenv("SCOPE_SOURCE_URL")
CACHE_TTL = int(os.getenv("CACHE_TTL", "300"))  # seconds

if not SCOPE_SOURCE_URL:
    raise RuntimeError(
        "SCOPE_SOURCE_URL environment variable is required for scope checker."
    )

_scope_cache_lock: threading.Lock = threading.Lock()
_scope_df: Optional[pd.DataFrame] = None
_scope_last_ts: float = 0.0


def _download_scope_file(url: str) -> str:
    """Download the scope Excel file from a URL into a temporary file and return its path."""
    resp = requests.get(url, stream=True)
    resp.raise_for_status()
    fd, path = tempfile.mkstemp(suffix=".xlsx")
    with os.fdopen(fd, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
    return path


def _load_scope_df() -> pd.DataFrame:
    """Load the scope DataFrame from the Excel workbook."""
    tmp_path = _download_scope_file(SCOPE_SOURCE_URL)
    try:
        df = pd.read_excel(
            tmp_path,
            sheet_name="AllSites",
            usecols=["Unified Site ID", "TAWAL ID", "SubProject", "Scope Status"],
            dtype={"Unified Site ID": str, "TAWAL ID": str},
        )
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
    # Normalize strings: strip whitespace and uppercase site ids
    df["Unified Site ID"] = df["Unified Site ID"].fillna(" ").astype(str).str.strip().str.upper()
    df["TAWAL ID"] = df["TAWAL ID"].fillna(" ").astype(str).str.strip()
    return df


def _get_scope_df() -> pd.DataFrame:
    """Get cached DataFrame, reloading if cache has expired."""
    global _scope_df, _scope_last_ts
    now = time.monotonic()
    with _scope_cache_lock:
        if _scope_df is None or (now - _scope_last_ts) > CACHE_TTL:
            _scope_df = _load_scope_df()
            _scope_last_ts = now
    return _scope_df  # type: ignore[return-value]


def check_scope(site_ids: List[str] | None, tawal_ids: List[str] | None) -> Dict[str, Any]:
    """Check the scope status for given lists of Unified Site IDs or TAWAL IDs.

    Exactly one of ``site_ids`` or ``tawal_ids`` should be provided. Both lists
    may be empty or None; an error will be returned in that case.

    Returns a dict with ``results``: a list of dicts with keys ``id``,
    ``subproject``, and ``status``. If no matches are found for an id,
    ``subproject`` will be ``—`` and ``status`` will be ``Not Found``.
    """
    df = _get_scope_df()
    results: List[Dict[str, str]] = []

    # Normalize lists: remove empty strings, strip whitespace
    if site_ids:
        site_ids = [s.strip().upper() for s in site_ids if s.strip()]
    if tawal_ids:
        tawal_ids = [t.strip() for t in tawal_ids if t.strip()]

    if not site_ids and not tawal_ids:
        return {"error": "Please provide at least one ID."}

    if site_ids:
        matches = df[df["Unified Site ID"].isin(site_ids)]
        for sid in site_ids:
            rows = matches[matches["Unified Site ID"] == sid]
            if rows.empty:
                results.append({"id": sid, "subproject": "—", "status": "Not Found"})
            else:
                for _, row in rows.iterrows():
                    results.append(
                        {
                            "id": sid,
                            "subproject": str(row["SubProject"]) if pd.notna(row["SubProject"]) else "—",
                            "status": str(row["Scope Status"]) if pd.notna(row["Scope Status"]) else "—",
                        }
                    )
    elif tawal_ids:
        matches = df[df["TAWAL ID"].isin(tawal_ids)]
        for tid in tawal_ids:
            rows = matches[matches["TAWAL ID"] == tid]
            if rows.empty:
                results.append({"id": tid, "subproject": "—", "status": "Not Found"})
            else:
                for _, row in rows.iterrows():
                    results.append(
                        {
                            "id": tid,
                            "subproject": str(row["SubProject"]) if pd.notna(row["SubProject"]) else "—",
                            "status": str(row["Scope Status"]) if pd.notna(row["Scope Status"]) else "—",
                        }
                    )

    return {"results": results}