#!/usr/bin/env bash
# run_tests.sh - Compiles every tests/programs/*.mcpp with mcpc, runs the
# resulting native executable, and checks its stdout + exit code against
# the matching *.expected file (stdout lines, then a final "EXIT:<code>" line).
set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCPC="${MCPC:-$SCRIPT_DIR/../build/mcpc}"
PROG_DIR="$SCRIPT_DIR/programs"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass=0
fail=0

for src in "$PROG_DIR"/*.mcpp; do
    name="$(basename "$src" .mcpp)"
    expected="$PROG_DIR/$name.expected"
    bin="$TMP/$name"

    if ! "$MCPC" "$src" -o "$bin" > "$TMP/compile.log" 2>&1; then
        echo "FAIL $name (compile error)"
        cat "$TMP/compile.log"
        fail=$((fail+1))
        continue
    fi

    stdout="$("$bin" 2>"$TMP/stderr.log")"
    exitcode=$?

    actual="$stdout"
    if [ -n "$actual" ]; then actual="$actual"$'\n'"EXIT:$exitcode"; else actual="EXIT:$exitcode"; fi

    expected_content="$(cat "$expected")"

    if [ "$actual" == "$expected_content" ]; then
        echo "PASS $name"
        pass=$((pass+1))
    else
        echo "FAIL $name"
        echo "  expected: $(echo "$expected_content" | tr '\n' '|')"
        echo "  actual:   $(echo "$actual" | tr '\n' '|')"
        fail=$((fail+1))
    fi
done

echo ""
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
