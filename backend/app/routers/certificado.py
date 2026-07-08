from fastapi import APIRouter

router = APIRouter(prefix="/certificado", tags=["certificado"])

@router.get("/{id}")
async def get_certificado(id: int):
    return {"status": "not implemented yet"}
