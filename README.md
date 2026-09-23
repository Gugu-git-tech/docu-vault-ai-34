# DocuFlow AI

LOVABLE AI — BUILD A COMPLETE PRODUCTION-READY AI DOCUMENT MANAGEMENT PLATFORM

MASTER BUILD INSTRUCTION

Build a complete, secure, fully functional and publishable web-based AI Financial Document Management System.

This must be a real working application that can be accessed through a published website and tested end-to-end.

This is NOT a UI mockup.

This is NOT a static prototype.

This is NOT a simple CRUD dashboard.

The final application must include:

Frontend + Backend + Database + Authentication + File Storage + AI Processing + Duplicate Detection + Approval Workflow + Reporting + AI Insights + Security + Publishing

Everything must work together.

1. CRITICAL LOVABLE RULES — DO NOT WASTE CREDITS

Before changing anything, inspect the existing project.

If this project already contains working functionality, preserve and reuse it.

DO NOT:

rebuild working features unnecessarily

create duplicate pages

create duplicate components

create duplicate database tables

create duplicate authentication systems

create duplicate services

create duplicate configuration

create fake backend services

replace working Supabase functionality with mock data

create unnecessary documentation

create unnecessary demo files

create unnecessary placeholder files

create unnecessary folders

create multiple versions of the same component

create a file named "lovable file"

create files named "lovable project"

create files that exist only to describe the project

generate excessive boilerplate

install unnecessary packages

add libraries that are not required

I do NOT need a large number of files.

I need the minimum clean file structure required for a professional, maintainable and fully functional application.

Reuse existing files and components wherever practical.

2. FRONTEND / BACKEND SEPARATION

Maintain a clean separation between frontend and backend responsibilities.

FRONTEND

Frontend files should contain:

React components

pages

layouts

UI components

styling

frontend state

frontend validation

charts

tables

forms

navigation

responsive design

frontend API/service calls

BACKEND

Backend functionality must remain on the backend.

Backend responsibilities include:

authentication/security enforcement

database operations

Supabase queries

Row Level Security

file storage

AI document processing

AI extraction

duplicate detection logic

approval workflow enforcement

role permissions

audit logging

report data processing

secure server-side operations

Do NOT expose secret API keys or sensitive credentials in frontend code.

Do NOT put server secrets into client-side JavaScript.

Use secure server-side/edge functionality where required.

3. TECHNOLOGY DIRECTION

Use the existing project technology where possible.

Preferred architecture:

React

TypeScript

Tailwind CSS

Supabase

Supabase Authentication

Supabase Database

Supabase Storage

Supabase Row Level Security

Supabase Edge Functions/server-side functionality where required

Lucide Icons

Do not replace the existing technology stack unless there is a genuine technical reason.

Do not install unnecessary dependencies.

4. CORE BUSINESS PURPOSE

The system is an enterprise document management platform for processing:

Allowed documents:

Invoices

Credit Notes

The system must allow authorized users to:

Sign in securely

Upload invoices and credit notes

Store the original documents securely

Automatically extract information using AI

Validate extracted information

Detect duplicate documents

Route documents through exactly 3 approval stages

Track approval status

Maintain an audit history

Generate financial reports

Filter reports

Export reports to PDF and Excel

Analyze report data using AI

Display intelligent financial insights

5. AUTHENTICATION

Implement secure user authentication.

Users must be able to:

Sign up where permitted

Sign in

Sign out

Maintain a secure session

Access protected pages only after authentication

Use Supabase Authentication if Supabase is being used.

Unauthenticated users must NOT be able to access protected application pages.

6. ROLE-BASED ACCESS CONTROL

Implement three primary roles:

ADMIN

Full system access.

Admin can:

manage users

view documents

upload documents

review documents

approve/reject where applicable

access reports

access AI insights

view audit logs

manage system settings

APPROVER

Can:

access assigned documents

review documents

approve documents

reject documents

view relevant document information

access appropriate reports

VIEWER

Read-only access.

Viewer can:

view permitted documents

view reports

view appropriate insights

Viewer must NOT be able to:

approve

reject

delete protected records

change approval states

manage users

Enforce permissions in the backend/database as well as the frontend.

Frontend hiding alone is NOT sufficient security.

7. DATABASE ARCHITECTURE

Use Supabase/PostgreSQL for persistent data.

Create only the database tables actually required by the application.

Do not create unnecessary duplicate tables.

The database should support at minimum the concepts of:

users/profiles

documents

extracted document data

approval stages

approval actions/history

duplicate detection results

audit logs

reportable financial data

Use proper relationships.

Use timestamps.

Use unique identifiers.

Use appropriate indexes for frequently searched fields.

8. ROW LEVEL SECURITY

Implement proper Supabase Row Level Security.

Users should only access information they are authorized to access.

Protect:

documents

financial information

user information

approval records

audit logs

uploaded files

Do not assume that frontend role checks provide security.

Security must be enforced at the database/backend level.

9. SECURE DOCUMENT STORAGE

Use Supabase Storage or the existing secure storage system.

Uploaded files must be securely associated with their document record.

Support:

PDF

PNG

JPG/JPEG

Only allow:

Invoices and Credit Notes

The system should validate:

file type

file size

upload status

Do not allow arbitrary unsupported document types.

10. UPLOAD PAGE

Create a dedicated premium upload page.

Users should be able to:

drag and drop a document

browse for a file

upload the file

see upload progress

see processing progress

receive validation errors

see processing results

The experience should communicate:

UPLOAD
   ↓
PROCESS
   ↓
AI EXTRACTION
   ↓
VALIDATION
   ↓
DUPLICATE CHECK
   ↓
APPROVAL


11. AI DOCUMENT EXTRACTION

When an invoice or credit note is uploaded, automatically process the document using AI.

Extract, where available:

Vendor name

Invoice number

Document type

Invoice/credit note date

Subtotal

VAT/Tax amount

Total amount

Currency

Other relevant financial information available in the document

The extracted information must be saved to the database.

The system must distinguish between:

Invoice

and

Credit Note

Do not simply display hard-coded sample values.

Use actual extracted data.

12. AI EXTRACTION VALIDATION

After extraction, validate important fields.

Check for:

missing invoice number

missing vendor

missing date

missing amount

missing VAT where applicable

invalid totals

suspicious values

If extraction confidence or validation information is available, display it professionally.

Users should be able to review extracted information before approval where appropriate.

13. DUPLICATE DETECTION

Implement actual duplicate detection.

The system must check:

PRIMARY CHECK

Invoice number match against existing records.

If the same invoice number already exists, flag the document as a potential duplicate.

SECONDARY CHECK

Vendor + amount comparison.

If the vendor and amount match an existing record, flag it for review.

Also detect duplicate files where technically practical.

Display:

Duplicate Warning

with useful information about the matching existing document.

Do not automatically delete suspected duplicates.

Allow authorized users to review the warning.

14. DOCUMENT STATUS

Documents should have clear status tracking.

At minimum:

Processing
Pending
Approved
Rejected
Duplicate


Status must be stored in the backend.

The frontend must reflect the actual backend status.

15. EXACTLY 3 APPROVAL STAGES

This requirement is NON-NEGOTIABLE.

Every document requiring approval must follow exactly:

STAGE 1

Reviewer

Actions:

Approve

Reject

STAGE 2

Manager

Actions:

Approve

Reject

STAGE 3

Finance / Admin

Action:

Final Approval

Reject where applicable

16. APPROVAL LOGIC

Approval must happen sequentially.

The system must NOT allow Stage 2 before Stage 1 has been approved.

The system must NOT allow Stage 3 before Stage 2 has been approved.

Example:

Reviewer
   ↓
Approved
   ↓
Manager
   ↓
Approved
   ↓
Finance/Admin
   ↓
Final Approval


If a stage rejects the document:

The workflow must clearly indicate:

Rejected

and prevent inappropriate progression.

17. APPROVAL TIMELINE UI

Display the three stages visually.

Example:

1 — REVIEWER
    ● Pending / Approved / Rejected

          ↓

2 — MANAGER
    ● Pending / Approved / Rejected

          ↓

3 — FINANCE / ADMIN
    ● Pending / Approved / Rejected


Use:

completed indicators

current-stage indicator

pending indicator

rejection indicator

The current stage can have a subtle blue/cyan glow.

18. APPROVAL AUDIT TRAIL

Every approval action must be recorded.

Record:

user

role

action

document

stage

timestamp

previous status

new status

rejection reason where applicable

This information must be available through the audit history.

19. DOCUMENT MANAGEMENT PAGE

Create a professional document management interface.

Include:

search

filters

sorting

status filtering

date filtering

vendor filtering

amount filtering where practical

Display actual database records.

Possible columns:

Document
Type
Vendor
Invoice Number
Date
Amount
VAT
Status
Approval Stage
Actions


Use only fields that actually exist.

20. DOCUMENT DETAILS

Create a professional document detail page.

Use a split layout.

LEFT

Document preview.

RIGHT

Extracted information.

Example:

DOCUMENT INFORMATION

Vendor
[actual vendor]

Invoice Number
[actual invoice number]

Document Date
[actual date]

Subtotal
[actual amount]

VAT
[actual VAT]

Total
[actual total]


Below this:

duplicate analysis

approval workflow

audit history

21. REPORTING MODULE

Build a complete reporting module.

Reports must use real database information.

Include:

SPEND SUMMARY

Show:

total spend

document count

approved spend

pending spend

rejected amount where appropriate

DATE RANGE FILTER

Allow users to select:

start date

end date

Reports must update based on the selected date range.

VENDOR ANALYSIS

Allow filtering and analysis by:

Vendor name

Display:

vendor spend

document count

VAT

approval status where useful

APPROVAL STATUS FILTER

Allow:

All
Pending
Approved
Rejected


AMOUNT FILTER

Allow users to filter by financial amount where practical.

TAX / VAT REPORT

Display:

tax/VAT amount

taxable/subtotal amount where available

total amount

Allow date/vendor filtering where useful.

22. REPORT EXPORT

Users with appropriate permissions must be able to export reports.

Support:

PDF

Professional formatted PDF report.

Excel

Professional Excel spreadsheet.

Exports must contain real filtered data.

Do not create fake report files.

23. REPORT VISUALIZATION

Use professional charts for:

spending trends

vendor spending

approval status

VAT trends

document volume

Charts should match the application's visual identity.

Use:

electric blue

cyan

purple

violet

Do not make charts visually overwhelming.

24. AI-DRIVEN REPORT INSIGHTS

Create a dedicated AI Insights module.

AI should analyze actual report/database information.

Possible insights:

Spending Trends

Identify increases/decreases in spending.

Vendor Insights

Identify significant vendors.

Anomalies

Highlight unusual spending patterns.

Duplicate/Financial Warnings

Identify unusual document patterns where supported.

VAT Insights

Identify notable VAT/tax trends.

Recommendations

Provide useful financial observations based on actual available data.

IMPORTANT:

Never fabricate AI insights.

If there is insufficient data, clearly state that there is insufficient data.

25. DASHBOARD

Create a premium executive dashboard.

Display:

Total Documents
Pending Approvals
Approved
Rejected
Duplicate Warnings
Total Spend
Total VAT


Use actual backend values.

Do NOT use fake numbers.

Add:

spending chart

approval chart

vendor analysis

document volume

AI insights panel

26. AUDIT LOG

Create a dedicated audit log page.

Display actual activity.

Examples:

User
Action
Document
Approval Stage
Timestamp
Previous Status
New Status


Audit logs should be protected and readable.

27. USER MANAGEMENT

Admin users should have a user management page.

Display:

User
Email
Role
Status
Created
Last Activity


Allow authorized administrators to manage roles where supported.

Do not allow viewers or ordinary users to manage users.

28. LOGIN DESIGN

Create a premium branded login page.

It should contain:

application branding

email

password

show/hide password

login

validation

loading state

error state

Use subtle dark blue/purple ambient lighting.

29. PREMIUM FRONTEND UI/UX

The entire application must use a:

DARK NEON AI + FINTECH + ENTERPRISE DESIGN

It must NOT look like a generic admin dashboard.

30. COLOR PALETTE

Use:

#070B14
#0B1020
#0F172A
#111C35
#38BDF8
#60A5FA
#22D3EE
#8B5CF6
#A855F7
#F8FAFC
#94A3B8


Use dark colors as the foundation.

Use bright colors only as accents.

31. VISUAL STYLE

Use:

dark navy backgrounds

electric blue accents

cyan highlights

purple/violet accents

subtle gradients

tasteful glassmorphism

subtle shadows

subtle glow

technical patterns

premium cards

clean typography

The visual identity should feel like:

AI + Financial Technology + Enterprise Security

32. SIDEBAR

Navigation:

Dashboard
Documents
Upload Document
Approvals
Reports
AI Insights
Audit Log
Users
Settings


Use Lucide icons.

Active item:

subtle blue/purple gradient + soft glow

33. TOP HEADER

Include:

page title

search where appropriate

notifications

user profile

role

logout

Keep it clean.

34. GLASSMORPHISM

Use tasteful glass effects on:

dashboard cards

AI panels

upload panel

modals

approval timeline

notifications

Do not overuse it.

35. TECHNICAL BACKGROUND

Use subtle:

radial gradients

grid patterns

geometric elements

ambient blue lighting

ambient purple lighting

Do NOT use distracting animated backgrounds.

36. MICRO-ANIMATIONS

Use subtle animations for:

buttons

cards

upload processing

approval transitions

modals

notifications

loading

Respect reduced-motion settings.

37. RESPONSIVE DESIGN

The application must work on:

desktop

laptop

tablet

mobile

On mobile:

sidebar collapses

tables remain usable

cards stack

charts resize

forms remain accessible

no horizontal page overflow

38. ACCESSIBILITY

Ensure:

strong contrast

keyboard navigation

visible focus states

accessible forms

meaningful labels

useful error messages

appropriate ARIA labels

reduced motion support

39. EMPTY / ERROR / LOADING STATES

Every major feature needs proper:

Loading state

Empty state

Error state

Success state

Do not display blank screens.

Do not expose raw backend errors to ordinary users.

40. SECURITY

Security is a core requirement.

Implement:

authenticated routes

role-based access

database-level authorization

Supabase RLS

secure file storage

server-side secrets

protected backend functions

audit logging

input validation

file validation

Never expose:

API keys

service-role keys

secrets

private credentials

in frontend code.

41. PERFORMANCE

Keep the application fast.

Prefer:

CSS effects

Tailwind

lightweight components

reusable components

optimized database queries

lazy loading where useful

Avoid unnecessary:

animation libraries

particle systems

3D effects

huge images

videos

unnecessary dependencies

42. COMPONENT ARCHITECTURE

Create reusable components where appropriate.

Examples:

Button
Card
StatCard
GlassCard
PageHeader
StatusBadge
Modal
Input
Select
Dropdown
Table
Toast
LoadingSpinner
EmptyState
ErrorState
ChartContainer
ApprovalTimeline
DocumentPreview


Do not duplicate these components across pages.

43. DATA RULE

This is extremely important.

All important business information must come from the backend.

Never hard-code:

documents

users

invoices

amounts

VAT

vendors

approval status

audit events

reports

dashboard statistics

Demo/placeholder data may only be used temporarily during development if absolutely necessary and must NOT remain as production data.

44. END-TO-END FUNCTIONAL FLOW

The completed system must support this complete workflow:

USER LOGIN
     ↓
DASHBOARD
     ↓
UPLOAD INVOICE / CREDIT NOTE
     ↓
SECURE STORAGE
     ↓
AI DOCUMENT EXTRACTION
     ↓
VALIDATION
     ↓
DUPLICATE CHECK
     ↓
DOCUMENT REVIEW
     ↓
REVIEWER APPROVAL
     ↓
MANAGER APPROVAL
     ↓
FINANCE / ADMIN FINAL APPROVAL
     ↓
DOCUMENT COMPLETED
     ↓
REPORTING
     ↓
AI FINANCIAL INSIGHTS


This entire process must work with real data.

45. PUBLISHING REQUIREMENT

The application must be published as a real accessible website.

The final system must allow users to:

Open the website

Reach the login page

Authenticate

Access the dashboard

Upload a document

Process the document

Review extracted information

Detect duplicates

Complete the 3-stage approval process

View reports

Export reports

View AI insights

View audit history

The application must NOT be considered complete merely because the development preview works.

It must be configured for proper production deployment.

46. PRODUCTION READINESS

Before declaring the project complete:

Verify that:

frontend builds successfully

backend functions correctly

database connection works

authentication works

storage works

AI processing works where configured

duplicate detection works

approval workflow works

role permissions work

reports work

PDF export works

Excel export works

audit logging works

responsive design works

production environment variables are correctly configured

no secret keys are exposed

no unnecessary files were generated

47. FINAL FILE STRUCTURE RULE

Keep the project clean.

Use a sensible structure such as:

src/
  components/
  pages/
  layouts/
  services/
  hooks/
  types/
  lib/

supabase/
  functions/
  migrations/


Only create folders/files when they are actually required.

Do NOT blindly create every folder listed above if the existing project does not need it.

The actual existing architecture should be respected.

48. DO NOT CREATE UNNECESSARY FILES

I specifically DO NOT want:

"lovable file"

"lovable project"

unnecessary project descriptions

duplicate README files

unnecessary documentation

unused components

unused services

unused hooks

unused utilities

duplicate styles

fake data files

unnecessary configuration files

unnecessary test/demo pages

Every generated file must have a genuine purpose in making the application work.

49. FINAL DESIGN STANDARD

The finished application should look comparable to a professional commercial:

AI Financial Technology SaaS Platform

It should communicate:

Intelligence
Security
Financial Control
Automation
Enterprise Technology

The combination of:

Dark + Navy + Electric Blue + Cyan + Purple + Violet + Glass + Technical UI

must become the application's visual identity.

The interface must be impressive enough to stand out in a professional portfolio or real enterprise environment.

50. FINAL IMPLEMENTATION CHECKLIST

Before completion verify:

AUTHENTICATION

[ ] Login
[ ] Logout
[ ] Protected routes
[ ] Role-based access
[ ] Admin
[ ] Approver
[ ] Viewer

DOCUMENTS

[ ] Upload invoice
[ ] Upload credit note
[ ] File validation
[ ] Secure storage
[ ] Document list
[ ] Document details
[ ] Document preview

AI

[ ] AI extraction
[ ] Vendor extraction
[ ] Invoice number extraction
[ ] Date extraction
[ ] Amount extraction
[ ] VAT extraction
[ ] Document type detection
[ ] Validation

DUPLICATES

[ ] Invoice number matching
[ ] Vendor + amount validation
[ ] Duplicate warning
[ ] Duplicate status

APPROVALS

[ ] Reviewer
[ ] Manager
[ ] Finance/Admin
[ ] Exactly 3 stages
[ ] Sequential workflow
[ ] Approve
[ ] Reject
[ ] Status tracking
[ ] Approval history

REPORTS

[ ] Spend summary
[ ] Date filter
[ ] Vendor filter
[ ] Status filter
[ ] Amount filter
[ ] VAT report
[ ] Vendor analysis
[ ] PDF export
[ ] Excel export

AI INSIGHTS

[ ] Spending trends
[ ] Anomaly detection
[ ] Vendor insights
[ ] Financial insights
[ ] Real data analysis

SECURITY

[ ] Authentication
[ ] RBAC
[ ] RLS
[ ] Secure storage
[ ] Backend protection
[ ] Secrets protected
[ ] Audit logging

UI/UX

[ ] Premium dark theme
[ ] Neon blue
[ ] Cyan
[ ] Purple
[ ] Violet
[ ] Glassmorphism
[ ] Technical background
[ ] Responsive
[ ] Accessibility
[ ] Micro-interactions

PRODUCTION

[ ] Production build succeeds
[ ] Database works
[ ] Authentication works
[ ] Storage works
[ ] Backend works
[ ] Frontend works
[ ] End-to-end workflow works
[ ] Published website works

FINAL COMMAND TO LOVABLE

Build this as a real production-ready application, not a mockup.

First understand the existing project.

Preserve useful existing functionality.

Implement the missing functionality.

Keep frontend and backend responsibilities properly separated.

Use Supabase securely.

Use real database data.

Use exactly three approval stages:

Reviewer → Manager → Finance/Admin

Implement actual AI extraction, duplicate detection, reporting and AI insights.

Keep the codebase clean.

Use the minimum number of files necessary.

Do not generate unnecessary files.

Do not create a "lovable file".

Do not create duplicate components.

Do not create fake production data.

Do not expose secrets.

Do not sacrifice functionality for visual design.

Do not sacrifice usability for visual effects.

Do not stop at a preview/mockup.

The final result must be a fully functional, secure, responsive, published web application that can be tested end-to-end.

The application should stand out as a premium AI-powered Financial Document Management and Automation Platform.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://docu-vault-ai-34.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/30d5885a-6a58-4963-9317-27b11a334462).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
