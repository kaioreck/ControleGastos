// VERSÃO FINAL E COMPLETA COM AUTENTICAÇÃO JWT E BOA ESTRUTURA

// URL da sua API de backend
const API_URL = 'http://localhost:3000';

/**
 * --- FUNÇÃO PADRÃO PARA CHAMADAS DE API (MODIFICADA) ---
 * Agora envia o token JWT no cabeçalho de cada requisição.
 * Também verifica se o token expirou para deslogar o usuário.
 */
async function apiFetch(url, options = {}) {
    try {
        // Pega o token do localStorage, que é o local correto para armazená-lo
        const token = localStorage.getItem('token');
        if (token) {
            // Se não houver cabeçalhos definidos, cria um objeto vazio
            if (!options.headers) {
                options.headers = {};
            }
            // Adiciona o cabeçalho de autorização no formato Bearer
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, options);

        // Se o token for inválido/expirado (401/403), o servidor negará o acesso.
        // A função de logout será chamada para limpar a sessão local.
        if (response.status === 401 || response.status === 403) {
            logout();
            return null;
        }

        // Para a requisição DELETE, um sucesso 204 não tem corpo JSON, então retornamos true.
        if (response.status === 204) return true;

        // Para outras respostas, tenta converter o corpo para JSON.
        const data = await response.json();
        if (!response.ok) {
            // Se a API retornar um erro estruturado (ex: { "error": "mensagem" }), usa a mensagem dele.
            throw new Error(data.error || 'Ocorreu um erro na requisição.');
        }
        return data;

    } catch (error) {
        console.error('Erro de API:', error);
        // Evita mostrar alerts genéricos para erros de conexão ou JSON inválido.
        if (error.message.includes('Failed to fetch')) {
             console.error("Erro de comunicação com a API. Verifique se o servidor backend está rodando.");
             alert("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.");
        } else if (error.message.includes('invalid json')) {
             console.error("A API retornou uma resposta inesperada.");
        } else {
            alert(error.message);
        }
        return null;
    }
}

/**
 * --- FUNÇÃO DE LÓGICA DE LOGIN ---
 * Verifica se o usuário (no sessionStorage) e o token (no localStorage) existem.
 * Se não, redireciona para a página de login.
 */
function checkLogin() {
    if (!sessionStorage.getItem('user') || !localStorage.getItem('token')) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/**
 * --- FUNÇÃO DE LOGOUT ---
 * Limpa os dados de sessão e o token, depois redireciona para a página de login.
 */
function logout() {
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

/**
 * --- FUNÇÃO DE RENDERIZAÇÃO ---
 * Recebe uma lista de transações e um ID de elemento para renderizar o HTML.
 */
function renderizarListaTransacoes(lista, elementoId) {
    const containerLista = document.getElementById(elementoId);
    if (!containerLista) return;
    containerLista.innerHTML = ''; // Limpa a lista antes de renderizar
    if (!lista || lista.length === 0) {
        containerLista.innerHTML = `<div class="empty-state"><p>Nenhuma transação encontrada.</p></div>`;
        return;
    }
    lista.forEach(transacao => {
        const tipoClasse = transacao.tipo;
        const sinal = tipoClasse === 'receita' ? '+' : '-';
        const dataFormatada = new Date(transacao.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        containerLista.innerHTML += `
            <div class="transaction-item" id="transacao-${transacao.id}">
                <div class="transaction-details">
                    <span class="transaction-icon ${tipoClasse === 'receita' ? 'income' : 'expense'}">${sinal}</span>
                    <div>
                        <p class="transaction-desc">${transacao.descricao}</p>
                        <span class="transaction-cat">${transacao.categoria} - ${dataFormatada}</span>
                    </div>
                </div>
                <div class="transaction-value-group">
                    <div class="transaction-value ${tipoClasse === 'receita' ? 'income' : 'expense'}">${sinal}R$ ${parseFloat(transacao.valor).toFixed(2)}</div>
                    <div class="transaction-actions">
                        <button class="action-icon edit" title="Editar" data-id="${transacao.id}">✏️</button>
                        <button class="action-icon delete" title="Excluir" data-id="${transacao.id}">🗑️</button>
                    </div>
                </div>
            </div>`;
    });
}

// --- LÓGICA PRINCIPAL ---
// Espera o HTML ser completamente carregado antes de executar o script.
console.log("DEBUG: app.js foi carregado.");

document.addEventListener('DOMContentLoaded', () => {
    
    console.log("DEBUG: DOM completamente carregado. Iniciando a lógica da página.");

    // PÁGINA DE LOGIN
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        console.log("DEBUG: Formulário de login encontrado. Adicionando listener.");
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("DEBUG: Botão 'Entrar' clicado.");
            
            const username = loginForm.querySelector('#username').value;
            const password = loginForm.querySelector('#password').value;
            
            console.log(`DEBUG: Tentando login para o usuário: ${username}`);
            
            const data = await apiFetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (data && data.token) {
                console.log("DEBUG: Login bem-sucedido. Redirecionando...");
                sessionStorage.setItem('user', JSON.stringify({ id: data.id, username: data.username }));
                localStorage.setItem('token', data.token);
                window.location.href = 'dashboard.html';
            } else {
                console.error("DEBUG: Falha no login. A API não retornou um token ou ocorreu um erro.");
            }
        });
    }

    // PÁGINA DE REGISTRO
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        console.log("DEBUG: Formulário de registro encontrado.");
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = registerForm.querySelector('#username').value;
            const password = registerForm.querySelector('#password').value;
            const newUser = await apiFetch(`${API_URL}/registrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (newUser) {
                alert('Usuário registrado com sucesso! Faça o login.');
                window.location.href = 'login.html';
            }
        });
    }

    // PÁGINA DO DASHBOARD
    const dashboardElement = document.getElementById('total-balance');
    if (dashboardElement) {
        console.log("DEBUG: Elemento do dashboard encontrado.");
        if (checkLogin()) {
            const user = JSON.parse(sessionStorage.getItem('user'));
            const greetingElement = document.getElementById('greeting');
            if (user && greetingElement) greetingElement.textContent = `Olá, ${user.username}!`;

            apiFetch(`${API_URL}/transacoes`).then(transacoes => {
                if (transacoes) {
                    let totalReceitas = 0, totalDespesas = 0;
                    transacoes.forEach(t => {
                        const valor = parseFloat(t.valor);
                        t.tipo === 'receita' ? totalReceitas += valor : totalDespesas += valor;
                    });
                    const saldoFinal = totalReceitas - totalDespesas;
                    document.getElementById('total-income').innerHTML = `R$ ${totalReceitas.toFixed(2)}`;
                    document.getElementById('total-expense').innerHTML = `R$ ${totalDespesas.toFixed(2)}`;
                    dashboardElement.innerHTML = `R$ ${saldoFinal.toFixed(2)}`;
                    renderizarListaTransacoes(transacoes.slice(0, 5), 'recent-transactions-list');
                }
            });
        }
    }

    // PÁGINA DE TODAS AS TRANSAÇÕES
    const fullTransactionsList = document.getElementById('full-transactions-list');
    if (fullTransactionsList) {
        if (checkLogin()) {
            apiFetch(`${API_URL}/transacoes`).then(transacoes => {
                if (transacoes) renderizarListaTransacoes(transacoes, 'full-transactions-list');
            });
        }
    }

    // PÁGINAS DE ADICIONAR (Receita e Despesa)
    const receitaForm = document.getElementById('receita-form');
    const despesaForm = document.getElementById('despesa-form');
    const formDeAdicao = receitaForm || despesaForm;
    if (formDeAdicao) {
        if (checkLogin()) {
            formDeAdicao.addEventListener('submit', async (e) => {
                e.preventDefault();
                const tipo = receitaForm ? 'receita' : 'despesa';
                const novaTransacao = {
                    descricao: formDeAdicao.querySelector('#descricao').value,
                    valor: formDeAdicao.querySelector('#valor').value,
                    categoria: formDeAdicao.querySelector('#categoria').value,
                    tipo: tipo
                };
                const transacaoAdicionada = await apiFetch(`${API_URL}/transacoes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novaTransacao)
                });
                if (transacaoAdicionada) {
                    alert(`Sua ${tipo} foi adicionada com sucesso!`);
                    window.location.href = 'dashboard.html';
                }
            });
        }
    }

    // PÁGINA DE EDIÇÃO
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        if (checkLogin()) {
            const urlParams = new URLSearchParams(window.location.search);
            const transacaoId = urlParams.get('id');

            if (transacaoId) {
                apiFetch(`${API_URL}/transacoes/${transacaoId}`).then(transacao => {
                    if (transacao) {
                        editForm.querySelector('#transacao-id').value = transacao.id;
                        editForm.querySelector('#descricao').value = transacao.descricao;
                        editForm.querySelector('#valor').value = parseFloat(transacao.valor);
                        editForm.querySelector('#categoria').value = transacao.categoria;
                    }
                });
            }

            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = editForm.querySelector('#transacao-id').value;
                const dadosAtualizados = {
                    descricao: editForm.querySelector('#descricao').value,
                    valor: editForm.querySelector('#valor').value,
                    categoria: editForm.querySelector('#categoria').value
                };
                const resultado = await apiFetch(`${API_URL}/transacoes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosAtualizados)
                });
                if (resultado) {
                    alert('Transação atualizada com sucesso!');
                    window.location.href = 'dashboard.html';
                }
            });
        }
    }

    // PÁGINA DO CONVERSOR
    const conversorForm = document.getElementById('conversor-form');
    if (conversorForm) {
        const amountInput = document.getElementById('amount');
        const fromCurrencySelect = document.getElementById('from_currency');
        const toCurrencySelect = document.getElementById('to_currency');
        const resultDiv = document.getElementById('conversion-result');

        const converterMoeda = async () => {
            const amount = amountInput.value;
            const fromCurrency = fromCurrencySelect.value;
            const toCurrency = toCurrencySelect.value;
            if (!amount) return;

            resultDiv.innerHTML = "Calculando...";
            const data = await apiFetch(`${API_URL}/converter-moeda?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`);

            if (data && data.result === 'success') {
                resultDiv.innerHTML = `${amount} ${fromCurrency} = ${data.conversion_result.toFixed(2)} ${toCurrency}`;
            } else {
                resultDiv.innerHTML = (data && data.error) ? data.error : "Erro na conversão.";
            }
        };

        amountInput.addEventListener('input', converterMoeda);
        fromCurrencySelect.addEventListener('change', converterMoeda);
        toCurrencySelect.addEventListener('change', converterMoeda);
        converterMoeda();
    }

    // --- LISTENERS GLOBAIS DE CLIQUES E BOTÕES ---
    document.body.addEventListener('click', async function(event) {
        const editButton = event.target.closest('.action-icon.edit');
        if (editButton) {
            window.location.href = `edit_transacao.html?id=${editButton.dataset.id}`;
        }

        const deleteButton = event.target.closest('.action-icon.delete');
        if (deleteButton) {
            if (confirm('Tem certeza que deseja excluir esta transação?')) {
                const id = deleteButton.dataset.id;
                const sucesso = await apiFetch(`${API_URL}/transacoes/${id}`, { method: 'DELETE' });
                if (sucesso) {
                    const elementoParaRemover = document.getElementById(`transacao-${id}`);
                    if (elementoParaRemover) elementoParaRemover.remove();
                }
            }
        }
    });

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) logoutButton.addEventListener('click', logout);

    const addReceitaBtn = document.querySelector('.action-btn.income-btn');
    if (addReceitaBtn) addReceitaBtn.addEventListener('click', () => window.location.href = 'add_receita.html');

    const addDespesaBtn = document.querySelector('.action-btn.expense-btn');
    if (addDespesaBtn) addDespesaBtn.addEventListener('click', () => window.location.href = 'add_despesa.html');

    const verTodasBtn = document.querySelector('.view-all');
    if (verTodasBtn) verTodasBtn.addEventListener('click', () => window.location.href = 'transacoes.html');
    
    const converterBtn = document.querySelector('.action-btn.converter-btn');
    if (converterBtn) converterBtn.addEventListener('click', () => window.location.href = 'conversor.html');
});
