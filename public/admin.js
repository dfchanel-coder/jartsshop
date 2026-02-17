async function check() {
    const r = await fetch('/api/check-auth?t=' + new Date().getTime(), { cache: 'no-store' });
    const d = await r.json();
    if (d.authenticated) {
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('dashboard-view').style.display = 'block';
        cargarConfiguracionAdmin();
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

function showTab(id, element) {
    document.querySelectorAll('.tab-content').forEach(d => d.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tab-' + id).style.display = 'block';
    element.classList.add('active');

    if (id === 'inventario') cargarInventario();
    if (id === 'pedidos') cargarPedidos();
    if (id === 'resenas') cargarResenasAdmin();
}

async function crearProducto() {
    const data = { nombre: document.getElementById('n-nombre').value, precio: document.getElementById('n-precio').value, categoria: document.getElementById('n-cat').value, imagen_url: document.getElementById('n-img').value, descripcion: document.getElementById('n-desc').value };
    if (!data.nombre || !data.precio || !data.imagen_url) return alert('Nombre, precio e imagen son obligatorios.');
    await fetch('/api/admin/productos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    alert('¡Producto creado con éxito!');
    ['n-nombre', 'n-precio', 'n-img', 'n-desc', 'n-cat'].forEach(id => document.getElementById(id).value = '');
}

async function cargarInventario() {
    const res = await fetch('/api/perfumes?t=' + new Date().getTime());
    const prods = await res.json();
    const tbody = document.querySelector('#tabla-inv tbody');
    if (prods.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">Inventario vacío.</td></tr>'; return; }
    tbody.innerHTML = prods.map(p => `
        <tr>
            <td style="width:70px;"><img src="${p.imagen_url}" style="width:60px; height:60px; object-fit:contain; border-radius:8px; background:rgba(0,0,0,0.2); border:1px solid var(--border);"></td>
            <td><strong style="font-size:1.05rem; color:var(--text);">${p.nombre}</strong><br><span style="color:var(--text-muted); font-size:0.9rem;">$${p.precio} UYU | ${p.categoria}</span></td>
            <td style="width:160px;"><button class="btn-accion btn-editar" onclick='editar(${JSON.stringify(p).replace(/'/g, "&apos;")})'>Editar</button> <button class="btn-accion btn-borrar" onclick='borrar(${p.id})'>Borrar</button></td>
        </tr>
    `).join('');
}

async function borrar(id) { if (confirm('¿Eliminar producto?')) { await fetch('/api/admin/productos/' + id, { method: 'DELETE' }); cargarInventario(); } }

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

async function cargarPedidos() {
    const res = await fetch('/api/admin/ordenes?t=' + new Date().getTime());
    const ords = await res.json();
    const tbody = document.querySelector('#tabla-pedidos tbody');
    if (ords.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No hay órdenes registradas.</td></tr>'; return; }
    tbody.innerHTML = ords.map(o => `
        <tr>
            <td style="font-weight:bold; color:var(--accent);">#${o.id}</td>
            <td><strong style="color:var(--text);">${o.cliente_nombre}</strong><br><span style="color:var(--text-muted); font-size:0.9rem;">📞 ${o.cliente_telefono}<br>📍 ${o.cliente_direccion || 'N/A'}</span></td>
            <td><strong style="font-size:1.1rem; color:var(--text);">${o.total}</strong><br><small style="background:rgba(255,255,255,0.1); padding:3px 6px; border-radius:4px; color:var(--text);">${o.metodo_pago ? o.metodo_pago.toUpperCase() : 'N/A'}</small></td>
            <td>
                <select class="form-input" onchange="cambiarEstado(${o.id}, this.value)" style="padding:6px; font-weight:bold; cursor:pointer; width:auto; margin:0;">
                    <option value="Pendiente" ${o.estado === 'Pendiente' ? 'selected' : ''}>Pendiente ⏱️</option>
                    <option value="Pagado" ${o.estado === 'Pagado' ? 'selected' : ''}>Pagado 💰</option>
                    <option value="Enviado" ${o.estado === 'Enviado' ? 'selected' : ''}>Enviado 📦</option>
                </select>
            </td>
        </tr>
    `).join('');
}
async function cambiarEstado(id, estado) { await fetch('/api/admin/orden-estado', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado }) }); }

async function cargarResenasAdmin() {
    const res = await fetch('/api/admin/resenas?t=' + new Date().getTime());
    const resenas = await res.json();
    const tbody = document.querySelector('#tabla-resenas tbody');
    if (resenas.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No hay reseñas.</td></tr>'; return; }
    tbody.innerHTML = resenas.map(r => `
        <tr><td style="color:var(--accent); font-weight:bold;">${r.perfume_nombre}</td><td><strong style="color:var(--text);">${r.nombre}</strong></td><td style="max-width:250px; font-style:italic; color:var(--text-muted); font-size:0.9rem;">"${r.comentario}"</td><td style="font-size:1.1rem; color:var(--gold);">${'⭐'.repeat(r.estrellas)}</td><td><button onclick="borrarResena(${r.id})" class="btn-accion btn-borrar">Borrar</button></td></tr>
    `).join('');
}
async function borrarResena(id) { if (confirm('¿Borrar comentario permanente?')) { await fetch(`/api/admin/resenas/${id}`, { method: 'DELETE' }); cargarResenasAdmin(); } }

async function cargarConfiguracionAdmin() {
    try {
        const res = await fetch('/api/configuracion?t=' + new Date().getTime(), { cache: 'no-store' });
        const data = await res.json();
        document.getElementById('adm-cotizacion').value = data.cotizacion;
        document.getElementById('adm-banner').value = data.banner_url || '';
    } catch(e) { console.error('Error cargando configuración', e); }
}

async function guardarConfiguracion() {
    const cotizacion = document.getElementById('adm-cotizacion').value;
    const bannerUrl = document.getElementById('adm-banner').value;
    
    if(!cotizacion) return alert('La cotización es obligatoria.');
    
    await fetch('/api/admin/configuracion', { 
        method: 'PUT', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({ cotizacion: cotizacion, banner_url: bannerUrl }) 
    });
    alert('✅ Configuración guardada correctamente.');
}

check();