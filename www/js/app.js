document.addEventListener('DOMContentLoaded', function() {

    // --- FUNÇÕES DE LÓGICA ---

    function atualizarDashboard() {
        const transacoes = JSON.parse(localStorage.getItem('transacoes')) || [];
        let totalReceitas = 0;
        let totalDespesas = 0;

        transacoes.forEach(transacao => {
            if (transacao.tipo === 'receita') totalReceitas += transacao.valor;
            else if (transacao.tipo === 'despesa') totalDespesas += transacao.valor;
        });

        const saldoFinal = totalReceitas - totalDespesas;

        document.getElementById('total-income').innerHTML = `R$ ${totalReceitas.toFixed(2)}`;
        document.getElementById('total-expense').innerHTML = `R$ ${totalDespesas.toFixed(2)}`;
        document.getElementById('total-balance').innerHTML = `R$ ${saldoFinal.toFixed(2)}`;

        // Mostra só as 3 últimas transações no dashboard
        renderizarListaTransacoes(transacoes.slice(-3), 'recent-transactions-list');
    }

    function carregarTodasTransacoes() {
        const transacoes = JSON.parse(localStorage.getItem('transacoes')) || [];
        renderizarListaTransacoes(transacoes, 'full-transactions-list');
    }

    function renderizarListaTransacoes(lista, elementoId) {
        const containerLista = document.getElementById(elementoId);
        if (!containerLista) return; // Sai da função se o elemento não existir na página
        
        containerLista.innerHTML = ''; 

        if (lista.length === 0) {
            containerLista.innerHTML = `<div class="empty-state"><p>Nenhuma transação encontrada.</p></div>`;
            return;
        }

        const transacoesOrdenadas = lista.slice().reverse();
        transacoesOrdenadas.forEach(transacao => {
            const tipoClasse = transacao.tipo;
            const sinal = tipoClasse === 'receita' ? '+' : '-';
            const itemTransacao = `
                <div class="transaction-item">
                    <div class="transaction-details">
                        <span class="transaction-icon ${tipoClasse}">${sinal}</span>
                        <div>
                            <p class="transaction-desc">${transacao.descricao}</p>
                            <span class="transaction-cat">${transacao.categoria} - ${transacao.data}</span>
                        </div>
                    </div>
                    <div class="transaction-value-group">
                         <div class="transaction-value ${tipoClasse}">
                            ${sinal}R$ ${transacao.valor.toFixed(2)}
                        </div>
                        <div class="transaction-actions">
                            <button class="action-icon edit" title="Editar" data-id="${transacao.id}">✏️</button>
                            <button class="action-icon delete" title="Excluir" data-id="${transacao.id}">🗑️</button>
                        </div>
                    </div>
                </div>`;
            containerLista.innerHTML += itemTransacao;
        });
    }
    
    // --- LÓGICAS DE PÁGINA E EVENTOS ---

    // Roda a função correta dependendo da página em que estamos
    if (document.getElementById('total-income')) {
        atualizarDashboard();
    } else if (document.getElementById('full-transactions-list')) {
        carregarTodasTransacoes();
    }
    
    // Lógica de Exclusão de Transação (CORRIGIDA)
    const listaCompleta = document.getElementById('full-transactions-list');
    if (listaCompleta) {
        listaCompleta.addEventListener('click', function(event) {
            // Usa .closest() para garantir que pegamos o botão, mesmo que o clique seja no ícone dentro dele
            const deleteButton = event.target.closest('.delete');
            if (deleteButton) {
                if (confirm('Tem certeza que deseja excluir esta transação?')) {
                    const transactionId = Number(deleteButton.dataset.id);
                    let transacoes = JSON.parse(localStorage.getItem('transacoes')) || [];
                    const transacoesAtualizadas = transacoes.filter(t => t.id !== transactionId);
                    localStorage.setItem('transacoes', JSON.stringify(transacoesAtualizadas));
                    carregarTodasTransacoes(); // Re-renderiza a lista na página atual
                }
            }
        });
    }

    // Lógica do Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            if (username === 'Aldo' && password === '123') window.location.href = 'dashboard.html';
            else alert('Usuário ou senha inválidos!');
        });
    }

    // Lógica do Logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            if (confirm("Tem certeza que deseja limpar todos os dados e sair?")) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
        });
    }

    // --- LÓGICAS DE NAVEGAÇÃO ---
    const addReceitaBtn = document.querySelector('.action-btn.income-btn');
    if (addReceitaBtn) addReceitaBtn.addEventListener('click', () => window.location.href = 'add_receita.html');

    const addDespesaBtn = document.querySelector('.action-btn.expense-btn');
    if (addDespesaBtn) addDespesaBtn.addEventListener('click', () => window.location.href = 'add_despesa.html');

    const converterBtn = document.querySelector('.action-btn.converter-btn');
    if (converterBtn) converterBtn.addEventListener('click', () => window.location.href = 'conversor.html');
    
    const verTodasBtn = document.querySelector('.view-all');
    if(verTodasBtn) verTodasBtn.addEventListener('click', () => window.location.href = 'transacoes.html');

    // --- LÓGICAS DE FORMULÁRIO ---
    function salvarTransacao(tipo) {
        const valor = document.getElementById('valor').value;
        const descricao = document.getElementById('descricao').value;
        const categoria = document.getElementById('categoria').value;
        
        if (!valor || !descricao || !categoria) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        const novaTransacao = {
            id: new Date().getTime(), tipo, valor: parseFloat(valor), descricao, categoria, data: new Date().toLocaleDateString('pt-BR')
        };
        let transacoes = JSON.parse(localStorage.getItem('transacoes')) || [];
        transacoes.push(novaTransacao);
        localStorage.setItem('transacoes', JSON.stringify(transacoes));
        alert(`Sua ${tipo} foi adicionada com sucesso!`);
        window.location.href = 'dashboard.html';
    }

    const receitaForm = document.getElementById('receita-form');
    if (receitaForm) receitaForm.addEventListener('submit', (e) => { e.preventDefault(); salvarTransacao('receita'); });

    const despesaForm = document.getElementById('despesa-form');
    if (despesaForm) despesaForm.addEventListener('submit', (e) => { e.preventDefault(); salvarTransacao('despesa'); });
    
    // --- LÓGICA DO CONVERSOR DE MOEDAS ---
    const conversorForm = document.getElementById('conversor-form');
    if (conversorForm) {
        const amountInput = document.getElementById('amount');
        const fromCurrencySelect = document.getElementById('from_currency');
        const toCurrencySelect = document.getElementById('to_currency');
        const resultDiv = document.getElementById('conversion-result');

        function converterMoeda() {
            const suaApiKey = '2461c334c732204935c6a7a1';
            const amount = amountInput.value;
            const fromCurrency = fromCurrencySelect.value;
            const toCurrency = toCurrencySelect.value;
            if (!amount) return;
            resultDiv.innerHTML = "Calculando...";
            const apiUrl = `https://v6.exchangerate-api.com/v6/${suaApiKey}/pair/${fromCurrency}/${toCurrency}/${amount}`;
            fetch(apiUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.result === 'success') {
                        const resultado = data.conversion_result.toFixed(2);
                        resultDiv.innerHTML = `${amount} ${fromCurrency} = ${resultado} ${toCurrency}`;
                    } else {
                        resultDiv.innerHTML = "Erro na conversão.";
                    }
                })
                .catch(error => {
                    console.error('Erro na requisição fetch:', error);
                    resultDiv.innerHTML = "Erro ao conectar à API.";
                });
        }
        amountInput.addEventListener('keyup', converterMoeda);
        fromCurrencySelect.addEventListener('change', converterMoeda);
        toCurrencySelect.addEventListener('change', converterMoeda);
        converterMoeda();
    }
});