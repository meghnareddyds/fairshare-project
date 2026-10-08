# FairShare

A simple app to keep track of shared expenses with friends. You can create a group, add expenses, choose who paid, and split the cost between members. It shows how much each person owes or gets back.

Built with Next.js, React, Flask, and SQLite.

## Run locally

You’ll need Python and Node.js installed. Open two terminals from the project folder.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```








## Features

- Create groups with two or more members.
- Add expenses with a description, amount, and payer.
- Split each expense equally among selected group members.
- View each member’s balance and the group’s total spending.
- Browse expenses and see who paid.
- Store data locally using SQLite.
- Explore a sample “Weekend Trip” group when starting with an empty database.

The backend also provides endpoints for adding members and recording settlements. These actions are not currently exposed in the frontend.

## Tech Stack

| Component | Technology |
| --- | --- |
| Frontend | Next.js 14, React 18, CSS |
| Backend | Python, Flask |
| Database | SQLite |
| ORM | Flask-SQLAlchemy |
| Cross-origin requests | Flask-CORS |

## Project Structure

```text
fairshare/
├── backend/
│   ├── app.py              # API routes, balance calculations, and sample data
│   ├── models.py           # Database models
│   ├── requirements.txt    # Python dependencies
│   └── fairshare.db        # SQLite database, created automatically
└── frontend/
    ├── app/
    │   ├── globals.css     # Application styles
    │   ├── layout.js       # Root layout and metadata
    │   └── page.js         # Main interface
    └── package.json        # Frontend dependencies and scripts
```


## Using the App

1. Select an existing group or click **+ New group**.
2. Enter a group name and comma-separated member names.
3. Click **+ Add expense**.
4. Enter the description and amount, select who paid, and choose the members sharing the expense.
5. Save the expense to update the group’s balances.

A positive balance means a member should receive money. A negative balance means they owe money. A zero balance is displayed as **Settled up**.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/groups` | List groups |
| POST | `/api/groups` | Create a group |
| GET | `/api/groups/<group_id>` | Get a group’s members, balances, and expenses |
| POST | `/api/groups/<group_id>/members` | Add a member |
| POST | `/api/groups/<group_id>/expenses` | Add an expense |
| POST | `/api/groups/<group_id>/settlements` | Record a settlement |

POST endpoints accept JSON request bodies.



## Current Scope

- Expenses are split equally among selected members.
- Amounts are displayed with a dollar sign.
- Member addition and settlement recording are available through the API.
- User authentication, expense editing, and expense deletion are not implemented.
- The startup commands above run local development servers.
