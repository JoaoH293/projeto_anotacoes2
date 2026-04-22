const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db;

// Função de inicialização
(async () => {
    try {
        // Define o caminho do banco de dados na mesma pasta do servidor
        const dbPath = path.resolve(__dirname, 'database.db');
        console.log("--- DEBUG ---");
        console.log("Pasta do projeto:", __dirname);
        console.log("Arquivo de banco:", dbPath);

        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        await db.exec(`
            CREATE TABLE IF NOT EXISTS registros (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo TEXT,
                titulo TEXT,
                subtitulo TEXT,
                conteudo TEXT,
                data DATETIME DEFAULT (datetime('now', 'localtime'))
            )
        `);
        console.log("✅ BANCO DE DADOS: PRONTO");
        console.log("--- SERVIDOR RODANDO EM http://localhost:3000 ---");
    } catch (err) {
        console.log("❌ ERRO AO INICIAR:", err.message);
    }
})();

// Rotas
app.get('/api/registros', async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM registros ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.log("❌ Erro na Busca:", err.message);
        res.status(500).json({ erro: err.message });
    }
});

app.post('/api/salvar', async (req, res) => {
    try {
        const { id, tipo, titulo, subtitulo, conteudo } = req.body;

        if (id) {
            // Se já existe um ID, atualizamos o registro existente
            await db.run(
                'UPDATE registros SET tipo = ?, titulo = ?, subtitulo = ?, conteudo = ? WHERE id = ?',
                [tipo, titulo, subtitulo, conteudo, id]
            );
            console.log(`✅ Registro ${id} atualizado.`);
        } else {
            // Se não tem ID, criamos um novo
            await db.run(
                'INSERT INTO registros (tipo, titulo, subtitulo, conteudo) VALUES (?, ?, ?, ?)',
                [tipo, titulo, subtitulo, conteudo]
            );
            console.log(`✅ Novo registro criado.`);
        }
        
        res.status(200).json({ status: "sucesso" });
    } catch (err) {
        console.error("Erro no servidor:", err.message);
        res.status(500).json({ erro: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));