from __future__ import annotations
import time
from threading import RLock
from typing import Any

class ScopedCache:
    def __init__(self,ttl_seconds:int=300,max_items:int=1000): self.ttl=ttl_seconds; self.max_items=max_items; self._data={}; self._lock=RLock()
    def key(self,user_id:str|None,scope:str,key:str)->str:return f"{user_id or 'anonymous'}:{scope}:{key}"
    def get(self,key:str)->Any|None:
        with self._lock:
            item=self._data.get(key)
            if not item:return None
            created,value=item
            if time.time()-created>self.ttl:self._data.pop(key,None); return None
            return value
    def set(self,key:str,value:Any)->None:
        with self._lock:
            self._data[key]=(time.time(),value)
            if len(self._data)>self.max_items:
                oldest=min(self._data,key=lambda x:self._data[x][0]); self._data.pop(oldest,None)
