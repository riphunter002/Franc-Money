/* ==========================================================
   Franc Money — session.js
   Código compartilhado entre todas as páginas autenticadas
   (dashboard, categorias, transações...): sessão, chamadas à
   API e formatação. Inclua este arquivo ANTES do script da
   página específica, ex.:

     <script src="session.js"></script>
     <script src="dashboard.js"></script>
   ========================================================== */

// Front e backend são servidos pela mesma origem (Express serve /public),
// então um caminho relativo já resolve certo em dev e produção.
const API_BASE_URL = window.FRANC_API_BASE_URL || "";

/* ----------------------------------------------------------
   Sessão: ler token/usuário salvos no login e proteger rotas
   ---------------------------------------------------------- */
function getStoredAuth() {
  const token =
    window.localStorage.getItem("franc_token") ||
    window.sessionStorage.getItem("franc_token");
  const rawUser =
    window.localStorage.getItem("franc_user") ||
    window.sessionStorage.getItem("franc_user");

  if (!token || !rawUser) return null;

  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    return null;
  }
}

function clearStoredAuth() {
  window.localStorage.removeItem("franc_token");
  window.localStorage.removeItem("franc_user");
  window.sessionStorage.removeItem("franc_token");
  window.sessionStorage.removeItem("franc_user");
}

function goToLogin() {
  window.location.href = "index.html";
}

// Atualiza o usuário salvo (ex.: depois de editar nome/e-mail na tela de
// perfil) sem mexer no token. Escreve só no storage que já está em uso —
// localStorage ou sessionStorage, dependendo do "Manter conectado" do login
function updateStoredUser(user) {
  if (window.localStorage.getItem("franc_user")) {
    window.localStorage.setItem("franc_user", JSON.stringify(user));
  }
  if (window.sessionStorage.getItem("franc_user")) {
    window.sessionStorage.setItem("franc_user", JSON.stringify(user));
  }
}

// Wrapper de fetch que já injeta o token e trata sessão expirada (401)
async function fetchWithAuth(path, token, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    // Token ausente, inválido ou expirado: encerra a sessão local e volta ao login
    clearStoredAuth();
    goToLogin();
    throw new Error("Sessão expirada.");
  }

  return response;
}

/* ----------------------------------------------------------
   Formatação
   ---------------------------------------------------------- */
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// timeZone: "UTC" é proposital: a data da transação é só um "dia do
// calendário" (vem do <input type="date"> como meia-noite UTC), sem
// hora real associada. Sem isso, o fuso do navegador pode exibir o
// dia anterior (ex.: meia-noite UTC vira 21h do dia anterior no Brasil).
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

// Evita que texto vindo do banco quebre o HTML por acidente (proteção básica
// contra XSS ao inserir dados do usuário diretamente na página)
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

/* ----------------------------------------------------------
   Extrai a mensagem de erro mais específica possível de uma
   resposta de erro da API (considera o novo formato "details"
   que o errorHandler passou a enviar para erros de validação)
   ---------------------------------------------------------- */
function extractErrorMessage(data, fallback) {
  if (data?.details?.length) {
    return data.details.map((d) => d.message).join(" ");
  }
  return data?.error || fallback;
}

/* ----------------------------------------------------------
   Menu mobile: abaixo de 860px a sidebar vira uma gaveta lateral
   fora da tela, aberta/fechada pelo botão ☰ do topbar mobile.
   Roda em toda tela autenticada, por isso fica aqui (compartilhado)
   em vez de duplicado no *.js de cada página.
   ---------------------------------------------------------- */
function initMobileSidebar() {
  const toggleBtn = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (!toggleBtn || !sidebar || !backdrop) return;

  const nav = document.createElement("nav");
  nav.className = "mobile-nav";
  nav.setAttribute("aria-label", "Navegação rápida");
  for (const [href, label] of [
    ["dashboard.html", "Hoje"],
    ["transactions.html", "Movimentações"],
    ["accounts.html", "Contas"]
  ]) {
    const link = sidebar.querySelector(`a[href="${href}"]`).cloneNode(true);
    link.className = "mobile-nav__item";
    link.querySelector("span").textContent = label;
    nav.append(link);
  }
  const more = document.createElement("button");
  more.type = "button";
  more.className = "mobile-nav__item";
  more.setAttribute("aria-controls", sidebar.id);
  more.setAttribute("aria-expanded", "false");
  if (!nav.querySelector('[aria-current="page"]')) more.classList.add("is-current");
  more.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg><span>Mais</span>';
  nav.append(more);
  document.querySelector(".app-shell").append(nav);
  document.body.classList.add("has-mobile-nav");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "sidebar__close btn-secondary";
  closeBtn.textContent = "Fechar menu";
  sidebar.querySelector(".sidebar__brand").after(closeBtn);

  let opener;
  function openSidebar() {
    opener = document.activeElement;
    sidebar.classList.add("is-open");
    backdrop.hidden = false;
    toggleBtn.setAttribute("aria-expanded", "true");
    more.setAttribute("aria-expanded", "true");
    closeBtn.focus();
  }

  function closeSidebar() {
    if (!sidebar.classList.contains("is-open")) return;
    sidebar.classList.remove("is-open");
    backdrop.hidden = true;
    toggleBtn.setAttribute("aria-expanded", "false");
    more.setAttribute("aria-expanded", "false");
    opener?.focus();
  }

  toggleBtn.addEventListener("click", openSidebar);
  more.addEventListener("click", openSidebar);
  closeBtn.addEventListener("click", closeSidebar);
  backdrop.addEventListener("click", closeSidebar);

  // Fecha ao tocar num item do menu — a navegação já troca de página,
  // isso só evita a gaveta ficar visível por um instante antes de sair
  sidebar.querySelectorAll(".nav-item, .sidebar__logout").forEach((el) => {
    el.addEventListener("click", closeSidebar);
  });

  document.addEventListener("keydown", (event) => {
    if (!sidebar.classList.contains("is-open")) return;
    if (event.key === "Escape") closeSidebar();
    keepDialogFocus(event, sidebar);
  });
  window.matchMedia("(max-width: 860px)").addEventListener("change", closeSidebar);
  window.matchMedia("(max-width: 600px)").addEventListener("change", () => {
    closeSidebar();
    const sheet = document.querySelector(".transaction-sheet:not([hidden])");
    if (sheet) layoutTransactionSheet(sheet);
  });
}

function layoutTransactionSheet(overlay) {
  const mobile = overlay.classList.contains("transaction-sheet") &&
    window.matchMedia("(max-width: 600px)").matches;
  const options = overlay.querySelector(".transaction-options");
  if (!options) return mobile;
  const title = overlay.querySelector("#txTitle").closest(".modal-field");
  const amount = overlay.querySelector("#txAmount").closest(".modal-field");
  if (mobile && title.nextElementSibling === amount) title.before(amount);
  if (!mobile && amount.nextElementSibling === title) amount.before(title);
  if (!mobile) options.open = true;
  return mobile;
}

function keepDialogFocus(event, container) {
  if (event.key !== "Tab") return;
  const controls = Array.from(container.querySelectorAll(
    'a[href], button, input, select, textarea, summary'
  )).filter((control) => !control.disabled && control.getClientRects().length > 0);
  const first = controls[0];
  const last = controls.at(-1);
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !controls.includes(active))) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && (active === last || !controls.includes(active))) {
    event.preventDefault();
    first?.focus();
  }
}

document.addEventListener("DOMContentLoaded", initMobileSidebar);
