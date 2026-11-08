/**
 * A bounded teaching interpreter, not a full C compiler.
 * int values are signed 32-bit; diagram addresses are illustrative.
 * Supported: declarations, int arrays/pointers, assignments, arithmetic,
 * printf("%d", ...), sizeof(int), successful malloc and free.
 */
export type FaultKind =
  | 'syntax'
  | 'unsupported'
  | 'type'
  | 'null-pointer'
  | 'out-of-bounds'
  | 'uninitialized'
  | 'use-after-free'
  | 'overflow'
  | 'invalid-free'
  | 'division-by-zero';
export class TraceFault extends Error {
  constructor(
    public kind: FaultKind,
    message: string,
    public line = 0,
  ) {
    super(message);
  }
}
type Token = { text: string; line: number };
type Expr =
  | { kind: 'number'; value: number }
  | { kind: 'name'; name: string }
  | { kind: 'unary'; op: string; arg: Expr }
  | { kind: 'binary'; op: string; left: Expr; right: Expr }
  | { kind: 'index'; base: Expr; index: Expr }
  | { kind: 'malloc'; bytes: Expr };
type Statement = { line: number } & (
  | {
      kind: 'declare';
      name: string;
      type: 'int' | 'pointer' | 'array';
      count: number;
      init?: Expr;
      values?: Expr[];
    }
  | { kind: 'assign'; target: Expr; value: Expr; op: string }
  | { kind: 'print'; format: string; value?: Expr }
  | { kind: 'free'; value: Expr }
);
type Pointer = { kind: 'pointer'; block: number | null; index: number };
type Value = { kind: 'int'; value: number } | Pointer;
type Block = {
  id: number;
  name: string;
  space: 'stack' | 'heap';
  base: number;
  cells: (number | null)[];
  freed: boolean;
};
type Binding =
  | { name: string; type: 'int' | 'array'; block: number }
  | { name: string; type: 'pointer'; value: Pointer };
export type MemoryBlock = {
  id: number;
  label: string;
  space: 'stack' | 'heap';
  address: string;
  cells: { address: string; value: string }[];
  freed: boolean;
};
export type Variable = { name: string; type: string; value: string; target?: string };
export type TraceStep = {
  line: number;
  variables: Variable[];
  memory: MemoryBlock[];
  output: string;
  note: string;
};
export type Trace = {
  steps: TraceStep[];
  output: string;
  fault?: { kind: FaultKind; message: string; line: number };
};
const hex = (n: number) => '0x' + n.toString(16).toUpperCase();
const integer = (n: number) => {
  if (!Number.isInteger(n) || n < -2147483648 || n > 2147483647)
    throw new TraceFault('overflow', 'This calculation overflows a signed 32-bit int.');
  return { kind: 'int' as const, value: n };
};

function tokenize(source: string): Token[] {
  if (source.length > 8000)
    throw new TraceFault('unsupported', 'This teaching trace accepts at most 8,000 characters.');
  const pattern =
    /\s+|\/\/[^\n]*|"(?:\\.|[^"\\])*"|[A-Za-z_]\w*|\d+|==|!=|<=|>=|\+=|-=|[+\-*/&=;,[\]{}()<>]/gy;
  const tokens: Token[] = [];
  let offset = 0,
    line = 1;
  while (offset < source.length) {
    pattern.lastIndex = offset;
    const match = pattern.exec(source);
    if (!match)
      throw new TraceFault('unsupported', 'Unsupported character in this teaching subset.', line);
    const text = match[0];
    if (!/^\s|^\/\//.test(text)) tokens.push({ text, line });
    line += (text.match(/\n/g) ?? []).length;
    offset = pattern.lastIndex;
  }
  tokens.push({ text: '<end>', line });
  return tokens;
}

class Parser {
  pos = 0;
  constructor(private tokens: Token[]) {}
  peek() {
    return this.tokens[this.pos];
  }
  take(text?: string) {
    const token = this.peek();
    if (text && token.text !== text)
      throw new TraceFault(
        'syntax',
        'Expected "' + text + '", found "' + token.text + '".',
        token.line,
      );
    this.pos++;
    return token;
  }
  name() {
    const token = this.take();
    if (!/^[A-Za-z_]\w*$/.test(token.text))
      throw new TraceFault('syntax', 'Expected a variable name.', token.line);
    return token.text;
  }
  expression(min = 0): Expr {
    let left: Expr;
    const token = this.take();
    if (/^\d+$/.test(token.text)) left = { kind: 'number', value: Number(token.text) };
    else if (token.text === 'sizeof') {
      this.take('(');
      this.take('int');
      this.take(')');
      left = { kind: 'number', value: 4 };
    } else if (token.text === 'malloc') {
      this.take('(');
      const bytes = this.expression();
      this.take(')');
      left = { kind: 'malloc', bytes };
    } else if (['*', '&', '-', '+'].includes(token.text))
      left = { kind: 'unary', op: token.text, arg: this.expression(5) };
    else if (token.text === '(') {
      left = this.expression();
      this.take(')');
    } else if (/^[A-Za-z_]\w*$/.test(token.text)) left = { kind: 'name', name: token.text };
    else throw new TraceFault('syntax', 'Expected a value or expression.', token.line);
    const precedence: Record<string, number> = {
      '==': 1,
      '!=': 1,
      '<': 2,
      '>': 2,
      '<=': 2,
      '>=': 2,
      '+': 3,
      '-': 3,
      '*': 4,
      '/': 4,
    };
    while (true) {
      if (this.peek().text === '[') {
        this.take('[');
        const index = this.expression();
        this.take(']');
        left = { kind: 'index', base: left, index };
        continue;
      }
      const op = this.peek().text;
      const p = precedence[op] ?? 0;
      if (!p || p < min) break;
      this.take();
      left = { kind: 'binary', op, left, right: this.expression(p + 1) };
    }
    return left;
  }
  program(): Statement[] {
    const statements: Statement[] = [];
    while (this.peek().text !== '<end>') {
      const line = this.peek().line;
      const head = this.peek().text;
      if (head === 'int') {
        this.take();
        const pointer = this.peek().text === '*';
        if (pointer) this.take();
        const name = this.name();
        let count = 1,
          type: 'int' | 'pointer' | 'array' = pointer ? 'pointer' : 'int';
        if (this.peek().text === '[') {
          if (pointer)
            throw new TraceFault(
              'unsupported',
              'Arrays of pointers are not in this teaching subset.',
              line,
            );
          this.take('[');
          count = Number(this.take().text);
          this.take(']');
          type = 'array';
          if (!Number.isInteger(count) || count < 1 || count > 64)
            throw new TraceFault('unsupported', 'Use an array length between 1 and 64.', line);
        }
        let init: Expr | undefined, values: Expr[] | undefined;
        if (this.peek().text === '=') {
          this.take('=');
          if (type === 'array') {
            this.take('{');
            values = [this.expression()];
            while (this.peek().text === ',') {
              this.take();
              values.push(this.expression());
            }
            this.take('}');
            if (values.length > count)
              throw new TraceFault('syntax', 'Too many array initializer values.', line);
          } else init = this.expression();
        }
        statements.push({ kind: 'declare', line, name, type, count, init, values });
      } else if (head === 'printf') {
        this.take();
        this.take('(');
        const format = this.take().text;
        if (!/^"/.test(format))
          throw new TraceFault('unsupported', 'Use a literal printf format.', line);
        const decoded = format.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
        const value = this.peek().text === ',' ? (this.take(), this.expression()) : undefined;
        this.take(')');
        if (decoded.replace('%d', '').includes('%') || decoded.includes('%d') !== Boolean(value))
          throw new TraceFault('unsupported', 'This trace supports one %d value in printf.', line);
        statements.push({ kind: 'print', line, format: decoded, value });
      } else if (head === 'free') {
        this.take();
        this.take('(');
        const value = this.expression();
        this.take(')');
        statements.push({ kind: 'free', line, value });
      } else if (
        ['for', 'while', 'if', 'return', 'void', 'struct', 'double', 'float'].includes(head)
      ) {
        throw new TraceFault(
          'unsupported',
          'This first teaching engine does not support ' + head + ' statements.',
          line,
        );
      } else {
        const target = this.expression();
        const op = this.take().text;
        if (!['=', '+=', '-='].includes(op))
          throw new TraceFault(
            'unsupported',
            'Expected an assignment in this teaching subset.',
            line,
          );
        statements.push({ kind: 'assign', line, target, op, value: this.expression() });
      }
      this.take(';');
      if (statements.length > 80)
        throw new TraceFault('unsupported', 'Use at most 80 statements in a teaching trace.', line);
    }
    return statements;
  }
}

class Machine {
  blocks: Block[] = [];
  bindings = new Map<string, Binding>();
  output = '';
  create(name: string, count: number, space: 'stack' | 'heap') {
    const block: Block = {
      id: this.blocks.length,
      name,
      space,
      base: (space === 'heap' ? 0x5000 : 0x1000) + this.blocks.length * 0x100,
      cells: Array(count).fill(null),
      freed: false,
    };
    this.blocks.push(block);
    return block;
  }
  int(value: Value) {
    if (value.kind !== 'int') throw new TraceFault('type', 'This expression needs an int value.');
    return value.value;
  }
  ptr(value: Value): Pointer {
    if (value.kind === 'int' && value.value === 0)
      return { kind: 'pointer', block: null, index: 0 };
    if (value.kind !== 'pointer')
      throw new TraceFault('type', 'This expression needs an int pointer.');
    return value;
  }
  binding(name: string) {
    const result = this.bindings.get(name);
    if (!result) throw new TraceFault('type', 'Unknown variable "' + name + '".');
    return result;
  }
  cell(pointer: Pointer) {
    if (pointer.block === null)
      throw new TraceFault(
        'null-pointer',
        'A null pointer does not point to an int you can read or write.',
      );
    const block = this.blocks[pointer.block];
    if (block.freed)
      throw new TraceFault(
        'use-after-free',
        'This allocation was freed. The old pointer cannot be dereferenced.',
      );
    if (pointer.index < 0 || pointer.index >= block.cells.length)
      throw new TraceFault('out-of-bounds', 'This index points outside the allocated array.');
    return block;
  }
  address(expr: Expr): Pointer {
    if (expr.kind === 'name') {
      const binding = this.binding(expr.name);
      if (binding.type === 'pointer')
        throw new TraceFault(
          'unsupported',
          'Pointers to pointers are not in this teaching subset.',
        );
      if (binding.type === 'array')
        throw new TraceFault(
          'unsupported',
          'Use the array name or &array[index], not a pointer to the whole array.',
        );
      return { kind: 'pointer', block: binding.block, index: 0 };
    }
    if (expr.kind === 'unary' && expr.op === '*') return this.ptr(this.eval(expr.arg));
    if (expr.kind === 'index')
      return this.offset(this.ptr(this.eval(expr.base)), this.int(this.eval(expr.index)));
    throw new TraceFault('type', 'This expression is not a writable int location.');
  }
  offset(p: Pointer, amount: number): Pointer {
    if (p.block === null)
      throw new TraceFault('null-pointer', 'Null is not the start of an array.');
    const block = this.blocks[p.block];
    if (block.freed) throw new TraceFault('use-after-free', 'The pointer refers to freed storage.');
    const index = p.index + amount;
    if (index < 0 || index > block.cells.length)
      throw new TraceFault('out-of-bounds', 'Pointer arithmetic moved beyond this array.');
    return { ...p, index };
  }
  read(p: Pointer): Value {
    const value = this.cell(p).cells[p.index];
    if (value === null)
      throw new TraceFault(
        'uninitialized',
        'This int has not been initialized. C does not give it a predictable value.',
      );
    return integer(value);
  }
  binary(op: string, a: Value, b: Value): Value {
    if ((op === '+' || op === '-') && a.kind === 'pointer')
      return this.offset(a, this.int(b) * (op === '-' ? -1 : 1));
    if (op === '+' && b.kind === 'pointer') return this.offset(b, this.int(a));
    const x = this.int(a),
      y = this.int(b);
    switch (op) {
      case '+':
        return integer(x + y);
      case '-':
        return integer(x - y);
      case '*':
        return integer(x * y);
      case '/':
        if (y === 0)
          throw new TraceFault('division-by-zero', 'Division by zero is undefined in C.');
        return integer(Math.trunc(x / y));
      case '==':
        return integer(Number(x === y));
      case '!=':
        return integer(Number(x !== y));
      case '<':
        return integer(Number(x < y));
      case '>':
        return integer(Number(x > y));
      case '<=':
        return integer(Number(x <= y));
      case '>=':
        return integer(Number(x >= y));
      default:
        throw new TraceFault('unsupported', 'Unsupported operator.');
    }
  }
  eval(expr: Expr): Value {
    switch (expr.kind) {
      case 'number':
        return integer(expr.value);
      case 'name': {
        if (expr.name === 'NULL') return { kind: 'pointer', block: null, index: 0 };
        const binding = this.binding(expr.name);
        if (binding.type === 'pointer') return { ...binding.value };
        if (binding.type === 'array') return { kind: 'pointer', block: binding.block, index: 0 };
        return this.read({ kind: 'pointer', block: binding.block, index: 0 });
      }
      case 'unary':
        if (expr.op === '&') return this.address(expr.arg);
        if (expr.op === '*') return this.read(this.ptr(this.eval(expr.arg)));
        return integer(this.int(this.eval(expr.arg)) * (expr.op === '-' ? -1 : 1));
      case 'index':
        return this.read(this.address(expr));
      case 'binary':
        return this.binary(expr.op, this.eval(expr.left), this.eval(expr.right));
      case 'malloc': {
        const bytes = this.int(this.eval(expr.bytes));
        if (bytes < 4 || bytes % 4 || bytes > 256)
          throw new TraceFault(
            'unsupported',
            'This teaching model allocates 1–64 ints at a time and assumes allocation succeeds.',
          );
        const block = this.create(
          'allocation ' + (this.blocks.filter((b) => b.space === 'heap').length + 1),
          bytes / 4,
          'heap',
        );
        return { kind: 'pointer', block: block.id, index: 0 };
      }
    }
  }
  execute(stmt: Statement) {
    if (stmt.kind === 'declare') {
      if (this.bindings.has(stmt.name))
        throw new TraceFault('type', 'A variable with this name is already declared.');
      if (stmt.type === 'pointer') {
        if (!stmt.init)
          throw new TraceFault('unsupported', 'Initialize pointers in this teaching subset.');
        this.bindings.set(stmt.name, {
          name: stmt.name,
          type: 'pointer',
          value: this.ptr(this.eval(stmt.init)),
        });
      } else {
        const block = this.create(stmt.name, stmt.count, 'stack');
        this.bindings.set(stmt.name, { name: stmt.name, type: stmt.type, block: block.id });
        if (stmt.init) block.cells[0] = this.int(this.eval(stmt.init));
        if (stmt.values)
          block.cells = Array.from({ length: stmt.count }, (_, i) =>
            stmt.values![i] ? this.int(this.eval(stmt.values![i])) : 0,
          );
      }
    } else if (stmt.kind === 'assign') {
      if (stmt.target.kind === 'name' && this.binding(stmt.target.name).type === 'pointer') {
        const binding = this.binding(stmt.target.name) as Extract<Binding, { type: 'pointer' }>;
        const value = this.eval(stmt.value);
        binding.value = this.ptr(
          stmt.op === '=' ? value : this.binary(stmt.op[0], binding.value, value),
        );
      } else {
        const pointer = this.address(stmt.target);
        const value = this.eval(stmt.value);
        this.cell(pointer).cells[pointer.index] = this.int(
          stmt.op === '=' ? value : this.binary(stmt.op[0], this.read(pointer), value),
        );
      }
    } else if (stmt.kind === 'print') {
      this.output += stmt.value
        ? stmt.format.replace('%d', String(this.int(this.eval(stmt.value))))
        : stmt.format;
    } else {
      const pointer = this.ptr(this.eval(stmt.value));
      if (pointer.block === null) return;
      const block = this.blocks[pointer.block];
      if (block.space !== 'heap' || pointer.index !== 0 || block.freed)
        throw new TraceFault(
          'invalid-free',
          'free needs the original pointer to a live heap allocation.',
        );
      block.freed = true;
    }
  }
  snapshot(line: number, note: string): TraceStep {
    return {
      line,
      output: this.output,
      note,
      variables: [...this.bindings.values()].map((binding) => {
        if (binding.type === 'pointer') {
          const p = binding.value;
          const target = p.block === null ? 'NULL' : hex(this.blocks[p.block].base + p.index * 4);
          return { name: binding.name, type: 'int *', value: target, target };
        }
        const block = this.blocks[binding.block];
        return {
          name: binding.name,
          type: binding.type === 'array' ? 'int[' + block.cells.length + ']' : 'int',
          value:
            binding.type === 'array'
              ? '[' + block.cells.map((n) => n ?? '?').join(', ') + ']'
              : String(block.cells[0] ?? '?'),
        };
      }),
      memory: this.blocks.map((block) => ({
        id: block.id,
        label: block.name,
        space: block.space,
        address: hex(block.base),
        freed: block.freed,
        cells: block.cells.map((value, index) => ({
          address: hex(block.base + index * 4),
          value: value === null ? '?' : String(value),
        })),
      })),
    };
  }
}
export function traceProgram(source: string): Trace {
  const machine = new Machine();
  const steps: TraceStep[] = [machine.snapshot(0, 'Nothing has run yet.')];
  let activeLine = 0;
  try {
    for (const statement of new Parser(tokenize(source)).program()) {
      activeLine = statement.line;
      machine.execute(statement);
      steps.push(machine.snapshot(activeLine, 'Line ' + activeLine + ' has run.'));
    }
    return { steps, output: machine.output };
  } catch (error) {
    const fault =
      error instanceof TraceFault
        ? error
        : new TraceFault('unsupported', 'The teaching engine could not trace this program.');
    const line = fault.line || activeLine;
    steps.push(machine.snapshot(line, fault.message));
    return {
      steps,
      output: machine.output,
      fault: { kind: fault.kind, message: fault.message, line },
    };
  }
}
export function traceAnswer(trace: Trace) {
  return trace.fault ? 'fault:' + trace.fault.kind : trace.output.trim();
}
