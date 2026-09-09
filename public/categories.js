/* ==========================================================
   Franc Money — categories.js
   Depende de session.js já ter sido carregado antes deste
   arquivo (getStoredAuth, fetchWithAuth, extractErrorMessage etc.)
   ========================================================== */

const listEl = document.getElementById("categoryManageList");
const presetGridEl = document.getElementById("presetGrid");
const form = document.getElementById("categoryForm");
const nameInput = document.getElementById("categoryName");
const submitBtn = document.getElementById("categorySubmitBtn");
const formError = document.getElementById("categoryFormError");

const TYPE_LABELS = { EXPENSE: "Despesa", INCOME: "Receita" };

// Categorias mais comuns, pra criar com um toque só (sem digitar nem
// escolher receita/despesa) — pensado pra facilitar bastante pra quem
// tem menos prática com telas, como usuários de mais idade
const CATEGORY_PRESETS = [
  { emoji: "🍽️", name: "Alimentação", type: "EXPENSE" },
  { emoji: "🚗", name: "Transporte", type: "EXPENSE" },
  { emoji: "🏠", name: "Moradia", type: "EXPENSE" },
  { emoji: "💊", name: "Saúde", type: "EXPENSE" },
  { emoji: "🎉", name: "Lazer", type: "EXPENSE" },
  { emoji: "📚", name: "Educação", type: "EXPENSE" },
  { emoji: "👕", name: "Vestuário", type: "EXPENSE" },
  { emoji: "📱", name: "Assinaturas", type: "EXPENSE" },
  { emoji: "💰", name: "Salário", type: "INCOME" },
  { emoji: "🎁", name: "Presentes", type: "INCOME" },
  { emoji: "📈", name: "Investimentos", type: "INCOME" },
  { emoji: "💼", name: "Freelance", type: "INCOME" },
];

function setFormError(message) {
  formError.textContent = message || "";
}

function setSubmitting(isSubmitting) {
  submitBtn.disabled = isSubmitting;
  submitBtn.textContent = isSubmitting ? "Adicionando..." : "+ Adicionar";
}

/* ----------------------------------------------------------
   Renderiza a lista de categorias na tela
   ---------------------------------------------------------- */
function renderCategories(categories) {
  if (!categories.length) {
    listEl.innerHTML =
      '<li class="manage-list__empty">Você ainda não criou nenhuma categoria.</li>';
    return;
  }

  listEl.innerHTML = categories
    .map(
      (category) => `
        <li class="manage-row" data-id="${category.id}">
          <div class="manage-row__header">
            <span class="manage-row__name">
              ${escapeHtml(category.name)}
              <span class="tag">${TYPE_LABELS[category.type] || category.type}</span>
            </span>
            <div class="row-actions">
              <button type="button" class="row-actions__btn" data-action="edit" data-id="${category.id}">
                Editar
              </button>
              <button type="button" class="row-actions__btn row-actions__btn--danger" data-action="delete" data-id="${category.id}">
                Excluir
              </button>
            </div>
          </div>

          <form class="manage-row__edit-form" data-id="${category.id}" hidden>
            <input type="text" class="modal-input" value="${escapeHtml(category.name)}" required />
            <fieldset class="type-toggle">
              <legend class="modal-label">Tipo</legend>
              <label class="type-toggle__option">
                <input type="radio" name="editType-${category.id}" value="EXPENSE" ${category.type === "EXPENSE" ? "checked" : ""} />
                <span>Despesa</span>
              </label>
              <label class="type-toggle__option">
                <input type="radio" name="editType-${category.id}" value="INCOME" ${category.type === "INCOME" ? "checked" : ""} />
                <span>Receita</span>
              </label>
            </fieldset>
            <button type="submit" class="btn-gold">Salvar</button>
            <button type="button" class="btn-secondary" data-action="cancel-edit">Cancelar</button>
          </form>
        </li>
      `
    )
    .join("");
}

/* ----------------------------------------------------------
   Renderiza os presets ainda não usados (compara pelo nome, sem
   diferenciar maiúsculas/minúsculas, pra não sugerir criar de novo
   uma categoria que a pessoa já tem)
   ---------------------------------------------------------- */
function renderPresets(existingCategories) {
  if (!presetGridEl) return;

  const existingNames = new Set(existingCategories.map((c) => c.name.trim().toLowerCase()));
  const available = CATEGORY_PRESETS.filter((preset) => !existingNames.has(preset.name.toLowerCase()));

  if (!available.length) {
    presetGridEl.innerHTML =
      '<p class="preset-grid__empty">Você já criou todas as categorias sugeridas.</p>';
    return;
  }

  presetGridEl.innerHTML = available
    .map(
      (preset) => `
        <button type="button" class="preset-btn" data-name="${escapeHtml(preset.name)}" data-type="${preset.type}">
          <span class="preset-btn__emoji" aria-hidden="true">${preset.emoji}</span>
          <span>${escapeHtml(preset.name)}</span>
        </button>
      `
    )
    .join("");
}

/* ----------------------------------------------------------
   Busca as categorias do usuário logado
   ---------------------------------------------------------- */
async function loadCategories(token) {
  try {
    const response = await fetchWithAuth("/categories", token);
    if (!response.ok) return;

    const categories = await response.json();
    renderCategories(categories);
    renderPresets(categories);
  } catch (err) {
    console.error("Erro ao carregar categorias:", err);
  }
}

/* ----------------------------------------------------------
   Cria a categoria direto a partir de um preset (um toque só)
   ---------------------------------------------------------- */
async function handlePresetClick(button, token) {
  const { name, type } = button.dataset;

  presetGridEl.querySelectorAll(".preset-btn").forEach((btn) => (btn.disabled = true));

  try {
    const response = await fetchWithAuth("/categories", token, {
      method: "POST",
      body: JSON.stringify({ name, type }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, "Não foi possível criar a categoria."));
    }

    await loadCategories(token);
  } catch (err) {
    window.alert(err.message || "Não foi possível criar a categoria.");
    presetGridEl.querySelectorAll(".preset-btn").forEach((btn) => (btn.disabled = false));
  }
}

/* ----------------------------------------------------------
   Exclui uma categoria
   ---------------------------------------------------------- */
async function handleDelete(id, token) {
  const confirmed = window.confirm(
    "Tem certeza que deseja excluir esta categoria? Transações que já usam ela não serão apagadas, mas ficarão sem categoria."
  );
  if (!confirmed) return;

  try {
    const response = await fetchWithAuth(`/categories/${id}`, token, {
      method: "DELETE",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, "Não foi possível excluir a categoria."));
    }

    await loadCategories(token);
  } catch (err) {
    // Erro simples aqui: um alert basta para uma ação secundária como essa
    window.alert(err.message || "Não foi possível excluir a categoria.");
  }
}

/* ----------------------------------------------------------
   Salva a edição de nome/tipo de uma categoria existente
   ---------------------------------------------------------- */
async function handleEditSubmit(editForm, id, token) {
  const nameInput = editForm.querySelector('input[type="text"]');
  const typeInput = editForm.querySelector('input[type="radio"]:checked');

  const name = nameInput.value.trim();
  if (!name) {
    window.alert("Informe um nome para a categoria.");
    return;
  }

  try {
    const response = await fetchWithAuth(`/categories/${id}`, token, {
      method: "PUT",
      body: JSON.stringify({ name, type: typeInput.value }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(extractErrorMessage(data, "Não foi possível atualizar a categoria."));
    }

    await loadCategories(token);
  } catch (err) {
    window.alert(err.message || "Não foi possível atualizar a categoria.");
  }
}

/* ----------------------------------------------------------
   Inicialização da página
   ---------------------------------------------------------- */
function initCategoriesPage() {
  const auth = getStoredAuth();

  if (!auth) {
    goToLogin();
    return;
  }

  loadCategories(auth.token);

  if (presetGridEl) {
    presetGridEl.addEventListener("click", (event) => {
      const button = event.target.closest(".preset-btn");
      if (!button) return;
      handlePresetClick(button, auth.token);
    });
  }

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

    const name = nameInput.value.trim();
    const type = form.querySelector('input[name="categoryType"]:checked')?.value;

    if (!name) {
      setFormError("Informe um nome para a categoria.");
      nameInput.focus();
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetchWithAuth("/categories", auth.token, {
        method: "POST",
        body: JSON.stringify({ name, type }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Cobre também o caso de nome duplicado (a constraint @@unique([name, user_id])
        // do schema.prisma faz o Prisma disparar o erro P2002 nesse caso)
        throw new Error(extractErrorMessage(data, "Não foi possível criar a categoria."));
      }

      form.reset();
      await loadCategories(auth.token);
    } catch (err) {
      setFormError(err.message || "Não foi possível criar a categoria.");
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
    const row = button.closest(".manage-row");

    if (action === "delete") {
      handleDelete(id, auth.token);
    }

    if (action === "edit") {
      row.querySelector(".manage-row__edit-form").hidden = false;
      row.querySelector('.manage-row__edit-form input[type="text"]').focus();
    }

    if (action === "cancel-edit") {
      row.querySelector(".manage-row__edit-form").hidden = true;
    }
  });

  listEl.addEventListener("submit", (event) => {
    const editForm = event.target.closest(".manage-row__edit-form");
    if (!editForm) return;

    event.preventDefault();
    handleEditSubmit(editForm, editForm.dataset.id, auth.token);
  });
}

document.addEventListener("DOMContentLoaded", initCategoriesPage);