// --- Importação das bibliotecas ---
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken'); // Importado para gerenciar tokens

// --- Configurações Iniciais ---
const app = express();
const port = 3000;
const saltRounds = 10;
// ATENÇÃO: Troque este segredo por uma frase longa e segura em produção
const JWT_SECRET = 'seu-segredo-super-secreto-e-dificil-de-adivinhar';

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- Configuração da Conexão com o PostgreSQL ---
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'controlegastos_db',
    password: '123', // <-- CONFIRME SE SUA SENHA ESTÁ CORRETA AQUI
    port: 5432,
});

/**
 * --- Middleware de Autenticação ---
 * Esta função irá verificar o token JWT em cada requisição que precisar de proteção.
 * Ela é colocada antes da lógica da rota.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato esperado: "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ error: 'Acesso negado. Nenhum token fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Se o token expirou ou é inválido
            return res.status(403).json({ error: 'Token inválido ou expirado.' });
        }
        // Se o token for válido, salva os dados do usuário (payload) na requisição
        req.user = user;
        next(); // Continua para a execução da rota
    });
}


// --- Rota Segura para o Conversor de Moedas ---
app.get('/converter-moeda', async (req, res) => {
    const { from, to, amount } = req.query;
    if (!from || !to || !amount) return res.status(400).json({ error: 'Parâmetros ausentes.' });

    const suaApiKey = '2461c334c732204935c6a7a1';
    const apiUrl = `https://v6.exchangerate-api.com/v6/${suaApiKey}/pair/${from}/${to}/${amount}`;
    try {
        const apiResponse = await fetch(apiUrl);
        const data = await apiResponse.json();
        res.status(apiResponse.status).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao chamar a API de conversão.' });
    }
});

// --- Rotas de Autenticação ---
app.post('/registrar', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
    try {
        const password_hash = await bcrypt.hash(password, saltRounds);
        const { rows } = await pool.query('INSERT INTO usuarios (username, password_hash) VALUES ($1, $2) RETURNING id, username', [username, password_hash]);
        res.status(201).json(rows[0]);
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Este nome de usuário já está em uso.' });
        console.error("Erro no registro:", error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
    try {
        const { rows } = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });

        const user = rows[0];
        const senhaCorreta = await bcrypt.compare(password, user.password_hash);
        if (!senhaCorreta) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });

        // >>>>> PONTO CRÍTICO DA CORREÇÃO <<<<<
        // Gera o Token JWT com os dados do usuário que não pode ser adivinhado
        const accessToken = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' } // O token expira em 1 hora para segurança
        );

        // Envia o token de volta para o cliente junto com os outros dados
        res.status(200).json({
            id: user.id,
            username: user.username,
            token: accessToken // <-- O frontend precisa disso para funcionar!
        });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Rotas de Transações (CRUD) PROTEGIDAS ---

// Adicionamos o `authenticateToken` antes da lógica de cada rota de transação
app.get('/transacoes', authenticateToken, async (req, res) => {
    try {
        // Usa o `req.user.id` injetado pelo middleware para buscar apenas as transações do usuário logado
        const { rows } = await pool.query('SELECT * FROM transacoes WHERE usuario_id = $1 ORDER BY data DESC, id DESC', [req.user.id]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Erro ao buscar transações:", error);
        res.status(500).send('Erro interno do servidor');
    }
});

app.post('/transacoes', authenticateToken, async (req, res) => {
    const { descricao, valor, tipo, categoria } = req.body;
    if (!descricao || !valor || !tipo || !categoria) return res.status(400).send('Todos os campos são obrigatórios.');
    try {
        const { rows } = await pool.query(
            'INSERT INTO transacoes (descricao, valor, tipo, categoria, usuario_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [descricao, valor, tipo, categoria, req.user.id] // Adiciona o ID do usuário logado
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("Erro ao criar transação:", error);
        res.status(500).send('Erro interno do servidor');
    }
});

app.get('/transacoes/:id', authenticateToken, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM transacoes WHERE id = $1 AND usuario_id = $2', [req.params.id, req.user.id]);
        if (rows.length === 0) return res.status(404).send('Transação não encontrada ou não pertence a este usuário.');
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Erro ao buscar transação por ID:", error);
        res.status(500).send('Erro interno do servidor');
    }
});

app.put('/transacoes/:id', authenticateToken, async (req, res) => {
    const { descricao, valor, categoria } = req.body;
    if (!descricao || !valor || !categoria) return res.status(400).send('Campos obrigatórios ausentes.');
    try {
        const { rows } = await pool.query(
            'UPDATE transacoes SET descricao = $1, valor = $2, categoria = $3 WHERE id = $4 AND usuario_id = $5 RETURNING *',
            [descricao, valor, categoria, req.params.id, req.user.id]
        );
        if (rows.length === 0) return res.status(404).send('Transação não encontrada ou não pertence a este usuário.');
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Erro ao atualizar transação:", error);
        res.status(500).send('Erro interno do servidor');
    }
});

app.delete('/transacoes/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM transacoes WHERE id = $1 AND usuario_id = $2', [req.params.id, req.user.id]);
        if (result.rowCount === 0) return res.status(404).send('Transação não encontrada ou não pertence a este usuário.');
        res.status(204).send();
    } catch (error) {
        console.error("Erro ao deletar transação:", error);
        res.status(500).send('Erro interno do servidor');
    }
});


// --- Inicialização do Servidor ---
app.listen(port, () => {
    console.log(`Servidor da API rodando em http://localhost:${port}`);
});
