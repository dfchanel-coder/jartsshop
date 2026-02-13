const express = require('express');
const { Pool } = require('pg'); // Usamos PG en vez de MySQL
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Configuración de Sesión
app.use(session({
    secret: 'jarts_secret_key_2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

// --- CONEXIÓN BASE DE DATOS (POSTGRESQL) ---
// En local usará tu string, en Render usará la variable de entorno automática
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tu_password_local@localhost:5432/jarts_db',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// --- AUTO-CREACIÓN DE TABLAS (MÁGICO) ---
async function iniciarDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios_admin (
                id SERIAL PRIMARY KEY,
                usuario VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL
            );
            CREATE TABLE IF NOT EXISTS perfumes (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                precio DECIMAL(10, 2) NOT NULL,
                categoria VARCHAR(100) NOT NULL,
                imagen_url TEXT NOT NULL,
                descripcion TEXT,
                activo BOOLEAN DEFAULT true
            );
            CREATE TABLE IF NOT EXISTS ordenes (
                id SERIAL PRIMARY KEY,
                cliente_nombre VARCHAR(100),
                cliente_telefono VARCHAR(50),
                items_json TEXT, 
                total DECIMAL(10, 2),
                estado VARCHAR(50) DEFAULT 'Pendiente',
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('--- TABLAS VERIFICADAS/CREADAS ---');
    } catch (err) {
        console.error('Error creando tablas:', err);
    }
}
iniciarDB();

// --- MERCADO PAGO ---
const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || 'TU_ACCESS_TOKEN_AQUI' });

// --- RUTAS ---

// Setup Admin (Ejecutar una vez)
app.get('/setup-admin', async (req, res) => {
    try {
        const passHash = await bcrypt.hash('admin123', 10);
        await pool.query('INSERT INTO usuarios_admin (usuario, password) VALUES ($1, $2) ON CONFLICT DO NOTHING', ['admin', passHash]);
        res.send('Usuario admin creado/verificado');
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM usuarios_admin WHERE usuario = $1', [usuario]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });
        
        const valid = await bcrypt.compare(password, result.rows[0].password);
        if (valid) {
            req.session.userId = result.rows[0].id;
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Contraseña incorrecta' });
        }
    } catch (err) { res.status(500).json({ error: 'Error de servidor' }); }
});

app.get('/api/check-auth', (req, res) => {
    res.json({ authenticated: !!req.session.userId });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

const requireAuth = (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'No autorizado' });
    next();
};

// Productos
app.get('/api/perfumes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM perfumes ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/admin/productos', requireAuth, async (req, res) => {
    const { nombre, precio, categoria, imagen_url, descripcion } = req.body;
    try {
        await pool.query(
            'INSERT INTO perfumes (nombre, precio, categoria, imagen_url, descripcion) VALUES ($1, $2, $3, $4, $5)', 
            [nombre, precio, categoria, imagen_url, descripcion]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
});

// Órdenes
app.get('/api/admin/ordenes', requireAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ordenes ORDER BY fecha DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/admin/orden-estado', requireAuth, async (req, res) => {
    const { id, estado } = req.body;
    try {
        await pool.query('UPDATE ordenes SET estado = $1 WHERE id = $2', [estado, id]);
        res.json({ success: true });
    } catch (err) { res.status(500).send(err.message); }
});

// Checkout
app.post('/api/create_preference', async (req, res) => {
    const { items, comprador } = req.body;
    const total = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
    const itemsJson = JSON.stringify(items);
    
    try {
        const result = await pool.query(
            'INSERT INTO ordenes (cliente_nombre, cliente_telefono, items_json, total) VALUES ($1, $2, $3, $4) RETURNING id',
            [comprador.nombre, comprador.telefono, itemsJson, total]
        );
        const ordenId = result.rows[0].id;

        const preference = new Preference(client);
        const response = await preference.create({
            body: {
                items: items,
                external_reference: `${ordenId}`,
                back_urls: {
                    success: "https://jarts-shop.onrender.com", // OJO: Cambia esto por tu URL de Render cuando la tengas
                    failure: "https://jarts-shop.onrender.com",
                    pending: "https://jarts-shop.onrender.com"
                },
                auto_return: "approved",
            }
        });
        res.json({ id: response.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error procesando pago' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});