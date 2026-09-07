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

/* ----------------------------------------------------------
   Renderização da tabela
   ---------------------------------------------------------- */
function renderTransactionsTable(transactions) {
  const tbody = document.getElementById("transactionsBody");
  if (!tbody) return;

  if (!transactions.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 24px 12px;">
          Nenhuma transação encontrada para esse filtro.
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
          <td>
            <div class="row-actions">
              <button type="button" class="row-actions__btn" data-action="edit" data-id="${tx.id}">Editar</button>
              <button type="button" class="row-actions__btn row-actions__btn--danger" data-action="delete" data-id="${tx.id}">Excluir</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
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

  return params.toString();
}

/* ----------------------------------------------------------
   Busca a página atual de transações, com os filtros ativos
   ---------------------------------------------------------- */
async function loadTransactions(token) {
  try {
    const query = getActiveFilters();
    const response = await fetchWithAuth(`/transactions?${query}`, token);
    if (!response.ok) return;

    const { data, meta } = await response.json();
    currentTransactions = data || [];
    currentMeta = meta;

    renderTransactionsTable(currentTransactions);
    renderPagination(meta);
  } catch (err) {
    console.error("Erro ao carregar transações:", err);
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
const categorySelect = document.getElementById("txCategory");
const descriptionInput = document.getElementById("txDescription");

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

async function populateCategories(token, selectedId = "") {
  categorySelect.innerHTML = '<option value="">Sem categoria</option>';

  try {
    const response = await fetchWithAuth("/categories", token);
    if (!response.ok) return;

    const categories = await response.json();
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      if (category.id === selectedId) option.selected = true;
      categorySelect.appendChild(option);
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
  idInput.value = isEditing ? transaction.id : "";
  modalTitle.textContent = isEditing ? "Editar transação" : "Nova transação";
  setSubmitting(false, isEditing);

  if (isEditing) {
    titleInput.value = transaction.title;
    amountInput.value = Number(transaction.amount);
    descriptionInput.value = transaction.description || "";
    const typeRadio = form.querySelector(`input[name="txType"][value="${transaction.type}"]`);
    if (typeRadio) typeRadio.checked = true;
  }

  overlay.hidden = false;
  document.addEventListener("keydown", handleKeydown);

  await populateCategories(auth.token, isEditing ? transaction.category_id || "" : "");
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

  const payload = { title, amount: amountValue, type };
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
    // O mesmo formulário decide entre criar (POST) e atualizar (PUT)
    // dependendo se veio de "Nova transação" ou de "Editar"
    const response = await fetchWithAuth(
      isEditing ? `/transactions/${id}` : "/transactions",
      auth.token,
      {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload),
      }
    );

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

// Delegação de eventos: um único listener no <tbody> cobre todos os
// botões "Editar"/"Excluir", mesmo depois que as linhas são recriadas
document.getElementById("transactionsBody").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
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