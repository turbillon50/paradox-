#!/usr/bin/env python3
"""Mide los temas de cada teoría con Pulso Neutro y acumula la serie diaria."""
import json, os, glob, datetime, urllib.request, urllib.parse, time

AQUI = os.path.dirname(os.path.abspath(__file__))
HOY = datetime.date.today().isoformat()

def medir(tema):
    u = "https://pulso-neutro.vercel.app/api/medir?t=" + urllib.parse.quote(tema)
    for intento in range(2):
        try:
            with urllib.request.urlopen(u, timeout=120) as r:
                j = json.loads(r.read().decode())
            if j.get("ok"):
                return j
        except Exception as e:
            print("  reintento", tema, e)
            time.sleep(10)
    return None

for tf in glob.glob(AQUI + "/teorias/*.json"):
    T = json.load(open(tf))
    slug = os.path.basename(tf)[:-5]
    ddir = os.path.join(AQUI, "datos", slug)
    os.makedirs(ddir, exist_ok=True)
    salida = {"fecha": HOY, "teoria": T["teoria"], "mediciones": []}
    for tema in T["temas"]:
        print("midiendo:", tema)
        m = medir(tema)
        if m:
            salida["mediciones"].append({
                "tema": tema,
                "indice_neutro": m["indice_neutro"],
                "tendencia": m["tendencia"],
                "plataformas": [{"n": p["nombre"], "i": p["intensidad"], "d": p["divergencia"], "s": p["sentimiento"]} for p in m["plataformas"]],
                "lectura": m.get("lectura", ""),
                "fuentes": [f.get("titulo", "") + " — " + f.get("medio", "") for f in m.get("fuentes", [])][:3],
            })
        time.sleep(4)
    out = os.path.join(ddir, HOY + ".json")
    json.dump(salida, open(out, "w"), ensure_ascii=False, indent=1)
    print("guardado:", out, "| temas medidos:", len(salida["mediciones"]))
