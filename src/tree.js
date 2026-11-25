/**
 * Interactive SVG Expression Tree (AST) Layout & Renderer
 * Uses in-order horizontal positioning so branches never cross and nodes never overlap.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./engine.js'));
  } else {
    root.ExprTree = factory(root.ExprEngine);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Engine) {
  'use strict';

  function buildLayout(ast, options = {}) {
    const nodes = [];
    const edges = [];
    const nodeById = new Map();
    let nextId = 0;
    let inOrderCursor = 0;
    let maxDepth = 0;

    function visit(node, depth, parentId, side) {
      const id = `n${nextId++}`;
      maxDepth = Math.max(maxDepth, depth);

      const entry = {
        id,
        type: node.type,
        label: node.type === 'op' ? node.op : node.value,
        depth,
        parentId,
        side,
        xIndex: 0,
        leftId: null,
        rightId: null,
        subtreeIds: [],
        infix: Engine.formatTokens(Engine.astToInfixTokens(node, options, false)),
        postfix: Engine.formatTokens(Engine.astToPostfixTokens(node)),
        prefix: Engine.formatTokens(Engine.astToPrefixTokens(node))
      };

      nodeById.set(id, entry);

      if (node.type === 'op') {
        const leftEntry = visit(node.left, depth + 1, id, 'left');
        entry.leftId = leftEntry.id;

        entry.xIndex = inOrderCursor++;
        nodes.push(entry);

        const rightEntry = visit(node.right, depth + 1, id, 'right');
        entry.rightId = rightEntry.id;

        entry.subtreeIds = [id, ...leftEntry.subtreeIds, ...rightEntry.subtreeIds];
        edges.push({ from: id, to: leftEntry.id, side: 'L' });
        edges.push({ from: id, to: rightEntry.id, side: 'R' });
      } else {
        entry.xIndex = inOrderCursor++;
        entry.subtreeIds = [id];
        nodes.push(entry);
      }

      return entry;
    }

    const rootNode = visit(ast, 0, null, null);

    // Compute traversal orders (node IDs in visit order)
    const preOrder = [];
    const inOrder = [];
    const postOrder = [];

    function walkPre(id) {
      if (!id) return;
      const n = nodeById.get(id);
      preOrder.push(id);
      walkPre(n.leftId);
      walkPre(n.rightId);
    }

    function walkIn(id) {
      if (!id) return;
      const n = nodeById.get(id);
      walkIn(n.leftId);
      inOrder.push(id);
      walkIn(n.rightId);
    }

    function walkPost(id) {
      if (!id) return;
      const n = nodeById.get(id);
      walkPost(n.leftId);
      walkPost(n.rightId);
      postOrder.push(id);
    }

    walkPre(rootNode.id);
    walkIn(rootNode.id);
    walkPost(rootNode.id);

    // Compute pixel coordinates
    const totalCols = Math.max(1, inOrderCursor);
    const colGap = totalCols > 14 ? 52 : totalCols > 9 ? 62 : 74;
    const rowGap = 78;
    const padX = 46;
    const padY = 44;

    const width = Math.max(360, (totalCols - 1) * colGap + padX * 2);
    const height = Math.max(190, maxDepth * rowGap + padY * 2);

    // Center tree horizontally if width > natural span
    const naturalSpan = (totalCols - 1) * colGap;
    const startX = (width - naturalSpan) / 2;

    for (const n of nodes) {
      n.x = startX + n.xIndex * colGap;
      n.y = padY + n.depth * rowGap;
    }

    return {
      rootId: rootNode.id,
      nodes,
      edges,
      nodeById,
      width,
      height,
      traversals: {
        preorder: preOrder,
        inorder: inOrder,
        postorder: postOrder
      }
    };
  }

  function createSvgEl(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  function renderSvg(container, layout, state = {}, onNodeClick) {
    container.innerHTML = '';
    if (!layout) return;

    const svg = createSvgEl('svg', {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      width: layout.width,
      height: layout.height,
      class: 'ast-svg',
      role: 'img',
      'aria-label': 'Expression binary syntax tree'
    });

    const traversalList = state.traversalMode ? layout.traversals[state.traversalMode] || [] : [];
    const activeCount =
      typeof state.traversalStep === 'number' && state.traversalStep >= 0
        ? state.traversalStep
        : traversalList.length;

    const visitOrderMap = new Map();
    const visitedSet = new Set();
    let currentNodeId = null;

    if (state.traversalMode && traversalList.length > 0) {
      const limit = Math.min(activeCount, traversalList.length);
      for (let i = 0; i < limit; i += 1) {
        const nid = traversalList[i];
        visitOrderMap.set(nid, i + 1);
        visitedSet.add(nid);
      }
      if (limit > 0 && limit <= traversalList.length && state.isStepping) {
        currentNodeId = traversalList[limit - 1];
      }
    }

    const selectedSubtree = new Set();
    if (state.selectedNodeId && layout.nodeById.has(state.selectedNodeId)) {
      for (const sid of layout.nodeById.get(state.selectedNodeId).subtreeIds) {
        selectedSubtree.add(sid);
      }
    }

    // Render edges first
    const edgeGroup = createSvgEl('g', { class: 'ast-edges' });
    for (const edge of layout.edges) {
      const from = layout.nodeById.get(edge.from);
      const to = layout.nodeById.get(edge.to);
      const midY = (from.y + to.y) / 2;
      const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
      const isSelected = selectedSubtree.has(edge.from) && selectedSubtree.has(edge.to);
      const path = createSvgEl('path', {
        d,
        class: `ast-edge${isSelected ? ' is-highlighted' : ''}`
      });
      edgeGroup.appendChild(path);
    }
    svg.appendChild(edgeGroup);

    // Render nodes
    const nodeGroup = createSvgEl('g', { class: 'ast-nodes' });
    for (const n of layout.nodes) {
      const isOp = n.type === 'op';
      const isCurrent = currentNodeId === n.id;
      const isVisited = visitedSet.has(n.id);
      const isSelected = state.selectedNodeId === n.id;
      const isInSubtree = selectedSubtree.has(n.id);

      const classes = ['ast-node', isOp ? 'is-op' : 'is-operand'];
      if (isCurrent) classes.push('is-current');
      else if (isVisited && state.isStepping) classes.push('is-visited');
      if (isSelected) classes.push('is-selected');
      else if (isInSubtree) classes.push('is-subtree');

      const g = createSvgEl('g', {
        class: classes.join(' '),
        transform: `translate(${n.x}, ${n.y})`,
        tabindex: '0',
        role: 'button',
        'aria-label': `${isOp ? 'Operator' : 'Operand'} ${n.label}`
      });

      const labelWidth = Math.max(38, n.label.length * 10 + 18);
      if (isOp) {
        const circle = createSvgEl('circle', {
          r: 20,
          cx: 0,
          cy: 0,
          class: 'ast-node-shape'
        });
        g.appendChild(circle);
      } else {
        const rect = createSvgEl('rect', {
          x: -labelWidth / 2,
          y: -17,
          width: labelWidth,
          height: 34,
          rx: 10,
          class: 'ast-node-shape'
        });
        g.appendChild(rect);
      }

      const text = createSvgEl('text', {
        x: 0,
        y: 1,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        class: 'ast-node-label'
      });
      text.textContent = n.label;
      g.appendChild(text);

      // Traversal visit badge
      if (visitOrderMap.has(n.id)) {
        const orderNum = visitOrderMap.get(n.id);
        const bx = isOp ? 17 : labelWidth / 2 - 2;
        const by = -17;
        const badge = createSvgEl('circle', {
          cx: bx,
          cy: by,
          r: 9,
          class: `ast-visit-badge${isCurrent ? ' is-current' : ''}`
        });
        const badgeText = createSvgEl('text', {
          x: bx,
          y: by + 0.5,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          class: 'ast-visit-text'
        });
        badgeText.textContent = String(orderNum);
        g.appendChild(badge);
        g.appendChild(badgeText);
      }

      g.addEventListener('click', () => {
        if (onNodeClick) onNodeClick(n.id);
      });
      g.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          if (onNodeClick) onNodeClick(n.id);
        }
      });

      nodeGroup.appendChild(g);
    }

    svg.appendChild(nodeGroup);
    container.appendChild(svg);
  }

  return {
    buildLayout,
    renderSvg
  };
});
