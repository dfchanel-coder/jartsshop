const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

app.use(session({
    secret: 'jarts_secret_key_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function iniciarDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios_admin (id SERIAL PRIMARY KEY, usuario VARCHAR(50) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL);
            CREATE TABLE IF NOT EXISTS perfumes (id SERIAL PRIMARY KEY, nombre VARCHAR(255) NOT NULL, precio DECIMAL(10, 2) NOT NULL, categoria VARCHAR(100) NOT NULL, imagen_url TEXT NOT NULL, descripcion TEXT, activo BOOLEAN DEFAULT true);
            CREATE TABLE IF NOT EXISTS ordenes (id SERIAL PRIMARY KEY, cliente_nombre VARCHAR(100), cliente_telefono VARCHAR(50), cliente_direccion TEXT, metodo_pago VARCHAR(50), items_json TEXT, total DECIMAL(10, 2), estado VARCHAR(50) DEFAULT 'Pendiente', fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS resenas (id SERIAL PRIMARY KEY, perfume_id INT NOT NULL, nombre VARCHAR(100) NOT NULL, estrellas INT NOT NULL CHECK (estrellas >= 1 AND estrellas <= 5), comentario TEXT, fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        `);
        console.log('--- BASE DE DATOS OK ---');
    } catch (err) { console.error('Error DB:', err); }
}
iniciarDB();

let client;
try { client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || 'DUMMY_TOKEN' }); } 
catch (e) { console.log('Esperando MP...'); }

const requireAuth = (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'No autorizado' });
    next();
};

// --- PÚBLICO: PRODUCTOS Y RESEÑAS ---
app.get('/api/perfumes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM perfumes ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/perfumes/:id/resenas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM resenas WHERE perfume_id = $1 ORDER BY fecha DESC', [req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/perfumes/:id/resenas', async (req, res) => {
    const { nombre, estrellas, comentario } = req.body;
    try {
        await pool.query('INSERT INTO resenas (perfume_id, nombre, estrellas, comentario) VALUES ($1, $2, $3, $4)', [req.params.id, nombre, estrellas, comentario]);
        res.json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
});

// --- ADMIN: LOGIN Y SETUP ---
app.post('/api/login', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM usuarios_admin WHERE usuario = $1', [req.body.usuario]);
        if (result.rows.length === 0 || !(await bcrypt.compare(req.body.password, result.rows[0].password))) return res.status(401).json({ error: 'Credenciales inválidas' });
        req.session.userId = result.rows[0].id; res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Error interno' }); }
});

app.get('/api/check-auth', (req, res) => res.json({ authenticated: !!req.session.userId }));
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/setup-admin', async (req, res) => {
    try {
        const hash = await bcrypt.hash('admin123', 10);
        await pool.query('INSERT INTO usuarios_admin (usuario, password) VALUES ($1, $2) ON CONFLICT DO NOTHING', ['admin', hash]);
        res.send('Admin OK: admin / admin123');
    } catch (err) { res.status(500).send(err.message); }
});

// --- ADMIN: CRUD PRODUCTOS ---
app.post('/api/admin/productos', requireAuth, async (req, res) => {
    const { nombre, precio, categoria, imagen_url, descripcion } = req.body;
    try { await pool.query('INSERT INTO perfumes (nombre, precio, categoria, imagen_url, descripcion) VALUES ($1, $2, $3, $4, $5)', [nombre, precio, categoria, imagen_url, descripcion]); res.json({ success: true }); } catch (err) { res.status(500).send(err.message); }
});
app.put('/api/admin/productos/:id', requireAuth, async (req, res) => {
    const { nombre, precio, categoria, imagen_url, descripcion } = req.body;
    try { await pool.query('UPDATE perfumes SET nombre=$1, precio=$2, categoria=$3, imagen_url=$4, descripcion=$5 WHERE id=$6', [nombre, precio, categoria, imagen_url, descripcion, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).send(err.message); }
});
app.delete('/api/admin/productos/:id', requireAuth, async (req, res) => {
    try { await pool.query('DELETE FROM perfumes WHERE id=$1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).send(err.message); }
});

// --- ADMIN: ÓRDENES ---
app.get('/api/admin/ordenes', requireAuth, async (req, res) => {
    try { const result = await pool.query('SELECT * FROM ordenes ORDER BY fecha DESC'); res.json(result.rows); } catch (err) { res.status(500).send(err.message); }
});
app.post('/api/admin/orden-estado', requireAuth, async (req, res) => {
    try { await pool.query('UPDATE ordenes SET estado = $1 WHERE id = $2', [req.body.estado, req.body.id]); res.json({ success: true }); } catch (err) { res.status(500).send(err.message); }
});

// --- ADMIN: MODERAR RESEÑAS ---
app.get('/api/admin/resenas', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT r.*, p.nombre AS perfume_nombre FROM resenas r JOIN perfumes p ON r.perfume_id = p.id ORDER BY r.fecha DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
});
app.delete('/api/admin/resenas/:id', requireAuth, async (req, res) => {
    try { await pool.query('DELETE FROM resenas WHERE id=$1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).send(err.message); }
});

// --- CHECKOUT ---
app.post('/api/nueva-orden', async (req, res) => {
    const { items, comprador, metodo_pago } = req.body;
    const total = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
    const itemsJson = JSON.stringify(items);
    
    try {
        const result = await pool.query(
            'INSERT INTO ordenes (cliente_nombre, cliente_telefono, cliente_direccion, metodo_pago, items_json, total) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [comprador.nombre, comprador.telefono, comprador.direccion, metodo_pago, itemsJson, total]
        );
        const ordenId = result.rows[0].id;

        if (metodo_pago === 'transferencia') return res.json({ type: 'transfer', id: ordenId });

        if (metodo_pago === 'mercadopago') {
            const preference = new Preference(client);
            const response = await preference.create({
                body: { items, external_reference: `${ordenId}`, back_urls: { success: "https://jarts-shop.onrender.com", failure: "https://jarts-shop.onrender.com", pending: "https://jarts-shop.onrender.com" }, auto_return: "approved" }
            });
            return res.json({ type: 'mp', id: response.id });
        }
    } catch (error) { res.status(500).json({ error: 'Error procesando orden' }); }
});

// --- RUTA DE EMERGENCIA ---
app.get('/fix-db', async (req, res) => {
    try {
        await pool.query('ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS cliente_direccion TEXT');
        await pool.query('ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50)');
        await pool.query('CREATE TABLE IF NOT EXISTS resenas (id SERIAL PRIMARY KEY, perfume_id INT NOT NULL, nombre VARCHAR(100) NOT NULL, estrellas INT NOT NULL CHECK (estrellas >= 1 AND estrellas <= 5), comentario TEXT, fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
        res.send('✅ Base de datos actualizada.');
    } catch (err) { res.status(500).send('❌ Error: ' + err.message); }
});

app.listen(process.env.PORT || 3000, () => console.log('Servidor OK'));