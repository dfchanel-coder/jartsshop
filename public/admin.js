// Auth
async function check() {
    const r = await fetch('/api/check-auth');
    const d = await r.json();
    if(d.authenticated) {
        document.getElementById('login-view').style.display='none';
        document.getElementById('dashboard-view').style.display='block';
        cargarInventario(); // Cargar datos al inicio
    }
}
async function login() {
    const usuario = document.getElementById('user').value;
    const password = document.getElementById('pass').value;
    const res = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({usuario, password})});
    const data = await res.json();
    if(data.success) location.reload(); else alert(data.error);
}
async function logout() { await fetch('/api/logout', {method:'POST'}); location.reload(); }

// Tabs
function showTab(id) {
    document.querySelectorAll('.tab-content').forEach(d => d.style.display='none');
    document.getElementById('tab-'+id).style.display='block';
    if(id === 'inventario') cargarInventario();
    if(id === 'pedidos') cargarPedidos();
}

// Productos
async function crearProducto() {
    const data = {
        nombre: document.getElementById('n-nombre').value,
        precio: document.getElementById('n-precio').value,
        categoria: document.getElementById('n-cat').value,
        imagen_url: document.getElementById('n-img').value,
        descripcion: document.getElementById('n-desc').value
    };
    if(!data.nombre) return alert('Nombre obligatorio');
    await fetch('/api/admin/productos', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    alert('Creado!');
    document.getElementById('n-nombre').value = '';
}

async function cargarInventario() {
    const res = await fetch('/api/perfumes');
    const prods = await res.json();
    const tbody = document.querySelector('#tabla-inv tbody');
    tbody.innerHTML = prods.map(p => `
        <tr>
            <td><img src="${p.imagen_url}" style="width:40px; border-radius:4px;"></td>
            <td>${p.nombre}<br><small>$${p.precio} - ${p.categoria}</small></td>
            <td>
                <button onclick='editar(${JSON.stringify(p)})' style="cursor:pointer;">✏️</button>
                <button onclick='borrar(${p.id})' style="cursor:pointer; color:red;">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function borrar(id) {
    if(confirm('¿Eliminar?')) {
        await fetch('/api/admin/productos/'+id, {method:'DELETE'});
        cargarInventario();
    }
}

function editar(p) {
    document.getElementById('e-id').value = p.id;
    document.getElementById('e-nombre').value = p.nombre;
    document.getElementById('e-precio').value = p.precio;
    document.getElementById('e-cat').value = p.categoria;
    document.getElementById('e-img').value = p.imagen_url;
    document.getElementById('e-desc').value = p.descripcion;
    document.getElementById('modal-edit').style.display = 'block';
}

async function guardarEdicion() {
    const id = document.getElementById('e-id').value;
    const data = {
        nombre: document.getElementById('e-nombre').value,
        precio: document.getElementById('e-precio').value,
        categoria: document.getElementById('e-cat').value,
        imagen_url: document.getElementById('e-img').value,
        descripcion: document.getElementById('e-desc').value
    };
    await fetch('/api/admin/productos/'+id, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    document.getElementById('modal-edit').style.display = 'none';
    cargarInventario();
}

// Pedidos
async function cargarPedidos() {
    const res = await fetch('/api/admin/ordenes');
    const ords = await res.json();
    const tbody = document.querySelector('#tabla-pedidos tbody');
    tbody.innerHTML = ords.map(o => `
        <tr>
            <td>#${o.id}</td>
            <td>
                <strong>${o.cliente_nombre}</strong><br>
                Tel: ${o.cliente_telefono}<br>
                Dir: ${o.cliente_direccion || 'No especificada'}
            </td>
            <td>
                $${o.total}<br>
                <small>${o.metodo_pago === 'mercadopago' ? 'MercadoPago' : 'Transferencia'}</small>
            </td>
            <td>
                <select onchange="cambiarEstado(${o.id}, this.value)" style="padding:2px;">
                    <option ${o.estado==='Pendiente'?'selected':''}>Pendiente</option>
                    <option ${o.estado==='Pagado'?'selected':''}>Pagado</option>
                    <option ${o.estado==='Enviado'?'selected':''}>Enviado</option>
                </select>
            </td>
        </tr>
    `).join('');
}

async function cambiarEstado(id, estado) {
    await fetch('/api/admin/orden-estado', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id, estado})});
}

check();