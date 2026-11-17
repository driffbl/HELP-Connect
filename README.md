\# HELP Connect



A peer-to-peer student support and volunteering platform built for HELP University students.



\*\*Course:\*\* BIT216 Software Engineering Principles  

\*\*Assignment:\*\* Assignment 2



\## Team

\- Coel Choo Zheng Nam (B2300634) – Team Leader

\- Law Wei Yang (B2300727)

\- Teh Zu Yuan (B2300879)



\## Tech Stack

\- Frontend: React.js

\- Backend: Node.js + Express.js

\- Database: MySQL

\- Cloud: AWS (S3, EC2, RDS, SES)



\## Repository Structure

\- `frontend/` – React frontend

\- `backend/` – Express API

\- `database/` – SQL schema and seed scripts

\- `documentation/` – Project plan, requirements, design, testing



\## Branching Strategy

\- `main` – stable code

\- `coel\_branch`, `weiyang\_branch`, `zuyuan\_branch` – individual work branches

\- Merges via Pull Request + review


## Email Integration (Google Gmail API)

This project uses the Google Gmail API to send 2FA OTP codes to users. 

**Setup Instructions (For Markers / New Developers):**
1. You need to provide your own `credentials.json` file in the `backend/` folder. You can download this from the Google Cloud Console by enabling the Gmail API and creating an OAuth 2.0 Client ID (Desktop App).
2. Open your terminal, navigate to the `backend` folder, and run `node auth.js`.
3. Follow the link in the terminal to authorize the app with your Google account. Copy the code back into the terminal.
4. This will generate a `token.json` file in the `backend/` folder.
5. Start the backend server (`npm run dev`). The app will now successfully send real emails.

*Note: `credentials.json` and `token.json` are excluded from this repository via `.gitignore` for security reasons.*