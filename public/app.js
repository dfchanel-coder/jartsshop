let carrito = [];
let metodoPagoSeleccionado = 'mercadopago';
const mp = new MercadoPago('TU_PUBLIC_KEY_AQUI'); // RECUERDA PONER TU CLAVE PÚBLICA

async function cargarCatalogo() {
    const res = await fetch('/api/perfumes');
    const perfumes = await res.json();
    const container = document.getElementById('catalogo');
    container.innerHTML = '';

    const grupos = {};
    perfumes.forEach(p => {
        if (!grupos[p.categoria]) grupos[p.categoria] = [];
        grupos[p.categoria].push(p);
    });

    for (const [cat, items] of Object.entries(grupos)) {
        const section = document.createElement('div');
        section.innerHTML = `<h2 class="category-title">${cat}</h2><div class="products-grid"></div>`;
        const grid = section.querySelector('.products-grid');
        items.forEach(p => {
            // Fíjate que en la etiqueta alt puse el nombre para ayudar al SEO
            grid.innerHTML += `
                <div class="product-card">
                    <img src="${p.imagen_url}" alt="Perfume ${p.nombre}"> 
                    <h3>${p.nombre}</h3>
                    <p style="color:#888;">${p.descripcion || ''}</p>
                    <p style="font-weight:bold; font-size:1.2rem;">$${p.precio}</p>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button class="btn-add" onclick="agregarAlCarrito(${p.id}, '${p.nombre}', ${p.precio})" style="flex:3; margin:0;">Agregar</button>
                        <button class="btn-add" onclick="abrirResenas(${p.id}, '${p.nombre}')" style="flex:1; margin:0; background:#f0f0f0; color:#333; font-size:1.2rem;" title="Ver opiniones">⭐</button>
                    </div>
                </div>`;
        });
        container.appendChild(section);
    }
}

// --- LÓGICA DE RESEÑAS ---
async function abrirResenas(id, nombre) {
    document.getElementById('r-perfume-id').value = id;
    document.getElementById('resena-titulo').innerText = `Opiniones de ${nombre}`;
    document.getElementById('modal-resenas').style.display = 'block';
    cargarResenas(id);
}

function cerrarResenas() {
    document.getElementById('modal-resenas').style.display = 'none';
}

async function cargarResenas(id) {
    const res = await fetch(`/api/perfumes/${id}/resenas`);
    const resenas = await res.json();
    const div = document.getElementById('lista-resenas');
    
    if (resenas.length === 0) {
        div.innerHTML = '<p style="color:#888; text-align:center;">Aún no hay reseñas. ¡Sé el primero en opinar!</p>';
    } else {
        div.innerHTML = resenas.map(r => `
            <div style="border-bottom:1px solid #f0f0f0; padding:10px 0;">
                <strong style="font-size:0.9rem;">${r.nombre}</strong> 
                <span style="color:#d4af37; font-size:0.8rem;">${'⭐'.repeat(r.estrellas)}</span><br>
                <small style="color:#555; display:block; margin-top:5px;">${r.comentario}</small>
            </div>
        `).join('');
    }
}

async function enviarResena() {
    const id = document.getElementById('r-perfume-id').value;
    const nombre = document.getElementById('r-nombre').value;
    const estrellas = document.getElementById('r-estrellas').value;
    const comentario = document.getElementById('r-comentario').value;

    if (!nombre || !comentario) return alert('Por favor, escribe tu nombre y un comentario.');

    await fetch(`/api/perfumes/${id}/resenas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, estrellas, comentario })
    });

    document.getElementById('r-nombre').value = '';
    document.getElementById('r-comentario').value = '';
    cargarResenas(id); // Refresca la lista en vivo
}


// --- LÓGICA DE CARRITO Y PAGOS ---
function agregarAlCarrito(id, title, unit_price) {
    const existe = carrito.find(i => i.id === id);
    if (existe) existe.quantity++; else carrito.push({ id, title, unit_price, quantity: 1 });
    actualizarCarritoUI(); toggleCart();
}

function actualizarCarritoUI() {
    document.getElementById('cart-count').innerText = carrito.reduce((a, b) => a + b.quantity, 0);
    const div = document.getElementById('cart-items');
    if (carrito.length === 0) {
        div.innerHTML = '<p style="text-align:center; color:#888;">Tu carrito está vacío</p>';
    } else {
        div.innerHTML = carrito.map((item, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <div style="flex:1;"><strong>${item.title}</strong><br><small>$${item.unit_price} c/u</small></div>
                <div style="display:flex; align-items:center; gap:8px; margin:0 10px;">
                    <button onclick="restarItem(${idx})" style="background:#f0f0f0; border:none; width:28px; height:28px; border-radius:50%; cursor:pointer;">-</button>
                    <span style="font-weight:600;">${item.quantity}</span>
                    <button onclick="sumarItem(${idx})" style="background:#222; border:none; width:28px; height:28px; border-radius:50%; cursor:pointer; color:white;">+</button>
                </div>
                <div style="text-align:right;">
                    <strong>$${item.unit_price * item.quantity}</strong>
                    <small onclick="eliminarItem(${idx})" style="color:red; cursor:pointer; display:block;">Quitar</small>
                </div>
            </div>
        `).join('');
    }
    document.getElementById('cart-total').innerText = carrito.reduce((a, b) => a + (b.unit_price * b.quantity), 0);
}

function sumarItem(index) { carrito[index].quantity++; actualizarCarritoUI(); }
function restarItem(index) {
    if (carrito[index].quantity > 1) carrito[index].quantity--;
    else if (confirm('¿Eliminar del carrito?')) carrito.splice(index, 1);
    actualizarCarritoUI();
}
function eliminarItem(idx) { carrito.splice(idx, 1); actualizarCarritoUI(); }

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
}

function selectPago(metodo) {
    metodoPagoSeleccionado = metodo;
    document.getElementById('opt-mp').classList.toggle('selected', metodo === 'mercadopago');
    document.getElementById('opt-transf').classList.toggle('selected', metodo === 'transferencia');
    document.getElementById('wallet_container').innerHTML = '';
    document.getElementById('info-transferencia').style.display = 'none';
}

async function finalizarCompra() {
    const nombre = document.getElementById('c-nombre').value;
    const tel = document.getElementById('c-tel').value;
    const dir = document.getElementById('c-dir').value;

    if (!nombre || !tel || !dir || carrito.length === 0) return alert('Completa datos de envío y agrega productos.');

    const res = await fetch('/api/nueva-orden', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: carrito, comprador: { nombre, telefono: tel, direccion: dir }, metodo_pago: metodoPagoSeleccionado })
    });

    const data = await res.json();
    if (data.error) return alert('Error: ' + data.error);

    if (data.type === 'mp') {
        mp.bricks().create("wallet", "wallet_container", { initialization: { preferenceId: data.id } });
    } else if (data.type === 'transfer') {
        document.getElementById('info-transferencia').style.display = 'block';
        const msg = `Hola! Hice un pedido #${data.id}. Te envío el comprobante de la transferencia.`;
        document.getElementById('btn-whatsapp-pedido').href = `https://wa.me/59899822758?text=${encodeURIComponent(msg)}`;
        alert('Pedido registrado. Realiza la transferencia para procesar.');
    }
}

cargarCatalogo();