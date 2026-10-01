# Result Darpan

## Run locally

```powershell
npm.cmd install
npm.cmd start
```

Open `http://localhost:3000`.

## Password recovery email

Password recovery sends a six-digit code that expires after 10 minutes. Configure an SMTP account in the server process environment before starting the app:

```powershell
$env:SMTP_HOST = "smtp.example.com"
$env:SMTP_PORT = "587"
$env:SMTP_USER = "your-smtp-user"
$env:SMTP_PASS = "your-smtp-password"
$env:SMTP_FROM = "Result Darpan <no-reply@example.com>"
npm.cmd start
```

Use the SMTP host, username, and password supplied by your email provider. Keep these values out of source control. The reset code allows five verification attempts, expires after 10 minutes, and can be requested at most three times per hour for an email and client address.

## Firebase Authentication & OTP Verification

Result Darpan supports Google Firebase Authentication for email password resets and SMS phone OTP verification without needing your own SMTP email server:

1. Open `http://localhost:3000` and click **Log in** -> **Forgot password?** -> **⚙ Firebase Settings** (or go to `/admin` -> **No-Code Help & Templates**).
2. Enter your Firebase project keys from [Firebase Console](https://console.firebase.google.com):
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `appId`
3. Click **Save & Connect** (saved locally in your browser and `firebase-config.js`).
4. Users can now reset passwords via official Google Firebase emails or verify phone numbers via 6-digit SMS OTPs.

## Admin dashboard & Question Studio

Set `ADMIN_EMAIL` in the server environment to the email address of the admin account:

```powershell
$env:ADMIN_EMAIL = "admin@example.com"
npm.cmd start
```

Sign in with this account and open `http://localhost:3000/admin`.

### Managing test sets and questions without coding

The **Question Studio** inside `/admin` provides a 100% no-code interface:

1. **School Classes (Class 9 - 12) & Competitive Exams**:
   - Toggle between **School Classes** and **Competitive Exams**.
   - Pick any Class or Exam (e.g. Class 10 or SSC CGL) and Subject.
   - Click any existing set (Set 1, Set 2, ...) to view and modify all questions.
   - Click **➕ Add New Set** (e.g. Set 11, Set 12, etc.) to expand practice options for students.
2. **Visual In-Browser Editor**:
   - Change question wording, options (A, B, C, D), and click to select the correct answer.
   - Add topic tags or delete individual questions.
   - Click **💾 Save Set to Website** to make changes live immediately.
3. **Excel & CSV Bulk Import/Export**:
   - Click **📄 CSV Template** (or use `data/question-template.csv`) to download a pre-formatted spreadsheet template.
   - Edit questions in Microsoft Excel or Google Sheets.
   - Click **📥 Import CSV** to load all questions into the editor at once.
   - Click **📤 Export CSV** to download any set for offline backup or edits.
4. **Quick-Paste from Word / PDF**:
   - Click **📋 Quick Paste** and paste questions formatted with `1.`, `A)`, `B)`, `C)`, `D)`, `Answer: B`. The parser automatically loads them into the editor.
5. **Storage and Persistence**:
   - All saved custom sets persist in `data/question-sets.json`.
   - The server automatically calculates scores against updated answer keys and dynamically increments total sets for students.

## Levels and badges

Server-graded tests with at least half the questions answered award 5 points. Each level requires 100 points, starting with Newbie at 0. Each helpful vote from another account awards the message author 10 points. Longest streak milestones award 25 points at 3 days, 50 at 7 days, 100 at 14 days, and 250 at 30 days. Badges are earned once their displayed test, streak, or helpful-vote requirement is met.