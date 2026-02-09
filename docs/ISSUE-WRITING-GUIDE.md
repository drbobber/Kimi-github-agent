# ✍️ Issue Writing Guide

Writing good issues is crucial for the Kimi GitHub Agent to produce high-quality implementations. This guide provides best practices and examples.

## Issue Template Structure

The Kimi Task template includes these sections:

1. **Description** - What needs to be built/fixed
2. **Dependencies** - Blocking issues
3. **Acceptance Criteria** - Definition of done
4. **Technical Notes** - Implementation details
5. **Files to Modify** - Suggested files (optional)
6. **Priority** - Urgency level

## Writing Effective Descriptions

### ✅ Good Descriptions

**Example 1: Feature Request**
```markdown
## Description
Add a dark mode toggle to the application header. The toggle should:
- Persist user preference in localStorage
- Apply theme immediately without page reload
- Use the existing theme context from src/contexts/ThemeContext.js
- Match the design system colors defined in src/styles/theme.js
```

**Example 2: Bug Fix**
```markdown
## Description
Fix the memory leak in the WebSocket connection manager. Currently, connections
are not properly closed when users navigate away from the dashboard, causing
memory to accumulate over time.

Steps to reproduce:
1. Navigate to /dashboard
2. Wait for WebSocket connection
3. Navigate to /settings
4. Check browser memory usage (increases with each navigation)

Expected: Memory should be released when leaving dashboard
Actual: Memory continues to accumulate
```

**Example 3: Refactoring**
```markdown
## Description
Extract the authentication logic from App.js into a custom React hook.
This will make the code more reusable and testable.

Current issue:
- Authentication logic is tightly coupled with App component
- Difficult to test in isolation
- Cannot reuse in other components

Solution:
- Create src/hooks/useAuth.js
- Move login, logout, and session checking logic
- Update App.js to use the new hook
```

### ❌ Bad Descriptions

**Too Vague**
```markdown
Fix the bug in the login page
```
*Problem: What bug? What's the expected behavior?*

**Missing Context**
```markdown
Add validation
```
*Problem: Validate what? Where? What rules?*

**Too Broad**
```markdown
Improve the entire authentication system
```
*Problem: Too large, needs to be broken into smaller issues*

## Defining Acceptance Criteria

Acceptance criteria define when the task is complete. Use checkboxes for clarity.

### ✅ Good Acceptance Criteria

```markdown
## Acceptance Criteria
- [ ] Dark mode toggle button appears in header
- [ ] Clicking toggle switches between light and dark themes
- [ ] Theme preference persists after page reload
- [ ] All components properly render in both themes
- [ ] Existing tests pass
- [ ] New tests added for theme toggle functionality
- [ ] Documentation updated in README.md
```

### ❌ Bad Acceptance Criteria

```markdown
## Acceptance Criteria
- [ ] Make it work
- [ ] Should look good
```
*Problem: Not specific, not measurable*

## Specifying Dependencies

Dependencies are issues that must be completed first. Use the checkbox format:

```markdown
## Dependencies
- [ ] #42 - Complete API authentication endpoint
- [ ] #55 - Add error handling middleware
```

**Important**:
- Use `- [ ] #number` format (space between brackets)
- The agent will wait until all dependencies are closed
- Checkboxes are automatically checked when dependencies close

**Special case - No dependencies**:
```markdown
## Dependencies
None
```

## Technical Notes

Provide implementation guidance, constraints, or important considerations.

### ✅ Good Technical Notes

```markdown
## Technical Notes
- Use the existing `ThemeContext` in src/contexts/ThemeContext.js
- Don't add new dependencies; use built-in React hooks
- Follow the pattern used in SettingsPanel.js for toggle switches
- Colors should come from theme.js, not hardcoded
- localStorage key should be 'app-theme-preference'
- Consider system preference: `prefers-color-scheme` media query
```

### Important Things to Include

1. **Libraries/frameworks to use**
   ```markdown
   - Use Axios for HTTP requests (already in package.json)
   - Don't use fetch API
   ```

2. **Patterns to follow**
   ```markdown
   - Follow the existing error handling pattern in src/utils/errors.js
   - Use the Logger utility for all console outputs
   ```

3. **Constraints**
   ```markdown
   - Must work in IE11
   - Maximum bundle size increase: 10KB
   - Must maintain backwards compatibility with v1 API
   ```

4. **Files to avoid**
   ```markdown
   - Don't modify src/legacy/* files
   - Keep changes out of vendor/ directory
   ```

## Suggesting Files to Modify

Help the agent by suggesting relevant files:

```markdown
## Files to Modify
- src/components/Header.js - Add toggle button
- src/contexts/ThemeContext.js - Add theme state management
- src/styles/theme.js - Define dark theme colors
- src/hooks/useLocalStorage.js - May need to use this
- docs/THEMING.md - Update documentation
```

**Note**: This is advisory. The agent may modify additional files if needed.

## Complete Example Issues

### Example 1: Feature Implementation

```markdown
## Description
Implement pagination for the user list on the admin dashboard. Currently, 
all users are loaded at once, causing slow load times when there are 1000+ users.

Add previous/next buttons below the user table, showing 50 users per page.
Display "Showing X-Y of Z users" text above the table.

## Dependencies
None

## Acceptance Criteria
- [ ] User list shows maximum 50 users per page
- [ ] Previous/Next buttons appear below the table
- [ ] Previous button disabled on first page
- [ ] Next button disabled on last page
- [ ] "Showing X-Y of Z users" text displays correctly
- [ ] Page persists on browser refresh (use URL params)
- [ ] Existing search functionality still works with pagination
- [ ] Loading indicator shows while fetching page data
- [ ] All existing tests pass
- [ ] New tests added for pagination logic

## Technical Notes
- API endpoint supports pagination: GET /api/users?page=1&limit=50
- Use the existing Pagination component from src/components/common/Pagination.js
- Store current page in URL query params: ?page=2
- Update the UserListContainer.js component (don't modify UserList.js directly)
- Follow the pagination pattern used in OrdersList.js
- Error handling: show error message if page fetch fails

## Files to Modify
- src/containers/UserListContainer.js - Add pagination state
- src/components/admin/UserList.js - Display pagination UI
- src/api/users.js - Update API call to include pagination params
- tests/admin/UserList.test.js - Add pagination tests
```

### Example 2: Bug Fix

```markdown
## Description
Fix the timezone issue in the event scheduler. Events are currently being 
saved in UTC but displayed in UTC as well, causing confusion for users in
different timezones.

Events should be:
- Saved in UTC on the server
- Displayed in user's local timezone
- Show timezone indicator (e.g., "2:00 PM PST")

Bug report: #123

## Dependencies
None

## Acceptance Criteria
- [ ] Events display in user's local timezone
- [ ] Timezone indicator shows next to time (e.g., "PST", "EST")
- [ ] Creating events uses user's local timezone
- [ ] Server still stores events in UTC
- [ ] Event times are correct across daylight saving changes
- [ ] All existing event tests pass
- [ ] New tests added for timezone conversion
- [ ] Manual testing confirmed in PST, EST, and GMT+8

## Technical Notes
- Use date-fns-tz library (already in package.json)
- User's timezone detected via Intl.DateTimeFormat().resolvedOptions().timeZone
- Don't use moment.js (we're migrating away from it)
- Server API returns times in ISO 8601 format (already correct)
- Convert times on the client side only
- Utility functions should go in src/utils/datetime.js

## Files to Modify
- src/utils/datetime.js - Add timezone conversion functions
- src/components/EventScheduler.js - Use timezone-aware display
- src/components/EventForm.js - Convert to UTC before sending
- tests/utils/datetime.test.js - Add timezone tests
```

## Anti-Patterns to Avoid

### ❌ Don't Write Novels

Keep descriptions focused. If you need multiple pages of explanation, the issue is probably too large and should be split.

### ❌ Don't Assume Context

Even if "everyone knows" about a particular system quirk, document it in the issue.

### ❌ Don't Mix Multiple Features

One issue = one feature/fix. If you're writing "and also..." you probably need separate issues.

### ❌ Don't Skip Acceptance Criteria

Without clear criteria, the agent can't know when it's done.

### ❌ Don't Use Vague Technical Terms

Instead of "make it faster", say "reduce page load time from 3s to <1s"

## Tips for Success

### 1. Use Examples

Show, don't just tell:
```markdown
Current behavior: User sees "Error occurred"
Expected behavior: User sees "Email format is invalid. Please use format: name@domain.com"
```

### 2. Link to References

```markdown
Follow the design mockup: [Figma Link]
API documentation: [Swagger Docs]
Similar implementation: see how SearchBar.js handles this
```

### 3. Provide Test Cases

```markdown
Test cases:
1. Empty input → should show "Required field" error
2. Invalid email → should show "Invalid email" error
3. Valid email → should proceed to next step
4. Email already exists → should show "Email already registered"
```

### 4. Consider Edge Cases

```markdown
Edge cases to handle:
- What if user has no events?
- What if all events are in the past?
- What if timezone detection fails?
- What if user changes timezone mid-session?
```

### 5. Break Down Large Features

Instead of: "Build complete notification system"

Break into:
1. Issue #101: Create notification data model
2. Issue #102: Build notification API endpoints (depends on #101)
3. Issue #103: Add notification UI component (depends on #102)
4. Issue #104: Implement real-time notifications (depends on #103)

## Issue Lifecycle

1. **Draft** → Write the issue
2. **Review** → Have teammate review for clarity
3. **Label** → Add `kimi-ready` label when dependencies met
4. **Processing** → Agent picks it up automatically
5. **PR Created** → Review the generated PR
6. **Merge** → Auto-merges after approval and tests

## Questions to Ask Yourself

Before submitting an issue, ask:

- [ ] Can someone unfamiliar with my project understand this?
- [ ] Have I specified all dependencies?
- [ ] Are acceptance criteria measurable?
- [ ] Have I provided enough technical context?
- [ ] Is this issue focused on ONE thing?
- [ ] Have I considered edge cases?
- [ ] Will I be able to review the PR effectively?

## Getting Help

If you're unsure how to write an issue:

1. Look at successfully completed issues in your repo
2. Ask a teammate to review your draft
3. Start with a simple issue to learn the pattern
4. Open an issue in the Kimi-github-agent repo for guidance

Remember: Good issues → Good implementations! 🎯
