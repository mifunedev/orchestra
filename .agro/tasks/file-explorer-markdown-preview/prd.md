# PRD: File explorer placement and Markdown preview

Status: DRAFT

## User Stories

### US-001: Place the explorer to the right

**Description:** As a user, I want the file explorer to the right of the file editor so that the editor sits next to chat.

**Acceptance Criteria:**

- [ ] On desktop, the file editor appears to the left of the explorer within `FileEditorPanel`.
- [ ] On desktop, the resize handle stays between the editor and the explorer, and collapsing the explorer leaves the editor visible.
- [ ] On mobile, selecting a file still hides the explorer and shows the editor; the explorer toggle still restores the tree.
- [ ] Verify in browser using agent-browser skill.

### US-002: Preview Markdown when a file opens

**Description:** As a user, I want Markdown files to open in preview so that I can read formatted content first.

**Acceptance Criteria:**

- [ ] Opening a `.md` file renders `MarkdownCard` before the user presses the preview button.
- [ ] The preview button changes the selected `.md` file to code, then changes it back to preview.
- [ ] Selecting another `.md` file starts in preview, including after the user viewed code in an earlier file.
- [ ] `.html`, `.htm`, and `.mmd` files still open in code; non-previewable files still open in the editor.
- [ ] Verify in browser using agent-browser skill.

### US-003: Group file actions in one menu

**Description:** As a user, I want one three-dot button for file actions so that the file header has fewer buttons.

**Acceptance Criteria:**

- [ ] The file header shows one three-dot action button instead of separate inference, dictation, preview, copy, download, and ZIP buttons.
- [ ] The menu exposes labeled actions for inference mode, dictation, preview or code, copy, download, and ZIP download when each action applies.
- [ ] The preview or code action changes the selected file view without changing the Markdown preview default.
- [ ] The menu preserves the existing recording and generation disabled states; new-file and tab-close buttons stay in place.
- [ ] Keyboard users can open the menu, select an action, and close it with Escape.
- [ ] Verify in browser using agent-browser skill.

## Summary

`frontend/src/components/panels/FileEditorPanel.tsx` places `FileTreeSidebar` before the file editor in a horizontal `PanelGroup`. The tree takes 20 percent of that group by default. The editor takes 80 percent. The same component renders inside chat, thread, and project pages. Move the editor ahead of the tree within the component. Keep the current mobile tree and editor behavior.

The component initializes `showPreview` to `false`. It renders Markdown through `MarkdownCard` only when the user enables preview. Start each selected `.md` file in preview. Keep an explicit code toggle for the selected file. Do not change the initial mode of HTML or Mermaid files. Replace the file action buttons beside the tabs with one three-dot menu. Keep the new-file and tab-close controls outside that menu.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `frontend/src/components/panels/FileEditorPanel.tsx` | `FileEditorPanel`, `PanelGroup`, `Panel`, `PanelResizeHandle` | Own the explorer and editor order, resize handle, and mobile visibility. |
| `frontend/src/components/panels/FileEditorPanel.tsx` | `selectedFile`, `showPreview`, `effectiveShowPreview`, `isMarkdownFile`, `MarkdownCard` | Select the initial view for each file and handle the preview button. |
| `frontend/src/components/ui/dropdown-menu.tsx` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` | Provide the existing accessible menu controls. |
| `frontend/src/components/panels/FileTree/FileTreeSidebar.tsx` | `FileTreeSidebar` | Keep the existing tree controls and file selection callback. |
| `frontend/src/tests/components/FileEditorPanel.delete-flow.test.tsx` | `renderHarness` | Provide a mocked editor context and file selection fixtures. |
| `frontend/src/tests/components/FileEditorPanel.manual-save.test.tsx` | `FileEditorPanel` | Preserve code editing and manual save behavior. |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| Desktop Files panel | Layout | Show the file editor on the left and the resizable explorer on the right. |
| Mobile Files panel | Regression guard | Keep the single-pane explorer and editor transition. |
| Markdown file view | Default and toggle | Show rendered Markdown first and keep a code view menu action. |
| File action header | Consolidation | Show one three-dot menu for file actions beside the tabs. |

## Storage

N/A. The preview choice stays in component state. No schema or persistent preference changes.

## Architectural Decisions

Keep `FileEditorPanel` as the layout owner. Do not change the outer chat and Files split that places chat on the left. Derive the initial preview from the selected file extension. Scope a manual code or preview choice to the selected file, so that the next Markdown file opens in preview. Keep the current code-first behavior for HTML and Mermaid files. Preserve the desktop resize and mobile collapse controls. Keep the new-file and tab-close buttons outside the menu.

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| `frontend/src/tests/components/FileEditorPanel.layout.test.tsx` | Render the desktop group with a file; inspect the editor, handle, and tree order. | The explorer moves right without removing the resize handle. |
| `frontend/src/tests/components/FileEditorPanel.layout.test.tsx` | Open a Markdown file, switch to code and back, then select another Markdown file. | Markdown starts in preview per selected file; the button remains reversible. |
| `frontend/src/tests/components/FileEditorPanel.layout.test.tsx` | Open HTML, Mermaid, and plain text fixtures; use a mobile fixture to select a file and restore the tree. | Other file modes and mobile controls remain unchanged. |
| `frontend/src/tests/components/FileEditorPanel.layout.test.tsx` | Open the menu with a keyboard; select each available action, inspect disabled states, and close with Escape. | The menu replaces the file action row without losing actions. |
| `frontend/src/tests/components/FileEditorPanel.manual-save.test.tsx` | Run the existing manual save tests. | Code editing and save behavior remain intact. |

Add the new tests first. Confirm that the layout and Markdown-default tests fail before implementation. In `frontend/`, run `npm test -- src/tests/components/FileEditorPanel.layout.test.tsx` for focused tests. Run `npm test`, `npm run lint`, and `npm run build` before delivery. Run `git diff --check` in the repository root.

## Design Principles

Keep one state source for the selected file. Keep the current file operations, resizing, and mobile visibility rules. Do not add explanatory comments to tracked code. Use the running development environment and the main Orchestra checkout for sequential work.

## Out of Scope

Do not move the outer Files panel relative to chat. Do not change preview defaults for HTML or Mermaid. Do not add a stored preview preference or change shared-thread layout. Keep the new-file button and tab-close controls in the tab row.

## Open Questions

None.

## Acceptance Criteria

- [ ] All three stories pass their listed criteria and browser checks.
- [ ] `npm test`, `npm run lint`, and `npm run build` pass in `frontend/`.
- [ ] `git diff --check` passes in the repository root.

## Lessons

None.
