/* ==========================================================
   Franc Money — transactions.js
   Depende de session.js já ter sido carregado antes deste
   arquivo (getStoredAuth, fetchWithAuth, currencyFormatter etc.)
   ========================================================== */

// Estado da página: o que está sendo mostrado agora na tela.
// Guardar isso em variáveis "vivas" evita ter que ler tudo de novo
// do DOM toda hora, e é a base do que frameworks como React fazem
// de forma mais estruturada (aqui fazemos "na mão", com JS puro).
let currentPage = 1;
let currentMeta = null;
let currentTransactions = [];
let cachedToken = null;
let activeSearch = "";
let latestRequest = 0;

/* ----------------------------------------------------------
   Renderização da tabela
   ---------------------------------------------------------- */
function renderTransactionsTable(transactions) {
  const tbody = document.getElementById("transactionsBody");
  const mobileList = document.getElementById("mobileTransactions");
  if (!tbody) return;

  if (!transactions.length) {
    mobileList.textContent = "Nenhuma movimentação encontrada.";
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 24px 12px;">
          Nenhuma transação encontrada para esse filtro.
        </td>
      </tr>
    `;
    return;
  }

  const mobileRows = [];
  let previousDay;
  tbody.innerHTML = transactions
    .map((tx) => {
      const isIncome = tx.type === "INCOME";
      const sign = isIncome ? "+" : "−";
      const amount = currencyFormatter.format(Math.abs(Number(tx.amount)));
      const categoryName = tx.category ? tx.category.name : "Sem categoria";
      const dateLabel = dateFormatter.format(new Date(tx.date));

      // Selo de recorrência: "Parcela 2/6" se veio de um parcelamento, ou
      // "🔁 Recorrente" se veio de uma recorrência sem fim (salário, aluguel...)
      let recurrenceBadge = "";
      if (tx.installment_number && tx.recurringTransaction) {
        recurrenceBadge = `<span class="tag tag--recurring">Parcela ${tx.installment_number}/${tx.recurringTransaction.installments_total}</span>`;
      } else if (tx.recurring_transaction_id) {
        recurrenceBadge = `<span class="tag tag--recurring">🔁 Recorrente</span>`;
      }

      // "Cancelar recorrência" só faz sentido pra recorrência sem fim — uma
      // parcela já nasceu com todo o plano fechado, não tem o que cancelar
      const cancelRecurrenceBtn =
        tx.recurring_transaction_id && !tx.installment_number
          ? `<button type="button" class="row-actions__btn" data-action="cancel-recurrence" data-recurring-id="${tx.recurring_transaction_id}">Cancelar recorrência</button>`
          : "";
      const actions = `
        ${cancelRecurrenceBtn}
        <button type="button" class="row-actions__btn" data-action="edit" data-id="${tx.id}">Editar</button>
        <button type="button" class="row-actions__btn row-actions__btn--danger" data-action="delete" data-id="${tx.id}">Excluir</button>
      `;
      const amountClass = isIncome ? "tx-amount--income" : "tx-amount--expense";
      if (dateLabel !== previousDay) {
        mobileRows.push(`<h2 class="mobile-transaction-day">${dateLabel}</h2>`);
        previousDay = dateLabel;
      }
      mobileRows.push(`
        <details class="mobile-transaction">
          <summary>
            <span class="mobile-transaction__name">
              <strong>${escapeHtml(tx.title)}</strong>
              <small>${escapeHtml(categoryName)}</small>
            </span>
            <span class="tx-amount ${amountClass}">${sign} ${amount}</span>
            <span class="mobile-transaction__chevron" aria-hidden="true">›</span>
          </summary>
          <div class="mobile-transaction__details">
            ${recurrenceBadge}
            ${tx.description ? `<p>${escapeHtml(tx.description)}</p>` : ""}
            <div class="row-actions">${actions}</div>
          </div>
        </details>
      `);

      return `
        <tr>
          <td>
            <div class="tx-desc">
              <span class="tx-dot ${isIncome ? "tx-dot--income" : "tx-dot--expense"}" aria-hidden="true"></span>
              ${escapeHtml(tx.title)}
              ${recurrenceBadge}
            </div>
          </td>
          <td><span class="tag">${escapeHtml(categoryName)}</span></td>
          <td>${dateLabel}</td>
          <td class="align-right tx-amount ${amountClass}">
            ${sign} ${amount}
          </td>
          <td>
            <div class="row-actions">${actions}</div>
          </td>
        </tr>
      `;
    })
    .join("");
  mobileList.innerHTML = mobileRows.join("");
}

function renderPagination(meta) {
  const infoEl = document.getElementById("paginationInfo");
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");

  if (!meta) return;

  infoEl.textContent = `Página ${meta.page} de ${meta.totalPages || 1} (${meta.total} no total)`;
  prevBtn.disabled = meta.page <= 1;
  nextBtn.disabled = meta.page >= meta.totalPages;
}

/* ----------------------------------------------------------
   Lê os filtros preenchidos na tela e monta a query string
   ---------------------------------------------------------- */
function getActiveFilters() {
  const type = document.getElementById("filterType").value;
  const startDate = document.getElementById("filterStartDate").value;
  const endDate = document.getElementById("filterEndDate").value;

  const params = new URLSearchParams();
  params.set("page", currentPage);
  params.set("limit", "10");
  if (type) params.set("type", type);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (activeSearch) params.set("search", activeSearch);

  return params.toString();
}

/* ----------------------------------------------------------
   Busca a página atual de transações, com os filtros ativos
   ---------------------------------------------------------- */
async function loadTransactions(token) {
  const request = ++latestRequest;
  const results = document.getElementById("transactionResults");
  const status = document.getElementById("transactionStatus");
  results.setAttribute("aria-busy", "true");
  status.textContent = "Carregando movimentações…";
  try {
    const query = getActiveFilters();
    const response = await fetchWithAuth(`/transactions?${query}`, token);
    if (request !== latestRequest) return;
    if (!response.ok) throw new Error("Não foi possível consultar as movimentações.");

    const { data, meta } = await response.json();
    if (request !== latestRequest) return;
    currentTransactions = data || [];
    currentMeta = meta;

    renderTransactionsTable(currentTransactions);
    renderPagination(meta);
    status.textContent = "";
  } catch (err) {
    if (request !== latestRequest) return;
    currentTransactions = [];
    currentMeta = null;
    document.getElementById("transactionsBody").replaceChildren();
    document.getElementById("mobileTransactions").replaceChildren();
    document.getElementById("prevPageBtn").disabled = true;
    document.getElementById("nextPageBtn").disabled = true;
    document.getElementById("paginationInfo").textContent = "Histórico indisponível";
    status.textContent = "Não foi possível carregar as movimentações. Tente buscar novamente.";
    console.error("Erro ao carregar transações:", err);
  } finally {
    if (request === latestRequest) results.setAttribute("aria-busy", "false");
  }
}

/* ==========================================================
   Modal: criar OU editar (o mesmo formulário serve pros dois)
   ========================================================== */
const overlay = document.getElementById("txModalOverlay");
const modalTitle = document.getElementById("txModalTitle");
const closeBtn = document.getElementById("txModalClose");
const cancelBtn = document.getElementById("txCancelBtn");
const form = document.getElementById("txForm");
const submitBtn = document.getElementById("txSubmitBtn");
const formError = document.getElementById("txFormError");

const idInput = document.getElementById("txId");
const titleInput = document.getElementById("txTitle");
const amountInput = document.getElementById("txAmount");
const dateInput = document.getElementById("txDate");
const categorySelect = document.getElementById("txCategory");
const descriptionInput = document.getElementById("txDescription");
const recurrenceField = document.getElementById("txRecurrenceField");
const recurrenceTypeSelect = document.getElementById("txRecurrenceType");
const installmentsField = document.getElementById("txInstallmentsField");
const installmentsInput = document.getElementById("txInstallmentsTotal");

// Só mostra o campo "número de parcelas" quando "Parcelada" está selecionado
recurrenceTypeSelect.addEventListener("change", () => {
  installmentsField.hidden = recurrenceTypeSelect.value !== "INSTALLMENT";
});

// Data de hoje no fuso horário local, no formato que o <input type="date"> espera (YYYY-MM-DD).
// Não dá pra usar new Date().toISOString() direto: ela é sempre em UTC, então perto da
// meia-noite poderia mostrar o dia errado dependendo do fuso do usuário.
function todayLocalDateString() {
  const now = new Date();
  const localMidnight = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localMidnight.toISOString().slice(0, 10);
}

let lastFocusedElement = null;

function setFormError(message) {
  formError.textContent = message || "";
}

function setSubmitting(isSubmitting, isEditing) {
  submitBtn.disabled = isSubmitting;
  if (isSubmitting) {
    submitBtn.textContent = "Salvando...";
  } else {
    submitBtn.textContent = isEditing ? "Salvar alterações" : "Salvar transação";
  }
}

let categoryRequest = 0;

async function populateCategories(token, transaction) {
  const request = ++categoryRequest;
  const selectedId = transaction?.category_id || "";
  categorySelect.replaceChildren(new Option("Sem categoria", ""));
  if (selectedId) {
    categorySelect.add(new Option(transaction.category?.name || "Categoria atual", selectedId, true, true));
  }

  try {
    const response = await fetchWithAuth("/categories", token);
    if (!response.ok) return;

    const categories = await response.json();
    if (request !== categoryRequest || overlay.hidden) return;
    categories.forEach((category) => {
      if (category.id !== selectedId) categorySelect.add(new Option(category.name, category.id));
    });
  } catch (err) {
    console.error("Erro ao carregar categorias:", err);
  }
}

// Abre o modal. Se "transaction" for passado, entra em modo edição
// (formulário pré-preenchido); caso contrário, abre em branco para criar.
async function openModal(transaction = null) {
  const auth = getStoredAuth();
  if (!auth) {
    goToLogin();
    return;
  }

  lastFocusedElement = document.activeElement;
  form.reset();
  setFormError("");

  const isEditing = Boolean(transaction);
  const mobile = layoutTransactionSheet(overlay);
  document.getElementById("transactionOptions").open = !mobile || isEditing;
  idInput.value = isEditing ? transaction.id : "";
  modalTitle.textContent = isEditing ? "Editar transação" : mobile ? "Novo lançamento" : "Nova transação";
  setSubmitting(false, isEditing);

  if (isEditing) {
    titleInput.value = transaction.title;
    amountInput.value = Number(transaction.amount);
    dateInput.value = transaction.date.slice(0, 10);
    descriptionInput.value = transaction.description || "";
    const typeRadio = form.querySelector(`input[name="txType"][value="${transaction.type}"]`);
    if (typeRadio) typeRadio.checked = true;
  } else {
    dateInput.value = todayLocalDateString();
    if (mobile) form.querySelector('input[name="txType"][value="EXPENSE"]').checked = true;
  }

  // Recorrência só se decide na criação: uma transação já existente não tem
  // como "virar" recorrente ou parcelada depois de já ter sido lançada
  recurrenceField.hidden = isEditing;
  recurrenceTypeSelect.value = "";
  installmentsField.hidden = true;
  installmentsInput.value = "";

  overlay.hidden = false;
  (mobile ? closeBtn : titleInput).focus();
  document.addEventListener("keydown", handleKeydown);

  await populateCategories(auth.token, transaction);
}

function closeModal() {
  overlay.hidden = true;
  document.removeEventListener("keydown", handleKeydown);
  if (lastFocusedElement) lastFocusedElement.focus();
}

function handleKeydown(event) {
  if (event.key === "Escape") closeModal();
  keepDialogFocus(event, overlay);
}

closeBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);
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

  const id = idInput.value;
  const isEditing = Boolean(id);

  const title = titleInput.value.trim();
  const amountValue = Number(amountInput.value);
  const type = form.querySelector('input[name="txType"]:checked')?.value;
  const date = dateInput.value;
  const categoryId = categorySelect.value;
  const description = descriptionInput.value.trim();

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

  if (!date) {
    document.getElementById("transactionOptions").open = true;
    setFormError("Informe a data da transação.");
    dateInput.focus();
    return;
  }

  // Recorrência só existe na criação (o campo fica escondido ao editar)
  const recurrenceType = isEditing ? "" : recurrenceTypeSelect.value;
  const installmentsTotal = Number(installmentsInput.value);

  if (recurrenceType === "INSTALLMENT" && (!installmentsTotal || installmentsTotal < 2)) {
    document.getElementById("transactionOptions").open = true;
    setFormError("Informe pelo menos 2 parcelas.");
    installmentsInput.focus();
    return;
  }

  const payload = { title, amount: amountValue, type, date };
  if (description) payload.description = description;

  // Ao criar, simplesmente omitimos o campo se não houver categoria selecionada.
  // Ao editar, precisamos mandar "null" explicitamente para conseguir REMOVER
  // uma categoria que a transação já tinha — se só omitíssemos o campo, o
  // backend entenderia "não mude o valor atual" e a categoria antiga continuaria.
  if (isEditing) {
    payload.category_id = categoryId || null;
  } else if (categoryId) {
    payload.category_id = categoryId;
  }

  setSubmitting(true, isEditing);

  try {
    let response;

    if (recurrenceType) {
      // "Data" vira a data da primeira ocorrência; parcelada manda o total
      // de parcelas, recorrente sem fim não manda nada nesse campo
      const recurringPayload = { ...payload, start_date: date };
      delete recurringPayload.date;
      if (recurrenceType === "INSTALLMENT") {
        recurringPayload.installments_total = installmentsTotal;
      }

      response = await fetchWithAuth("/recurring-transactions", auth.token, {
        method: "POST",
        body: JSON.stringify(recurringPayload),
      });
    } else {
      // O mesmo formulário decide entre criar (POST) e atualizar (PUT)
      // dependendo se veio de "Nova transação" ou de "Editar"
      response = await fetchWithAuth(
        isEditing ? `/transactions/${id}` : "/transactions",
        auth.token,
        {
          method: isEditing ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, "Não foi possível salvar a transação."));
    }

    closeModal();
    await loadTransactions(auth.token);
  } catch (err) {
    setFormError(err.message || "Não foi possível salvar a transação.");
  } finally {
    setSubmitting(false, isEditing);
  }
});

/* ----------------------------------------------------------
   Exclusão de uma transação
   ---------------------------------------------------------- */
async function handleDelete(id, token) {
  const confirmed = window.confirm("Tem certeza que deseja excluir esta transação?");
  if (!confirmed) return;

  try {
    const response = await fetchWithAuth(`/transactions/${id}`, token, {
      method: "DELETE",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, "Não foi possível excluir a transação."));
    }

    // Se essa era a última transação da página atual (e não é a página 1),
    // volta uma página para não deixar a tela "vazia" sem necessidade
    if (currentTransactions.length === 1 && currentPage > 1) {
      currentPage -= 1;
    }

    await loadTransactions(token);
  } catch (err) {
    window.alert(err.message || "Não foi possível excluir a transação.");
  }
}

/* ----------------------------------------------------------
   Cancela uma recorrência sem fim (não mexe no que já foi gerado)
   ---------------------------------------------------------- */
async function handleCancelRecurrence(recurringId, token) {
  const confirmed = window.confirm(
    "Cancelar essa recorrência? As transações já lançadas continuam normalmente; só os próximos meses deixam de ser criados."
  );
  if (!confirmed) return;

  try {
    const response = await fetchWithAuth(`/recurring-transactions/${recurringId}`, token, {
      method: "DELETE",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, "Não foi possível cancelar a recorrência."));
    }

    await loadTransactions(token);
  } catch (err) {
    window.alert(err.message || "Não foi possível cancelar a recorrência.");
  }
}

// Delegação de eventos: um único listener no <tbody> cobre todos os
// botões "Editar"/"Excluir"/"Cancelar recorrência", mesmo depois que as
// linhas são recriadas
document.getElementById("transactionResults").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id, recurringId } = button.dataset;

  if (action === "cancel-recurrence") {
    handleCancelRecurrence(recurringId, cachedToken);
    return;
  }

  const transaction = currentTransactions.find((tx) => tx.id === id);
  if (!transaction) return;

  if (action === "edit") openModal(transaction);
  if (action === "delete") handleDelete(id, cachedToken);
});

/* ----------------------------------------------------------
   Inicialização da página
   ---------------------------------------------------------- */
function initTransactionsPage() {
  const auth = getStoredAuth();
  if (!auth) {
    goToLogin();
    return;
  }

  cachedToken = auth.token;
  loadTransactions(auth.token);

  document.getElementById("logoutBtn").addEventListener("click", () => {
    clearStoredAuth();
    goToLogin();
  });

  document.getElementById("newTransactionBtn").addEventListener("click", () => openModal(null));

  const search = document.getElementById("transactionSearch");
  document.getElementById("mobileSearchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    activeSearch = search.value.trim();
    currentPage = 1;
    loadTransactions(auth.token);
  });
  window.matchMedia("(max-width: 600px)").addEventListener("change", (event) => {
    if (!event.matches && activeSearch) {
      activeSearch = "";
      search.value = "";
      currentPage = 1;
      loadTransactions(auth.token);
    }
  });

  const filtersButton = document.getElementById("mobileFiltersBtn");
  filtersButton.addEventListener("click", () => {
    const filters = document.getElementById("transactionFilters");
    const expanded = filters.classList.toggle("is-expanded");
    filtersButton.setAttribute("aria-expanded", String(expanded));
  });

  document.getElementById("filtersForm").addEventListener("submit", (event) => {
    event.preventDefault();
    currentPage = 1;
    loadTransactions(auth.token);
  });

  document.getElementById("clearFiltersBtn").addEventListener("click", () => {
    document.getElementById("filterType").value = "";
    document.getElementById("filterStartDate").value = "";
    document.getElementById("filterEndDate").value = "";
    currentPage = 1;
    loadTransactions(auth.token);
  });

  document.getElementById("prevPageBtn").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadTransactions(auth.token);
    }
  });

  document.getElementById("nextPageBtn").addEventListener("click", () => {
    if (currentMeta && currentPage < currentMeta.totalPages) {
      currentPage += 1;
      loadTransactions(auth.token);
    }
  });
}

document.addEventListener("DOMContentLoaded", initTransactionsPage);
