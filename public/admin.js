async function checkAuth() {
    const res = await fetch('/api/check-auth');
    const data = await res.json();
    if (data.authenticated) {
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('dashboard-view').style.display = 'block';
        cargarOrdenes();
    }
}

async function login() {
    const usuario = document.getElementById('user').value;
    const password = document.getElementById('pass').value;
    
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ usuario, password })
    });
    
    const data = await res.json();
    if (data.success) {
        location.reload();
    } else {
        alert('Error: ' + data.error);
    }
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    location.reload();
}

function switchTab(tab) {
    document.getElementById('tab-productos').style.display = tab === 'productos' ? 'block' : 'none';
    document.getElementById('tab-ordenes').style.display = tab === 'ordenes' ? 'block' : 'none';
    
    // Update active button visual
    document.querySelectorAll('.nav-admin button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

async function guardarProducto() {
    const data = {
        nombre: document.getElementById('p-nombre').value,
        precio: document.getElementById('p-precio').value,
        categoria: document.getElementById('p-categoria').value,
        imagen_url: document.getElementById('p-img').value,
        descripcion: document.getElementById('p-desc').value
    };

    if(!data.nombre || !data.categoria) return alert('Faltan datos');

    const res = await fetch('/api/admin/productos', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        alert('Producto Guardado!');
        document.getElementById('p-nombre').value = '';
        // Limpiar otros campos...
    }
}

async function cargarOrdenes() {
    const res = await fetch('/api/admin/ordenes');
    const ordenes = await res.json();
    const tbody = document.getElementById('lista-ordenes');
    
    tbody.innerHTML = ordenes.map(o => `
        <tr>
            <td>#${o.id}</td>
            <td>${o.cliente_nombre}<br><small>${o.cliente_telefono}</small></td>
            <td>$${o.total}</td>
            <td>
                <select onchange="cambiarEstado(${o.id}, this.value)">
                    <option ${o.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option ${o.estado === 'Pagado' ? 'selected' : ''}>Pagado</option>
                    <option ${o.estado === 'Enviado' ? 'selected' : ''}>Enviado</option>
                </select>
            </td>
            <td><button onclick="alert('${o.items_json}')">Ver Items</button></td>
        </tr>
    `).join('');
}

async function cambiarEstado(id, estado) {
    await fetch('/api/admin/orden-estado', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id, estado })
    });
}

checkAuth();