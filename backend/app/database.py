import asyncio
import time

from motor.motor_asyncio import AsyncIOMotorClient
from .config import MONGODB_URL, MONGODB_DB

client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
db = client[MONGODB_DB]

users_collection = db["users"]
products_collection = db["products"]
orders_collection = db["orders"]


async def wait_for_mongodb(timeout_seconds: int = 60, interval_seconds: float = 2.0) -> None:
    deadline = time.time() + timeout_seconds
    while True:
        try:
            await client.admin.command("ping")
            return
        except Exception:
            if time.time() >= deadline:
                raise
            await asyncio.sleep(interval_seconds)
