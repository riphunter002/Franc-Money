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
function renderCategories(categories, token) {
  if (!categories.length) {
    listEl.innerHTML =
      '<li class="manage-list__empty">Você ainda não criou nenhuma categoria.</li>';
    return;
  }

  listEl.innerHTML = categories
    .map(
      (category) => `
        <li class="manage-row" data-id="${category.id}">
          <span class="manage-row__name">${escapeHtml(category.name)}</span>
          <button type="button" class="manage-row__delete" data-id="${category.id}">
            Excluir
          </button>
        </li>
      `
    )
    .join("");

  // Um único listener no <ul> (delegação de eventos) em vez de um por botão:
  // mais simples de manter à medida que a lista muda dinamicamente
  listEl.querySelectorAll(".manage-row__delete").forEach((button) => {
    button.addEventListener("click", () => handleDelete(button.dataset.id, token));
  });
}

/* ----------------------------------------------------------
   Busca as categorias do usuário logado
   ---------------------------------------------------------- */
async function loadCategories(token) {
  try {
    const response = await fetchWithAuth("/categories", token);
    if (!response.ok) return;

    const categories = await response.json();
    renderCategories(categories, token);
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
    if (!name) {
      setFormError("Informe um nome para a categoria.");
      nameInput.focus();
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetchWithAuth("/categories", auth.token, {
        method: "POST",
        body: JSON.stringify({ name }),
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
}

document.addEventListener("DOMContentLoaded", initCategoriesPage);