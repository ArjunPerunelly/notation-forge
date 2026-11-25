/**
 * Graph Parser, BFS (Queue), DFS (Stack), Step Tracer, and SVG Renderer
 * Works in Browser globals (`window.GraphEngine`) and Node.js (`module.exports`).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GraphEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Parse edge list like "A-B, A-C, B-D" or "A -> B, B -> C" or isolated nodes "A, B".
   */
  function parseGraph(input, directed = false) {
    const raw = (input || '').trim();
    if (!raw) {
      return { nodes: [], edges: [], adj: new Map() };
    }

    const parts = raw
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const nodeSet = new Set();
    const edges = [];
    const edgeSeen = new Set();
    const adj = new Map();

    function ensureNode(id) {
      if (!nodeSet.has(id)) {
        nodeSet.add(id);
        adj.set(id, []);
      }
    }

    function addEdge(u, v) {
      ensureNode(u);
      ensureNode(v);
      const key = directed ? `${u}->${v}` : [u, v].sort().join('--');
      if (!edgeSeen.has(key)) {
        edgeSeen.add(key);
        edges.push({ from: u, to: v });
      }
      if (!adj.get(u).includes(v)) adj.get(u).push(v);
      if (!directed && u !== v && !adj.get(v).includes(u)) {
        adj.get(v).push(u);
      }
    }

    for (const part of parts) {
      const arrowMatch = part.match(/^([A-Za-z0-9_]+)\s*(?:->|—|-|--)\s*([A-Za-z0-9_]+)$/);
      if (arrowMatch) {
        addEdge(arrowMatch[1], arrowMatch[2]);
        continue;
      }

      // Space-separated pair like "A B"
      const spaceTokens = part.split(/\s+/).filter(Boolean);
      if (spaceTokens.length === 2) {
        addEdge(spaceTokens[0], spaceTokens[1]);
        continue;
      }
      if (spaceTokens.length === 1 && /^[A-Za-z0-9_]+$/.test(spaceTokens[0])) {
        ensureNode(spaceTokens[0]);
        continue;
      }

      throw new Error(`Invalid edge format '${part}'. Use 'A-B' or 'A->B'.`);
    }

    // Sort adjacency lists naturally (numeric if all numeric, else alphabetical)
    const nodes = Array.from(nodeSet);
    const allNum = nodes.every((n) => /^-?\d+$/.test(n));
    const cmp = allNum
      ? (a, b) => Number(a) - Number(b)
      : (a, b) => a.localeCompare(b);

    nodes.sort(cmp);
    for (const list of adj.values()) {
      list.sort(cmp);
    }

    return { nodes, edges, adj, directed };
  }

  /**
   * Run BFS (Queue) from startNode, recording step-by-step snapshots.
   */
  function runBfs(graph, startNode) {
    if (!graph || graph.nodes.length === 0) return { order: [], steps: [] };
    const start = graph.adj.has(startNode) ? startNode : graph.nodes[0];

    const visited = new Set([start]);
    const queue = [start];
    const order = [];
    const steps = [];

    steps.push({
      step: 1,
      current: start,
      action: `Enqueue start node '${start}' and mark visited`,
      frontier: [...queue],
      visited: [...visited],
      order: [...order]
    });

    while (queue.length > 0) {
      const curr = queue.shift();
      order.push(curr);
      const neighbors = graph.adj.get(curr) || [];
      const newlyAdded = [];

      for (const nb of neighbors) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
          newlyAdded.push(nb);
        }
      }

      steps.push({
        step: steps.length + 1,
        current: curr,
        action:
          newlyAdded.length > 0
            ? `Dequeue '${curr}', visit, enqueue unvisited neighbors: ${newlyAdded.join(', ')}`
            : `Dequeue '${curr}', visit (no unvisited neighbors)`,
        frontier: [...queue],
        visited: [...visited],
        order: [...order]
      });
    }

    return { start, order, steps };
  }

  /**
   * Run iterative DFS (Stack) from startNode, recording step-by-step snapshots.
   */
  function runDfs(graph, startNode) {
    if (!graph || graph.nodes.length === 0) return { order: [], steps: [] };
    const start = graph.adj.has(startNode) ? startNode : graph.nodes[0];

    const visited = new Set();
    const stack = [start];
    const order = [];
    const steps = [];

    steps.push({
      step: 1,
      current: start,
      action: `Push start node '${start}' onto stack`,
      frontier: [...stack],
      visited: [...visited],
      order: [...order]
    });

    while (stack.length > 0) {
      const curr = stack.pop();
      if (visited.has(curr)) {
        continue;
      }
      visited.add(curr);
      order.push(curr);

      const neighbors = graph.adj.get(curr) || [];
      const pushed = [];
      // Push in reverse order so smallest/first neighbor is popped first
      for (let i = neighbors.length - 1; i >= 0; i -= 1) {
        const nb = neighbors[i];
        if (!visited.has(nb)) {
          stack.push(nb);
          pushed.push(nb);
        }
      }

      steps.push({
        step: steps.length + 1,
        current: curr,
        action:
          pushed.length > 0
            ? `Pop '${curr}', mark visited, push neighbors: ${[...pushed].reverse().join(', ')}`
            : `Pop '${curr}', mark visited (no unvisited neighbors)`,
        frontier: [...stack],
        visited: [...visited],
        order: [...order]
      });
    }

    return { start, order, steps };
  }

  /**
   * Layout nodes cleanly on a circle (with start node at top) for legible SVG rendering.
   */
  function buildLayout(graph, startNode) {
    if (!graph || graph.nodes.length === 0) return null;

    const count = graph.nodes.length;
    const width = 560;
    const height = count <= 2 ? 220 : 320;
    const cx = width / 2;
    const cy = height / 2;
    const rx = count <= 2 ? 120 : Math.min(200, 95 + count * 14);
    const ry = count <= 2 ? 0 : Math.min(115, 65 + count * 7);

    // Put startNode first so it sits cleanly at the top
    const ordered = [...graph.nodes];
    const sIdx = ordered.indexOf(startNode);
    if (sIdx > 0) {
      ordered.splice(sIdx, 1);
      ordered.unshift(startNode);
    }

    const posMap = new Map();
    ordered.forEach((id, i) => {
      const angle = count === 1 ? -Math.PI / 2 : -Math.PI / 2 + (2 * Math.PI * i) / count;
      posMap.set(id, {
        id,
        x: count === 1 ? cx : cx + rx * Math.cos(angle),
        y: count <= 2 ? cy : cy + ry * Math.sin(angle)
      });
    });

    return {
      width,
      height,
      nodes: ordered.map((id) => posMap.get(id)),
      posMap,
      edges: graph.edges,
      directed: Boolean(graph.directed)
    };
  }

  function createSvgEl(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  function renderSvg(container, layout, state = {}) {
    container.innerHTML = '';
    if (!layout) return;

    const svg = createSvgEl('svg', {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      width: layout.width,
      height: layout.height,
      class: 'ast-svg',
      role: 'img',
      'aria-label': 'Graph diagram'
    });

    if (layout.directed) {
      const defs = createSvgEl('defs');
      const marker = createSvgEl('marker', {
        id: 'graph-arrow',
        viewBox: '0 0 10 10',
        refX: '9',
        refY: '5',
        markerWidth: '6',
        markerHeight: '6',
        orient: 'auto-start-reverse'
      });
      marker.appendChild(
        createSvgEl('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: 'currentColor', class: 'graph-arrow-head' })
      );
      defs.appendChild(marker);
      svg.appendChild(defs);
    }

    const orderList = state.order || [];
    const orderIndex = new Map();
    orderList.forEach((id, idx) => orderIndex.set(id, idx + 1));
    const currentId = state.current || null;
    const frontierSet = new Set(state.frontier || []);

    const edgeGroup = createSvgEl('g', { class: 'ast-edges' });
    for (const e of layout.edges) {
      const p1 = layout.posMap.get(e.from);
      const p2 = layout.posMap.get(e.to);
      if (!p1 || !p2) continue;

      const r = 21;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy) || 1;
      const x1 = p1.x + (dx / dist) * r;
      const y1 = p1.y + (dy / dist) * r;
      const x2 = p2.x - (dx / dist) * r;
      const y2 = p2.y - (dy / dist) * r;

      const isActiveEdge =
        (orderIndex.has(e.from) && orderIndex.has(e.to)) &&
        (e.from === currentId || e.to === currentId);

      const line = createSvgEl('line', {
        x1,
        y1,
        x2,
        y2,
        class: `ast-edge${isActiveEdge ? ' is-highlighted' : ''}`,
        ...(layout.directed ? { 'marker-end': 'url(#graph-arrow)' } : {})
      });
      edgeGroup.appendChild(line);
    }
    svg.appendChild(edgeGroup);

    const nodeGroup = createSvgEl('g', { class: 'ast-nodes' });
    for (const n of layout.nodes) {
      const isCurrent = currentId === n.id;
      const isVisited = orderIndex.has(n.id);
      const isFrontier = frontierSet.has(n.id) && !isVisited;

      const classes = ['ast-node', isFrontier ? 'is-op' : 'is-operand'];
      if (isCurrent) classes.push('is-current');
      else if (isVisited) classes.push('is-visited');

      const g = createSvgEl('g', {
        class: classes.join(' '),
        transform: `translate(${n.x}, ${n.y})`
      });

      const r = Math.max(19, n.id.length * 5 + 13);
      g.appendChild(createSvgEl('circle', { r, cx: 0, cy: 0, class: 'ast-node-shape' }));

      const text = createSvgEl('text', {
        x: 0,
        y: 1,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        class: 'ast-node-label'
      });
      text.textContent = n.id;
      g.appendChild(text);

      if (orderIndex.has(n.id)) {
        const bx = r * 0.78;
        const by = -r * 0.78;
        g.appendChild(
          createSvgEl('circle', {
            cx: bx,
            cy: by,
            r: 9,
            class: `ast-visit-badge${isCurrent ? ' is-current' : ''}`
          })
        );
        const badgeText = createSvgEl('text', {
          x: bx,
          y: by + 0.5,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          class: 'ast-visit-text'
        });
        badgeText.textContent = String(orderIndex.get(n.id));
        g.appendChild(badgeText);
      }

      nodeGroup.appendChild(g);
    }

    svg.appendChild(nodeGroup);
    container.appendChild(svg);
  }

  return {
    parseGraph,
    runBfs,
    runDfs,
    buildLayout,
    renderSvg
  };
});
