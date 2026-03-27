"""
Entry point for the FastAPI backend on Windows.

asyncpg requires WindowsSelectorEventLoopPolicy on Windows (Python 3.8+). When uvicorn
is invoked directly (`uvicorn main:app`), it creates the event loop before importing
main.py, so setting the policy inside main.py is too late. This script sets the policy
first, then hands off to uvicorn.run().

Usage:
    python run.py              # development (with reload)
    python run.py --no-reload  # production
"""
import sys
import os

if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    reload = "--no-reload" not in sys.argv
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=reload)
