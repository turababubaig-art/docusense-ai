from __future__ import annotations
import logging
from dataclasses import dataclass
from fastapi import Depends, HTTPException, Request
from database.supabase import SupabaseDatabase

logger=logging.getLogger("docusense.security")
@dataclass(frozen=True)
class AuthUser:
    user_id:str
    email:str|None=None

async def get_current_user(request:Request,db:SupabaseDatabase=Depends(lambda: request.app.state.db))->AuthUser|None:
    header=request.headers.get("Authorization","")
    if not header: return None
    if not header.lower().startswith("bearer "): raise HTTPException(401,"Invalid authorization header.")
    token=header.split(" ",1)[1].strip()
    if not token: raise HTTPException(401,"Missing access token.")
    if not db.available or not db.client:
        raise HTTPException(503,"Authentication service is not configured.")
    try:
        result=db.client.auth.get_user(token)
        user=getattr(result,"user",None)
        if not user: raise HTTPException(401,"Invalid or expired access token.")
        return AuthUser(str(user.id),getattr(user,"email",None))
    except HTTPException: raise
    except Exception as exc:
        logger.warning("Authentication failed: %s",exc)
        raise HTTPException(401,"Invalid or expired access token.")

async def optional_user(request:Request,db:SupabaseDatabase=Depends(lambda: request.app.state.db))->AuthUser|None:
    if not request.headers.get("Authorization"): return None
    return await get_current_user(request,db)
