const express = require('express');
const path = require('path');
const { Pool } = require('pg'); // Importa o driver do Postgres

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuração da conexão com o Neon.tech
// Na Render, usaremos uma variável de ambiente por segurança
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'SUA_URL_DO_NEON_AQUI',
  ssl: { rejectUnauthorized: false } // Necessário para conexões seguras na nuvem
});

// Criar a tabela no Postgres (SQL levemente diferente)
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS registros (
        id SERIAL PRIMARY KEY,
        tipo TEXT,
        titulo TEXT,
        subtitulo TEXT,
        conteudo TEXT,
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Banco PostgreSQL pronto!");
  } catch (err) {
    console.error("❌ Erro ao iniciar Postgres:", err.message);
  }
}
initDb();

// Rota para Buscar
app.get('/api/registros', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registros ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Rota para Salvar ou Editar
app.post('/api/salvar', async (req, res) => {
  const { id, tipo, titulo, subtitulo, conteudo } = req.body;
  try {
    if (id) {
      await pool.query(
        'UPDATE registros SET tipo=$1, titulo=$2, subtitulo=$3, conteudo=$4 WHERE id=$5',
        [tipo, titulo, subtitulo, conteudo, id]
      );
    } else {
      await pool.query(
        'INSERT INTO registros (tipo, titulo, subtitulo, conteudo) VALUES ($1, $2, $3, $4)',
        [tipo, titulo, subtitulo, conteudo]
      );
    }
    res.json({ status: "sucesso" });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor na porta ${PORT}`));