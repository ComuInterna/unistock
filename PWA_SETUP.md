# UniStock PWA — Configuración NFC + Deep Links

## Estructura de archivos a subir a Vercel/GitHub

```
tu-repo/
├── index.html              ← App principal
├── entrega.html            ← Pantalla NFC móvil
├── nfc.html                ← Launcher inteligente (NUEVO)
├── sw.js                   ← Service Worker (NUEVO)
├── manifest.json           ← PWA manifest (NUEVO)
├── vercel.json             ← Headers Vercel (NUEVO)
├── apple-touch-icon.png    ← Ya lo tienes (180×180)
├── supabase_schema.sql
└── .well-known/
    └── apple-app-site-association
```

---

## Paso 1 — Agregar al <head> de index.html y entrega.html

Copia esto dentro del `<head>` de AMBOS archivos, justo después de `<title>`:

```html
<!-- PWA -->
<link rel="manifest" href="/manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="UniStock">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<!-- Service Worker + NFC handler -->
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js');
  });
}

// Pick up pending NFC navigation
(function() {
  try {
    var raw = localStorage.getItem('unistock-nfc-pending');
    if (!raw) return;
    var data = JSON.parse(raw);
    if (Date.now() - data.ts > 30000) {
      localStorage.removeItem('unistock-nfc-pending');
      return;
    }
    localStorage.removeItem('unistock-nfc-pending');
    var sku    = data.sku;
    var action = data.action || 'salida';
    if (!sku) return;

    var isOnEntrega = window.location.pathname.indexOf('entrega') !== -1;
    var isOnIndex   = window.location.pathname.indexOf('index')   !== -1
                   || window.location.pathname === '/';

    if (action === 'salida' && !isOnEntrega) {
      window.location.href = '/entrega.html?sku=' + encodeURIComponent(sku);
    } else if (action === 'salida' && isOnEntrega) {
      window.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
          if (typeof loadProductBySKU === 'function') loadProductBySKU(sku.toUpperCase());
        }, 600);
      });
    } else if (action === 'stock') {
      if (!isOnIndex) {
        window.location.href = '/index.html?view=stock&sku=' + encodeURIComponent(sku);
      } else {
        window.addEventListener('DOMContentLoaded', function() {
          setTimeout(function() {
            var el = document.getElementById('dash-search');
            if (el) { el.value = sku; el.dispatchEvent(new Event('input')); }
            if (typeof nav === 'function') nav('dashboard', document.querySelector('[data-page=dashboard]'));
          }, 700);
        });
      }
    }
  } catch(e) {}
})();
</script>
```

---

## Paso 2 — Instalar la PWA en iPhone

1. Abre tu URL en **Safari** (no Chrome)
2. Toca el botón compartir **⬆**
3. "Agregar a pantalla de inicio"
4. Nombre: **UniStock** → Agregar

---

## Paso 3 — Escribir etiquetas NFC (con NFC Tools)

### Para salida rápida de un artículo:
```
https://tu-app.vercel.app/nfc.html?sku=POL-NEG-M&action=salida
```

### Para consultar stock:
```
https://tu-app.vercel.app/nfc.html?sku=POL-NEG-M&action=stock
```

En NFC Tools: Write → Add a record → **URL** → pega la URL → Write

---

## Comportamiento por dispositivo

| Situación | Resultado |
|-----------|-----------|
| iPhone + PWA instalada + app abierta en fondo | iOS retoma la app, nfc.html redirige |
| iPhone + PWA instalada + app cerrada | Abre Safari con nfc.html → botón manual |
| iPhone sin PWA instalada | Abre Safari con nfc.html → entrega.html en Safari |
| Android + PWA instalada | Abre directo en la PWA ✅ |
| Android sin PWA | Abre Chrome → entrega.html |

---

## Por qué iOS no abre la PWA directamente desde NFC

Apple diseñó el sistema NFC para abrir Safari, no apps de terceros
(ni siquiera PWAs instaladas). Universal Links y Custom URL Schemes
requieren una app nativa en la App Store para funcionar desde NFC.

**La solución implementada** usa `nfc.html` como página intermedia que:
1. Guarda el destino en `localStorage`
2. Redirige a la página correcta
3. Al abrir la app, detecta el pendiente y navega automáticamente

Este es el mismo patrón que usan empresas como Square y Shopify
para sus PWAs internas cuando no quieren publicar en la App Store.

---

## Solución Pro (si necesitas apertura directa 100%)

Requiere publicar una app nativa en la App Store con:
- `CFBundleURLTypes` para custom scheme `unistock://`
- Configuración de Universal Links con AASA real
- WKWebView apuntando a tu misma URL de Vercel

Costo estimado: cuenta developer Apple ($99/año) + ~2 semanas dev.
