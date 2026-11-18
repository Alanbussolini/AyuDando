# Informe Técnico y de Desarrollo: AyuDando MVP

## 1. Solicitud y Pedido Inicial del Proyecto
El requerimiento inicial consistió en el diseño, desarrollo e implementación de **AyuDando**, una plataforma integral y moderna orientada a **ONGs y fundaciones**, cuyo objetivo principal es combatir la licuación de los aportes recurrentes de los donantes debido a la inflación, gestionar extractos bancarios en CSV, detectar cuotas rezagadas (outliers), disparar campañas de actualización de aportes y ofrecer análisis financieros avanzados con exportación de informes en PDF.

---

## 2. Lenguajes de Programación y Stack Tecnológico
La aplicación está construida utilizando una arquitectura moderna Full Stack:
- **Frontend**: 
  - **React (v18)**: Librería principal para la interfaz de usuario basada en componentes reactivos y hooks de estado.
  - **Vite (v5)**: Entorno de desarrollo rápido y empaquetador para producción.
  - **Tailwind CSS (v3)**: Framework de utilidades CSS para un diseño visual moderno, limpio y responsive.
  - **Recharts (v2)**: Librería para gráficos estadísticos interactivos (áreas, barras y líneas).
  - **Lucide React**: Sistema de iconografía moderna.
- **Backend / Procesamiento**:
  - **Python (Flask)**: Estructura base para APIs en el backend (`backend/server.py`, `backend/main.py`).
  - **JavaScript / HTML5 API**: Procesamiento robusto de archivos CSV en el cliente (FileReader) y simulación de envío de campañas de email (SendGrid/Resend API).
- **Despliegue e Infraestructura**:
  - **Vercel**: Plataforma cloud para hosting y despliegues continuos (`vercel.json`), optimizada para aplicaciones Vite/React.

---

## 3. Detalle de Funcionamiento por Módulo / Pestaña

### A. Dashboard (Cuadro de Mando General)
- **Métricas Principales (KPIs)**: Tarjetas de alto impacto visual que muestran el Total de Donantes activos, Recaudación Nominal total, Ticket Promedio y Cuotas Rezagadas detectadas.
- **Gráficos Estadísticos**: 
  - Evolución de Recaudación Mensual (Gráfico de área).
  - Evolución de Donantes Activos (Gráfico de barras).
- **Exportación a PDF**: Botón interactivo *"Descargar Informe PDF"* que activa los estilos de impresión optimizados (`@media print`) para generar un reporte ejecutivo listo para guardar como PDF sin elementos de navegación.

### B. Módulo de Carga de Datos
- Permite arrastrar y soltar (Drag & Drop) o seleccionar mediante explorador archivos **CSV** de extractos bancarios o pasarelas de pago.
- Valida automáticamente las columnas requeridas (*Nombre del donante, Email, Fecha, Monto aportado*) y procesa los datos en tiempo real actualizando todo el cuadro de mando.

### C. Outliers & Campañas (Cuotas Rezagadas)
- Analiza la distribución de aportes mediante algoritmos estadísticos (cuartiles y mediana) para identificar aquellos donantes cuyas cuotas se han desfasado o licuado.
- Muestra una tabla detallada con los donantes en estado crítico y un botón para **Disparar Campaña de Actualización** de cuotas de manera automatizada.

### D. Módulo Financiero: Inflación Acumulada & Evolución de Aportes
- **Casillero Numérico Editable**: Permite ingresar la **Inflación Acumulada del Periodo (%)** (con un rango desde -5% para deflación hasta +300%).
- **Selector de Periodo**: Permite seleccionar el horizonte temporal de análisis (**3, 6, 12, 18, 24 o 36 meses**).
- **Gráfico Comparativo**: Compara visualmente los **Aportes Nominales** frente al **Valor Real Ajustado por Inflación Acumulada**, mostrando la pérdida de poder adquisitivo mes a mes.

---

## 4. Detalles del Despliegue en Producción
- **Plataforma**: Vercel (`https://ayu-dando.vercel.app`).
- **Configuración (`vercel.json`)**: Configurado con el framework `vite`, comando de compilación (`cd frontend && npm install && npm run build`), directorio de salida (`frontend/dist`) y redirección de rutas Single Page Application (SPA).
- **Identidad Visual**: Favicon personalizado optimizado (`faviocnnnnv222n.png`) y título institucional (*AyuDando*).
