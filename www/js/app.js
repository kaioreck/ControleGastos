// VERSÃO FINAL E ESTRUTURADA - SEM DOMContentLoaded
// Esta estrutura assume que a tag <script> está no final do <body> em todos os arquivos HTML.

const API_URL = 'http://localhost:3000';

// --- FUNÇÃO PADRÃO PARA CHAMADAS DE API ---
async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (response.status === 204) return true; // Sucesso para DELETE sem conteúdo
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Ocorreu um erro na requisição.');
        return data;
    } catch (error) {
        console.error('Erro de API:', error);
        alert(error.message);
        return null;
    }
}

// --- FUNÇÃO DE LÓGICA ---
function checkLogin() {
    // Se não houver 'user' na sessão, redireciona para o login
    if (!sessionStorage.getItem('user')) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// --- FUNÇÕES DE RENDERIZAÇÃO (usadas em várias páginas) ---
function renderizarListaTransacoes(lista, elementoId) {
    const containerLista = document.getElementById(elementoId);
    if (!containerLista) return;
    containerLista.innerHTML = '';
    if (lista.length === 0) {
        containerLista.innerHTML = `<div class="empty-state"><p>Nenhuma transação encontrada.</p></div>`;
        return;
    }
    lista.forEach(transacao => {
        const tipoClasse = transacao.tipo;
        const sinal = tipoClasse === 'receita' ? '+' : '-';
        const dataFormatada = new Date(transacao.data).toLocaleDateString('pt-BR');
        containerLista.innerHTML += `
            <div class="transaction-item" id="transacao-${transacao.id}">
                <div class="transaction-details">
                    <span class="transaction-icon ${tipoClasse}">${sinal}</span>
                    <div>
                        <p class="transaction-desc">${transacao.descricao}</p>
                        <span class="transaction-cat">${transacao.categoria} - ${dataFormatada}</span>
                    </div>
                </div>
                <div class="transaction-value-group">
                    <div class="transaction-value ${tipoClasse}">${sinal}R$ ${parseFloat(transacao.valor).toFixed(2)}</div>
                    <div class="transaction-actions">
                        <button class="action-icon edit" title="Editar" data-id="${transacao.id}">✏️</button>
                        <button class="action-icon delete" title="Excluir" data-id="${transacao.id}">🗑️</button>
                    </div>
                </div>
            </div>`;
    });
}


// --- LÓGICA ESPECÍFICA DE CADA PÁGINA ---

// PÁGINA DE LOGIN
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = loginForm.querySelector('#username').value;
        const password = loginForm.querySelector('#password').value;
        const user = await apiFetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (user) {
            sessionStorage.setItem('user', JSON.stringify(user));
            window.location.href = 'dashboard.html';
        }
    });
}

// PÁGINA DE REGISTRO
const registerForm = document.getElementById('register-form');
if (registerForm) {
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
                renderizarListaTransacoes(transacoes.slice(0, 3), 'recent-transactions-list');
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

        // Busca os dados e preenche o formulário
        apiFetch(`${API_URL}/transacoes/${transacaoId}`).then(transacao => {
            if (transacao) {
                editForm.querySelector('#transacao-id').value = transacao.id;
                editForm.querySelector('#descricao').value = transacao.descricao;
                editForm.querySelector('#valor').value = parseFloat(transacao.valor);
                editForm.querySelector('#categoria').value = transacao.categoria;
            }
        });

        // Adiciona o listener para o envio do formulário
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dadosAtualizados = {
                descricao: editForm.querySelector('#descricao').value,
                valor: editForm.querySelector('#valor').value,
                categoria: editForm.querySelector('#categoria').value
            };
            const resultado = await apiFetch(`${API_URL}/transacoes/${transacaoId}`, {
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
    if (checkLogin()) {
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
                resultDiv.innerHTML = "Erro na conversão.";
            }
        };

        amountInput.addEventListener('input', converterMoeda);
        fromCurrencySelect.addEventListener('change', converterMoeda);
        toCurrencySelect.addEventListener('change', converterMoeda);
        converterMoeda();
    }
}


// --- LISTENERS GLOBAIS ---
document.body.addEventListener('click', async function(event) {
    const editButton = event.target.closest('.edit');
    if (editButton) {
        window.location.href = `edit_transacao.html?id=${editButton.dataset.id}`;
    }

    const deleteButton = event.target.closest('.delete');
    if (deleteButton) {
        if (confirm('Tem certeza?')) {
            const sucesso = await apiFetch(`${API_URL}/transacoes/${deleteButton.dataset.id}`, { method: 'DELETE' });
            if (sucesso) document.getElementById(`transacao-${deleteButton.dataset.id}`).remove();
        }
    }
});
    
const logoutButton = document.getElementById('logout-button');
if (logoutButton) logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem('user');
    window.location.href = 'login.html';
});

const addReceitaBtn = document.querySelector('.action-btn.income-btn');
if (addReceitaBtn) addReceitaBtn.addEventListener('click', () => window.location.href = 'add_receita.html');

const addDespesaBtn = document.querySelector('.action-btn.expense-btn');
if (addDespesaBtn) addDespesaBtn.addEventListener('click', () => window.location.href = 'add_despesa.html');

const verTodasBtn = document.querySelector('.view-all');
if(verTodasBtn) verTodasBtn.addEventListener('click', () => window.location.href = 'transacoes.html');