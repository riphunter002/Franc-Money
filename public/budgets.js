/* ==========================================================
   Franc Money — budgets.js
   Depende de session.js já ter sido carregado antes deste
   arquivo (getStoredAuth, fetchWithAuth, extractErrorMessage,
   currencyFormatter, escapeHtml etc.)
   ========================================================== */

const listEl = document.getElementById("budgetList");
const form = document.getElementById("budgetForm");
const categorySelect = document.getElementById("budgetCategory");
const amountInput = document.getElementById("budgetAmount");
const submitBtn = document.getElementById("budgetSubmitBtn");
const formError = document.getElementById("budgetFormError");

function setFormError(message) {
  formError.textContent = message || "";
}

function setSubmitting(isSubmitting) {
  submitBtn.disabled = isSubmitting;
  submitBtn.textContent = isSubmitting ? "Salvando..." : "+ Definir limite";
}

/* ----------------------------------------------------------
   Preenche o <select> só com categorias de despesa que ainda
   não têm orçamento (cada categoria só pode ter um orçamento)
   ---------------------------------------------------------- */
async function populateCategorySelect(token, budgets) {
  categorySelect.innerHTML = '<option value="">Selecione uma categoria</option>';

  try {
    const response = await fetchWithAuth("/categories", token);
    if (!response.ok) return;

    const categories = await response.json();
    const budgetedCategoryIds = new Set(budgets.map((b) => b.category_id));

    const available = categories.filter(
      (category) => category.type === "EXPENSE" && !budgetedCategoryIds.has(category.id)
    );

    if (!available.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = categories.some((c) => c.type === "EXPENSE")
        ? "Todas as categorias de despesa já têm orçamento"
        : "Crie uma categoria de despesa primeiro";
      option.disabled = true;
      categorySelect.appendChild(option);
      submitBtn.disabled = true;
      return;
    }

    submitBtn.disabled = false;
    available.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      categorySelect.appendChild(option);
    });
  } catch (err) {
    console.error("Erro ao carregar categorias:", err);
  }
}

/* ----------------------------------------------------------
   Renderização da lista de orçamentos, com barra de progresso
   ---------------------------------------------------------- */
function renderBudgets(budgets) {
  if (!budgets.length) {
    listEl.innerHTML =
      '<li class="manage-list__empty">Você ainda não definiu nenhum orçamento.</li>';
    return;
  }

  listEl.innerHTML = budgets
    .map((budget) => {
      const limit = Number(budget.amount);
      const spent = Number(budget.spent);
      const percentage = Math.min(budget.percentage, 100);
      const isOver = budget.isOverBudget;

      const fillClass = isOver
        ? "budget-progress__fill--over"
        : budget.percentage >= 80
        ? "budget-progress__fill--warning"
        : "";

      const statusText = isOver
        ? `Orçamento estourado em ${currencyFormatter.format(spent - limit)}`
        : `${Math.round(budget.percentage)}% usado`;

      return `
        <li class="budget-row" data-id="${budget.id}">
          <div class="budget-row__header">
            <span class="budget-row__category">
              <span class="budget-row__dot" style="background:${escapeHtml(budget.category.color)}"></span>
              ${escapeHtml(budget.category.name)}
            </span>
            <span class="budget-row__amounts">
              <strong>${currencyFormatter.format(spent)}</strong> de ${currencyFormatter.format(limit)}
            </span>
          </div>

          <div class="budget-progress">
            <div class="budget-progress__fill ${fillClass}" style="width:${percentage}%"></div>
          </div>

          <div class="budget-row__footer">
            <span class="budget-row__status ${isOver ? "budget-row__status--over" : ""}">
              ${statusText}
            </span>
            <div class="row-actions">
              <button type="button" class="row-actions__btn" data-action="edit" data-id="${budget.id}">
                Editar
              </button>
              <button type="button" class="row-actions__btn row-actions__btn--danger" data-action="delete" data-id="${budget.id}">
                Excluir
              </button>
            </div>
          </div>

          <form class="budget-row__edit-form" data-id="${budget.id}" hidden>
            <input
              type="number"
              class="modal-input"
              min="0.01"
              step="0.01"
              inputmode="decimal"
              value="${limit}"
              required
            />
            <button type="submit" class="btn-gold">Salvar</button>
            <button type="button" class="btn-secondary" data-action="cancel-edit">Cancelar</button>
          </form>
        </li>
      `;
    })
    .join("");
}

/* ----------------------------------------------------------
   Busca os orçamentos do usuário logado (já vem com o gasto
   do mês calculado pelo backend) e atualiza o <select>
   ---------------------------------------------------------- */
async function loadBudgets(token) {
  try {
    const response = await fetchWithAuth("/budgets", token);
    if (!response.ok) return;

    const budgets = await response.json();
    renderBudgets(budgets);
    await populateCategorySelect(token, budgets);
  } catch (err) {
    console.error("Erro ao carregar orçamentos:", err);
  }
}

async function handleDelete(id, token) {
  const confirmed = window.confirm("Tem certeza que deseja excluir este orçamento?");
  if (!confirmed) return;

  try {
    const response = await fetchWithAuth(`/budgets/${id}`, token, {
      method: "DELETE",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, "Não foi possível excluir o orçamento."));
    }

    await loadBudgets(token);
  } catch (err) {
    window.alert(err.message || "Não foi possível excluir o orçamento.");
  }
}

async function handleEditSubmit(editForm, id, token) {
  const input = editForm.querySelector("input");
  const amount = Number(input.value);

  if (!amount || amount <= 0) {
    window.alert("Informe um valor maior que zero.");
    return;
  }

  try {
    const response = await fetchWithAuth(`/budgets/${id}`, token, {
      method: "PUT",
      body: JSON.stringify({ amount }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, "Não foi possível atualizar o orçamento."));
    }

    await loadBudgets(token);
  } catch (err) {
    window.alert(err.message || "Não foi possível atualizar o orçamento.");
  }
}

/* ----------------------------------------------------------
   Inicialização da página
   ---------------------------------------------------------- */
function initBudgetsPage() {
  const auth = getStoredAuth();

  if (!auth) {
    goToLogin();
    return;
  }

  loadBudgets(auth.token);

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearStoredAuth();
      goToLogin();
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFormError("");

    const category_id = categorySelect.value;
    const amount = Number(amountInput.value);

    if (!category_id) {
      setFormError("Selecione uma categoria.");
      return;
    }

    if (!amount || amount <= 0) {
      setFormError("Informe um limite maior que zero.");
      amountInput.focus();
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetchWithAuth("/budgets", auth.token, {
        method: "POST",
        body: JSON.stringify({ category_id, amount }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, "Não foi possível criar o orçamento."));
      }

      form.reset();
      await loadBudgets(auth.token);
    } catch (err) {
      setFormError(err.message || "Não foi possível criar o orçamento.");
    } finally {
      setSubmitting(false);
    }
  });

  // Delegação de eventos: um único listener na lista cobre editar, excluir,
  // salvar edição e cancelar, mesmo depois que as linhas são recriadas
  listEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const { action, id } = button.dataset;
    const row = button.closest(".budget-row");

    if (action === "delete") {
      handleDelete(id, auth.token);
    }

    if (action === "edit") {
      row.querySelector(".budget-row__edit-form").hidden = false;
      row.querySelector(".budget-row__edit-form input").focus();
    }

    if (action === "cancel-edit") {
      row.querySelector(".budget-row__edit-form").hidden = true;
    }
  });

  listEl.addEventListener("submit", (event) => {
    const editForm = event.target.closest(".budget-row__edit-form");
    if (!editForm) return;

    event.preventDefault();
    handleEditSubmit(editForm, editForm.dataset.id, auth.token);
  });
}

document.addEventListener("DOMContentLoaded", initBudgetsPage);
