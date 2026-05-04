---
name: supply-chain-mexico
description: Contexto empresarial de Supply Chain México (3PL). Usar para entender clientes, servicios, bitácora, tarifas y flujos de trabajo.
version: 1.0.0
---

# Supply Chain México - Contexto Empresarial

## 🏢 LA EMPRESA

- **Nombre**: Supply Chain de México S.A. de C.V.
- **Fundación**: 2002 (23 años)
- **Fundador**: Manuel Díaz y socios
- **Giro**: 3PL - Almacenaje y Transporte
- **Slogan**: "Logística sin fronteras"

### Almacenes
| Código | Ciudad | Notas |
|--------|--------|-------|
| LER | Lerma, Edo. Mex | **← PILOTO DEL CRM** |
| QRO | Querétaro | 8,000 m² |
| MTY | Monterrey | 8,000 m² |
| TOL | Toluca | |
| MID | Mérida | |
| GDL | Guadalajara | |
| TUL | Tultitlán | |

### Servicios
- Almacenaje (dedicado/compartido)
- Cross-docking
- Pick & pack / Fulfillment
- Transporte nacional (flota propia + fleteras)
- Última milla
- Maniobras especiales
- Recolecciones

---

## 👥 CLIENTES ACTUALES (26)

**Fitness**: FITNESS FOR LIFE, IFIT (NordicTrack)
**Herramientas**: TOUGHBUILT
**Refrigeración**: AHT
**Retail/Moda**: LULULEMON, BURBERRY
**Tech**: EPOSNOW, MICROCOMPUTADORAS, KYNDRYL
**Salud**: ITWORKS, WORLD DIAGNOSTIC
**Alimentos**: TEQUILA ENEMIGO, CASIQUE
**Logística**: SEKO, KST
**Otros**: VERMONT YORK, GNR, BASF, LA RED, RMC, ANTONIO ZAPATA, PRINCIPLE GLOBAL, PANTANS, TARGET CONSULTING

---

## 📋 LA BITÁCORA (Sistema actual a reemplazar)

### ¿Qué es?
Excel con una hoja por cliente donde se registran operaciones diarias.

### Problema actual
- No hay visibilidad entre departamentos
- Cobranza no sabe qué facturar
- Sin historial de cambios
- Cada quien tiene su versión

### Campos de cada operación

**Identificación:**
- Referencia (SCLER00001)
- Fecha
- Estado (En proceso, Cerrada, Pendiente, Cancelada)

**Cliente:**
- Asunto Cliente (del correo)
- Ref Cliente (PT, OR)

**Operación:**
- Tipo (Entrada, Salida, Recolección, Cross dock, Actividad almacén, Flete, Maniobra)
- ¿Incluye Transporte? (Sí/No)

**Transporte (si aplica):**
- Proveedor (fletera)
- Costo Proveedor
- Factura Proveedor
- RC de Transporte (Rendición de cuenta)

**Documentos:**
- POD (Prueba de entrega)
- Evidencias (Fotos + Nota salida)
- Proforma

**Facturación:**
- Costo Cliente
- Factura Supply
- Fecha envío RC
- Fecha envío factura
- Folio de factura

**Otros:**
- Comentarios

---

## 💰 TARIFAS TÍPICAS

| Concepto | Tarifa | Unidad |
|----------|--------|--------|
| Almacenaje mensual | $103,320 MXN | Contrato |
| Posición adicional | $170 MXN | Posición/mes |
| Entrada/Salida | $78.50 MXN | Pieza |
| Maniobra | Variable | Hora/servicio |
| Transporte | Variable | Viaje/zona |

*Las tarifas varían por cliente*

### Fleteras frecuentes
- Supply Chain Consulting (flota propia)
- FELTERA TORREON
- OSARPA
- BOBADILLA

---

## 🔄 FLUJOS DE TRABAJO

### Entrada (recepción)
```
Cliente notifica → Almacén registra → Recibe mercancía → 
Sube evidencia → Cierra operación → Cobranza factura
```

### Salida (envío)
```
Cliente solicita → Servicio registra → Asigna transporte → 
Almacén prepara → Envía → Obtiene POD → Sube evidencia → 
Cierra → Si hay transporte: RC → Cobranza factura
```

### Cross-docking
```
Llega mercancía → NO se almacena → Sale mismo día/siguiente
```

---

## 📖 GLOSARIO

| Término | Significado |
|---------|-------------|
| **Proforma** | Documento previo a factura, cliente aprueba antes de facturar |
| **RC** | Rendición de Cuenta - detalle de gastos de transporte |
| **POD** | Proof of Delivery - comprobante de entrega |
| **PT / OR** | Referencias internas del cliente |
| **3PL** | Third Party Logistics - logística tercerizada |

---

## 🎯 OBJETIVO DEL CRM

1. Conectar Almacén + Servicio al Cliente + Cobranza
2. Eliminar el Excel de bitácora
3. Que Cobranza sepa automáticamente qué facturar
4. Subir evidencias fácilmente
5. Tener historial de cambios
6. Generar proformas desde el sistema
7. Funcionar en móvil para almacén

---

## 🏢 DEPARTAMENTOS

### Almacén
- Registra entradas, salidas, maniobras
- Sube evidencias (fotos)
- Marca POD

### Servicio al Cliente
- Recibe solicitudes de clientes
- Crea operaciones
- Da seguimiento
- Comunica con cliente

### Cobranza
- Genera proformas
- Emite facturas
- Registra pagos
- Controla rendiciones de cuenta

---

## 📱 IDENTIDAD VISUAL

- **Instagram**: @supplychainmexico
- **Tono**: Profesional pero cercano
- **Mensajes clave**: 
  - "23 años de experiencia"
  - "Logística sin fronteras"
  - "Impulsando la logística en México"