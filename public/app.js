let carrito = [];
const mp = new MercadoPago('TU_PUBLIC_KEY_AQUI'); // <--- PON TU PUBLIC KEY DE MERCADOPAGO

async function cargarCatalogo() {
    const res = await fetch('/api/perfumes');
    const perfumes = await res.json();
    
    const contenedor = document.getElementById('catalogo');
    contenedor.innerHTML = '';

    // Agrupar por categoría
    const grupos = {};
    perfumes.forEach(p => {
        if (!grupos[p.categoria]) grupos[p.categoria] = [];
        grupos[p.categoria].push(p);
    });

    for (const [cat, items] of Object.entries(grupos)) {
        const section = document.createElement('div');
        section.className = 'category-section';
        section.innerHTML = `
            <h2 class="category-title">${cat}</h2>
            <div class="products-grid">
                ${items.map(p => `
                    <div class="product-card">
                        <img src="${p.imagen_url}" alt="${p.nombre}">
                        <h3>${p.nombre}</h3>
                        <p style="color:#888;">${p.descripcion || ''}</p>
                        <p style="font-weight:bold; font-size:1.2rem;">$${p.precio}</p>
                        <button class="btn-add" onclick="agregarAlCarrito(${p.id}, '${p.nombre}', ${p.precio})">
                            Agregar al Carrito
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        contenedor.appendChild(section);
    }
}

function agregarAlCarrito(id, title, unit_price) {
    const existe = carrito.find(item => item.id === id);
    if (existe) {
        existe.quantity++;
    } else {
        carrito.push({ id, title, unit_price, quantity: 1 });
    }
    actualizarCarritoUI();
    alert('Agregado al carrito');
}

function actualizarCarritoUI() {
    document.getElementById('cart-count').innerText = carrito.reduce((acc, item) => acc + item.quantity, 0);
    
    const itemsDiv = document.getElementById('cart-items');
    itemsDiv.innerHTML = carrito.map((item, index) => `
        <div class="cart-item">
            <span>${item.title} x${item.quantity}</span>
            <span>$${item.unit_price * item.quantity}</span>
            <button onclick="eliminarItem(${index})" style="color:red; border:none; background:none; cursor:pointer;">X</button>
        </div>
    `).join('');
    
    const total = carrito.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
    document.getElementById('cart-total').innerText = total;
}

function eliminarItem(index) {
    carrito.splice(index, 1);
    actualizarCarritoUI();
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
}

async function pagar() {
    const nombre = document.getElementById('cliente-nombre').value;
    const tel = document.getElementById('cliente-tel').value;

    if (!nombre || !tel || carrito.length === 0) return alert('Completa tus datos y agrega productos');

    const res = await fetch('/api/create_preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            items: carrito,
            comprador: { nombre, telefono: tel }
        })
    });
    
    const data = await res.json();
    if (data.id) {
        mp.bricks().create("wallet", "wallet_container", {
            initialization: { preferenceId: data.id },
        });
    }
}

cargarCatalogo();