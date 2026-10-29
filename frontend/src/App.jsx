import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5091/api';
const EMPTY_FORM = { title: '', description: '', location: '' };
const STATUSES = [
  { value: 'New', label: 'Нова' },
  { value: 'InProgress', label: 'У роботі' },
  { value: 'Completed', label: 'Виконана' },
];

async function apiRequest(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }
  }

  if (!response.ok) {
    let message = data?.message || data?.title || data?.detail;
    if (!message && data?.errors) {
      message = Object.values(data.errors).flat().join(' ');
    }
    throw new Error(message || `Помилка запиту (${response.status})`);
  }

  return data;
}

function extractUser(data) {
  return data?.user ?? data;
}

function extractRequests(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.value)) return data.value;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function hasAdminRole(user) {
  if (!user) return false;
  if (user.isAdmin === true) return true;
  const roles = Array.isArray(user.roles) ? user.roles : user.roles ? [user.roles] : [];
  const roleText = [...roles, user.role, user.roleName].filter(Boolean).join(' ').toLowerCase();
  return roleText.includes('admin');
}

function statusInfo(status) {
  const map = {
    New: { label: 'Нова', className: 'status-new' },
    InProgress: { label: 'У роботі', className: 'status-progress' },
    Completed: { label: 'Виконана', className: 'status-completed' },
  };
  return map[status] || { label: status || 'Невідомо', className: 'status-new' };
}

function formatDate(value) {
  if (!value) return 'Дата невідома';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Дата невідома';
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 40 40" role="img">
        <path d="M7 18.5 20 7l13 11.5v14a1.5 1.5 0 0 1-1.5 1.5h-23A1.5 1.5 0 0 1 7 32.5z" />
        <path d="M16 34V23h8v11M13 18h14M20 12v5" />
      </svg>
    </div>
  );
}

function AuthScreen({ mode, setMode, onAuthenticated }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isRegister = mode === 'register';

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const path = isRegister ? '/Auth/register' : '/Auth/login';
      const payload = isRegister
        ? { fullName: fullName.trim(), email: email.trim(), password, roomNumber: roomNumber.trim() }
        : { email: email.trim(), password };
      await apiRequest(path, { method: 'POST', body: JSON.stringify(payload) });
      const me = await apiRequest('/Auth/me');
      onAuthenticated(extractUser(me));
    } catch (requestError) {
      setError(requestError.message || 'Не вдалося виконати запит. Перевір дані та спробуй ще раз.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="visual-topline"><BrandMark /><span>DORMITORY SERVICE</span></div>
        <div className="visual-content">
          <span className="eyebrow light-eyebrow">КОМФОРТ ПОЧИНАЄТЬСЯ З ТУРБОТИ</span>
          <h1>Твій гуртожиток.<br /><em>Твій комфорт.</em></h1>
          <p>Повідомляй про несправності, відстежуй виконання заявок і будь на зв’язку з адміністрацією в одному місці.</p>
          <div className="visual-feature"><span className="feature-check">✓</span><span>Заявки під контролем — від створення до виконання</span></div>
          <div className="visual-feature"><span className="feature-check">✓</span><span>Зручний зв’язок між мешканцями й адміністрацією</span></div>
        </div>
        <div className="visual-footer"><span>СЕРВІС ОБСЛУГОВУВАННЯ ГУРТОЖИТКУ</span><span>© 2026</span></div>
        <div className="visual-orb orb-one" /><div className="visual-orb orb-two" />
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand"><BrandMark /><span>Dormitory Service</span></div>
        <div className="auth-card">
          <div className="auth-heading">
            <span className="eyebrow">ТВОЄ ОСОБИСТЕ СЕРЕДОВИЩЕ</span>
            <h2>{isRegister ? 'Створити акаунт' : 'З поверненням!'}</h2>
            <p>{isRegister ? 'Зареєструйся, щоб подавати та відстежувати заявки.' : 'Увійди, щоб керувати своїми заявками.'}</p>
          </div>

          <div className="auth-switch" role="tablist" aria-label="Вхід або реєстрація">
            <button type="button" className={!isRegister ? 'selected' : ''} onClick={() => { setMode('login'); setError(''); }}>Вхід</button>
            <button type="button" className={isRegister ? 'selected' : ''} onClick={() => { setMode('register'); setError(''); }}>Реєстрація</button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {isRegister && <label>Ім’я та прізвище<input autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Наприклад, Іван Петренко" minLength={2} maxLength={100} required /></label>}
            <label>Електронна пошта<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" maxLength={256} required /></label>
            <label>Пароль<input type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isRegister ? 'Щонайменше 8 символів' : 'Введи свій пароль'} minLength={8} required /></label>
            {isRegister && <label>Номер кімнати <span className="optional">необов’язково</span><input value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="Наприклад, 214" maxLength={50} /></label>}
            {error && <div className="inline-error" role="alert">{error}</div>}
            <button className="primary-button auth-submit" type="submit" disabled={busy}>
              {busy ? 'Зачекай…' : isRegister ? 'Створити акаунт' : 'Увійти в акаунт'}
              {!busy && <span aria-hidden="true">↗</span>}
            </button>
          </form>
          <p className="auth-terms">Продовжуючи, ти використовуєш сервіс для подання та супроводу заявок на обслуговування гуртожитку.</p>
        </div>
      </section>
    </main>
  );
}

function RequestCard({ request, isAdmin, onStatusChange, busy }) {
  const status = statusInfo(request.status);
  return (
    <article className="request-card">
      <div className="request-card-top">
        <div className="request-number">ЗАЯВКА <span>#{String(request.id).padStart(3, '0')}</span></div>
        <span className={`status-pill ${status.className}`}><span className="status-dot" />{status.label}</span>
      </div>
      <h3>{request.title}</h3>
      <p className="request-description">{request.description}</p>
      <div className="request-meta">
        <div className="meta-item"><span className="meta-icon">⌖</span><span>{request.location || 'Місце не вказано'}</span></div>
        <div className="meta-item"><span className="meta-icon">◷</span><span>{formatDate(request.createdAtUtc)}</span></div>
      </div>
      {isAdmin && <div className="resident-meta"><span className="avatar-mini">{(request.residentName || 'М').trim().charAt(0).toUpperCase()}</span><span>{request.residentName || 'Мешканець'}</span></div>}
      {isAdmin && <div className="admin-status-control"><label htmlFor={`status-${request.id}`}>Змінити статус</label><select id={`status-${request.id}`} value={request.status} disabled={busy} onChange={(e) => onStatusChange(request.id, e.target.value)}>{STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>}
    </article>
  );
}

function Dashboard({ user, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState(null);
  const [notice, setNotice] = useState(null);
  const isAdmin = hasAdminRole(user);

  const loadRequests = useCallback(async () => {
    const data = await apiRequest('/MaintenanceRequests');
    setRequests(extractRequests(data));
  }, []);

  useEffect(() => {
    let active = true;
    setRequestsLoading(true);
    apiRequest('/MaintenanceRequests')
      .then((data) => { if (active) setRequests(extractRequests(data)); })
      .catch((error) => { if (active) setNotice({ type: 'error', text: error.message }); })
      .finally(() => { if (active) setRequestsLoading(false); });
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => ({
    total: requests.length,
    active: requests.filter((r) => r.status === 'New' || r.status === 'InProgress').length,
    completed: requests.filter((r) => r.status === 'Completed').length,
  }), [requests]);

  async function createRequest(event) {
    event.preventDefault();
    setNotice(null);
    setSubmitting(true);
    try {
      await apiRequest('/MaintenanceRequests', {
        method: 'POST',
        body: JSON.stringify({ title: form.title.trim(), description: form.description.trim(), location: form.location.trim() }),
      });
      setForm(EMPTY_FORM);
      await loadRequests();
      setNotice({ type: 'success', text: 'Заявку успішно створено. Вона вже з’явилася у списку.' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(id, status) {
    setNotice(null);
    setStatusBusyId(id);
    try {
      await apiRequest(`/MaintenanceRequests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadRequests();
      setNotice({ type: 'success', text: `Статус заявки №${id} змінено на «${statusInfo(status).label}».` });
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setStatusBusyId(null);
    }
  }

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="sidebar-brand"><BrandMark /><div><strong>DormCare</strong><span>СЕРВІС ГУРТОЖИТКУ</span></div></div>
        <div className="sidebar-label">РОБОЧИЙ ПРОСТІР</div>
        <div className="sidebar-link current"><span className="nav-icon">▦</span><span>{isAdmin ? 'Усі заявки' : 'Мої заявки'}</span><span className="nav-arrow">›</span></div>
        <div className="sidebar-note"><span className="note-symbol">✳</span><strong>Твій комфорт важливий</strong><p>Повідомляй про проблеми — ми допоможемо їх вирішити.</p></div>
        <div className="sidebar-bottom"><div className="secure-mark">⌑</div><div><strong>Особистий кабінет</strong><span>Безпечний доступ до заявок</span></div></div>
      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div className="breadcrumb"><span>Сервіс</span><span className="crumb-slash">/</span><strong>{isAdmin ? 'Усі заявки' : 'Мої заявки'}</strong></div>
          <div className="account-menu"><div className="avatar">{(user.fullName || user.email || 'К').trim().charAt(0).toUpperCase()}</div><div className="account-details"><strong>{user.fullName || 'Користувач'}</strong><span>{isAdmin ? 'Адміністратор' : (user.roomNumber ? `Кімната ${user.roomNumber}` : 'Мешканець')}</span></div><button className="logout-button" type="button" onClick={onLogout} title="Вийти з акаунта" aria-label="Вийти з акаунта">↗</button></div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row"><div><span className="eyebrow">ПАНЕЛЬ КЕРУВАННЯ</span><h1>{isAdmin ? 'Заявки мешканців' : 'Вітаємо, ' + (user.fullName?.split(' ')[0] || 'мешканцю') + '!'}</h1><p>{isAdmin ? 'Переглядай звернення та оновлюй статус виконання.' : 'Тут ти можеш повідомити про несправність і стежити за її вирішенням.'}</p></div><div className="today-chip"><span className="today-icon">◷</span><span>{new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span></div></section>

          {notice && <div className={`notice notice-${notice.type}`} role="status"><span>{notice.type === 'success' ? '✓' : '!'}</span><p>{notice.text}</p><button type="button" onClick={() => setNotice(null)} aria-label="Закрити повідомлення">×</button></div>}

          <section className="stats-grid" aria-label="Статистика заявок">
            <div className="stat-card"><div className="stat-icon icon-total">▤</div><div className="stat-label">Усього заявок</div><div className="stat-bottom"><strong>{counts.total}</strong><span>за весь час</span></div></div>
            <div className="stat-card"><div className="stat-icon icon-active">◷</div><div className="stat-label">На розгляді</div><div className="stat-bottom"><strong>{counts.active}</strong><span>очікують виконання</span></div></div>
            <div className="stat-card"><div className="stat-icon icon-done">✓</div><div className="stat-label">Виконано</div><div className="stat-bottom"><strong>{counts.completed}</strong><span>успішно завершено</span></div></div>
          </section>

          <div className={`main-grid ${isAdmin ? 'admin-layout' : ''}`}>
            {!isAdmin && <section className="panel create-panel"><div className="panel-heading"><div><span className="eyebrow">НОВЕ ЗВЕРНЕННЯ</span><h2>Створити заявку</h2></div><div className="panel-heading-icon">＋</div></div><p className="panel-intro">Опиши проблему, і адміністрація зможе взяти її в роботу.</p>
              <form className="request-form" onSubmit={createRequest}>
                <label>Назва проблеми<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Наприклад, не працює освітлення" minLength={3} maxLength={120} required /></label>
                <label>Опис проблеми<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Опиши, що сталося та де саме…" minLength={5} maxLength={2000} rows={4} required /></label>
                <label>Місце <span className="optional">необов’язково</span><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Наприклад, 2 поверх, коридор" maxLength={50} /></label>
                <button className="primary-button submit-request" type="submit" disabled={submitting}>{submitting ? 'Надсилання…' : 'Надіслати заявку'}<span aria-hidden="true">↗</span></button>
              </form>
              <div className="privacy-note"><span>⌑</span> Твої дані доступні лише авторизованим користувачам сервісу.</div>
            </section>}

            <section className="panel requests-panel"><div className="panel-heading requests-heading"><div><span className="eyebrow">ІСТОРІЯ ЗВЕРНЕНЬ</span><h2>{isAdmin ? 'Усі заявки' : 'Мої заявки'} <span className="count-badge">{counts.total}</span></h2></div><button className="refresh-button" type="button" onClick={() => { setRequestsLoading(true); loadRequests().catch((error) => setNotice({ type: 'error', text: error.message })).finally(() => setRequestsLoading(false)); }} title="Оновити список" aria-label="Оновити список">↻</button></div>
              <div className="request-list">
                {requestsLoading ? <div className="empty-state"><div className="loading-spinner" /><strong>Завантажуємо заявки…</strong><span>Отримуємо актуальні дані із сервера.</span></div> : requests.length === 0 ? <div className="empty-state"><div className="empty-illustration">▤</div><strong>Поки що заявок немає</strong><span>{isAdmin ? 'Коли мешканці створять звернення, вони з’являться тут.' : 'Створи першу заявку через форму ліворуч.'}</span></div> : requests.map((request) => <RequestCard key={request.id} request={request} isAdmin={isAdmin} onStatusChange={changeStatus} busy={statusBusyId === request.id} />)}
              </div>
            </section>
          </div>
          <footer className="page-footer"><span>© 2026 DormCare</span><span>Сервіс підтримки мешканців гуртожитку</span><span><i /> Система працює</span></footer>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [checkingSession, setCheckingSession] = useState(true);
  const [dashboardKey, setDashboardKey] = useState(0);

  useEffect(() => {
    let active = true;
    apiRequest('/Auth/me')
      .then((data) => { if (active) setUser(extractUser(data)); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, []);

  async function logout() {
    try {
      await apiRequest('/Auth/logout', { method: 'POST' });
    } catch {
      // Усе одно очищаємо локальний стан; серверна сесія може вже завершитися.
    }
    setUser(null);
    setAuthMode('login');
  }

  function authenticated(nextUser) {
    setUser(nextUser);
    setDashboardKey((value) => value + 1);
  }

  if (checkingSession) {
    return <div className="app-loading"><div className="loading-brand"><BrandMark /><strong>DormCare</strong></div><div className="loading-spinner" /><span>Перевіряємо сесію…</span></div>;
  }

  if (!user) return <AuthScreen mode={authMode} setMode={setAuthMode} onAuthenticated={authenticated} />;
  return <Dashboard key={dashboardKey} user={user} onLogout={logout} />;
}
