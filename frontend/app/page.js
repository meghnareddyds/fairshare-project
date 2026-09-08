"use client";

import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:5000/api";

const emptyExpense = {
  description: "",
  amount: "",
  paid_by: "",
  split_between: [],
};

export default function Home() {
  const [groups, setGroups] = useState([]);
  const [group, setGroup] = useState(null);
  const [expense, setExpense] = useState(emptyExpense);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [memberNames, setMemberNames] = useState("You, Alex");
  const [error, setError] = useState("");

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    const response = await fetch(`${API}/groups`);
    const data = await response.json();
    setGroups(data);

    if (data.length) {
      loadGroup(data[0].id);
    }
  }

  async function loadGroup(id) {
    const response = await fetch(`${API}/groups/${id}`);
    const data = await response.json();
    setGroup(data);
    setExpense(emptyExpense);
    setError("");
  }

  async function createGroup(event) {
    event.preventDefault();

    const members = memberNames
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    const response = await fetch(`${API}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName, members }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Could not create group.");
      return;
    }

    setShowGroupForm(false);
    setGroupName("");
    setMemberNames("You, Alex");
    await loadGroups();
    await loadGroup(data.id);
  }

  async function addExpense(event) {
    event.preventDefault();

    const response = await fetch(`${API}/groups/${group.id}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...expense,
        amount: Number(expense.amount),
        paid_by: Number(expense.paid_by),
        split_between: expense.split_between.map(Number),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Could not add expense.");
      return;
    }

    setGroup(data);
    setExpense(emptyExpense);
    setShowExpenseForm(false);
    setError("");
  }

  function toggleSplit(memberId) {
    setExpense((current) => {
      const selected = current.split_between.includes(memberId);

      return {
        ...current,
        split_between: selected
          ? current.split_between.filter((id) => id !== memberId)
          : [...current.split_between, memberId],
      };
    });
  }

  const totalSpent = useMemo(() => {
    if (!group) return 0;
    return group.expenses.reduce((sum, item) => sum + item.amount, 0);
  }, [group]);

  return (
    <main className="shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-mark">F</div>
            <span>FairShare</span>
          </div>

          <p className="sidebar-label">Your groups</p>

          <div className="group-list">
            {groups.map((item) => (
              <button
                key={item.id}
                className={group?.id === item.id ? "group-button active" : "group-button"}
                onClick={() => loadGroup(item.id)}
              >
                <span>{item.name}</span>
                <small>{item.member_count}</small>
              </button>
            ))}
          </div>
        </div>

        <button className="new-group" onClick={() => setShowGroupForm(true)}>
          + New group
        </button>
      </aside>

      <section className="content">
        {!group ? (
          <div className="empty-state">
            <h1>Start splitting expenses</h1>
            <p>Create a group for a trip, dinner, apartment or anything shared.</p>
            <button className="primary" onClick={() => setShowGroupForm(true)}>
              Create a group
            </button>
          </div>
        ) : (
          <>
            <header className="page-header">
              <div>
                <p className="eyebrow">Shared expenses</p>
                <h1>{group.name}</h1>
                <p className="subtle">
                  {group.members.length} members · ${totalSpent.toFixed(2)} spent
                </p>
              </div>

              <button
                className="primary"
                onClick={() => {
                  setExpense({
                    ...emptyExpense,
                    paid_by: group.members[0]?.id || "",
                    split_between: group.members.map((member) => member.id),
                  });
                  setShowExpenseForm(true);
                }}
              >
                + Add expense
              </button>
            </header>

            {error && <div className="error">{error}</div>}

            <div className="balance-grid">
              {group.members.map((member) => (
                <article className="balance-card" key={member.id}>
                  <div className="avatar">{member.name.slice(0, 1).toUpperCase()}</div>
                  <div>
                    <span>{member.name}</span>
                    <strong className={member.balance >= 0 ? "positive" : "negative"}>
                      {member.balance === 0
                        ? "Settled up"
                        : member.balance > 0
                        ? `gets $${member.balance.toFixed(2)}`
                        : `owes $${Math.abs(member.balance).toFixed(2)}`}
                    </strong>
                  </div>
                </article>
              ))}
            </div>

            <section className="expenses-panel">
              <div className="section-heading">
                <div>
                  <h2>Recent expenses</h2>
                  <p>Everything added to this group.</p>
                </div>
              </div>

              {group.expenses.length === 0 ? (
                <div className="no-expenses">No expenses yet.</div>
              ) : (
                <div className="expense-list">
                  {group.expenses.map((item) => (
                    <div className="expense-row" key={item.id}>
                      <div className="expense-icon">
                        {item.description.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="expense-main">
                        <strong>{item.description}</strong>
                        <span>Paid by {item.paid_by_name}</span>
                      </div>
                      <div className="expense-amount">
                        <strong>${item.amount.toFixed(2)}</strong>
                        <span>split {item.split_between.length} ways</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>

      {showExpenseForm && group && (
        <div className="modal-backdrop" onMouseDown={() => setShowExpenseForm(false)}>
          <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Add expense</h2>
              <button className="close" onClick={() => setShowExpenseForm(false)}>×</button>
            </div>

            <form onSubmit={addExpense}>
              <label>
                What was it for?
                <input
                  value={expense.description}
                  onChange={(event) =>
                    setExpense({ ...expense, description: event.target.value })
                  }
                  placeholder="Dinner"
                  required
                />
              </label>

              <label>
                Amount
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={expense.amount}
                  onChange={(event) =>
                    setExpense({ ...expense, amount: event.target.value })
                  }
                  placeholder="0.00"
                  required
                />
              </label>

              <label>
                Paid by
                <select
                  value={expense.paid_by}
                  onChange={(event) =>
                    setExpense({ ...expense, paid_by: event.target.value })
                  }
                  required
                >
                  {group.members.map((member) => (
                    <option value={member.id} key={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="split-block">
                <span>Split between</span>
                <div className="check-list">
                  {group.members.map((member) => (
                    <label className="check-row" key={member.id}>
                      <input
                        type="checkbox"
                        checked={expense.split_between.includes(member.id)}
                        onChange={() => toggleSplit(member.id)}
                      />
                      {member.name}
                    </label>
                  ))}
                </div>
              </div>

              <button className="primary full" type="submit">
                Save expense
              </button>
            </form>
          </div>
        </div>
      )}

      {showGroupForm && (
        <div className="modal-backdrop" onMouseDown={() => setShowGroupForm(false)}>
          <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>New group</h2>
              <button className="close" onClick={() => setShowGroupForm(false)}>×</button>
            </div>

            <form onSubmit={createGroup}>
              <label>
                Group name
                <input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Lake house weekend"
                  required
                />
              </label>

              <label>
                Members
                <input
                  value={memberNames}
                  onChange={(event) => setMemberNames(event.target.value)}
                  placeholder="You, Alex, Sam"
                  required
                />
                <small className="helper">Separate names with commas.</small>
              </label>

              <button className="primary full" type="submit">
                Create group
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
