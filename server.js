const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuração da Sessão
app.use(session({
    secret: 'chave-secreta-teologica',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Logado por 24h
}));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sVeF6b1MUrOS@ep-rapid-butterfly-amozujdf-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false }
});

// Inicialização do Banco
async function initDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                senha TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS registros (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER REFERENCES usuarios(id),
                tipo TEXT,
                titulo TEXT,
                subtitulo TEXT,
                conteudo TEXT,
                data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Banco PostgreSQL e tabelas Prontas!");
    } catch (err) { console.error("Erro ao iniciar banco:", err); }
}
initDb();

// --- ROTAS DE AUTENTICAÇÃO ---

app.post('/api/auth/cadastro', async (req, res) => {
    const { nome, email, senha } = req.body;
    try {
        const senhaHash = await bcrypt.hash(senha, 10);
        await pool.query('INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3)', [nome, email, senhaHash]);
        res.json({ status: "ok" });
    } catch (e) { res.status(400).json({ erro: "Email já cadastrado" }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, senha } = req.body;
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length > 0 && await bcrypt.compare(senha, result.rows[0].senha)) {
        req.session.userId = result.rows[0].id;
        req.session.userName = result.rows[0].nome;
        res.json({ status: "ok", nome: result.rows[0].nome });
    } else {
        res.status(401).json({ erro: "Credenciais inválidas" });
    }
});

app.get('/api/auth/checar', (req, res) => {
    if (req.session.userId) res.json({ logado: true, nome: req.session.userName });
    else res.json({ logado: false });
});

app.get('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ status: "ok" });
});

// --- ROTAS DE DADOS ---

app.get('/api/registros', async (req, res) => {
    if (!req.session.userId) return res.status(401).json([]);
    const result = await pool.query('SELECT * FROM registros WHERE usuario_id = $1 ORDER BY id DESC', [req.session.userId]);
    res.json(result.rows);
});

app.post('/api/salvar', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ erro: "Não logado" });
    const { id, tipo, titulo, subtitulo, conteudo } = req.body;
    try {
        if (id) {
            await pool.query('UPDATE registros SET tipo=$1, titulo=$2, subtitulo=$3, conteudo=$4 WHERE id=$5 AND usuario_id=$6', 
                [tipo, titulo, subtitulo, conteudo, id, req.session.userId]);
        } else {
            await pool.query('INSERT INTO registros (usuario_id, tipo, titulo, subtitulo, conteudo) VALUES ($1, $2, $3, $4, $5)', 
                [req.session.userId, tipo, titulo, subtitulo, conteudo]);
        }
        res.json({ status: "ok" });
    } catch (e) { res.status(500).json({ erro: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor em: http://localhost:${PORT}`));