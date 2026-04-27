from typing import Annotated

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field


app = FastAPI(title="Curl Test API")


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, examples=["notebook"])
    price: float = Field(gt=0, examples=[12.5])
    in_stock: bool = True


class Item(ItemCreate):
    id: int


items: dict[int, Item] = {
    1: Item(id=1, name="pen", price=1.5, in_stock=True),
    2: Item(id=2, name="mug", price=8.99, in_stock=False),
}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "FastAPI is running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/hello/{name}")
def hello(
    name: str,
    excited: Annotated[bool, Query(description="Add an exclamation mark")] = False,
) -> dict[str, str]:
    punctuation = "!" if excited else "."
    return {"message": f"Hello, {name}{punctuation}"}


@app.get("/items/{item_id}", response_model=Item)
def get_item(item_id: int) -> Item:
    item = items.get(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@app.post("/items", response_model=Item, status_code=201)
def create_item(item: ItemCreate) -> Item:
    item_id = max(items) + 1 if items else 1
    created = Item(id=item_id, **item.model_dump())
    items[item_id] = created
    return created
