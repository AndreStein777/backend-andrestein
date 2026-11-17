
const express = require('express');
const { DatabaseSync } = require('node:sqlite');

const app = express();

app.use(express.json());

// Conectar ao banco de dados
const db = new DatabaseSync('treinos.db');

// Criar tabela caso ela ainda não exista
db.exec(`
    CREATE TABLE IF NOT EXISTS treinos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        duracao INTEGER NOT NULL
    )
`);

// Função para validar os dados
function validarTreino(corpo) {
    if (
        typeof corpo.nome !== 'string' ||
        corpo.nome.trim() === ''
    ) {
        return 'O campo nome e obrigatorio e deve ser um texto.';
    }

    if (
        typeof corpo.duracao !== 'number' ||
        corpo.duracao <= 0
    ) {
        return 'O campo duracao e obrigatorio e deve ser um numero maior que zero.';
    }

    return null;
}

// ======================================
// EXERCÍCIO 1 - TOTAL DE TREINOS
// GET /treinos/total
// ======================================

app.get('/treinos/total', (req, res) => {
    const resultado = db.prepare(
        'SELECT COUNT(*) AS total FROM treinos'
    ).get();

    res.status(200).json(resultado);
});

// ======================================
// EXERCÍCIO 5 - RESUMO DOS TREINOS
// GET /treinos/resumo
// ======================================

app.get('/treinos/resumo', (req, res) => {
    const resultado = db.prepare(`
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(duracao), 0) AS minutos,
            COALESCE(AVG(duracao), 0) AS media
        FROM treinos
    `).get();

    res.status(200).json(resultado);
});

// ======================================
// GET /treinos - LISTAR TODOS
// EXERCÍCIOS 2, 3 E 4
// ======================================

app.get('/treinos', (req, res) => {
    let sql = 'SELECT * FROM treinos';
    const parametros = [];
    const condicoes = [];

    // Exercício 2 - Filtrar por duração
    if (req.query.minimo !== undefined) {
        const minimo = Number(req.query.minimo);

        if (!Number.isFinite(minimo)) {
            return res.status(400).json({
                erro: 'O parametro minimo deve ser um numero.'
            });
        }

        condicoes.push('duracao >= ?');
        parametros.push(minimo);
    }

    // Exercício 4 - Buscar por nome
    if (req.query.busca !== undefined) {
        if (typeof req.query.busca !== 'string') {
            return res.status(400).json({
                erro: 'O parametro busca deve ser um texto.'
            });
        }

        condicoes.push('nome LIKE ?');
        parametros.push(`%${req.query.busca}%`);
    }

    // Adicionar condições à consulta
    if (condicoes.length > 0) {
        sql += ' WHERE ' + condicoes.join(' AND ');
    }

    // Exercício 3 - Ordenar pela duração
    sql += ' ORDER BY duracao DESC';

    const treinos = db.prepare(sql).all(...parametros);

    res.status(200).json(treinos);
});

// ======================================
// POST /treinos - CRIAR TREINO
// ======================================

app.post('/treinos', (req, res) => {
    const erro = validarTreino(req.body);

    if (erro !== null) {
        return res.status(400).json({
            erro: erro
        });
    }

    const resultado = db.prepare(`
        INSERT INTO treinos (nome, duracao)
        VALUES (?, ?)
    `).run(
        req.body.nome,
        req.body.duracao
    );

    // Buscar o treino criado
    const treino = db.prepare(
        'SELECT * FROM treinos WHERE id = ?'
    ).get(Number(resultado.lastInsertRowid));

    res.status(201).json(treino);
});

// ======================================
// GET /treinos/:id - BUSCAR UM TREINO
// EXERCÍCIO 6 - VALIDAR ID
// ======================================

app.get('/treinos/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'O id deve ser um numero inteiro.'
        });
    }

    const treino = db.prepare(
        'SELECT * FROM treinos WHERE id = ?'
    ).get(id);

    if (treino === undefined) {
        return res.status(404).json({
            erro: 'Treino nao encontrado.'
        });
    }

    res.status(200).json(treino);
});

// ======================================
// PUT /treinos/:id - ATUALIZAR TREINO
// ======================================

app.put('/treinos/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'O id deve ser um numero inteiro.'
        });
    }

    // Verificar se o treino existe
    const treino = db.prepare(
        'SELECT * FROM treinos WHERE id = ?'
    ).get(id);

    if (treino === undefined) {
        return res.status(404).json({
            erro: 'Treino nao encontrado.'
        });
    }

    // Validar os novos dados
    const erro = validarTreino(req.body);

    if (erro !== null) {
        return res.status(400).json({
            erro: erro
        });
    }

    // Atualizar no banco
    db.prepare(`
        UPDATE treinos
        SET nome = ?, duracao = ?
        WHERE id = ?
    `).run(
        req.body.nome,
        req.body.duracao,
        id
    );

    // Buscar treino atualizado
    const atualizado = db.prepare(
        'SELECT * FROM treinos WHERE id = ?'
    ).get(id);

    res.status(200).json(atualizado);
});

// ======================================
// DELETE /treinos/:id - EXCLUIR TREINO
// ======================================

app.delete('/treinos/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: 'O id deve ser um numero inteiro.'
        });
    }

    // Verificar se existe
    const treino = db.prepare(
        'SELECT * FROM treinos WHERE id = ?'
    ).get(id);

    if (treino === undefined) {
        return res.status(404).json({
            erro: 'Treino nao encontrado.'
        });
    }

    // Excluir do banco
    db.prepare(
        'DELETE FROM treinos WHERE id = ?'
    ).run(id);

    res.status(204).end();
});

// ======================================
// INICIAR SERVIDOR
// ======================================

app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});
