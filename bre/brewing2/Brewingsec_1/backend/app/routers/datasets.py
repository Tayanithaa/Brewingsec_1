from fastapi import APIRouter, Depends
from ..services import data_store
from ..auth.jwt_handler import verify_token

router = APIRouter()


@router.get("/log-datasets")
def list_log_datasets(user_id: str = Depends(verify_token)):
    return {"datasets": data_store.list_datasets()}
