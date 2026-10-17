"""Exporta los datos reales del modelo y del simulador a JSON para el dashboard.

Uso (desde la raíz de FIRA, con los otros dos repos clonados al lado):

    python scripts/exportar_datos.py --modelo ../RendimientoCebada --simulador ../SimuladorBiofisico

Escribe en public/data/ (ver docs/CONTRATO_DASHBOARD.md):

    meta.json                     métricas del modelo, intervalos, fecha de generación
    parcelas.json                 197 parcelas: identificación, predicción, descomposición, terreno, fenología
    parcelas.geojson              polígonos simplificados
    ndvi.json                     serie NDVI de Sentinel-2 por parcela (malla de 5 días)
    simulador/variables.json      12 variables + extras + fechas clave por parcela (escenario base)
    simulador/sensibilidad.json   resumen del análisis de sensibilidad
    simulador/params.json         parámetros del simulador (configs/params.yaml)
    simulador/diario/<ID>.json    entradas diarias del motor por parcela (para el Explorador)

Reglas:
- No se inventa ningún valor: todo sale de un archivo de los repos fuente.
- El script verifica que reproduce las 59 predicciones publicadas (predicciones_59.csv). Si no, se detiene.
- Para las parcelas de ENTRENAMIENTO, la descomposición prior + corrección se calcula dejando fuera
  la propia parcela (se ajusta con las otras 137). Se guarda también la predicción de validación
  cruzada (pred_cv) que usan las métricas de meta.json.
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yaml

RAIZ = Path(__file__).resolve().parents[1]
DATASET = "DataSet/DATASET_RETO_AGRO_2026/"
VARIABLES_12 = [
    "GDD_antesis", "GDD_llenado", "DAP_antesis_est", "ETo_acum", "ETa_acum",
    "Deficit_Hidrico_Total", "KS_prom_antesis", "KS_prom_llenado", "fPAR_integrado",
    "Biomasa_Antesis_Sim", "Biomasa_Total_Sim", "HI_penalizado",
]
EXTRAS = ["Deficit_ETc", "ciclo_incompleto", "caida_fpar_no_alcanzada"]


def r(x, nd=4):
    """Redondea y convierte NaN en None para JSON."""
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return None
    if isinstance(x, (bool, np.bool_)):
        return bool(x)
    if isinstance(x, (int, np.integer)):
        return int(x)
    return round(float(x), nd)


def escribir(ruta: Path, obj):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  {ruta.relative_to(RAIZ)}  ({ruta.stat().st_size / 1024:.0f} KB)")


# ---------------------------------------------------------------- modelo
def exportar_modelo(dir_modelo: Path, salida: Path):
    sys.path.insert(0, str(dir_modelo))
    from modelo_lib import Y, ajustar, prior_mun, prior_vec, predecir   # código del repo RendimientoCebada

    meta = json.loads((dir_modelo / "app_data/meta.json").read_text(encoding="utf-8"))
    cols = meta["cols"]

    # Tabla maestra: mismo armado que Baseline.py + fenología de train_save.py
    base = pd.read_csv(dir_modelo / DATASET / "ID_area_rendimiento_70_30_Reto_AgroCebada.csv", encoding="utf-8-sig")
    base = base.loc[:, ~base.columns.str.startswith("Unnamed")]
    sat = pd.read_csv(dir_modelo / "features_satelitales.csv")
    geo = pd.read_csv(dir_modelo / "geo_features.csv")
    fen = pd.read_csv(dir_modelo / "fenologia_features.csv")
    fen["ciclo_sin_senescencia_s2"] = fen["sen50_doy_s2"].isna().astype(int)
    df = (base.merge(sat, on="ID_POLIGONO", how="left").merge(geo, on="ID_POLIGONO", how="left")
              .merge(fen, on="ID_POLIGONO", how="left"))
    assert len(df) == 197, len(df)
    faltan = [c for c in cols if c not in df.columns]
    assert not faltan, f"Faltan columnas del modelo: {faltan}"

    train = df[df["CONJUNTO"] == "ENTRENAMIENTO"].reset_index(drop=True)
    test = df[df["CONJUNTO"] == "PREDICCION"].reset_index(drop=True)

    # 1. Predicción: reproduce predicciones_59.csv
    pred, prior, corr = predecir(train, test, cols)
    pm_te = prior_mun(train, test)[1]
    pv_te = prior_vec(train, test)[1]
    pub = pd.read_csv(dir_modelo / "predicciones_59.csv").set_index("ID_POLIGONO")
    dif = np.abs(pub.loc[test["ID_POLIGONO"], "PREDICCION"].to_numpy() - pred).max()
    assert dif < 1e-6, f"No se reproducen las predicciones publicadas (diferencia máx. {dif})"
    print(f"Predicción: reproduce predicciones_59.csv (dif. máx. {dif:.1e}); "
          f"corrección entre {corr.min():+.3f} y {corr.max():+.3f} t/ha")

    # 2. Entrenamiento: descomposición dejando fuera la propia parcela
    filas_loo = []
    for i in range(len(train)):
        dtr, dte = train.drop(index=i), train.iloc[[i]]
        p, pr, c = predecir(dtr, dte, cols)
        filas_loo.append((p[0], prior_mun(dtr, dte)[1][0], prior_vec(dtr, dte)[1][0], c[0]))
    loo = np.array(filas_loo)
    oof = pd.read_csv(dir_modelo / "oof_train.csv").set_index("ID_POLIGONO")["oof_pred"]
    print(f"Entrenamiento: |pred_loo - pred_cv| mediana {np.median(np.abs(loo[:, 0] - oof.loc[train['ID_POLIGONO']].to_numpy())):.3f} t/ha")

    n_mun = train["Municipio"].value_counts()
    media_mun = train.groupby("Municipio")[Y].mean()

    filas = []
    for conj, d, comp in (("PREDICCION", test, np.c_[pred, pm_te, pv_te, corr]),
                          ("ENTRENAMIENTO", train, loo)):
        for k, (_, f) in enumerate(d.iterrows()):
            p, pm, pv, c = comp[k]
            n_ent = int(n_mun.get(f["Municipio"], 0))
            filas.append({
                "id": f["ID_POLIGONO"], "conjunto": conj, "estado": f["Estado"], "municipio": f["Municipio"],
                "lat": r(f["lat"], 6), "lon": r(f["lon"], 6), "area_ha": r(f["area_ha_geom"], 3),
                "n_entren_municipio": n_ent, "confianza": "baja" if n_ent < 3 else "estandar",
                "pred": r(p), "prior_mun": r(pm), "prior_vec": r(pv), "prior": r((pm + pv) / 2), "corr": r(c),
                "real": r(f[Y]) if conj == "ENTRENAMIENTO" else None,
                "pred_cv": r(oof[f["ID_POLIGONO"]]) if conj == "ENTRENAMIENTO" else None,
                "media_municipio_entren": r(media_mun.get(f["Municipio"], np.nan)),
                "elev_mean": r(f["elev_mean"], 1), "pend_mean": r(f["pend_mean"], 2),
                "compacidad": r(f["compacidad"]), "elong": r(f["elong"]),
                "ndvi_p95_s2": r(f["ndvi_p95_s2"]), "ndvi_doy_pico_s2": r(f["ndvi_doy_pico_s2"], 0),
                "gu50_doy_s2": r(f["gu50_doy_s2"], 0), "sen50_doy_s2": r(f["sen50_doy_s2"], 0),
                "dur50_dias_s2": r(f["dur50_dias_s2"], 0), "dias_sobre90_s2": r(f["dias_sobre90_s2"], 0),
            })
    filas.sort(key=lambda x: x["id"])
    escribir(salida / "parcelas.json", filas)

    # 3. "¿Qué pasaría si…?": corrección ridge final (138 parcelas) exportada como coeficientes.
    #    La corrección es lineal: corr = intercepto + Σ coef_j · (x_j − media_j) / escala_j,
    #    con x_j faltante → mediana_j. El navegador la evalúa sin Python.
    final = ajustar(train, cols)
    imp, esc, ridge = final.named_steps["simpleimputer"], final.named_steps["standardscaler"], final.named_steps["ridgecv"]
    modelo_js = {
        "fuente": "RC/modelo_lib.py: ajustar(entrenamiento, cols) con las 138 parcelas",
        "cols": cols, "medianas": imp.statistics_.tolist(), "medias": esc.mean_.tolist(),
        "escalas": esc.scale_.tolist(), "coef": ridge.coef_.tolist(), "intercepto": float(ridge.intercept_),
        "alpha": float(ridge.alpha_),
    }
    def corr_js(X):
        X = np.where(np.isnan(X), imp.statistics_, X)
        return modelo_js["intercepto"] + ((X - esc.mean_) / esc.scale_) @ ridge.coef_
    dif = np.abs(corr_js(test[cols].to_numpy(float)) - final.predict(test[cols])).max()
    assert dif < 1e-9, f"La corrección lineal no reproduce sklearn (dif. máx. {dif})"
    dif = np.abs(prior + corr_js(test[cols].to_numpy(float)) - pred).max()
    assert dif < 1e-9, f"prior + corrección lineal no reproduce la predicción (dif. máx. {dif})"
    print(f"¿Qué pasaría si…?: la fórmula lineal reproduce sklearn (alpha = {ridge.alpha_:.1f})")
    escribir(salida / "modelo/ridge.json", modelo_js)
    escribir(salida / "modelo/variables.json", {
        "cols": cols,
        "valores": {f["ID_POLIGONO"]: [r(f[c], 6) for c in cols] for _, f in df.iterrows()},
    })

    escribir(salida / "meta.json", {
        "generado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fuente": "RendimientoCebada/app_data/meta.json",
        "config": meta["config"], "n_variables": len(cols), "n_train": meta["n_train"], "n_pred": meta["n_pred"],
        "q80": r(meta["q80"]), "q90": r(meta["q90"]),
        "media_general_entren": r(train[Y].mean()),
        "cv_aleatorio": {k: r(v) for k, v in meta["cv_aleatorio"].items()},
        "cv_espacial": {k: r(v) for k, v in meta["cv_espacial"].items()},
        "rmse_media_global": r(meta["rmse_media_global"]),
    })

    gj = json.loads((dir_modelo / "app_data/parcelas.geojson").read_text(encoding="utf-8"))
    gj = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": {"id": f["properties"]["ID_POLIGONO"]}, "geometry": f["geometry"]}
        for f in gj["features"]]}
    escribir(salida / "parcelas.geojson", gj)

    s = pd.read_csv(dir_modelo / "serie_s2.csv", usecols=["ID_POLIGONO", "fecha", "ndvi_promedio"])
    fechas = sorted(s["fecha"].unique())
    piv = s.pivot(index="ID_POLIGONO", columns="fecha", values="ndvi_promedio").reindex(columns=fechas)
    escribir(salida / "ndvi.json", {"fechas": fechas,
                                    "serie": {i: [r(v, 3) for v in fila] for i, fila in piv.iterrows()}})


# ---------------------------------------------------------------- simulador
def exportar_simulador(dir_sim: Path, salida: Path):
    sys.path.insert(0, str(dir_sim / "src"))
    from simulador.pipeline import correr   # código del repo SimuladorBiofisico

    diario, variables = correr(str(dir_sim))
    publicado = pd.read_csv(dir_sim / "data/processed/biofisicas_197_parcelas.csv").set_index("ID_parcela")
    dif = (variables.set_index("ID_POLIGON")[VARIABLES_12] - publicado[VARIABLES_12]).abs().max().max()
    assert dif < 1e-6, f"El pipeline no reproduce biofisicas_197_parcelas.csv (dif. máx. {dif})"
    print(f"Simulador: reproduce biofisicas_197_parcelas.csv (dif. máx. {dif:.1e})")

    base = pd.read_csv(dir_sim / "data/processed/parcelas_base.csv").set_index("ID_POLIGON")
    fechas = diario.drop_duplicates("ID_POLIGON").set_index("ID_POLIGON")

    filas = []
    for _, v in variables.iterrows():
        i = v["ID_POLIGON"]
        b, fc = base.loc[i], fechas.loc[i]
        filas.append({
            "id": i,
            **{k: r(v[k]) for k in VARIABLES_12}, **{k: r(v[k]) for k in EXTRAS},
            "fecha_siembra": str(b["fecha_siembra"]), "fecha_siembra_A": str(b["fecha_siembra_A"]),
            "fecha_siembra_B": str(b["fecha_siembra_B"]), "doble_ciclo": bool(b["doble_ciclo"]),
            "fecha_sos": str(b["fecha_sos"]), "fecha_pico": str(b["fecha_pico"]),
            "fecha_antesis": pd.Timestamp(fc["fecha_antesis"]).strftime("%Y-%m-%d"),
            "fecha_madurez": pd.Timestamp(fc["fecha_madurez"]).strftime("%Y-%m-%d"),
        })
    escribir(salida / "simulador/variables.json", filas)

    sens = pd.read_csv(dir_sim / "data/processed/sensibilidad_resumen.csv")
    escribir(salida / "simulador/sensibilidad.json", [
        {"escenario": f["escenario"], "grupo": f["grupo"], "etiqueta": f["etiqueta"], "variable": f["variable"],
         "cambio_mediano_pct": r(f["cambio_mediano_pct"], 2), "rho_spearman": r(f["rho_spearman"], 3)}
        for _, f in sens.iterrows()])

    params = yaml.safe_load((dir_sim / "configs/params.yaml").read_text(encoding="utf-8"))
    escribir(salida / "simulador/params.json", params)

    # Entradas del motor del navegador: salidas de M1 (clima ya procesado) + fPAR + suelo
    d = diario.sort_values(["ID_POLIGON", "fecha"])
    n = 0
    for i, g in d.groupby("ID_POLIGON", sort=True):
        b = base.loc[i]
        obj = {
            "id": i, "inicio": pd.Timestamp(g["fecha"].iloc[0]).strftime("%Y-%m-%d"), "n_dias": len(g),
            "suelo": {"FC_mm": r(b["FC_mm"]), "PWP_mm": r(b["PWP_mm"]), "AWC_mm": r(b["AWC_mm"])},
            **{c: [r(x, 4) for x in g[c]] for c in ("tmean", "pcp", "par", "eto", "fapar_final")},
        }
        (salida / "simulador/diario").mkdir(parents=True, exist_ok=True)
        (salida / f"simulador/diario/{i}.json").write_text(
            json.dumps(obj, separators=(",", ":")), encoding="utf-8")
        n += 1
    print(f"  public/data/simulador/diario/  ({n} archivos)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--modelo", default="../RendimientoCebada", help="ruta al repo RendimientoCebada")
    ap.add_argument("--simulador", default="../SimuladorBiofisico", help="ruta al repo SimuladorBiofisico")
    ap.add_argument("--salida", default=str(RAIZ / "public/data"))
    a = ap.parse_args()
    salida = Path(a.salida).resolve()
    print("Exportando a", salida)
    exportar_modelo(Path(a.modelo).resolve(), salida)
    exportar_simulador(Path(a.simulador).resolve(), salida)
    print("Listo.")
