"""
condition_engine.py — evaluates Sigma `condition:` strings safely.

Supports: bare selection names, and / or / not, parentheses,
'1 of <prefix>*', 'all of <prefix>*', '1 of them', 'all of them'.

Deliberately hand-written instead of using eval()/exec() on the condition
string — that string comes directly from user-submitted rule text, and this
project's non-negotiables rule out dynamic code execution on user input.
"""

import re
from dataclasses import dataclass


TOKEN_RE = re.compile(r"""
    (?P<LPAREN>\() |
    (?P<RPAREN>\)) |
    (?P<AND>\band\b) |
    (?P<OR>\bor\b) |
    (?P<NOT>\bnot\b) |
    (?P<AGG_THEM>\b(?P<agg_num_them>1|all)\s+of\s+them\b) |
    (?P<AGG_PREFIX>\b(?P<agg_num>1|all)\s+of\s+(?P<agg_prefix>[A-Za-z_][A-Za-z0-9_]*)\*) |
    (?P<IDENT>[A-Za-z_][A-Za-z0-9_]*) |
    (?P<SPACE>\s+)
""", re.VERBOSE | re.IGNORECASE)


@dataclass
class Token:
    kind: str
    value: str


def tokenize(condition: str) -> list[Token]:
    tokens = []
    pos = 0
    while pos < len(condition):
        m = TOKEN_RE.match(condition, pos)
        if not m:
            raise ValueError(f"Unexpected character in condition at position {pos}: {condition[pos:pos+10]!r}")
        kind = m.lastgroup
        value = m.group()
        pos = m.end()
        if kind == "SPACE":
            continue
        tokens.append(Token(kind, value))
    return tokens


class ConditionParser:
    """Recursive-descent parser producing a small boolean AST, evaluated
    directly against precomputed selection results — no eval() anywhere."""

    def __init__(self, tokens: list[Token], block_results: dict[str, bool]):
        self.tokens = tokens
        self.pos = 0
        self.block_results = block_results

    def peek(self) -> Token | None:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def advance(self) -> Token:
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def parse(self) -> bool:
        result = self.parse_or()
        if self.pos != len(self.tokens):
            raise ValueError(f"Unexpected trailing tokens starting at {self.peek()}")
        return result

    def parse_or(self) -> bool:
        left = self.parse_and()
        while self.peek() and self.peek().kind == "OR":
            self.advance()
            right = self.parse_and()
            left = left or right
        return left

    def parse_and(self) -> bool:
        left = self.parse_not()
        while self.peek() and self.peek().kind == "AND":
            self.advance()
            right = self.parse_not()
            left = left and right
        return left

    def parse_not(self) -> bool:
        if self.peek() and self.peek().kind == "NOT":
            self.advance()
            return not self.parse_not()
        return self.parse_atom()

    def parse_atom(self) -> bool:
        tok = self.peek()
        if tok is None:
            raise ValueError("Unexpected end of condition")

        if tok.kind == "LPAREN":
            self.advance()
            result = self.parse_or()
            if not (self.peek() and self.peek().kind == "RPAREN"):
                raise ValueError("Missing closing parenthesis")
            self.advance()
            return result

        if tok.kind == "AGG_THEM":
            self.advance()
            is_all = tok.value.strip().lower().startswith("all")
            values = list(self.block_results.values())
            return all(values) if is_all else any(values)

        if tok.kind == "AGG_PREFIX":
            self.advance()
            m = re.match(r"(1|all)\s+of\s+([A-Za-z_][A-Za-z0-9_]*)\*", tok.value.strip())
            num, prefix = m.group(1), m.group(2)
            matching = [v for k, v in self.block_results.items() if k.startswith(prefix)]
            if not matching:
                raise ValueError(f"No selections match prefix '{prefix}*'")
            return all(matching) if num == "all" else any(matching)

        if tok.kind == "IDENT":
            self.advance()
            if tok.value not in self.block_results:
                raise ValueError(f"Unknown selection name in condition: '{tok.value}'")
            return self.block_results[tok.value]

        raise ValueError(f"Unexpected token: {tok}")


def evaluate_condition(condition: str, block_results: dict[str, bool]) -> bool:
    tokens = tokenize(condition)
    parser = ConditionParser(tokens, block_results)
    return parser.parse()
