const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../src/engine.js');
const Tree = require('../src/tree.js');
const Bst = require('../src/bst.js');

test('Infix to Postfix and Prefix - classic textbook expressions', () => {
  const res1 = Engine.convert('(A + B) * (C - D)', { notation: 'infix' });
  assert.equal(res1.outputs.postfix.formatted, 'A B + C D - *');
  assert.equal(res1.outputs.postfix.compact, 'AB+CD-*');
  assert.equal(res1.outputs.prefix.formatted, '* + A B - C D');
  assert.equal(res1.outputs.prefix.compact, '*+AB-CD');
  assert.equal(res1.outputs.infix.formatted, '(A + B) * (C - D)');

  const res2 = Engine.convert('A+B*C-D/E', { notation: 'infix' });
  assert.equal(res2.outputs.postfix.compact, 'ABC*+DE/-');
  assert.equal(res2.outputs.prefix.compact, '-+A*BC/DE');
});

test('Right-associative exponentiation A^B^C vs left-associative option', () => {
  const rightAssoc = Engine.convert('A^B^C', { notation: 'infix', caretAssoc: 'right' });
  assert.equal(rightAssoc.outputs.postfix.compact, 'ABC^^');
  assert.equal(rightAssoc.outputs.prefix.compact, '^A^BC');
  assert.equal(rightAssoc.outputs.infix.compact, 'A^B^C');

  const leftAssoc = Engine.convert('A^B^C', { notation: 'infix', caretAssoc: 'left' });
  assert.equal(leftAssoc.outputs.postfix.compact, 'AB^C^');
  assert.equal(leftAssoc.outputs.prefix.compact, '^^ABC');
});

test('Minimal parenthesization preserves exact AST round-trip for left/right associativity', () => {
  // A + (B + C) has different AST than (A + B) + C
  const res = Engine.convert('A B C + +', { notation: 'postfix' });
  assert.equal(res.outputs.infix.formatted, 'A + (B + C)');
  const roundTrip = Engine.convert(res.outputs.infix.formatted, { notation: 'infix' });
  assert.equal(roundTrip.outputs.postfix.formatted, 'A B C + +');
  assert.equal(roundTrip.outputs.prefix.formatted, '+ A + B C');

  // (A ^ B) ^ C must keep parens on left under right-associativity
  const powLeft = Engine.convert('A B ^ C ^', { notation: 'postfix' });
  assert.equal(powLeft.outputs.infix.formatted, '(A ^ B) ^ C');
  const roundTripPow = Engine.convert(powLeft.outputs.infix.formatted, { notation: 'infix' });
  assert.equal(roundTripPow.outputs.postfix.formatted, 'A B ^ C ^');
});

test('All 6 conversion directions agree with AST outputs and trace final results', () => {
  const cases = [
    '(A + B) * C - D / E ^ F',
    '((alpha + 12) * beta) / (gamma - 3.5)',
    'A - B - C',
    'A ^ B ^ C',
    '10 + 20 * 30 - 40 / 5'
  ];

  for (const expr of cases) {
    const fromInfix = Engine.convert(expr, { notation: 'infix' });
    const postStr = fromInfix.outputs.postfix.formatted;
    const preStr = fromInfix.outputs.prefix.formatted;

    const fromPostfix = Engine.convert(postStr, { notation: 'postfix' });
    const fromPrefix = Engine.convert(preStr, { notation: 'prefix' });

    assert.equal(fromPostfix.outputs.infix.formatted, fromInfix.outputs.infix.formatted);
    assert.equal(fromPostfix.outputs.prefix.formatted, preStr);
    assert.equal(fromPrefix.outputs.infix.formatted, fromInfix.outputs.infix.formatted);
    assert.equal(fromPrefix.outputs.postfix.formatted, postStr);

    // Verify all 6 traces produce final step matching canonical outputs
    const tInPost = fromInfix.getTrace('infix-to-postfix');
    assert.equal(tInPost.steps.at(-1).output.join(' '), postStr);

    const tInPre = fromInfix.getTrace('infix-to-prefix');
    assert.equal(tInPre.steps.at(-1).output.join(' '), preStr);

    const tPostIn = fromPostfix.getTrace('postfix-to-infix');
    assert.equal(tPostIn.steps.at(-1).stack[0], fromInfix.outputs.infix.formatted);

    const tPostPre = fromPostfix.getTrace('postfix-to-prefix');
    assert.equal(tPostPre.steps.at(-1).stack[0], preStr);

    const tPreIn = fromPrefix.getTrace('prefix-to-infix');
    assert.equal(tPreIn.steps.at(-1).stack[0], fromInfix.outputs.infix.formatted);

    const tPrePost = fromPrefix.getTrace('prefix-to-postfix');
    assert.equal(tPrePost.steps.at(-1).stack[0], postStr);
  }
});

test('Auto-detection accurately identifies Infix, Postfix, and Prefix', () => {
  assert.equal(Engine.convert('A+B*C').sourceNotation, 'infix');
  assert.equal(Engine.convert('(A + B) * C').sourceNotation, 'infix');
  assert.equal(Engine.convert('-5 + 3').sourceNotation, 'infix');
  assert.equal(Engine.convert('-5+3').sourceNotation, 'infix');
  assert.equal(Engine.convert('AB+C*').sourceNotation, 'postfix');
  assert.equal(Engine.convert('12 3 + 4 *').sourceNotation, 'postfix');
  assert.equal(Engine.convert('-5 3 +').sourceNotation, 'postfix');
  assert.equal(Engine.convert('*+ABC').sourceNotation, 'prefix');
  assert.equal(Engine.convert('- + 10 20 5').sourceNotation, 'prefix');
  assert.equal(Engine.convert('- 5 3').sourceNotation, 'prefix');
});

test('Bracket variants [], {} and nested validation', () => {
  const res = Engine.convert('{[A + B] * (C - D)}');
  assert.equal(res.outputs.postfix.compact, 'AB+CD-*');
  assert.throws(() => Engine.convert('(A + B]'), /Mismatched bracket/);
  assert.throws(() => Engine.convert('((A + B)'), /Unclosed bracket/);
  assert.throws(() => Engine.convert('A + B)'), /Unmatched closing bracket/);
  assert.throws(() => Engine.convert('()'), /Empty brackets/);
});

test('Numeric evaluation and variable binding', () => {
  const numRes = Engine.convert('(10 + 5) * 2 - 4 ^ 2 / 2');
  const eval1 = numRes.evaluate();
  assert.equal(eval1.ready, true);
  assert.equal(eval1.value, 22);

  const negRes = Engine.convert('(-5 + 8) * 3');
  assert.equal(negRes.evaluate().value, 9);

  const varRes = Engine.convert('A + B * C');
  assert.deepEqual(varRes.variables, ['A', 'B', 'C']);
  assert.equal(varRes.evaluate({ A: 2 }).ready, false);
  assert.equal(varRes.evaluate({ A: 2, B: 3, C: 4 }).value, 14);

  const divZero = Engine.convert('10 / (5 - 5)');
  assert.match(divZero.evaluate().error, /Division by zero/);
});

test('Syntax error diagnostics for invalid inputs', () => {
  assert.throws(() => Engine.convert(''), /Enter an expression/);
  assert.throws(() => Engine.convert('A +', { notation: 'infix' }), /ends unexpectedly/);
  assert.throws(() => Engine.convert('A B', { notation: 'infix' }), /Expected an operator/);
  assert.throws(() => Engine.convert('A +', { notation: 'postfix' }), /needs 2 operands/);
  assert.throws(() => Engine.convert('A B C +', { notation: 'postfix' }), /2 values remain/);
  assert.throws(() => Engine.convert('+ A', { notation: 'prefix' }), /needs 2 operands/);
  assert.throws(() => Engine.convert('A B +', { notation: 'infix' }), /Expected an operator/);
});

test('AST Tree layout generates accurate traversals and non-overlapping coordinates', () => {
  const res = Engine.convert('(A + B) * (C - D)');
  const layout = Tree.buildLayout(res.ast);

  assert.equal(layout.nodes.length, 7);
  assert.equal(layout.edges.length, 6);

  const labels = (ids) => ids.map((id) => layout.nodeById.get(id).label).join(' ');
  assert.equal(labels(layout.traversals.preorder), '* + A B - C D');
  assert.equal(labels(layout.traversals.inorder), 'A + B * C - D');
  assert.equal(labels(layout.traversals.postorder), 'A B + C D - *');

  // Verify unique (x, y) positions for all nodes
  const coords = new Set(layout.nodes.map((n) => `${n.x},${n.y}`));
  assert.equal(coords.size, layout.nodes.length);
});

test('BST build, traversals (In-order, Pre-order, Post-order), insert, delete, and search', () => {
  const parsed = Bst.parseValues('50, 30, 70, 20, 40, 60, 80');
  assert.equal(parsed.isNumeric, true);
  const { root } = Bst.buildFromList(parsed.values, parsed.isNumeric);

  assert.deepEqual(Bst.traverseInorder(root), [20, 30, 40, 50, 60, 70, 80]);
  assert.deepEqual(Bst.traversePreorder(root), [50, 30, 20, 40, 70, 60, 80]);
  assert.deepEqual(Bst.traversePostorder(root), [20, 40, 30, 60, 80, 70, 50]);

  const stats = Bst.getStats(root);
  assert.deepEqual(stats, { count: 7, height: 3, min: 20, max: 80 });

  // Delete node with 2 children (50 -> replaced by inorder successor 60)
  const delRes = Bst.deleteNode(root, 50, true);
  assert.equal(delRes.deleted, true);
  assert.deepEqual(Bst.traverseInorder(delRes.node), [20, 30, 40, 60, 70, 80]);
  assert.equal(delRes.node.value, 60);

  // Search path
  const layout = Bst.buildLayout(root);
  const found = Bst.searchValue(layout, 40, true);
  assert.equal(found.found, true);
  assert.deepEqual(
    found.pathIds.map((id) => layout.nodeById.get(id).value),
    [50, 30, 40]
  );

  // String BST
  const strParsed = Bst.parseValues('M B Q A D Z');
  assert.equal(strParsed.isNumeric, false);
  const { root: strRoot } = Bst.buildFromList(strParsed.values, false);
  assert.deepEqual(Bst.traverseInorder(strRoot), ['A', 'B', 'D', 'M', 'Q', 'Z']);
});

test('General Binary Tree level-order build with nulls and traversals', () => {
  const tokens = Bst.parseLevelOrder('1, 2, 3, 4, 5, null, 7');
  assert.deepEqual(tokens, ['1', '2', '3', '4', '5', null, '7']);
  const root = Bst.buildFromLevelOrder(tokens);
  assert.deepEqual(Bst.traverseInorder(root), ['4', '2', '5', '1', '3', '7']);
  assert.deepEqual(Bst.traversePreorder(root), ['1', '2', '4', '5', '3', '7']);
  assert.deepEqual(Bst.traversePostorder(root), ['4', '5', '2', '7', '3', '1']);
});
