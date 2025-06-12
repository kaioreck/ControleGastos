// =======================================================================
//  ARQUIVO APP.JS - VERSÃO HÍBRIDA COMPLETA (ONLINE/OFFLINE)
// =======================================================================

// --- Variáveis Globais ---
let db; // Segura a conexão com o banco de dados (apenas para o modo device)
let executionMode; // Guarda o modo de execução: 'device' ou 'browser'
const API_URL = 'http://localhost:3000'; // URL do seu backend

// --- Ponto de Entrada da Aplicação ---
document.addEventListener('deviceready', () => {
    console.log("Ambiente Cordova detectado. Modo: 'device'.");
    executionMode = 'device';
    inicializarBancoDeDadosReal();
}, false);

setTimeout(() => {
    if (!executionMode) {
        console.warn("Ambiente de Browser detectado. Modo: 'browser'.");
        executionMode = 'browser';
        // CORREÇÃO: Chama a inicialização correta para o browser.
        inicializarBancoDeDadosMock();
    }
}, 500);

// =======================================================================
//  INICIALIZAÇÃO DOS BANCOS DE DADOS
// =======================================================================

function inicializarBancoDeDadosReal() {
    console.log('Inicializando banco de dados SQLite REAL...');
    db = window.sqlitePlugin.openDatabase({ name: 'controlegastos.db', location: 'default' },
        (dbConn) => {
            db = dbConn;
            db.transaction((tx) => {
                tx.executeSql('CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password_hash TEXT)');
                tx.executeSql('CREATE TABLE IF NOT EXISTS transacoes (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, valor REAL, tipo TEXT, categoria TEXT, data TEXT, usuario_id INTEGER, sincronizado INTEGER DEFAULT 0)');
            }, (error) => console.error('Erro ao criar tabelas no banco REAL: ' + error.message),
               () => {
                console.log('Tabelas no banco REAL verificadas/criadas com sucesso!');
                iniciarApp();
            });
        },
        (error) => console.error('Erro ao abrir o banco de dados REAL: ' + error.message)
    );
}

function inicializarBancoDeDadosMock() {
    console.log("Inicializando MOCK DB com persistência (sessionStorage)...");
    let mockData = JSON.parse(sessionStorage.getItem('mockDb')) || { usuarios: [], transacoes: [], userIdCounter: 1, transacaoIdCounter: 1 };
    
    const persistData = () => sessionStorage.setItem('mockDb', JSON.stringify(mockData));

    db = {
        transaction: (callback) => {
            const tx = {
                executeSql: (sql, params, resultCallback, errorCallback) => {
                    console.log("MOCK DB:", sql, params);
                    try {
                        if (sql.startsWith('INSERT INTO usuarios')) {
                            const [username, password_hash] = params;
                            if (mockData.usuarios.some(u => u.username === username)) throw new Error('UNIQUE constraint failed');
                            const newUser = { id: mockData.userIdCounter++, username, password_hash };
                            mockData.usuarios.push(newUser);
                            persistData();
                            resultCallback && resultCallback(tx, { insertId: newUser.id, rowsAffected: 1 });
                        } else if (sql.startsWith('SELECT * FROM usuarios')) {
                            const [username] = params;
                            const user = mockData.usuarios.find(u => u.username === username);
                            const rows = user ? [user] : [];
                            resultCallback && resultCallback(tx, { rows: { item: (i) => rows[i], length: rows.length } });
                        } else if (sql.startsWith('INSERT INTO transacoes')) {
                            const [descricao, valor, tipo, categoria, data, usuario_id] = params;
                            const newTransacao = { id: mockData.transacaoIdCounter++, descricao, valor, tipo, categoria, data, usuario_id, sincronizado: 0 };
                            mockData.transacoes.push(newTransacao);
                            persistData();
                            resultCallback && resultCallback(tx, { insertId: newTransacao.id, rowsAffected: 1 });
                        } else if (sql.startsWith('SELECT * FROM transacoes WHERE id = ?')) {
                            const [id] = params;
                            const transacao = mockData.transacoes.find(t => t.id === parseInt(id));
                            const rows = transacao ? [transacao] : [];
                            resultCallback && resultCallback(tx, { rows: { item: (i) => rows[i], length: rows.length } });
                        } else if (sql.startsWith('SELECT * FROM transacoes')) {
                            const [usuario_id] = params;
                            const rows = mockData.transacoes.filter(t => t.usuario_id === usuario_id).sort((a, b) => new Date(b.data) - new Date(a.data));
                            resultCallback && resultCallback(tx, { rows: { item: (i) => rows[i], length: rows.length } });
                        } else if (sql.startsWith('UPDATE transacoes')) {
                            const [descricao, valor, categoria, id] = params;
                            const transacaoIndex = mockData.transacoes.findIndex(t => t.id === parseInt(id));
                            if (transacaoIndex > -1) {
                                mockData.transacoes[transacaoIndex] = { ...mockData.transacoes[transacaoIndex], descricao, valor, categoria };
                                persistData();
                                resultCallback && resultCallback(tx, { rowsAffected: 1 });
                            }
                        } else if (sql.startsWith('DELETE FROM transacoes')) {
                            const [id] = params;
                            const initialLength = mockData.transacoes.length;
                            mockData.transacoes = mockData.transacoes.filter(t => t.id !== parseInt(id));
                            persistData();
                            resultCallback && resultCallback(tx, { rowsAffected: initialLength - mockData.transacoes.length });
                        }
                    } catch (e) {
                        console.error("MOCK DB Error:", e.message);
                        errorCallback && errorCallback(tx, { message: e.message });
                    }
                }
            };
            callback(tx);
        }
    };
    console.log('Banco de dados MOCK pronto e persistente!', mockData);
    iniciarApp();
}

// =======================================================================
//  LÓGICA PRINCIPAL DA APLICAÇÃO
// =======================================================================

function iniciarApp() {
    console.log(`Iniciando aplicação em modo: ${executionMode}`);

    // --- PÁGINA DE REGISTRO ---
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = registerForm.querySelector('#username').value.trim();
            const password = registerForm.querySelector('#password').value;
            if (!username || !password) return alert('Usuário e senha são obrigatórios.');

            if (executionMode === 'device') {
                db.transaction(tx => {
                    tx.executeSql('INSERT INTO usuarios (username, password_hash) VALUES (?,?)', [username, password], () => {
                        alert('Usuário registrado localmente! Faça o login.');
                        window.location.href = 'login.html';
                    }, (tx, error) => {
                        if (error.message.includes('UNIQUE')) alert('Erro: Este nome de usuário já está em uso.');
                        else alert('Ocorreu um erro no registro: ' + error.message);
                    });
                });
            } else {
                apiFetch(`${API_URL}/registrar`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
                }).then(newUser => {
                    if (newUser) {
                        alert('Usuário registrado com sucesso! Faça o login.');
                        window.location.href = 'login.html';
                    }
                });
            }
        });
    }

    // --- PÁGINA DE LOGIN ---
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = loginForm.querySelector('#username').value.trim();
            const password = loginForm.querySelector('#password').value;

            if (executionMode === 'device') {
                db.transaction(tx => {
                    tx.executeSql('SELECT * FROM usuarios WHERE username = ?', [username], (tx, res) => {
                        if (res.rows.length > 0) {
                            const user = res.rows.item(0);
                            if (password === user.password_hash) {
                                sessionStorage.setItem('user', JSON.stringify({ id: user.id, username: user.username }));
                                localStorage.setItem('token', 'local-token');
                                window.location.href = 'dashboard.html';
                            } else {
                                document.getElementById('login-error').textContent = 'Usuário ou senha inválidos.';
                            }
                        } else {
                            document.getElementById('login-error').textContent = 'Usuário ou senha inválidos.';
                        }
                    });
                });
            } else {
                apiFetch(`${API_URL}/login`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
                }).then(data => {
                    if (data && data.token) {
                        sessionStorage.setItem('user', JSON.stringify({ id: data.id, username: data.username }));
                        localStorage.setItem('token', data.token);
                        window.location.href = 'dashboard.html';
                    } else {
                         document.getElementById('login-error').textContent = 'Usuário ou senha inválidos.';
                    }
                });
            }
        });
    }

    // --- PÁGINA DO DASHBOARD ---
    const dashboardElement = document.getElementById('total-balance');
    if (dashboardElement) {
        if (checkLogin()) { 
            const user = JSON.parse(sessionStorage.getItem('user'));
            const greetingElement = document.getElementById('greeting');
            if (greetingElement) greetingElement.textContent = `Olá, ${user.username}!`;

            if (executionMode === 'device') {
                db.transaction(tx => {
                    tx.executeSql('SELECT * FROM transacoes WHERE usuario_id = ? ORDER BY data DESC', [user.id], (tx, res) => {
                        let transacoes = [];
                        for (let i = 0; i < res.rows.length; i++) transacoes.push(res.rows.item(i));
                        atualizarDashboard(transacoes);
                    });
                });
            } else {
                apiFetch(`${API_URL}/transacoes`).then(transacoes => {
                    if (transacoes) {
                        atualizarDashboard(transacoes);
                    }
                });
            }
        }
    }
    
    // --- PÁGINA DE ADICIONAR TRANSAÇÃO ---
    const formDeAdicao = document.getElementById('receita-form') || document.getElementById('despesa-form');
    if (formDeAdicao) {
        if (checkLogin()) {
            formDeAdicao.addEventListener('submit', (e) => {
                e.preventDefault();
                const user = JSON.parse(sessionStorage.getItem('user'));
                const tipo = formDeAdicao.id === 'receita-form' ? 'receita' : 'despesa';
                const novaTransacao = {
                    descricao: formDeAdicao.querySelector('#descricao').value,
                    valor: formDeAdicao.querySelector('#valor').value,
                    categoria: formDeAdicao.querySelector('#categoria').value,
                    tipo: tipo,
                    data: new Date().toISOString(),
                    usuario_id: user.id
                };

                if (executionMode === 'device') {
                    const params = [novaTransacao.descricao, novaTransacao.valor, novaTransacao.tipo, novaTransacao.categoria, novaTransacao.data, novaTransacao.usuario_id];
                    db.transaction(tx => {
                        tx.executeSql('INSERT INTO transacoes (descricao, valor, tipo, categoria, data, usuario_id, sincronizado) VALUES (?,?,?,?,?,?,0)', params, 
                        () => {
                            alert(`Sua ${tipo} foi adicionada localmente!`);
                            window.location.href = 'dashboard.html';
                        }, 
                        (tx, error) => alert('Erro ao salvar transação: ' + error.message));
                    });
                } else {
                    apiFetch(`${API_URL}/transacoes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(novaTransacao)
                    }).then(transacaoAdicionada => {
                        if(transacaoAdicionada) {
                            alert(`Sua ${tipo} foi adicionada com sucesso!`);
                            window.location.href = 'dashboard.html';
                        }
                    });
                }
            });
        }
    }
    
    // --- PÁGINA DE EDIÇÃO ---
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        if(checkLogin()) {
            const urlParams = new URLSearchParams(window.location.search);
            const transacaoId = urlParams.get('id');

            if(executionMode === 'device') {
                db.transaction(tx => {
                    tx.executeSql('SELECT * FROM transacoes WHERE id = ?', [transacaoId], (tx, res) => {
                        if (res.rows.length > 0) preencherFormEdicao(res.rows.item(0));
                    });
                });
            } else {
                apiFetch(`${API_URL}/transacoes/${transacaoId}`).then(transacao => {
                    if (transacao) preencherFormEdicao(transacao);
                });
            }

            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const dadosAtualizados = {
                    descricao: editForm.querySelector('#descricao').value,
                    valor: editForm.querySelector('#valor').value,
                    categoria: editForm.querySelector('#categoria').value
                };

                if(executionMode === 'device') {
                    const params = [dadosAtualizados.descricao, dadosAtualizados.valor, dadosAtualizados.categoria, transacaoId];
                    db.transaction(tx => {
                        tx.executeSql('UPDATE transacoes SET descricao = ?, valor = ?, categoria = ? WHERE id = ?', params, 
                        () => {
                            alert('Transação atualizada localmente!');
                            window.location.href = 'dashboard.html';
                        }, (tx, error) => alert('Erro ao atualizar: ' + error.message));
                    });
                } else {
                    apiFetch(`${API_URL}/transacoes/${transacaoId}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosAtualizados)
                    }).then(resultado => {
                        if(resultado) {
                            alert('Transação atualizada com sucesso!');
                            window.location.href = 'dashboard.html';
                        }
                    });
                }
            });
        }
    }

    // --- PÁGINA DO CONVERSOR ---
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
            if (!amount) {
                resultDiv.innerHTML = "Digite um valor para converter.";
                return;
            }

            resultDiv.innerHTML = "Calculando...";
            const data = await apiFetch(`${API_URL}/converter-moeda?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`);

            if (data && data.result === 'success') {
                const valorConvertidoFormatado = formatarMoedaBRL(data.conversion_result);
                resultDiv.innerHTML = `${formatarMoedaBRL(amount)} ${fromCurrency} = ${valorConvertidoFormatado} ${toCurrency}`;
            } else {
                resultDiv.innerHTML = (data && data.error) ? data.error : "Erro na conversão.";
            }
        };

        amountInput.addEventListener('input', converterMoeda);
        fromCurrencySelect.addEventListener('change', converterMoeda);
        toCurrencySelect.addEventListener('change', converterMoeda);
        converterMoeda(); 
    }

    // --- PÁGINA DE TODAS AS TRANSAÇÕES ---
    const fullTransactionsList = document.getElementById('full-transactions-list');
    if (fullTransactionsList) {
        if (checkLogin()) {
            const user = JSON.parse(sessionStorage.getItem('user'));
            if(executionMode === 'device') {
                db.transaction(tx => {
                    tx.executeSql('SELECT * FROM transacoes WHERE usuario_id = ? ORDER BY data DESC', [user.id], (tx, res) => {
                        let transacoes = [];
                        for (let i = 0; i < res.rows.length; i++) transacoes.push(res.rows.item(i));
                        renderizarListaTransacoes(transacoes, 'full-transactions-list');
                    });
                });
            } else {
                apiFetch(`${API_URL}/transacoes`).then(transacoes => {
                    if (transacoes) renderizarListaTransacoes(transacoes, 'full-transactions-list');
                });
            }
        }
    }

    // --- LISTENERS GLOBAIS DE CLIQUES ---
    document.body.addEventListener('click', function(event) {
        const editButton = event.target.closest('.action-icon.edit');
        if (editButton) {
            window.location.href = `edit_transacao.html?id=${editButton.dataset.id}`;
        }

        const deleteButton = event.target.closest('.action-icon.delete');
        if (deleteButton) {
            if (confirm('Tem certeza que deseja excluir esta transação?')) {
                const id = deleteButton.dataset.id;
                
                if(executionMode === 'device') {
                    db.transaction(tx => {
                        tx.executeSql('DELETE FROM transacoes WHERE id = ?', [id], () => {
                            recarregarDashboardAposMudanca();
                        }, (tx, error) => alert('Erro ao excluir: ' + error.message));
                    });
                } else {
                    apiFetch(`${API_URL}/transacoes/${id}`, { method: 'DELETE' }).then(sucesso => {
                        if(sucesso) recarregarDashboardAposMudanca();
                    });
                }
            }
        }
    });
    
    // --- DEMAIS LISTENERS ---
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
}

// =======================================================================
//  FUNÇÕES AUXILIARES
// =======================================================================

function atualizarDashboard(transacoes) {
    const dashboardElement = document.getElementById('total-balance');
    if (!dashboardElement) return;
    let totalReceitas = 0, totalDespesas = 0;
    transacoes.forEach(t => {
        const valor = parseFloat(t.valor);
        t.tipo === 'receita' ? totalReceitas += valor : totalDespesas += valor;
    });
    const saldoFinal = totalReceitas - totalDespesas;
    document.getElementById('total-income').innerHTML = `R$ ${formatarMoedaBRL(totalReceitas)}`;
    document.getElementById('total-expense').innerHTML = `R$ ${formatarMoedaBRL(totalDespesas)}`;
    dashboardElement.innerHTML = `R$ ${formatarMoedaBRL(saldoFinal)}`;
    renderizarListaTransacoes(transacoes.slice(0, 5), 'recent-transactions-list');
}

function checkLogin() {
    if (!sessionStorage.getItem('user') || !localStorage.getItem('token')) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function logout() {
    sessionStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

function formatarMoedaBRL(valor) {
    return parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderizarListaTransacoes(lista, elementoId) {
    const containerLista = document.getElementById(elementoId);
    if (!containerLista) return;
    containerLista.innerHTML = '';
    if (!lista || lista.length === 0) {
        containerLista.innerHTML = `<div class="empty-state"><p>Nenhuma transação encontrada.</p></div>`;
        return;
    }
    lista.forEach(transacao => {
        const tipoClasse = transacao.tipo;
        const sinal = tipoClasse === 'receita' ? '+' : '-';
        const dataFormatada = new Date(transacao.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const valorFormatado = formatarMoedaBRL(transacao.valor);
        containerLista.innerHTML += `
            <div class="transaction-item" id="transacao-local-${transacao.id}">
                <div class="transaction-details">
                    <span class="transaction-icon ${tipoClasse === 'receita' ? 'income' : 'expense'}">${sinal}</span>
                    <div>
                        <p class="transaction-desc">${transacao.descricao}</p>
                        <span class="transaction-cat">${transacao.categoria} - ${dataFormatada}</span>
                    </div>
                </div>
                <div class="transaction-value-group">
                    <div class="transaction-value ${tipoClasse === 'receita' ? 'income' : 'expense'}">${sinal}R$ ${valorFormatado}</div>
                    <div class="transaction-actions">
                        <button class="action-icon edit" title="Editar" data-id="${transacao.id}">✏️</button>
                        <button class="action-icon delete" title="Excluir" data-id="${transacao.id}">🗑️</button>
                    </div>
                </div>
            </div>`;
    });
}

function preencherFormEdicao(transacao) {
    const editForm = document.getElementById('edit-form');
    editForm.querySelector('#transacao-id').value = transacao.id;
    editForm.querySelector('#descricao').value = transacao.descricao;
    editForm.querySelector('#valor').value = parseFloat(transacao.valor).toFixed(2);
    editForm.querySelector('#categoria').value = transacao.categoria;
}

function recarregarDashboardAposMudanca() {
    // Atualiza a visualização após uma exclusão
    const user = JSON.parse(sessionStorage.getItem('user'));
    // Lógica para recarregar os dados do dashboard ou da lista completa
    if (document.getElementById('total-balance')) { // Se está no dashboard
        if(executionMode === 'device') {
            db.transaction(tx => {
                tx.executeSql('SELECT * FROM transacoes WHERE usuario_id = ? ORDER BY data DESC', [user.id], (tx,res) => {
                    let transacoes = [];
                    for(let i=0; i<res.rows.length; i++) transacoes.push(res.rows.item(i));
                    atualizarDashboard(transacoes);
                });
             });
        } else {
            apiFetch(`${API_URL}/transacoes`).then(transacoes => atualizarDashboard(transacoes));
        }
    } else { // Se está em outra página (ex: todas as transações)
        window.location.reload();
    }
}

async function apiFetch(url, options = {}) {
    try {
        const token = localStorage.getItem('token');
        if (token && token !== 'local-token') {
            if (!options.headers) options.headers = {};
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(url, options);
        if (response.status === 401 || response.status === 403) {
            logout(); return null;
        }
        if (response.status === 204) return true;
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Ocorreu um erro na requisição.');
        return data;
    } catch (error) {
        console.error('Erro de API:', error);
        if (error.message.includes('Failed to fetch')) {
            alert("Não foi possível conectar ao servidor. Verifique sua conexão e se o backend está rodando.");
        } else {
            alert("Erro: " + error.message);
        }
        return null;
    }
}
