import http.server
import socketserver
import json
import urllib.parse
import csv
import io
import datetime
import statistics
import os

PORT = 8000
DATA_FILE = os.path.join(os.path.dirname(__file__), "sample_donations.csv")

# In-memory dataset
current_records = []

def load_default_data():
    global current_records
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, mode='r', encoding='utf-8') as f:
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

class APIHandler(http.server.BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        if parsed_path.path == '/api/dashboard':
            data = get_dashboard_metrics()
            self._set_headers(200)
            self.wfile.write(json.dumps(data).encode('utf-8'))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode('utf-8'))

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        if parsed_path.path == '/api/inflation-simulation':
            try:
                req = json.loads(body.decode('utf-8'))
                rate = float(req.get('monthly_inflation_rate', 4.5)) / 100.0
                months = int(req.get('months', 12))
                base_amount = sum(r['Monto'] for r in current_records) if current_records else 1000000.0
                
                simulation = []
                cumulative_inflation = 1.0
                for m in range(months + 1):
                    month_label = f"Mes {m}"
                    if m == 0:
                        simulation.append({"mes": month_label, "nominal": round(base_amount, 2), "real": round(base_amount, 2), "poder_adquisitivo_pct": 100.0})
                    else:
                        cumulative_inflation *= (1 + rate)
                        real_val = base_amount / cumulative_inflation
                        purchasing_power = (real_val / base_amount) * 100.0
                        simulation.append({"mes": month_label, "nominal": round(base_amount, 2), "real": round(real_val, 2), "poder_adquisitivo_pct": round(purchasing_power, 2)})
                
                resp = {"base_amount": base_amount, "monthly_rate": rate * 100, "simulation": simulation}
                self._set_headers(200)
                self.wfile.write(json.dumps(resp).encode('utf-8'))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

        elif parsed_path.path == '/api/send-campaign':
            try:
                emails = json.loads(body.decode('utf-8'))
                results = [{"email": e, "status": "enviado", "timestamp": datetime.datetime.now().isoformat(), "provider": "SendGrid / Resend API (Simulado)"} for e in emails]
                resp = {"status": "success", "total_sent": len(results), "details": results, "message": f"Campaña disparada a {len(results)} donantes."}
                self._set_headers(200)
                self.wfile.write(json.dumps(resp).encode('utf-8'))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

        elif parsed_path.path == '/api/upload':
            # Simple multipart CSV extractor or raw body
            try:
                # If uploaded as raw text or multipart
                content_type = self.headers.get('Content-Type', '')
                csv_text = ""
                if 'multipart/form-data' in content_type:
                    # extract csv content from multipart bytes
                    parts = body.split(b'\r\n')
                    for i, p in enumerate(parts):
                        if b'filename=' in p or b'Content-Disposition:' in p:
                            # find content after double newline
                            for j in range(i+1, len(parts)):
                                if parts[j] == b'' and j+1 < len(parts):
                                    csv_text = parts[j+1].decode('utf-8', errors='ignore')
                                    break
                    if not csv_text:
                        csv_text = body.decode('utf-8', errors='ignore')
                else:
                    csv_text = body.decode('utf-8', errors='ignore')

                f = io.StringIO(csv_text)
                reader = csv.DictReader(f)
                rows = []
                for row in reader:
                    norm_row = {}
                    for k, v in row.items():
                        if not k: continue
                        k_lower = k.strip().lower()
                        if 'nombre' in k_lower or 'donor' in k_lower or 'donante' in k_lower:
                            norm_row['Nombre'] = v.strip()
                        elif 'email' in k_lower or 'correo' in k_lower:
                            norm_row['Email'] = v.strip()
                        elif 'fecha' in k_lower or 'date' in k_lower or 'dia' in k_lower:
                            norm_row['Fecha'] = v.strip()
                        elif 'monto' in k_lower or 'amount' in k_lower or 'importe' in k_lower or 'cuota' in k_lower:
                            try: norm_row['Monto'] = float(v.strip())
                            except: norm_row['Monto'] = 0.0
                    if 'Nombre' in norm_row and 'Email' in norm_row and 'Fecha' in norm_row and 'Monto' in norm_row:
                        rows.append(norm_row)
                
                if rows:
                    global current_records
                    current_records = rows
                    self._set_headers(200)
                    self.wfile.write(json.dumps({"status": "success", "rows_imported": len(rows), "message": "Archivo procesado con éxito."}).encode('utf-8'))
                else:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({"detail": "No se encontraron filas válidas en el CSV."}).encode('utf-8'))
            except Exception as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({"detail": str(e)}).encode('utf-8'))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode('utf-8'))

def get_dashboard_metrics():
    if not current_records:
        return {"total_donors": 0, "total_nominal": 0.0, "average_ticket": 0.0, "threshold_outlier": 0.0, "outliers_count": 0, "outliers": [], "monthly_evolution": [], "donors_summary": []}
    
    unique_emails = set(r['Email'] for r in current_records)
    total_donors = len(unique_emails)
    total_nominal = sum(r['Monto'] for r in current_records)
    average_ticket = total_nominal / len(current_records)
    
    monthly_map = {}
    for r in current_records:
        mes = r['Fecha'][:7] if len(r['Fecha']) >= 7 else "2026-01"
        if mes not in monthly_map:
            monthly_map[mes] = {"recaudacion": 0.0, "emails": set(), "montos": []}
        monthly_map[mes]["recaudacion"] += r['Monto']
        monthly_map[mes]["emails"].add(r['Email'])
        monthly_map[mes]["montos"].append(r['Monto'])
    
    monthly_evolution = []
    for mes in sorted(monthly_map.keys()):
        d = monthly_map[mes]
        t_prom = sum(d["montos"]) / len(d["montos"]) if d["montos"] else 0.0
        monthly_evolution.append({"Mes": mes, "recaudacion": d["recaudacion"], "donantes": len(d["emails"]), "ticket_promedio": t_prom})
    
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

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), APIHandler) as httpd:
        print(f"Servidor backend corriendo en http://localhost:{PORT}")
        httpd.serve_forever()
