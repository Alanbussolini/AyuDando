from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import csv
import io
import datetime
import statistics
import os
from typing import List, Optional

app = FastAPI(title="ONG Donaciones & Anti-Licuación API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global store for current dataset in memory: list of dicts
current_records = []

def load_default_data():
    global current_records
    try:
        sample_path = os.path.join(os.path.dirname(__file__), "sample_donations.csv")
        if os.path.exists(sample_path):
            with open(sample_path, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                records = []
                for row in reader:
                    records.append({
                        "Nombre": row.get("Nombre", "").strip(),
                        "Email": row.get("Email", "").strip(),
                        "Fecha": row.get("Fecha", "").strip(),
                        "Monto": float(row.get("Monto", 0))
                    })
                current_records = records
    except Exception as e:
        print("Error loading default data:", e)

load_default_data()

class InflationRequest(BaseModel):
    monthly_inflation_rate: float
    months: int = 12

class CampaignRequest(BaseModel):
    emails: Optional[List[str]] = None
    threshold: float = 2000.0

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    global current_records
    contents = await file.read()
    try:
        decoded = contents.decode('utf-8', errors='ignore')
        f = io.StringIO(decoded)
        reader = csv.DictReader(f)
        
        rows = []
        for row in reader:
            # Normalize keys
            norm_row = {}
            for k, v in row.items():
                if not k:
                    continue
                k_lower = k.strip().lower()
                if 'nombre' in k_lower or 'donor' in k_lower or 'donante' in k_lower:
                    norm_row['Nombre'] = v.strip()
                elif 'email' in k_lower or 'correo' in k_lower:
                    norm_row['Email'] = v.strip()
                elif 'fecha' in k_lower or 'date' in k_lower or 'dia' in k_lower:
                    norm_row['Fecha'] = v.strip()
                elif 'monto' in k_lower or 'amount' in k_lower or 'importe' in k_lower or 'cuota' in k_lower:
                    try:
                        norm_row['Monto'] = float(v.strip())
                    except:
                        norm_row['Monto'] = 0.0
            
            if 'Nombre' in norm_row and 'Email' in norm_row and 'Fecha' in norm_row and 'Monto' in norm_row:
                rows.append(norm_row)
        
        if not rows:
            raise HTTPException(status_code=400, detail="No se pudieron parsear filas válidas. Verifique el formato CSV.")
        
        current_records = rows
        return {"status": "success", "rows_imported": len(rows), "message": "Archivo procesado exitosamente."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/dashboard")
def get_dashboard_metrics():
    global current_records
    if not current_records:
        return {
            "total_donors": 0,
            "total_nominal": 0.0,
            "average_ticket": 0.0,
            "threshold_outlier": 0.0,
            "outliers_count": 0,
            "outliers": [],
            "monthly_evolution": [],
            "donors_summary": []
        }
    
    unique_emails = set(r['Email'] for r in current_records)
    total_donors = len(unique_emails)
    total_nominal = sum(r['Monto'] for r in current_records)
    average_ticket = total_nominal / len(current_records) if current_records else 0.0
    
    # Monthly aggregation
    monthly_map = {}
    for r in current_records:
        fecha_str = r['Fecha']
        mes = fecha_str[:7] if len(fecha_str) >= 7 else "2026-01"
        if mes not in monthly_map:
            monthly_map[mes] = {"recaudacion": 0.0, "emails": set(), "montos": []}
        monthly_map[mes]["recaudacion"] += r['Monto']
        monthly_map[mes]["emails"].add(r['Email'])
        monthly_map[mes]["montos"].append(r['Monto'])
    
    monthly_evolution = []
    for mes in sorted(monthly_map.keys()):
        data = monthly_map[mes]
        ticket_prom = sum(data["montos"]) / len(data["montos"]) if data["montos"] else 0.0
        monthly_evolution.append({
            "Mes": mes,
            "recaudacion": data["recaudacion"],
            "donantes": len(data["emails"]),
            "ticket_promedio": ticket_prom
        })
    
    # Latest donation per donor for outlier analysis
    donor_latest = {}
    for r in sorted(current_records, key=lambda x: x['Fecha']):
        donor_latest[r['Email']] = r
    
    latest_list = list(donor_latest.values())
    montos = sorted([d['Monto'] for d in latest_list])
    
    q1 = montos[int(len(montos) * 0.25)] if montos else 0.0
    median_val = statistics.median(montos) if montos else 0.0
    threshold = max(q1 * 0.8, median_val * 0.3, 2000.0)
    
    outliers = [d for d in latest_list if d['Monto'] <= threshold]
    
    return {
        "total_donors": total_donors,
        "total_nominal": total_nominal,
        "average_ticket": average_ticket,
        "threshold_outlier": threshold,
        "outliers_count": len(outliers),
        "outliers": outliers,
        "monthly_evolution": monthly_evolution,
        "donors_summary": latest_list
    }

@app.post("/api/inflation-simulation")
def simulate_inflation(req: InflationRequest):
    global current_records
    base_amount = sum(r['Monto'] for r in current_records) if current_records else 1000000.0
    
    rate = req.monthly_inflation_rate / 100.0
    months = req.months
    
    simulation = []
    current_nominal = base_amount
    cumulative_inflation = 1.0
    
    for m in range(months + 1):
        month_label = f"Mes {m}"
        if m == 0:
            simulation.append({
                "mes": month_label,
                "nominal": round(current_nominal, 2),
                "real": round(current_nominal, 2),
                "poder_adquisitivo_pct": 100.0
            })
        else:
            cumulative_inflation *= (1 + rate)
            real_val = base_amount / cumulative_inflation
            purchasing_power = (real_val / base_amount) * 100.0
            simulation.append({
                "mes": month_label,
                "nominal": round(base_amount, 2),
                "real": round(real_val, 2),
                "poder_adquisitivo_pct": round(purchasing_power, 2)
            })
            
    return {
        "base_amount": base_amount,
        "monthly_rate": req.monthly_inflation_rate,
        "simulation": simulation
    }

@app.post("/api/send-campaign")
def send_campaign(emails: List[str]):
    simulated_results = []
    for email in emails:
        simulated_results.append({
            "email": email,
            "status": "enviado",
            "timestamp": datetime.datetime.now().isoformat(),
            "provider": "SendGrid / Resend API (Simulado)"
        })
    return {
        "status": "success",
        "total_sent": len(simulated_results),
        "details": simulated_results,
        "message": f"Campaña de actualización disparada exitosamente a {len(simulated_results)} donantes con cuotas rezagadas."
    }
