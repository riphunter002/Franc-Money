/* ==========================================================
   Franc Money — categories.js
   Depende de session.js já ter sido carregado antes deste
   arquivo (getStoredAuth, fetchWithAuth, extractErrorMessage etc.)
   ========================================================== */

const listEl = document.getElementById("categoryManageList");
const form = document.getElementById("categoryForm");
const nameInput = document.getElementById("categoryName");
const submitBtn = document.getElementById("categorySubmitBtn");
const formError = document.getElementById("categoryFormError");

const TYPE_LABELS = { EXPENSE: "Despesa", INCOME: "Receita" };

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
   Busca as categorias do usuário logado
   ---------------------------------------------------------- */
async function loadCategories(token) {
  try {
    const response = await fetchWithAuth("/categories", token);
    if (!response.ok) return;

    const categories = await response.json();
    renderCategories(categories);
  } catch (err) {
    console.error("Erro ao carregar categorias:", err);
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