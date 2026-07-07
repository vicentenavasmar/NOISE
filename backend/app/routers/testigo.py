from fastapi import APIRouter

router = APIRouter(prefix="/testigo", tags=["testigo"])

@router.post("/")
async def create_testigo():
    return {"status": "not implemented yet"}
