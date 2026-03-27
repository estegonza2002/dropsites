---
title: Component Specification
owner: design
version: "1.0"
last_updated: 2026-03-26
depends_on:
  - design/design-system.md
  - prd/PRD.md
---

# DropSites — Component Specification

> **Purpose:** This is the complete component specification Claude Code follows when building the DropSites UI. Every component needed for the application is defined here with enough detail that Claude Code can build it correctly the first time.
>
> **Design system:** shadcn/ui + Tailwind CSS v4 + Geist font (400/500 only). Near-monochrome zinc palette. Blue-600 (`#2563eb`) as the single accent. Lucide React icons at 16px (tables) / 20px (toolbars), stroke-width 1.5. `rounded-md` on inputs/buttons, `rounded-lg` on cards/dialogs. `shadow-sm` on cards/dialogs only.
>
> **Reference products:** Linear, Vercel dashboard, Raycast.

---

## LAYOUT

---

### AppLayout

**Purpose:** Root layout wrapper that provides the sidebar, topbar, and content area structure for all authenticated dashboard pages.

**File path:** `src/components/app/layout/AppLayout.tsx`

**Props interface:**

```typescript
interface AppLayoutProps {
  /** The page content rendered in the main area */
  children: React.ReactNode;
}
```

**Variants / States:**

- **Desktop (≥768px):** Fixed left sidebar (w-56) + scrollable main content area
- **Mobile (<768px):** No sidebar visible; top bar with hamburger menu; content is full-width
- **Sidebar collapsed:** Not supported in Phase 1 — sidebar is always visible on desktop

**shadcn primitives used:** Sheet (mobile sidebar drawer), Toaster (Sonner, mounted here)

**Behaviour:**

- Mounts the `AppSidebar` on desktop, `AppTopbar` on mobile
- Mounts the global `Toaster` (Sonner) at bottom-right, max 3 toasts
- Mounts the `GlobalSearch` command palette (⌘K / Ctrl+K listener)
- Provides the active workspace context via React context to all children

**Mobile behaviour:**

- Sidebar is hidden; replaced by `AppTopbar` with a hamburger trigger that opens `AppSidebar` inside a `Sheet`
- Content area is full-width with 16px horizontal padding

**Accessibility:**

- `<main>` element wraps children with `role="main"`
- Sidebar navigation uses `<nav>` with `aria-label="Main navigation"`
- Skip-to-content link as the first focusable element

**Do not:**

- Do not render the sidebar on mobile outside of the Sheet — it must be a drawer
- Do not add any page-specific logic here — this is a pure structural wrapper
- Do not hardcode workspace data — always read from context/server state

**Example usage:**

```tsx
<AppLayout>
  <PageHeader title="Deployments" />
  <DeploymentTable deployments={deployments} />
</AppLayout>
```

---

### PageHeader

**Purpose:** Consistent page-level header with title, optional description, and action buttons used at the top of every dashboard page.

**File path:** `src/components/app/layout/PageHeader.tsx`

**Props interface:**

```typescript
interface PageHeaderProps {
  /** Page title displayed as an h1 */
  title: string;
  /** Optional subtitle or description below the title */
  description?: string;
  /** Action buttons rendered on the right side (e.g. "New deployment") */
  actions?: React.ReactNode;
}
```

**Variants / States:**

- **Default:** Title only
- **With description:** Title + muted description text below
- **With actions:** Title + right-aligned action buttons
- **Full:** Title + description + actions

**shadcn primitives used:** None — pure HTML with Tailwind classes.

**Behaviour:**

- Title renders as `<h1>` with `text-lg font-medium text-zinc-900`
- Description renders as `<p>` with `text-sm text-zinc-500`
- Actions are right-aligned on desktop, stacked below title on mobile

**Mobile behaviour:**

- Actions wrap below the title/description block at < 768px
- Full-width action buttons on mobile

**Accessibility:**

- `<h1>` for the title — only one per page
- Actions region wrapped in a `<div role="toolbar" aria-label="Page actions">`

**Do not:**

- Do not use `<h2>` or any other heading level — this is always an `<h1>`
- Do not put navigation or breadcrumbs inside this component
- Do not add bottom border or shadow — the parent layout handles visual separation

**Example usage:**

```tsx
<PageHeader
  title="Deployments"
  description="Manage your published sites"
  actions={
    <Button size="sm">
      <Plus className="mr-2 h-4 w-4" />
      New deployment
    </Button>
  }
/>
```

---

### AppSidebar

**Purpose:** Fixed left-side navigation for desktop that shows workspace selector, nav links, and usage summary.

**File path:** `src/components/app/layout/AppSidebar.tsx`

**Props interface:**

```typescript
interface AppSidebarProps {
  /** Currently active workspace ID */
  activeWorkspaceId: string;
  /** List of workspaces the user belongs to */
  workspaces: Workspace[];
  /** Currently active route path for highlighting */
  activePath: string;
}
```

**Variants / States:**

- **Default:** Full sidebar with workspace selector, nav links, usage panel
- **Inside mobile Sheet:** Same content, rendered inside a Sheet component

**shadcn primitives used:** Sheet (when used in mobile drawer), Tooltip (on icon-only elements), Separator

**Behaviour:**

- Top section: `WorkspaceSelector` dropdown
- Middle section: Navigation links — Deployments, Analytics, Settings
- Bottom section: Compact `UsagePanel` showing quota bars
- Active nav item highlighted with `bg-zinc-100 text-zinc-900` and blue-600 left border indicator
- Nav links use `next/link` for client-side navigation

**Mobile behaviour:**

- Rendered inside a `Sheet` (slide from left) triggered by hamburger in `AppTopbar`
- Sheet closes on nav link click
- Same content and layout as desktop

**Accessibility:**

- `<nav aria-label="Main navigation">`
- Each nav link has `aria-current="page"` when active
- All icon-only elements have Tooltip labels
- Keyboard: Tab through links, Enter to navigate

**Do not:**

- Do not collapse or hide the sidebar on desktop — it is always w-56
- Do not put deployment-specific actions in the sidebar
- Do not use filled icons — Lucide outline only, stroke-width 1.5

**Example usage:**

```tsx
<AppSidebar
  activeWorkspaceId={workspace.id}
  workspaces={userWorkspaces}
  activePath="/deployments"
/>
```

---

### AppTopbar

**Purpose:** Mobile-only top navigation bar with hamburger menu trigger, workspace name, and global actions.

**File path:** `src/components/app/layout/AppTopbar.tsx`

**Props interface:**

```typescript
interface AppTopbarProps {
  /** Name of the active workspace to display */
  workspaceName: string;
  /** Callback to open the mobile sidebar Sheet */
  onMenuOpen: () => void;
}
```

**Variants / States:**

- **Default:** Hamburger icon + workspace name + search icon
- **Offline:** Shows an amber "Offline" indicator badge

**shadcn primitives used:** Button (ghost variant for hamburger and search icons), Tooltip

**Behaviour:**

- Hamburger button (left) opens the mobile sidebar Sheet
- Workspace name (center) is truncated with ellipsis if too long
- Search icon (right) opens GlobalSearch command palette
- Fixed at top of viewport, `h-14`, `border-b border-zinc-100`

**Mobile behaviour:**

- Only rendered at < 768px — hidden on desktop via `md:hidden`
- Full-width, 16px horizontal padding

**Accessibility:**

- Hamburger button: `aria-label="Open navigation menu"`
- Search button: `aria-label="Search deployments"`
- Both wrapped in Tooltip components

**Do not:**

- Do not render this component on desktop — it is mobile-only
- Do not put the workspace selector dropdown here — that lives in the sidebar Sheet
- Do not add notification badges here in Phase 1

**Example usage:**

```tsx
<AppTopbar
  workspaceName="My Workspace"
  onMenuOpen={() => setSidebarOpen(true)}
/>
```

---

## DEPLOYMENT MANAGEMENT

---

### DeploymentRow

**Purpose:** A single row in the deployment table showing deployment name, status, URL, view count, and action buttons.

**File path:** `src/components/app/deployments/DeploymentRow.tsx`

**Props interface:**

```typescript
interface DeploymentRowProps {
  /** The deployment data object */
  deployment: Deployment;
  /** Callback when user clicks copy URL */
  onCopyUrl: (slug: string) => void;
  /** Callback when user clicks share */
  onShare: (deployment: Deployment) => void;
  /** Callback when user clicks update (overwrite) */
  onUpdate: (deployment: Deployment) => void;
  /** Callback when user clicks delete */
  onDelete: (deployment: Deployment) => void;
  /** Callback when user toggles password lock */
  onToggleLock: (deployment: Deployment) => void;
  /** Callback when user clicks duplicate */
  onDuplicate: (deployment: Deployment) => void;
  /** Whether this row is currently selected (for bulk actions) */
  isSelected?: boolean;
  /** Callback when selection checkbox changes */
  onSelectionChange?: (deploymentId: string, selected: boolean) => void;
}
```

**Variants / States:**

- **Default:** Name, status badge, URL, created date, view count, actions
- **Hover:** `bg-zinc-50` row background
- **Selected:** Checkbox checked, subtle blue-50 background
- **Inline upload:** When "Update" is clicked, an `UploadZone` appears below the row
- **Password prompt:** When "Lock" is clicked, a Popover opens with `PasswordInput`

**shadcn primitives used:** TableRow, TableCell, Badge, Button (ghost/icon), DropdownMenu, Tooltip, Popover, Checkbox

**Behaviour:**

- Row height: 44px
- Columns: Checkbox | Name + slug | StatusBadge | Views | Updated | Actions
- Name is a link to the deployment detail page
- Copy URL button shows a "Copied" toast via Sonner on click
- Actions menu (⋯) contains: Lock/Unlock, Update, Duplicate, Rename, Delete
- Lock icon toggles inline — opens a Popover with PasswordInput, not a full dialog

**Mobile behaviour (<768px):**

- Shows: Name + StatusBadge + Share icon + Actions menu (⋯)
- Secondary columns (size, dates, views) hidden — available via expand or detail page
- Row height remains 44px, touch targets ≥ 44px

**Accessibility:**

- Row is not focusable itself — individual interactive elements within are focusable
- Checkbox has `aria-label="Select {deployment name}"`
- All icon-only buttons have Tooltip with descriptive label
- DropdownMenu is keyboard navigable (Arrow keys, Enter, Escape)

**Do not:**

- Do not make the entire row clickable — only specific elements (name link, buttons)
- Do not show the inline upload zone by default — only on "Update" action
- Do not put the delete action outside the ⋯ menu — it should require two clicks (menu → delete → confirm)

**Example usage:**

```tsx
<DeploymentRow
  deployment={deployment}
  onCopyUrl={(slug) => copyToClipboard(`${baseUrl}/${slug}`)}
  onShare={(d) => setShareTarget(d)}
  onUpdate={(d) => setUpdateTarget(d)}
  onDelete={(d) => setDeleteTarget(d)}
  onToggleLock={(d) => setLockTarget(d)}
  onDuplicate={(d) => duplicateDeployment(d.id)}
/>
```

---

### DeploymentTable

**Purpose:** Sortable table that renders the full list of deployments for the active workspace with sticky header and bulk actions.

**File path:** `src/components/app/deployments/DeploymentTable.tsx`

**Props interface:**

```typescript
interface DeploymentTableProps {
  /** Array of deployments to render */
  deployments: Deployment[];
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Current sort field */
  sortField: "name" | "created_at" | "updated_at" | "views";
  /** Current sort direction */
  sortDirection: "asc" | "desc";
  /** Callback when sort changes */
  onSortChange: (field: string, direction: "asc" | "desc") => void;
  /** Currently selected deployment IDs for bulk actions */
  selectedIds: Set<string>;
  /** Callback when selection changes */
  onSelectionChange: (ids: Set<string>) => void;
  /** Callback when bulk delete is triggered */
  onBulkDelete: (ids: string[]) => void;
}
```

**Variants / States:**

- **Default:** Populated table with deployments
- **Loading:** Skeleton rows matching the shape of real rows (Skeleton component)
- **Empty:** Renders `EmptyState` with upload prompt and "how it works" guide (FR-306)
- **Filtered empty:** Renders `EmptyState` with "No deployments match" message (FR-309)
- **Bulk selection active:** Shows bulk action bar above table with delete button and count

**shadcn primitives used:** Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Skeleton, Checkbox

**Behaviour:**

- Sticky header row — stays visible on scroll
- 8–10 rows visible on 1080p without scrolling (44px row height)
- Column headers are clickable for sorting — show sort indicator arrow
- "Select all" checkbox in header selects all visible rows
- Table wraps `DeploymentRow` for each deployment
- 16px horizontal padding on cells

**Mobile behaviour:**

- Simplified columns: Name + Status + Actions only
- Horizontal scroll disabled — responsive column hiding instead
- Bulk selection via long-press (future) — checkbox hidden on mobile in Phase 1

**Accessibility:**

- `<table>` with proper `<thead>`, `<tbody>` structure
- Sort buttons in headers have `aria-sort="ascending"` / `"descending"` / `"none"`
- Screen reader announcement on sort change via `aria-live="polite"` region
- Select-all checkbox: `aria-label="Select all deployments"`

**Do not:**

- Do not implement virtual scrolling in Phase 1 — standard DOM rendering is sufficient for ≤200 rows
- Do not add horizontal scroll on mobile — hide secondary columns instead
- Do not hardcode column widths — use Tailwind flex/grid for responsive sizing

**Example usage:**

```tsx
<DeploymentTable
  deployments={filteredDeployments}
  isLoading={isLoading}
  sortField="updated_at"
  sortDirection="desc"
  onSortChange={handleSort}
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
  onBulkDelete={handleBulkDelete}
/>
```

---

### DeploymentThumbnail

**Purpose:** Displays a small preview thumbnail image of a deployment, with placeholder fallback while the thumbnail is generating.

**File path:** `src/components/app/deployments/DeploymentThumbnail.tsx`

**Props interface:**

```typescript
interface DeploymentThumbnailProps {
  /** URL to the thumbnail WebP image (from Supabase Storage) */
  thumbnailUrl: string | null;
  /** Deployment name for alt text */
  deploymentName: string;
  /** Size variant */
  size?: "sm" | "md";
}
```

**Variants / States:**

- **Loaded:** Displays the WebP thumbnail image
- **Loading/Generating:** Pulsing Skeleton placeholder matching the thumbnail dimensions
- **No thumbnail (Phase 1):** Shows a generic file icon on zinc-50 background
- **Error:** Falls back to the generic file icon placeholder

**shadcn primitives used:** Skeleton

**Behaviour:**

- `sm` = 40×30px (table rows), `md` = 80×60px (detail page)
- Image loads lazily (`loading="lazy"`)
- On error, silently falls back to placeholder — no error toast
- Rounded corners: `rounded-md`

**Mobile behaviour:** Same as desktop — no difference.

**Accessibility:**

- `<img>` with `alt="{deploymentName} preview"`
- Placeholder has `aria-label="Thumbnail loading"`

**Do not:**

- Do not fetch or generate thumbnails from this component — it only displays them
- Do not use `<canvas>` or any client-side rendering — thumbnails are pre-generated server-side (Phase 2)
- Do not block row rendering while the thumbnail loads

**Example usage:**

```tsx
<DeploymentThumbnail
  thumbnailUrl={deployment.thumbnail_url}
  deploymentName={deployment.slug}
  size="sm"
/>
```

---

### UploadZone

**Purpose:** Drag-and-drop (and click-to-browse) file upload area used for creating new deployments and overwriting existing ones.

**File path:** `src/components/app/deployments/UploadZone.tsx`

**Props interface:**

```typescript
interface UploadZoneProps {
  /** Callback when files are selected or dropped */
  onUpload: (files: FileList | File[]) => void;
  /** Whether an upload is currently in progress */
  isUploading: boolean;
  /** Upload progress percentage (0–100) */
  progress: number;
  /** Current processing state after upload completes */
  processingState: "idle" | "uploading" | "processing" | "success" | "error";
  /** Error message to display in error state */
  errorMessage?: string;
  /** The resulting deployment URL on success */
  deploymentUrl?: string;
  /** Callback to copy URL to clipboard */
  onCopyUrl?: () => void;
  /** Callback to retry after error */
  onRetry?: () => void;
  /** Optional label override (e.g. "Update content for sprint-retro") */
  label?: string;
  /** Whether this is an inline upload zone (for overwrite in table row) */
  inline?: boolean;
}
```

**Variants / States (per PRD Section 6.5):**

- **Idle:** Dashed border (`border-dashed border-zinc-200`), upload icon (Upload from Lucide), label: "Drop HTML, JS, ZIP, or PDF — or click to browse"
- **Drag-over:** Solid border (`border-solid border-blue-600`), background `bg-blue-50/50`, label: "Release to upload"
- **Uploading:** Progress bar with percentage and filename
- **Processing:** Spinner with label: "Unpacking and deploying…"
- **Success:** Checkmark icon (green), deployment URL displayed, copy button highlighted with blue-600
- **Error:** Red border (`border-red-500`), specific error message, retry button
- **Inline variant:** Compact version without the large icon, fits inside a table row context

**shadcn primitives used:** Progress (upload bar), Button (copy URL, retry, browse)

**Behaviour:**

- Accepts: `.html`, `.htm`, `.css`, `.js`, `.mjs`, `.zip`, `.pdf`, `.wasm` and folder drag
- Uses native `<input type="file">` with `accept` attribute, hidden behind the styled zone
- `webkitdirectory` attribute enabled for folder support (Chrome/Edge)
- On drop: validates file type → calls `onUpload` → parent handles the upload logic
- On success: shows URL with one-click copy button → toast "Copied" via Sonner

**Mobile behaviour:**

- "Tap to browse" replaces drag-and-drop as the primary label text (FR-302)
- Drag-and-drop still works if the device supports it
- Full-width, same vertical sizing as desktop

**Accessibility:**

- Upload zone is a `<button>` (or `<div role="button" tabindex="0">`) for keyboard access
- `aria-label="Upload files. Drop HTML, JS, ZIP, or PDF, or press Enter to browse"`
- Status changes announced via `aria-live="polite"` region
- Progress bar has `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`
- Tab to focus, Enter/Space to open file picker (FR-351)

**Do not:**

- Do not validate file contents (e.g. checking for index.html) — that is server-side
- Do not allow multiple simultaneous uploads in the same zone
- Do not show a generic "something went wrong" error — always use the specific `errorMessage` prop

**Example usage:**

```tsx
<UploadZone
  onUpload={handleFileUpload}
  isUploading={uploadState.isUploading}
  progress={uploadState.progress}
  processingState={uploadState.state}
  errorMessage={uploadState.error}
  deploymentUrl={uploadState.url}
  onCopyUrl={() => copyToClipboard(uploadState.url)}
  onRetry={() => resetUpload()}
/>
```

---

### ShareSheet

**Purpose:** Modal (desktop) or bottom sheet (mobile) that contains all sharing options for a deployment — copy link, embed code, QR download, email, and password toggle.

**File path:** `src/components/app/deployments/ShareSheet.tsx`

**Props interface:**

```typescript
interface ShareSheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback to close the sheet */
  onOpenChange: (open: boolean) => void;
  /** The deployment being shared */
  deployment: Deployment;
  /** The full deployment URL */
  deploymentUrl: string;
  /** Callback to copy link to clipboard */
  onCopyLink: () => void;
  /** Callback to copy embed code to clipboard */
  onCopyEmbed: () => void;
  /** Callback to download QR as PNG */
  onDownloadQrPng: () => void;
  /** Callback to download QR as SVG */
  onDownloadQrSvg: () => void;
  /** Callback to toggle password protection */
  onTogglePassword: (password: string | null) => void;
  /** Current password protection state */
  isPasswordProtected: boolean;
}
```

**Variants / States:**

- **Desktop (≥768px):** Renders as a `Dialog` centered on screen
- **Mobile (<768px):** Renders as a `Sheet` sliding up from bottom (FR-303)
- **Public deployment:** Shows URL, copy, embed, QR, email actions
- **Protected deployment:** Same + lock icon + "Password protected" badge
- **Disabled deployment:** Shows "This deployment is currently disabled" warning

**shadcn primitives used:** Dialog (desktop), Sheet (mobile), Button, Badge, Input (for password), Separator, Tabs

**Behaviour:**

- URL field with "Copy" button — shows "Copied" toast on click (FR-213)
- Embed code section: pre-filled `<iframe>` snippet with copy button
- QR code preview: rendered inline with PNG/SVG download buttons
- Email action: opens `mailto:` with URL pre-filled in body (FR-210)
- Password toggle: inline switch with password input — no separate dialog (FR-211)
- Access state displayed as a Badge at the top: "Public", "Password protected", "Disabled"

**Mobile behaviour:**

- Full-width bottom Sheet with thumb-friendly tap targets (min 44px)
- Sheet slides up with 250ms animation (per PRD Section 6.1)
- Content is scrollable if it overflows

**Accessibility:**

- Dialog/Sheet traps focus — Tab cycles within, Escape closes (FR-352)
- Focus returns to the trigger button on close
- All buttons have visible labels (not icon-only inside the sheet)
- Screen reader: `aria-label="Share {deployment name}"`

**Do not:**

- Do not navigate away from the current page when any share action is taken
- Do not use a separate Dialog for the password input — it must be inline within the sheet
- Do not auto-close the sheet after copying — user may want multiple actions

**Example usage:**

```tsx
<ShareSheet
  open={shareOpen}
  onOpenChange={setShareOpen}
  deployment={deployment}
  deploymentUrl={`https://dropsites.app/${deployment.slug}`}
  onCopyLink={() => copyToClipboard(url)}
  onCopyEmbed={() => copyToClipboard(embedCode)}
  onDownloadQrPng={() => downloadQr("png")}
  onDownloadQrSvg={() => downloadQr("svg")}
  onTogglePassword={handlePasswordToggle}
  isPasswordProtected={!!deployment.password_hash}
/>
```

---

### StatusBadge

**Purpose:** Displays the current state of a deployment as a coloured badge with consistent styling across all surfaces.

**File path:** `src/components/app/deployments/StatusBadge.tsx`

**Props interface:**

```typescript
interface StatusBadgeProps {
  /** The deployment status to display */
  status: "active" | "locked" | "paused" | "expiring" | "expired" | "broken" | "processing";
  /** Optional additional CSS classes */
  className?: string;
}
```

**Variants / States (per PRD Section 6.2):**

- **active:** Green outline — `border-green-200 text-green-700 bg-green-50`
- **locked:** Zinc outline with lock icon — `border-zinc-200 text-zinc-700 bg-zinc-50`
- **paused:** Amber outline — `border-amber-200 text-amber-700 bg-amber-50`
- **expiring:** Orange outline — `border-orange-200 text-orange-700 bg-orange-50`
- **expired:** Orange outline, dimmed — `border-orange-200 text-orange-600 bg-orange-50`
- **broken:** Red outline — `border-red-200 text-red-700 bg-red-50`
- **processing:** Zinc outline with spinner — `border-zinc-200 text-zinc-500 bg-zinc-50`

**shadcn primitives used:** Badge (`variant="outline"`)

**Behaviour:**

- Renders a Badge with `variant="outline"` and status-specific colour classes
- Status icons: Lock for locked, Pause for paused, Clock for expiring/expired, AlertTriangle for broken, Loader2 (spinning) for processing
- Icon size: 12px, rendered inline before the label text
- Pill shape allowed for badges (exception to the rounded-md rule per PRD)

**Mobile behaviour:** Same as desktop — no difference.

**Accessibility:**

- Badge text is the readable status: "Active", "Locked", "Paused", "Expiring", "Expired", "Broken", "Processing"
- Icon is decorative: `aria-hidden="true"`

**Do not:**

- Do not use colour alone to communicate status — always include text and icon
- Do not invent new status values — only the seven listed above
- Do not use `variant="default"` or `variant="destructive"` — always `variant="outline"` with custom colours

**Example usage:**

```tsx
<StatusBadge status="locked" />
<StatusBadge status="active" />
<StatusBadge status="expiring" className="ml-2" />
```

---

### DeploymentHealthIndicator

**Purpose:** Shows the real-time health check result for a deployment — whether it is serving correctly, returning errors, or unreachable.

**File path:** `src/components/app/deployments/DeploymentHealthIndicator.tsx`

**Props interface:**

```typescript
interface DeploymentHealthIndicatorProps {
  /** Health check status */
  health: "healthy" | "degraded" | "down" | "unknown";
  /** Last check timestamp */
  lastCheckedAt: string | null;
  /** Response time in ms from the last check */
  responseTimeMs?: number;
}
```

**Variants / States:**

- **healthy:** Green dot + "Healthy" tooltip
- **degraded:** Amber dot + "Degraded — slow response" tooltip
- **down:** Red dot + "Down — not responding" tooltip
- **unknown:** Grey dot + "Not checked yet" tooltip

**shadcn primitives used:** Tooltip

**Behaviour:**

- Renders a small coloured circle (8px) with a Tooltip on hover/focus showing status text and last checked time
- Dot pulses gently when status is "down" to draw attention
- Response time shown in tooltip when available: "Healthy — 142ms"

**Mobile behaviour:** Same as desktop — tooltip shows on long-press on mobile.

**Accessibility:**

- Dot has `role="status"` and `aria-label` matching the tooltip text
- Wrapped in Tooltip for sighted keyboard users

**Do not:**

- Do not run health checks from this component — it only displays the result
- Do not show the health indicator on disabled/archived deployments
- Do not use text labels inline — the dot + tooltip pattern keeps the row compact

**Example usage:**

```tsx
<DeploymentHealthIndicator
  health="healthy"
  lastCheckedAt="2026-03-25T14:30:00Z"
  responseTimeMs={142}
/>
```

---

## WORKSPACE

---

### WorkspaceSelector

**Purpose:** Dropdown in the sidebar navigation that lets users switch between their workspaces.

**File path:** `src/components/app/workspace/WorkspaceSelector.tsx`

**Props interface:**

```typescript
interface WorkspaceSelectorProps {
  /** List of workspaces the user belongs to */
  workspaces: Workspace[];
  /** Currently active workspace ID */
  activeWorkspaceId: string;
  /** Callback when user selects a different workspace */
  onWorkspaceChange: (workspaceId: string) => void;
}
```

**Variants / States:**

- **Default:** Shows active workspace name with chevron
- **Open:** Dropdown list of all workspaces with role badges
- **Single workspace:** Still rendered but no dropdown affordance (just displays the name)

**shadcn primitives used:** Select, SelectTrigger, SelectContent, SelectItem, Separator

**Behaviour:**

- Shows workspace name and role badge (Owner/Publisher/Viewer) for each option
- Personal workspace always listed first, separated by a Separator from team workspaces
- "Create workspace" action at the bottom of the list, separated by a Separator
- On selection: navigates to the same page in the new workspace context

**Mobile behaviour:** Same rendering — used inside the mobile sidebar Sheet.

**Accessibility:**

- Uses shadcn Select which provides full keyboard navigation (Arrow keys, Enter, Escape)
- `aria-label="Select workspace"`
- Each option has workspace name and role as readable text

**Do not:**

- Do not fetch workspace data from this component — it receives workspaces via props
- Do not allow workspace management (rename, delete) from this dropdown — that is in Settings
- Do not truncate workspace names below 20 characters — allow reasonable width

**Example usage:**

```tsx
<WorkspaceSelector
  workspaces={workspaces}
  activeWorkspaceId={currentWorkspace.id}
  onWorkspaceChange={(id) => router.push(`/w/${id}/deployments`)}
/>
```

---

### WorkspaceMemberRow

**Purpose:** A single row in the workspace members list showing member details, role, and management actions.

**File path:** `src/components/app/workspace/WorkspaceMemberRow.tsx`

**Props interface:**

```typescript
interface WorkspaceMemberRowProps {
  /** The workspace member data */
  member: WorkspaceMember;
  /** Whether the current user is the workspace owner (can manage this member) */
  canManage: boolean;
  /** Callback when role is changed */
  onRoleChange: (userId: string, role: "owner" | "publisher" | "viewer") => void;
  /** Callback when member is removed */
  onRemove: (userId: string) => void;
}
```

**Variants / States:**

- **Active member:** Name, email, role badge, joined date, deployment count, last active
- **Pending invite:** Email, "Pending" badge, invited date, resend button
- **Current user:** Same as active but remove/role-change actions disabled for self
- **Owner row:** Cannot be removed or have role changed (unless transferring ownership)

**shadcn primitives used:** TableRow, TableCell, Badge, Select (for role change), Button (ghost), DropdownMenu, Tooltip

**Behaviour:**

- Columns: Avatar/Initial | Name + Email | Role (editable Select if canManage) | Joined | Deployments | Last active | Actions
- Role change: Select dropdown with Owner/Publisher/Viewer options
- Remove action: in DropdownMenu (⋯), triggers ConfirmDialog
- Pending invites show a "Resend" button instead of activity data

**Mobile behaviour:**

- Shows: Name + Role badge + Actions (⋯)
- Secondary columns hidden
- Touch-friendly action targets (≥44px)

**Accessibility:**

- Role change Select has `aria-label="Change role for {member name}"`
- Remove button has `aria-label="Remove {member name}"`
- All interactive elements reachable via Tab

**Do not:**

- Do not allow removing the workspace owner from this component
- Do not show role-change options to non-owner users
- Do not display raw user IDs — always show name or email

**Example usage:**

```tsx
<WorkspaceMemberRow
  member={member}
  canManage={isOwner}
  onRoleChange={(uid, role) => updateRole(uid, role)}
  onRemove={(uid) => setRemoveTarget(uid)}
/>
```

---

### WorkspaceInviteForm

**Purpose:** Inline form for inviting new members to a workspace by email address with role selection.

**File path:** `src/components/app/workspace/WorkspaceInviteForm.tsx`

**Props interface:**

```typescript
interface WorkspaceInviteFormProps {
  /** Callback when invite is submitted */
  onInvite: (email: string, role: "publisher" | "viewer") => Promise<void>;
  /** Whether an invite is currently being sent */
  isSubmitting: boolean;
}
```

**Variants / States:**

- **Default:** Email input + role selector + "Send invite" button
- **Submitting:** Button shows spinner, inputs disabled
- **Success:** Brief "Invitation sent" confirmation (then resets)
- **Error:** Inline error message below email input (e.g. "Already a member")

**shadcn primitives used:** Input, Select, Button, Label, Form (react-hook-form + zod)

**Behaviour:**

- Email input validated with zod: valid email format required
- Role defaults to "Publisher" (FR-229)
- "Owner" role is not available in this form — ownership transfer is separate
- On submit: calls `onInvite`, shows success toast, clears form
- Invite link expires after 7 days (FR-228) — shown as helper text

**Mobile behaviour:** Full-width stacked layout — email input, role selector, and button each on their own line.

**Accessibility:**

- Email input: `<Label>` with `htmlFor` linking to input
- Role select: `aria-label="Invitation role"`
- Form uses `aria-describedby` for error messages
- Submit via Enter key

**Do not:**

- Do not allow inviting existing members — check and show inline error
- Do not offer the "Owner" role in the role selector
- Do not close or navigate away on success — the form should reset for sending more invites

**Example usage:**

```tsx
<WorkspaceInviteForm
  onInvite={async (email, role) => {
    await inviteMember(workspaceId, email, role);
  }}
  isSubmitting={isInviting}
/>
```

---

## ANALYTICS

---

### AnalyticsOverview

**Purpose:** Top-level summary panel for deployment or workspace analytics showing key metrics as stat cards.

**File path:** `src/components/app/analytics/AnalyticsOverview.tsx`

**Props interface:**

```typescript
interface AnalyticsOverviewProps {
  /** Total views in the selected period */
  totalViews: number;
  /** Unique visitors in the selected period */
  uniqueVisitors: number;
  /** Total bandwidth consumed in bytes */
  bandwidthBytes: number;
  /** Top referrer domain */
  topReferrer: string | null;
  /** Percentage change from previous period */
  viewsDelta?: number;
  /** Whether data is loading */
  isLoading: boolean;
}
```

**Variants / States:**

- **Default:** Four stat cards in a 2×2 grid (desktop) / stacked (mobile)
- **Loading:** Skeleton placeholders for each stat card
- **Empty:** Shows zero values with "No views yet" messaging (FR-308)

**shadcn primitives used:** Skeleton, Card (for stat containers)

**Behaviour:**

- Stat cards: Total Views, Unique Visitors, Bandwidth, Top Referrer
- Bandwidth auto-formats: bytes → KB → MB → GB
- Views delta shows as green (+) or red (−) percentage badge
- Cards have `shadow-sm` and `rounded-lg` per design system

**Mobile behaviour:**

- 2×2 grid becomes a 1-column stack
- Each card is full-width

**Accessibility:**

- Each stat card has a visible label and value
- Delta badge has `aria-label="X% increase/decrease from previous period"`
- Loading skeletons have `aria-label="Loading analytics"`

**Do not:**

- Do not fetch analytics data from this component — it receives all data via props
- Do not show charts here — this is the summary panel; charts are separate components
- Do not display PII or IP addresses — all data is aggregated

**Example usage:**

```tsx
<AnalyticsOverview
  totalViews={1247}
  uniqueVisitors={892}
  bandwidthBytes={52428800}
  topReferrer="twitter.com"
  viewsDelta={12.5}
  isLoading={false}
/>
```

---

### ViewsChart

**Purpose:** Time-series line/bar chart showing daily or weekly view counts for a deployment or workspace.

**File path:** `src/components/app/analytics/ViewsChart.tsx`

**Props interface:**

```typescript
interface ViewsChartProps {
  /** Array of data points with date and view count */
  data: Array<{ date: string; views: number; uniqueVisitors: number }>;
  /** Time granularity for the x-axis */
  granularity: "daily" | "weekly";
  /** Whether data is loading */
  isLoading: boolean;
}
```

**Variants / States:**

- **Default:** Line chart with views and unique visitors as two series
- **Loading:** Skeleton matching chart dimensions
- **Empty:** "No views yet — share your link to get started" with share CTA (FR-308)
- **Hover:** Tooltip on data points showing exact count and date

**shadcn primitives used:** Tabs (for granularity toggle), Skeleton

**Behaviour:**

- Chart rendered with Recharts (or similar lightweight charting library)
- Views line: blue-600, Unique visitors line: zinc-400
- X-axis: dates, Y-axis: count (auto-scaled)
- Hover tooltip shows date, views, and unique visitors
- Granularity toggle: "Daily" / "Weekly" tabs above the chart

**Mobile behaviour:**

- Chart is full-width with horizontal scroll if date range exceeds viewport
- Touch-friendly tooltips on tap instead of hover
- Minimum height of 200px

**Accessibility:**

- Chart has `role="img"` with `aria-label="Views chart showing {summary}"`
- Data table alternative available via screen reader (hidden visually, present in DOM)
- Granularity tabs are keyboard navigable

**Do not:**

- Do not use a heavy charting library — keep bundle size minimal
- Do not animate chart drawing on every re-render — only on initial load
- Do not display bot/crawler views — those are filtered out (FR-331)

**Example usage:**

```tsx
<ViewsChart
  data={viewsData}
  granularity="daily"
  isLoading={false}
/>
```

---

### BandwidthChart

**Purpose:** Time-series chart showing daily bandwidth consumption for a deployment or workspace.

**File path:** `src/components/app/analytics/BandwidthChart.tsx`

**Props interface:**

```typescript
interface BandwidthChartProps {
  /** Array of data points with date and bytes served */
  data: Array<{ date: string; bytesServed: number; requestCount: number }>;
  /** Monthly bandwidth limit in bytes from the workspace limit profile */
  monthlyLimitBytes: number;
  /** Whether data is loading */
  isLoading: boolean;
}
```

**Variants / States:**

- **Default:** Bar chart with bandwidth usage per day + horizontal line showing monthly limit
- **Loading:** Skeleton placeholder
- **Empty:** "No bandwidth data yet" message
- **Near limit (>80%):** Bars turn amber
- **At limit (100%):** Bars turn red, limit line highlighted

**shadcn primitives used:** Skeleton

**Behaviour:**

- Bar chart with Recharts
- Y-axis auto-formats: bytes → KB → MB → GB
- Horizontal dashed line at the monthly bandwidth limit
- Colour: zinc-400 bars normally, amber-500 at 80%+, red-500 at 100%
- Tooltip shows date, bytes served (formatted), and request count

**Mobile behaviour:** Same as ViewsChart — full-width, touch-friendly tooltips.

**Accessibility:**

- Same pattern as ViewsChart: `role="img"`, `aria-label`, hidden data table
- Limit line announced: "Monthly bandwidth limit: {formatted amount}"

**Do not:**

- Do not hardcode bandwidth limits — always use the `monthlyLimitBytes` prop from `getProfile()`
- Do not show cumulative bandwidth — show daily amounts; cumulative is in AnalyticsOverview
- Do not display raw byte values to users — always format to human-readable units

**Example usage:**

```tsx
<BandwidthChart
  data={bandwidthData}
  monthlyLimitBytes={5368709120} // 5 GB
  isLoading={false}
/>
```

---

### ReferrerList

**Purpose:** Ranked list of referrer domains driving traffic to a deployment, showing domain name and view count.

**File path:** `src/components/app/analytics/ReferrerList.tsx`

**Props interface:**

```typescript
interface ReferrerListProps {
  /** Array of referrers sorted by view count descending */
  referrers: Array<{ domain: string; views: number; percentage: number }>;
  /** Whether data is loading */
  isLoading: boolean;
}
```

**Variants / States:**

- **Default:** Ranked list with progress bar showing relative proportion
- **Loading:** 5 Skeleton rows
- **Empty:** "No referrer data yet" message

**shadcn primitives used:** Skeleton, Progress

**Behaviour:**

- Shows top 10 referrers by default
- Each row: rank number, domain name, view count, horizontal progress bar (percentage of total)
- "Direct / None" shown for visits with no referrer
- Progress bar colour: blue-600 for top referrer, zinc-300 for the rest

**Mobile behaviour:** Same layout — full-width rows.

**Accessibility:**

- List uses `<ol>` with `aria-label="Top referrers"`
- Each progress bar has `aria-label="{domain}: {count} views, {percentage}%"`

**Do not:**

- Do not show full referrer URLs — domain only, no paths or query strings (FR-40)
- Do not store or display PII — referrer domains only
- Do not show more than 20 referrers — paginate or truncate with "Show more"

**Example usage:**

```tsx
<ReferrerList
  referrers={[
    { domain: "twitter.com", views: 342, percentage: 45 },
    { domain: "linkedin.com", views: 198, percentage: 26 },
    { domain: "Direct", views: 120, percentage: 16 },
  ]}
  isLoading={false}
/>
```

---

## USAGE & LIMITS

---

### UsagePanel

**Purpose:** Compact panel showing the workspace's current usage across deployments, storage, and bandwidth with quota bars.

**File path:** `src/components/app/usage/UsagePanel.tsx`

**Props interface:**

```typescript
interface UsagePanelProps {
  /** Current number of active deployments */
  deploymentCount: number;
  /** Maximum allowed deployments from limit profile */
  deploymentLimit: number;
  /** Current storage used in bytes */
  storageUsedBytes: number;
  /** Maximum storage in bytes from limit profile */
  storageLimitBytes: number;
  /** Current monthly bandwidth used in bytes */
  bandwidthUsedBytes: number;
  /** Maximum monthly bandwidth in bytes from limit profile */
  bandwidthLimitBytes: number;
  /** The name of the current limit profile */
  profileName: string;
  /** Whether data is loading */
  isLoading: boolean;
}
```

**Variants / States:**

- **Default:** Three QuotaBar components stacked vertically with labels
- **Loading:** Skeleton placeholders for each bar
- **Warning (any quota >80%):** Amber colour on the affected bar
- **Limit reached (any quota 100%):** Red colour on the affected bar + warning text

**shadcn primitives used:** Skeleton, Card

**Behaviour:**

- Renders three `QuotaBar` components: Deployments, Storage, Bandwidth
- Shows profile name badge: "Free", "Pro", "Team", "Enterprise"
- Compact format for sidebar: labels and bars stacked, numbers right-aligned
- Values auto-format: "3 / 5 deployments", "42 MB / 100 MB", "1.2 GB / 5 GB"

**Mobile behaviour:** Same layout — used in sidebar Sheet on mobile.

**Accessibility:**

- Panel has `aria-label="Workspace usage summary"`
- Each QuotaBar is independently accessible (see QuotaBar spec)
- Profile name badge is readable text, not icon-only

**Do not:**

- Do not hardcode limit values — always use props from `getProfile()` (FR-never-hardcode-limits)
- Do not show usage for individual members — this is workspace-level
- Do not hide the panel when usage is low — always visible in sidebar

**Example usage:**

```tsx
<UsagePanel
  deploymentCount={3}
  deploymentLimit={5}
  storageUsedBytes={44040192}
  storageLimitBytes={104857600}
  bandwidthUsedBytes={1073741824}
  bandwidthLimitBytes={5368709120}
  profileName="free"
  isLoading={false}
/>
```

---

### QuotaBar

**Purpose:** A single progress bar showing usage against a quota limit with label, value, and colour-coded warning states.

**File path:** `src/components/app/usage/QuotaBar.tsx`

**Props interface:**

```typescript
interface QuotaBarProps {
  /** Label for this quota (e.g. "Storage", "Bandwidth", "Deployments") */
  label: string;
  /** Current usage value (already formatted for display) */
  currentFormatted: string;
  /** Limit value (already formatted for display) */
  limitFormatted: string;
  /** Usage percentage (0–100) */
  percentage: number;
}
```

**Variants / States:**

- **Normal (0–79%):** Blue-600 fill
- **Warning (80–99%):** Amber-500 fill
- **Critical (100%):** Red-500 fill
- **Unlimited:** Full green bar with "Unlimited" label (enterprise profile)

**shadcn primitives used:** Progress

**Behaviour:**

- Label on top left, "current / limit" on top right
- Progress bar below, coloured by percentage threshold
- Height: 6px bar, compact vertical spacing
- Percentage value not shown as text — communicated by bar fill and the current/limit values

**Mobile behaviour:** Same as desktop.

**Accessibility:**

- Progress element: `aria-label="{label}: {currentFormatted} of {limitFormatted} used"`
- `aria-valuenow={percentage}`, `aria-valuemin="0"`, `aria-valuemax="100"`

**Do not:**

- Do not calculate percentages inside this component — receive `percentage` as a prop
- Do not show decimals in the percentage — round to nearest integer
- Do not animate the bar on every data update — only on initial render

**Example usage:**

```tsx
<QuotaBar
  label="Storage"
  currentFormatted="42 MB"
  limitFormatted="100 MB"
  percentage={42}
/>
```

---

### LimitReachedBanner

**Purpose:** Persistent banner displayed when the workspace has hit a quota limit, with upgrade CTA and explanation of what is blocked.

**File path:** `src/components/app/usage/LimitReachedBanner.tsx`

**Props interface:**

```typescript
interface LimitReachedBannerProps {
  /** Which limit has been reached */
  limitType: "deployments" | "storage" | "bandwidth";
  /** Current profile name */
  profileName: string;
  /** Callback when user clicks upgrade */
  onUpgrade?: () => void;
  /** Callback when user dismisses (only for non-critical limits) */
  onDismiss?: () => void;
}
```

**Variants / States:**

- **Deployment limit:** "You've reached your deployment limit (5/5). Upgrade to create more."
- **Storage limit:** "Your storage is full (100 MB / 100 MB). Upgrade or delete deployments to upload."
- **Bandwidth limit:** "Monthly bandwidth limit reached (5 GB). Your deployments are serving a limit page."
- **Trial ending:** "Your Pro trial ends in X days. Upgrade to keep your limits."

**shadcn primitives used:** Button

**Behaviour:**

- Renders at the top of the page content area, below PageHeader
- Yellow/amber background for warning, red background for critical (bandwidth limit serving limit page)
- "Upgrade" button (Phase 2) or "Manage usage" link (Phase 1)
- Non-dismissable when bandwidth limit is actively serving limit pages
- Dismissable (× button) for warning-level notifications

**Mobile behaviour:** Full-width, text wraps, button stacks below message.

**Accessibility:**

- `role="alert"` for bandwidth limit reached (critical)
- `role="status"` for warning-level limits
- Dismiss button: `aria-label="Dismiss limit warning"`

**Do not:**

- Do not hardcode limit values in the message text — always derive from the limit profile
- Do not show this banner when usage is below 100% — use inline QuotaBar warnings instead
- Do not stack multiple banners — show the most critical one only

**Example usage:**

```tsx
<LimitReachedBanner
  limitType="storage"
  profileName="free"
  onUpgrade={() => router.push("/settings/billing")}
/>
```

---

## NOTIFICATIONS & FEEDBACK

---

### EmptyState

**Purpose:** Reusable empty state component displayed when a list or section has no data, with an illustration, message, and single clear next action.

**File path:** `src/components/app/feedback/EmptyState.tsx`

**Props interface:**

```typescript
interface EmptyStateProps {
  /** Lucide icon component to display */
  icon: React.ComponentType<{ className?: string }>;
  /** Primary message */
  title: string;
  /** Secondary explanation text */
  description: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Variants / States (per PRD Section 3.54):**

- **New user dashboard (FR-306):** Upload icon, "Drop your first file to get started", large UploadZone below
- **Empty workspace (FR-307):** Users icon, "Invite your first team member", "Send invite" button
- **Empty analytics (FR-308):** BarChart icon, "No views yet — share your link to get started", "Share" button
- **Empty search (FR-309):** Search icon, "No deployments match", "Clear filter" button
- **Generic:** Configurable icon, title, description, and action

**shadcn primitives used:** Button

**Behaviour:**

- Centered vertically and horizontally in the parent container
- Icon rendered at 48px in zinc-300
- Title in `text-lg font-medium text-zinc-900`
- Description in `text-sm text-zinc-500`
- Single action button below — never multiple actions (FR-310: "never a dead end")

**Mobile behaviour:** Same layout, full-width padding.

**Accessibility:**

- Icon is decorative: `aria-hidden="true"`
- Title and description are plain text — no special ARIA roles needed
- Action button is the only focusable element

**Do not:**

- Do not show empty states when data is loading — show Skeleton instead
- Do not include more than one action — each empty state has one clear next step
- Do not use illustrations or images — only Lucide icons

**Example usage:**

```tsx
<EmptyState
  icon={Upload}
  title="No deployments yet"
  description="Drop your first file to get started"
  action={{
    label: "Upload a file",
    onClick: () => uploadRef.current?.click(),
  }}
/>
```

---

### ConfirmDialog

**Purpose:** Standardised confirmation dialog for destructive actions like delete, disable, and remove member.

**File path:** `src/components/app/feedback/ConfirmDialog.tsx`

**Props interface:**

```typescript
interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Descriptive message explaining the consequence */
  description: string;
  /** Label for the confirm button */
  confirmLabel: string;
  /** Visual style of the confirm button */
  confirmVariant?: "default" | "destructive";
  /** Callback when user confirms */
  onConfirm: () => void;
  /** Whether the confirm action is in progress */
  isConfirming?: boolean;
}
```

**Variants / States:**

- **Default:** Title, description, Cancel + Confirm buttons
- **Destructive:** Confirm button uses `variant="destructive"` (red)
- **Confirming:** Confirm button shows spinner, both buttons disabled

**shadcn primitives used:** AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction

**Behaviour:**

- Focus trapped inside dialog — Tab cycles between Cancel and Confirm
- Escape key closes without confirming
- Cancel button always on the left, Confirm on the right
- Dialog fades in with 150ms ease-out (per PRD Section 6.1)
- Confirm button has `autoFocus` to prevent accidental Enter-to-confirm on open

**Mobile behaviour:** Same layout — dialog is centered with max-width and horizontal padding.

**Accessibility:**

- Uses Radix AlertDialog — fully keyboard navigable, focus trapped
- Title and description linked via `aria-labelledby` and `aria-describedby`
- Confirm button does NOT have autoFocus for destructive variants — Cancel has focus instead

**Do not:**

- Do not use this for non-destructive confirmations — use a standard Dialog instead
- Do not allow closing by clicking outside for destructive actions — only Cancel or Escape
- Do not put form inputs inside this dialog — it is for yes/no confirmation only

**Example usage:**

```tsx
<ConfirmDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  title="Delete deployment"
  description="This will permanently remove sprint-retro and its URL. This cannot be undone."
  confirmLabel="Delete"
  confirmVariant="destructive"
  onConfirm={handleDelete}
  isConfirming={isDeleting}
/>
```

---

### NotificationBadge

**Purpose:** Small dot or count badge shown on navigation items and icons to indicate unread notifications or new changelog entries.

**File path:** `src/components/app/feedback/NotificationBadge.tsx`

**Props interface:**

```typescript
interface NotificationBadgeProps {
  /** Number of unread items — 0 hides the badge */
  count: number;
  /** Whether to show as a dot (no number) or a count */
  variant?: "dot" | "count";
  /** Additional CSS classes */
  className?: string;
}
```

**Variants / States:**

- **Hidden:** `count === 0` — nothing rendered
- **Dot:** Small red circle (8px) positioned top-right of the parent
- **Count:** Red circle with white number text (up to "99+")

**shadcn primitives used:** None — pure styled span.

**Behaviour:**

- Positioned absolutely relative to the parent element
- Dot variant: 8px red circle, no text
- Count variant: min-width 18px, shows number up to 99, then "99+"
- Background: `bg-red-500`, text: `text-white text-xs font-medium`

**Mobile behaviour:** Same as desktop.

**Accessibility:**

- `aria-label="{count} unread notifications"` on the parent element
- Badge itself is `aria-hidden="true"` — the accessible label is on the parent

**Do not:**

- Do not render when count is 0 — remove from DOM entirely
- Do not use for status indicators — this is for unread counts only
- Do not animate the badge — no pulse or bounce

**Example usage:**

```tsx
<div className="relative">
  <Bell className="h-5 w-5" />
  <NotificationBadge count={3} variant="count" />
</div>
```

---

### GlobalSearch

**Purpose:** Command palette (⌘K / Ctrl+K) for searching across all workspace deployments, accessible from any dashboard page.

**File path:** `src/components/app/feedback/GlobalSearch.tsx`

**Props interface:**

```typescript
interface GlobalSearchProps {
  /** Callback to perform the search */
  onSearch: (query: string) => Promise<SearchResult[]>;
  /** Callback when a result is selected */
  onSelect: (result: SearchResult) => void;
}
```

**Variants / States:**

- **Closed:** Not visible — listening for ⌘K / Ctrl+K
- **Open / Empty:** Search input focused, "Type to search deployments" placeholder
- **Results:** Results grouped by workspace with deployment name, slug, and status badge
- **No results:** "No deployments match" message (FR-309)
- **Loading:** Spinner in the input area while searching

**shadcn primitives used:** Command (CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem)

**Behaviour:**

- Opens on ⌘K (Mac) / Ctrl+K (Windows/Linux)
- Searches deployment names, slugs, and custom domains — not file contents (FR-424)
- Results grouped by workspace name (FR-423)
- Each result shows: workspace name, deployment name, status badge, last updated (FR-425)
- Selecting a result navigates to the deployment detail page
- Debounced search: 200ms delay after typing stops

**Mobile behaviour:**

- Triggered by search icon in AppTopbar instead of keyboard shortcut
- Command palette is full-width, positioned at top of viewport
- Touch-friendly result items (min 44px height)

**Accessibility:**

- shadcn Command component provides full ARIA combobox semantics
- Arrow keys navigate results, Enter selects, Escape closes
- Search input has `aria-label="Search deployments"`
- Results announce via `aria-live` as they update

**Do not:**

- Do not search file contents — only names, slugs, and custom domains
- Do not keep the palette open after selecting a result — navigate and close
- Do not debounce below 150ms — avoids excessive API calls

**Example usage:**

```tsx
<GlobalSearch
  onSearch={async (query) => {
    const results = await searchDeployments(query);
    return results;
  }}
  onSelect={(result) => {
    router.push(`/w/${result.workspaceId}/deployments/${result.slug}`);
  }}
/>
```

---

## FORMS & INPUTS

---

### SlugInput

**Purpose:** Text input for entering a deployment slug with live URL preview, availability checking, and validation feedback.

**File path:** `src/components/app/forms/SlugInput.tsx`

**Props interface:**

```typescript
interface SlugInputProps {
  /** Current slug value */
  value: string;
  /** Callback when slug changes */
  onChange: (value: string) => void;
  /** The base URL for the preview (e.g. "https://dropsites.app") */
  baseUrl: string;
  /** Optional namespace prefix */
  namespace?: string;
  /** Whether the slug is available (null = not checked yet) */
  isAvailable: boolean | null;
  /** Whether availability check is in progress */
  isChecking: boolean;
  /** Error message (e.g. "Name already in use") */
  error?: string;
}
```

**Variants / States:**

- **Empty:** Shows placeholder "my-deployment-name"
- **Typing:** Live URL preview updates as user types (FR-12)
- **Checking:** Spinner indicator while checking availability
- **Available:** Green checkmark, border normal
- **Taken:** Red border, inline "Name already in use" error (FR-11)
- **Invalid:** Red border, inline validation error (invalid characters)

**shadcn primitives used:** Input, Label

**Behaviour:**

- Auto-slugifies input: lowercase, replaces spaces with hyphens, strips invalid characters
- Live URL preview below input: `{baseUrl}/{namespace/}{slug}` in `text-sm text-zinc-500`
- Availability check debounced: 300ms after typing stops
- Accepted characters: `a-z`, `0-9`, `-` (no underscores, no dots)
- Maximum length: 128 characters (per data model)

**Mobile behaviour:** Full-width, same behaviour.

**Accessibility:**

- Input has `aria-describedby` pointing to both the URL preview and any error message
- Availability status announced via `aria-live="polite"` region
- Error state: `aria-invalid="true"` on the input

**Do not:**

- Do not check availability on every keystroke — debounce at 300ms
- Do not accept uppercase characters — auto-convert to lowercase
- Do not allow empty slugs — at least 1 character required

**Example usage:**

```tsx
<SlugInput
  value={slug}
  onChange={setSlug}
  baseUrl="https://dropsites.app"
  namespace={workspace.namespace_slug ?? undefined}
  isAvailable={slugAvailable}
  isChecking={isCheckingSlug}
  error={slugError}
/>
```

---

### PasswordInput

**Purpose:** Password field used for setting deployment access passwords, with visibility toggle and strength indicator.

**File path:** `src/components/app/forms/PasswordInput.tsx`

**Props interface:**

```typescript
interface PasswordInputProps {
  /** Current password value */
  value: string;
  /** Callback when password changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to show the strength indicator */
  showStrength?: boolean;
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
}
```

**Variants / States:**

- **Default:** Password input with dots, eye icon to toggle visibility
- **Visible:** Text input showing plain characters
- **With strength:** Shows weak/medium/strong bar below input
- **Error:** Red border with error message

**shadcn primitives used:** Input, Button (ghost, for eye toggle), Label

**Behaviour:**

- Eye icon toggles between `type="password"` and `type="text"`
- Strength indicator (when enabled): 3-segment bar — red (weak), amber (medium), green (strong)
- No minimum length enforced for deployment passwords — publisher's choice
- Used inside Popover for inline lock from deployment row (FR-60)

**Mobile behaviour:** Same as desktop — virtual keyboard shows in password mode.

**Accessibility:**

- Eye toggle: `aria-label="Show password"` / `aria-label="Hide password"`
- Input: `aria-describedby` links to error message and strength indicator
- Error state: `aria-invalid="true"`

**Do not:**

- Do not enforce password complexity rules on deployment passwords — this is not user account auth
- Do not auto-submit on Enter from this component — the parent form handles submission
- Do not store the password in component state — it flows through props

**Example usage:**

```tsx
<PasswordInput
  value={password}
  onChange={setPassword}
  placeholder="Set access password"
  showStrength={false}
  label="Deployment password"
/>
```

---

### ExpiryPicker

**Purpose:** Date and time picker for setting a link expiry on a deployment, using a calendar popover.

**File path:** `src/components/app/forms/ExpiryPicker.tsx`

**Props interface:**

```typescript
interface ExpiryPickerProps {
  /** Currently selected expiry date/time (null = no expiry) */
  value: Date | null;
  /** Callback when expiry changes */
  onChange: (date: Date | null) => void;
  /** Minimum selectable date (defaults to now) */
  minDate?: Date;
  /** Label text */
  label?: string;
}
```

**Variants / States:**

- **No expiry set:** Button shows "Set expiry" with calendar icon
- **Expiry set:** Button shows formatted date/time, with × to clear
- **Calendar open:** Popover with Calendar component and time selectors
- **Expired:** Red text showing "Expired on {date}"

**shadcn primitives used:** Calendar, Popover, PopoverTrigger, PopoverContent, Button, Input (for time)

**Behaviour:**

- Click button → Popover opens with Calendar
- Calendar prevents selecting past dates
- Time input below calendar: hour and minute selects
- "Clear expiry" button removes the expiry
- Display format: "Mar 25, 2026 at 3:00 PM"
- Quick actions: "In 1 hour", "In 24 hours", "In 7 days", "In 30 days"

**Mobile behaviour:** Same Popover — positioned to avoid viewport overflow on small screens.

**Accessibility:**

- Calendar is keyboard navigable (Arrow keys for days, Tab for month navigation)
- Popover trigger: `aria-label="Set link expiry date"`
- Selected date announced via `aria-live="polite"`
- Time inputs have Labels linked via `htmlFor`

**Do not:**

- Do not allow selecting past dates — minimum is current time
- Do not use a separate page or full dialog — this must be an inline Popover
- Do not default to any expiry — deployments have no expiry unless explicitly set

**Example usage:**

```tsx
<ExpiryPicker
  value={expiryDate}
  onChange={setExpiryDate}
  label="Link expires"
/>
```

---

## SYSTEM PAGES (Served to Deployment Visitors)

---

### PasswordPromptPage

**Purpose:** Full-page password entry screen shown to visitors when a deployment is password-protected.

**File path:** `src/components/app/system-pages/PasswordPromptPage.tsx`

**Props interface:**

```typescript
interface PasswordPromptPageProps {
  /** The deployment slug (for display context) */
  slug: string;
  /** Callback when password is submitted */
  onSubmit: (password: string) => Promise<boolean>;
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** Error message from failed attempt */
  error?: string;
}
```

**Variants / States:**

- **Default:** Centred card with lock icon, deployment name, password input, and submit button
- **Submitting:** Button shows spinner, input disabled
- **Error:** Inline error message "Incorrect password", input border turns red
- **Rate limited:** "Too many attempts. Try again in X minutes." — input and button disabled

**shadcn primitives used:** Card, Input, Button, Label

**Behaviour:**

- Minimal, branded page — DropSites logo in muted zinc at the top
- Lock icon (Lucide) above the input
- Single password input + "Access" button
- Submit on Enter key
- Failed attempts show error inline — never reveal whether the deployment exists
- After 5 failed attempts: rate limit message (FR-brute-force from Section 3.25)

**Mobile behaviour:** Full-width card with horizontal padding, centred vertically.

**Accessibility:**

- Form has `aria-label="Password required to view this content"`
- Input has `<Label>` with `htmlFor`
- Error announced via `aria-live="assertive"`
- WCAG 2.1 AA compliant (FR-353)

**Do not:**

- Do not show the deployment slug or any content before password is verified
- Do not reveal whether the deployment exists — same page for "wrong password" and "no deployment"
- Do not allow more than 10 attempts per minute — enforce rate limiting server-side

**Example usage:**

```tsx
<PasswordPromptPage
  slug="sprint-retro"
  onSubmit={async (pw) => verifyPassword(slug, pw)}
  isSubmitting={isVerifying}
  error={passwordError}
/>
```

---

### ExpiredPage

**Purpose:** Branded page shown to visitors when a deployment's link has expired.

**File path:** `src/components/app/system-pages/ExpiredPage.tsx`

**Props interface:**

```typescript
interface ExpiredPageProps {
  /** The deployment slug */
  slug: string;
  /** When the link expired */
  expiredAt: string;
}
```

**Variants / States:**

- **Default:** Centred message: "This link has expired" with clock icon and expiry date

**shadcn primitives used:** Card

**Behaviour:**

- Minimal branded page with DropSites logo
- Clock icon (Lucide) + "This link has expired" heading
- Subtext: "This content expired on {formatted date}"
- "Published with DropSites" footer link (free tier, FR-247)
- No action for the visitor — they must contact the publisher

**Mobile behaviour:** Full-width, vertically centred.

**Accessibility:**

- Heading is `<h1>`
- WCAG 2.1 AA compliant (FR-354)
- Page `<title>`: "Link Expired — DropSites"

**Do not:**

- Do not show any deployment content or metadata beyond the slug
- Do not provide a "request access" form — this is Phase 1
- Do not include retry/refresh functionality — the expiry is definitive

**Example usage:**

```tsx
<ExpiredPage slug="sprint-retro" expiredAt="2026-03-20T00:00:00Z" />
```

---

### UnavailablePage

**Purpose:** Branded page shown when a deployment has been disabled by the publisher or taken down by an admin.

**File path:** `src/components/app/system-pages/UnavailablePage.tsx`

**Props interface:**

```typescript
interface UnavailablePageProps {
  /** Optional reason code — does NOT reveal the actual reason to visitors */
  reasonCode?: "disabled" | "takedown" | "suspended";
}
```

**Variants / States:**

- **Default:** "This content is unavailable" — neutral, no indication of why (FR-224)

**shadcn primitives used:** Card

**Behaviour:**

- Minimal branded page with DropSites logo
- AlertCircle icon (Lucide) + "This content is unavailable" heading
- No explanation of why — intentionally vague (FR-224: "no indication of why")
- "Report abuse" link in footer (FR-219)
- "Published with DropSites" footer link (free tier)

**Mobile behaviour:** Full-width, vertically centred.

**Accessibility:**

- Heading is `<h1>`
- WCAG 2.1 AA compliant (FR-354)

**Do not:**

- Do not reveal whether the deployment was disabled by the publisher, taken down for abuse, or suspended
- Do not show any deployment metadata
- Do not suggest the visitor try again — the deployment may be permanently removed

**Example usage:**

```tsx
<UnavailablePage reasonCode="disabled" />
```

---

### BandwidthLimitPage

**Purpose:** Branded page shown when a deployment has exceeded its monthly bandwidth limit.

**File path:** `src/components/app/system-pages/BandwidthLimitPage.tsx`

**Props interface:**

```typescript
interface BandwidthLimitPageProps {
  /** When bandwidth resets (start of next month) */
  resetsAt: string;
}
```

**Variants / States:**

- **Default:** "This site has reached its bandwidth limit" with reset date

**shadcn primitives used:** Card

**Behaviour:**

- Minimal branded page with DropSites logo
- Gauge/Activity icon + "This site has temporarily reached its traffic limit" heading
- Subtext: "Check back after {formatted reset date}"
- "Published with DropSites" footer link (free tier)

**Mobile behaviour:** Full-width, vertically centred.

**Accessibility:**

- Heading is `<h1>`
- WCAG 2.1 AA compliant (FR-354)

**Do not:**

- Do not reveal specific bandwidth numbers or the publisher's plan
- Do not provide a way to bypass the limit
- Do not blame the publisher — use neutral, non-judgmental language

**Example usage:**

```tsx
<BandwidthLimitPage resetsAt="2026-04-01T00:00:00Z" />
```

---

### AutoNavWidget

**Purpose:** Floating navigation widget injected at serve-time into multi-page deployments that lack inter-page navigation.

**File path:** `src/components/app/system-pages/AutoNavWidget.tsx`

**Props interface:**

```typescript
interface AutoNavWidgetProps {
  /** List of pages in the deployment */
  pages: Array<{ path: string; title: string }>;
  /** Currently active page path */
  activePath: string;
  /** Base URL for the deployment */
  baseUrl: string;
}
```

**Variants / States:**

- **Collapsed:** Small button in the bottom-right corner with a list/menu icon (FR-66)
- **Expanded:** Floating panel listing all pages as links with the active page highlighted (FR-68)

**shadcn primitives used:** Button (for collapse/expand trigger)

**Behaviour:**

- Collapsed by default: small circular button (40px) in bottom-right, 16px from edges
- Click expands to a panel listing all `.html` files as named links (FR-67)
- Active page highlighted with blue-600 text and left border indicator
- Page titles inferred from `<title>` tags or filename (FR-auto-nav title inference)
- Click outside or press Escape to collapse
- Z-index high but below browser chrome — configurable (FR-71)
- Source files are NEVER modified — injected at serve time only (FR-65)

**Mobile behaviour:**

- Same position and behaviour — touch-friendly tap targets (≥44px) (FR-70)
- Panel max-height 50vh with scroll if many pages

**Accessibility:**

- Trigger button: `aria-label="Page navigation"`, `aria-expanded="true/false"`
- Expanded panel: `<nav aria-label="Page navigation">`
- Active page: `aria-current="page"`
- Keyboard: Tab to trigger, Enter to expand, Arrow keys to navigate pages, Escape to collapse

**Do not:**

- Do not modify source files on disk — this widget is injected at request time via middleware (FR-65)
- Do not inject this widget if the deployment has its own inter-page navigation (FR-64)
- Do not allow the widget to obscure deployment content — position must be configurable (FR-71)

**Example usage:**

```tsx
<AutoNavWidget
  pages={[
    { path: "/index.html", title: "Home" },
    { path: "/about.html", title: "About" },
    { path: "/contact.html", title: "Contact" },
  ]}
  activePath="/about.html"
  baseUrl="https://dropsites.app/my-site"
/>
```

---

## Component Dependency Map

| Component                  | Uses                                                                    |
| -------------------------- | ----------------------------------------------------------------------- |
| **AppLayout**              | AppSidebar, AppTopbar, GlobalSearch, Toaster (Sonner)                   |
| **AppSidebar**             | WorkspaceSelector, UsagePanel, Tooltip, Sheet (mobile)                  |
| **AppTopbar**              | Button, Tooltip                                                         |
| **PageHeader**             | —                                                                       |
| **DeploymentTable**        | DeploymentRow, EmptyState, Skeleton, Checkbox                           |
| **DeploymentRow**          | StatusBadge, DeploymentThumbnail, DeploymentHealthIndicator, UploadZone (inline), PasswordInput (via Popover), Tooltip, DropdownMenu, Checkbox |
| **DeploymentThumbnail**    | Skeleton                                                                |
| **UploadZone**             | Progress, Button                                                        |
| **ShareSheet**             | Dialog/Sheet, Button, Badge, PasswordInput, Separator, Tabs             |
| **StatusBadge**            | Badge                                                                   |
| **DeploymentHealthIndicator** | Tooltip                                                              |
| **WorkspaceSelector**      | Select, Separator                                                       |
| **WorkspaceMemberRow**     | Badge, Select, Button, DropdownMenu, Tooltip                           |
| **WorkspaceInviteForm**    | Input, Select, Button, Label, Form                                      |
| **AnalyticsOverview**      | Skeleton, Card                                                          |
| **ViewsChart**             | Tabs, Skeleton                                                          |
| **BandwidthChart**         | Skeleton                                                                |
| **ReferrerList**           | Skeleton, Progress                                                      |
| **UsagePanel**             | QuotaBar, Skeleton, Card                                                |
| **QuotaBar**               | Progress                                                                |
| **LimitReachedBanner**     | Button                                                                  |
| **EmptyState**             | Button                                                                  |
| **ConfirmDialog**          | AlertDialog (full suite)                                                |
| **NotificationBadge**      | —                                                                       |
| **GlobalSearch**           | Command (full suite)                                                    |
| **SlugInput**              | Input, Label                                                            |
| **PasswordInput**          | Input, Button, Label                                                    |
| **ExpiryPicker**           | Calendar, Popover, Button, Input                                        |
| **PasswordPromptPage**     | Card, Input, Button, Label                                              |
| **ExpiredPage**            | Card                                                                    |
| **UnavailablePage**        | Card                                                                    |
| **BandwidthLimitPage**     | Card                                                                    |
| **AutoNavWidget**          | Button                                                                  |

**Dependency rule:** No component in this table may import a component that lists it as a dependency. All arrows point downward — no circular dependencies.

---

## State Management Notes

### Server Components vs Client Components — Decision Rules

| Use a **Server Component** when…                          | Use a **Client Component** when…                                |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| Rendering static content or data fetched at request time  | The component needs `useState`, `useEffect`, or `useRef`       |
| No user interaction (no `onClick`, `onChange`)             | The component handles user input (forms, buttons, drag-and-drop)|
| Data comes from Supabase server-side query                | The component uses browser APIs (clipboard, file input, drag)   |
| SEO-critical content (system pages)                       | The component subscribes to Supabase Realtime                   |

**Convention:** Server components are the default. Add `"use client"` only when required. Leaf interactive components (Button, Input, DropdownMenu) are already client components via shadcn. Wrapper layout components (AppLayout, PageHeader) should be server components that compose client components.

### Where Supabase Realtime Subscriptions Attach

| Subscription channel                     | Component that subscribes      | What it updates                                           |
| ---------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| `deployments:workspace_id=eq.{id}`       | DeploymentTable (client)       | New/updated/deleted deployments appear in real time        |
| `analytics_events:deployment_id=eq.{id}` | AnalyticsOverview (client)     | Live view count increments                                 |
| `workspace_members:workspace_id=eq.{id}` | WorkspaceMemberRow list (client)| Member joins, role changes, removals reflected live        |
| `bandwidth_daily:deployment_id=eq.{id}`  | BandwidthChart (client)        | Daily bandwidth updates for the active deployment          |

**Rule:** Realtime subscriptions are established in the **page-level client component** (e.g. `DeploymentsPage`) and passed down via props or callback. Individual row/card components do not open their own subscriptions.

### What Lives Where

| State type              | Storage mechanism                                   | Example                                                        |
| ----------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| **Server state**        | Supabase queries via Server Components or SWR/React Query | Deployment list, workspace members, analytics data              |
| **URL state**           | Next.js `searchParams` / `useSearchParams`          | Sort field, sort direction, filter values, active tab           |
| **Ephemeral UI state**  | React `useState` in the nearest client component    | Dialog open/closed, upload progress, form input values          |
| **Workspace context**   | React Context at `AppLayout` level                  | Active workspace ID, user role in workspace, limit profile      |
| **Auth state**          | Supabase Auth (JWT in httpOnly cookie)              | Current user session, validated in Next.js middleware            |
| **Optimistic updates**  | React Query / SWR mutation cache                    | Deployment renamed → show new name before server confirms       |

**Rules:**

1. Never duplicate server state in React state — use SWR/React Query with Supabase as the source of truth.
2. Persist filter/sort preferences in URL params so they survive page refresh and are shareable.
3. Keep dialog/modal open state in the component that renders the dialog — do not lift to global state.
4. Workspace context is read-only from children — mutations go through server actions or API calls.
5. All limit checks call `getProfile(userId)` — never read limit values from local state or hardcoded constants.
