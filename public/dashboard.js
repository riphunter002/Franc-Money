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
   Agrupa o total gasto (apenas EXPENSE) por categoria
   ---------------------------------------------------------- */
function computeCategoryBreakdown(transactions) {
  const totals = new Map();

  transactions.forEach((tx) => {
    if (tx.type !== "EXPENSE") return;
    const name = tx.category ? tx.category.name : "Sem categoria";
    totals.set(name, (totals.get(name) || 0) + Number(tx.amount));
  });

  return Array.from(totals.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/* ----------------------------------------------------------
   Desenha o gráfico de evolução do saldo (SVG)
   ---------------------------------------------------------- */
function renderTrendChart(labels, values) {
  const lineEl = document.getElementById("trendLine");
  const areaEl = document.getElementById("trendArea");
  const labelsEl = document.getElementById("trendLabels");
  if (!lineEl || !areaEl) return;

  const VIEW_WIDTH = 600;
  const VIEW_HEIGHT = 220;
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
      return `
        <li class="category-row">
          <div class="category-row__top">
            <span>${escapeHtml(c.name)}</span>
            <span>${currencyFormatter.format(c.amount)}</span>
          </div>
          <div class="category-bar"><div class="category-bar__fill" style="width: ${widthPct}%"></div></div>
        </li>
      `;
    })
    .join("");
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
    const allTransactions = await fetchAllTransactions(token);
    const trend = computeMonthlyBalances(allTransactions);
    renderTrendChart(trend.labels, trend.values);
    renderCategoryBreakdown(computeCategoryBreakdown(allTransactions));
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

  if (!openBtn || !overlay || !form) return;

  let lastFocusedElement = null;

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

    const payload = {
      title,
      amount: amountValue,
      type,
    };
    if (description) payload.description = description;
    if (categoryId) payload.category_id = categoryId;

    setSubmitting(true);

    try {
      const response = await fetchWithAuth("/transactions", auth.token, {
        method: "POST",
        body: JSON.stringify(payload),
      });

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