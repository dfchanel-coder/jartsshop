// --- 1. AUTENTICACIÓN ---
async function check() {
    const r = await fetch('/api/check-auth');
    const d = await r.json();
    if (d.authenticated) {
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('dashboard-view').style.display = 'block';
        cargarCotizacionAdmin(); // Carga la cotización al entrar
    }
}

async function login() {
    const usuario = document.getElementById('user').value;
    const password = document.getElementById('pass').value;
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, password }) });
    const data = await res.json();
    if (data.success) location.reload(); else alert('Error: ' + data.error);
}

async function logout() { await fetch('/api/logout', { method: 'POST' }); location.reload(); }

// --- 2. NAVEGACIÓN ---
function showTab(id, element) {
    document.querySelectorAll('.tab-content').forEach(d => d.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tab-' + id).style.display = 'block';
    element.classList.add('active');

    if (id === 'inventario') cargarInventario();
    if (id === 'pedidos') cargarPedidos();
    if (id === 'resenas') cargarResenasAdmin();
}

// --- 3. GESTIÓN DE PRODUCTOS ---
async function crearProducto() {
    const data = { nombre: document.getElementById('n-nombre').value, precio: document.getElementById('n-precio').value, categoria: document.getElementById('n-cat').value, imagen_url: document.getElementById('n-img').value, descripcion: document.getElementById('n-desc').value };
    if (!data.nombre || !data.precio || !data.imagen_url) return alert('Nombre, precio e imagen son obligatorios.');
    await fetch('/api/admin/productos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    alert('¡Producto creado con éxito!');
    ['n-nombre', 'n-precio', 'n-img', 'n-desc', 'n-cat'].forEach(id => document.getElementById(id).value = '');
}

async function cargarInventario() {
    const res = await fetch('/api/perfumes');
    const prods = await res.json();
    const tbody = document.querySelector('#tabla-inv tbody');
    if (prods.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Inventario vacío.</td></tr>'; return; }
    tbody.innerHTML = prods.map(p => `
        <tr>
            <td style="width:60px;"><img src="${p.imagen_url}" style="width:50px; height:50px; object-fit:cover; border-radius:5px; border:1px solid #ddd;"></td>
            <td><strong style="font-size:1.1rem;">${p.nombre}</strong><br><span style="color:#666;">$${p.precio} UYU | Categ: ${p.categoria}</span></td>
            <td style="width:150px;"><button class="btn-accion btn-editar" onclick='editar(${JSON.stringify(p).replace(/'/g, "&apos;")})'>Editar</button> <button class="btn-accion btn-borrar" onclick='borrar(${p.id})'>Borrar</button></td>
        </tr>
    `).join('');
}

async function borrar(id) { if (confirm('¿Eliminar perfume?')) { await fetch('/api/admin/productos/' + id, { method: 'DELETE' }); cargarInventario(); } }

function editar(p) {
    document.getElementById('e-id').value = p.id; document.getElementById('e-nombre').value = p.nombre; document.getElementById('e-precio').value = p.precio; document.getElementById('e-cat').value = p.categoria; document.getElementById('e-img').value = p.imagen_url; document.getElementById('e-desc').value = p.descripcion;
    document.getElementById('modal-edit').style.display = 'block';
}

async function guardarEdicion() {
    const id = document.getElementById('e-id').value;
    const data = { nombre: document.getElementById('e-nombre').value, precio: document.getElementById('e-precio').value, categoria: document.getElementById('e-cat').value, imagen_url: document.getElementById('e-img').value, descripcion: document.getElementById('e-desc').value };
    await fetch('/api/admin/productos/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    document.getElementById('modal-edit').style.display = 'none'; cargarInventario();
}

// --- 4. GESTIÓN DE PEDIDOS ---
async function cargarPedidos() {
    const res = await fetch('/api/admin/ordenes');
    const ords = await res.json();
    const tbody = document.querySelector('#tabla-pedidos tbody');
    if (ords.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay órdenes registradas.</td></tr>'; return; }
    tbody.innerHTML = ords.map(o => `
        <tr>
            <td style="font-weight:bold; color:var(--accent);">#${o.id}</td>
            <td><strong>${o.cliente_nombre}</strong><br>📞 ${o.cliente_telefono}<br>📍 <small style="color:#666;">${o.cliente_direccion || 'No especificada'}</small></td>
            <td><strong style="font-size:1.1rem;">${o.total}</strong><br><small style="background:#f0f0f0; padding:2px 5px; border-radius:3px;">${o.metodo_pago ? o.metodo_pago.toUpperCase() : 'N/A'}</small></td>
            <td>
                <select onchange="cambiarEstado(${o.id}, this.value)" style="padding:5px; font-weight:bold; cursor:pointer;">
                    <option value="Pendiente" ${o.estado === 'Pendiente' ? 'selected' : ''}>Pendiente ⏱️</option>
                    <option value="Pagado" ${o.estado === 'Pagado' ? 'selected' : ''}>Pagado 💰</option>
                    <option value="Enviado" ${o.estado === 'Enviado' ? 'selected' : ''}>Enviado 📦</option>
                </select>
            </td>
        </tr>
    `).join('');
}
async function cambiarEstado(id, estado) { await fetch('/api/admin/orden-estado', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado }) }); }

// --- 5. MODERACIÓN DE RESEÑAS ---
async function cargarResenasAdmin() {
    const res = await fetch('/api/admin/resenas');
    const resenas = await res.json();
    const tbody = document.querySelector('#tabla-resenas tbody');
    if (resenas.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay reseñas.</td></tr>'; return; }
    tbody.innerHTML = resenas.map(r => `
        <tr><td style="color:var(--accent); font-weight:bold;">${r.perfume_nombre}</td><td><strong>${r.nombre}</strong></td><td style="max-width:300px; font-style:italic; color:#555;">"${r.comentario}"</td><td style="font-size:1.1rem;">${r.estrellas}</td><td><button onclick="borrarResena(${r.id})" class="btn-accion btn-borrar">Borrar</button></td></tr>
    `).join('');
}
async function borrarResena(id) { if (confirm('¿Borrar comentario permanente?')) { await fetch(`/api/admin/resenas/${id}`, { method: 'DELETE' }); cargarResenasAdmin(); } }

// --- 6. COTIZACIÓN FRONTERA (BRL a UYU) ---
async function cargarCotizacionAdmin() {
    try {
        const res = await fetch('/api/configuracion');
        const data = await res.json();
        document.getElementById('adm-cotizacion').value = data.cotizacion;
    } catch(e) { console.error('Error cargando cotización', e); }
}

async function guardarCotizacion() {
    const val = document.getElementById('adm-cotizacion').value;
    if(!val) return alert('Por favor, ingresa un valor.');
    
    await fetch('/api/admin/configuracion', { 
        method: 'PUT', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ cotizacion: val }) 
    });
    alert('✅ Cotización guardada. Si pusiste 8.50, un perfume de $850 UYU se mostrará como R$ 100 en la tienda de Brasil.');
}

check();