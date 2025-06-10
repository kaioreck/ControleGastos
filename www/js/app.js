document.addEventListener('DOMContentLoaded', async function() {

    const API_URL = 'http://localhost:3000';

    // --- FUNÇÕES DE API ---
    async function buscarTransacoes() { try { const r = await fetch(`${API_URL}/transacoes`); if (!r.ok) throw new Error('E'); return await r.json(); } catch (e) { console.error("Erro:", e); return []; } }
    async function buscarTransacaoPorId(id) { try { const r = await fetch(`${API_URL}/transacoes/${id}`); if (!r.ok) throw new Error('E'); return await r.json(); } catch (e) { console.error("Erro:", e); return null; } }
    async function adicionarTransacao(transacao) { try { const r = await fetch(`${API_URL}/transacoes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(transacao) }); if (!r.ok) throw new Error('E'); return await r.json(); } catch (e) { console.error("Erro:", e); return null; } }
    async function atualizarTransacao(id, transacao) { try { const r = await fetch(`${API_URL}/transacoes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(transacao) }); if (!r.ok) throw new Error('E'); return await r.json(); } catch (e) { console.error("Erro:", e); return null; } }
    async function excluirTransacao(id) { try { const r = await fetch(`${API_URL}/transacoes/${id}`, { method: 'DELETE' }); if (!r.ok) throw new Error('E'); return true; } catch (e) { console.error("Erro:", e); return false; } }

    // --- FUNÇÕES DE RENDERIZAÇÃO E UI ---
    async function atualizarDashboard() {
        const user = JSON.parse(sessionStorage.getItem('user'));
        if (user && user.username) {
            const greetingElement = document.getElementById('greeting');
            if(greetingElement) greetingElement.textContent = `Olá, ${user.username}!`;
        }
        const transacoes = await buscarTransacoes();
        let totalReceitas = 0, totalDespesas = 0;
        transacoes.forEach(t => {
            const valor = parseFloat(t.valor);
            if (t.tipo === 'receita') {
                totalReceitas += valor;
            } else if (t.tipo === 'despesa') {
                totalDespesas += valor;
            }
        });
        const saldoFinal = totalReceitas - totalDespesas;
        document.getElementById('total-income').innerHTML = `R$ ${totalReceitas.toFixed(2)}`;
        document.getElementById('total-expense').innerHTML = `R$ ${totalDespesas.toFixed(2)}`;
        document.getElementById('total-balance').innerHTML = `R$ ${saldoFinal.toFixed(2)}`;
        renderizarListaTransacoes(transacoes.slice(0, 3), 'recent-transactions-list');
    }

    async function carregarTodasTransacoes() {
        const transacoes = await buscarTransacoes();
        renderizarListaTransacoes(transacoes, 'full-transactions-list');
    }

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
            const itemTransacao = `<div class="transaction-item" id="transacao-${transacao.id}"><div class="transaction-details"><span class="transaction-icon ${tipoClasse}">${sinal}</span><div><p class="transaction-desc">${transacao.descricao}</p><span class="transaction-cat">${transacao.categoria} - ${dataFormatada}</span></div></div><div class="transaction-value-group"><div class="transaction-value ${tipoClasse}">${sinal}R$ ${parseFloat(transacao.valor).toFixed(2)}</div><div class="transaction-actions"><button class="action-icon edit" title="Editar" data-id="${transacao.id}">✏️</button><button class="action-icon delete" title="Excluir" data-id="${transacao.id}">🗑️</button></div></div></div>`;
            containerLista.innerHTML += itemTransacao;
        });
    }

    // --- LÓGICA DE PÁGINAS E EVENTOS ---
    const paginaAtual = window.location.pathname.split('/').pop();

    function checkLogin() {
        if (!sessionStorage.getItem('user')) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
    
    async function handleFormSubmit(event, tipo) {
        event.preventDefault();
        const form = event.target;
        const valor = form.querySelector('#valor').value;
        const descricao = form.querySelector('#descricao').value;
        const categoria = form.querySelector('#categoria').value;
        if (!valor || !descricao || !categoria) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        const novaTransacao = { descricao, valor: parseFloat(valor), tipo, categoria };
        const transacaoAdicionada = await adicionarTransacao(novaTransacao);
        if (transacaoAdicionada) {
            alert(`Sua ${tipo} foi adicionada com sucesso!`);
            window.location.href = 'dashboard.html';
        } else {
            alert('Falha ao adicionar a transação.');
        }
    }

    // Roteador de Lógica por Página
    if (paginaAtual === 'dashboard.html' || paginaAtual === '') {
        if (checkLogin()) atualizarDashboard();
    } else if (paginaAtual === 'login.html' || paginaAtual === 'index.html') {
        const loginForm = document.getElementById('login-form');
        if(loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = loginForm.querySelector('#username').value;
                const password = loginForm.querySelector('#password').value;
                try {
                    const response = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Erro ao fazer login.');
                    sessionStorage.setItem('user', JSON.stringify(data));
                    window.location.href = 'dashboard.html';
                } catch (error) {
                    alert(error.message);
                }
            });
        }
    } else if (paginaAtual === 'registrar.html') {
        const registerForm = document.getElementById('register-form');
        if(registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = registerForm.querySelector('#username').value;
                const password = registerForm.querySelector('#password').value;
                try {
                    const response = await fetch(`${API_URL}/registrar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || 'Erro ao registrar.');
                    alert('Usuário registrado com sucesso! Faça o login para continuar.');
                    window.location.href = 'login.html';
                } catch (error) {
                    alert(error.message);
                }
            });
        }
    } else if (paginaAtual === 'transacoes.html') {
        if (checkLogin()) carregarTodasTransacoes();
    } else if (paginaAtual === 'edit_transacao.html') {
        if (checkLogin()) {
            const form = document.getElementById('edit-form');
            const urlParams = new URLSearchParams(window.location.search);
            const transacaoId = urlParams.get('id');
            async function carregarDadosDeEdicao() {
                const transacao = await buscarTransacaoPorId(transacaoId);
                if (transacao) {
                    form.querySelector('#transacao-id').value = transacao.id;
                    form.querySelector('#descricao').value = transacao.descricao;
                    form.querySelector('#valor').value = parseFloat(transacao.valor);
                    form.querySelector('#categoria').value = transacao.categoria;
                }
            }
            carregarDadosDeEdicao();
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const dadosAtualizados = { descricao: form.querySelector('#descricao').value, valor: form.querySelector('#valor').value, categoria: form.querySelector('#categoria').value };
                const resultado = await atualizarTransacao(transacaoId, dadosAtualizados);
                if (resultado) {
                    alert('Transação atualizada com sucesso!');
                    window.location.href = 'dashboard.html';
                } else {
                    alert('Falha ao atualizar a transação.');
                }
            });
        }
    } else if (paginaAtual === 'add_receita.html') {
        if (checkLogin()) {
            document.getElementById('receita-form').addEventListener('submit', (e) => handleFormSubmit(e, 'receita'));
        }
    } else if (paginaAtual === 'add_despesa.html') {
        if (checkLogin()) {
            document.getElementById('despesa-form').addEventListener('submit', (e) => handleFormSubmit(e, 'despesa'));
        }
    }

    // Listener global para os botões nas listas de transação
    document.body.addEventListener('click', async function(event) {
        const target = event.target;
        if (target.closest('.delete')) {
            const transactionId = target.closest('.delete').dataset.id;
            if (confirm('Tem certeza que deseja excluir esta transação?')) {
                const sucesso = await excluirTransacao(transactionId);
                if (sucesso) {
                    document.getElementById(`transacao-${transactionId}`).remove();
                    if(document.getElementById('total-income')) atualizarDashboard();
                } else {
                    alert('Não foi possível excluir a transação.');
                }
            }
        }
        if (target.closest('.edit')) {
            const transactionId = target.closest('.edit').dataset.id;
            window.location.href = `edit_transacao.html?id=${transactionId}`;
        }
    });

    // --- NAVEGAÇÃO PRINCIPAL (BOTÕES DO DASHBOARD) ---
    const addReceitaBtn = document.querySelector('.action-btn.income-btn');
    if (addReceitaBtn) addReceitaBtn.addEventListener('click', () => window.location.href = 'add_receita.html');

    const addDespesaBtn = document.querySelector('.action-btn.expense-btn');
    if (addDespesaBtn) addDespesaBtn.addEventListener('click', () => window.location.href = 'add_despesa.html');

    const converterBtn = document.querySelector('.action-btn.converter-btn');
    if (converterBtn) converterBtn.addEventListener('click', () => window.location.href = 'conversor.html');
    
    const verTodasBtn = document.querySelector('.view-all');
    if(verTodasBtn) verTodasBtn.addEventListener('click', () => window.location.href = 'transacoes.html');
    
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            sessionStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }
});