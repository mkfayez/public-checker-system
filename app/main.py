"""FastAPI application entrypoint.

This module wires together the budget and scope checkers with a simple
HTML user interface via Jinja2 templates. It exposes routes for
performing checks and displaying results.

To run locally:

    uvicorn app.main:app --reload

Environment variables (see `.env.example`):
    - BUDGET_SOURCE_URL: direct download URL for the budget Excel file
    - SCOPE_SOURCE_URL: direct download URL for the scope Excel file
    - CACHE_TTL: optional cache expiry time in seconds
"""

from __future__ import annotations

import os
from typing import List

from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .services import get_budget_dropdowns, check_budget, check_scope

app = FastAPI(title="Public Checker System")

# Mount static directory if you want to serve CSS/JS. Currently empty.
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

templates = Jinja2Templates(directory=os.path.join(os.path.dirname(__file__), "templates"))


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Render the home page with links to each checker."""
    return templates.TemplateResponse("index.html", {"request": request})


# Budget Checker

@app.get("/budget", response_class=HTMLResponse)
async def budget_form(request: Request):
    """Render the budget checker form with populated dropdowns."""
    dropdowns = get_budget_dropdowns()
    context = {
        "request": request,
        "box1": dropdowns.get("box1", []),
        "box2": dropdowns.get("box2", []),
        "box3": dropdowns.get("box3", []),
    }
    return templates.TemplateResponse("budget.html", context)


@app.post("/budget", response_class=HTMLResponse)
async def budget_submit(
    request: Request,
    contract_type: str = Form(..., alias="box1"),
    project_name: str = Form(..., alias="box2"),
    supplier: str = Form(..., alias="box3"),
    requested_amount: float = Form(..., alias="box4"),
):
    """Handle the budget checker form submission and display results."""
    result = check_budget(contract_type, project_name, supplier, requested_amount)
    if "error" in result:
        context = {
            "request": request,
            "error": result["error"],
        }
        return templates.TemplateResponse("budget_result.html", context)
    else:
        results = result["results"]
        context = {
            "request": request,
            "results": results,
        }
        return templates.TemplateResponse("budget_result.html", context)


# Scope Checker

@app.get("/scope", response_class=HTMLResponse)
async def scope_form(request: Request):
    """Render the scope checker form."""
    return templates.TemplateResponse("scope.html", {"request": request})


@app.post("/scope", response_class=HTMLResponse)
async def scope_submit(
    request: Request,
    id_input: str = Form(...),
    id_type: str = Form(..., description="Type of ID: unified or tawal"),
):
    """Handle the scope checker form submission and display results."""
    # Split input by comma, newline or whitespace
    # Accept multiple IDs separated by commas or newlines
    raw_ids = [s.strip() for s in id_input.replace("\n", ",").split(",")]
    site_ids: List[str] | None = None
    tawal_ids: List[str] | None = None
    if id_type == "unified":
        site_ids = raw_ids
    elif id_type == "tawal":
        tawal_ids = raw_ids
    else:
        # invalid type
        return templates.TemplateResponse(
            "scope_result.html", {"request": request, "error": "Invalid ID type."}
        )
    result = check_scope(site_ids, tawal_ids)
    if "error" in result:
        return templates.TemplateResponse(
            "scope_result.html", {"request": request, "error": result["error"]}
        )
    else:
        return templates.TemplateResponse(
            "scope_result.html", {"request": request, "results": result["results"]}
      
