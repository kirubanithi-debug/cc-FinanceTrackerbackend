# Authentication Implementation Plan

## Objective
Implement a secure Login and Signup system for FinanceFlow, ensuring only authenticated users can access the dashboard.

## 1. Backend Dependencies
- Install `bcryptjs` (Password hashing)
- Install `jsonwebtoken` (JWT for session management)

## 2. Database Schema (`database/db.js`)
- Create `users` table:
    - `id` (INTEGER PRIMARY KEY)
    - `name` (TEXT)
    - `email` (TEXT UNIQUE)
    - `password` (TEXT - Hashed)
    - `created_at` (DATETIME)

## 3. Backend Implementation
- **Middleware (`middleware/authMiddleware.js`)**:
    - Verify JWT token from `Authorization` header.
    - Protect `/api/clients`, `/api/invoices`, `/api/entries`, `/api/analytics`.
- **Controller (`controllers/authController.js`)**:
    - `signup`: Validate email format, check duplicates, hash password, create user.
    - `login`: Find user, verify password, generate JWT token.
    - `me`: Return current user info.
- **Routes (`routes/auth.js`)**:
    - `POST /signup`
    - `POST /login`
    - `GET /me`

## 4. Frontend Implementation
- **Create Pages**:
    - `login.html`: Beautiful login form.
    - `signup.html`: Beautiful signup form.
- **Logic (`js/auth.js`)**:
    - Handle form submissions.
    - Store JWT in `localStorage`.
    - Handle Redirects.
- **Update `app.js`**:
    - Check for token on initialization.
    - Redirect to `login.html` if no token found (and not currently on auth pages).
    - Add "Logout" button to Sidebar.

## 5. Security & Verification
- Ensure duplicate emails are rejected ("check the email ia already there").
- Validate email format with Regex.

## Execution Order
1. Install Dependencies.
2. Update Database Schema.
3. Create Backend Auth Logic (Controller/Routes/Middleware).
4. Create Frontend Auth Pages.
5. Integrate Auth Logic into Frontend.
