import json
from pathlib import Path

import folium
import joblib
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from branca.colormap import LinearColormap
from streamlit_folium import st_folium

from modelo_lib import Y, prior_mun, prior_vec

DATA = Path(__file__).parent / "app_data"
st.set_page_config(page_title="AgroCebada 2026", layout="wide")


# ---------- Carga (con caché)
@st.cache_data
def cargar():
    parc = pd.read_parquet(DATA / "parcelas.parquet")
    parc["err_abs"] = (parc["pred"] - parc[Y]).abs()
    serie = pd.read_parquet(DATA / "serie_s2.parquet")
    geo = json.loads((DATA / "parcelas.geojson").read_text(encoding="utf-8"))
    meta = json.loads((DATA / "meta.json").read_text(encoding="utf-8"))
    return parc, serie, geo, meta


@st.cache_resource
def cargar_modelo():
    obj = joblib.load(DATA / "modelo.joblib")
    return obj["modelo"], obj["cols"]


parc, serie, geo, meta = cargar()
modelo, COLS = cargar_modelo()
train = parc[parc["CONJUNTO"] == "ENTRENAMIENTO"].reset_index(drop=True)
Q80, Q90 = meta["q80"], meta["q90"]


def predecir_vivo(fila, entren):
    """Ejecuta el modelo: prior (municipio + vecinos) + corrección ridge sobre los features."""
    pm = prior_mun(entren, fila)[1][0]
    pv = prior_vec(entren, fila)[1][0]
    corr = float(modelo.predict(fila[COLS])[0])
    return (pm + pv) / 2 + corr, pm, pv, corr


def mapa(d, col, titulo, sel, invertir=False):
    info = d.set_index("ID_POLIGONO")
    vals = info[col].dropna()
    vmin, vmax = (vals.min(), vals.max()) if len(vals) else (0, 1)
    colores = ["#1a9850", "#fddb7a", "#b2182b"] if invertir else ["#b2182b", "#fddb7a", "#1a9850"]
    cmap = LinearColormap(colores, vmin=vmin, vmax=max(vmax, vmin + 1e-6), caption=titulo)
    feats = []
    for f in geo["features"]:
        pid = f["properties"]["ID_POLIGONO"]
        if pid not in info.index:
            continue
        r = info.loc[pid]
        v = r[col]
        feats.append({"type": "Feature", "geometry": f["geometry"], "properties": {
            "ID_POLIGONO": pid, "Municipio": r["Municipio"], "Conjunto": r["CONJUNTO"],
            "valor": None if pd.isna(v) else float(v),
            "valor_txt": "—" if pd.isna(v) else f"{v:.2f} t/ha"}})
    m = folium.Map(location=[d["lat"].mean(), d["lon"].mean()], zoom_start=10, tiles="cartodbpositron")
    folium.GeoJson(
        {"type": "FeatureCollection", "features": feats},
        style_function=lambda ft: {
            "fillColor": cmap(ft["properties"]["valor"]) if ft["properties"]["valor"] is not None else "#9e9e9e",
            "color": "#000" if ft["properties"]["ID_POLIGONO"] == sel else "#555",
            "weight": 3 if ft["properties"]["ID_POLIGONO"] == sel else 0.6, "fillOpacity": 0.8},
        tooltip=folium.GeoJsonTooltip(fields=["ID_POLIGONO", "Municipio", "Conjunto", "valor_txt"],
                                      aliases=["Parcela", "Municipio", "Conjunto", "Valor"]),
    ).add_to(m)
    m.add_child(cmap)
    m.fit_bounds([[d["lat"].min(), d["lon"].min()], [d["lat"].max(), d["lon"].max()]])
    return m


# ---------- Filtros (barra lateral)
st.sidebar.header("Filtros")
estados = sorted(parc["Estado"].unique())
f_est = st.sidebar.multiselect("Estado", estados, default=estados)
munis = sorted(parc.loc[parc["Estado"].isin(f_est), "Municipio"].unique())
f_mun = st.sidebar.multiselect("Municipio", munis, default=munis)
f_con = st.sidebar.multiselect("Conjunto", ["ENTRENAMIENTO", "PREDICCION"], default=["ENTRENAMIENTO", "PREDICCION"])
d = parc[parc["Estado"].isin(f_est) & parc["Municipio"].isin(f_mun) & parc["CONJUNTO"].isin(f_con)]
if d.empty:
    st.warning("Ninguna parcela cumple los filtros.")
    st.stop()

ids = sorted(d["ID_POLIGONO"])
if st.session_state.get("sel_box") not in ids:
    st.session_state["sel_box"] = ids[0]
ph_sel = st.sidebar.container()   # el selector se dibuja aquí, pero se crea después de procesar el clic del mapa

st.title("🌾 Predicción de rendimiento de cebada — Reto AgroCebada 2026")
tab_mapa, tab_desemp, tab_meto = st.tabs(["Mapa y parcela", "Desempeño del modelo", "Metodología"])

# ---------- Pestaña 1: mapa y detalle
with tab_mapa:
    opcion = st.radio("Colorear por", ["Rendimiento predicho", "Rendimiento real (entrenamiento)",
                                       "Error absoluto (entrenamiento)"], horizontal=True)
    col, tit, inv = {"Rendimiento predicho": ("pred", "Rendimiento predicho (t/ha)", False),
                     "Rendimiento real (entrenamiento)": (Y, "Rendimiento real (t/ha)", False),
                     "Error absoluto (entrenamiento)": ("err_abs", "Error absoluto (t/ha)", True)}[opcion]
    salida = st_folium(mapa(d, col, tit, st.session_state["sel_box"], inv), height=520,
                       use_container_width=True, key="mapa", returned_objects=["last_active_drawing"])
    click = (salida or {}).get("last_active_drawing")
    pid_click = ((click or {}).get("properties") or {}).get("ID_POLIGONO")
    if pid_click and pid_click != st.session_state.get("ultimo_click"):
        st.session_state["ultimo_click"] = pid_click
        if pid_click in ids and pid_click != st.session_state["sel_box"]:
            st.session_state["sel_box"] = pid_click
            st.rerun()

with ph_sel:
    sel = st.selectbox("Parcela (o haz clic en el mapa)", ids, key="sel_box")

fila = parc[parc["ID_POLIGONO"] == sel].reset_index(drop=True)
r = fila.iloc[0]
entren = train[train["ID_POLIGONO"] != sel]          # el prior nunca usa la propia parcela

with tab_mapa:
    st.subheader(f"Parcela {sel}")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Estado / municipio", f"{r['Estado']}", r["Municipio"], delta_color="off")
    c2.metric("Conjunto", r["CONJUNTO"].capitalize())
    c3.metric("Superficie", f"{r['area_ha_geom']:.1f} ha")
    c4.metric("Parcelas de entrenamiento en el municipio", int(r["n_entren_municipio"]))
    if r["baja_confianza"]:
        st.warning("Confianza baja: el municipio tiene menos de 3 parcelas de entrenamiento, "
                   "por lo que el nivel estimado depende de pocos datos y de la cercanía a otras parcelas.")

    if r["CONJUNTO"] == "PREDICCION":
        pred_v, pm, pv, corr = predecir_vivo(fila, entren)
        a, b = st.columns([1, 2])
        a.metric("Rendimiento predicho", f"{pred_v:.2f} t/ha")
        a.caption(f"Intervalo 80%: {pred_v - Q80:.2f} – {pred_v + Q80:.2f} t/ha  \n"
                  f"Intervalo 90%: {pred_v - Q90:.2f} – {pred_v + Q90:.2f} t/ha")
        b.markdown(f"**Cómo se calculó (modelo ejecutado en vivo):**  \n"
                   f"Prior del municipio **{pm:.2f}** y de las 5 parcelas más cercanas **{pv:.2f}** → "
                   f"promedio **{(pm + pv) / 2:.2f}**; corrección por la fenología y el NDVI de la parcela "
                   f"**{corr:+.2f}** t/ha.")
        b.caption(f"Coincide con la predicción guardada (diferencia {abs(pred_v - r['pred']):.4f}).")
    else:
        a, b, c = st.columns(3)
        a.metric("Rendimiento real", f"{r[Y]:.2f} t/ha")
        b.metric("Predicho fuera de muestra", f"{r['pred']:.2f} t/ha")
        c.metric("Error", f"{r['pred'] - r[Y]:+.2f} t/ha")
        st.caption("Para las parcelas de entrenamiento se muestra la predicción de validación cruzada: "
                   "el modelo que la generó no vio el rendimiento de esta parcela.")

    # Curva de índice de vegetación vs. promedio del municipio
    indice = st.radio("Índice", ["ndvi_promedio", "evi_promedio"], horizontal=True,
                      format_func=lambda s: s.split("_")[0].upper())
    s_p = serie[serie["ID_POLIGONO"] == sel]
    ids_m = parc.loc[parc["Municipio"] == r["Municipio"], "ID_POLIGONO"]
    s_m = serie[serie["ID_POLIGONO"].isin(ids_m)].groupby("fecha")[indice].mean()
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=s_p["fecha"], y=s_p[indice], name=f"Parcela {sel}", line=dict(width=3)))
    fig.add_trace(go.Scatter(x=s_m.index, y=s_m.values, name=f"Promedio de {r['Municipio']}",
                             line=dict(dash="dash")))
    fig.update_layout(height=340, margin=dict(l=10, r=10, t=30, b=10), yaxis_title=indice.split("_")[0].upper(),
                      title="Serie temporal Sentinel-2, abril–octubre 2025")
    st.plotly_chart(fig, use_container_width=True)

    # Exploración Sensibilidad de la predición
    with st.expander("Explorar el modelo: ¿qué pasaría si cambian las variables de la parcela?"):
        cand = ["ndvi_p95_s2", "ndvi_p05_s2", "gu50_doy_s2", "ndvi_doy_pico_s2", "dias_sobre90_s2"]
        usar = [c for c in cand if c in COLS and parc[c].notna().any()]
        mod = fila.copy()
        for c in usar:
            lo, hi = float(parc[c].min()), float(parc[c].max())
            ini = float(r[c]) if pd.notna(r[c]) else float(parc[c].median())
            if hi > lo:
                mod.loc[0, c] = st.slider(c, lo, hi, min(max(ini, lo), hi), key=f"wi_{sel}_{c}")
        base, *_ = predecir_vivo(fila, entren)
        nuevo, *_ = predecir_vivo(mod, entren)
        x1, x2, x3 = st.columns(3)
        x1.metric("Predicción con valores originales", f"{base:.2f} t/ha")
        x2.metric("Predicción con tus valores", f"{nuevo:.2f} t/ha")
        x3.metric("Cambio", f"{nuevo - base:+.2f} t/ha")
        st.caption("Es una exploración del modelo, no un efecto causal: las variables se mueven juntas en la "
                   "realidad (por ejemplo, el NDVI máximo y el de julio), así que cambiar una sola puede "
                   "producir combinaciones poco realistas. El efecto es pequeño porque la mayor parte de la "
                   "predicción viene del nivel de rendimiento de la zona (prior).")

# ---------- Pestaña 2: desempeño
with tab_desemp:
    ca, ce = meta["cv_aleatorio"], meta["cv_espacial"]
    st.markdown("Validación cruzada sobre las 138 parcelas de entrenamiento (5 particiones × 3 repeticiones). "
                "El esquema **aleatorio** replica el reparto del reto, donde las parcelas a predecir están "
                "intercaladas con las de entrenamiento. El **espacial** deja fuera zonas completas.")
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("RMSE (aleatorio)", f"{ca['rmse']:.3f} t/ha")
    m2.metric("MAE (aleatorio)", f"{ca['mae']:.3f} t/ha")
    m3.metric("R² (aleatorio)", f"{ca['r2']:.2f}")
    m4.metric("RMSE (espacial)", f"{ce['rmse']:.3f} t/ha")
    st.dataframe(pd.DataFrame({
        "Modelo": ["Media global (referencia)", "Solo prior geográfico (municipio + vecinos)", "Modelo final"],
        "RMSE aleatorio": [meta["rmse_media_global"], ca["rmse_prior"], ca["rmse"]],
        "RMSE espacial": [np.nan, ce["rmse_prior"], ce["rmse"]]}).round(3), hide_index=True)

    tr = parc[parc["CONJUNTO"] == "ENTRENAMIENTO"]
    lim = [float(tr[[Y, "pred"]].min().min()) - 0.1, float(tr[[Y, "pred"]].max().max()) + 0.1]
    fig = px.scatter(tr, x=Y, y="pred", color="Municipio", hover_name="ID_POLIGONO",
                     labels={Y: "Rendimiento real (t/ha)", "pred": "Predicho fuera de muestra (t/ha)"})
    fig.add_trace(go.Scatter(x=lim, y=lim, mode="lines", line=dict(color="black", dash="dash"),
                             name="Predicción perfecta"))
    fig.update_layout(height=450, title="Observado vs. predicho (validación cruzada)")
    st.plotly_chart(fig, use_container_width=True)

    g = tr.groupby("Municipio").agg(Parcelas=(Y, "size"), Real_medio=(Y, "mean"),
                                    Sesgo=("pred", lambda s: (s - tr.loc[s.index, Y]).mean()),
                                    MAE=("err_abs", "mean"))
    g["Correlación interna"] = [tr[tr.Municipio == m][Y].corr(tr[tr.Municipio == m]["pred"])
                                if n >= 10 else np.nan for m, n in g["Parcelas"].items()]
    st.markdown("**Desempeño por municipio.** La correlación interna mide si el modelo distingue unas parcelas "
                "de otras *dentro* del mismo municipio (solo con 10 o más parcelas).")
    st.dataframe(g.round(2))
    st.info("Lectura honesta: el modelo estima bien el nivel de rendimiento de cada zona, apoyándose en la "
            "cercanía entre parcelas. Dentro de un mismo municipio, la correlación entre lo predicho y lo real "
            "es cercana a cero: con los datos disponibles no se detectan diferencias entre parcelas vecinas.")

# ---------- Pestaña 3: metodología
with tab_meto:
    st.markdown(f"""
### Enfoque
La predicción se construye en dos partes: **{meta['config']}**.

1. **Prior geográfico.** Estimación inicial del rendimiento: promedio de dos referencias calculadas solo con
   parcelas de entrenamiento, el rendimiento medio del municipio (suavizado hacia la media global si hay pocas
   parcelas) y el promedio de las 5 parcelas más cercanas. La propia parcela nunca participa en su prior.
2. **Corrección con teledetección.** Una regresión Ridge aprende, a partir de {len(COLS)} variables, cuánto se
   aleja cada parcela de su prior: resumen del NDVI/EVI y otros índices de Sentinel-2 (nivel, pico, área bajo la
   curva), fenología (inicio y mitad del crecimiento, duración del NDVI alto, NDVI mensual) y geometría y
   topografía (superficie, forma, elevación, pendiente).

### Datos y limpieza
Series de Sentinel-2 de abril a octubre de 2025, con nubosidad ≤ 40 %, interpoladas a una malla de 5 días solo
en huecos cortos (≤ 30 días) y suavizadas. Landsat (solo temperatura de superficie) y los conteos de
observaciones se descartaron: no mejoraron el modelo, y el conteo funcionaba como identificador de ubicación.

### Validación
Validación cruzada repetida con tres esquemas (aleatorio, por clusters espaciales y por estado). Se compara
siempre contra la media global y contra el prior geográfico solo. Los intervalos de predicción salen de los
errores de validación cruzada (80 %: ±{Q80:.2f} t/ha; 90 %: ±{Q90:.2f} t/ha).

### Componente biofísico (simulador)
Se evaluaron dos arquitecturas: simulador como variable adicional y simulador como línea base con corrección
aprendida. Ninguna mejoró de forma demostrable al modelo sin simulador (con el prior geográfico, la variante
con variables biofísicas dio +0.004 t/ha, con intervalo de confianza que incluye cero). La causa probable es que
el clima disponible (~5 km) casi no varía entre parcelas del mismo municipio. Esto vale para este simulador y
estos datos, y no descarta el enfoque con datos de mayor resolución.

### Limitaciones
- Casi todo el poder predictivo viene de la cercanía entre parcelas. En zonas sin parcelas conocidas el error
  es mayor (RMSE espacial {ce['rmse']:.2f} t/ha).
- Las parcelas de municipios con menos de 3 parcelas de entrenamiento se marcan con confianza baja.
- Los datos no incluyen fecha de siembra, variedad ni manejo, que probablemente explican la variación dentro de
  cada municipio.
- Intervalos aproximados: reflejan el error típico de validación cruzada, no una garantía por parcela.
""")