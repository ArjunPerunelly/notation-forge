/**
 * Expression Conversion, AST, Evaluation, and Step-by-Step Trace Engine
 * Supports Infix, Postfix (RPN), and Prefix (Polish) notations.
 * Works in Browser globals (`window.ExprEngine`) and Node.js (`module.exports`).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ExprEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const OPEN_BRACKETS = { '(': ')', '[': ']', '{': '}' };
  const CLOSE_BRACKETS = { ')': '(', ']': '[', '}': '{' };

  const OPERATOR_META = {
    '+': { precedence: 1, associativity: 'left', label: 'Addition' },
    '-': { precedence: 1, associativity: 'left', label: 'Subtraction' },
    '*': { precedence: 2, associativity: 'left', label: 'Multiplication' },
    '/': { precedence: 2, associativity: 'left', label: 'Division' },
    '%': { precedence: 2, associativity: 'left', label: 'Modulo' },
    '^': { precedence: 3, associativity: 'right', label: 'Exponentiation' },
    '$': { precedence: 3, associativity: 'right', label: 'Exponentiation' }
  };

  function isOperator(token) {
    return Object.prototype.hasOwnProperty.call(OPERATOR_META, token);
  }

  function isOpenBracket(token) {
    return Object.prototype.hasOwnProperty.call(OPEN_BRACKETS, token);
  }

  function isCloseBracket(token) {
    return Object.prototype.hasOwnProperty.call(CLOSE_BRACKETS, token);
  }

  function isBracket(token) {
    return isOpenBracket(token) || isCloseBracket(token);
  }

  function isNumericToken(token) {
    return /^-?\d+(?:\.\d+)?$/.test(token);
  }

  function isOperand(token) {
    return Boolean(token) && !isOperator(token) && !isBracket(token);
  }

  function getOperatorInfo(op, options = {}) {
    const base = OPERATOR_META[op];
    if (!base) return null;
    if ((op === '^' || op === '$') && options.caretAssoc === 'left') {
      return { ...base, associativity: 'left' };
    }
    return base;
  }

  /**
   * Tokenize an Infix expression.
   * Handles multi-char identifiers/numbers (auto) or single-char operands (single),
   * as well as negative numeric literals in unary positions (start, after '(', after operator).
   */
  function tokenizeInfix(input, options = {}) {
    const mode = options.tokenMode || 'auto';
    const tokens = [];
    let i = 0;

    while (i < input.length) {
      const ch = input[i];

      if (/\s/.test(ch)) {
        i += 1;
        continue;
      }

      const prevToken = tokens.length > 0 ? tokens[tokens.length - 1] : null;
      const canBeUnary =
        prevToken === null ||
        isOpenBracket(prevToken.value) ||
        isOperator(prevToken.value);

      // Negative numeric literal in unary position, e.g., "-5 + 3" or "(-2.5) * 4"
      if (
        ch === '-' &&
        canBeUnary &&
        i + 1 < input.length &&
        /\d/.test(input[i + 1]) &&
        mode !== 'single'
      ) {
        const start = i;
        i += 1;
        while (i < input.length && /\d/.test(input[i])) i += 1;
        if (input[i] === '.' && i + 1 < input.length && /\d/.test(input[i + 1])) {
          i += 1;
          while (i < input.length && /\d/.test(input[i])) i += 1;
        }
        tokens.push({
          value: input.slice(start, i),
          kind: 'operand',
          start,
          end: i
        });
        continue;
      }

      if (isOperator(ch)) {
        tokens.push({ value: ch, kind: 'operator', start: i, end: i + 1 });
        i += 1;
        continue;
      }

      if (isOpenBracket(ch)) {
        tokens.push({ value: ch, kind: 'open', start: i, end: i + 1 });
        i += 1;
        continue;
      }

      if (isCloseBracket(ch)) {
        tokens.push({ value: ch, kind: 'close', start: i, end: i + 1 });
        i += 1;
        continue;
      }

      if (mode === 'single') {
        if (/[A-Za-z0-9_]/.test(ch)) {
          tokens.push({ value: ch, kind: 'operand', start: i, end: i + 1 });
          i += 1;
          continue;
        }
        throw createSyntaxError(`Unexpected character '${ch}' at position ${i + 1}.`, i, i + 1);
      }

      // Multi-digit numeric literal
      if (/\d/.test(ch)) {
        const start = i;
        while (i < input.length && /\d/.test(input[i])) i += 1;
        if (input[i] === '.' && i + 1 < input.length && /\d/.test(input[i + 1])) {
          i += 1;
          while (i < input.length && /\d/.test(input[i])) i += 1;
        }
        tokens.push({
          value: input.slice(start, i),
          kind: 'operand',
          start,
          end: i
        });
        continue;
      }

      // Identifier (variable / symbol)
      if (/[A-Za-z_]/.test(ch)) {
        const start = i;
        while (i < input.length && /[A-Za-z0-9_]/.test(input[i])) i += 1;
        tokens.push({
          value: input.slice(start, i),
          kind: 'operand',
          start,
          end: i
        });
        continue;
      }

      throw createSyntaxError(`Unexpected character '${ch}' at position ${i + 1}.`, i, i + 1);
    }

    return tokens;
  }

  /**
   * Tokenize a Postfix or Prefix expression.
   * - In 'single' mode: every non-whitespace char is a token.
   * - In 'space' mode: split on whitespace, separating attached operators unless negative number.
   * - In 'auto' mode: if input has whitespace, use 'space' rules; otherwise split into single chars.
   */
  function tokenizeFlat(input, options = {}) {
    const mode = options.tokenMode || 'auto';
    const trimmed = input.trim();
    if (!trimmed) return [];

    const hasWhitespace = /\s/.test(trimmed);
    const effectiveMode = mode === 'auto' ? (hasWhitespace ? 'space' : 'single') : mode;

    const tokens = [];
    let i = 0;

    if (effectiveMode === 'single') {
      while (i < input.length) {
        const ch = input[i];
        if (/\s/.test(ch)) {
          i += 1;
          continue;
        }
        if (isOperator(ch)) {
          tokens.push({ value: ch, kind: 'operator', start: i, end: i + 1 });
        } else if (isOpenBracket(ch)) {
          tokens.push({ value: ch, kind: 'open', start: i, end: i + 1 });
        } else if (isCloseBracket(ch)) {
          tokens.push({ value: ch, kind: 'close', start: i, end: i + 1 });
        } else if (/[A-Za-z0-9_]/.test(ch)) {
          tokens.push({ value: ch, kind: 'operand', start: i, end: i + 1 });
        } else {
          throw createSyntaxError(`Unexpected character '${ch}' at position ${i + 1}.`, i, i + 1);
        }
        i += 1;
      }
      return tokens;
    }

    // Space-separated mode (allows multi-char identifiers, decimals, negative numbers like -5)
    while (i < input.length) {
      const ch = input[i];
      if (/\s/.test(ch)) {
        i += 1;
        continue;
      }

      const prevIsStartOrSpace = i === 0 || /\s/.test(input[i - 1]);
      if (
        ch === '-' &&
        prevIsStartOrSpace &&
        i + 1 < input.length &&
        /\d/.test(input[i + 1])
      ) {
        const start = i;
        i += 1;
        while (i < input.length && /\d/.test(input[i])) i += 1;
        if (input[i] === '.' && i + 1 < input.length && /\d/.test(input[i + 1])) {
          i += 1;
          while (i < input.length && /\d/.test(input[i])) i += 1;
        }
        tokens.push({ value: input.slice(start, i), kind: 'operand', start, end: i });
        continue;
      }

      if (isOperator(ch)) {
        tokens.push({ value: ch, kind: 'operator', start: i, end: i + 1 });
        i += 1;
        continue;
      }

      if (isOpenBracket(ch)) {
        tokens.push({ value: ch, kind: 'open', start: i, end: i + 1 });
        i += 1;
        continue;
      }

      if (isCloseBracket(ch)) {
        tokens.push({ value: ch, kind: 'close', start: i, end: i + 1 });
        i += 1;
        continue;
      }

      if (/\d/.test(ch)) {
        const start = i;
        while (i < input.length && /\d/.test(input[i])) i += 1;
        if (input[i] === '.' && i + 1 < input.length && /\d/.test(input[i + 1])) {
          i += 1;
          while (i < input.length && /\d/.test(input[i])) i += 1;
        }
        tokens.push({ value: input.slice(start, i), kind: 'operand', start, end: i });
        continue;
      }

      if (/[A-Za-z_]/.test(ch)) {
        const start = i;
        while (i < input.length && /[A-Za-z0-9_]/.test(input[i])) i += 1;
        tokens.push({ value: input.slice(start, i), kind: 'operand', start, end: i });
        continue;
      }

      throw createSyntaxError(`Unexpected character '${ch}' at position ${i + 1}.`, i, i + 1);
    }

    return tokens;
  }

  function createSyntaxError(message, start, end, hint) {
    const err = new Error(message);
    err.name = 'ExpressionSyntaxError';
    err.start = typeof start === 'number' ? start : 0;
    err.end = typeof end === 'number' ? end : 0;
    if (hint) err.hint = hint;
    return err;
  }

  /**
   * Auto-detect notation ('infix' | 'postfix' | 'prefix').
   */
  function detectNotation(input, options = {}) {
    const trimmed = (input || '').trim();
    if (!trimmed) {
      throw createSyntaxError('Enter an expression to convert.', 0, 0);
    }

    // Any bracket clearly indicates Infix (or bracketed malformed input)
    if (/[()[\]{}]/.test(trimmed)) {
      return 'infix';
    }

    // Try flat tokenization first to inspect leading/trailing tokens
    const flatTokens = tokenizeFlat(trimmed, options);
    if (flatTokens.length === 0) {
      throw createSyntaxError('Enter an expression to convert.', 0, 0);
    }

    const first = flatTokens[0];
    const last = flatTokens[flatTokens.length - 1];

    if (last.kind === 'operator') {
      return 'postfix';
    }

    // If input starts with "-<digit>" (a negative number literal, not standalone "- "),
    // prefer checking infix first unless prefix explicitly starts with standalone operator.
    const startsWithNegativeLiteral = /^-\d/.test(trimmed);
    if (first.kind === 'operator' && !startsWithNegativeLiteral) {
      return 'prefix';
    }

    // Also try if single-char / infix parsing works cleanly
    try {
      const infixTokens = tokenizeInfix(trimmed, options);
      parseInfixToAst(infixTokens, options);
      return 'infix';
    } catch (infixErr) {
      // Fall back to trying postfix / prefix in case user typed unusual spacing
      try {
        parsePostfixToAst(flatTokens);
        return 'postfix';
      } catch (_) {
        try {
          parsePrefixToAst(flatTokens);
          return 'prefix';
        } catch (_) {
          throw infixErr;
        }
      }
    }
  }

  /**
   * Validate and parse Infix tokens into an AST using operator-precedence shunting.
   */
  function parseInfixToAst(tokens, options = {}) {
    if (!tokens || tokens.length === 0) {
      throw createSyntaxError('Expression is empty.', 0, 0);
    }

    const opStack = [];
    const nodeStack = [];
    let expectingOperand = true;

    function popAndCombine() {
      const opTok = opStack.pop();
      const right = nodeStack.pop();
      const left = nodeStack.pop();
      if (!left || !right) {
        throw createSyntaxError(
          `Operator '${opTok.value}' is missing an operand.`,
          opTok.start,
          opTok.end
        );
      }
      nodeStack.push({ type: 'op', op: opTok.value, left, right });
    }

    for (let i = 0; i < tokens.length; i += 1) {
      const tok = tokens[i];

      if (tok.kind === 'operand') {
        if (!expectingOperand) {
          throw createSyntaxError(
            `Expected an operator before operand '${tok.value}'.`,
            tok.start,
            tok.end,
            options.tokenMode === 'single'
              ? 'Single-char mode separates adjacent characters. Switch to Auto or add operators between operands.'
              : undefined
          );
        }
        nodeStack.push({ type: 'operand', value: tok.value });
        expectingOperand = false;
      } else if (tok.kind === 'open') {
        if (!expectingOperand) {
          throw createSyntaxError(
            `Expected an operator before '${tok.value}'.`,
            tok.start,
            tok.end
          );
        }
        opStack.push(tok);
        expectingOperand = true;
      } else if (tok.kind === 'close') {
        if (expectingOperand) {
          const prev = tokens[i - 1];
          if (prev && prev.kind === 'open') {
            throw createSyntaxError(
              `Empty brackets '${prev.value}${tok.value}' are not allowed.`,
              prev.start,
              tok.end
            );
          }
          throw createSyntaxError(
            `Missing operand before '${tok.value}'.`,
            tok.start,
            tok.end
          );
        }

        let matched = false;
        while (opStack.length > 0) {
          const top = opStack[opStack.length - 1];
          if (top.kind === 'open') {
            if (OPEN_BRACKETS[top.value] !== tok.value) {
              throw createSyntaxError(
                `Mismatched bracket: opened with '${top.value}' but closed with '${tok.value}'.`,
                tok.start,
                tok.end
              );
            }
            opStack.pop();
            matched = true;
            break;
          }
          popAndCombine();
        }

        if (!matched) {
          throw createSyntaxError(
            `Unmatched closing bracket '${tok.value}'.`,
            tok.start,
            tok.end
          );
        }
        expectingOperand = false;
      } else if (tok.kind === 'operator') {
        if (expectingOperand) {
          throw createSyntaxError(
            `Unexpected operator '${tok.value}' at position ${tok.start + 1}.`,
            tok.start,
            tok.end,
            i === 0
              ? 'Infix expressions cannot start with a binary operator. Did you mean Prefix notation?'
              : undefined
          );
        }

        const currInfo = getOperatorInfo(tok.value, options);
        while (opStack.length > 0) {
          const top = opStack[opStack.length - 1];
          if (top.kind !== 'operator') break;
          const topInfo = getOperatorInfo(top.value, options);
          const shouldPop =
            currInfo.associativity === 'left'
              ? topInfo.precedence >= currInfo.precedence
              : topInfo.precedence > currInfo.precedence;
          if (!shouldPop) break;
          popAndCombine();
        }

        opStack.push(tok);
        expectingOperand = true;
      }
    }

    if (expectingOperand) {
      const last = tokens[tokens.length - 1];
      throw createSyntaxError(
        `Expression ends unexpectedly after '${last.value}'.`,
        last.start,
        last.end,
        last.kind === 'operator'
          ? 'Infix expressions cannot end with an operator. Did you mean Postfix notation?'
          : undefined
      );
    }

    while (opStack.length > 0) {
      const top = opStack[opStack.length - 1];
      if (top.kind === 'open') {
        throw createSyntaxError(
          `Unclosed bracket '${top.value}' at position ${top.start + 1}.`,
          top.start,
          top.end
        );
      }
      popAndCombine();
    }

    if (nodeStack.length !== 1) {
      throw createSyntaxError('Invalid infix expression.', 0, 0);
    }

    return nodeStack[0];
  }

  /**
   * Parse Postfix tokens left-to-right into an AST.
   */
  function parsePostfixToAst(tokens) {
    if (!tokens || tokens.length === 0) {
      throw createSyntaxError('Expression is empty.', 0, 0);
    }

    const stack = [];
    for (let i = 0; i < tokens.length; i += 1) {
      const tok = tokens[i];
      if (tok.kind === 'open' || tok.kind === 'close') {
        throw createSyntaxError(
          `Postfix expressions cannot contain brackets ('${tok.value}').`,
          tok.start,
          tok.end
        );
      }

      if (tok.kind === 'operand') {
        stack.push({ type: 'operand', value: tok.value });
      } else if (tok.kind === 'operator') {
        if (stack.length < 2) {
          throw createSyntaxError(
            `Operator '${tok.value}' needs 2 operands, but stack only has ${stack.length}.`,
            tok.start,
            tok.end
          );
        }
        const right = stack.pop();
        const left = stack.pop();
        stack.push({ type: 'op', op: tok.value, left, right });
      }
    }

    if (stack.length !== 1) {
      const extraCount = stack.length;
      throw createSyntaxError(
        `Invalid postfix expression: ${extraCount} values remain on the stack (missing ${extraCount - 1} operator${extraCount - 1 === 1 ? '' : 's'}).`,
        0,
        tokens[tokens.length - 1].end,
        'If using multi-character variables like "alpha beta +", separate tokens with spaces.'
      );
    }

    return stack[0];
  }

  /**
   * Parse Prefix tokens right-to-left into an AST.
   */
  function parsePrefixToAst(tokens) {
    if (!tokens || tokens.length === 0) {
      throw createSyntaxError('Expression is empty.', 0, 0);
    }

    const stack = [];
    for (let i = tokens.length - 1; i >= 0; i -= 1) {
      const tok = tokens[i];
      if (tok.kind === 'open' || tok.kind === 'close') {
        throw createSyntaxError(
          `Prefix expressions cannot contain brackets ('${tok.value}').`,
          tok.start,
          tok.end
        );
      }

      if (tok.kind === 'operand') {
        stack.push({ type: 'operand', value: tok.value });
      } else if (tok.kind === 'operator') {
        if (stack.length < 2) {
          throw createSyntaxError(
            `Operator '${tok.value}' needs 2 operands to its right, but only ${stack.length} available.`,
            tok.start,
            tok.end
          );
        }
        const left = stack.pop();
        const right = stack.pop();
        stack.push({ type: 'op', op: tok.value, left, right });
      }
    }

    if (stack.length !== 1) {
      const extraCount = stack.length;
      throw createSyntaxError(
        `Invalid prefix expression: ${extraCount} values remain uncombined (missing ${extraCount - 1} operator${extraCount - 1 === 1 ? '' : 's'}).`,
        0,
        tokens[tokens.length - 1].end,
        'If using multi-character variables like "+ alpha beta", separate tokens with spaces.'
      );
    }

    return stack[0];
  }

  function astToPostfixTokens(node) {
    if (node.type === 'operand') return [node.value];
    return [
      ...astToPostfixTokens(node.left),
      ...astToPostfixTokens(node.right),
      node.op
    ];
  }

  function astToPrefixTokens(node) {
    if (node.type === 'operand') return [node.value];
    return [
      node.op,
      ...astToPrefixTokens(node.left),
      ...astToPrefixTokens(node.right)
    ];
  }

  function needsParensLeft(parentOp, leftNode, options) {
    if (leftNode.type !== 'op') return false;
    const pInfo = getOperatorInfo(parentOp, options);
    const lInfo = getOperatorInfo(leftNode.op, options);
    if (lInfo.precedence < pInfo.precedence) return true;
    if (lInfo.precedence === pInfo.precedence && pInfo.associativity === 'right') {
      return true;
    }
    return false;
  }

  function needsParensRight(parentOp, rightNode, options) {
    if (rightNode.type !== 'op') return false;
    const pInfo = getOperatorInfo(parentOp, options);
    const rInfo = getOperatorInfo(rightNode.op, options);
    if (rInfo.precedence < pInfo.precedence) return true;
    if (rInfo.precedence === pInfo.precedence && pInfo.associativity === 'left') {
      return true;
    }
    return false;
  }

  function astToInfixTokens(node, options = {}, fullParens = false) {
    if (node.type === 'operand') return [node.value];

    const leftTokens = astToInfixTokens(node.left, options, fullParens);
    const rightTokens = astToInfixTokens(node.right, options, fullParens);

    const wrapLeft =
      fullParens ? node.left.type === 'op' : needsParensLeft(node.op, node.left, options);
    const wrapRight =
      fullParens ? node.right.type === 'op' : needsParensRight(node.op, node.right, options);

    const result = [];
    if (fullParens) result.push('(');

    if (wrapLeft && !fullParens) result.push('(');
    result.push(...leftTokens);
    if (wrapLeft && !fullParens) result.push(')');

    result.push(node.op);

    if (wrapRight && !fullParens) result.push('(');
    result.push(...rightTokens);
    if (wrapRight && !fullParens) result.push(')');

    if (fullParens) result.push(')');
    return result;
  }

  function formatTokens(tokens, compact = false) {
    if (!tokens || tokens.length === 0) return '';
    if (compact) return tokens.join('');
    let out = '';
    for (let i = 0; i < tokens.length; i += 1) {
      const curr = tokens[i];
      const prev = i > 0 ? tokens[i - 1] : null;
      if (i > 0) {
        if (prev === '(' || prev === '[' || prev === '{') {
          // No space after opening bracket
        } else if (curr === ')' || curr === ']' || curr === '}') {
          // No space before closing bracket
        } else {
          out += ' ';
        }
      }
      out += curr;
    }
    return out;
  }

  function canBeCompact(tokens) {
    return tokens.every((t) => t.length === 1);
  }

  /**
   * Trace: Infix -> Postfix (Shunting-Yard)
   */
  function traceInfixToPostfix(tokens, options = {}) {
    const steps = [];
    const opStack = [];
    const output = [];

    for (let i = 0; i < tokens.length; i += 1) {
      const tok = tokens[i];
      const popped = [];

      if (tok.kind === 'operand') {
        output.push(tok.value);
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'operand',
          action: `Append operand '${tok.value}' to output`,
          stack: [...opStack],
          output: [...output],
          pushed: null,
          popped: []
        });
      } else if (tok.kind === 'open') {
        opStack.push(tok.value);
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'open',
          action: `Push opening bracket '${tok.value}' onto stack`,
          stack: [...opStack],
          output: [...output],
          pushed: tok.value,
          popped: []
        });
      } else if (tok.kind === 'close') {
        while (opStack.length > 0 && !isOpenBracket(opStack[opStack.length - 1])) {
          const op = opStack.pop();
          output.push(op);
          popped.push(op);
        }
        const matchedOpen = opStack.pop();
        const popDesc = popped.length > 0 ? `Pop ${popped.join(', ')} to output, then discard '${matchedOpen}'` : `Discard matching '${matchedOpen}'`;
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'close',
          action: popDesc,
          stack: [...opStack],
          output: [...output],
          pushed: null,
          popped
        });
      } else if (tok.kind === 'operator') {
        const currInfo = getOperatorInfo(tok.value, options);
        while (opStack.length > 0) {
          const top = opStack[opStack.length - 1];
          if (!isOperator(top)) break;
          const topInfo = getOperatorInfo(top, options);
          const shouldPop =
            currInfo.associativity === 'left'
              ? topInfo.precedence >= currInfo.precedence
              : topInfo.precedence > currInfo.precedence;
          if (!shouldPop) break;
          opStack.pop();
          output.push(top);
          popped.push(top);
        }
        opStack.push(tok.value);

        const action =
          popped.length > 0
            ? `Pop ${popped.join(', ')} (higher/equal precedence), then push '${tok.value}'`
            : `Push operator '${tok.value}' (prec ${currInfo.precedence}, ${currInfo.associativity}-assoc)`;
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'operator',
          action,
          stack: [...opStack],
          output: [...output],
          pushed: tok.value,
          popped
        });
      }
    }

    if (opStack.length > 0) {
      const remaining = [];
      while (opStack.length > 0) {
        const op = opStack.pop();
        output.push(op);
        remaining.push(op);
      }
      steps.push({
        step: steps.length + 1,
        tokenIndex: -1,
        token: 'END',
        tokenKind: 'end',
        action: `Flush remaining operators from stack: ${remaining.join(', ')}`,
        stack: [],
        output: [...output],
        pushed: null,
        popped: remaining
      });
    } else {
      steps.push({
        step: steps.length + 1,
        tokenIndex: -1,
        token: 'END',
        tokenKind: 'end',
        action: 'Input complete; stack is empty',
        stack: [],
        output: [...output],
        pushed: null,
        popped: []
      });
    }

    return {
      algorithm: 'Shunting-Yard Algorithm (Operator Stack)',
      direction: 'Left → Right',
      stackTitle: 'Operator Stack',
      outputTitle: 'Postfix Output',
      steps
    };
  }

  /**
   * Trace: Infix -> Prefix (Reverse & Swap Parens -> Modified Shunting-Yard -> Reverse)
   */
  function traceInfixToPrefix(tokens, options = {}) {
    const reversedTokens = [...tokens].reverse().map((tok) => {
      if (tok.kind === 'open') {
        return { ...tok, value: OPEN_BRACKETS[tok.value], kind: 'close' };
      }
      if (tok.kind === 'close') {
        return { ...tok, value: CLOSE_BRACKETS[tok.value], kind: 'open' };
      }
      return { ...tok };
    });

    const steps = [];
    const opStack = [];
    const output = [];

    for (let i = 0; i < reversedTokens.length; i += 1) {
      const tok = reversedTokens[i];
      const popped = [];

      if (tok.kind === 'operand') {
        output.push(tok.value);
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'operand',
          action: `Append operand '${tok.value}' to reversed buffer`,
          stack: [...opStack],
          output: [...output],
          pushed: null,
          popped: []
        });
      } else if (tok.kind === 'open') {
        opStack.push(tok.value);
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'open',
          action: `Push swapped bracket '${tok.value}' onto stack`,
          stack: [...opStack],
          output: [...output],
          pushed: tok.value,
          popped: []
        });
      } else if (tok.kind === 'close') {
        while (opStack.length > 0 && !isOpenBracket(opStack[opStack.length - 1])) {
          const op = opStack.pop();
          output.push(op);
          popped.push(op);
        }
        const matchedOpen = opStack.pop();
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'close',
          action:
            popped.length > 0
              ? `Pop ${popped.join(', ')} to buffer, then discard '${matchedOpen}'`
              : `Discard matching '${matchedOpen}'`,
          stack: [...opStack],
          output: [...output],
          pushed: null,
          popped
        });
      } else if (tok.kind === 'operator') {
        const currInfo = getOperatorInfo(tok.value, options);
        // Inverted tie-breaker after reversal:
        // Left-assoc pops strictly greater (>); Right-assoc pops greater-or-equal (>=).
        while (opStack.length > 0) {
          const top = opStack[opStack.length - 1];
          if (!isOperator(top)) break;
          const topInfo = getOperatorInfo(top, options);
          const shouldPop =
            currInfo.associativity === 'left'
              ? topInfo.precedence > currInfo.precedence
              : topInfo.precedence >= currInfo.precedence;
          if (!shouldPop) break;
          opStack.pop();
          output.push(top);
          popped.push(top);
        }
        opStack.push(tok.value);
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'operator',
          action:
            popped.length > 0
              ? `Pop ${popped.join(', ')} (strictly higher prec for left-assoc), push '${tok.value}'`
              : `Push operator '${tok.value}' onto stack`,
          stack: [...opStack],
          output: [...output],
          pushed: tok.value,
          popped
        });
      }
    }

    const flushed = [];
    while (opStack.length > 0) {
      const op = opStack.pop();
      output.push(op);
      flushed.push(op);
    }

    if (flushed.length > 0) {
      steps.push({
        step: steps.length + 1,
        tokenIndex: -1,
        token: 'FLUSH',
        tokenKind: 'end',
        action: `Flush remaining operators: ${flushed.join(', ')}`,
        stack: [],
        output: [...output],
        pushed: null,
        popped: flushed
      });
    }

    const finalPrefix = [...output].reverse();
    steps.push({
      step: steps.length + 1,
      tokenIndex: -1,
      token: 'REVERSE',
      tokenKind: 'end',
      action: `Reverse buffer [${output.join(' ')}] → Prefix: ${finalPrefix.join(' ')}`,
      stack: [],
      output: finalPrefix,
      pushed: null,
      popped: []
    });

    return {
      algorithm: 'Reverse-Infix → Modified Postfix → Reverse',
      direction: 'Reversed Infix (Right → Left of original)',
      stackTitle: 'Operator Stack',
      outputTitle: 'Reversed Buffer / Final Prefix',
      reversedInfix: reversedTokens.map((t) => t.value),
      steps
    };
  }

  /**
   * Trace: Postfix -> Infix (Left-to-Right Expression Stack)
   */
  function tracePostfixToInfix(tokens, options = {}) {
    const steps = [];
    const stack = [];

    for (let i = 0; i < tokens.length; i += 1) {
      const tok = tokens[i];
      if (tok.kind === 'operand') {
        stack.push({
          node: { type: 'operand', value: tok.value },
          text: tok.value
        });
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'operand',
          action: `Push operand '${tok.value}' onto expression stack`,
          stack: stack.map((item) => item.text),
          output: stack.length === 1 ? [stack[0].text] : [],
          pushed: tok.value,
          popped: []
        });
      } else if (tok.kind === 'operator') {
        const right = stack.pop();
        const left = stack.pop();
        const node = { type: 'op', op: tok.value, left: left.node, right: right.node };
        const combinedText = formatTokens(astToInfixTokens(node, options, false));
        stack.push({ node, text: combinedText });

        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'operator',
          action: `Pop right '${right.text}' & left '${left.text}' → combine as '${combinedText}'`,
          stack: stack.map((item) => item.text),
          output: [combinedText],
          pushed: combinedText,
          popped: [right.text, left.text]
        });
      }
    }

    return {
      algorithm: 'Left-to-Right Expression Stack',
      direction: 'Left → Right',
      stackTitle: 'Expression Stack',
      outputTitle: 'Latest Sub-Expression',
      steps
    };
  }

  /**
   * Trace: Postfix -> Prefix (Left-to-Right Stack)
   */
  function tracePostfixToPrefix(tokens) {
    const steps = [];
    const stack = [];

    for (let i = 0; i < tokens.length; i += 1) {
      const tok = tokens[i];
      if (tok.kind === 'operand') {
        stack.push(tok.value);
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'operand',
          action: `Push operand '${tok.value}' onto stack`,
          stack: [...stack],
          output: stack.length === 1 ? [stack[0]] : [],
          pushed: tok.value,
          popped: []
        });
      } else if (tok.kind === 'operator') {
        const right = stack.pop();
        const left = stack.pop();
        const combined = `${tok.value} ${left} ${right}`;
        stack.push(combined);
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'operator',
          action: `Pop right '${right}' & left '${left}' → push '${combined}'`,
          stack: [...stack],
          output: [combined],
          pushed: combined,
          popped: [right, left]
        });
      }
    }

    return {
      algorithm: 'Left-to-Right Prefix Builder Stack',
      direction: 'Left → Right',
      stackTitle: 'Prefix Stack',
      outputTitle: 'Latest Sub-Expression',
      steps
    };
  }

  /**
   * Trace: Prefix -> Infix (Right-to-Left Stack)
   */
  function tracePrefixToInfix(tokens, options = {}) {
    const steps = [];
    const stack = [];

    for (let i = tokens.length - 1; i >= 0; i -= 1) {
      const tok = tokens[i];
      if (tok.kind === 'operand') {
        stack.push({
          node: { type: 'operand', value: tok.value },
          text: tok.value
        });
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'operand',
          action: `Scan right-to-left: push operand '${tok.value}'`,
          stack: stack.map((item) => item.text),
          output: stack.length === 1 ? [stack[0].text] : [],
          pushed: tok.value,
          popped: []
        });
      } else if (tok.kind === 'operator') {
        const left = stack.pop();
        const right = stack.pop();
        const node = { type: 'op', op: tok.value, left: left.node, right: right.node };
        const combinedText = formatTokens(astToInfixTokens(node, options, false));
        stack.push({ node, text: combinedText });
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'operator',
          action: `Pop left '${left.text}' & right '${right.text}' → combine as '${combinedText}'`,
          stack: stack.map((item) => item.text),
          output: [combinedText],
          pushed: combinedText,
          popped: [left.text, right.text]
        });
      }
    }

    return {
      algorithm: 'Right-to-Left Expression Stack',
      direction: 'Right → Left',
      stackTitle: 'Expression Stack',
      outputTitle: 'Latest Sub-Expression',
      steps
    };
  }

  /**
   * Trace: Prefix -> Postfix (Right-to-Left Stack)
   */
  function tracePrefixToPostfix(tokens) {
    const steps = [];
    const stack = [];

    for (let i = tokens.length - 1; i >= 0; i -= 1) {
      const tok = tokens[i];
      if (tok.kind === 'operand') {
        stack.push(tok.value);
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'operand',
          action: `Scan right-to-left: push operand '${tok.value}'`,
          stack: [...stack],
          output: stack.length === 1 ? [stack[0]] : [],
          pushed: tok.value,
          popped: []
        });
      } else if (tok.kind === 'operator') {
        const left = stack.pop();
        const right = stack.pop();
        const combined = `${left} ${right} ${tok.value}`;
        stack.push(combined);
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok.value,
          tokenKind: 'operator',
          action: `Pop left '${left}' & right '${right}' → push '${combined}'`,
          stack: [...stack],
          output: [combined],
          pushed: combined,
          popped: [left, right]
        });
      }
    }

    return {
      algorithm: 'Right-to-Left Postfix Builder Stack',
      direction: 'Right → Left',
      stackTitle: 'Postfix Stack',
      outputTitle: 'Latest Sub-Expression',
      steps
    };
  }

  /**
   * Extract unique symbolic variable names from an AST in appearance order.
   */
  function extractVariables(ast) {
    const vars = [];
    const seen = new Set();
    function walk(node) {
      if (!node) return;
      if (node.type === 'operand') {
        if (!isNumericToken(node.value) && !seen.has(node.value)) {
          seen.add(node.value);
          vars.push(node.value);
        }
        return;
      }
      walk(node.left);
      walk(node.right);
    }
    walk(ast);
    return vars;
  }

  /**
   * Evaluate a Postfix token list with optional variable bindings,
   * returning the final numeric value and a step-by-step evaluation trace.
   */
  function evaluatePostfix(postfixTokens, variables = {}) {
    const stack = [];
    const steps = [];

    for (let i = 0; i < postfixTokens.length; i += 1) {
      const tok = postfixTokens[i];
      if (!isOperator(tok)) {
        let num;
        let label = tok;
        if (isNumericToken(tok)) {
          num = Number(tok);
        } else if (
          Object.prototype.hasOwnProperty.call(variables, tok) &&
          variables[tok] !== '' &&
          variables[tok] !== null &&
          variables[tok] !== undefined
        ) {
          num = Number(variables[tok]);
          label = `${tok} (${num})`;
        } else {
          return {
            ready: false,
            missingVariable: tok,
            value: null,
            error: null,
            steps
          };
        }

        if (!Number.isFinite(num)) {
          return {
            ready: false,
            missingVariable: tok,
            value: null,
            error: `Invalid numeric value for '${tok}'.`,
            steps
          };
        }

        stack.push(num);
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok,
          tokenKind: 'operand',
          action: `Push ${label}`,
          stack: stack.map(formatNumber),
          output: [formatNumber(num)],
          pushed: formatNumber(num),
          popped: []
        });
      } else {
        const b = stack.pop();
        const a = stack.pop();
        let res;
        switch (tok) {
          case '+':
            res = a + b;
            break;
          case '-':
            res = a - b;
            break;
          case '*':
            res = a * b;
            break;
          case '/':
            if (b === 0) {
              return {
                ready: true,
                value: null,
                error: 'Division by zero is undefined.',
                steps
              };
            }
            res = a / b;
            break;
          case '%':
            if (b === 0) {
              return {
                ready: true,
                value: null,
                error: 'Modulo by zero is undefined.',
                steps
              };
            }
            res = a % b;
            break;
          case '^':
          case '$':
            res = Math.pow(a, b);
            break;
          default:
            return { ready: false, value: null, error: `Unsupported operator '${tok}'.`, steps };
        }

        if (!Number.isFinite(res)) {
          return {
            ready: true,
            value: null,
            error: 'Result overflows finite floating-point range.',
            steps
          };
        }

        stack.push(res);
        const aStr = formatNumber(a);
        const bStr = formatNumber(b);
        const rStr = formatNumber(res);
        steps.push({
          step: steps.length + 1,
          tokenIndex: i,
          token: tok,
          tokenKind: 'operator',
          action: `Evaluate ${aStr} ${tok} ${bStr} = ${rStr}`,
          stack: stack.map(formatNumber),
          output: [rStr],
          pushed: rStr,
          popped: [bStr, aStr]
        });
      }
    }

    return {
      ready: true,
      value: stack[0],
      formattedValue: formatNumber(stack[0]),
      error: null,
      steps
    };
  }

  function formatNumber(n) {
    if (typeof n !== 'number' || !Number.isFinite(n)) return String(n);
    if (Object.is(n, -0)) return '0';
    // Avoid floating point noise like 0.1 + 0.2 = 0.30000000000000004
    const rounded = Number(n.toPrecision(12));
    return String(rounded);
  }

  /**
   * Main entry point: parses input in declared or auto-detected notation,
   * returns AST, all 3 outputs, token lists, variables, and trace builders.
   */
  function convert(input, options = {}) {
    const requestedNotation = options.notation || 'auto';
    const detectedNotation =
      requestedNotation === 'auto'
        ? detectNotation(input, options)
        : requestedNotation;

    let inputTokens;
    let ast;

    if (detectedNotation === 'infix') {
      inputTokens = tokenizeInfix(input, options);
      ast = parseInfixToAst(inputTokens, options);
    } else if (detectedNotation === 'postfix') {
      inputTokens = tokenizeFlat(input, options);
      ast = parsePostfixToAst(inputTokens);
    } else if (detectedNotation === 'prefix') {
      inputTokens = tokenizeFlat(input, options);
      ast = parsePrefixToAst(inputTokens);
    } else {
      throw new Error(`Unknown notation: ${detectedNotation}`);
    }

    const infixMinimalTokens = astToInfixTokens(ast, options, false);
    const infixFullTokens = astToInfixTokens(ast, options, true);
    const postfixTokens = astToPostfixTokens(ast);
    const prefixTokens = astToPrefixTokens(ast);
    const variables = extractVariables(ast);

    return {
      sourceNotation: detectedNotation,
      requestedNotation,
      inputTokens,
      ast,
      variables,
      outputs: {
        infix: {
          tokens: infixMinimalTokens,
          formatted: formatTokens(infixMinimalTokens, false),
          compact: formatTokens(infixMinimalTokens, true),
          canCompact: canBeCompact(infixMinimalTokens),
          fullTokens: infixFullTokens,
          fullFormatted: formatTokens(infixFullTokens, false),
          fullCompact: formatTokens(infixFullTokens, true)
        },
        postfix: {
          tokens: postfixTokens,
          formatted: formatTokens(postfixTokens, false),
          compact: formatTokens(postfixTokens, true),
          canCompact: canBeCompact(postfixTokens)
        },
        prefix: {
          tokens: prefixTokens,
          formatted: formatTokens(prefixTokens, false),
          compact: formatTokens(prefixTokens, true),
          canCompact: canBeCompact(prefixTokens)
        }
      },
      getTrace(traceKind) {
        const toTokenObjs = (arr) =>
          arr.map((v, idx) => ({
            value: v,
            kind: isOpenBracket(v)
              ? 'open'
              : isCloseBracket(v)
              ? 'close'
              : isOperator(v)
              ? 'operator'
              : 'operand',
            start: idx,
            end: idx + 1
          }));

        switch (traceKind) {
          case 'infix-to-postfix':
            return traceInfixToPostfix(
              detectedNotation === 'infix'
                ? inputTokens
                : toTokenObjs(infixMinimalTokens),
              options
            );
          case 'infix-to-prefix':
            return traceInfixToPrefix(
              detectedNotation === 'infix'
                ? inputTokens
                : toTokenObjs(infixMinimalTokens),
              options
            );
          case 'postfix-to-infix':
            return tracePostfixToInfix(
              detectedNotation === 'postfix'
                ? inputTokens
                : toTokenObjs(postfixTokens),
              options
            );
          case 'postfix-to-prefix':
            return tracePostfixToPrefix(
              detectedNotation === 'postfix'
                ? inputTokens
                : toTokenObjs(postfixTokens)
            );
          case 'prefix-to-infix':
            return tracePrefixToInfix(
              detectedNotation === 'prefix'
                ? inputTokens
                : toTokenObjs(prefixTokens),
              options
            );
          case 'prefix-to-postfix':
            return tracePrefixToPostfix(
              detectedNotation === 'prefix'
                ? inputTokens
                : toTokenObjs(prefixTokens)
            );
          default:
            return null;
        }
      },
      evaluate(varsMap) {
        return evaluatePostfix(postfixTokens, varsMap);
      }
    };
  }

  return {
    OPERATOR_META,
    isOperator,
    isNumericToken,
    isOperand,
    tokenizeInfix,
    tokenizeFlat,
    detectNotation,
    parseInfixToAst,
    parsePostfixToAst,
    parsePrefixToAst,
    astToInfixTokens,
    astToPostfixTokens,
    astToPrefixTokens,
    formatTokens,
    extractVariables,
    evaluatePostfix,
    convert
  };
});
