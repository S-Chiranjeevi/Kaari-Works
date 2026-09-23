from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from .auth import CurrentUser, get_current_user
from .config import get_settings
from .database import Base, engine, get_db
from .models import Inquiry, Product, UserProfile
from .schemas import InquiryCreate, InquiryRead, InquiryReply, ProductCreate, ProductRead, ProfileRead, ProfileUpdate

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # For a first local prototype. Use Alembic migrations once the schema is deployed.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="ArtisanMart API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def profile_for(db: Session, user: CurrentUser) -> UserProfile:
    profile = db.get(UserProfile, user.id)
    if profile is None:
        profile = UserProfile(clerk_user_id=user.id, role="buyer")
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def product_out(product: Product) -> ProductRead:
    return ProductRead(
        **{column.name: getattr(product, column.name) for column in Product.__table__.columns},
        seller_name=product.seller.display_name if product.seller else None,
    )


def inquiry_out(inquiry: Inquiry) -> InquiryRead:
    return InquiryRead(
        id=inquiry.id,
        product_id=inquiry.product_id,
        product_name=inquiry.product.name,
        buyer_id=inquiry.buyer_id,
        seller_id=inquiry.seller_id,
        quantity=inquiry.quantity,
        message=inquiry.message,
        status=inquiry.status,
        seller_reply=inquiry.seller_reply,
        created_at=inquiry.created_at,
        replied_at=inquiry.replied_at,
    )


@app.get("/api/health")
def health():
    return {"ok": True, "service": "artisanmart-api"}


@app.get("/api/config")
def public_config():
    # Publishable key is intended for browsers. Never return the Clerk secret key.
    return {"clerk_publishable_key": settings.clerk_publishable_key}


@app.get("/api/me", response_model=ProfileRead)
def get_me(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    return profile_for(db, user)


@app.patch("/api/me", response_model=ProfileRead)
def update_me(payload: ProfileUpdate, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = profile_for(db, user)
    profile.display_name = payload.display_name
    profile.email = payload.email
    profile.role = payload.role
    db.commit()
    db.refresh(profile)
    return profile


@app.get("/api/products", response_model=list[ProductRead])
def list_products(
    q: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=60, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = select(Product).options(joinedload(Product.seller)).where(Product.status == "published")
    if q:
        pattern = f"%{q.strip()}%"
        query = query.where(or_(Product.name.ilike(pattern), Product.description.ilike(pattern), Product.materials.ilike(pattern)))
    if category:
        query = query.where(Product.category == category)
    return [product_out(item) for item in db.scalars(query.order_by(Product.created_at.desc()).limit(limit)).unique()]


@app.post("/api/products", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = profile_for(db, user)
    profile.role = "seller" if profile.role == "buyer" else profile.role
    product = Product(seller_id=user.id, **payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product_out(product)


@app.get("/api/products/mine", response_model=list[ProductRead])
def my_products(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    query = select(Product).options(joinedload(Product.seller)).where(Product.seller_id == user.id).order_by(Product.created_at.desc())
    return [product_out(item) for item in db.scalars(query).unique()]


@app.patch("/api/products/{product_id}", response_model=ProductRead)
def update_product(product_id: int, payload: ProductCreate, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.seller_id != user.id:
        raise HTTPException(status_code=403, detail="Only the seller can edit this product")
    for key, value in payload.model_dump().items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product_out(product)


@app.post("/api/products/{product_id}/inquiries", response_model=InquiryRead, status_code=status.HTTP_201_CREATED)
def create_inquiry(product_id: int, payload: InquiryCreate, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if product is None or product.status != "published":
        raise HTTPException(status_code=404, detail="Product not found")
    if product.seller_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot enquire about your own listing")
    profile_for(db, user)
    inquiry = Inquiry(product_id=product.id, buyer_id=user.id, seller_id=product.seller_id, quantity=payload.quantity, message=payload.message)
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)
    return inquiry_out(inquiry)


@app.get("/api/inquiries", response_model=list[InquiryRead])
def list_inquiries(user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    query = select(Inquiry).options(joinedload(Inquiry.product)).where(
        or_(Inquiry.seller_id == user.id, Inquiry.buyer_id == user.id)
    ).order_by(Inquiry.created_at.desc()).limit(100)
    return [inquiry_out(item) for item in db.scalars(query).unique()]


@app.post("/api/inquiries/{inquiry_id}/reply", response_model=InquiryRead)
def reply_to_inquiry(inquiry_id: int, payload: InquiryReply, user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    inquiry = db.scalar(select(Inquiry).options(joinedload(Inquiry.product)).where(Inquiry.id == inquiry_id))
    if inquiry is None:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    if inquiry.seller_id != user.id:
        raise HTTPException(status_code=403, detail="Only the seller can reply to this enquiry")
    inquiry.seller_reply = payload.message
    inquiry.status = "replied"
    inquiry.replied_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(inquiry)
    return inquiry_out(inquiry)


@app.get("/", include_in_schema=False)
def web_app():
    return FileResponse(Path(__file__).resolve().parents[2] / "index.html")


@app.get("/{asset_path:path}", include_in_schema=False)
def static_asset(asset_path: str):
    root = Path(__file__).resolve().parents[2]
    target = (root / asset_path).resolve()
    if target.is_file() and root.resolve() in target.parents:
        return FileResponse(target)
    raise HTTPException(status_code=404, detail="Not found")

