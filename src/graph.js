/**
 * Graph Parser, BFS (Queue), DFS (Recursive/Stack), Spanning Tree, Step Tracer, and SVG Renderer
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
      return { nodes: [], edges: [], adj: new Map(), directed };
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

    // Sort nodes & adjacency lists naturally (supports v1..v10, 0..9, A..Z)
    const nodes = Array.from(nodeSet);
    const cmp = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

    nodes.sort(cmp);
    for (const list of adj.values()) {
      list.sort(cmp);
    }

    return { nodes, edges, adj, directed };
  }

  /**
   * Run BFS (Queue) from startNode, recording textbook table rows and spanning tree edges.
   */
  function runBfs(graph, startNode) {
    if (!graph || graph.nodes.length === 0) {
      return { start: null, order: [], treeEdges: [], steps: [] };
    }
    const start = graph.adj.has(startNode) ? startNode : graph.nodes[0];

    const visited = new Set([start]);
    const queue = [start];
    const order = [];
    const treeEdges = [];
    const steps = [];

    while (queue.length > 0) {
      const curr = queue.shift();
      order.push(curr);

      const neighbors = graph.adj.get(curr) || [];
      const newlyDiscovered = [];

      for (const nb of neighbors) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
          newlyDiscovered.push(nb);
          treeEdges.push({ from: curr, to: nb });
        }
      }

      // Remaining unvisited queue (in textbook reverse/front-on-right or standard order)
      const queueDisplay = [...queue];

      steps.push({
        step: steps.length + 1,
        visitedFlag: 'T',
        current: curr,
        adjacent: queueDisplay,
        newlyDiscovered,
        action:
          newlyDiscovered.length > 0
            ? `Visit '${curr}' (T) → enqueue ${newlyDiscovered.join(', ')}`
            : `Visit '${curr}' (T) → no new neighbors`,
        frontier: [...queue],
        visited: [...visited],
        order: [...order],
        treeEdges: [...treeEdges]
      });
    }

    return { start, order, treeEdges, steps };
  }

  /**
   * Run DFS from startNode, recording textbook stack frames and spanning tree edges.
   */
  function runDfs(graph, startNode) {
    if (!graph || graph.nodes.length === 0) {
      return { start: null, order: [], treeEdges: [], steps: [] };
    }
    const start = graph.adj.has(startNode) ? startNode : graph.nodes[0];

    const visited = new Set();
    const order = [];
    const treeEdges = [];
    const steps = [];

    function dfs(u) {
      visited.add(u);
      order.push(u);

      const neighbors = graph.adj.get(u) || [];
      const unvisitedNow = neighbors.filter((nb) => !visited.has(nb));

      steps.push({
        step: steps.length + 1,
        visitedFlag: 'T',
        current: u,
        adjacent: neighbors,
        unvisitedNeighbors: unvisitedNow,
        action:
          unvisitedNow.length > 0
            ? `Visit '${u}' (T) → unvisited adjacent: ${unvisitedNow.join(', ')}`
            : `Visit '${u}' (T) → backtrack`,
        frontier: unvisitedNow,
        visited: [...visited],
        order: [...order],
        treeEdges: [...treeEdges]
      });

      for (const nb of neighbors) {
        if (!visited.has(nb)) {
          treeEdges.push({ from: u, to: nb });
          dfs(nb);
        }
      }
    }

    dfs(start);
    return { start, order, treeEdges, steps };
  }

  /**
   * Layout nodes cleanly on a circle (with start node at top) for legible SVG rendering.
   */
  function buildLayout(graph, startNode) {
    if (!graph || graph.nodes.length === 0) return null;

    const count = graph.nodes.length;
    const width = 480;
    const height = count <= 2 ? 210 : 300;
    const cx = width / 2;
    const cy = height / 2 + 6;
    const rx = count <= 2 ? 110 : Math.min(180, 88 + count * 12);
    const ry = count <= 2 ? 0 : Math.min(108, 60 + count * 6);

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
      startNode: ordered[0],
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

  function appendArrowMarker(svg, id) {
    const defs = createSvgEl('defs');
    const marker = createSvgEl('marker', {
      id,
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

  function renderSvg(container, layout, state = {}) {
    container.innerHTML = '';
    if (!layout) return;

    const svg = createSvgEl('svg', {
      viewBox: `0 0 ${layout.width} ${layout.height}`,
      width: layout.width,
      height: layout.height,
      class: 'ast-svg',
      role: 'img',
      'aria-label': 'Original graph diagram'
    });

    if (layout.directed) {
      appendArrowMarker(svg, 'graph-arrow');
    }

    const orderList = state.order || [];
    const orderIndex = new Map();
    orderList.forEach((id, idx) => orderIndex.set(id, idx + 1));
    const currentId = state.current || null;
    const frontierSet = new Set(state.frontier || []);
    const treeEdgeSet = new Set((state.treeEdges || []).map((e) => `${e.from}->${e.to}`));

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

      const isTreeEdge =
        treeEdgeSet.has(`${e.from}->${e.to}`) ||
        (!layout.directed && treeEdgeSet.has(`${e.to}->${e.from}`));

      const line = createSvgEl('line', {
        x1,
        y1,
        x2,
        y2,
        class: `ast-edge${isTreeEdge ? ' is-highlighted' : ''}`,
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

      const r = Math.max(19, n.id.length * 4.5 + 13);
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

      // Start badge on startNode
      if (n.id === layout.startNode) {
        const startLabel = createSvgEl('text', {
          x: 0,
          y: -r - 10,
          'text-anchor': 'middle',
          class: 'graph-start-tag'
        });
        startLabel.textContent = 'START';
        g.appendChild(startLabel);
      }

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

  /**
   * Render the BFS or DFS Spanning Tree SVG cleanly in hierarchical levels.
   */
  function renderSpanningTreeSvg(container, startNode, treeEdges = [], directed = false, currentId = null) {
    container.innerHTML = '';
    if (!startNode) return;

    // Build tree adjacency from treeEdges
    const childrenMap = new Map();
    childrenMap.set(startNode, []);
    for (const e of treeEdges) {
      if (!childrenMap.has(e.from)) childrenMap.set(e.from, []);
      if (!childrenMap.has(e.to)) childrenMap.set(e.to, []);
      childrenMap.get(e.from).push(e.to);
    }

    // Assign leaf-order x positions for clean non-crossing tree layout
    const nodes = [];
    const edges = [];
    let xCursor = 0;
    let maxDepth = 0;

    function place(id, depth) {
      maxDepth = Math.max(maxDepth, depth);
      const kids = childrenMap.get(id) || [];
      let myX;
      if (kids.length === 0) {
        myX = xCursor++;
      } else {
        const childXs = [];
        for (const k of kids) {
          edges.push({ from: id, to: k });
          childXs.push(place(k, depth + 1));
        }
        myX = (childXs[0] + childXs[childXs.length - 1]) / 2;
      }
      nodes.push({ id, depth, xIndex: myX });
      return myX;
    }

    place(startNode, 0);

    const totalCols = Math.max(1, xCursor);
    const colGap = totalCols > 8 ? 56 : 68;
    const rowGap = 72;
    const padX = 44;
    const padY = 40;
    const width = Math.max(320, (totalCols - 1) * colGap + padX * 2);
    const height = Math.max(170, maxDepth * rowGap + padY * 2);
    const naturalSpan = (totalCols - 1) * colGap;
    const startX = (width - naturalSpan) / 2;

    const posMap = new Map();
    for (const n of nodes) {
      n.x = startX + n.xIndex * colGap;
      n.y = padY + n.depth * rowGap;
      posMap.set(n.id, n);
    }

    const svg = createSvgEl('svg', {
      viewBox: `0 0 ${width} ${height}`,
      width,
      height,
      class: 'ast-svg',
      role: 'img',
      'aria-label': 'Spanning tree diagram'
    });

    if (directed) {
      appendArrowMarker(svg, 'tree-arrow');
    }

    const edgeGroup = createSvgEl('g', { class: 'ast-edges' });
    for (const e of edges) {
      const p1 = posMap.get(e.from);
      const p2 = posMap.get(e.to);
      const r = 19;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy) || 1;
      const x1 = p1.x + (dx / dist) * r;
      const y1 = p1.y + (dy / dist) * r;
      const x2 = p2.x - (dx / dist) * r;
      const y2 = p2.y - (dy / dist) * r;

      edgeGroup.appendChild(
        createSvgEl('line', {
          x1,
          y1,
          x2,
          y2,
          class: 'ast-edge is-highlighted',
          ...(directed ? { 'marker-end': 'url(#tree-arrow)' } : {})
        })
      );
    }
    svg.appendChild(edgeGroup);

    const nodeGroup = createSvgEl('g', { class: 'ast-nodes' });
    for (const n of nodes) {
      const isCurrent = n.id === currentId;
      const g = createSvgEl('g', {
        class: `ast-node is-operand${isCurrent ? ' is-current' : ' is-visited'}`,
        transform: `translate(${n.x}, ${n.y})`
      });
      const r = Math.max(18, n.id.length * 4.5 + 12);
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
    renderSvg,
    renderSpanningTreeSvg
  };
});
