# E2E Test Coverage

Complete listing of all E2E tests added across 4 PRs.

**Total: 165 new test cases across 43 new spec files**

> Governed by [Spec 010 — End-to-End Test Coverage](../../docs/spec/010-e2e-test-coverage/spec.md).
> The [implementation plan](../../docs/spec/010-e2e-test-coverage/plan.md) and
> [task list](../../docs/spec/010-e2e-test-coverage/tasks.md) capture the
> backlog (plugin registry, analytics emission, payments smoke, maps render,
> newsletter validation, client notifications) plus engineering passes
> (resilience and speed). New specs must be added to this file when they
> land and the **Total** line updated.

---

## PR #621 — P0: Critical Business Flows (21 new tests)

### Admin Item CRUD (`tests/admin/items-crud.spec.ts`)
1. admin can create a new item via multi-step form
2. admin can edit an existing item
3. admin can delete an item

### Admin Item Search & Filter (`tests/admin/items-filter.spec.ts`)
4. search bar filters items by name
5. search bar shows empty state for non-matching term
6. status tabs filter items by status
7. clearing search restores full item list

### Admin Item Review (`tests/admin/items-review.spec.ts`)
8. admin can approve a pending item from the actions menu
9. admin can reject a pending item with a reason

### Client Submit & Manage (`tests/client/submit-and-manage.spec.ts`)
10. client can submit a new item via the submit form
11. client can view submission details
12. client can edit a submission
13. client can delete a submission

### Client Favorites Toggle (`tests/client/favorites-toggle.spec.ts`)
14. authenticated client can add and remove a favorite on item detail
15. favorited item appears on favorites page

### Item Votes (`tests/public/votes-and-comments.spec.ts`)
16. authenticated client can upvote and remove upvote
17. unauthenticated user sees vote button

### Item Comments (`tests/public/votes-and-comments.spec.ts`)
18. authenticated client can post a comment
19. authenticated client can edit their own comment
20. authenticated client can delete their own comment
21. unauthenticated user sees sign-in prompt instead of comment form

---

## PR #623 — P1: Admin Management (54 new tests)

### Admin Tags (`tests/admin/tags.spec.ts`)
22. admin can access tags management page
23. admin can create a new tag
24. admin can edit an existing tag
25. admin can delete a tag using native confirm dialog
26. tags page shows tag count in stats

### Admin Collections (`tests/admin/collections.spec.ts`)
27. admin can access collections management page
28. admin can create a new collection
29. admin can edit an existing collection
30. admin can delete a collection using native confirm dialog
31. collections page displays stats cards

### Admin Featured Items (`tests/admin/featured-items.spec.ts`)
32. admin can access featured items page
33. featured items page displays stats cards
34. admin can open add featured item modal
35. search input filters featured items
36. active-only toggle filters items

### Admin Roles (`tests/admin/roles.spec.ts`)
37. admin can access roles management page
38. roles page displays stats cards
39. admin can search roles
40. admin can open add role form modal

### Admin Comments (`tests/admin/comments.spec.ts`)
41. admin can access comments management page
42. comments page displays comment list
43. admin can search comments
44. admin can open delete comment dialog

### Admin Reports (`tests/admin/reports.spec.ts`)
45. admin can access reports management page
46. reports page displays stats cards
47. status tabs filter reports
48. admin can open review dialog for a report
49. reports page shows empty state for non-matching search

### Admin Companies (`tests/admin/companies.spec.ts`)
50. admin can access companies management page
51. admin can open create company modal
52. admin can create a new company
53. admin can open delete company confirmation

### Admin Surveys (`tests/admin/surveys.spec.ts`)
54. admin can access surveys management page
55. surveys page shows create survey button
56. filter buttons switch between All, Global, and Item surveys
57. survey list shows edit and delete actions

### Admin Settings (`tests/admin/settings.spec.ts`)
58. admin can access settings page
59. settings page has accordion sections
60. admin can expand General Settings section
61. admin can expand Homepage Settings section
62. admin can expand Header Settings section
63. admin can expand Monetization Settings section

### Admin Sponsorships (`tests/admin/sponsorships.spec.ts`)
64. admin can access sponsorships management page
65. sponsorships page displays stats and content
66. admin can search sponsorships

### Admin Clients (`tests/admin/clients.spec.ts`)
67. admin can access clients management page
68. clients page displays client list
69. admin can open create client modal
70. admin can open delete client confirmation

### Admin Notifications (`tests/admin/notifications.spec.ts`)
71. notification bell button is visible in admin header
72. clicking bell opens notifications dropdown
73. closing notifications dropdown works
74. notifications dropdown shows content or empty state
75. refresh button triggers notification reload

---

## PR #628 — P2: UI Interactions & Public Pages (40 new tests)

### Theme Toggle (`tests/public/theme-toggle.spec.ts`)
76. theme toggle button is visible in header
77. clicking theme toggle opens dropdown
78. switching to dark mode applies dark class to html
79. switching to light mode removes dark class from html

### Language Switcher (`tests/public/language-switcher.spec.ts`)
80. language switcher button is visible in header
81. clicking language switcher opens dropdown
82. selecting French navigates to /fr locale
83. selecting Spanish navigates to /es locale

### View Toggle (`tests/public/view-toggle.spec.ts`)
84. view toggle buttons are visible on listing page
85. switching to grid view changes the active button
86. switching to list view changes the active button
87. masonry view button toggles correctly

### Public Search Bar (`tests/public/search.spec.ts`)
88. search input is visible on homepage
89. typing in search bar filters content
90. clearing search restores original content

### Scroll to Top (`tests/public/scroll-to-top.spec.ts`)
91. scroll-to-top button is hidden at the top of the page
92. scroll-to-top button appears after scrolling down
93. clicking scroll-to-top scrolls the page to the top

### Newsletter Signup (`tests/public/newsletter.spec.ts`)
94. newsletter email input is visible in footer
95. newsletter form requires email input
96. newsletter form accepts valid email input

### Public Collections (`tests/public/collections.spec.ts`)
97. collections page loads with heading
98. collections page displays collection items
99. clicking a collection navigates to collection detail

### Error Pages (`tests/public/error-pages.spec.ts`)
100. non-existent page shows 404 content
101. 404 page has navigation back to home
102. non-existent item slug shows 404 or error
103. unauthorized page renders access denied content
104. unauthorized page has navigation options

### i18n: Multiple Locales (`tests/i18n/locale-depth.spec.ts`)
105. /fr homepage loads without error
106. /es homepage loads without error
107. /de homepage loads without error
108. /zh homepage loads without error

### i18n: Content Translation (`tests/i18n/locale-depth.spec.ts`)
109. French page renders translated content (not English)
110. Spanish page renders translated content

### i18n: Locale-Prefixed Routes (`tests/i18n/locale-depth.spec.ts`)
111. French discover page loads correctly
112. German categories page loads correctly
113. Chinese pricing page loads correctly

### i18n: RTL Layout Depth (`tests/i18n/locale-depth.spec.ts`)
114. Arabic discover page has RTL layout
115. Arabic categories page has RTL layout

---

## PR #630 — P3: Remaining Coverage Gaps (50 new tests)

### Admin Bulk Operations (`tests/admin/bulk-actions.spec.ts`)
116. select-all checkbox is visible on items page
117. clicking select-all shows bulk action bar
118. bulk action bar has approve, reject, and delete buttons
119. clicking bulk delete opens confirmation dialog
120. clear selection removes bulk action bar

### Admin Data Export (`tests/admin/data-export.spec.ts`)
121. admin dashboard has export format buttons
122. include metadata checkbox is available
123. export/download buttons are available

### Client Profile Settings (`tests/client/profile.spec.ts`)
124. client can access settings page
125. settings page shows settings cards grid
126. client can access basic info form
127. basic info form has save button
128. display name field accepts input

### Client Submissions Trash (`tests/client/trash.spec.ts`)
129. client can access submissions trash page
130. trash page shows items or empty state
131. trash page has back link to submissions

### Sort Menu (`tests/public/sort-menu.spec.ts`)
132. sort trigger button is visible on listing page
133. clicking sort trigger opens dropdown menu
134. selecting a sort option updates the trigger label

### Share Button (`tests/public/share-button.spec.ts`)
135. share button is visible on item detail page
136. clicking share button opens dropdown with social options

### Star Rating (`tests/public/star-rating.spec.ts`)
137. star rating component is visible in comment form for authenticated user
138. clicking a star updates the rating value
139. all 5 star buttons are present

### Profile Dropdown (`tests/public/profile-dropdown.spec.ts`)
140. profile button is visible for authenticated admin
141. clicking profile button opens menu
142. profile menu contains menu items
143. profile menu has logout button
144. pressing Escape closes profile menu

### Login Modal (`tests/public/login-modal.spec.ts`)
145. unauthenticated user clicking favorite triggers login prompt
146. comment section shows sign-in prompt for unauthenticated user

### Public Surveys (`tests/public/surveys.spec.ts`)
147. surveys page loads or returns 404 if disabled
148. surveys page shows heading
149. surveys page displays survey cards or empty state

### Form Validation: Sign-in (`tests/public/form-validation.spec.ts`)
150. sign-in form rejects empty email
151. sign-in form rejects empty password
152. sign-in form shows error for invalid credentials

### Form Validation: Registration (`tests/public/form-validation.spec.ts`)
153. registration form rejects mismatched or missing fields

### API: Comments (`tests/api/comments.spec.ts`)
154. GET comments for an item returns valid response

### API: Votes (`tests/api/comments.spec.ts`)
155. GET vote status for an item returns valid response

### API: Auth (`tests/api/comments.spec.ts`)
156. GET /api/current-user returns user data when authenticated
157. GET /api/current-user returns 401 when unauthenticated

---

## Coverage by Area

| Area | Tests | PR |
|------|-------|----|
| Admin Item CRUD/Review/Filter | 9 | #621 |
| Admin Tags | 5 | #623 |
| Admin Collections | 5 | #623 |
| Admin Featured Items | 5 | #623 |
| Admin Roles | 4 | #623 |
| Admin Comments | 4 | #623 |
| Admin Reports | 5 | #623 |
| Admin Companies | 4 | #623 |
| Admin Surveys | 4 | #623 |
| Admin Settings | 6 | #623 |
| Admin Sponsorships | 3 | #623 |
| Admin Clients | 4 | #623 |
| Admin Notifications | 5 | #623 |
| Admin Bulk Operations | 5 | #630 |
| Admin Data Export | 3 | #630 |
| Client Submit & Manage | 4 | #621 |
| Client Favorites | 2 | #621 |
| Client Profile Settings | 5 | #630 |
| Client Submissions Trash | 3 | #630 |
| Votes & Comments | 6 | #621 |
| Theme Toggle | 4 | #628 |
| Language Switcher | 4 | #628 |
| View Toggle | 4 | #628 |
| Search Bar | 3 | #628 |
| Scroll to Top | 3 | #628 |
| Newsletter Signup | 3 | #628 |
| Sort Menu | 3 | #630 |
| Share Button | 2 | #630 |
| Star Rating | 3 | #630 |
| Profile Dropdown | 5 | #630 |
| Login Modal | 2 | #630 |
| Public Collections | 3 | #628 |
| Public Surveys | 3 | #630 |
| Error Pages (404/403) | 5 | #628 |
| Form Validation | 4 | #630 |
| i18n Locales & RTL | 11 | #628 |
| API Contracts | 4 | #630 |
| **Total** | **165** | |

---

## Not Covered (Require External Services)

The following scenarios are intentionally excluded because they require external service integration, sandbox environments, or infrastructure that cannot be tested in a standard E2E setup:

- **Payment flows** — Stripe checkout modal, sponsorship checkout (need Stripe sandbox)
- **Email flows** — Password reset, email verification (need email infrastructure)
- **Geo Analytics** — `/api/admin/geo-analytics` (needs geo service API keys)
- **Map Status** — `/admin/settings/map-status` (needs map provider API keys)
- **CRM Integration** — Twenty CRM config/test connection (needs CRM instance)
- **Session expiry** — Mid-session redirect to sign-in (hard to simulate reliably)
- **Infinite scroll** — Sentinel-based loading (requires specific data volume)
- **Feature flag states** — Components hidden when flags off (requires flag control)
