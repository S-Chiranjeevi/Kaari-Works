from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProfileRead(BaseModel):
    clerk_user_id: str
    display_name: str | None
    email: str | None
    role: str
    model_config = ConfigDict(from_attributes=True)


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=160)
    email: str | None = Field(default=None, max_length=320)
    role: str = Field(default="buyer", pattern="^(buyer|seller|both)$")


class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    category: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=5000)
    materials: str | None = Field(default=None, max_length=300)
    price_inr: int = Field(gt=0)
    making_cost_inr: int | None = Field(default=None, ge=0)
    hours_to_make: float | None = Field(default=None, ge=0)
    craft_experience_years: int | None = Field(default=None, ge=0)
    quantity_available: int = Field(default=1, ge=0)
    minimum_order_quantity: int = Field(default=1, ge=1)
    lead_time: str | None = Field(default=None, max_length=120)
    image_url: str | None = Field(default=None, max_length=1000)
    status: str = Field(default="published", pattern="^(draft|published)$")


class ProductRead(ProductCreate):
    id: int
    seller_id: str
    seller_name: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InquiryCreate(BaseModel):
    quantity: int = Field(ge=1)
    message: str = Field(min_length=2, max_length=3000)


class InquiryReply(BaseModel):
    message: str = Field(min_length=1, max_length=3000)


class InquiryRead(BaseModel):
    id: int
    product_id: int
    product_name: str
    buyer_id: str
    seller_id: str
    quantity: int
    message: str
    status: str
    seller_reply: str | None
    created_at: datetime
    replied_at: datetime | None
