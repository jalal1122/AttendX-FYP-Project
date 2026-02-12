# AttendX UI Style Guide

## 🎨 Design Philosophy

AttendX follows a **Sky Blue Minimalist** design philosophy:
- Clean, uncluttered interfaces
- Consistent use of Sky Blue as the primary accent color
- Subtle shadows and smooth transitions
- Professional typography and spacing
- Intuitive iconography

---

## 🌈 Color Palette

### Primary Colors

```css
/* Sky Blue - Primary Brand Color */
--sky-500: #0ea5e9;  /* Main buttons, links, active states */
--sky-600: #0284c7;  /* Hover states */
--sky-100: #e0f2fe;  /* Light backgrounds */

/* Slate - Text and Backgrounds */
--slate-900: #0f172a;  /* Headings */
--slate-700: #334155;  /* Body text */
--slate-500: #64748b;  /* Muted text */
--slate-50: #f8fafc;   /* App background */

/* Success - Emerald */
--emerald-500: #10b981;  /* Present, Success states */
--emerald-100: #d1fae5;  /* Light success backgrounds */

/* Warning - Amber */
--amber-500: #f59e0b;  /* Late, Warning states */
--amber-100: #fef3c7;  /* Light warning backgrounds */

/* Error - Rose */
--rose-500: #ef4444;  /* Absent, Error states */
--rose-100: #fee2e2;  /* Light error backgrounds */
```

### Usage Guidelines

| Color | Use Case | Example |
|-------|----------|---------|
| Sky Blue | Primary actions, links, active tabs | Login button, Save button |
| Emerald | Success states, positive metrics | "Present" badge, high attendance |
| Amber | Warnings, moderate issues | "Late" badge, 75-85% attendance |
| Rose | Errors, critical issues | "Absent" badge, <75% attendance |
| Slate | Text, borders, subtle backgrounds | Body text, card borders |

---

## 🔤 Typography

### Font Family
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Heading Hierarchy

```css
/* Heading 1 - Page Titles */
.heading-1 {
  font-size: 1.875rem;  /* 30px */
  font-weight: 700;     /* Bold */
  color: #0f172a;       /* Slate-900 */
}

/* Heading 2 - Section Titles */
.heading-2 {
  font-size: 1.5rem;    /* 24px */
  font-weight: 600;     /* Semibold */
  color: #0f172a;
}

/* Heading 3 - Subsection Titles */
.heading-3 {
  font-size: 1.25rem;   /* 20px */
  font-weight: 600;
  color: #1e293b;       /* Slate-800 */
}

/* Body Text */
body {
  font-size: 1rem;      /* 16px */
  line-height: 1.5;
  color: #334155;       /* Slate-700 */
}

/* Muted Text */
.text-muted {
  color: #64748b;       /* Slate-500 */
}
```

---

## 🎯 Components

### Buttons

#### Primary Button
```jsx
<button className="btn-primary">
  Save Changes
</button>
```
- **Use:** Main actions, form submissions
- **Style:** Sky Blue background, white text
- **Hover:** Darker Sky Blue

#### Secondary Button
```jsx
<button className="btn-secondary">
  Cancel
</button>
```
- **Use:** Secondary actions, cancel operations
- **Style:** Light gray background, dark text
- **Hover:** Slightly darker gray

#### Success Button
```jsx
<button className="btn-success">
  Approve
</button>
```
- **Use:** Positive confirmations
- **Style:** Emerald background, white text

#### Danger Button
```jsx
<button className="btn-danger">
  Delete
</button>
```
- **Use:** Destructive actions
- **Style:** Rose background, white text

#### Outline Button
```jsx
<button className="btn-outline">
  Learn More
</button>
```
- **Use:** Tertiary actions
- **Style:** Sky Blue border and text, transparent background
- **Hover:** Sky Blue background, white text

### Cards

#### Basic Card
```jsx
<div className="card">
  <h3 className="heading-3">Card Title</h3>
  <p>Card content goes here...</p>
</div>
```
- **Style:** White background, rounded corners, subtle shadow
- **Use:** Grouping related content

#### Hover Card
```jsx
<div className="card-hover">
  <h3 className="heading-3">Interactive Card</h3>
  <p>Hover to see effect...</p>
</div>
```
- **Style:** Same as card, but with hover effect
- **Hover:** Increased shadow, Sky Blue border
- **Use:** Clickable cards, list items

### Badges

```jsx
<span className="badge-success">Present</span>
<span className="badge-warning">Late</span>
<span className="badge-danger">Absent</span>
<span className="badge-info">Pending</span>
```

| Badge Type | Background | Text Color | Use Case |
|------------|------------|------------|----------|
| Success | Emerald-100 | Emerald-700 | Present, Approved |
| Warning | Amber-100 | Amber-700 | Late, Pending Review |
| Danger | Rose-100 | Rose-700 | Absent, Rejected |
| Info | Sky-100 | Sky-700 | Info, Neutral status |

### Inputs

```jsx
<input 
  type="text" 
  className="input" 
  placeholder="Enter text..."
/>
```
- **Style:** Light border, rounded corners
- **Focus:** Sky Blue ring, no border
- **Error:** Rose border and ring

### Tables

```jsx
<div className="table-container">
  <table className="table">
    <thead className="table-header">
      <tr>
        <th className="table-header-cell">Name</th>
        <th className="table-header-cell">Status</th>
      </tr>
    </thead>
    <tbody className="table-body">
      <tr className="table-row">
        <td className="table-cell">John Doe</td>
        <td className="table-cell">
          <span className="badge-success">Present</span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

**Features:**
- Gradient Sky Blue header
- White text in header
- Hover effect on rows (light Sky Blue background)
- Clean borders
- Responsive (horizontal scroll on mobile)

---

## 📐 Spacing & Layout

### Container Widths
```css
max-width: 1280px;  /* 7xl - Main content */
```

### Padding Scale
```css
p-2: 0.5rem   /* 8px */
p-4: 1rem     /* 16px */
p-6: 1.5rem   /* 24px */
p-8: 2rem     /* 32px */
```

### Gap Scale
```css
gap-2: 0.5rem   /* 8px */
gap-4: 1rem     /* 16px */
gap-6: 1.5rem   /* 24px */
gap-8: 2rem     /* 32px */
```

### Border Radius
```css
rounded-lg: 0.5rem    /* 8px - Buttons, inputs */
rounded-xl: 0.75rem   /* 12px - Cards */
rounded-full: 9999px  /* Badges, avatars */
```

---

## 🎭 Icons

**Library:** Lucide React

**Size Guidelines:**
- Small icons (badges, inline): `w-4 h-4` (16px)
- Medium icons (buttons): `w-5 h-5` (20px)
- Large icons (headers): `w-6 h-6` (24px)
- Extra large (empty states): `w-12 h-12` (48px)

**Color:**
- Match parent text color
- Use semantic colors for status icons

---

## 🌊 Animations & Transitions

### Standard Transition
```css
transition: all 0.2s ease-in-out;
```

### Hover Effects
- **Buttons:** Background color change
- **Cards:** Shadow increase, border color change
- **Links:** Color change
- **Table rows:** Background color change

### Focus States
All interactive elements have focus rings:
```css
focus:outline-none 
focus:ring-2 
focus:ring-sky-500 
focus:ring-offset-2
```

---

## 📱 Responsive Design

### Breakpoints
```css
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
```

### Mobile-First Approach
- Base styles for mobile
- Use `md:` and `lg:` prefixes for larger screens
- Stack grids vertically on mobile
- Hide non-essential elements on small screens

---

## ✅ Accessibility

### Color Contrast
- All text meets WCAG AA standards (4.5:1 for normal text)
- Interactive elements have clear hover and focus states

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus rings are visible and clear
- Tab order is logical

### Screen Readers
- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- Add `aria-label` for icon-only buttons
- Use proper heading hierarchy

---

## 🎨 Component Examples

### Stat Card (Dashboard)
```jsx
<div className="card bg-gradient-to-br from-sky-500 to-sky-600 text-white">
  <h3 className="text-sky-100 text-sm font-medium">Total Classes</h3>
  <p className="text-4xl font-bold mt-2">24</p>
</div>
```

### Status Indicator
```jsx
<div className="flex items-center gap-2">
  <span className="status-online" />
  <span className="text-sm font-medium text-emerald-600">
    All Systems Operational
  </span>
</div>
```

### Notification Item
```jsx
<div className="p-4 bg-sky-50 rounded-lg border-l-4 border-sky-500">
  <div className="flex items-start gap-3">
    <Info className="w-5 h-5 text-sky-500" />
    <div>
      <p className="text-sm font-medium text-slate-900">
        Session Started
      </p>
      <p className="text-xs text-slate-500 mt-1">2 minutes ago</p>
    </div>
  </div>
</div>
```

---

## 🚀 Quick Reference

### Common Patterns

**Page Header:**
```jsx
<div className="bg-white shadow-sm border-b border-slate-100">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <h1 className="heading-1">Page Title</h1>
    <p className="mt-1 text-sm text-muted">Page description</p>
  </div>
</div>
```

**Content Container:**
```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {/* Content */}
</div>
```

**Grid Layout:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Grid items */}
</div>
```

---

## 📚 Resources

- **Tailwind CSS Docs:** https://tailwindcss.com/docs
- **Lucide Icons:** https://lucide.dev
- **Color Palette Tool:** https://tailwindcss.com/docs/customizing-colors
- **Accessibility Checker:** https://webaim.org/resources/contrastchecker/

---

**Last Updated:** Phase 14 (February 2026)

**Maintained By:** AttendX Development Team
