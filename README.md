# NotationForge

An interactive, zero-dependency web application for Data Structures:

1. **Expression Converter** — Convert between **Infix**, **Postfix (RPN)**, and **Prefix (Polish)** notations with auto-detection, step-by-step stack traces, AST visualization, and numeric/variable evaluation.
2. **Binary Search Tree (BST)** — Build, insert, delete (including 2-child inorder successor), search with highlighted paths, and inspect node depth, children, and subtree size.
3. **Tree Traversals** — Build any general Binary Tree from level-order input (with `null` / `_` support) and animate **In-order (LNR)**, **Pre-order (NLR)**, and **Post-order (LRN)** traversals.

## Running Locally

- **Direct**: Open `index.html` in any modern browser.
- **Local Server**:
  ```bash
  node server.js
  ```
  Then open `http://127.0.0.1:8123/`.

## Running Tests

```bash
node --test tests/engine.test.js
```
