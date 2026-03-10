/** * EL IZQUIERDO C.A - PRODUCCIÓN 2026
 * Configuración: Logo a la derecha y Nombre a la izquierda (Misma línea).
 */

const SHEET_ID = "1wWBUWFJRtm3MnPD6OmRYNa8tXvxjeL9sYcQvN4Mcrdg";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzk6y065jhrOKRqxif7XBOfSfak-iZo8LISCH0-p-99NeDgB2ZSf-pPDrvB9j_7QLakHQ/exec";
const AUTH_TOKEN = "IZQ_SECURE_2026_PRO";
const WHATSAPP_NUMBER = "584143126327";
const PROVEEDORES = ["Proveedor_A", "Proveedor_B"];

let allProducts = [], filteredProducts = [], cart = [], currentPage = 1;
const productsPerPage = 12;

async function init() {
  const loader = document.getElementById("loader");
  allProducts = [];
  for (const prov of PROVEEDORES) {
    const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(prov)}`;
    try {
      const res = await fetch(URL);
      const csv = await res.text();
      const rows = csv.split("\n").slice(1);
      rows.forEach((row) => {
        const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (cols.length >= 5) {
          allProducts.push({
            nombre: cols[0].replace(/"/g, "").trim(),
            desc: cols[1].replace(/"/g, "").trim(),
            precio: parseFloat(cols[2].replace(/"/g, "").trim()) || 0,
            img: cols[3].replace(/"/g, "").trim(),
            etiqueta: cols[4] ? cols[4].replace(/"/g, "").trim() : "",
          });
        }
      });
    } catch (e) { console.error("Error cargando inventario"); }
  }
  if (loader) loader.style.display = "none";
  filteredProducts = [...allProducts];
  updateDisplay();
  setupValidation();
}

function updateDisplay() {
  const startIndex = (currentPage - 1) * productsPerPage;
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  grid.innerHTML = filteredProducts
    .slice(startIndex, startIndex + productsPerPage)
    .map((p) => {
      const is3D = p.img.includes("tripo3d.ai");
      const media = is3D
        ? `<iframe src="${p.img}" style="width:100%; height:200px; border:none; border-radius:8px;"></iframe>`
        : `<img src="${p.img}" alt="${p.nombre}" onerror="this.src='https://via.placeholder.com/300x200'">`;

      return `<div class="card">
            <div class="card-img-container">${media}</div>
            <h3>${p.nombre}</h3>
            <p>${p.desc}</p>
            <div class="price">$${p.precio.toFixed(2)}</div>
            <button class="btn-add" onclick="addToCart('${p.nombre.replace(/'/g, "\\'")}', ${p.precio}, '${p.img}')">Añadir al Pedido</button>
        </div>`;
    }).join("");
  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const container = document.getElementById("pagination-controls");
  if (!container) return;
  container.innerHTML = "";
  if (totalPages <= 1) return;
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.innerText = i;
    btn.className = `page-btn ${currentPage === i ? "active" : ""}`;
    btn.onclick = () => { currentPage = i; updateDisplay(); window.scrollTo(0, 400); };
    container.appendChild(btn);
  }
}

function addToCart(name, price, img) {
  cart.push({ name, price, img });
  updateCartUI();
  validateForm();
}

function removeFromCart(name) {
  const index = cart.findLastIndex(item => item.name === name);
  if (index !== -1) cart.splice(index, 1);
  updateCartUI();
  validateForm();
}

function updateCartUI() {
  const itemsDiv = document.getElementById("cart-items");
  if (cart.length === 0) {
    itemsDiv.innerHTML = "<p style='text-align:center; padding:20px; color:#999;'>El carrito está vacío</p>";
    document.getElementById("cart-total-value").innerText = "0.00";
    return;
  }
  const agrupadosUI = {};
  cart.forEach(item => {
    if (!agrupadosUI[item.name]) {
      agrupadosUI[item.name] = { ...item, cantidad: 0, subtotal: 0 };
    }
    agrupadosUI[item.name].cantidad++;
    agrupadosUI[item.name].subtotal += item.price;
  });
  let total = 0;
  itemsDiv.innerHTML = Object.values(agrupadosUI).map((item) => {
    total += item.subtotal;
    return `
      <div class="cart-item-row" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid #f0f0f0; padding-bottom:8px;">
          <div style="font-size:0.85rem; flex:1;">
              <b style="display:block;">(${item.cantidad}) ${item.name}</b>
              <span style="color:var(--primary); font-weight:bold;">$${item.subtotal.toFixed(2)}</span>
          </div>
          <button onclick="removeFromCart('${item.name.replace(/'/g, "\\'")}')" style="color:#ff4757; border:none; background:none; cursor:pointer; font-size:1.1rem;">&times;</button>
      </div>`;
  }).join("");
  document.getElementById("cart-total-value").innerText = total.toFixed(2);
  const count = document.getElementById("cart-count");
  if (count) count.innerText = cart.length;
}

function agruparParaPedido() {
  const resumen = {};
  cart.forEach((item) => {
    if (resumen[item.name]) {
      resumen[item.name].cantidad += 1;
      resumen[item.name].subtotal += item.price;
    } else {
      resumen[item.name] = { precio: item.price, cantidad: 1, subtotal: item.price };
    }
  });
  return resumen;
}

async function generarNotaPDF(datos) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const agrupados = agruparParaPedido();
  const subtotal = parseFloat(datos.subtotal);
  const iva = subtotal * 0.16;
  const totalFinal = subtotal + iva;

  const loadLogo = () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = 'logo.png';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  const logoImg = await loadLogo();
  
  // --- MEMBRETE EN LA MISMA LÍNEA ---
  if (logoImg) {
    // Logo a la derecha (x=155, y=10)
    doc.addImage(logoImg, 'PNG', 155, 10, 40, 40);
  }

  // Nombre a la izquierda, alineado con el centro visual del logo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("EL IZQUIERDO C.A.", 20, 28); 
  
  doc.setFontSize(10);
  doc.text("NOTA DE ENTREGA / COTIZACIÓN", 20, 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Venta, Instalación y Soporte Técnico Especializado", 20, 40);

  // DATOS DEL CLIENTE
  doc.setFontSize(9);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 58);
  doc.text(`Cliente: ${datos.cliente}`, 20, 64);
  doc.text(`Cédula/RIF: ${datos.cedula}`, 20, 70);
  doc.line(20, 75, 190, 75);

  // TABLA
  doc.setFont("helvetica", "bold");
  doc.text("CANT.", 20, 83);
  doc.text("DESCRIPCIÓN", 40, 83);
  doc.text("P. UNIT", 150, 83, { align: "right" });
  doc.text("TOTAL", 185, 83, { align: "right" });
  doc.line(20, 85, 190, 85);

  let y = 93;
  doc.setFont("helvetica", "normal");
  for (const n in agrupados) {
    doc.text(agrupados[n].cantidad.toString(), 25, y, { align: "center" });
    doc.text(n.substring(0, 45), 40, y);
    doc.text(`$${agrupados[n].precio.toFixed(2)}`, 150, y, { align: "right" });
    doc.text(`$${agrupados[n].subtotal.toFixed(2)}`, 185, y, { align: "right" });
    y += 8;
    if (y > 260) { doc.addPage(); y = 20; }
  }

  // TOTALES
  y += 10;
  doc.line(130, y, 190, y);
  y += 10;
  doc.text("Subtotal:", 130, y);
  doc.text(`$${subtotal.toFixed(2)}`, 185, y, { align: "right" });
  y += 7;
  doc.text("IVA (16%):", 130, y);
  doc.text(`$${iva.toFixed(2)}`, 185, y, { align: "right" });
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL A PAGAR:", 130, y);
  doc.text(`$${totalFinal.toFixed(2)}`, 185, y, { align: "right" });

  // PIE
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Tlf: 0414-3126327 | Correo: ventaselizquierdo@gmail.com", 105, 285, { align: "center" });

  doc.save(`Nota_${datos.cliente.replace(/\s+/g, "_")}.pdf`);
}

function setupValidation() {
  ["cust-name", "cust-id", "cust-phone", "cust-address"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", validateForm);
  });
}

function validateForm() {
  const name = document.getElementById("cust-name").value.trim();
  const id = document.getElementById("cust-id").value.trim();
  const phone = document.getElementById("cust-phone").value.trim();
  const addr = document.getElementById("cust-address").value.trim();
  const btn = document.getElementById("btn-finalize");
  if (name && id && phone && addr && cart.length > 0) {
    btn.disabled = false;
    btn.classList.remove("disabled");
    btn.style.opacity = "1";
  } else {
    btn.disabled = true;
    btn.classList.add("disabled");
    btn.style.opacity = "0.5";
  }
}

function toggleCart() { document.getElementById("cart-panel").classList.toggle("active"); }

async function processOrder() {
  const name = document.getElementById("cust-name").value;
  const id = document.getElementById("cust-id").value;
  const phone = document.getElementById("cust-phone").value;
  const addr = document.getElementById("cust-address").value;
  const subtotal = parseFloat(document.getElementById("cart-total-value").innerText);
  const iva = subtotal * 0.16;
  const totalFinal = subtotal + iva;

  const pedidoData = {
    auth_token: AUTH_TOKEN,
    cliente: name, cedula: id, telefono: phone, direccion: addr,
    productos: cart.map((i) => i.name).join(", "),
    subtotal: subtotal.toFixed(2),
    total: totalFinal.toFixed(2),
  };

  await generarNotaPDF(pedidoData);
  try { fetch(APPS_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(pedidoData) }); } catch (e) {}

  const agrupados = agruparParaPedido();
  let msg = `Hola *el izquierdo c.a*, nuevo pedido:%0A👤 *Cliente:* ${name}%0A💳 *CI:* ${id}%0A📍 *Dir:* ${addr}%0A%0A*DETALLE:*%0A`;
  for (const n in agrupados) {
    msg += `• (${agrupados[n].cantidad}) ${n} - $${agrupados[n].subtotal.toFixed(2)}%0A`;
  }
  msg += `%0A📉 Subtotal: $${subtotal.toFixed(2)}%0A📊 IVA (16%): $${iva.toFixed(2)}%0A💰 *TOTAL: $${totalFinal.toFixed(2)}*`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");

  setTimeout(() => {
    cart = [];
    updateCartUI();
    ["cust-name", "cust-id", "cust-phone", "cust-address"].forEach(id => (document.getElementById(id).value = ""));
    validateForm();
    toggleCart();
  }, 1200);
}

document.getElementById("searchInput").addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  filteredProducts = allProducts.filter((p) => p.nombre.toLowerCase().includes(term));
  currentPage = 1;
  updateDisplay();
});

document.addEventListener("DOMContentLoaded", init);