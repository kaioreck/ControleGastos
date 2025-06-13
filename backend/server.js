// --- Importação das bibliotecas ---
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Carrega as variáveis do arquivo .env

// --- Configurações Iniciais ---
const app = express();
const port = 3000;
const saltRounds = 10;
const JWT_SECRET = 'seu-segredo-super-secreto-e-dificil-de-adivinhar';

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO FINAL E DINÂMICA DA CONEXÃO ---
const isProduction = process.env.NODE_ENV === 'production';
let pool;

if (isProduction) {
    // Configuração para o NEON (Produção)
    console.log("Ambiente: Produção | Conectando ao Neon DB...");
    pool = new Pool({
        connectionString: process.env.DATABASE_URL_NEON,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    // Configuração para o PostgreSQL (Local)
    console.log("Ambiente: Desenvolvimento | Conectando ao PostgreSQL Local...");

    // ---- DEBUG: VAMOS VER O QUE ESTÁ DENTRO DAS VARIÁVEIS ----
    console.log('--- Valores do .env ---');
    console.log('DB_HOST:', process.env.DB_HOST, '| tipo:', typeof process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT, '| tipo:', typeof process.env.DB_PORT);
    console.log('DB_USER:', process.env.DB_USER, '| tipo:', typeof process.env.DB_USER);
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD, '| tipo:', typeof process.env.DB_PASSWORD);
    console.log('DB_DATABASE:', process.env.DB_DATABASE, '| tipo:', typeof process.env.DB_DATABASE);
    console.log('-----------------------');
    // ---- FIM DO DEBUG ----

    pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });
}
/**
 * --- Middleware de Autenticação ---
 * (O resto do seu código permanece exatamente igual)
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ error: 'Acesso negado. Nenhum token fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido ou expirado.' });
        }
        req.user = user;
        next();
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
// (Todas as suas rotas de /registrar, /login, /transacoes, etc. continuam aqui, sem alterações)
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

        const accessToken = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            id: user.id,
            username: user.username,
            token: accessToken
        });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Rotas de Transações (CRUD) PROTEGIDAS ---
app.get('/transacoes', authenticateToken, async (req, res) => {
    try {
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
            [descricao, valor, tipo, categoria, req.user.id]
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