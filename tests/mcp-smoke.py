"""Process-level CLI/MCP contract check against a disposable notebook.
Usage: python3 tests/mcp-smoke.py /absolute/path/to/sticky-todo-api
"""
import json
import subprocess
import sys
import tempfile

binary = sys.argv[1]
with tempfile.TemporaryDirectory(prefix="sticky-mcp-") as kb:
    def cli(*args):
        return subprocess.run([binary, "--kb-path", kb, *args], capture_output=True, text=True, check=True)

    created = json.loads(cli("create", "--date", "2026-11-10", "--text", "Meeting action").stdout)
    process = subprocess.Popen([binary, "--kb-path", kb, "mcp"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    def send(method, params=None, request_id=1):
        message = {"jsonrpc": "2.0", "method": method}
        if params is not None:
            message["params"] = params
        if request_id is not None:
            message["id"] = request_id
        process.stdin.write(json.dumps(message) + "\n")
        process.stdin.flush()
        return json.loads(process.stdout.readline()) if request_id is not None else None

    try:
        initialized = send("initialize", {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "meeting-summary-test", "version": "1"}})
        assert initialized["result"]["protocolVersion"] == "2025-11-25"
        send("notifications/initialized", request_id=None)
        assert len(send("tools/list")["result"]["tools"]) == 4
        result = send("tools/call", {"name": "todo_list", "arguments": {"date": "2026-11-10"}})["result"]
        day = result["structuredContent"]["dates"][0]
        assert day["tasks"][0]["id"] == created["task"]["id"]
        args = {"date": day["date"], "id": created["task"]["id"], "text": "Send minutes\nInclude decisions", "expectedRevision": day["revision"]}
        edited = send("tools/call", {"name": "todo_edit", "arguments": args})["result"]
        assert not edited["isError"]
        assert send("tools/call", {"name": "todo_edit", "arguments": args})["result"]["isError"]
        saved = json.loads(cli("list", "--date", day["date"]).stdout)
        assert saved["dates"][0]["tasks"][0]["text"] == args["text"]
    finally:
        process.stdin.close()
        process.wait(timeout=10)
        errors = process.stderr.read()
        assert process.returncode == 0, errors
        assert not errors, errors
    missing_command = subprocess.run([binary, "--kb-path", kb], capture_output=True, text=True)
    assert missing_command.returncode == 1
    assert "Missing command" in json.loads(missing_command.stderr)["error"]["message"]
print("CLI/MCP process smoke passed; no personal notebook used")
