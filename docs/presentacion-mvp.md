# Gymni — Presentación MVP para Tyger Dragon

## Qué es Gymni

Gymni es una plataforma web para administrar tu gym desde cualquier dispositivo. Funciona en el navegador (celular, tablet, computadora) sin necesidad de instalar nada.

Tu gym tiene su propio espacio en: **tygerdragon.gymni.mx**

---

## Acceso y Roles

Hay 4 tipos de usuario, cada uno ve cosas diferentes:

| Rol | Qué puede hacer |
|-----|----------------|
| **Owner (Dueño)** | Todo. Configuración, planes, staff, miembros, pagos, check-in |
| **Admin** | Todo excepto gestionar planes de membresía |
| **Staff** | Dashboard, check-in, miembros y registrar pagos |
| **Miembro** | Ver su dashboard personal, estado de membresía, QR para check-in |

Un staff puede ser también miembro (si entrena en el gym), pero son roles separados.

---

## Módulos

### 1. Dashboard Admin
Vista general del gym con estadísticas rápidas:
- Total de miembros activos
- Ingresos del período
- Membresías próximas a vencer
- Actividad reciente

### 2. Check-in
Sistema de registro de entrada para los miembros:
- El miembro muestra su **código QR** desde su celular
- El staff escanea o busca manualmente al miembro
- El sistema muestra si la membresía está al corriente o tiene adeudo
- **Nunca bloquea la entrada** — muestra un aviso y el staff decide

### 3. Miembros
Gestión completa de los miembros del gym:
- **Lista con búsqueda y filtros**: buscar por nombre/email, filtrar por estado (activo, con adeudo, cancelado, sin plan)
- **Paginación**: funciona bien aunque tengas cientos de miembros
- **Agregar miembros**: por email, si no tienen cuenta se crea automáticamente con contraseña temporal
- **Detalle de cada miembro**: historial de pagos, facturas, check-ins

### 4. Pagos
Registro manual de pagos de membresía:
- Registrar pagos completos o parciales
- Múltiples métodos de pago (efectivo, transferencia, tarjeta)
- Historial completo de transacciones

### 5. Planes de Membresía (solo Owner)
Configuración de los planes que ofreces:
- Crear planes (ej: Básico, Premium)
- Precios por intervalo: mensual, trimestral, anual
- Asignar/cancelar planes a miembros

### 6. Staff
Gestión del equipo de trabajo:
- Invitar staff por email (les llega un correo con link de registro)
- Asignar roles: Admin o Staff
- El email de invitación solo funciona con el correo exacto al que se envió

### 7. Configuración (Owner y Admin)
Personalización del gym:
- Nombre y dirección
- **Tema visual**: modo claro/oscuro, color primario, bordes, escala de grises — con vista previa en tiempo real
- **Facturación**: días de gracia antes de marcar adeudo, días para auto-cancelar membresías

---

## Sistema de Facturación Automático

Gymni maneja el ciclo de vida de las membresías automáticamente:

1. **Membresía activa** → el miembro está al corriente
2. **Se vence el período** → se genera nueva factura automáticamente y se renueva
3. **Pasa la fecha límite (días de gracia)** → se marca como **"Con adeudo"**
4. **Pasan los días de auto-cancelación** → se **cancela automáticamente**

Todo esto corre diario a las 6am sin intervención manual.

**Configuración actual de Tyger Dragon:**
- 3 días de gracia después del vencimiento
- 30 días en adeudo antes de cancelar

Cuando un miembro con adeudo paga, su membresía se reactiva desde la fecha que debía (no desde el día que pagó, para que no se beneficie de pagar tarde).

---

## Vista del Miembro

Cada miembro tiene su propio dashboard en **tygerdragon.gymni.mx/dashboard**:
- Estado de su membresía: "Al corriente" o "Pago pendiente: $X"
- Fecha de vencimiento
- Código QR para check-in
- Puede cambiar su contraseña

---

## Notificaciones por Email

El sistema envía emails automáticos:
- **Bienvenida** al registrarse
- **Renovación** cuando se genera nueva factura
- **Adeudo** cuando pasa la fecha límite de pago
- **Cancelación** cuando se cancela por falta de pago
- **Invitaciones de staff** con link de registro
- **Recuperación de contraseña**

---

## Datos Técnicos (por si pregunta)

- Funciona desde cualquier navegador, es responsive (celular, tablet, desktop)
- Cada gym tiene su subdominio propio (tygerdragon.gymni.mx)
- Los datos están en la nube, con backups automáticos
- SSL/HTTPS en todo el sitio
- Soporte para múltiples gyms en la misma plataforma

---

## Próximos Pasos (post-MVP)

- Cobro automático con tarjeta (Stripe)
- Reportes y exportación de datos (CSV)
- App móvil / PWA
- Más estadísticas y gráficas en el dashboard
