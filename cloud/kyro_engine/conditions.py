# cloud/kyro_engine/conditions.py
"""cgt_edges condition grammar -> Python. Behavioral mirror of edge/e3/conformance.py
to_py/cond_true and edge/e3/conditions.ts. PARITY-CRITICAL: keep byte-equivalent in behavior.

SECURITY: cond_true does NOT use eval/compile. to_py is the byte-identical string
translation (the parity-critical half); cond_true parses to_py's output with ast.parse
and evaluates it with a node-whitelist interpreter (_eval). For every valid grammar input
the result is identical to the old eval({'__builtins__': {}}); anything outside the
whitelist (Attribute, Subscript, Lambda, non-range Call, dunder Name) raises ValueError."""
import ast, operator, re

def to_py(cond: str) -> str:
    s = cond
    s = re.sub(r'\btrue\b', 'True', s); s = re.sub(r'\bfalse\b', 'False', s)
    s = s.replace('<>', '!=')
    s = re.sub(r'(?<![<>=!])=(?!=)', '==', s)
    s = re.sub(r'(\w+)\s+BETWEEN\s+(\d+)\s+AND\s+(\d+)', r'(\2 <= \1 <= \3)', s)
    s = re.sub(r'NOT\s+IN\s+\[(\d+)\.\.(\d+)\]',
               lambda m: f'not in range({int(m.group(1))},{int(m.group(2))+1})', s)
    s = re.sub(r'\bIN\b', 'in', s); s = re.sub(r'\bNOT\b', 'not', s)
    s = re.sub(r'\bAND\b', 'and', s); s = re.sub(r'\bOR\b', 'or', s)
    return s

_CMP = {ast.Lt: operator.lt, ast.LtE: operator.le, ast.Gt: operator.gt, ast.GtE: operator.ge,
        ast.Eq: operator.eq, ast.NotEq: operator.ne,
        ast.In: lambda a, b: a in b, ast.NotIn: lambda a, b: a not in b}

def _eval(node, env):
    if isinstance(node, ast.Expression):
        return _eval(node.body, env)
    if isinstance(node, ast.BoolOp):
        vals = [_eval(v, env) for v in node.values]
        if isinstance(node.op, ast.And):
            return all(vals)
        if isinstance(node.op, ast.Or):
            return any(vals)
        raise ValueError(f"disallowed bool op: {type(node.op).__name__}")
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
        return not _eval(node.operand, env)
    if isinstance(node, ast.Compare):
        left = _eval(node.left, env)
        for op, comp in zip(node.ops, node.comparators):
            right = _eval(comp, env)
            fn = _CMP.get(type(op))
            if fn is None:
                raise ValueError(f"disallowed comparison: {type(op).__name__}")
            if not fn(left, right):
                return False
            left = right
        return True
    if isinstance(node, ast.Name):
        if node.id not in env:
            raise ValueError(f"unknown name: {node.id}")
        return env[node.id]
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, (ast.Tuple, ast.List)):
        return [_eval(e, env) for e in node.elts]
    if isinstance(node, ast.Call):
        if isinstance(node.func, ast.Name) and node.func.id == 'range' \
                and not node.keywords:
            return range(*[_eval(a, env) for a in node.args])
        raise ValueError("only range() calls are permitted")
    raise ValueError(f"disallowed expression: {type(node).__name__}")

def cond_true(cond: str, env: dict) -> bool:
    if cond == 'true':
        return True
    tree = ast.parse(to_py(cond), mode='eval')
    return bool(_eval(tree, env))
