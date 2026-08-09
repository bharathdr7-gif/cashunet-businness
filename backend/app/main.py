from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId

from .config import CORS_ORIGINS
from .database import client, users_collection, products_collection, orders_collection
from .models import OTPRequest, OTPVerify, ProductCreate, OrderCreate, OrderStatusUpdate


def serialize_product(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "description": doc["description"],
        "price": doc["price"],
        "weight": doc["weight"],
        "image": doc.get("image", ""),
        "stock": doc["stock"],
    }


def serialize_order(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "mobile": doc["mobile"],
        "items": doc["items"],
        "address": doc["address"],
        "payment_method": doc["payment_method"],
        "status": doc["status"],
        "total": doc["total"],
        "created_at": doc["created_at"].isoformat(),
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    if await products_collection.count_documents({}) == 0:
        seed = [
            {
                "name": "Premium Cashew 250g",
                "description": "Fresh premium whole cashews.",
                "price": 250,
                "weight": "250g",
                "image": "https://images.unsplash.com/photo-1608797178974-15b35a64ede9?auto=format&fit=crop&w=800&q=80",
                "stock": 100,
            },
            {
                "name": "Premium Cashew 500g",
                "description": "Crunchy premium cashews for family use.",
                "price": 450,
                "weight": "500g",
                "image": "https://images.unsplash.com/photo-1608797178974-15b35a64ede9?auto=format&fit=crop&w=800&q=80",
                "stock": 100,
            },
            {
                "name": "Premium Cashew 1Kg",
                "description": "Best value family pack.",
                "price": 850,
                "weight": "1Kg",
                "image": "https://images.unsplash.com/photo-1608797178974-15b35a64ede9?auto=format&fit=crop&w=800&q=80",
                "stock": 50,
            },
        ]
        await products_collection.insert_many(seed)
    yield
    client.close()


app = FastAPI(title="Cashew Store API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/auth/send-otp")
async def send_otp(payload: OTPRequest):
    await users_collection.update_one(
        {"mobile": payload.mobile},
        {"$set": {"mobile": payload.mobile, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {
        "message": "OTP generated",
        "demo_otp": "123456",
    }


@app.post("/api/auth/verify-otp")
async def verify_otp(payload: OTPVerify):
    if payload.otp != "123456":
        raise HTTPException(status_code=401, detail="Invalid OTP")

    user = await users_collection.find_one_and_update(
        {"mobile": payload.mobile},
        {"$set": {"mobile": payload.mobile}},
        upsert=True,
        return_document=True,
    )
    return {
        "message": "Login successful",
        "user": {"mobile": payload.mobile, "role": user.get("role", "customer") if user else "customer"},
    }


@app.get("/api/products")
async def get_products():
    products = []
    async for product in products_collection.find():
        products.append(serialize_product(product))
    return products


@app.get("/api/products/{product_id}")
async def get_product(product_id: str):
    try:
        product = await products_collection.find_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product id")
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return serialize_product(product)


@app.post("/api/admin/products")
async def create_product(payload: ProductCreate):
    result = await products_collection.insert_one(payload.model_dump())
    product = await products_collection.find_one({"_id": result.inserted_id})
    return serialize_product(product)


@app.get("/api/admin/orders")
async def admin_orders():
    result = []
    async for order in orders_collection.find().sort("created_at", -1):
        result.append(serialize_order(order))
    return result


@app.post("/api/orders")
async def create_order(payload: OrderCreate):
    if payload.payment_method != "COD":
        raise HTTPException(status_code=400, detail="Only COD is enabled in this version")

    total = 0
    order_items = []

    for item in payload.items:
        try:
            product = await products_collection.find_one({"_id": ObjectId(item.product_id)})
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid product id")

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        if product["stock"] < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product['name']}",
            )

        line_total = product["price"] * item.quantity
        total += line_total
        order_items.append(
            {
                "product_id": item.product_id,
                "name": product["name"],
                "weight": product["weight"],
                "quantity": item.quantity,
                "price": product["price"],
                "line_total": line_total,
            }
        )

    for item in payload.items:
        await products_collection.update_one(
            {"_id": ObjectId(item.product_id)},
            {"$inc": {"stock": -item.quantity}},
        )

    order = {
        "mobile": payload.mobile,
        "items": order_items,
        "address": payload.address.model_dump(),
        "payment_method": payload.payment_method,
        "status": "PLACED",
        "total": total,
        "created_at": datetime.now(timezone.utc),
    }

    result = await orders_collection.insert_one(order)
    order["_id"] = result.inserted_id
    return serialize_order(order)


@app.get("/api/orders/{mobile}")
async def get_customer_orders(mobile: str):
    result = []
    async for order in orders_collection.find({"mobile": mobile}).sort("created_at", -1):
        result.append(serialize_order(order))
    return result


@app.patch("/api/admin/orders/{order_id}")
async def update_order_status(order_id: str, payload: OrderStatusUpdate):
    allowed = {"PLACED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid order status")

    try:
        result = await orders_collection.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": {"status": payload.status}},
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order id")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    order = await orders_collection.find_one({"_id": ObjectId(order_id)})
    return serialize_order(order)
