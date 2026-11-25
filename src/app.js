(function () {
  'use strict';

  const Engine = window.ExprEngine;
  const Tree = window.ExprTree;
  const Bst = window.BstEngine;

  const STORAGE_THEME = 'nf_theme_v1';
  const STORAGE_HISTORY = 'nf_history_v1';

  const state = {
    appMode: 'convert',
    input: '(A + B) * (C - D)',
    notation: 'auto',
    tokenMode: 'auto',
    caretAssoc: 'right',
    infixFullParens: false,
    compact: { infix: false, postfix: false, prefix: false },
    activeTab: 'trace',
    traceKind: 'infix-to-postfix',
    userPickedTrace: false,
    traceStepIdx: 0,
    traceTimer: null,
    treeTraversal: '',
    treeStep: 0,
    treeTimer: null,
    selectedNodeId: null,
    varValues: {},
    result: null,
    traceData: null,
    treeLayout: null,
    history: [],

    // BST state
    bstInput: '50, 30, 70, 20, 40, 60, 80',
    bstNumeric: true,
    bstRoot: null,
    bstLayout: null,
    bstSelectedNodeId: null,
    bstSearchPathIds: [],
    bstSearchFoundId: null,

    // General Binary Tree Traversals state
    travInput: 'A, B, C, D, E, F, G',
    travRoot: null,
    travLayout: null,
    travOrder: '',
    travStep: 0,
    travTimer: null,
    travSelectedNodeId: null
  };

  // DOM References
  const el = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    assocRightBtn: document.getElementById('assocRightBtn'),
    assocLeftBtn: document.getElementById('assocLeftBtn'),
    notationGroup: document.getElementById('notationGroup'),
    tokenModeGroup: document.getElementById('tokenModeGroup'),
    detectedBadge: document.getElementById('detectedBadge'),
    inputBoxWrap: document.getElementById('inputBoxWrap'),
    exprInput: document.getElementById('exprInput'),
    clearInputBtn: document.getElementById('clearInputBtn'),
    tokenStripWrap: document.getElementById('tokenStripWrap'),
    tokenStrip: document.getElementById('tokenStrip'),
    errorBanner: document.getElementById('errorBanner'),
    errorMsg: document.getElementById('errorMsg'),
    errorHint: document.getElementById('errorHint'),
    presetsList: document.getElementById('presetsList'),

    cardInfix: document.getElementById('cardInfix'),
    cardPostfix: document.getElementById('cardPostfix'),
    cardPrefix: document.getElementById('cardPrefix'),
    outInfix: document.getElementById('outInfix'),
    outPostfix: document.getElementById('outPostfix'),
    outPrefix: document.getElementById('outPrefix'),
    sourceTagInfix: document.getElementById('sourceTagInfix'),
    sourceTagPostfix: document.getElementById('sourceTagPostfix'),
    sourceTagPrefix: document.getElementById('sourceTagPrefix'),
    infixParensToggle: document.getElementById('infixParensToggle'),
    infixCompactToggle: document.getElementById('infixCompactToggle'),
    postfixCompactToggle: document.getElementById('postfixCompactToggle'),
    prefixCompactToggle: document.getElementById('prefixCompactToggle'),

    tabBtns: document.querySelectorAll('.tab-btn'),
    panelTrace: document.getElementById('panelTrace'),
    panelTree: document.getElementById('panelTree'),
    panelEvaluate: document.getElementById('panelEvaluate'),
    panelReference: document.getElementById('panelReference'),
    evalBadge: document.getElementById('evalBadge'),

    traceKindGroup: document.getElementById('traceKindGroup'),
    stepFirstBtn: document.getElementById('stepFirstBtn'),
    stepPrevBtn: document.getElementById('stepPrevBtn'),
    stepPlayBtn: document.getElementById('stepPlayBtn'),
    stepNextBtn: document.getElementById('stepNextBtn'),
    stepLastBtn: document.getElementById('stepLastBtn'),
    stepCounter: document.getElementById('stepCounter'),
    traceAlgoName: document.getElementById('traceAlgoName'),
    traceScanDir: document.getElementById('traceScanDir'),
    reversedInfixWrap: document.getElementById('reversedInfixWrap'),
    reversedInfixCode: document.getElementById('reversedInfixCode'),
    visualStackTitle: document.getElementById('visualStackTitle'),
    visualStackDepth: document.getElementById('visualStackDepth'),
    visualStackBucket: document.getElementById('visualStackBucket'),
    currentStepAction: document.getElementById('currentStepAction'),
    visualOutputLabel: document.getElementById('visualOutputLabel'),
    currentStepOutput: document.getElementById('currentStepOutput'),
    tableStackCol: document.getElementById('tableStackCol'),
    tableOutputCol: document.getElementById('tableOutputCol'),
    traceTableBody: document.getElementById('traceTableBody'),

    treeTraversalGroup: document.getElementById('treeTraversalGroup'),
    treePlayerControls: document.getElementById('treePlayerControls'),
    treeResetBtn: document.getElementById('treeResetBtn'),
    treePrevBtn: document.getElementById('treePrevBtn'),
    treePlayBtn: document.getElementById('treePlayBtn'),
    treeNextBtn: document.getElementById('treeNextBtn'),
    treeAllBtn: document.getElementById('treeAllBtn'),
    treeStepCounter: document.getElementById('treeStepCounter'),
    treeTraversalOutput: document.getElementById('treeTraversalOutput'),
    treeTraversalLabel: document.getElementById('treeTraversalLabel'),
    treeTraversalTokens: document.getElementById('treeTraversalTokens'),
    treeSvgContainer: document.getElementById('treeSvgContainer'),
    subtreeInspector: document.getElementById('subtreeInspector'),

    variablesContainer: document.getElementById('variablesContainer'),
    fillSampleVarsBtn: document.getElementById('fillSampleVarsBtn'),
    clearVarsBtn: document.getElementById('clearVarsBtn'),
    evalResultCard: document.getElementById('evalResultCard'),
    evalResultValue: document.getElementById('evalResultValue'),
    evalResultNote: document.getElementById('evalResultNote'),
    evalTraceBody: document.getElementById('evalTraceBody'),

    refPowAssoc: document.getElementById('refPowAssoc'),
    historyList: document.getElementById('historyList'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),

    appModeGroup: document.getElementById('appModeGroup'),
    assocToggleWrap: document.getElementById('assocToggleWrap'),
    modeConvertView: document.getElementById('modeConvertView'),
    modeBstView: document.getElementById('modeBstView'),
    modeTraversalView: document.getElementById('modeTraversalView'),

    bstTypeBadge: document.getElementById('bstTypeBadge'),
    bstStatCount: document.getElementById('bstStatCount'),
    bstStatHeight: document.getElementById('bstStatHeight'),
    bstStatMin: document.getElementById('bstStatMin'),
    bstStatMax: document.getElementById('bstStatMax'),
    bstListInput: document.getElementById('bstListInput'),
    bstClearBtn: document.getElementById('bstClearBtn'),
    bstOpInput: document.getElementById('bstOpInput'),
    bstInsertBtn: document.getElementById('bstInsertBtn'),
    bstDeleteBtn: document.getElementById('bstDeleteBtn'),
    bstSearchBtn: document.getElementById('bstSearchBtn'),
    bstOpStatus: document.getElementById('bstOpStatus'),
    bstPresetsList: document.getElementById('bstPresetsList'),
    bstSvgContainer: document.getElementById('bstSvgContainer'),
    bstSubtreeInspector: document.getElementById('bstSubtreeInspector'),

    travNodeBadge: document.getElementById('travNodeBadge'),
    travListInput: document.getElementById('travListInput'),
    travClearBtn: document.getElementById('travClearBtn'),
    travPresetsList: document.getElementById('travPresetsList'),
    travOutInorder: document.getElementById('travOutInorder'),
    travOutPreorder: document.getElementById('travOutPreorder'),
    travOutPostorder: document.getElementById('travOutPostorder'),
    travOrderGroup: document.getElementById('travOrderGroup'),
    travPlayerControls: document.getElementById('travPlayerControls'),
    travResetBtn: document.getElementById('travResetBtn'),
    travPrevBtn: document.getElementById('travPrevBtn'),
    travPlayBtn: document.getElementById('travPlayBtn'),
    travNextBtn: document.getElementById('travNextBtn'),
    travAllBtn: document.getElementById('travAllBtn'),
    travStepCounter: document.getElementById('travStepCounter'),
    travOutputBar: document.getElementById('travOutputBar'),
    travOutputLabel: document.getElementById('travOutputLabel'),
    travOutputTokens: document.getElementById('travOutputTokens'),
    travSvgContainer: document.getElementById('travSvgContainer'),
    travSubtreeInspector: document.getElementById('travSubtreeInspector')
  };

  let historySaveTimer = null;

  function init() {
    loadTheme();
    loadHistory();
    bindEvents();
    recompute();
    recomputeBst();
    recomputeTraversalTree();
  }

  function loadTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_THEME);
      if (saved === 'dark' || saved === 'light') {
        document.documentElement.setAttribute('data-theme', saved);
      }
    } catch (_) {
      // Ignore storage errors
    }
  }

  function toggleTheme() {
    const curr = document.documentElement.getAttribute('data-theme') || 'light';
    const next = curr === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_THEME, next);
    } catch (_) {
      // Ignore storage errors
    }
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY);
      state.history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(state.history)) state.history = [];
    } catch (_) {
      state.history = [];
    }
    renderHistory();
  }

  function pushHistory(input, sourceNotation) {
    const trimmed = input.trim();
    if (!trimmed) return;
    const filtered = state.history.filter(
      (item) => !(item.expr === trimmed && item.notation === sourceNotation)
    );
    filtered.unshift({
      expr: trimmed,
      notation: sourceNotation,
      timestamp: Date.now()
    });
    state.history = filtered.slice(0, 15);
    try {
      localStorage.setItem(STORAGE_HISTORY, JSON.stringify(state.history));
    } catch (_) {
      // Ignore storage errors
    }
    renderHistory();
  }

  function scheduleHistorySave() {
    if (historySaveTimer) clearTimeout(historySaveTimer);
    historySaveTimer = setTimeout(() => {
      if (state.result) {
        pushHistory(state.input, state.result.sourceNotation);
      }
    }, 1200);
  }

  function stopTracePlayback() {
    if (state.traceTimer) {
      clearInterval(state.traceTimer);
      state.traceTimer = null;
    }
    el.stepPlayBtn.textContent = 'Play';
  }

  function stopTreePlayback() {
    if (state.treeTimer) {
      clearInterval(state.treeTimer);
      state.treeTimer = null;
    }
    el.treePlayBtn.textContent = 'Animate';
  }

  function bindEvents() {
    el.appModeGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-app-mode]');
      if (!btn) return;
      switchAppMode(btn.dataset.appMode);
    });

    el.themeToggleBtn.addEventListener('click', toggleTheme);

    [el.assocRightBtn, el.assocLeftBtn].forEach((btn) => {
      btn.addEventListener('click', () => {
        state.caretAssoc = btn.dataset.assoc;
        el.assocRightBtn.classList.toggle('is-active', state.caretAssoc === 'right');
        el.assocLeftBtn.classList.toggle('is-active', state.caretAssoc === 'left');
        el.refPowAssoc.textContent =
          state.caretAssoc === 'right' ? 'Right-to-Left' : 'Left-to-Right';
        recompute();
      });
    });

    el.notationGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-notation]');
      if (!btn) return;
      state.notation = btn.dataset.notation;
      state.userPickedTrace = false;
      updateSegmented(el.notationGroup, 'notation', state.notation);
      recompute();
    });

    el.tokenModeGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-token-mode]');
      if (!btn) return;
      state.tokenMode = btn.dataset.tokenMode;
      updateSegmented(el.tokenModeGroup, 'tokenMode', state.tokenMode);
      recompute();
    });

    el.exprInput.addEventListener('input', () => {
      state.input = el.exprInput.value;
      state.userPickedTrace = false;
      recompute();
      scheduleHistorySave();
    });

    el.clearInputBtn.addEventListener('click', () => {
      state.input = '';
      el.exprInput.value = '';
      el.exprInput.focus();
      recompute();
    });

    el.presetsList.addEventListener('click', (e) => {
      const chip = e.target.closest('.preset-chip');
      if (!chip) return;
      state.input = chip.dataset.expr;
      state.notation = chip.dataset.notation || 'auto';
      state.userPickedTrace = false;
      el.exprInput.value = state.input;
      updateSegmented(el.notationGroup, 'notation', state.notation);
      recompute();
      if (state.result) pushHistory(state.input, state.result.sourceNotation);
    });

    // Output toggles
    el.infixParensToggle.addEventListener('click', () => {
      state.infixFullParens = !state.infixFullParens;
      el.infixParensToggle.classList.toggle('is-active', state.infixFullParens);
      renderOutputs();
    });

    [
      [el.infixCompactToggle, 'infix'],
      [el.postfixCompactToggle, 'postfix'],
      [el.prefixCompactToggle, 'prefix']
    ].forEach(([btn, key]) => {
      btn.addEventListener('click', () => {
        state.compact[key] = !state.compact[key];
        btn.classList.toggle('is-active', state.compact[key]);
        renderOutputs();
      });
    });

    // Copy & Use-as-input buttons
    document.querySelectorAll('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetEl = document.getElementById(btn.dataset.copyTarget);
        const text = targetEl ? targetEl.textContent : '';
        if (!text || text === '—') return;
        copyText(text, btn);
      });
    });

    document.querySelectorAll('[data-use-notation]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!state.result) return;
        const targetNotation = btn.dataset.useNotation;
        const out = state.result.outputs[targetNotation];
        if (!out) return;
        const text =
          targetNotation === 'infix' && state.infixFullParens
            ? state.compact.infix && out.canCompact
              ? out.fullCompact
              : out.fullFormatted
            : state.compact[targetNotation] && out.canCompact
            ? out.compact
            : out.formatted;
        state.input = text;
        state.notation = targetNotation;
        state.userPickedTrace = false;
        el.exprInput.value = text;
        updateSegmented(el.notationGroup, 'notation', targetNotation);
        recompute();
        pushHistory(text, targetNotation);
      });
    });

    // Tabs
    el.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
      });
    });

    // Trace Direction Selector
    el.traceKindGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-trace]');
      if (!btn) return;
      stopTracePlayback();
      state.traceKind = btn.dataset.trace;
      state.userPickedTrace = true;
      updateTraceKindPills();
      buildAndRenderTrace();
    });

    // Trace Step Player
    el.stepFirstBtn.addEventListener('click', () => {
      stopTracePlayback();
      setTraceStep(0);
    });

    el.stepPrevBtn.addEventListener('click', () => {
      stopTracePlayback();
      setTraceStep(Math.max(0, state.traceStepIdx - 1));
    });

    el.stepNextBtn.addEventListener('click', () => {
      stopTracePlayback();
      const maxIdx = state.traceData ? state.traceData.steps.length - 1 : 0;
      setTraceStep(Math.min(maxIdx, state.traceStepIdx + 1));
    });

    el.stepLastBtn.addEventListener('click', () => {
      stopTracePlayback();
      const maxIdx = state.traceData ? state.traceData.steps.length - 1 : 0;
      setTraceStep(maxIdx);
    });

    el.stepPlayBtn.addEventListener('click', () => {
      if (!state.traceData || state.traceData.steps.length === 0) return;
      if (state.traceTimer) {
        stopTracePlayback();
        return;
      }
      const maxIdx = state.traceData.steps.length - 1;
      if (state.traceStepIdx >= maxIdx) {
        setTraceStep(0);
      }
      el.stepPlayBtn.textContent = 'Pause';
      state.traceTimer = setInterval(() => {
        if (!state.traceData) {
          stopTracePlayback();
          return;
        }
        if (state.traceStepIdx < state.traceData.steps.length - 1) {
          setTraceStep(state.traceStepIdx + 1);
        } else {
          stopTracePlayback();
        }
      }, 750);
    });

    // Tree Traversal Controls
    el.treeTraversalGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-traversal]');
      if (!btn) return;
      stopTreePlayback();
      state.treeTraversal = btn.dataset.traversal;
      updateSegmented(el.treeTraversalGroup, 'traversal', state.treeTraversal);
      if (state.treeLayout && state.treeTraversal) {
        state.treeStep = state.treeLayout.traversals[state.treeTraversal].length;
      } else {
        state.treeStep = 0;
      }
      renderTree();
    });

    el.treeResetBtn.addEventListener('click', () => {
      stopTreePlayback();
      state.treeStep = 0;
      renderTree();
    });

    el.treePrevBtn.addEventListener('click', () => {
      stopTreePlayback();
      state.treeStep = Math.max(0, state.treeStep - 1);
      renderTree();
    });

    el.treeNextBtn.addEventListener('click', () => {
      stopTreePlayback();
      if (!state.treeLayout || !state.treeTraversal) return;
      const total = state.treeLayout.traversals[state.treeTraversal].length;
      state.treeStep = Math.min(total, state.treeStep + 1);
      renderTree();
    });

    el.treeAllBtn.addEventListener('click', () => {
      stopTreePlayback();
      if (!state.treeLayout || !state.treeTraversal) return;
      state.treeStep = state.treeLayout.traversals[state.treeTraversal].length;
      renderTree();
    });

    el.treePlayBtn.addEventListener('click', () => {
      if (!state.treeLayout || !state.treeTraversal) return;
      if (state.treeTimer) {
        stopTreePlayback();
        return;
      }
      const total = state.treeLayout.traversals[state.treeTraversal].length;
      if (state.treeStep >= total) {
        state.treeStep = 0;
        renderTree();
      }
      el.treePlayBtn.textContent = 'Pause';
      state.treeTimer = setInterval(() => {
        if (!state.treeLayout || !state.treeTraversal) {
          stopTreePlayback();
          return;
        }
        const limit = state.treeLayout.traversals[state.treeTraversal].length;
        if (state.treeStep < limit) {
          state.treeStep += 1;
          renderTree();
        } else {
          stopTreePlayback();
        }
      }, 650);
    });

    // Evaluate variable controls
    el.fillSampleVarsBtn.addEventListener('click', () => {
      if (!state.result) return;
      state.result.variables.forEach((v, idx) => {
        state.varValues[v] = String(idx + 2);
      });
      renderEvaluate();
    });

    el.clearVarsBtn.addEventListener('click', () => {
      if (!state.result) return;
      state.result.variables.forEach((v) => {
        state.varValues[v] = '';
      });
      renderEvaluate();
    });

    el.clearHistoryBtn.addEventListener('click', () => {
      state.history = [];
      try {
        localStorage.removeItem(STORAGE_HISTORY);
      } catch (_) {
        // Ignore
      }
      renderHistory();
    });

    // BST Events
    el.bstListInput.addEventListener('input', () => {
      state.bstInput = el.bstListInput.value;
      clearBstHighlights();
      setBstStatus('', '');
      recomputeBst();
    });

    el.bstClearBtn.addEventListener('click', () => {
      state.bstInput = '';
      el.bstListInput.value = '';
      clearBstHighlights();
      setBstStatus('Cleared tree.', '');
      recomputeBst();
      el.bstListInput.focus();
    });

    el.bstPresetsList.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-bst]');
      if (!chip) return;
      state.bstInput = chip.dataset.bst;
      el.bstListInput.value = state.bstInput;
      clearBstHighlights();
      setBstStatus('', '');
      recomputeBst();
    });

    el.bstInsertBtn.addEventListener('click', handleBstInsert);
    el.bstDeleteBtn.addEventListener('click', handleBstDelete);
    el.bstSearchBtn.addEventListener('click', handleBstSearch);

    el.bstOpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleBstInsert();
      }
    });

    // Tree Traversals Events
    el.travListInput.addEventListener('input', () => {
      state.travInput = el.travListInput.value;
      state.travSelectedNodeId = null;
      recomputeTraversalTree();
    });

    el.travClearBtn.addEventListener('click', () => {
      state.travInput = '';
      el.travListInput.value = '';
      state.travSelectedNodeId = null;
      recomputeTraversalTree();
      el.travListInput.focus();
    });

    el.travPresetsList.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-trav]');
      if (!chip) return;
      state.travInput = chip.dataset.trav;
      el.travListInput.value = state.travInput;
      state.travSelectedNodeId = null;
      recomputeTraversalTree();
    });

    el.travOrderGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-trav-order]');
      if (!btn) return;
      stopTravPlayback();
      state.travOrder = btn.dataset.travOrder;
      updateSegmented(el.travOrderGroup, 'travOrder', state.travOrder);
      if (state.travLayout && state.travOrder) {
        state.travStep = state.travLayout.traversals[state.travOrder].length;
      } else {
        state.travStep = 0;
      }
      renderTraversalTree();
    });

    el.travResetBtn.addEventListener('click', () => {
      stopTravPlayback();
      state.travStep = 0;
      renderTraversalTree();
    });

    el.travPrevBtn.addEventListener('click', () => {
      stopTravPlayback();
      state.travStep = Math.max(0, state.travStep - 1);
      renderTraversalTree();
    });

    el.travNextBtn.addEventListener('click', () => {
      stopTravPlayback();
      if (!state.travLayout || !state.travOrder) return;
      const total = state.travLayout.traversals[state.travOrder].length;
      state.travStep = Math.min(total, state.travStep + 1);
      renderTraversalTree();
    });

    el.travAllBtn.addEventListener('click', () => {
      stopTravPlayback();
      if (!state.travLayout || !state.travOrder) return;
      state.travStep = state.travLayout.traversals[state.travOrder].length;
      renderTraversalTree();
    });

    el.travPlayBtn.addEventListener('click', () => {
      if (!state.travLayout || !state.travOrder) return;
      if (state.travTimer) {
        stopTravPlayback();
        return;
      }
      const total = state.travLayout.traversals[state.travOrder].length;
      if (state.travStep >= total) {
        state.travStep = 0;
        renderTraversalTree();
      }
      el.travPlayBtn.textContent = 'Pause';
      state.travTimer = setInterval(() => {
        if (!state.travLayout || !state.travOrder) {
          stopTravPlayback();
          return;
        }
        const limit = state.travLayout.traversals[state.travOrder].length;
        if (state.travStep < limit) {
          state.travStep += 1;
          renderTraversalTree();
        } else {
          stopTravPlayback();
        }
      }, 650);
    });
  }

  function switchAppMode(mode) {
    stopTracePlayback();
    stopTreePlayback();
    stopTravPlayback();
    state.appMode = mode;
    updateSegmented(el.appModeGroup, 'appMode', mode);
    el.modeConvertView.classList.toggle('is-hidden', mode !== 'convert');
    el.modeBstView.classList.toggle('is-hidden', mode !== 'bst');
    el.modeTraversalView.classList.toggle('is-hidden', mode !== 'traversal');
    el.assocToggleWrap.classList.toggle('is-hidden', mode !== 'convert');
  }

  function updateSegmented(groupEl, dataAttr, activeVal) {
    groupEl.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset[dataAttr] === activeVal);
    });
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    el.tabBtns.forEach((btn) => {
      const isMatch = btn.dataset.tab === tabName;
      btn.classList.toggle('is-active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    const map = {
      trace: el.panelTrace,
      tree: el.panelTree,
      evaluate: el.panelEvaluate,
      reference: el.panelReference
    };
    Object.entries(map).forEach(([k, panel]) => {
      panel.classList.toggle('is-active', k === tabName);
    });
  }

  function copyText(text, btn) {
    const finish = () => {
      const prev = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('is-copied');
      setTimeout(() => {
        btn.textContent = prev;
        btn.classList.remove('is-copied');
      }, 1300);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(finish).catch(() => fallbackCopy(text, finish));
    } else {
      fallbackCopy(text, finish);
    }
  }

  function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      cb();
    } catch (_) {
      // Ignore
    }
    document.body.removeChild(ta);
  }

  function recompute() {
    stopTracePlayback();
    stopTreePlayback();
    state.selectedNodeId = null;

    const options = {
      notation: state.notation,
      tokenMode: state.tokenMode,
      caretAssoc: state.caretAssoc
    };

    try {
      const res = Engine.convert(state.input, options);
      state.result = res;

      if (!state.userPickedTrace) {
        if (res.sourceNotation === 'infix') state.traceKind = 'infix-to-postfix';
        else if (res.sourceNotation === 'postfix') state.traceKind = 'postfix-to-infix';
        else state.traceKind = 'prefix-to-infix';
      }

      el.inputBoxWrap.classList.remove('has-error');
      el.errorBanner.classList.add('is-hidden');
      el.tokenStripWrap.classList.remove('is-hidden');

      const labelMap = { infix: 'Infix', postfix: 'Postfix', prefix: 'Prefix' };
      el.detectedBadge.textContent =
        state.notation === 'auto'
          ? `Detected: ${labelMap[res.sourceNotation]}`
          : `Mode: ${labelMap[res.sourceNotation]}`;
      el.detectedBadge.classList.remove('is-error');

      renderTokenStrip();
      renderOutputs();
      updateTraceKindPills();
      buildAndRenderTrace();

      state.treeLayout = Tree.buildLayout(res.ast, options);
      if (state.treeTraversal) {
        state.treeStep = state.treeLayout.traversals[state.treeTraversal].length;
      }
      renderTree();
      renderEvaluate();
    } catch (err) {
      state.result = null;
      state.traceData = null;
      state.treeLayout = null;

      el.inputBoxWrap.classList.add('has-error');
      el.tokenStripWrap.classList.add('is-hidden');
      el.errorBanner.classList.remove('is-hidden');
      el.errorMsg.textContent = err.message || 'Invalid expression.';
      if (err.hint) {
        el.errorHint.textContent = err.hint;
        el.errorHint.classList.remove('is-hidden');
      } else {
        el.errorHint.classList.add('is-hidden');
      }

      el.detectedBadge.textContent = state.input.trim() ? 'Invalid syntax' : 'Waiting for input';
      el.detectedBadge.classList.toggle('is-error', Boolean(state.input.trim()));

      renderOutputsEmpty();
      renderTraceEmpty();
      renderTreeEmpty();
      renderEvaluateEmpty();
    }
  }

  function renderTokenStrip() {
    el.tokenStrip.innerHTML = '';
    if (!state.result) return;

    const tokens = state.result.inputTokens;
    tokens.forEach((tok, idx) => {
      const chip = document.createElement('span');
      chip.className = `tok-chip is-${tok.kind}`;
      chip.dataset.tokenIndex = String(idx);
      chip.textContent = tok.value;
      el.tokenStrip.appendChild(chip);
    });
  }

  function highlightActiveInputToken(step) {
    const chips = el.tokenStrip.querySelectorAll('.tok-chip');
    chips.forEach((c) => c.classList.remove('is-active-token'));

    if (!state.result || !step || step.tokenIndex < 0) return;

    // Only highlight input chips when the active trace scans the same notation as input
    const src = state.result.sourceNotation;
    const directMatch =
      (src === 'infix' && state.traceKind === 'infix-to-postfix') ||
      (src === 'postfix' && state.traceKind.startsWith('postfix-')) ||
      (src === 'prefix' && state.traceKind.startsWith('prefix-'));

    if (!directMatch) return;
    const target = el.tokenStrip.querySelector(`[data-token-index="${step.tokenIndex}"]`);
    if (target) target.classList.add('is-active-token');
  }

  function renderOutputs() {
    if (!state.result) {
      renderOutputsEmpty();
      return;
    }

    const { outputs, sourceNotation } = state.result;

    // Source tags & highlights
    el.cardInfix.classList.toggle('is-source', sourceNotation === 'infix');
    el.cardPostfix.classList.toggle('is-source', sourceNotation === 'postfix');
    el.cardPrefix.classList.toggle('is-source', sourceNotation === 'prefix');
    el.sourceTagInfix.classList.toggle('is-hidden', sourceNotation !== 'infix');
    el.sourceTagPostfix.classList.toggle('is-hidden', sourceNotation !== 'postfix');
    el.sourceTagPrefix.classList.toggle('is-hidden', sourceNotation !== 'prefix');

    // Compact buttons availability
    el.infixCompactToggle.disabled = !outputs.infix.canCompact;
    el.postfixCompactToggle.disabled = !outputs.postfix.canCompact;
    el.prefixCompactToggle.disabled = !outputs.prefix.canCompact;

    const infixUseCompact = state.compact.infix && outputs.infix.canCompact;
    el.outInfix.textContent = state.infixFullParens
      ? infixUseCompact
        ? outputs.infix.fullCompact
        : outputs.infix.fullFormatted
      : infixUseCompact
      ? outputs.infix.compact
      : outputs.infix.formatted;

    const postfixUseCompact = state.compact.postfix && outputs.postfix.canCompact;
    el.outPostfix.textContent = postfixUseCompact
      ? outputs.postfix.compact
      : outputs.postfix.formatted;

    const prefixUseCompact = state.compact.prefix && outputs.prefix.canCompact;
    el.outPrefix.textContent = prefixUseCompact
      ? outputs.prefix.compact
      : outputs.prefix.formatted;
  }

  function renderOutputsEmpty() {
    el.outInfix.textContent = '—';
    el.outPostfix.textContent = '—';
    el.outPrefix.textContent = '—';
    el.cardInfix.classList.remove('is-source');
    el.cardPostfix.classList.remove('is-source');
    el.cardPrefix.classList.remove('is-source');
    el.sourceTagInfix.classList.add('is-hidden');
    el.sourceTagPostfix.classList.add('is-hidden');
    el.sourceTagPrefix.classList.add('is-hidden');
  }

  function updateTraceKindPills() {
    el.traceKindGroup.querySelectorAll('[data-trace]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.trace === state.traceKind);
    });
  }

  function buildAndRenderTrace() {
    if (!state.result) {
      renderTraceEmpty();
      return;
    }

    const trace = state.result.getTrace(state.traceKind);
    state.traceData = trace;

    if (!trace || trace.steps.length === 0) {
      renderTraceEmpty();
      return;
    }

    el.traceAlgoName.textContent = trace.algorithm;
    el.traceScanDir.textContent = trace.direction;
    el.visualStackTitle.textContent = trace.stackTitle;
    el.visualOutputLabel.textContent = trace.outputTitle;
    el.tableStackCol.textContent = trace.stackTitle;
    el.tableOutputCol.textContent = trace.outputTitle;

    if (trace.reversedInfix) {
      el.reversedInfixWrap.classList.remove('is-hidden');
      el.reversedInfixCode.textContent = trace.reversedInfix.join(' ');
    } else {
      el.reversedInfixWrap.classList.add('is-hidden');
    }

    // Build table rows
    el.traceTableBody.innerHTML = '';
    trace.steps.forEach((step, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.stepIndex = String(idx);

      const tdNum = document.createElement('td');
      tdNum.className = 'mono-cell';
      tdNum.textContent = String(step.step);

      const tdTok = document.createElement('td');
      const tokSpan = document.createElement('span');
      tokSpan.className = `tok-chip is-${step.tokenKind === 'end' ? 'bracket' : step.tokenKind}`;
      tokSpan.textContent = step.token;
      tdTok.appendChild(tokSpan);

      const tdAction = document.createElement('td');
      tdAction.textContent = step.action;

      const tdStack = document.createElement('td');
      tdStack.className = 'mono-cell';
      tdStack.textContent = step.stack.length > 0 ? step.stack.join(' | ') : '∅';

      const tdOut = document.createElement('td');
      tdOut.className = 'mono-cell';
      tdOut.textContent = step.output.length > 0 ? step.output.join(' ') : '—';

      tr.append(tdNum, tdTok, tdAction, tdStack, tdOut);
      tr.addEventListener('click', () => {
        stopTracePlayback();
        setTraceStep(idx);
      });
      el.traceTableBody.appendChild(tr);
    });

    // Show final step by default so user immediately sees complete trace outcome
    setTraceStep(trace.steps.length - 1);
  }

  function setTraceStep(idx) {
    if (!state.traceData || state.traceData.steps.length === 0) return;
    const clamped = Math.max(0, Math.min(idx, state.traceData.steps.length - 1));
    state.traceStepIdx = clamped;
    const step = state.traceData.steps[clamped];

    el.stepCounter.textContent = `Step ${clamped + 1} / ${state.traceData.steps.length}`;
    el.currentStepAction.textContent = step.action;
    el.currentStepOutput.textContent = step.output.length > 0 ? step.output.join(' ') : '—';

    // Update table active row
    el.traceTableBody.querySelectorAll('tr').forEach((row, rIdx) => {
      row.classList.toggle('is-active-row', rIdx === clamped);
    });

    // Update visual stack bucket (bottom-to-top)
    el.visualStackBucket.innerHTML = '';
    el.visualStackDepth.textContent = `${step.stack.length} item${step.stack.length === 1 ? '' : 's'}`;
    if (step.stack.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'stack-empty-hint';
      hint.textContent = 'Empty stack';
      el.visualStackBucket.appendChild(hint);
    } else {
      step.stack.forEach((item, sIdx) => {
        const div = document.createElement('div');
        div.className = `stack-item${sIdx === step.stack.length - 1 ? ' is-top' : ''}`;
        div.textContent = item;
        el.visualStackBucket.appendChild(div);
      });
    }

    highlightActiveInputToken(step);
  }

  function renderTraceEmpty() {
    el.traceTableBody.innerHTML = '';
    el.visualStackBucket.innerHTML = '<div class="stack-empty-hint">Enter a valid expression</div>';
    el.visualStackDepth.textContent = '0 items';
    el.currentStepAction.textContent = '—';
    el.currentStepOutput.textContent = '—';
    el.stepCounter.textContent = 'Step 0 / 0';
    el.reversedInfixWrap.classList.add('is-hidden');
  }

  function renderTree() {
    if (!state.treeLayout) {
      renderTreeEmpty();
      return;
    }

    const mode = state.treeTraversal;
    const isTraversalActive = Boolean(mode);
    el.treePlayerControls.classList.toggle('is-hidden', !isTraversalActive);
    el.treeTraversalOutput.classList.toggle('is-hidden', !isTraversalActive);

    let isStepping = false;
    if (isTraversalActive) {
      const orderIds = state.treeLayout.traversals[mode] || [];
      const total = orderIds.length;
      const shown = Math.max(0, Math.min(state.treeStep, total));
      isStepping = shown > 0;
      el.treeStepCounter.textContent = `${shown} / ${total}`;

      const labelMap = {
        preorder: 'Pre-order (Prefix):',
        inorder: 'In-order (Infix tokens):',
        postorder: 'Post-order (Postfix):'
      };
      el.treeTraversalLabel.textContent = labelMap[mode] || 'Order:';
      el.treeTraversalTokens.innerHTML = '';

      for (let i = 0; i < shown; i += 1) {
        const node = state.treeLayout.nodeById.get(orderIds[i]);
        const span = document.createElement('span');
        span.className = `tok-chip ${node.type === 'op' ? 'is-operator' : 'is-operand'}${
          i === shown - 1 ? ' is-active-token' : ''
        }`;
        span.textContent = node.label;
        el.treeTraversalTokens.appendChild(span);
      }
      if (shown === 0) {
        const empty = document.createElement('span');
        empty.className = 'empty-muted';
        empty.textContent = 'Click Animate or › to step through traversal';
        el.treeTraversalTokens.appendChild(empty);
      }
    }

    Tree.renderSvg(
      el.treeSvgContainer,
      state.treeLayout,
      {
        traversalMode: mode || null,
        traversalStep: state.treeStep,
        isStepping,
        selectedNodeId: state.selectedNodeId
      },
      (nodeId) => {
        state.selectedNodeId = state.selectedNodeId === nodeId ? null : nodeId;
        renderTree();
      }
    );

    renderSubtreeInspector();
  }

  function renderSubtreeInspector() {
    if (!state.treeLayout || !state.selectedNodeId) {
      el.subtreeInspector.innerHTML =
        '<span class="subtree-hint">Tip: Click any node in the tree to inspect its sub-expression in all three notations.</span>';
      return;
    }
    const n = state.treeLayout.nodeById.get(state.selectedNodeId);
    if (!n) return;

    el.subtreeInspector.innerHTML = '';
    const items = [
      ['Node', n.label],
      ['Infix', n.infix],
      ['Postfix', n.postfix],
      ['Prefix', n.prefix]
    ];
    items.forEach(([label, val]) => {
      const wrap = document.createElement('span');
      wrap.className = 'subtree-pill';
      const strong = document.createElement('strong');
      strong.textContent = `${label}:`;
      const code = document.createElement('code');
      code.textContent = val;
      wrap.append(strong, code);
      el.subtreeInspector.appendChild(wrap);
    });
  }

  function renderTreeEmpty() {
    el.treeSvgContainer.innerHTML = '<p class="empty-muted">Enter a valid expression to render its AST.</p>';
    el.treePlayerControls.classList.add('is-hidden');
    el.treeTraversalOutput.classList.add('is-hidden');
    el.subtreeInspector.innerHTML =
      '<span class="subtree-hint">Enter a valid expression to inspect nodes.</span>';
  }

  function renderEvaluate() {
    if (!state.result) {
      renderEvaluateEmpty();
      return;
    }

    const vars = state.result.variables;
    el.variablesContainer.innerHTML = '';

    if (vars.length === 0) {
      const p = document.createElement('p');
      p.className = 'empty-muted';
      p.textContent = 'Expression uses numeric literals only — evaluated automatically.';
      el.variablesContainer.appendChild(p);
      el.fillSampleVarsBtn.classList.add('is-hidden');
      el.clearVarsBtn.classList.add('is-hidden');
    } else {
      el.fillSampleVarsBtn.classList.remove('is-hidden');
      el.clearVarsBtn.classList.remove('is-hidden');
      vars.forEach((v) => {
        const row = document.createElement('div');
        row.className = 'var-row';

        const nameBadge = document.createElement('span');
        nameBadge.className = 'var-name';
        nameBadge.textContent = v;

        const input = document.createElement('input');
        input.type = 'number';
        input.step = 'any';
        input.className = 'var-input';
        input.placeholder = `Value for ${v}`;
        input.setAttribute('aria-label', `Value for variable ${v}`);
        input.value = Object.prototype.hasOwnProperty.call(state.varValues, v)
          ? state.varValues[v]
          : '';
        input.addEventListener('input', () => {
          state.varValues[v] = input.value;
          updateEvalResultOnly();
        });

        row.append(nameBadge, input);
        el.variablesContainer.appendChild(row);
      });
    }

    updateEvalResultOnly();
  }

  function updateEvalResultOnly() {
    if (!state.result) return;
    const evalOut = state.result.evaluate(state.varValues);

    el.evalResultCard.classList.remove('is-error');
    el.evalTraceBody.innerHTML = '';

    if (evalOut.error) {
      el.evalResultCard.classList.add('is-error');
      el.evalResultValue.textContent = evalOut.error;
      el.evalResultNote.textContent = '';
      el.evalBadge.textContent = 'Err';
    } else if (!evalOut.ready) {
      el.evalResultValue.textContent = '—';
      el.evalResultNote.textContent = evalOut.missingVariable
        ? `Enter numeric values for all variables (waiting on '${evalOut.missingVariable}'), or click "Fill Samples".`
        : 'Enter numeric values to evaluate.';
      el.evalBadge.textContent = '';
    } else {
      el.evalResultValue.textContent = evalOut.formattedValue;
      el.evalResultNote.textContent =
        state.result.variables.length === 0
          ? 'Exact evaluation via left-to-right Postfix stack.'
          : 'Evaluated using provided variable values.';
      el.evalBadge.textContent = `= ${evalOut.formattedValue}`;
    }

    evalOut.steps.forEach((st) => {
      const tr = document.createElement('tr');
      const tdNum = document.createElement('td');
      tdNum.className = 'mono-cell';
      tdNum.textContent = String(st.step);

      const tdTok = document.createElement('td');
      const chip = document.createElement('span');
      chip.className = `tok-chip is-${st.tokenKind}`;
      chip.textContent = st.token;
      tdTok.appendChild(chip);

      const tdOp = document.createElement('td');
      tdOp.textContent = st.action;

      const tdStack = document.createElement('td');
      tdStack.className = 'mono-cell';
      tdStack.textContent = st.stack.join(' | ');

      tr.append(tdNum, tdTok, tdOp, tdStack);
      el.evalTraceBody.appendChild(tr);
    });
  }

  function renderEvaluateEmpty() {
    el.variablesContainer.innerHTML = '<p class="empty-muted">Enter a valid expression to evaluate.</p>';
    el.evalResultValue.textContent = '—';
    el.evalResultNote.textContent = '';
    el.evalResultCard.classList.remove('is-error');
    el.evalTraceBody.innerHTML = '';
    el.evalBadge.textContent = '';
  }

  function renderHistory() {
    el.historyList.innerHTML = '';
    if (state.history.length === 0) {
      el.historyList.innerHTML = '<p class="empty-muted">No recent conversions yet.</p>';
      return;
    }

    state.history.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item';

      const exprSpan = document.createElement('span');
      exprSpan.className = 'history-expr';
      exprSpan.textContent = item.expr;

      const metaSpan = document.createElement('span');
      metaSpan.className = 'history-meta';
      metaSpan.textContent = item.notation.toUpperCase();

      btn.append(exprSpan, metaSpan);
      btn.addEventListener('click', () => {
        state.input = item.expr;
        state.notation = item.notation;
        state.userPickedTrace = false;
        el.exprInput.value = item.expr;
        updateSegmented(el.notationGroup, 'notation', item.notation);
        recompute();
        switchTab('trace');
      });
      el.historyList.appendChild(btn);
    });
  }

  // ===== BST Controller =====

  function clearBstHighlights() {
    state.bstSelectedNodeId = null;
    state.bstSearchPathIds = [];
    state.bstSearchFoundId = null;
  }

  function setBstStatus(msg, tone) {
    el.bstOpStatus.textContent = msg;
    el.bstOpStatus.classList.remove('is-warn', 'is-ok');
    if (tone === 'warn') el.bstOpStatus.classList.add('is-warn');
    if (tone === 'ok') el.bstOpStatus.classList.add('is-ok');
  }

  function recomputeBst() {
    const parsed = Bst.parseValues(state.bstInput);
    state.bstNumeric = parsed.isNumeric;

    const built = Bst.buildFromList(parsed.values, parsed.isNumeric);
    state.bstRoot = built.root;

    if (built.duplicates.length > 0) {
      setBstStatus(`Skipped duplicate(s): ${built.duplicates.join(', ')}`, 'warn');
    }

    refreshBstView();
  }

  function refreshBstView() {
    const root = state.bstRoot;
    const stats = Bst.getStats(root);

    el.bstTypeBadge.textContent =
      stats.count === 0
        ? 'Empty BST'
        : state.bstNumeric
        ? 'Numeric BST'
        : 'Lexicographic BST';

    el.bstStatCount.textContent = String(stats.count);
    el.bstStatHeight.textContent = String(stats.height);
    el.bstStatMin.textContent = stats.min !== null ? String(stats.min) : '—';
    el.bstStatMax.textContent = stats.max !== null ? String(stats.max) : '—';

    state.bstLayout = root ? Bst.buildLayout(root) : null;
    renderBstTree();
  }

  function parseSingleOpValue() {
    const raw = (el.bstOpInput.value || '').trim();
    if (!raw) return null;
    const firstTok = raw.split(/[\s,]+/)[0];
    if (!firstTok) return null;
    if (state.bstRoot && state.bstNumeric) {
      if (!/^-?\d+(?:\.\d+)?$/.test(firstTok)) {
        return { error: `Current BST is numeric — enter a number (or rebuild with text).` };
      }
      return { value: Number(firstTok) };
    }
    if (!state.bstRoot) {
      const isNum = /^-?\d+(?:\.\d+)?$/.test(firstTok);
      state.bstNumeric = isNum;
      return { value: isNum ? Number(firstTok) : firstTok };
    }
    return { value: firstTok };
  }

  function syncBstInputFromPreorder() {
    if (!state.bstRoot) {
      state.bstInput = '';
      el.bstListInput.value = '';
      return;
    }
    const preorder = Bst.traversePreorder(state.bstRoot);
    state.bstInput = preorder.join(', ');
    el.bstListInput.value = state.bstInput;
  }

  function handleBstInsert() {
    const parsed = parseSingleOpValue();
    if (!parsed) {
      setBstStatus('Enter a value to insert.', 'warn');
      return;
    }
    if (parsed.error) {
      setBstStatus(parsed.error, 'warn');
      return;
    }
    clearBstHighlights();
    const res = Bst.insertNode(state.bstRoot, parsed.value, state.bstNumeric);
    state.bstRoot = res.node;
    if (res.inserted) {
      setBstStatus(`Inserted ${parsed.value}.`, 'ok');
      syncBstInputFromPreorder();
      refreshBstView();
      if (state.bstLayout) {
        const found = Bst.searchValue(state.bstLayout, parsed.value, state.bstNumeric);
        state.bstSearchPathIds = found.pathIds;
        state.bstSearchFoundId = found.foundId;
        renderBstTree();
      }
    } else {
      setBstStatus(`Skipped duplicate: ${parsed.value} is already in the BST.`, 'warn');
    }
    el.bstOpInput.value = '';
    el.bstOpInput.focus();
  }

  function handleBstDelete() {
    const parsed = parseSingleOpValue();
    if (!parsed) {
      setBstStatus('Enter a value to delete.', 'warn');
      return;
    }
    if (parsed.error) {
      setBstStatus(parsed.error, 'warn');
      return;
    }
    clearBstHighlights();
    const res = Bst.deleteNode(state.bstRoot, parsed.value, state.bstNumeric);
    state.bstRoot = res.node;
    if (res.deleted) {
      setBstStatus(`Deleted ${parsed.value}.`, 'ok');
      syncBstInputFromPreorder();
      refreshBstView();
    } else {
      setBstStatus(`Value ${parsed.value} not found in BST.`, 'warn');
    }
    el.bstOpInput.value = '';
    el.bstOpInput.focus();
  }

  function handleBstSearch() {
    const parsed = parseSingleOpValue();
    if (!parsed) {
      setBstStatus('Enter a value to search.', 'warn');
      return;
    }
    if (parsed.error) {
      setBstStatus(parsed.error, 'warn');
      return;
    }
    if (!state.bstLayout) {
      setBstStatus('BST is empty.', 'warn');
      return;
    }
    state.bstSelectedNodeId = null;
    const res = Bst.searchValue(state.bstLayout, parsed.value, state.bstNumeric);
    state.bstSearchPathIds = res.pathIds;
    state.bstSearchFoundId = res.foundId;
    if (res.found) {
      setBstStatus(
        `Found ${parsed.value} in ${res.pathIds.length} comparison${res.pathIds.length === 1 ? '' : 's'}.`,
        'ok'
      );
    } else {
      setBstStatus(
        `${parsed.value} not found (checked ${res.pathIds.length} node${res.pathIds.length === 1 ? '' : 's'}).`,
        'warn'
      );
    }
    renderBstTree();
  }

  function renderBstTree() {
    if (!state.bstLayout) {
      el.bstSvgContainer.innerHTML =
        '<p class="empty-muted">Enter comma- or space-separated values above to build a BST.</p>';
      el.bstSubtreeInspector.innerHTML =
        '<span class="subtree-hint">Enter values above to build and inspect the BST.</span>';
      return;
    }

    Bst.renderSvg(
      el.bstSvgContainer,
      state.bstLayout,
      {
        traversalMode: null,
        selectedNodeId: state.bstSelectedNodeId,
        searchPathIds: state.bstSearchPathIds,
        searchFoundId: state.bstSearchFoundId
      },
      (nodeId) => {
        state.bstSelectedNodeId = state.bstSelectedNodeId === nodeId ? null : nodeId;
        renderBstTree();
      }
    );

    renderBstSubtreeInspector();
  }

  function renderBstSubtreeInspector() {
    if (!state.bstLayout || !state.bstSelectedNodeId) {
      el.bstSubtreeInspector.innerHTML =
        '<span class="subtree-hint">Tip: Click any node in the BST to inspect its depth, left/right children, and subtree size.</span>';
      return;
    }
    const n = state.bstLayout.nodeById.get(state.bstSelectedNodeId);
    if (!n) return;

    const leftNode = n.leftId ? state.bstLayout.nodeById.get(n.leftId).label : 'null';
    const rightNode = n.rightId ? state.bstLayout.nodeById.get(n.rightId).label : 'null';

    el.bstSubtreeInspector.innerHTML = '';
    const items = [
      ['Node', n.label],
      ['Depth', String(n.depth)],
      ['Left Child', leftNode],
      ['Right Child', rightNode],
      ['Subtree Size', String(n.subtreeIds.length)]
    ];
    items.forEach(([label, val]) => {
      const wrap = document.createElement('span');
      wrap.className = 'subtree-pill';
      const strong = document.createElement('strong');
      strong.textContent = `${label}:`;
      const code = document.createElement('code');
      code.textContent = val;
      wrap.append(strong, code);
      el.bstSubtreeInspector.appendChild(wrap);
    });
  }

  // ===== General Binary Tree Traversals Controller =====

  function stopTravPlayback() {
    if (state.travTimer) {
      clearInterval(state.travTimer);
      state.travTimer = null;
    }
    el.travPlayBtn.textContent = 'Animate';
  }

  function recomputeTraversalTree() {
    stopTravPlayback();
    const tokens = Bst.parseLevelOrder(state.travInput);
    const root = Bst.buildFromLevelOrder(tokens);
    state.travRoot = root;

    if (!root) {
      el.travNodeBadge.textContent = '0 nodes';
      el.travOutInorder.textContent = '—';
      el.travOutPreorder.textContent = '—';
      el.travOutPostorder.textContent = '—';
      state.travLayout = null;
      renderTraversalTree();
      return;
    }

    const stats = Bst.getStats(root);
    el.travNodeBadge.textContent = `${stats.count} node${stats.count === 1 ? '' : 's'}`;
    el.travOutInorder.textContent = Bst.traverseInorder(root).join(' ');
    el.travOutPreorder.textContent = Bst.traversePreorder(root).join(' ');
    el.travOutPostorder.textContent = Bst.traversePostorder(root).join(' ');

    state.travLayout = Bst.buildLayout(root);
    if (state.travOrder && state.travLayout) {
      state.travStep = state.travLayout.traversals[state.travOrder].length;
    }
    renderTraversalTree();
  }

  function renderTraversalTree() {
    if (!state.travLayout) {
      el.travSvgContainer.innerHTML =
        '<p class="empty-muted">Enter level-order values above (use <code>null</code> or <code>_</code> for empty slots).</p>';
      el.travPlayerControls.classList.add('is-hidden');
      el.travOutputBar.classList.add('is-hidden');
      el.travSubtreeInspector.innerHTML =
        '<span class="subtree-hint">Enter values above to build a binary tree and inspect its traversals.</span>';
      return;
    }

    const mode = state.travOrder;
    const isTraversalActive = Boolean(mode);
    el.travPlayerControls.classList.toggle('is-hidden', !isTraversalActive);
    el.travOutputBar.classList.toggle('is-hidden', !isTraversalActive);

    let isStepping = false;
    if (isTraversalActive) {
      const orderIds = state.travLayout.traversals[mode] || [];
      const total = orderIds.length;
      const shown = Math.max(0, Math.min(state.travStep, total));
      isStepping = shown > 0;
      el.travStepCounter.textContent = `${shown} / ${total}`;

      const labelMap = {
        inorder: 'In-order (LNR):',
        preorder: 'Pre-order (NLR):',
        postorder: 'Post-order (LRN):'
      };
      el.travOutputLabel.textContent = labelMap[mode] || 'Order:';
      el.travOutputTokens.innerHTML = '';

      for (let i = 0; i < shown; i += 1) {
        const node = state.travLayout.nodeById.get(orderIds[i]);
        const span = document.createElement('span');
        span.className = `tok-chip is-operand${i === shown - 1 ? ' is-active-token' : ''}`;
        span.textContent = node.label;
        el.travOutputTokens.appendChild(span);
      }
      if (shown === 0) {
        const empty = document.createElement('span');
        empty.className = 'empty-muted';
        empty.textContent = 'Click Animate or › to step through traversal';
        el.travOutputTokens.appendChild(empty);
      }
    }

    Bst.renderSvg(
      el.travSvgContainer,
      state.travLayout,
      {
        traversalMode: mode || null,
        traversalStep: state.travStep,
        isStepping,
        selectedNodeId: state.travSelectedNodeId
      },
      (nodeId) => {
        state.travSelectedNodeId = state.travSelectedNodeId === nodeId ? null : nodeId;
        renderTraversalTree();
      }
    );

    renderTraversalSubtreeInspector();
  }

  function renderTraversalSubtreeInspector() {
    if (!state.travLayout || !state.travSelectedNodeId) {
      el.travSubtreeInspector.innerHTML =
        '<span class="subtree-hint">Tip: Click any node in the tree to inspect its subtree traversals (In-order, Pre-order, Post-order).</span>';
      return;
    }
    const n = state.travLayout.nodeById.get(state.travSelectedNodeId);
    if (!n) return;

    el.travSubtreeInspector.innerHTML = '';
    const items = [
      ['Node', n.label],
      ['Depth', String(n.depth)],
      ['In-order', n.inorder.join(' ')],
      ['Pre-order', n.preorder.join(' ')],
      ['Post-order', n.postorder.join(' ')]
    ];
    items.forEach(([label, val]) => {
      const wrap = document.createElement('span');
      wrap.className = 'subtree-pill';
      const strong = document.createElement('strong');
      strong.textContent = `${label}:`;
      const code = document.createElement('code');
      code.textContent = val;
      wrap.append(strong, code);
      el.travSubtreeInspector.appendChild(wrap);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
