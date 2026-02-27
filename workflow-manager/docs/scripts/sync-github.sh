#!/bin/bash

# GitHub Sync Script
# 
# Synchronizes local markdown planning/workflow/feature/task documents with GitHub Issues
# Supports creating, updating, and linking issues with local documents
# 
# Usage:
#   ./scripts/sync-github.sh --sync-all
#   ./scripts/sync-github.sh --sync-planning
#   ./scripts/sync-github.sh --sync-workflow
#   ./scripts/sync-github.sh --sync-file docs/workflow/001-poc-agent-registration-draft.md
#   ./scripts/sync-github.sh --create-milestone "Epic: Agent Management"
#   ./scripts/sync-github.sh --ensure-labels

set -e  # Exit on any error

# Optional env bootstrap (.env.github)
# Priority:
# 1) GITHUB_ENV_FILE (explicit path)
# 2) ./.env.github (current working directory)
# 3) workflow-manager/.env.github
# 4) repository-root/.env.github
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKFLOW_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROJECT_ROOT="$(cd "${WORKFLOW_ROOT}/.." && pwd)"
ENV_SOURCE_FILE=""

if [[ -n "${GITHUB_ENV_FILE:-}" && -f "${GITHUB_ENV_FILE}" ]]; then
    ENV_SOURCE_FILE="${GITHUB_ENV_FILE}"
elif [[ -f "./.env.github" ]]; then
    ENV_SOURCE_FILE="./.env.github"
elif [[ -f "${WORKFLOW_ROOT}/.env.github" ]]; then
    ENV_SOURCE_FILE="${WORKFLOW_ROOT}/.env.github"
elif [[ -f "${PROJECT_ROOT}/.env.github" ]]; then
    ENV_SOURCE_FILE="${PROJECT_ROOT}/.env.github"
fi

if [[ -n "$ENV_SOURCE_FILE" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$ENV_SOURCE_FILE"
    set +a
fi

# Configuration
GITHUB_OWNER="${GITHUB_OWNER:-your-username}"
GITHUB_REPO="${GITHUB_REPO:-ut-tools-manager}"
GITHUB_TOKEN="${GITHUB_TOKEN}"
SEARCH_MIN_INTERVAL_SEC="${SEARCH_MIN_INTERVAL_SEC:-2}"
LAST_SEARCH_TS=0
ISSUES_CACHE=""
ISSUES_CACHE_LOADED=0

# Paths
WORKFLOW_DIR="./docs/workflow"
PLANNING_DIR="./docs/planning"
FEATURES_DIR="./docs/features"
TASKS_DIR="./docs/tasks"
EPICS_DIR="./docs/epics"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_skip() {
    echo -e "${YELLOW}⏭️  $1${NC}"
}

# Check dependencies
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed. Install with: brew install jq"
        exit 1
    fi
    
    if [[ -z "$GITHUB_TOKEN" ]]; then
        log_error "GITHUB_TOKEN environment variable is required"
        log_info "Tip: create/use .env.github and run script from workflow-manager/, or set GITHUB_ENV_FILE"
        log_info "Create a personal access token at: https://github.com/settings/tokens"
        exit 1
    fi
}

# GitHub API helper function
github_api() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    local url="https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${endpoint}"
    
    if [[ -n "$data" ]]; then
        curl -s -X "$method" \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url"
    else
        curl -s -X "$method" \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            "$url"
    fi
}

# GitHub Search API helper (for issues)
github_search_api() {
    local query="$1"
    local encoded_query
    encoded_query=$(printf '%s' "$query" | jq -sRr @uri)
    local url="https://api.github.com/search/issues?q=${encoded_query}"

    local now
    now=$(date +%s)
    if [[ "$LAST_SEARCH_TS" -gt 0 ]]; then
        local elapsed=$(( now - LAST_SEARCH_TS ))
        if [[ "$elapsed" -lt "$SEARCH_MIN_INTERVAL_SEC" ]]; then
            sleep $(( SEARCH_MIN_INTERVAL_SEC - elapsed ))
        fi
    fi
    LAST_SEARCH_TS=$(date +%s)

    local response
    response=$(curl -s -X "GET" \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "$url")

    local message
    message=$(echo "$response" | jq -r '.message // empty' 2>/dev/null || true)
    if [[ "$message" == *"rate limit"* ]]; then
        log_warning "GitHub search rate limit hit. Sleeping 60s and retrying..."
        sleep 60
        response=$(curl -s -X "GET" \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            "$url")
    fi

    echo "$response"
}

# Compute stable sync id from file path (used for dedupe/linking)
get_sync_id_for_file() {
    local file="$1"
    local normalized
    normalized="${file#./}"
    echo "workflow-doc:${normalized}"
}

# Validate GitHub search response has items array
ensure_search_items() {
    local response="$1"

    if ! echo "$response" | jq -e '.items | type=="array"' >/dev/null 2>&1; then
        local message
        message=$(echo "$response" | jq -r '.message // empty' 2>/dev/null || true)
        if [[ -n "$message" ]]; then
            log_error "GitHub search failed: $message"
        else
            log_error "GitHub search failed: unexpected response"
        fi
        return 1
    fi
    return 0
}

# Fetch all issues (state=all) and cache the result (excludes PRs)
load_issues_cache() {
    if [[ "$ISSUES_CACHE_LOADED" -eq 1 ]]; then
        return
    fi

    local page=1
    local all="[]"

    while true; do
        local response
        response=$(github_api "GET" "/issues?state=all&per_page=100&page=${page}")

        if ! echo "$response" | jq -e 'type=="array"' >/dev/null 2>&1; then
            local message
            message=$(echo "$response" | jq -r '.message // empty' 2>/dev/null || true)
            if [[ -n "$message" ]]; then
                log_error "Failed to list issues: $message"
            else
                log_error "Failed to list issues: unexpected response"
            fi
            break
        fi

        local page_count
        page_count=$(echo "$response" | jq -r 'length')
        if [[ "$page_count" -eq 0 ]]; then
            break
        fi

        local filtered
        filtered=$(echo "$response" | jq '[.[] | select(.pull_request | not)]')
        all=$(jq -s '.[0] + .[1]' <(echo "$all") <(echo "$filtered"))

        page=$((page + 1))
    done

    ISSUES_CACHE="$all"
    ISSUES_CACHE_LOADED=1
}

# Extract document type from filename/path and normalize it for labels/title prefixes
extract_doc_type_from_file() {
    local file="$1"
    local file_name
    file_name=$(basename "$file")

    if [[ "$file_name" =~ ^[0-9]{3}-([a-z_]+)- ]]; then
        local type
        type="${BASH_REMATCH[1]}"
        case "$type" in
            prd|backlog|requirements|epic|feature|task|poc)
                echo "$type"
                return
                ;;
        esac
    fi

    if [[ "$file_name" == *"-prd-"* ]]; then
        echo "prd"
    elif [[ "$file_name" == *"-backlog-"* ]]; then
        echo "backlog"
    elif [[ "$file_name" == *"-requirements-"* ]]; then
        echo "requirements"
    elif [[ "$file_name" == *"-epic-"* ]]; then
        echo "epic"
    elif [[ "$file_name" == *"-task-"* ]]; then
        echo "task"
    elif [[ "$file_name" == *"-feature-"* ]]; then
        echo "feature"
    elif [[ "$file_name" == *"-poc-"* ]]; then
        echo "poc"
    elif [[ "$file" == *"/planning/"* ]]; then
        echo "planning"
    elif [[ "$file" == *"/workflow/"* ]]; then
        echo "workflow"
    else
        echo "documentation"
    fi
}

# Extract 3-digit document id from filename when available
extract_doc_id_from_file() {
    local file="$1"
    local file_name
    file_name=$(basename "$file")

    if [[ "$file_name" =~ ^([0-9]{3})- ]]; then
        echo "${BASH_REMATCH[1]}"
        return
    fi

    echo ""
}

# Extract short description segment from file naming convention
extract_short_description_from_file() {
    local file="$1"
    local file_name
    file_name=$(basename "$file")

    if [[ "$file_name" =~ ^[0-9]{3}-[a-z_]+-(.+)-[a-z_]+\.md$ ]]; then
        echo "${BASH_REMATCH[1]}" | tr '-' ' '
        return
    fi

    echo ""
}

# Remove well-known heading prefixes to keep issue titles concise
normalize_heading_title() {
    local raw_title="$1"
    echo "$raw_title" | \
        sed -E 's/^(Feature|Task|Epic|POC|PRD|Product Backlog|Requirements Definition):\s*//I' | \
        sed -E 's/\s+/ /g' | \
        xargs
}

# Build standardized GitHub issue title: [TYPE-ID] title
generate_standardized_issue_title() {
    local file="$1"
    local raw_title="$2"
    local doc_type
    local doc_id
    local normalized_title
    local short_description
    local prefix

    doc_type=$(extract_doc_type_from_file "$file")
    doc_id=$(extract_doc_id_from_file "$file")
    normalized_title=$(normalize_heading_title "$raw_title")
    short_description=$(extract_short_description_from_file "$file")

    if [[ -z "$normalized_title" ]]; then
        normalized_title="$short_description"
    fi

    if [[ -z "$normalized_title" ]]; then
        normalized_title="untitled-document"
    fi

    prefix=$(echo "$doc_type" | tr '[:lower:]' '[:upper:]')

    # Avoid duplicated prefixes in titles when markdown heading already starts with [TYPE-ID]
    # Example: heading "[TASK-001] ..." + generated prefix "[TASK-001] ..." => keep only one.
    if [[ -n "$doc_id" ]]; then
        normalized_title=$(echo "$normalized_title" | sed -E "s/^\\[${prefix}-${doc_id}\\][[:space:]]*//I")
    fi

    if [[ -n "$doc_id" ]]; then
        echo "[${prefix}-${doc_id}] ${normalized_title}"
    else
        echo "[${prefix}] ${normalized_title}"
    fi
}

# Extract metadata from markdown file
extract_metadata() {
    local file="$1"
    local content
    content=$(cat "$file")
    local status_line
    local priority_line
    local entity_line

    # Reset extracted values per file
    title=""
    github_issue=""
    status=""
    priority=""
    entity=""
    task_id=""
    assignee=""
    
    # Extract title and normalize to a consistent GitHub issue naming convention
    title=$(echo "$content" | grep -E "^#\s+" | head -1 | sed 's/^#\s*//' | sed 's/{[^}]*}//g' | xargs)
    title=$(generate_standardized_issue_title "$file" "$title")
    
    # Extract GitHub Issue number
    github_issue=$(echo "$content" | grep -E "\*\*GitHub Issue\*\*:" | sed -E 's/.*#([0-9]+).*/\1/' | head -1)
    if [[ ! "$github_issue" =~ ^[0-9]+$ ]]; then
        github_issue=""
    fi
    
    # Extract status (supports markdown with or without backticks)
    status_line=$(echo "$content" | grep -E "\*\*Status\*\*:" | head -1)
    status=$(echo "$status_line" | sed -E 's/.*`([^`]+)`.*/\1/')
    if [[ "$status" == "$status_line" ]]; then
        status=$(echo "$status_line" | sed -E 's/.*\*\*Status\*\*:\s*([^ ]+).*/\1/' | tr -d '*`')
    fi
    status=$(echo "$status" | tr -d '\r' | xargs)

    # Extract priority (supports markdown with or without backticks)
    priority_line=$(echo "$content" | grep -E "\*\*Priority\*\*:" | head -1)
    priority=$(echo "$priority_line" | sed -E 's/.*`([^`]+)`.*/\1/')
    if [[ "$priority" == "$priority_line" ]]; then
        priority=$(echo "$priority_line" | sed -E 's/.*\*\*Priority\*\*:\s*([^ ]+).*/\1/' | tr -d '*`')
    fi
    priority=$(echo "$priority" | tr -d '\r' | xargs)

    # Extract entity (supports markdown with or without backticks)
    entity_line=$(echo "$content" | grep -E "\*\*Entity\*\*:" | head -1)
    entity=$(echo "$entity_line" | sed -E 's/.*`([^`]+)`.*/\1/')
    if [[ "$entity" == "$entity_line" ]]; then
        entity=$(echo "$entity_line" | sed -E 's/.*\*\*Entity\*\*:\s*([^ ]+).*/\1/' | tr -d '*`')
    fi
    entity=$(echo "$entity" | tr -d '\r' | xargs)
    
    # Extract task ID
    task_id=$(echo "$content" | grep -E "\*\*Task ID\*\*:" | sed -E 's/.*`\[([^\]]+)\]`.*/\1/' | head -1)
    
    # Extract assignee (must be a valid GitHub username)
    assignee=$(echo "$content" | grep -E "\*\*Assignee\*\*:" | sed -E 's/.*`([^`]+)`.*/\1/' | head -1)
    
    # Only set assignee if it looks like a valid GitHub username (no spaces, not generic terms)
    if [[ -n "$assignee" && "$assignee" != "Development Team" && "$assignee" != "TBD" && "$assignee" != "N/A" && "$assignee" != "{assignee}" && ! "$assignee" =~ [[:space:]] ]]; then
        echo "ℹ️  Setting assignee: $assignee"
    else
        assignee=""
    fi
}

# Find existing GitHub issue by exact title (includes open + closed)
find_existing_issue_by_title() {
    local issue_title="$1"

    if [[ -z "$issue_title" ]]; then
        return 1
    fi

    local query="repo:${GITHUB_OWNER}/${GITHUB_REPO} type:issue in:title \"${issue_title}\""
    local response
    response=$(github_search_api "$query")

    if ! ensure_search_items "$response"; then
        return 1
    fi

    local match_count
    match_count=$(echo "$response" | jq -r --arg title "$issue_title" '[.items[] | select(.title == $title)] | length')

    if [[ -z "$match_count" || "$match_count" -eq 0 ]]; then
        return 1
    fi

    local issue_number
    issue_number=$(echo "$response" | jq -r --arg title "$issue_title" '[.items[] | select(.title == $title)] | sort_by(.number) | .[0].number')
    local issue_state
    issue_state=$(echo "$response" | jq -r --arg title "$issue_title" '[.items[] | select(.title == $title)] | sort_by(.number) | .[0].state')

    if [[ "$match_count" -gt 1 ]]; then
        log_warning "Multiple issues match title \"$issue_title\". Using #$issue_number"
    fi

    echo "${issue_number}|${issue_state}"
    return 0
}

# Find existing GitHub issue by sync id (includes open + closed)
find_existing_issue_by_sync_id() {
    local sync_id="$1"

    if [[ -z "$sync_id" ]]; then
        return 1
    fi

    local query="repo:${GITHUB_OWNER}/${GITHUB_REPO} type:issue in:body \"sync-id:${sync_id}\""
    local response
    response=$(github_search_api "$query")

    if ! ensure_search_items "$response"; then
        return 1
    fi

    local match_count
    match_count=$(echo "$response" | jq -r '[.items[]] | length')

    if [[ -z "$match_count" || "$match_count" -eq 0 ]]; then
        return 1
    fi

    local issue_number
    issue_number=$(echo "$response" | jq -r '.items | sort_by(.number) | .[0].number')
    local issue_state
    issue_state=$(echo "$response" | jq -r '.items | sort_by(.number) | .[0].state')

    if [[ "$match_count" -gt 1 ]]; then
        log_warning "Multiple issues match sync-id \"$sync_id\". Using #$issue_number"
    fi

    echo "${issue_number}|${issue_state}"
    return 0
}

# Generate labels for GitHub issue
generate_labels() {
    local file_path="$1"
    local labels=()
    local doc_type
    local entity_slug
    local unique_labels
    doc_type=$(extract_doc_type_from_file "$file_path")
    
    # Determine type from naming convention and path
    case "$doc_type" in
        "prd")
            labels+=("prd" "planning" "documentation")
            ;;
        "backlog")
            labels+=("backlog" "planning" "documentation")
            ;;
        "requirements")
            labels+=("requirements" "planning" "documentation")
            ;;
        "epic")
            labels+=("epic" "milestone")
            ;;
        "feature")
            labels+=("feature" "enhancement")
            ;;
        "task")
            labels+=("task" "development")
            ;;
        "poc")
            labels+=("poc" "research")
            ;;
        "planning")
            labels+=("planning" "documentation")
            ;;
        "workflow")
            labels+=("workflow" "documentation")
            ;;
        *)
            labels+=("documentation")
            ;;
    esac
    
    # Add priority label
    case "$priority" in
        "high") labels+=("priority:high") ;;
        "medium") labels+=("priority:medium") ;;
        "low") labels+=("priority:low") ;;
    esac
    
    # Add entity label (whitelisted to avoid GitHub validation errors)
    if [[ -n "$entity" ]]; then
        entity_slug=$(echo "$entity" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_-]+/-/g' | sed -E 's/^-+|-+$//g')
        case "$entity_slug" in
            "agent"|"manager"|"task"|"auth"|"catalog"|"sales"|"inventory"|"reporting")
                labels+=("entity:${entity_slug}")
                ;;
        esac
    fi
    
    # Add status label
    if [[ -n "$status" ]]; then
        labels+=("status:$status")
    fi
    
    # Context labels by directory
    if [[ "$file_path" == *"/planning/"* ]]; then
        labels+=("planning")
    fi
    if [[ "$file_path" == *"/workflow/"* ]]; then
        labels+=("workflow")
    fi

    # Deduplicate labels
    unique_labels=$(printf '%s\n' "${labels[@]}" | awk 'NF && !seen[$0]++')

    # Convert to JSON array
    printf '%s\n' "$unique_labels" | jq -R . | jq -s .
}

# Create clean body for GitHub issue
create_issue_body() {
    local file="$1"
    local content
    content=$(cat "$file")
    local sync_id
    sync_id=$(get_sync_id_for_file "$file")
    local sync_marker="<!-- sync-id:${sync_id} -->"
    
    # Remove template variables and clean up
    local body
    body=$(echo "$content" | \
        sed 's/{[^}]*}//g' | \
        sed '/^#\s/d' | \
        sed '/\*\*GitHub Issue\*\*/d' | \
        sed '/\*\*Pull Request\*\*/d')
    
    # Truncate if too long (GitHub has limits)
    local max_length=10000
    local reserve=$(( ${#sync_marker} + 2 ))
    local max_body_length=$(( max_length - reserve ))
    if [[ ${#body} -gt $max_body_length ]]; then
        body="${body:0:$max_body_length}

---
*Content truncated due to length. See full document in repository.*"
    fi
    
    # Add sync notice
    echo "> 🔄 This issue is synchronized with local markdown documentation"
    echo ""
    echo "$body"
    echo ""
    echo "$sync_marker"
}

# Create GitHub issue
create_issue() {
    local file="$1"
    
    extract_metadata "$file"
    
    # Skip if no title found
    if [[ -z "$title" ]]; then
        log_warning "No title found in $file, skipping"
        return
    fi

    local sync_id
    sync_id=$(get_sync_id_for_file "$file")

    # Prefer sync-id matching to avoid duplicates
    local existing_sync
    if existing_sync=$(find_existing_issue_by_sync_id "$sync_id"); then
        local existing_number
        existing_number=$(echo "$existing_sync" | cut -d'|' -f1)
        local existing_state
        existing_state=$(echo "$existing_sync" | cut -d'|' -f2)

        log_skip "Found existing issue #$existing_number ($existing_state) for sync-id \"$sync_id\". Linking instead of creating."
        update_local_file_with_issue "$file" "$existing_number"
        return
    fi

    # Avoid duplicates: reuse existing issue (open or closed) with same title
    local existing_info
    if existing_info=$(find_existing_issue_by_title "$title"); then
        local existing_number
        existing_number=$(echo "$existing_info" | cut -d'|' -f1)
        local existing_state
        existing_state=$(echo "$existing_info" | cut -d'|' -f2)

        log_skip "Found existing issue #$existing_number ($existing_state) for \"$title\". Linking instead of creating."
        update_local_file_with_issue "$file" "$existing_number"
        return
    fi
    
    local labels_json
    labels_json=$(generate_labels "$file")
    
    local body_content
    body_content=$(create_issue_body "$file")
    
    # Remove debug output
    # echo "DEBUG: Title: $title"
    # echo "DEBUG: Body length: $(echo "$body_content" | wc -c)"
    # echo "DEBUG: Labels: $labels_json"
    
    local issue_data
    issue_data=$(jq -n \
        --arg title "$title" \
        --arg body "$body_content" \
        --argjson labels "$labels_json" \
        '{title: $title, body: $body, labels: $labels}')
    
    # Add assignee if specified
    if [[ -n "$assignee" ]]; then
        issue_data=$(echo "$issue_data" | jq --arg assignee "$assignee" '. + {assignee: $assignee}')
    fi
    
    # Remove debug output
    # echo "DEBUG: Issue data:"
    # echo "$issue_data" | jq '.'
    
    local response
    response=$(github_api "POST" "/issues" "$issue_data")
    
    local issue_number
    issue_number=$(echo "$response" | jq -r '.number // empty')
    
    if [[ -n "$issue_number" ]]; then
        log_success "Created issue #$issue_number: $title"
        update_local_file_with_issue "$file" "$issue_number"
    else
        local error_message
        error_message=$(echo "$response" | jq -r '.message // "Unknown error"')
        log_error "Failed to create issue for $file: $error_message"
    fi
}

# Update existing GitHub issue
update_issue() {
    local file="$1"
    local issue_number="$2"
    
    extract_metadata "$file"
    
    local labels_json
    labels_json=$(generate_labels "$file")
    
    local body_content
    body_content=$(create_issue_body "$file")
    
    local issue_data
    issue_data=$(jq -n \
        --arg title "$title" \
        --arg body "$body_content" \
        --argjson labels "$labels_json" \
        '{title: $title, body: $body, labels: $labels}')
    
    # Set state based on status
    if [[ "$status" == "completed" || "$status" == "cancelled" ]]; then
        issue_data=$(echo "$issue_data" | jq '. + {state: "closed"}')
    else
        issue_data=$(echo "$issue_data" | jq '. + {state: "open"}')
    fi
    
    # Add assignee if specified
    if [[ -n "$assignee" ]]; then
        issue_data=$(echo "$issue_data" | jq --arg assignee "$assignee" '. + {assignee: $assignee}')
    fi
    
    local response
    response=$(github_api "PATCH" "/issues/$issue_number" "$issue_data")
    
    local updated_number
    updated_number=$(echo "$response" | jq -r '.number // empty')
    
    if [[ -n "$updated_number" ]]; then
        log_success "Updated issue #$issue_number: $title"
    else
        local error_message
        error_message=$(echo "$response" | jq -r '.message // "Unknown error"')
        log_error "Failed to update issue #$issue_number: $error_message"
    fi
}

# Add a comment to a GitHub issue
comment_issue() {
    local issue_number="$1"
    local message="$2"

    if [[ -z "$issue_number" || -z "$message" ]]; then
        return
    fi

    local payload
    payload=$(jq -n --arg body "$message" '{body: $body}')
    github_api "POST" "/issues/$issue_number/comments" "$payload" > /dev/null
}

# Close a GitHub issue
close_issue() {
    local issue_number="$1"

    if [[ -z "$issue_number" ]]; then
        return
    fi

    local payload
    payload=$(jq -n '{state: "closed"}')
    github_api "PATCH" "/issues/$issue_number" "$payload" > /dev/null
}

# Update local markdown file with GitHub issue number
update_local_file_with_issue() {
    local file="$1"
    local issue_number="$2"
    local issue_line="**GitHub Issue**: #$issue_number  "
    local tmp_file="${file}.tmp"
    local tmp_prepend="${file}.tmp.prepend"

    # Remove all existing GitHub Issue lines, then insert after the first Status line only
    perl -0777 -pe "s/\\*\\*GitHub Issue\\*\\*:[^\\n]*\\n//g; s/(\\*\\*Status\\*\\*:[^\\n]*\\n)/\$1${issue_line}\\n/" "$file" > "$tmp_file"

    if ! grep -Fq "**Status**:" "$tmp_file"; then
        printf "%s\n" "$issue_line" > "$tmp_prepend"
        cat "$tmp_file" >> "$tmp_prepend"
        mv "$tmp_prepend" "$tmp_file"
    fi

    mv "$tmp_file" "$file"
    rm -f "$tmp_prepend"

    log_info "Updated $file with issue #$issue_number"
}

# Sync a single file
sync_file() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        log_error "File not found: $file"
        return
    fi
    
    # Skip template files (contain template variables)
    if grep -Eq "\\{[a-zA-Z][^}]*\\}" "$file"; then
        log_skip "Skipping template file: $file"
        return
    fi
    
    extract_metadata "$file"
    
    if [[ -n "$github_issue" ]]; then
        # Update existing issue
        update_issue "$file" "$github_issue"
    else
        local sync_id
        sync_id=$(get_sync_id_for_file "$file")

        local existing_sync
        if existing_sync=$(find_existing_issue_by_sync_id "$sync_id"); then
            local existing_number
            existing_number=$(echo "$existing_sync" | cut -d'|' -f1)
            update_local_file_with_issue "$file" "$existing_number"
            update_issue "$file" "$existing_number"
            return
        fi

        local existing_title
        if existing_title=$(find_existing_issue_by_title "$title"); then
            local existing_number
            existing_number=$(echo "$existing_title" | cut -d'|' -f1)
            update_local_file_with_issue "$file" "$existing_number"
            update_issue "$file" "$existing_number"
            return
        fi

        # Create new issue
        create_issue "$file"
    fi
}

# Sync all files in a directory
sync_directory() {
    local dir="$1"
    
    if [[ ! -d "$dir" ]]; then
        log_warning "Directory not found: $dir"
        return
    fi
    
    local files
    files=$(find "$dir" -name "*.md" -type f)
    
    if [[ -z "$files" ]]; then
        log_info "No markdown files found in $dir"
        return
    fi
    
    local count
    count=$(echo "$files" | wc -l | xargs)
    log_info "Syncing $count files from $dir"
    
    while IFS= read -r file; do
        sync_file "$file"
    done <<< "$files"
}

# Deduplicate issues for a single file (by sync-id, fallback to title)
dedupe_file() {
    local file="$1"

    if [[ ! -f "$file" ]]; then
        log_error "File not found: $file"
        return
    fi

    # Skip template files (contain template variables)
    if grep -Eq "\\{[a-zA-Z][^}]*\\}" "$file"; then
        log_skip "Skipping template file: $file"
        return
    fi

    extract_metadata "$file"

    if [[ -z "$title" ]]; then
        log_warning "No title found in $file, skipping"
        return
    fi

    local sync_id
    sync_id=$(get_sync_id_for_file "$file")

    local response
    local matches
    response=$(github_search_api "repo:${GITHUB_OWNER}/${GITHUB_REPO} type:issue in:body \"sync-id:${sync_id}\"")
    if ensure_search_items "$response"; then
        matches=$(echo "$response" | jq -c '[.items[]]')
    else
        log_warning "Search failed; falling back to listing issues for $file."
        load_issues_cache
        if [[ -n "$ISSUES_CACHE" ]]; then
            matches=$(echo "$ISSUES_CACHE" | jq -c --arg sync_id "$sync_id" '[.[] | select((.body // "") | contains("sync-id:" + $sync_id))]')
        else
            log_warning "Skipping dedupe for $file due to search/list error."
            return
        fi
    fi
    local match_count
    match_count=$(echo "$matches" | jq -r 'length')

    if [[ "$match_count" -eq 0 ]]; then
        response=$(github_search_api "repo:${GITHUB_OWNER}/${GITHUB_REPO} type:issue in:title \"${title}\"")
        if ensure_search_items "$response"; then
            matches=$(echo "$response" | jq -c --arg title "$title" '[.items[] | select(.title == $title)]')
        else
            log_warning "Search failed; falling back to listing issues for $file."
            load_issues_cache
            if [[ -n "$ISSUES_CACHE" ]]; then
                matches=$(echo "$ISSUES_CACHE" | jq -c --arg title "$title" '[.[] | select(.title == $title)]')
            else
                log_warning "Skipping dedupe for $file due to search/list error."
                return
            fi
        fi
        match_count=$(echo "$matches" | jq -r 'length')
    fi

    if [[ "$match_count" -le 1 ]]; then
        if [[ "$match_count" -eq 1 ]]; then
            local existing_number
            existing_number=$(echo "$matches" | jq -r '.[0].number')
            if [[ -z "$github_issue" || "$github_issue" != "$existing_number" ]]; then
                update_local_file_with_issue "$file" "$existing_number"
            fi
        fi
        return
    fi

    local canonical=""
    if [[ -n "$github_issue" ]]; then
        if echo "$matches" | jq -e --arg num "$github_issue" '.[] | select((.number|tostring) == $num)' > /dev/null; then
            canonical="$github_issue"
        fi
    fi

    if [[ -z "$canonical" ]]; then
        canonical=$(echo "$matches" | jq -r '[.[] | select(.state == "open") | .number] | sort | .[0] // empty')
    fi
    if [[ -z "$canonical" ]]; then
        canonical=$(echo "$matches" | jq -r '[.[] | .number] | sort | .[0]')
    fi

    update_local_file_with_issue "$file" "$canonical"

    echo "$matches" | jq -c '.[]' | while IFS= read -r issue; do
        local number
        number=$(echo "$issue" | jq -r '.number')
        local state
        state=$(echo "$issue" | jq -r '.state')

        if [[ "$number" == "$canonical" ]]; then
            continue
        fi

        if [[ "$state" != "closed" ]]; then
            comment_issue "$number" "Duplicate of #$canonical. Sync-id: ${sync_id}"
            close_issue "$number"
            log_success "Closed duplicate issue #$number (kept #$canonical)"
        else
            log_skip "Duplicate issue #$number already closed (kept #$canonical)"
        fi
    done
}

# Deduplicate issues for all markdown files in a directory
dedupe_directory() {
    local dir="$1"

    if [[ ! -d "$dir" ]]; then
        log_warning "Directory not found: $dir"
        return
    fi

    local files
    files=$(find "$dir" -name "*.md" -type f)

    if [[ -z "$files" ]]; then
        log_info "No markdown files found in $dir"
        return
    fi

    local count
    count=$(echo "$files" | wc -l | xargs)
    log_info "Deduping $count files from $dir"

    while IFS= read -r file; do
        dedupe_file "$file"
    done <<< "$files"
}

# Ensure required labels exist
ensure_labels() {
    log_info "Ensuring required labels exist..."
    
    local labels=(
        "planning|bfe5bf"
        "workflow|ededed"
        "documentation|ededed"
        "prd|0e8a16"
        "backlog|1f6feb"
        "requirements|1d76db"
        "poc|5319e7"
        "research|5319e7"
        "feature|0052cc"
        "enhancement|0052cc"
        "task|1d76db"
        "development|1d76db"
        "epic|5319e7"
        "milestone|5319e7"
        "priority:high|d73a4a"
        "priority:medium|fbca04"
        "priority:low|0e8a16"
        "entity:agent|f9d0c4"
        "entity:manager|c2e0c6"
        "entity:task|fef2c0"
        "entity:auth|d4c5f9"
        "entity:catalog|f9d0c4"
        "entity:sales|c2e0c6"
        "entity:inventory|fef2c0"
        "entity:reporting|d4c5f9"
        "status:draft|cfd3d7"
        "status:planning|bfd4f2"
        "status:ready|0e8a16"
        "status:in_progress|1f6feb"
        "status:in-progress|1f6feb"
        "status:review|fbca04"
        "status:approved|0e8a16"
        "status:blocked|d73a4a"
        "status:candidate|c2e0c6"
        "status:completed|5319e7"
        "status:done|5319e7"
        "status:cancelled|6e7781"
    )
    
    for label_info in "${labels[@]}"; do
        IFS='|' read -r name color <<< "$label_info"
        local encoded_name
        encoded_name=$(printf '%s' "$name" | jq -sRr @uri)
        
        # Check if label exists
        local response
        response=$(github_api "GET" "/labels/$encoded_name" 2>/dev/null || echo '{"message": "Not Found"}')
        
        if echo "$response" | jq -e '.message == "Not Found"' > /dev/null; then
            # Create label
            local label_data
            label_data=$(jq -n --arg name "$name" --arg color "$color" '{name: $name, color: $color}')
            
            local create_response
            create_response=$(github_api "POST" "/labels" "$label_data")
            
            if echo "$create_response" | jq -e '.name' > /dev/null; then
                log_success "Created label: $name"
            else
                local error_msg
                error_msg=$(echo "$create_response" | jq -r '.message // "Unknown error"')
                log_error "Failed to create label '$name': $error_msg"
            fi
        fi
    done
}

# Create milestone
create_milestone() {
    local title="$1"
    local description="$2"
    
    local milestone_data
    milestone_data=$(jq -n --arg title "$title" --arg description "$description" '{title: $title, description: $description}')
    
    local response
    response=$(github_api "POST" "/milestones" "$milestone_data")
    
    local milestone_number
    milestone_number=$(echo "$response" | jq -r '.number // empty')
    
    if [[ -n "$milestone_number" ]]; then
        log_success "Created milestone: $title"
    else
        local error_message
        error_message=$(echo "$response" | jq -r '.message // "Unknown error"')
        log_error "Failed to create milestone: $error_message"
    fi
}

# Show usage
show_usage() {
    cat << EOF
GitHub Sync Tool

Usage:
  ./scripts/sync-github.sh --sync-all                    # Sync all documents
  ./scripts/sync-github.sh --sync-planning               # Sync planning documents (PRD/Backlog/Requirements)
  ./scripts/sync-github.sh --sync-workflow               # Sync workflow documents
  ./scripts/sync-github.sh --sync-features               # Sync all features
  ./scripts/sync-github.sh --sync-tasks                  # Sync all tasks
  ./scripts/sync-github.sh --sync-epics                  # Sync all epics
  ./scripts/sync-github.sh --sync-execution              # Sync planning + features + tasks + epics
  ./scripts/sync-github.sh --sync-file <path>            # Sync specific file
  ./scripts/sync-github.sh --dedupe                      # Close duplicate issues and link files
  ./scripts/sync-github.sh --create-milestone <title>    # Create milestone
  ./scripts/sync-github.sh --ensure-labels               # Ensure labels exist

Environment Variables:
  GITHUB_TOKEN   - GitHub personal access token (required)
  GITHUB_OWNER   - GitHub repository owner (default: your-username)
  GITHUB_REPO    - GitHub repository name (default: ut-tools-manager)
  GITHUB_ENV_FILE - Optional explicit path to env file (e.g., ../.env.github)

Examples:
  # Option A: env vars in shell
  export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
  export GITHUB_OWNER="your-github-username"
  export GITHUB_REPO="ut-tools-manager"
  
  ./scripts/sync-github.sh --sync-workflow
  ./scripts/sync-github.sh --sync-file docs/workflow/001-poc-agent-registration-draft.md
  ./scripts/sync-github.sh --dedupe

  # Option B: use .env.github (auto-detected)
  ./docs/scripts/sync-github.sh --sync-execution

  # Option C: explicit env file path
  GITHUB_ENV_FILE="../.env.github" ./docs/scripts/sync-github.sh --sync-execution

EOF
}

# Main function
main() {
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 0
    fi

    if [[ -n "$ENV_SOURCE_FILE" ]]; then
        log_info "Loaded GitHub environment from: $ENV_SOURCE_FILE"
    fi
    
    check_dependencies
    
    case "$1" in
        --sync-all)
            ensure_labels
            sync_directory "$PLANNING_DIR"
            sync_directory "$WORKFLOW_DIR"
            sync_directory "$FEATURES_DIR"
            sync_directory "$TASKS_DIR"
            sync_directory "$EPICS_DIR"
            ;;
        --sync-planning)
            ensure_labels
            sync_directory "$PLANNING_DIR"
            ;;
        --sync-workflow)
            ensure_labels
            sync_directory "$WORKFLOW_DIR"
            ;;
        --sync-features)
            ensure_labels
            sync_directory "$FEATURES_DIR"
            ;;
        --sync-tasks)
            ensure_labels
            sync_directory "$TASKS_DIR"
            ;;
        --sync-epics)
            ensure_labels
            sync_directory "$EPICS_DIR"
            ;;
        --sync-execution)
            ensure_labels
            sync_directory "$PLANNING_DIR"
            sync_directory "$FEATURES_DIR"
            sync_directory "$TASKS_DIR"
            sync_directory "$EPICS_DIR"
            ;;
        --sync-file)
            if [[ -z "$2" ]]; then
                log_error "File path required"
                exit 1
            fi
            ensure_labels
            sync_file "$2"
            ;;
        --dedupe)
            dedupe_directory "$PLANNING_DIR"
            dedupe_directory "$WORKFLOW_DIR"
            dedupe_directory "$FEATURES_DIR"
            dedupe_directory "$TASKS_DIR"
            dedupe_directory "$EPICS_DIR"
            ;;
        --create-milestone)
            if [[ -z "$2" ]]; then
                log_error "Milestone title required"
                exit 1
            fi
            create_milestone "$2" "$3"
            ;;
        --ensure-labels)
            ensure_labels
            ;;
        *)
            log_error "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
    
    log_success "Sync completed successfully!"
}

# Run main function with all arguments
main "$@"
