# AyuDando MVP - Plataforma Web para ONGs (Gestión de Donantes & Anti-Licuación)

Plataforma web interna diseñada para organizaciones no gubernamentales (ONGs) con el objetivo de gestionar los aportes de donantes fijos mensuales, automatizar el análisis financiero, detectar cuotas rezagadas por inflación (outliers) y disparar campañas de actualización de aportes.

---

## 🏗️ Propuesta de Stack Tecnológico

1. **Frontend**: 
   - **React / Vite**: Interfaz de usuario rápida, moderna y reactiva.
   - **Tailwind CSS**: Diseño UI profesional y adaptable (Responsive Design).
   - **Recharts**: Visualización interactiva de gráficos financieros (recaudación mensual, evolución de donantes y simulación de inflación).
   - **Lucide Icons**: Iconografía moderna para cuadros de mando y tarjetas "Big Numbers".

2. **Backend**:
   - **Python / FastAPI**: Alto rendimiento, tipado estático con Pydantic, ideal para procesamiento de datos analíticos.
   - **Pandas & NumPy**: Parseo robusto de archivos CSV/Excel (extractos bancarios o pasarelas de pago como MercadoPago/Stripe) y cálculo estadístico de outliers e índices inflacionarios.

3. **Base de Datos & Almacenamiento (MVP)**:
   - Procesamiento en memoria con persistencia opcional en SQLite / PostgreSQL para entornos productivos.

---

## 🚀 Módulos Principales e Implementación

### 1. Módulo de Carga de Datos (Drag & Drop)
- Permite arrastrar y soltar archivos CSV o Excel con columnas clave: `Nombre`, `Email`, `Fecha`, `Monto`.
- Normalización automática de nombres de columnas y validación de tipos de datos.

### 2. Motor de Análisis (Ticket Promedio & Outliers)
- Calcula automáticamente el **Ticket Promedio** mensual y la evolución de recaudación.
- **Algoritmo de Detección de Outliers**: Identifica aportes anormalmente bajos (cuotas históricas estancadas rezagadas por la inflación) usando análisis de percentiles y desviación respecto a la mediana.

### 3. Módulo de Notificaciones (Campañas de Actualización)
- Selección de donantes con cuotas críticas y simulación de disparo masivo de emails personalizados (integrable con SendGrid, Resend o SMTP corporativo).

### 4. Módulo Financiero (Ajuste por Inflación)
- Simulador interactivo donde la ONG ingresa la tasa de inflación mensual estimada y visualiza la curva de pérdida de poder adquisitivo (**Monto Nominal vs. Monto Real Ajustado**).

### 5. Dashboard / Cuadro de Mando ("Big Numbers")
- Tarjetas resumen con Total de Donantes, Recaudación Nominal, Ticket Promedio y Alertas de Cuotas Rezagadas.

---

## 🛠️ Instrucciones de Ejecución Local

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv venv
# En Windows:
venv\Scripts\activate
# En Mac/Linux:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
La aplicación web estará disponible en `http://localhost:3000` (con proxy automático hacia el backend en el puerto 8000).

---

## ☁️ Despliegue en Vercel

Para desplegar la plataforma en **Vercel** en pocos minutos:

1. Sube tu repositorio a **GitHub**.
2. Inicia sesión en [Vercel](https://vercel.com) y haz clic en **"Add New..." -> "Project"**.
3. Importa tu repositorio de GitHub.
4. Configura el proyecto:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Haz clic en **Deploy**. 

*(Nota: Para el backend en producción, puedes desplegar la API de Python en Render, Railway o Fly.io e indicar la URL de tu API en el frontend).*
