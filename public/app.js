let carrito = [];
let metodoPagoSeleccionado = 'mercadopago';
// REEMPLAZA CON TU PUBLIC KEY DE MERCADO PAGO
const mp = new MercadoPago('TU_PUBLIC_KEY_AQUI'); 

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
            grid.innerHTML += `
                <div class="product-card">
                    <img src="${p.imagen_url}">
                    <h3>${p.nombre}</h3>
                    <p style="color:#888;">${p.descripcion || ''}</p>
                    <p style="font-weight:bold; font-size:1.2rem;">$${p.precio}</p>
                    <button class="btn-add" onclick="agregarAlCarrito(${p.id}, '${p.nombre}', ${p.precio})">Agregar</button>
                </div>`;
        });
        container.appendChild(section);
    }
}

function agregarAlCarrito(id, title, unit_price) {
    const existe = carrito.find(i => i.id === id);
    if (existe) existe.quantity++;
    else carrito.push({ id, title, unit_price, quantity: 1 });
    actualizarCarritoUI();
    toggleCart();
}

function actualizarCarritoUI() {
    document.getElementById('cart-count').innerText = carrito.reduce((a, b) => a + b.quantity, 0);
    const div = document.getElementById('cart-items');
    
    if (carrito.length === 0) {
        div.innerHTML = '<p style="text-align:center; color:#888;">Tu carrito está vacío</p>';
    } else {
        div.innerHTML = carrito.map((item, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <div style="flex:1;">
                    <strong>${item.title}</strong><br><small>$${item.unit_price} c/u</small>
                </div>
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

    if (!nombre || !tel || !dir || carrito.length === 0) return alert('Por favor completa datos de envío y agrega productos.');

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