# TinyChess 

Tiny chess engine for learning purposes

Built with fastapi and vanilla react

## Setup

```bash
uv venv .venv
source .venv/bin/activate
uv pip install -r requirements.txt

cd frontend 
npm install
cd ..

fastapi dev
```

Then navigate to http://127.0.0.1:8000/

## Running training scripts interactively (REPL)

The training scripts (e.g. `training/llm.py`) support cell-by-cell execution using `# %%` cell markers, compatible with any Jupyter kernel-based REPL (VS Code, Zed, JupyterLab, etc.).

**Setup:**

```bash
uv pip install ipykernel
```

Then in your editor, select the `.venv` Python environment as your kernel and run cells with the editor's REPL shortcut (`shift+enter` in most IDEs).
