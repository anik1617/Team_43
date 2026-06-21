# cloud/kyro_engine/result.py
from dataclasses import dataclass, field


@dataclass
class KyroResult:
    action: str
    leaf_id: str
    mode: str = ""            # 🟢/🟡/🔴 — set in Task 5
    citations: list = field(default_factory=list)
    trajectory: list = field(default_factory=list)
    stuck: bool = False
