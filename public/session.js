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