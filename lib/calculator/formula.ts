/**
 * Bezpieczny interpreter formuł — składnia jak w polskim Excelu (IF, ROUNDUP, średnik jako
 * separator argumentów, kropka jako separator dziesiętny). Używany do edytowalnych w aplikacji
 * reguł cennika (patrz rules-types.ts), zamiast trzymania logiki na sztywno w engine.ts.
 *
 * Świadomie NIE używa eval/Function — własny tokenizer + parser (precedence climbing) + prosty
 * interpreter drzewa, z whitelistą dozwolonych funkcji i zmiennych przekazanych przez wywołującego.
 */

export class FormulaError extends Error {
  readonly position: number;
  constructor(message: string, position: number) {
    super(message);
    this.name = "FormulaError";
    this.position = position;
  }
}

export type FormulaScope = Record<string, number>;

type TokenType = "number" | "identifier" | "operator" | "lparen" | "rparen" | "semicolon" | "eof";
type Token = { type: TokenType; value: string; pos: number };

const OPERATOR_CHARS = "+-*/^<>=";

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = source.length;

  while (i < n) {
    const c = source[i];

    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }

    if (c === "(") {
      tokens.push({ type: "lparen", value: "(", pos: i });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ type: "rparen", value: ")", pos: i });
      i++;
      continue;
    }
    if (c === ";") {
      tokens.push({ type: "semicolon", value: ";", pos: i });
      i++;
      continue;
    }

    if (c >= "0" && c <= "9") {
      const start = i;
      while (i < n && ((source[i] >= "0" && source[i] <= "9") || source[i] === ".")) {
        i++;
      }
      tokens.push({ type: "number", value: source.slice(start, i), pos: start });
      continue;
    }

    if (/[A-Za-zżźćńółęąśŻŹĆŃÓŁĘĄŚ_]/.test(c)) {
      const start = i;
      while (i < n && /[A-Za-z0-9żźćńółęąśŻŹĆŃÓŁĘĄŚ_]/.test(source[i])) {
        i++;
      }
      tokens.push({ type: "identifier", value: source.slice(start, i), pos: start });
      continue;
    }

    if (OPERATOR_CHARS.includes(c)) {
      const start = i;
      // dwuznakowe operatory porównania: >=, <=, <>
      if ((c === ">" || c === "<") && source[i + 1] === "=") {
        tokens.push({ type: "operator", value: c + "=", pos: start });
        i += 2;
        continue;
      }
      if (c === "<" && source[i + 1] === ">") {
        tokens.push({ type: "operator", value: "<>", pos: start });
        i += 2;
        continue;
      }
      tokens.push({ type: "operator", value: c, pos: start });
      i++;
      continue;
    }

    throw new FormulaError(`Nierozpoznany znak: "${c}"`, i);
  }

  tokens.push({ type: "eof", value: "", pos: n });
  return tokens;
}

export type FormulaNode =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string; pos: number }
  | { kind: "call"; name: string; args: FormulaNode[]; pos: number }
  | { kind: "unary"; op: "-" | "+"; arg: FormulaNode }
  | { kind: "binary"; op: string; left: FormulaNode; right: FormulaNode };

const COMPARISON_OPS = new Set(["=", "<>", ">", "<", ">=", "<="]);
const ADDITIVE_OPS = new Set(["+", "-"]);
const MULTIPLICATIVE_OPS = new Set(["*", "/"]);

class Parser {
  private tokens: Token[];
  private index = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.index];
  }

  private next(): Token {
    return this.tokens[this.index++];
  }

  private expect(type: TokenType, message: string): Token {
    const tok = this.peek();
    if (tok.type !== type) {
      throw new FormulaError(message, tok.pos);
    }
    return this.next();
  }

  parse(): FormulaNode {
    const node = this.parseComparison();
    this.expect("eof", "Nieoczekiwane znaki na końcu formuły");
    return node;
  }

  private parseComparison(): FormulaNode {
    let left = this.parseAdditive();
    while (this.peek().type === "operator" && COMPARISON_OPS.has(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseAdditive();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseAdditive(): FormulaNode {
    let left = this.parseMultiplicative();
    while (this.peek().type === "operator" && ADDITIVE_OPS.has(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseMultiplicative();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseMultiplicative(): FormulaNode {
    let left = this.parseUnary();
    while (this.peek().type === "operator" && MULTIPLICATIVE_OPS.has(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseUnary();
      left = { kind: "binary", op, left, right };
    }
    return left;
  }

  private parseUnary(): FormulaNode {
    const tok = this.peek();
    if (tok.type === "operator" && (tok.value === "-" || tok.value === "+")) {
      this.next();
      const arg = this.parseUnary();
      return { kind: "unary", op: tok.value, arg };
    }
    return this.parsePower();
  }

  private parsePower(): FormulaNode {
    const base = this.parsePrimary();
    if (this.peek().type === "operator" && this.peek().value === "^") {
      this.next();
      const exponent = this.parseUnary();
      return { kind: "binary", op: "^", left: base, right: exponent };
    }
    return base;
  }

  private parsePrimary(): FormulaNode {
    const tok = this.peek();

    if (tok.type === "number") {
      this.next();
      return { kind: "num", value: Number(tok.value) };
    }

    if (tok.type === "lparen") {
      this.next();
      const inner = this.parseComparison();
      this.expect("rparen", "Brakuje domykającego nawiasu \")\"");
      return inner;
    }

    if (tok.type === "identifier") {
      this.next();
      if (this.peek().type === "lparen") {
        this.next();
        const args: FormulaNode[] = [];
        if (this.peek().type !== "rparen") {
          args.push(this.parseComparison());
          while (this.peek().type === "semicolon") {
            this.next();
            args.push(this.parseComparison());
          }
        }
        this.expect("rparen", `Brakuje domykającego nawiasu dla funkcji "${tok.value}"`);
        return { kind: "call", name: tok.value.toUpperCase(), args, pos: tok.pos };
      }
      return { kind: "var", name: tok.value, pos: tok.pos };
    }

    throw new FormulaError("Oczekiwano liczby, zmiennej, funkcji lub nawiasu", tok.pos);
  }
}

export function parseFormula(source: string): FormulaNode {
  return new Parser(tokenize(source)).parse();
}

type FormulaFunction = (args: number[], pos: number) => number;

function requireArgs(name: string, args: number[], min: number, max: number, pos: number) {
  if (args.length < min || args.length > max) {
    const range = min === max ? `${min}` : `${min}–${max}`;
    throw new FormulaError(`Funkcja ${name} oczekuje ${range} argumentów, otrzymano ${args.length}`, pos);
  }
}

const FUNCTIONS: Record<string, FormulaFunction> = {
  IF: (args, pos) => {
    requireArgs("IF", args, 3, 3, pos);
    return args[0] !== 0 ? args[1] : args[2];
  },
  ROUND: (args, pos) => {
    requireArgs("ROUND", args, 1, 2, pos);
    const digits = args[1] ?? 0;
    const factor = 10 ** digits;
    return Math.round(args[0] * factor) / factor;
  },
  ROUNDUP: (args, pos) => {
    requireArgs("ROUNDUP", args, 1, 2, pos);
    const digits = args[1] ?? 0;
    const factor = 10 ** digits;
    return Math.ceil(args[0] * factor) / factor;
  },
  ROUNDDOWN: (args, pos) => {
    requireArgs("ROUNDDOWN", args, 1, 2, pos);
    const digits = args[1] ?? 0;
    const factor = 10 ** digits;
    return Math.floor(args[0] * factor) / factor;
  },
  MAX: (args, pos) => {
    requireArgs("MAX", args, 1, Infinity, pos);
    return Math.max(...args);
  },
  MIN: (args, pos) => {
    requireArgs("MIN", args, 1, Infinity, pos);
    return Math.min(...args);
  },
  ABS: (args, pos) => {
    requireArgs("ABS", args, 1, 1, pos);
    return Math.abs(args[0]);
  },
  AND: (args, pos) => {
    requireArgs("AND", args, 1, Infinity, pos);
    return args.every((a) => a !== 0) ? 1 : 0;
  },
  OR: (args, pos) => {
    requireArgs("OR", args, 1, Infinity, pos);
    return args.some((a) => a !== 0) ? 1 : 0;
  },
  NOT: (args, pos) => {
    requireArgs("NOT", args, 1, 1, pos);
    return args[0] === 0 ? 1 : 0;
  },
};

export const FORMULA_FUNCTION_NAMES = Object.keys(FUNCTIONS);

function evalNode(node: FormulaNode, scope: FormulaScope): number {
  switch (node.kind) {
    case "num":
      return node.value;
    case "var": {
      if (!(node.name in scope)) {
        throw new FormulaError(`Nieznana zmienna: "${node.name}"`, node.pos);
      }
      return scope[node.name];
    }
    case "unary": {
      const value = evalNode(node.arg, scope);
      return node.op === "-" ? -value : value;
    }
    case "binary": {
      const left = evalNode(node.left, scope);
      const right = evalNode(node.right, scope);
      switch (node.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          if (right === 0) {
            return 0; // dzielenie przez zero w cenniku traktujemy jako 0, nie błąd/NaN
          }
          return left / right;
        case "^":
          return left ** right;
        case "=":
          return left === right ? 1 : 0;
        case "<>":
          return left !== right ? 1 : 0;
        case ">":
          return left > right ? 1 : 0;
        case "<":
          return left < right ? 1 : 0;
        case ">=":
          return left >= right ? 1 : 0;
        case "<=":
          return left <= right ? 1 : 0;
        default:
          throw new FormulaError(`Nieznany operator: "${node.op}"`, 0);
      }
    }
    case "call": {
      const fn = FUNCTIONS[node.name];
      if (!fn) {
        throw new FormulaError(`Nieznana funkcja: "${node.name}"`, node.pos);
      }
      const args = node.args.map((arg) => evalNode(arg, scope));
      return fn(args, node.pos);
    }
    default:
      throw new FormulaError("Nieobsługiwany węzeł formuły", 0);
  }
}

/** Liczy formułę tekstową w podanym kontekście zmiennych. Rzuca FormulaError przy błędzie składni/nieznanej zmiennej. */
export function evaluateFormula(source: string, scope: FormulaScope): number {
  const ast = parseFormula(source);
  return evalNode(ast, scope);
}

/** Zbiera nazwy zmiennych użytych w formule — do auto-wykrywania zależności w edytorze reguł. */
export function extractFormulaVariables(source: string): string[] {
  const ast = parseFormula(source);
  const names = new Set<string>();
  function walk(node: FormulaNode) {
    if (node.kind === "var") {
      names.add(node.name);
    } else if (node.kind === "unary") {
      walk(node.arg);
    } else if (node.kind === "binary") {
      walk(node.left);
      walk(node.right);
    } else if (node.kind === "call") {
      node.args.forEach(walk);
    }
  }
  walk(ast);
  return Array.from(names);
}

/** Waliduje formułę przeciw zbiorowi znanych zmiennych — zwraca null gdy OK, komunikat błędu w przeciwnym razie. */
export function validateFormula(source: string, knownVariables: Set<string>): string | null {
  try {
    const vars = extractFormulaVariables(source);
    const unknown = vars.filter((v) => !knownVariables.has(v));
    if (unknown.length > 0) {
      return `Nieznane zmienne: ${unknown.join(", ")}`;
    }
    return null;
  } catch (error) {
    if (error instanceof FormulaError) {
      return error.message;
    }
    return "Błąd w formule";
  }
}
