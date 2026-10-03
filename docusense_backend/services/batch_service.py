from __future__ import annotations
import asyncio
from typing import Any,Awaitable,Callable

class BatchService:
    def __init__(self,concurrency:int=4): self.concurrency=max(1,concurrency)
    async def run(self,items:list[Any],worker:Callable[[Any],Awaitable[Any]])->list[Any]:
        semaphore=asyncio.Semaphore(self.concurrency)
        async def one(item):
            async with semaphore:
                try:return await worker(item)
                except Exception as exc:return {"status":"error","error":str(exc)}
        return await asyncio.gather(*(one(x) for x in items))
