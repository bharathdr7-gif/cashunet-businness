from motor.motor_asyncio import AsyncIOMotorClient
from .config import MONGODB_URL, MONGODB_DB

client = AsyncIOMotorClient(MONGODB_URL)
db = client[MONGODB_DB]

users_collection = db["users"]
products_collection = db["products"]
orders_collection = db["orders"]
