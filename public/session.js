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

  function openSidebar() {
    sidebar.classList.add("is-open");
    backdrop.hidden = false;
    toggleBtn.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    backdrop.hidden = true;
    toggleBtn.setAttribute("aria-expanded", "false");
  }

  toggleBtn.addEventListener("click", () => {
    if (sidebar.classList.contains("is-open")) closeSidebar();
    else openSidebar();
  });

  backdrop.addEventListener("click", closeSidebar);

  // Fecha ao tocar num item do menu — a navegação já troca de página,
  // isso só evita a gaveta ficar visível por um instante antes de sair
  sidebar.querySelectorAll(".nav-item, .sidebar__logout").forEach((el) => {
    el.addEventListener("click", closeSidebar);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });
}

document.addEventListener("DOMContentLoaded", initMobileSidebar);