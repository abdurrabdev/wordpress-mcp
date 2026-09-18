# WordPress keeps revisions for supported content types when revisions are enabled.
# This module intentionally contains no destructive rollback operation.
def revision_note(action, target):
    return f"MCP change: {action} -> {target}"
