from __future__ import annotations
import asyncio
import logging
from datetime import datetime,timezone
from typing import Awaitable,Callable

from database.repositories import DocumentRepository

logger=logging.getLogger("docusense.jobs")

class TaskManager:
    def __init__(self,repository:DocumentRepository,concurrency:int=4):
        self.repository=repository; self.semaphore=asyncio.Semaphore(max(1,concurrency)); self.tasks:set[asyncio.Task]=set()
    @staticmethod
    def now(): return datetime.now(timezone.utc).isoformat()
    def submit(self,job:dict,work:Callable[[],Awaitable[None]])->None:
        self.repository.save_job(job)
        task=asyncio.create_task(self._run(job,work)); self.tasks.add(task); task.add_done_callback(self.tasks.discard)
    async def _run(self,job,work):
        async with self.semaphore:
            try:
                job.update({"status":"processing","progress":5,"stage":"starting","updated_at":self.now()}); self.repository.save_job(job)
                await work()
            except Exception as exc:
                logger.exception("Job %s failed",job["job_id"])
                job.update({"status":"failed","progress":100,"stage":"failed","error":str(exc),"updated_at":self.now()}); self.repository.save_job(job)
