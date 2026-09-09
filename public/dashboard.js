/* ==========================================================
   Franc Money — dashboard.js
   Depende de session.js já ter sido carregado antes deste
   arquivo (getStoredAuth, fetchWithAuth, currencyFormatter etc.)
   ========================================================== */

/* ----------------------------------------------------------
   Renderização dos cartões de resumo
   ---------------------------------------------------------- */
function renderSummary(summary) {
  const totalEl = document.getElementById("summaryTotal");
  const incomeEl = document.getElementById("summaryIncome");
  const expenseEl = document.getElementById("summaryExpense");

  if (totalEl) totalEl.textContent = currencyFormatter.format(summary.total || 0);
  if (incomeEl) incomeEl.textContent = currencyFormatter.format(summary.income || 0);
  if (expenseEl) expenseEl.textContent = currencyFormatter.format(summary.expense || 0);
}

/* ----------------------------------------------------------
   Renderização da tabela de transações recentes
   ---------------------------------------------------------- */
function renderTransactions(transactions) {
  const tbody = document.getElementById("transactionsBody");
  if (!tbody) return;

  if (!transactions.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 24px 12px;">
          Nenhuma transação registrada ainda.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = transactions
    .map((tx) => {
      const isIncome = tx.type === "INCOME";
      const sign = isIncome ? "+" : "−";
      const amount = currencyFormatter.format(Math.abs(Number(tx.amount)));
      const categoryName = tx.category ? tx.category.name : "Sem categoria";
      const dateLabel = dateFormatter.format(new Date(tx.date));

      return `
        <tr>
          <td>
            <div class="tx-desc">
              <span class="tx-dot ${isIncome ? "tx-dot--income" : "tx-dot--expense"}" aria-hidden="true"></span>
              ${escapeHtml(tx.title)}
            </div>
          </td>
          <td><span class="tag">${escapeHtml(categoryName)}</span></td>
          <td>${dateLabel}</td>
          <td class="align-right tx-amount ${isIncome ? "tx-amount--income" : "tx-amount--expense"}">
            ${sign} ${amount}
          </td>
        </tr>
      `;
    })
    .join("");
}

/* ----------------------------------------------------------
   Busca TODAS as transações do usuário (não só a página atual)
   A rota /transactions é paginada, então percorremos página por
   página até acabar. Usada para os cálculos de gráfico/categorias,
   que precisam do histórico completo, não só das 5 mais recentes.
   ---------------------------------------------------------- */
async function fetchAllTransactions(token) {
  const all = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const response = await fetchWithAuth(`/transactions?limit=${limit}&page=${page}`, token);
    if (!response.ok) break;

    const { data, meta } = await response.json();
    all.push(...(data || []));

    if (!meta || page >= meta.totalPages) break;
    page += 1;
  }

  return all;
}

/* ----------------------------------------------------------
   Calcula o saldo acumulado ao final de cada um dos últimos
   6 meses, a partir da lista completa de transações.

   Lógica: começamos somando (INCOME) e subtraindo (EXPENSE) tudo
   que aconteceu ANTES da janela de 6 meses, para ter o saldo de
   partida correto. Depois, mês a mês, vamos somando o resultado
   líquido daquele mês ao saldo acumulado.
   ---------------------------------------------------------- */
const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });

function formatMonthLabel(date) {
  const label = monthLabelFormatter.format(date); // ex.: "set."
  return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
}

function computeMonthlyBalances(transactions, monthsCount = 6) {
  const now = new Date();

  const months = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: formatMonthLabel(start),
      start,
    });
  }

  const windowStart = months[0].start;
  const monthlyNet = Object.fromEntries(months.map((m) => [m.key, 0]));
  let balanceBeforeWindow = 0;

  transactions.forEach((tx) => {
    const date = new Date(tx.date);
    const signedAmount = tx.type === "INCOME" ? Number(tx.amount) : -Number(tx.amount);

    if (date < windowStart) {
      balanceBeforeWindow += signedAmount;
    } else {
      // getUTCFullYear/getUTCMonth, não getFullYear/getMonth: a data da
      // transação é meia-noite UTC, então os getters locais podem jogar a
      // transação pro mês anterior dependendo do fuso do navegador.
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      if (key in monthlyNet) monthlyNet[key] += signedAmount;
    }
  });

  let cumulative = balanceBeforeWindow;
  const values = months.map((m) => {
    cumulative += monthlyNet[m.key];
    return cumulative;
  });

  return { labels: months.map((m) => m.label), values };
}

/* ----------------------------------------------------------
   Primeiro dia do mês, "monthsCount" meses atrás — usado tanto
   pelo gráfico de evolução quanto pelo filtro de categorias, pra
   os dois entenderem "período" da mesma forma
   ---------------------------------------------------------- */
function getWindowStart(monthsCount) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1), 1);
}

/* ----------------------------------------------------------
   Agrupa o total gasto (apenas EXPENSE) por categoria, dentro do
   período escolhido. monthsCount = 0 significa "sem filtro"
   (todo o histórico).
   ---------------------------------------------------------- */
function computeCategoryBreakdown(transactions, monthsCount = 6) {
  const windowStart = monthsCount > 0 ? getWindowStart(monthsCount) : null;
  const totals = new Map();
  let totalSum = 0;

  transactions.forEach((tx) => {
    if (tx.type !== "EXPENSE") return;
    if (windowStart && new Date(tx.date) < windowStart) return;

    const name = tx.category ? tx.category.name : "Sem categoria";
    const color = tx.category ? tx.category.color : "#8b93a1";
    const amount = Number(tx.amount);
    const current = totals.get(name) || { amount: 0, color };
    totals.set(name, { amount: current.amount + amount, color });
    totalSum += amount;
  });

  return Array.from(totals.entries())
    .map(([name, { amount, color }]) => ({
      name,
      amount,
      color,
      percentage: totalSum > 0 ? (amount / totalSum) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/* ----------------------------------------------------------
   Desenha o gráfico de evolução do saldo (SVG)
   ---------------------------------------------------------- */
const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 220;

// Guarda os pontos do último desenho pro hover (tooltip) usar sem
// precisar recalcular nada a cada movimento do mouse
const trendChartState = { points: [], labels: [], values: [] };

function renderTrendChart(labels, values) {
  const lineEl = document.getElementById("trendLine");
  const areaEl = document.getElementById("trendArea");
  const labelsEl = document.getElementById("trendLabels");
  if (!lineEl || !areaEl) return;

  const PADDING_TOP = 16;
  const PADDING_BOTTOM = 16;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values.map((value, i) => {
    const x = (i / (values.length - 1)) * VIEW_WIDTH;
    const normalized = (value - min) / range;
    const y =
      VIEW_HEIGHT -
      PADDING_BOTTOM -
      normalized * (VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
    return { x, y };
  });

  trendChartState.points = points;
  trendChartState.labels = labels;
  trendChartState.values = values;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${VIEW_WIDTH},${VIEW_HEIGHT} L 0,${VIEW_HEIGHT} Z`;

  lineEl.setAttribute("d", linePath);
  areaEl.setAttribute("d", areaPath);

  if (labelsEl) {
    labelsEl.innerHTML = labels.map((label) => `<span>${escapeHtml(label)}</span>`).join("");
  }
}

/* ----------------------------------------------------------
   Tooltip ao passar o mouse sobre o gráfico de evolução: acha o
   ponto mais próximo do cursor e mostra mês + valor exato
   ---------------------------------------------------------- */
function initTrendChartHover() {
  const svg = document.getElementById("trendChart");
  const dot = document.getElementById("trendHoverDot");
  const hoverLine = document.getElementById("trendHoverLine");
  const tooltip = document.getElementById("trendTooltip");
  const wrap = svg?.closest(".trend-chart__wrap");
  if (!svg || !dot || !hoverLine || !tooltip || !wrap) return;

  function handleMove(event) {
    const { points, labels, values } = trendChartState;
    if (!points.length) return;

    const rect = svg.getBoundingClientRect();
    const relX = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
    const rawIndex = Math.round((relX / VIEW_WIDTH) * (points.length - 1));
    const index = Math.max(0, Math.min(points.length - 1, rawIndex));
    const point = points[index];

    dot.setAttribute("cx", point.x);
    dot.setAttribute("cy", point.y);
    dot.hidden = false;

    hoverLine.setAttribute("x1", point.x);
    hoverLine.setAttribute("x2", point.x);
    hoverLine.setAttribute("y1", 0);
    hoverLine.setAttribute("y2", VIEW_HEIGHT);
    hoverLine.hidden = false;

    // Converte a posição do ponto (espaço do viewBox 600x220) pra posição
    // real dentro do wrapper, onde o tooltip (um <div> normal) vai ficar
    const wrapRect = wrap.getBoundingClientRect();
    const pxX = (point.x / VIEW_WIDTH) * rect.width + (rect.left - wrapRect.left);
    const pxY = (point.y / VIEW_HEIGHT) * rect.height + (rect.top - wrapRect.top);

    tooltip.style.left = `${pxX}px`;
    tooltip.style.top = `${pxY}px`;
    tooltip.innerHTML = `
      <div class="chart-tooltip__label">${escapeHtml(labels[index])}</div>
      <div class="chart-tooltip__value">${currencyFormatter.format(values[index])}</div>
    `;
    tooltip.hidden = false;
  }

  function handleLeave() {
    dot.hidden = true;
    hoverLine.hidden = true;
    tooltip.hidden = true;
  }

  svg.addEventListener("mousemove", handleMove);
  svg.addEventListener("mouseleave", handleLeave);
}

/* ----------------------------------------------------------
   Renderiza o painel "Gastos por categoria"
   ---------------------------------------------------------- */
function renderCategoryBreakdown(breakdown) {
  const listEl = document.getElementById("categoryBreakdownList");
  if (!listEl) return;

  if (!breakdown.length) {
    listEl.innerHTML =
      '<li class="manage-list__empty">Nenhum gasto registrado ainda.</li>';
    return;
  }

  const max = Math.max(...breakdown.map((c) => c.amount));

  listEl.innerHTML = breakdown
    .map((c) => {
      const widthPct = max > 0 ? Math.round((c.amount / max) * 100) : 0;
      const pct = Math.round(c.percentage);
      return `
        <li class="category-row">
          <div class="category-row__top">
            <span class="category-row__name">
              <span class="category-row__dot" style="background:${escapeHtml(c.color)}"></span>
              ${escapeHtml(c.name)}
            </span>
            <span>${currencyFormatter.format(c.amount)} (${pct}%)</span>
          </div>
          <div class="category-bar"><div class="category-bar__fill" style="width: ${widthPct}%; background:${escapeHtml(c.color)}"></div></div>
        </li>
      `;
    })
    .join("");
}

// Cache das transações carregadas, pra trocar de período (clique nas
// abas 3M/6M/12M/Mês/Tudo) sem precisar buscar tudo de novo no servidor
let cachedTransactions = [];

function getActiveMonths(containerId, fallback) {
  const active = document.querySelector(`#${containerId} .period-tab.is-active`);
  return active ? Number(active.dataset.months) : fallback;
}

function setActiveTab(container, button) {
  container.querySelectorAll(".period-tab").forEach((btn) => btn.classList.remove("is-active"));
  button.classList.add("is-active");
}

/* ----------------------------------------------------------
   Liga as abas de período (3M/6M/12M do gráfico, e Mês/3M/6M/Tudo
   dos gastos por categoria) — clicar só recalcula em cima do que já
   está em cachedTransactions, sem nova requisição
   ---------------------------------------------------------- */
function initPeriodTabs() {
  const trendTabs = document.getElementById("trendPeriodTabs");
  const categoryTabs = document.getElementById("categoryPeriodTabs");

  if (trendTabs) {
    trendTabs.addEventListener("click", (event) => {
      const button = event.target.closest(".period-tab");
      if (!button) return;

      setActiveTab(trendTabs, button);
      const trend = computeMonthlyBalances(cachedTransactions, Number(button.dataset.months));
      renderTrendChart(trend.labels, trend.values);
    });
  }

  if (categoryTabs) {
    categoryTabs.addEventListener("click", (event) => {
      const button = event.target.closest(".period-tab");
      if (!button) return;

      setActiveTab(categoryTabs, button);
      renderCategoryBreakdown(computeCategoryBreakdown(cachedTransactions, Number(button.dataset.months)));
    });
  }
}

/* ----------------------------------------------------------
   Atualiza toda a tela: cartões, tabela, gráfico e categorias.
   Chamada tanto ao carregar a página quanto após criar uma nova
   transação, para que tudo fique sincronizado sem precisar de F5.
   ---------------------------------------------------------- */
async function refreshAll(token) {
  try {
    const [summaryResponse, recentResponse] = await Promise.all([
      fetchWithAuth("/summary", token),
      fetchWithAuth("/transactions?limit=5", token),
    ]);

    if (summaryResponse.ok) {
      renderSummary(await summaryResponse.json());
    }

    if (recentResponse.ok) {
      const { data } = await recentResponse.json();
      renderTransactions(data || []);
    }
  } catch (err) {
    console.error("Erro ao carregar resumo/transações recentes:", err);
  }

  try {
    cachedTransactions = await fetchAllTransactions(token);

    const trendMonths = getActiveMonths("trendPeriodTabs", 6);
    const trend = computeMonthlyBalances(cachedTransactions, trendMonths);
    renderTrendChart(trend.labels, trend.values);

    const categoryMonths = getActiveMonths("categoryPeriodTabs", 6);
    renderCategoryBreakdown(computeCategoryBreakdown(cachedTransactions, categoryMonths));
  } catch (err) {
    console.error("Erro ao calcular gráfico/categorias:", err);
  }
}

/* ----------------------------------------------------------
   Inicialização da página
   ---------------------------------------------------------- */
async function initDashboard() {
  const auth = getStoredAuth();

  // Sem token salvo: nem tenta carregar o dashboard, manda pro login direto
  if (!auth) {
    goToLogin();
    return;
  }

  const greetingEl = document.getElementById("greetingName");
  if (greetingEl) {
    const firstName = auth.user.name?.split(" ")[0] || auth.user.name;
    greetingEl.textContent = `Olá, ${firstName}`;
  }

  initPeriodTabs();
  initTrendChartHover();
  await refreshAll(auth.token);
}

document.addEventListener("DOMContentLoaded", initDashboard);

/* ----------------------------------------------------------
   Ações da interface
   ---------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearStoredAuth();
      goToLogin();
    });
  }
});

/* ==========================================================
   Modal: Nova transação
   ========================================================== */
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("newTransactionBtn");
  const overlay = document.getElementById("txModalOverlay");
  const closeBtn = document.getElementById("txModalClose");
  const cancelBtn = document.getElementById("txCancelBtn");
  const form = document.getElementById("txForm");
  const submitBtn = document.getElementById("txSubmitBtn");
  const formError = document.getElementById("txFormError");

  const titleInput = document.getElementById("txTitle");
  const amountInput = document.getElementById("txAmount");
  const categorySelect = document.getElementById("txCategory");
  const descriptionInput = document.getElementById("txDescription");
  const recurrenceTypeSelect = document.getElementById("txRecurrenceType");
  const installmentsField = document.getElementById("txInstallmentsField");
  const installmentsInput = document.getElementById("txInstallmentsTotal");

  if (!openBtn || !overlay || !form) return;

  let lastFocusedElement = null;

  // Data de hoje no fuso local (mesma lógica de transactions.js): esse
  // modal não tem campo de data, sempre lança "agora", então uma
  // recorrência criada aqui também começa hoje
  function todayLocalDateString() {
    const now = new Date();
    const localMidnight = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localMidnight.toISOString().slice(0, 10);
  }

  recurrenceTypeSelect.addEventListener("change", () => {
    installmentsField.hidden = recurrenceTypeSelect.value !== "INSTALLMENT";
  });

  function setFormError(message) {
    formError.textContent = message || "";
  }

  function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? "Salvando..." : "Salvar transação";
  }

  // Busca as categorias do usuário toda vez que o modal abre, para refletir
  // categorias criadas recentemente (ex.: pelo Swagger, até termos a tela própria)
  async function populateCategories(token) {
    categorySelect.innerHTML = '<option value="">Sem categoria</option>';

    try {
      const response = await fetchWithAuth("/categories", token);
      if (!response.ok) return;

      const categories = await response.json();
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    }
  }

  async function openModal() {
    const auth = getStoredAuth();
    if (!auth) {
      goToLogin();
      return;
    }

    lastFocusedElement = document.activeElement;
    form.reset();
    setFormError("");
    recurrenceTypeSelect.value = "";
    installmentsField.hidden = true;

    overlay.hidden = false;
    document.addEventListener("keydown", handleKeydown);

    await populateCategories(auth.token);
    titleInput.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    document.removeEventListener("keydown", handleKeydown);
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  function handleKeydown(event) {
    if (event.key === "Escape") closeModal();
  }

  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  // Fecha ao clicar fora do cartão (na área escurecida)
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFormError("");

    const auth = getStoredAuth();
    if (!auth) {
      goToLogin();
      return;
    }

    const title = titleInput.value.trim();
    const amountValue = Number(amountInput.value);
    const type = form.querySelector('input[name="txType"]:checked')?.value;
    const categoryId = categorySelect.value;
    const description = descriptionInput.value.trim();

    // Validação no cliente, espelhando as regras do Zod no backend
    // (evita bater no endpoint com dados que ele com certeza vai rejeitar)
    if (!title) {
      setFormError("Informe um título para a transação.");
      titleInput.focus();
      return;
    }

    if (!amountValue || amountValue <= 0) {
      setFormError("Informe um valor maior que zero.");
      amountInput.focus();
      return;
    }

    if (type !== "INCOME" && type !== "EXPENSE") {
      setFormError("Selecione se é uma receita ou uma despesa.");
      return;
    }

    const recurrenceType = recurrenceTypeSelect.value;
    const installmentsTotal = Number(installmentsInput.value);

    if (recurrenceType === "INSTALLMENT" && (!installmentsTotal || installmentsTotal < 2)) {
      setFormError("Informe pelo menos 2 parcelas.");
      installmentsInput.focus();
      return;
    }

    const payload = {
      title,
      amount: amountValue,
      type,
    };
    if (description) payload.description = description;
    if (categoryId) payload.category_id = categoryId;

    setSubmitting(true);

    try {
      let response;

      if (recurrenceType) {
        const recurringPayload = { ...payload, start_date: todayLocalDateString() };
        if (recurrenceType === "INSTALLMENT") {
          recurringPayload.installments_total = installmentsTotal;
        }

        response = await fetchWithAuth("/recurring-transactions", auth.token, {
          method: "POST",
          body: JSON.stringify(recurringPayload),
        });
      } else {
        response = await fetchWithAuth("/transactions", auth.token, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, "Não foi possível salvar a transação."));
      }

      closeModal();
      await refreshAll(auth.token);
    } catch (err) {
      setFormError(err.message || "Não foi possível salvar a transação.");
    } finally {
      setSubmitting(false);
    }
  });
});