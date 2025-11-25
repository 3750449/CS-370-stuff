#!/usr/bin/env bash
set -euo pipefail

# Simple backend smoke test for StudyLink API.
# Covers auth plus file upload/download/delete/bookmark flows.
# Usage: bash test_automated.sh http://localhost:8199

command -v python3 >/dev/null || {
  echo "python3 is required to run this script." >&2
  exit 1
}

BASE_URL=${1:-"http://localhost:8199"}
BASE_URL=${BASE_URL%/}  # Remove trailing slash if present
JSON_HDR=( -H "Content-Type: application/json" )

pass=0; fail=0
CLEANUP_FILES=()

hr() { printf '\n%s\n' "----------------------------------------"; }
ok() { echo "✅  $1"; pass=$((pass+1)); }
bad() { echo "❌  $1 (got $2, expected $3)"; fail=$((fail+1)); }

cleanup() {
  rm -f "${CLEANUP_FILES[@]:-}"
}
trap cleanup EXIT

curl_code() {
  local method=$1; shift
  local url=$1; shift
  local data=${1:-}
  if [[ -n "$data" ]]; then
    curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" "${JSON_HDR[@]}" -d "$data"
  else
    curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" "${JSON_HDR[@]}"
  fi
}

assert_code() {
  local name=$1; shift
  local got=$1; shift
  local expect=$1; shift
  if [[ "$got" == "$expect" ]]; then ok "$name"; else bad "$name" "$got" "$expect"; fi
}

hr; echo "Testing against: $BASE_URL"; hr

RUN_ID=$(date +%s)
TEST_EMAIL="autotest_${RUN_ID}@school.edu"
UNKNOWN_EMAIL="ghost_${RUN_ID}@school.edu"
INVALID_EMAIL="autotest_${RUN_ID}@school.com"
PASSWORD_OK="password123"
PASSWORD_BAD="password122"
PASSWORD_SHORT="short"

# 1) Login fail: unknown email → expect 401
code=$(curl_code POST "$BASE_URL/api/auth/login" "{\"email\":\"$UNKNOWN_EMAIL\",\"password\":\"$PASSWORD_OK\"}")
assert_code "Login (unknown email) → 401" "$code" 401

# 2) Register fail: short password → expect 400
code=$(curl_code POST "$BASE_URL/api/auth/register" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$PASSWORD_SHORT\"}")
assert_code "Register (short password) → 400" "$code" 400

# 3) Register fail: non-.edu → expect 400
code=$(curl_code POST "$BASE_URL/api/auth/register" "{\"email\":\"$INVALID_EMAIL\",\"password\":\"$PASSWORD_OK\"}")
assert_code "Register (non-.edu) → 400" "$code" 400

# 4) Register success → expect 201
code=$(curl_code POST "$BASE_URL/api/auth/register" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$PASSWORD_OK\"}")
assert_code "Register (success) → 201" "$code" 201

# 5) Register duplicate → expect 409
code=$(curl_code POST "$BASE_URL/api/auth/register" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$PASSWORD_OK\"}")
assert_code "Register (duplicate) → 409" "$code" 409

# 6) Login success → expect 200
code=$(curl_code POST "$BASE_URL/api/auth/login" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$PASSWORD_OK\"}")
assert_code "Login (success) → 200" "$code" 200

# 7) Login wrong password → expect 401
code=$(curl_code POST "$BASE_URL/api/auth/login" "{\"email\":\"$TEST_EMAIL\",\"password\":\"$PASSWORD_BAD\"}")
assert_code "Login (wrong password) → 401" "$code" 401

# Acquire JWT token for subsequent tests
login_body=$(curl -s -X POST "$BASE_URL/api/auth/login" "${JSON_HDR[@]}" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$PASSWORD_OK\"}")
TOKEN=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])' <<<"$login_body")
USER_ID=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["user"]["id"])' <<<"$login_body")

if [[ -z "$TOKEN" || -z "$USER_ID" ]]; then
  bad "Extract JWT token" "missing" "token present"
else
  ok "Extract JWT token"
fi

# Prepare temporary file for upload tests
UPLOAD_FILE=$(mktemp)
CLEANUP_FILES+=("$UPLOAD_FILE")
echo "Automated test upload $(date -u +"%Y-%m-%dT%H:%M:%SZ")" > "$UPLOAD_FILE"

UPLOAD_RESP=$(mktemp)
CLEANUP_FILES+=("$UPLOAD_RESP")
code=$(curl -s -o "$UPLOAD_RESP" -w "%{http_code}" -X POST "$BASE_URL/api/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$UPLOAD_FILE")
assert_code "File upload (auth) → 201" "$code" 201

FILE_ID=$(python3 -c 'import json,sys; data=json.load(sys.stdin); print(data.get("id",""))' < "$UPLOAD_RESP")
if [[ -z "$FILE_ID" ]]; then
  bad "Parse uploaded file ID" "missing" "numeric id"
else
  ok "Parse uploaded file ID → $FILE_ID"
fi

# List files and ensure uploaded file appears
FILES_RESP=$(mktemp)
CLEANUP_FILES+=("$FILES_RESP")
code=$(curl -s -o "$FILES_RESP" -w "%{http_code}" "$BASE_URL/api/files")
assert_code "List files (public) → 200" "$code" 200

if python3 - "$FILE_ID" "$FILES_RESP" <<'PY'
import json, sys
file_id = int(sys.argv[1])
with open(sys.argv[2]) as fh:
    rows = json.load(fh)
sys.exit(0 if any(int(item["id"]) == file_id for item in rows) else 1)
PY
then
  ok "Uploaded file present in list"
else
  bad "Uploaded file present in list" "missing" "found"
fi

# Download file and validate content
DOWNLOAD_FILE=$(mktemp)
CLEANUP_FILES+=("$DOWNLOAD_FILE")
code=$(curl -s -o "$DOWNLOAD_FILE" -w "%{http_code}" "$BASE_URL/api/files/$FILE_ID")
assert_code "Download file (public) → 200" "$code" 200
if cmp -s "$UPLOAD_FILE" "$DOWNLOAD_FILE"; then
  ok "Downloaded file matches uploaded content"
else
  bad "Downloaded file matches uploaded content" "mismatch" "identical"
fi

# Bookmark file
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/files/$FILE_ID/bookmark" \
  -H "Authorization: Bearer $TOKEN")
assert_code "Bookmark file → 201" "$code" 201

# Verify bookmark list
BOOKMARKS_RESP=$(mktemp)
CLEANUP_FILES+=("$BOOKMARKS_RESP")
code=$(curl -s -o "$BOOKMARKS_RESP" -w "%{http_code}" "$BASE_URL/api/files/bookmarks" \
  -H "Authorization: Bearer $TOKEN")
assert_code "List bookmarks → 200" "$code" 200
if python3 - "$FILE_ID" "$BOOKMARKS_RESP" <<'PY'
import json, sys
file_id = int(sys.argv[1])
with open(sys.argv[2]) as fh:
    rows = json.load(fh)
sys.exit(0 if any(int(item["id"]) == file_id for item in rows) else 1)
PY
then
  ok "Uploaded file present in bookmarks"
else
  bad "Uploaded file present in bookmarks" "missing" "found"
fi

# Remove bookmark
code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/files/$FILE_ID/bookmark" \
  -H "Authorization: Bearer $TOKEN")
assert_code "Unbookmark file → 204" "$code" 204

# Delete file
code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN")
assert_code "Delete file (owner) → 204" "$code" 204

# Ensure file is gone
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/files/$FILE_ID")
assert_code "Download deleted file → 404" "$code" 404

hr; echo "Pass: $pass   Fail: $fail"; hr
if [[ $fail -eq 0 ]]; then exit 0; else exit 1; fi