from pydantic import BaseModel, Field
from typing import Optional, List


class OTPRequest(BaseModel):
    mobile: str = Field(min_length=10, max_length=15)


class OTPVerify(BaseModel):
    mobile: str = Field(min_length=10, max_length=15)
    otp: str = Field(min_length=4, max_length=8)


class ProductCreate(BaseModel):
    name: str
    description: str
    price: float = Field(gt=0)
    weight: str
    image: str = ""
    stock: int = Field(ge=0)


class ProductResponse(ProductCreate):
    id: str


class CartItem(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)


class Address(BaseModel):
    name: str
    mobile: str
    address_line: str
    city: str
    state: str
    pincode: str


class OrderCreate(BaseModel):
    mobile: str
    items: List[CartItem]
    address: Address
    payment_method: str = "COD"


class OrderStatusUpdate(BaseModel):
    status: str
