const express = require('express');
const mysql = require('mysql2');
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
    cookie: { secure: false } // Pon true si usas HTTPS en producción
}));

// --- CONFIGURACIÓN BASE DE DATOS ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',       // <--- TU USUARIO SQL
    password: '',       // <--- TU CONTRASEÑA SQL
    database: 'jarts_db'
});

db.connect(err => {
    if (err) console.error('Error conectando a BD:', err);
    else console.log('Conectado a MySQL');
});

// --- CONFIGURACIÓN MERCADO PAGO ---
// Reemplaza con tu ACCESS_TOKEN de producción o prueba
const client = new MercadoPagoConfig({ accessToken: 'TU_ACCESS_TOKEN_AQUI' });

// --- RUTAS DE LOGIN Y SEGURIDAD ---

// Crear admin inicial (Ejecutar una vez: http://localhost:3000/setup-admin)
app.get('/setup-admin', async (req, res) => {
    const passHash = await bcrypt.hash('admin123', 10);
    db.query('INSERT IGNORE INTO usuarios_admin (usuario, password) VALUES (?, ?)', 
    ['admin', passHash], (err) => {
        if(err) return res.send(err);
        res.send('Usuario admin creado: admin / admin123');
    });
});

app.post('/api/login', (req, res) => {
    const { usuario, password } = req.body;
    db.query('SELECT * FROM usuarios_admin WHERE usuario = ?', [usuario], async (err, results) => {
        if (results.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });
        
        const valid = await bcrypt.compare(password, results[0].password);
        if (valid) {
            req.session.userId = results[0].id;
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Contraseña incorrecta' });
        }
    });
});

app.get('/api/check-auth', (req, res) => {
    res.json({ authenticated: !!req.session.userId });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Middleware de protección
const requireAuth = (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'No autorizado' });
    next();
};

// --- RUTAS DE PRODUCTOS ---
app.get('/api/perfumes', (req, res) => {
    db.query('SELECT * FROM perfumes ORDER BY id DESC', (err, results) => {
        res.json(results);
    });
});

app.post('/api/admin/productos', requireAuth, (req, res) => {
    const { nombre, precio, categoria, imagen_url, descripcion } = req.body;
    const sql = 'INSERT INTO perfumes (nombre, precio, categoria, imagen_url, descripcion) VALUES (?,?,?,?,?)';
    db.query(sql, [nombre, precio, categoria, imagen_url, descripcion], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

// --- RUTAS DE ÓRDENES ---
app.get('/api/admin/ordenes', requireAuth, (req, res) => {
    db.query('SELECT * FROM ordenes ORDER BY fecha DESC', (err, results) => {
        res.json(results);
    });
});

app.post('/api/admin/orden-estado', requireAuth, (req, res) => {
    const { id, estado } = req.body;
    db.query('UPDATE ordenes SET estado = ? WHERE id = ?', [estado, id], (err) => {
        if (err) return res.status(500).send(err);
        res.json({ success: true });
    });
});

// --- RUTA CHECKOUT (MERCADO PAGO) ---
app.post('/api/create_preference', async (req, res) => {
    const { items, comprador } = req.body;
    
    // 1. Guardar Orden en BD
    const total = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
    const itemsJson = JSON.stringify(items);
    
    db.query('INSERT INTO ordenes (cliente_nombre, cliente_telefono, items_json, total) VALUES (?,?,?,?)',
    [comprador.nombre, comprador.telefono, itemsJson, total], 
    async (err, result) => {
        if (err) return res.status(500).json({ error: 'Error BD' });
        
        const ordenId = result.insertId;

        // 2. Crear Preferencia MP
        try {
            const body = {
                items: items,
                external_reference: `${ordenId}`,
                back_urls: {
                    success: "http://localhost:3000/success", // Cambiar por tu dominio real
                    failure: "http://localhost:3000/failure",
                    pending: "http://localhost:3000/pending"
                },
                auto_return: "approved",
            };
            const preference = new Preference(client);
            const response = await preference.create({ body });
            res.json({ id: response.id });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error Mercado Pago' });
        }
    });
});

app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
    console.log('PARA CREAR ADMIN: Visita http://localhost:3000/setup-admin una vez');
});