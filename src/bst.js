/**
 * Binary Search Tree (BST) Engine, Traversals, and Interactive SVG Renderer
 * Works in Browser globals (`window.BstEngine`) and Node.js (`module.exports`).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BstEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function isNumeric(str) {
    return /^-?\d+(?:\.\d+)?$/.test(String(str).trim());
  }

  function parseValues(input) {
    const raw = (input || '').trim();
    if (!raw) return { values: [], isNumeric: true };

    const tokens = raw
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const allNumeric = tokens.length > 0 && tokens.every(isNumeric);
    const values = allNumeric ? tokens.map((t) => Number(t)) : tokens;
    return { values, isNumeric: allNumeric };
  }

  function compareValues(a, b, numericMode) {
    if (numericMode) {
      return a - b;
    }
    const sa = String(a);
    const sb = String(b);
    if (sa < sb) return -1;
    if (sa > sb) return 1;
    return 0;
  }

  function insertNode(root, value, numericMode) {
    if (!root) {
      return {
        node: { value, left: null, right: null },
        inserted: true
      };
    }
    const cmp = compareValues(value, root.value, numericMode);
    if (cmp === 0) {
      return { node: root, inserted: false };
    }
    if (cmp < 0) {
      const res = insertNode(root.left, value, numericMode);
      return {
        node: { value: root.value, left: res.node, right: root.right },
        inserted: res.inserted
      };
    }
    const res = insertNode(root.right, value, numericMode);
    return {
      node: { value: root.value, left: root.left, right: res.node },
      inserted: res.inserted
    };
  }

  function findMinNode(node) {
    let curr = node;
    while (curr && curr.left) curr = curr.left;
    return curr;
  }

  function deleteNode(root, value, numericMode) {
    if (!root) return { node: null, deleted: false };
    const cmp = compareValues(value, root.value, numericMode);
    if (cmp < 0) {
      const res = deleteNode(root.left, value, numericMode);
      return {
        node: { value: root.value, left: res.node, right: root.right },
        deleted: res.deleted
      };
    }
    if (cmp > 0) {
      const res = deleteNode(root.right, value, numericMode);
      return {
        node: { value: root.value, left: root.left, right: res.node },
        deleted: res.deleted
      };
    }

    // Found node to delete
    if (!root.left && !root.right) {
      return { node: null, deleted: true };
    }
    if (!root.left) {
      return { node: root.right, deleted: true };
    }
    if (!root.right) {
      return { node: root.left, deleted: true };
    }

    // Two children: replace with inorder successor (min of right subtree)
    const successor = findMinNode(root.right);
    const res = deleteNode(root.right, successor.value, numericMode);
    return {
      node: { value: successor.value, left: root.left, right: res.node },
      deleted: true
    };
  }

  function parseLevelOrder(input) {
    const raw = (input || '').trim();
    if (!raw) return [];
    return raw
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (/^(null|none|_|-)$/i.test(t) ? null : t));
  }

  function buildFromLevelOrder(tokens) {
    if (!tokens || tokens.length === 0 || tokens[0] === null) return null;
    const root = { value: tokens[0], left: null, right: null };
    const queue = [root];
    let i = 1;

    while (queue.length > 0 && i < tokens.length) {
      const curr = queue.shift();
      if (i < tokens.length) {
        const leftVal = tokens[i++];
        if (leftVal !== null) {
          curr.left = { value: leftVal, left: null, right: null };
          queue.push(curr.left);
        }
      }
      if (i < tokens.length) {
        const rightVal = tokens[i++];
        if (rightVal !== null) {
          curr.right = { value: rightVal, left: null, right: null };
          queue.push(curr.right);
        }
      }
    }
    return root;
  }

  function buildFromList(values, numericMode) {
    let root = null;
    const duplicates = [];
    for (const val of values) {
      const res = insertNode(root, val, numericMode);
      root = res.node;
      if (!res.inserted) duplicates.push(val);
    }
    return { root, duplicates };
  }

  function traverseInorder(node, out = []) {
    if (!node) return out;
    traverseInorder(node.left, out);
    out.push(node.value);
    traverseInorder(node.right, out);
    return out;
  }

  function traversePreorder(node, out = []) {
    if (!node) return out;
    out.push(node.value);
    traversePreorder(node.left, out);
    traversePreorder(node.right, out);
    return out;
  }

  function traversePostorder(node, out = []) {
    if (!node) return out;
    traversePostorder(node.left, out);
    traversePostorder(node.right, out);
    out.push(node.value);
    return out;
  }

  function getStats(root) {
    if (!root) {
      return { count: 0, height: 0, min: null, max: null };
    }
    let count = 0;
    function measure(node) {
      if (!node) return 0;
      count += 1;
      const lh = measure(node.left);
      const rh = measure(node.right);
      return 1 + Math.max(lh, rh);
    }
    const height = measure(root);
    let minNode = root;
    while (minNode.left) minNode = minNode.left;
    let maxNode = root;
    while (maxNode.right) maxNode = maxNode.right;

    return {
      count,
      height,
      min: minNode.value,
      max: maxNode.value
    };
  }

  function searchValue(layout, targetValue, numericMode) {
    if (!layout || !layout.rootId) return { found: false, pathIds: [] };
    const pathIds = [];
    let currId = layout.rootId;
    while (currId) {
      const node = layout.nodeById.get(currId);
      pathIds.push(currId);
      const cmp = compareValues(targetValue, node.value, numericMode);
      if (cmp === 0) {
        return { found: true, foundId: currId, pathIds };
      }
      currId = cmp < 0 ? node.leftId : node.rightId;
    }
    return { found: false, foundId: null, pathIds };
  }

  function buildLayout(root) {
    if (!root) return null;

    const nodes = [];
    const edges = [];
    const nodeById = new Map();
    let nextId = 0;
    let inOrderCursor = 0;
    let maxDepth = 0;

    function visit(node, depth, parentId) {
      if (!node) return null;
      const id = `b${nextId++}`;
      maxDepth = Math.max(maxDepth, depth);

      const entry = {
        id,
        value: node.value,
        label: String(node.value),
        depth,
        parentId,
        xIndex: 0,
        leftId: null,
        rightId: null,
        subtreeIds: [],
        inorder: traverseInorder(node, []),
        preorder: traversePreorder(node, []),
        postorder: traversePostorder(node, [])
      };

      nodeById.set(id, entry);

      const leftEntry = visit(node.left, depth + 1, id);
      if (leftEntry) {
        entry.leftId = leftEntry.id;
        edges.push({ from: id, to: leftEntry.id });
      }

      entry.xIndex = inOrderCursor++;
      nodes.push(entry);

      const rightEntry = visit(node.right, depth + 1, id);
      if (rightEntry) {
        entry.rightId = rightEntry.id;
        edges.push({ from: id, to: rightEntry.id });
      }

      entry.subtreeIds = [
        id,
        ...(leftEntry ? leftEntry.subtreeIds : []),
        ...(rightEntry ? rightEntry.subtreeIds : [])
      ];

      return entry;
    }

    const rootEntry = visit(root, 0, null);

    const inorderIds = [];
    const preorderIds = [];
    const postorderIds = [];

    function walkIn(id) {
      if (!id) return;
      const n = nodeById.get(id);
      walkIn(n.leftId);
      inorderIds.push(id);
      walkIn(n.rightId);
    }

    function walkPre(id) {
      if (!id) return;
      const n = nodeById.get(id);
      preorderIds.push(id);
      walkPre(n.leftId);
      walkPre(n.rightId);
    }

    function walkPost(id) {
      if (!id) return;
      const n = nodeById.get(id);
      walkPost(n.leftId);
      walkPost(n.rightId);
      postorderIds.push(id);
    }

    walkIn(rootEntry.id);
    walkPre(rootEntry.id);
    walkPost(rootEntry.id);

    const totalCols = Math.max(1, inOrderCursor);
    const colGap = totalCols > 14 ? 50 : totalCols > 9 ? 60 : 72;
    const rowGap = 76;
    const padX = 46;
    const padY = 44;

    const width = Math.max(360, (totalCols - 1) * colGap + padX * 2);
    const height = Math.max(190, maxDepth * rowGap + padY * 2);
    const naturalSpan = (totalCols - 1) * colGap;
    const startX = (width - naturalSpan) / 2;

    for (const n of nodes) {
      n.x = startX + n.xIndex * colGap;
      n.y = padY + n.depth * rowGap;
    }

    return {
      rootId: rootEntry.id,
      nodes,
      edges,
      nodeById,
      width,
      height,
      traversals: {
        inorder: inorderIds,
        preorder: preorderIds,
        postorder: postorderIds
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
      'aria-label': 'Binary Search Tree diagram'
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

    const searchPathSet = new Set(state.searchPathIds || []);

    const edgeGroup = createSvgEl('g', { class: 'ast-edges' });
    for (const edge of layout.edges) {
      const from = layout.nodeById.get(edge.from);
      const to = layout.nodeById.get(edge.to);
      const midY = (from.y + to.y) / 2;
      const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
      const isHighlighted =
        (selectedSubtree.has(edge.from) && selectedSubtree.has(edge.to)) ||
        (searchPathSet.has(edge.from) && searchPathSet.has(edge.to));
      const path = createSvgEl('path', {
        d,
        class: `ast-edge${isHighlighted ? ' is-highlighted' : ''}`
      });
      edgeGroup.appendChild(path);
    }
    svg.appendChild(edgeGroup);

    const nodeGroup = createSvgEl('g', { class: 'ast-nodes' });
    for (const n of layout.nodes) {
      const isCurrent = currentNodeId === n.id || state.searchFoundId === n.id;
      const isVisited = visitedSet.has(n.id) || searchPathSet.has(n.id);
      const isSelected = state.selectedNodeId === n.id;
      const isInSubtree = selectedSubtree.has(n.id);
      const isRoot = n.id === layout.rootId;

      const classes = ['ast-node', isRoot ? 'is-op' : 'is-operand'];
      if (isCurrent) classes.push('is-current');
      else if (isVisited && (state.isStepping || searchPathSet.has(n.id))) classes.push('is-visited');
      if (isSelected) classes.push('is-selected');
      else if (isInSubtree) classes.push('is-subtree');

      const g = createSvgEl('g', {
        class: classes.join(' '),
        transform: `translate(${n.x}, ${n.y})`,
        tabindex: '0',
        role: 'button',
        'aria-label': `BST node ${n.label}`
      });

      const r = Math.max(20, n.label.length * 5 + 14);
      const circle = createSvgEl('circle', {
        r,
        cx: 0,
        cy: 0,
        class: 'ast-node-shape'
      });
      g.appendChild(circle);

      const text = createSvgEl('text', {
        x: 0,
        y: 1,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        class: 'ast-node-label'
      });
      text.textContent = n.label;
      g.appendChild(text);

      if (visitOrderMap.has(n.id)) {
        const orderNum = visitOrderMap.get(n.id);
        const bx = r * 0.78;
        const by = -r * 0.78;
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
    parseValues,
    parseLevelOrder,
    buildFromLevelOrder,
    insertNode,
    deleteNode,
    buildFromList,
    traverseInorder,
    traversePreorder,
    traversePostorder,
    getStats,
    searchValue,
    buildLayout,
    renderSvg
  };
});
