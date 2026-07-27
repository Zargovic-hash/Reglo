const TOKEN_KEY = "reglo_admin_token";
const USER_KEY = "reglo_admin_user";

const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const userEmailEl = document.getElementById("user-email");
const leadsTbody = document.getElementById("leads-tbody");
const leadsCountEl = document.getElementById("leads-count");

const getToken = () => sessionStorage.getItem(TOKEN_KEY);

const niveauBadgeClass = (niveau) => {
  if (niveau === "Conforme") return "badge-conforme";
  if (niveau === "Partiellement conforme") return "badge-partiel";
  return "badge-non-conforme";
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

const showApp = (user) => {
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
  userEmailEl.textContent = user.email;
};

const showLogin = () => {
  appView.classList.add("hidden");
  loginView.classList.remove("hidden");
};

const renderLeads = (leads) => {
  leadsCountEl.textContent = `${leads.length} lead${leads.length > 1 ? "s" : ""} au total`;

  if (leads.length === 0) {
    leadsTbody.innerHTML = `<tr><td colspan="7" class="loading">Aucun lead pour le moment.</td></tr>`;
    return;
  }

  leadsTbody.innerHTML = leads
    .map(
      (lead) => `
    <tr>
      <td>${formatDate(lead.created_at)}</td>
      <td>${lead.nom || "—"}</td>
      <td>${lead.telephone}</td>
      <td>${lead.email}</td>
      <td>${lead.score}%</td>
      <td><span class="badge-niveau ${niveauBadgeClass(lead.niveau)}">${lead.niveau}</span></td>
      <td><a class="pdf-link" href="/api/leads/${lead.id}/report.pdf" target="_blank" rel="noopener">Télécharger</a></td>
    </tr>
  `
    )
    .join("");
};

const loadLeads = async () => {
  try {
    const response = await fetch("/api/leads", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      showLogin();
      return;
    }

    if (!response.ok) throw new Error("Erreur lors du chargement des leads.");

    const { leads } = await response.json();
    renderLeads(leads);
  } catch (err) {
    leadsTbody.innerHTML = `<tr><td colspan="7" class="loading">${err.message}</td></tr>`;
  }
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.classList.add("hidden");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Connexion impossible.");

    if (body.user.role !== "admin") {
      throw new Error("Accès réservé aux administrateurs.");
    }

    sessionStorage.setItem(TOKEN_KEY, body.token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(body.user));

    showApp(body.user);
    loadLeads();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove("hidden");
  }
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  showLogin();
});

(function init() {
  const token = getToken();
  const userRaw = sessionStorage.getItem(USER_KEY);
  if (token && userRaw) {
    showApp(JSON.parse(userRaw));
    loadLeads();
  }
})();
