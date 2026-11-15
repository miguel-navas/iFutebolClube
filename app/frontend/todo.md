# Copa do Mundo 2026 - App Tracker

## Design Guidelines

### Design References
- **FIFA.com**: Official World Cup branding, bold sports aesthetic
- **ESPN/Goal.com**: Dynamic sports dashboards with live data feel
- **Style**: Dark Mode Sports Dashboard + Bold Typography + Vibrant Accents

### Color Palette
- Primary Background: #0A0F1C (Deep Navy)
- Secondary Background: #131A2E (Dark Blue Card)
- Accent Gold: #D4AF37 (Trophy Gold - highlights)
- Accent Red: #E63946 (Live/Action Red)
- Accent Green: #22C55E (Win/Success Green)
- Text Primary: #FFFFFF (White)
- Text Secondary: #94A3B8 (Slate Gray)
- Border: #1E293B (Subtle borders)

### Typography
- Headings: Inter font-weight 800 (Bold, impactful)
- Subheadings: Inter font-weight 600
- Body: Inter font-weight 400 (14-16px)
- Stats/Numbers: Inter font-weight 700 (tabular nums)

### Key Component Styles
- **Cards**: Dark blue (#131A2E), 1px border (#1E293B), 12px rounded, hover: subtle glow
- **Badges**: Small colored pills for group labels, status indicators
- **Tabs**: Underline style with gold accent
- **Navigation**: Fixed top bar, dark with gradient

### Images to Generate
1. **hero-world-cup-stadium.jpg** - Panoramic view of a massive football stadium at night with dramatic lighting, FIFA World Cup 2026 atmosphere, fireworks (Style: photorealistic, cinematic)
2. **bg-football-field.jpg** - Aerial view of a football pitch with dramatic lighting, dark moody tones (Style: photorealistic, dark mood)
3. **hero-trophy.jpg** - FIFA World Cup golden trophy on dark background with dramatic spotlight and golden particles (Style: photorealistic, luxury)
4. **bg-pattern-dark.jpg** - Abstract dark geometric pattern with subtle football hexagon shapes, deep navy and gold tones (Style: minimalist, dark)

---

## Development Tasks

### Files to Create (8 files max)

1. **src/data/worldCupData.ts** - All static data: 48 teams, 12 groups, stadiums, matches schedule, bracket structure
2. **src/components/Navbar.tsx** - Top navigation with logo, links to sections (Dashboard, Jogos, Grupos, Seleções, Eliminatórias, Estádios)
3. **src/components/CountdownTimer.tsx** - Countdown to June 11, 2026 (opening ceremony)
4. **src/pages/Index.tsx** - Homepage/Dashboard with hero, countdown, featured matches, group highlights
5. **src/pages/Matches.tsx** - Full match schedule with filters by group, date, team
6. **src/pages/Groups.tsx** - All 12 groups with standings tables
7. **src/pages/Teams.tsx** - Grid of 48 teams with flags, group, confederation info
8. **src/pages/Bracket.tsx** - Knockout stage bracket visualization + Stadiums section

### Implementation Notes
- Use react-router-dom for navigation (already available)
- All data is static/mock for MVP
- Responsive design: mobile-first
- Dark theme throughout
- Use shadcn/ui components: Card, Badge, Tabs, Table, ScrollArea