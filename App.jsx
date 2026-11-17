import { useEffect, useMemo, useState } from "react";
import AuthScreen from "./AuthScreen.jsx";

const categories = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Other"];
const categoryColors = {
  Food: "orange",
  Transport: "blue",
  Shopping: "pink",
  Bills: "purple",
  Entertainment: "yellow",
  Health: "green",
  Other: "gray"
};
const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const emptyForm = () => ({ description: "", amount: "", category: "Food", date: today });

async function responseData(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "The request could not be completed.");
  return result;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
}

function dateInputValue(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function CategoryIcon({ category }) {
  const icons = {
    Food: "✳",
    Transport: "↗",
    Shopping: "◇",
    Bills: "▤",
    Entertainment: "♫",
    Health: "♡",
    Other: "＋"
  };
  return <span aria-hidden="true">{icons[category] || "＋"}</span>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => response.ok ? responseData(response) : null)
      .then((result) => { if (result) setUser(result.user); })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError("");
    fetch("/api/expenses")
      .then(responseData)
      .then((data) => { if (active) setExpenses(data); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesCategory = filter === "All" || expense.category === filter;
      const matchesSearch = !query || expense.description.toLowerCase().includes(query) || expense.category.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [expenses, filter, search]);
  const monthTotal = useMemo(() => {
    const currentMonth = new Date();
    return expenses.reduce((total, expense) => {
      const date = new Date(expense.date);
      return date.getUTCMonth() === currentMonth.getMonth() && date.getUTCFullYear() === currentMonth.getFullYear()
        ? total + expense.amount
        : total;
    }, 0);
  }, [expenses]);
  const totalSpent = expenses.reduce((total, expense) => total + expense.amount, 0);

  async function addExpense(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await responseData(await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) })
      }));
      setExpenses((current) => [result, ...current]);
      setForm(emptyForm());
      setNotice("Expense added.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function startEditing(expense) {
    setEditingId(expense._id);
    setEditForm({
      description: expense.description,
      amount: String(expense.amount),
      category: expense.category,
      date: dateInputValue(expense.date)
    });
    setError("");
    setNotice("");
  }

  async function saveEdit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await responseData(await fetch(`/api/expenses/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, amount: Number(editForm.amount) })
      }));
      setExpenses((current) => current.map((expense) => expense._id === editingId ? updated : expense));
      setEditingId(null);
      setNotice("Changes saved.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id) {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!response.ok) await responseData(response);
      setExpenses((current) => current.filter((expense) => expense._id !== id));
      if (editingId === id) setEditingId(null);
      setNotice("Expense deleted.");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function logout() {
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) await responseData(response);
      setUser(null);
      setNotice("");
      setFilter("All");
      setSearch("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (authLoading) {
    return <main className="auth-page"><div className="auth-loading" role="status">Opening your workspace…</div></main>;
  }
  if (!user) return <AuthScreen onAuthenticated={(authenticatedUser) => { setError(""); setUser(authenticatedUser); }} />;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Spendwise home">
          <span className="brand-mark">s</span>
          <span>spendwise<span className="brand-period">.</span></span>
        </a>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className={`nav-item ${activeSection === "overview" ? "active" : ""}`} href="#overview" onClick={() => setActiveSection("overview")}><span className="nav-icon">▦</span> Overview</a>
          <a className={`nav-item ${activeSection === "transactions" ? "active" : ""}`} href="#transactions" onClick={() => setActiveSection("transactions")}><span className="nav-icon">↔</span> Transactions</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="tip-card">
            <span className="tip-spark">✳</span>
            <p className="tip-title">Small steps add up.</p>
            <p className="tip-copy">A little awareness today can make a big difference tomorrow.</p>
          </div>
          <div className="profile">
            <div className="avatar">{user.email.slice(0, 1).toUpperCase()}</div>
            <div className="profile-text"><strong>{user.email}</strong><span>Personal workspace</span></div>
            <button className="logout-button" type="button" onClick={logout}>Sign out</button>
          </div>
        </div>
      </aside>

      <section className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>{activeSection === "overview" ? "Overview" : "Transactions"}</strong></div>
          <div className="topbar-right"><span className="today-label">{new Intl.DateTimeFormat("en-US", { weekday: "short", month: "long", day: "numeric" }).format(new Date())}</span><div className="top-avatar">{user.email.slice(0, 1).toUpperCase()}</div><button className="top-logout" type="button" onClick={logout}>Sign out</button></div>
        </header>

        <div className="page-content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">YOUR MONEY, IN FOCUS</p>
              <h1>Good things start with a clear picture.</h1>
              <p className="subtitle">Keep track of today, and feel good about tomorrow.</p>
            </div>
            <span className="welcome-illustration" aria-hidden="true">✳</span>
          </div>

          <section className="stats-grid" aria-label="Expense summary">
            <article className="stat-card primary-stat">
              <div className="stat-top"><span>This month</span><span className="stat-icon mint">↗</span></div>
              <div className="stat-value">{formatMoney(monthTotal)}</div>
              <div className="stat-foot"><span className="dot mint-dot" /> Spending this month</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>All-time spending</span><span className="stat-icon lilac">◎</span></div>
              <div className="stat-value">{formatMoney(totalSpent)}</div>
              <div className="stat-foot">{expenses.length} {expenses.length === 1 ? "transaction" : "transactions"} recorded</div>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Average expense</span><span className="stat-icon peach">⌁</span></div>
              <div className="stat-value">{formatMoney(expenses.length ? totalSpent / expenses.length : 0)}</div>
              <div className="stat-foot">Across all transactions</div>
            </article>
          </section>

          <div className="content-grid">
            <section className="transactions-panel" id="transactions">
              <div className="panel-heading">
                <div><h2>Recent transactions</h2><p>A little snapshot of where it goes.</p></div>
                <div className="transaction-tools">
                  <label className="search-wrap">
                    <span className="sr-only">Search expenses</span>
                    <span aria-hidden="true">⌕</span>
                    <input type="search" placeholder="Search expenses" value={search} onChange={(event) => setSearch(event.target.value)} />
                    {search && <button type="button" className="clear-search" onClick={() => setSearch("")} aria-label="Clear search">×</button>}
                  </label>
                  <label className="filter-wrap">
                    <span className="sr-only">Filter by category</span>
                    <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                      <option>All</option>
                      {categories.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </label>
                </div>
              </div>
              {error && <div className="error-banner" role="alert">{error}</div>}
              {notice && <div className="success-banner" role="status">{notice}</div>}
              <div className="transaction-list">
                {loading ? <div className="empty-state" role="status">Loading your transactions…</div> :
                  filteredExpenses.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-icon">✳</span>
                      <strong>{search || filter !== "All" ? "No matching expenses" : "Your story starts here"}</strong>
                      <span>{search || filter !== "All" ? "Try another search or category." : "Add an expense to see it show up here."}</span>
                    </div>
                  ) : filteredExpenses.map((expense) => (
                    <div className="transaction-item" key={expense._id}>
                      <article className="transaction-row">
                        <div className={`category-icon ${categoryColors[expense.category]}`}><CategoryIcon category={expense.category} /></div>
                        <div className="transaction-details">
                          <strong>{expense.description}</strong>
                          <span>{expense.category} <i>·</i> {formatDate(expense.date)}</span>
                        </div>
                        <strong className="transaction-amount">−{formatMoney(expense.amount)}</strong>
                        <div className="row-actions">
                          <button className="edit-button" type="button" onClick={() => startEditing(expense)} aria-label={`Edit ${expense.description}`} title="Edit expense">Edit</button>
                          <button className="delete-button" type="button" onClick={() => deleteExpense(expense._id)} aria-label={`Delete ${expense.description}`} title="Delete expense">×</button>
                        </div>
                      </article>
                      {editingId === expense._id && (
                        <form className="edit-form" onSubmit={saveEdit}>
                          <label>Description<input value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} maxLength="100" required /></label>
                          <label>Amount<input type="number" min="0.01" step="0.01" value={editForm.amount} onChange={(event) => setEditForm({ ...editForm, amount: event.target.value })} required /></label>
                          <label>Category<select value={editForm.category} onChange={(event) => setEditForm({ ...editForm, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                          <label>Date<input type="date" value={editForm.date} onChange={(event) => setEditForm({ ...editForm, date: event.target.value })} required /></label>
                          <div className="edit-actions"><button type="button" className="cancel-edit" onClick={() => setEditingId(null)}>Cancel</button><button type="submit" className="save-edit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button></div>
                        </form>
                      )}
                    </div>
                  ))}
              </div>
              <div className="list-footer">{filteredExpenses.length} {filteredExpenses.length === 1 ? "transaction" : "transactions"}{filter !== "All" ? ` · ${filter}` : ""}{search ? " · Search active" : ""}</div>
            </section>

            <aside className="add-panel">
              <div className="add-heading"><div className="add-heading-icon">＋</div><div><h2>Add expense</h2><p>Log something you spent.</p></div></div>
              <form onSubmit={addExpense}>
                <label htmlFor="description">What was it for?</label>
                <input id="description" type="text" placeholder="e.g. Coffee with Alex" maxLength="100" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
                <div className="form-row">
                  <div><label htmlFor="amount">Amount</label><div className="amount-input"><span>$</span><input id="amount" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></div></div>
                  <div><label htmlFor="date">Date</label><input id="date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required /></div>
                </div>
                <label htmlFor="category">Category</label>
                <select id="category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
                <button className="submit-button" type="submit" disabled={saving}>{saving ? "Adding…" : "Add expense"} <span>↗</span></button>
              </form>
              <div className="form-note"><span>✳</span> Every small step counts. You’ve got this.</div>
            </aside>
          </div>

          <footer className="page-footer"><span>Made for a little more peace of mind.</span><span>Spendwise <i>·</i> Your data, your clarity.</span></footer>
        </div>
      </section>
    </main>
  );
}
