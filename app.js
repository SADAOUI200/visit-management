/**
 * نظام إدارة الزيارات التفتيشية
 * app.js – Authentication & User Management
 */

const USERS_KEY = 'visitApp_users';
const SESSION_KEY = 'visitApp_session';

// ── Seed default admin account ──────────────────────────────
function seedAdminAccount() {
    const users = getUsers();
    const exists = users.find(u => u.username === 'admin');
    if (!exists) {
        users.push({
            id: 'user_admin',
            username: 'admin',
            password: 'admin123',
            role: 'admin',
            name: 'مدير النظام',
            createdAt: new Date().toISOString()
        });
        saveUsers(users);
    }
}

// ── User Store ──────────────────────────────────────────────
function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch { return []; }
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function addUser({ username, password, role, name }) {
    const users = getUsers();
    if (users.find(u => u.username === username)) {
        return { ok: false, msg: 'اسم المستخدم موجود مسبقاً' };
    }
    const newUser = {
        id: 'user_' + Date.now(),
        username: username.trim(),
        password: password.trim(),
        role,
        name: name.trim(),
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);
    return { ok: true, user: newUser };
}

function deleteUser(id) {
    const users = getUsers().filter(u => u.id !== id);
    saveUsers(users);
}

// ── Session ─────────────────────────────────────────────────
function getSession() {
    try {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    } catch { return null; }
}

function setSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
}

// ── Login ────────────────────────────────────────────────────
function login(username, password) {
    const users = getUsers();
    const user = users.find(u =>
        u.username === username.trim() &&
        u.password === password.trim()
    );
    if (!user) return { ok: false, msg: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    setSession(user);
    return { ok: true, user };
}

function logout() {
    clearSession();
    window.location.href = 'index.html';
}

// ── Page Guard ───────────────────────────────────────────────
function requireAuth(allowedRoles) {
    const session = getSession();
    if (!session) {
        window.location.href = 'index.html';
        return null;
    }
    if (allowedRoles && !allowedRoles.includes(session.role)) {
        // Redirect to appropriate page
        if (session.role === 'admin') {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'visit.html';
        }
        return null;
    }
    return session;
}

// ── Toast Notification ───────────────────────────────────────
function showToast(msg, type = 'success', duration = 3500) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'none';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s';
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// ── Loader ───────────────────────────────────────────────────
function showLoader() {
    const el = document.getElementById('loaderOverlay');
    if (el) el.style.display = 'flex';
}
function hideLoader() {
    const el = document.getElementById('loaderOverlay');
    if (el) el.style.display = 'none';
}

// ── Role label helper ────────────────────────────────────────
function roleLabel(role) {
    return { admin: 'مدير النظام', inspector: 'مفتش', manager: 'مسيّر' }[role] || role;
}
function roleBadgeClass(role) {
    return { admin: 'badge-admin', inspector: 'badge-inspector', manager: 'badge-manager' }[role] || '';
}

// ── Init ─────────────────────────────────────────────────────
seedAdminAccount();
