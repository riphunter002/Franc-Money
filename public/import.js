/* ==========================================================
   Franc Money — import.js
   Lê o CSV inteiramente no navegador (sem lib nova, sem enviar
   o arquivo pro backend) e manda só as linhas já interpretadas.
   Depende de session.js já ter sido carregado antes deste
   arquivo (getStoredAuth, fetchWithAuth, extractErrorMessage,
   currencyFormatter, escapeHtml etc.)
   ========================================================== */

const form = document.getElementById("importForm");
const fileInput = document.getElementById("importFile");
const submitBtn = document.getElementById("importSubmitBtn");
const formError = document.getElementById("importFormError");
const formStatus = document.getElementById("importFormStatus");
const reviewBody = document.getElementById("reviewBody");
const confirmAllBtn = document.getElementById("confirmAllBtn");

let categoriesCache = [];

function setImportError(message) {
  formError.textContent = message || "";
}

function setImportStatus(message) {
  formStatus.textContent = message || "";
}

/* ----------------------------------------------------------
   "1.234,56" -> 1234.56 (formato brasileiro: ponto de milhar,
   vírgula decimal)
   ---------------------------------------------------------- */
function parseBRLNumber(text) {
  const cleaned = text.trim().replace(/\./g, "").replace(",", ".");
  return Number(cleaned);
}

/* ----------------------------------------------------------
   "05/09/2026" -> "2026-09-05" (formato que o <input type="date">
   e o backend esperam)
   ---------------------------------------------------------- */
function parseBRDate(text) {
  const parts = text.trim().split("/");
  if (parts.length !== 3) return null;

  const [day, month, year] = parts;
  if (!day || !month || !year || year.length !== 4) return null;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/* ----------------------------------------------------------
   "2026-09-05" já vem no formato que a gente usa; só confere
   se tem essa cara mesmo
   ---------------------------------------------------------- */
function parseIsoDate(text) {
  const trimmed = text.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

/* ----------------------------------------------------------
   Separa uma linha de CSV pelo delimitador, respeitando campos
   entre aspas (ex.: "25,99" não deve quebrar em dois campos
   mesmo com o delimitador sendo vírgula) — é assim que o export
   de fatura do Nubank escapa o valor, que também usa vírgula
   decimal
   ---------------------------------------------------------- */
function splitCsvLine(line, delimiter) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

/* ----------------------------------------------------------
   Reconhece dois formatos pelo cabeçalho:
   - "data;titulo;valor"  -> genérico (any banco/planilha em pt-BR)
   - "date,title,amount"  -> export de fatura do Nubank
   Sem um desses cabeçalhos, cai no formato genérico sem cabeçalho
   (mantém o comportamento original).
   ---------------------------------------------------------- */
function detectCsvFormat(firstLine) {
  const headerLower = firstLine.trim().toLowerCase();

  if (headerLower === "date,title,amount") {
    return { delimiter: ",", dateParser: parseIsoDate, hasHeader: true };
  }

  if (headerLower.split(";")[0]?.trim() === "data") {
    return { delimiter: ";", dateParser: parseBRDate, hasHeader: true };
  }

  return { delimiter: ";", dateParser: parseBRDate, hasHeader: false };
}

/* ----------------------------------------------------------
   Lê o texto do CSV e devolve as linhas válidas + uma lista de
   erros (linhas ignoradas)
   ---------------------------------------------------------- */
function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], errors: [] };

  const { delimiter, dateParser, hasHeader } = detectCsvFormat(lines[0]);
  const rows = [];
  const errors = [];

  lines.forEach((line, index) => {
    if (index === 0 && hasHeader) return;

    const parts = splitCsvLine(line, delimiter);
    if (parts.length < 3) {
      errors.push(`linha ${index + 1} (esperava 3 colunas)`);
      return;
    }

    const [rawDate, rawTitle, rawAmount] = parts;
    const date = dateParser(rawDate);
    const title = rawTitle.trim();
    const amount = parseBRLNumber(rawAmount);

    if (!date || !title || !amount || Number.isNaN(amount) || amount <= 0) {
      errors.push(`linha ${index + 1} (dados inválidos)`);
      return;
    }

    rows.push({ date, title, amount });
  });

  return { rows, errors };
}

/* ----------------------------------------------------------
   Renderização da tabela de revisão
   ---------------------------------------------------------- */
function renderReviewTable(items) {
  confirmAllBtn.hidden = items.length === 0;

  if (!items.length) {
    reviewBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 24px 12px;">
          Nenhuma transação aguardando revisão. Importe um CSV acima pra começar.
        </td>
      </tr>
    `;
    return;
  }

  const categoryOptions = categoriesCache
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join("");

  reviewBody.innerHTML = items
    .map((item) => {
      const dateValue = item.date.slice(0, 10);
      return `
        <tr data-id="${item.id}">
          <td><input type="date" class="modal-input" value="${dateValue}" data-field="date" /></td>
          <td><input type="text" class="modal-input" value="${escapeHtml(item.title)}" title="${escapeHtml(item.title)}" data-field="title" /></td>
          <td><input type="number" class="modal-input" min="0.01" step="0.01" value="${Number(item.amount)}" data-field="amount" /></td>
          <td>
            <select class="modal-input" data-field="type">
              <option value="EXPENSE" ${item.type === "EXPENSE" ? "selected" : ""}>Despesa</option>
              <option value="INCOME" ${item.type === "INCOME" ? "selected" : ""}>Receita</option>
            </select>
          </td>
          <td>
            <select class="modal-input" data-field="category_id">
              <option value="">Sem categoria</option>
              ${categoryOptions}
            </select>
          </td>
          <td class="align-right">
            <div class="row-actions">
              <button type="button" class="row-actions__btn" data-action="confirm">Confirmar</button>
              <button type="button" class="row-actions__btn row-actions__btn--danger" data-action="discard">Descartar</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  // Preenche a categoria já escolhida (feito depois do innerHTML pra não
  // precisar escapar o "selected" dentro de cada <option> montada acima)
  items.forEach((item) => {
    if (!item.category_id) return;
    const select = reviewBody.querySelector(`tr[data-id="${item.id}"] select[data-field="category_id"]`);
    if (select) select.value = item.category_id;
  });
}

async function loadCategories(token) {
  try {
    const response = await fetchWithAuth("/categories", token);
    if (!response.ok) return;
    categoriesCache = await response.json();
  } catch (err) {
    console.error("Erro ao carregar categorias:", err);
  }
}

async function loadPending(token) {
  try {
    const response = await fetchWithAuth("/imported-transactions", token);
    if (!response.ok) return;

    const items = await response.json();
    renderReviewTable(items);
  } catch (err) {
    console.error("Erro ao carregar transações identificadas:", err);
  }
}

/* ----------------------------------------------------------
   Lê os valores atuais dos campos de uma linha (já editados
   ou não) pra mandar junto na hora de confirmar
   ---------------------------------------------------------- */
function readRowValues(row) {
  const get = (field) => row.querySelector(`[data-field="${field}"]`).value;

  return {
    date: get("date"),
    title: get("title").trim(),
    amount: Number(get("amount")),
    type: get("type"),
    category_id: get("category_id") || null
  };
}

async function confirmRow(row, token) {
  const id = row.dataset.id;
  const values = readRowValues(row);

  if (!values.title || !values.amount || values.amount <= 0 || !values.date) {
    window.alert("Confira os campos dessa linha: título, valor e data são obrigatórios.");
    return false;
  }

  try {
    const response = await fetchWithAuth(`/imported-transactions/${id}/confirm`, token, {
      method: "POST",
      body: JSON.stringify(values)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(extractErrorMessage(data, "Não foi possível confirmar essa transação."));
    }

    row.remove();
    return true;
  } catch (err) {
    window.alert(err.message || "Não foi possível confirmar essa transação.");
    return false;
  }
}

async function discardRow(row, token) {
  const confirmed = window.confirm("Descartar essa linha sem criar uma transação?");
  if (!confirmed) return;

  const id = row.dataset.id;

  try {
    const response = await fetchWithAuth(`/imported-transactions/${id}`, token, {
      method: "DELETE"
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(extractErrorMessage(data, "Não foi possível descartar essa linha."));
    }

    row.remove();
  } catch (err) {
    window.alert(err.message || "Não foi possível descartar essa linha.");
  }
}

/* ----------------------------------------------------------
   Inicialização da página
   ---------------------------------------------------------- */
function initImportPage() {
  const auth = getStoredAuth();
  if (!auth) {
    goToLogin();
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearStoredAuth();
      goToLogin();
    });
  }

  loadCategories(auth.token).then(() => loadPending(auth.token));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setImportError("");
    setImportStatus("");

    const file = fileInput.files[0];
    if (!file) {
      setImportError("Selecione um arquivo CSV.");
      return;
    }

    const text = await file.text();
    const { rows, errors } = parseCsv(text);

    if (!rows.length) {
      setImportError("Nenhuma linha válida encontrada no arquivo. Confira o formato esperado.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Importando...";

    try {
      const response = await fetchWithAuth("/imported-transactions", auth.token, {
        method: "POST",
        body: JSON.stringify({ rows })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(extractErrorMessage(data, "Não foi possível importar o arquivo."));
      }

      let message = `${data.imported} transação(ões) identificada(s), aguardando revisão abaixo.`;
      if (errors.length) {
        message += ` ${errors.length} linha(s) ignorada(s): ${errors.join(", ")}.`;
      }
      setImportStatus(message);

      form.reset();
      await loadPending(auth.token);
    } catch (err) {
      setImportError(err.message || "Não foi possível importar o arquivo.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Importar";
    }
  });

  // Delegação de eventos: um único listener na tabela cobre Confirmar e
  // Descartar de qualquer linha, mesmo depois que a tabela é recriada
  reviewBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const row = button.closest("tr[data-id]");
    if (!row) return;

    if (button.dataset.action === "confirm") confirmRow(row, auth.token);
    if (button.dataset.action === "discard") discardRow(row, auth.token);
  });

  confirmAllBtn.addEventListener("click", async () => {
    const rows = Array.from(reviewBody.querySelectorAll("tr[data-id]"));
    confirmAllBtn.disabled = true;

    // Uma de cada vez: mais simples de acompanhar (e de debugar) do que
    // disparar tudo em paralelo, e evita sobrecarregar o servidor com N
    // requisições simultâneas se a fatura tiver muitas linhas
    for (const row of rows) {
      await confirmRow(row, auth.token);
    }

    confirmAllBtn.disabled = false;
    if (!reviewBody.querySelector("tr[data-id]")) {
      renderReviewTable([]);
    }
  });
}

document.addEventListener("DOMContentLoaded", initImportPage);
