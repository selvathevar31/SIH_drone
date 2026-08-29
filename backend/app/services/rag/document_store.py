"""
FLUXX Environmental Knowledge Document Store

All documents in this store represent APPROVED environmental reference material.
Sources are real; no fabricated citations.
Each document has provenance metadata so the AI can cite exactly what it used.

Retrieval: keyword/tag-based matching.
Interface: IDocumentStore — can be swapped for a vector store later.
"""
from __future__ import annotations
from typing import List, Dict, Any, Optional, Protocol


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

class KnowledgeDocument:
    """A single approved environmental reference document."""

    def __init__(
        self,
        doc_id: str,
        title: str,
        content: str,
        category: str,
        tags: List[str],
        source: str,
        source_reference: str,
        version: str = "1.0",
    ):
        self.doc_id = doc_id
        self.title = title
        self.content = content
        self.category = category
        self.tags = tags
        self.source = source
        self.source_reference = source_reference
        self.version = version

    def to_dict(self) -> Dict[str, Any]:
        return {
            "document_id": self.doc_id,
            "title": self.title,
            "content": self.content,
            "category": self.category,
            "tags": self.tags,
            "source": self.source,
            "source_reference": self.source_reference,
            "version": self.version,
        }

    def to_evidence_dict(self) -> Dict[str, Any]:
        """Compact representation used in API response knowledge_sources."""
        return {
            "document_id": self.doc_id,
            "title": self.title,
            "category": self.category,
            "source": self.source,
            "source_reference": self.source_reference,
        }


# ---------------------------------------------------------------------------
# Interface
# ---------------------------------------------------------------------------

class IDocumentStore(Protocol):
    def retrieve(self, tags: List[str], limit: int = 3) -> List[KnowledgeDocument]:
        ...

    def get_by_id(self, doc_id: str) -> Optional[KnowledgeDocument]:
        ...


# ---------------------------------------------------------------------------
# Approved knowledge corpus
# ---------------------------------------------------------------------------

_DOCUMENTS: List[KnowledgeDocument] = [

    # AQI ---------------------------------------------------------------
    KnowledgeDocument(
        doc_id="aqi_categories_001",
        title="AQI Category Definitions",
        content=(
            "The Air Quality Index (AQI) translates complex air quality data into a single number "
            "with six categories. 0–50 (Good): Air quality is satisfactory with little or no risk. "
            "51–100 (Satisfactory/Moderate): Acceptable quality; some pollutants may affect very sensitive people. "
            "101–200 (Moderate/Unhealthy for Sensitive Groups): Members of sensitive groups (children, elderly, "
            "people with respiratory diseases) may experience health effects. 201–300 (Poor/Unhealthy): "
            "Everyone may begin to experience health effects. 301–400 (Very Poor/Very Unhealthy): Health alert; "
            "everyone may experience more serious health effects. 401–500 (Severe/Hazardous): Emergency conditions; "
            "entire population is more likely to be affected."
        ),
        category="air_quality",
        tags=["aqi", "categories", "index", "interpretation", "levels", "scale"],
        source="CPCB (Central Pollution Control Board, India)",
        source_reference="CPCB AQI Technical Document, 2014. https://cpcb.nic.in/",
        version="1.0",
    ),

    KnowledgeDocument(
        doc_id="aqi_health_001",
        title="AQI Health Implications",
        content=(
            "At AQI 0–50 no health effects are expected for the general population. "
            "At AQI 51–100 unusually sensitive individuals may experience mild symptoms. "
            "At AQI 101–150 active children and adults and people with lung or heart disease "
            "should limit prolonged outdoor exertion. "
            "At AQI 151–200 everyone should limit prolonged outdoor exertion; sensitive groups "
            "should avoid outdoor activity entirely. "
            "At AQI 201–300 everyone should avoid prolonged outdoor exertion; sensitive groups "
            "should remain indoors. "
            "Above AQI 300 all outdoor physical activity should be avoided."
        ),
        category="health",
        tags=["aqi", "health", "risk", "dangerous", "concerning", "safe", "sensitive"],
        source="CPCB",
        source_reference="CPCB AQI Bulletin. https://cpcb.nic.in/",
        version="1.0",
    ),

    # PM2.5 ------------------------------------------------------------
    KnowledgeDocument(
        doc_id="pm25_definition_001",
        title="PM2.5 Definition and Sources",
        content=(
            "PM2.5 refers to fine particulate matter with an aerodynamic diameter of 2.5 micrometers or less. "
            "These particles are so small they can penetrate deep into the lungs and enter the bloodstream. "
            "Primary sources include: combustion engines (vehicle exhaust), industrial emissions, biomass burning, "
            "and secondary formation from gaseous precursors (SO2, NOx, NH3). "
            "PM2.5 is the pollutant most strongly associated with premature mortality from cardiovascular and "
            "respiratory disease."
        ),
        category="air_quality",
        tags=["pm25", "pm2.5", "definition", "fine particles", "sources", "combustion"],
        source="WHO",
        source_reference="WHO Air Quality Guidelines, 2021. https://www.who.int/publications/i/item/9789240034228",
        version="1.0",
    ),

    KnowledgeDocument(
        doc_id="pm25_thresholds_001",
        title="PM2.5 Health Thresholds (CPCB & WHO)",
        content=(
            "CPCB National Ambient Air Quality Standards (NAAQS) for PM2.5: "
            "Annual mean: 40 µg/m³; 24-hour mean: 60 µg/m³. "
            "WHO 2021 guidelines are more stringent: "
            "Annual mean: 5 µg/m³; 24-hour mean: 15 µg/m³. "
            "Interpretation of 24-hour readings: "
            "0–30 µg/m³ = Good; 31–60 µg/m³ = Satisfactory; 61–90 µg/m³ = Moderate; "
            "91–120 µg/m³ = Poor; 121–250 µg/m³ = Very Poor; >250 µg/m³ = Severe. "
            "A single FLUXX drone reading above 60 µg/m³ indicates exceedance of CPCB 24-hour standard. "
            "A reading above 120 µg/m³ is classified as Very Poor and is a health concern for the general population."
        ),
        category="standards",
        tags=["pm25", "pm2.5", "threshold", "standard", "cpcb", "who", "dangerous", "concerning", "health", "limit", "safe"],
        source="CPCB & WHO",
        source_reference="CPCB NAAQS 2009; WHO AQG 2021",
        version="1.0",
    ),

    KnowledgeDocument(
        doc_id="pm25_health_effects_001",
        title="PM2.5 Health Effects",
        content=(
            "Short-term exposure (hours to days) to elevated PM2.5 can cause: aggravated asthma, "
            "increased respiratory symptoms (coughing, difficulty breathing), decreased lung function, "
            "increased risk of heart attack and stroke. "
            "Long-term exposure increases risk of: chronic respiratory diseases, lung cancer, "
            "cardiovascular disease, and premature death. "
            "Sensitive groups: children, elderly, people with pre-existing heart or lung conditions. "
            "PM2.5 concentrations measured by FLUXX drones represent instantaneous point measurements "
            "and should not be directly compared to annual averages without appropriate temporal averaging."
        ),
        category="health",
        tags=["pm25", "pm2.5", "health", "effects", "risk", "dangerous", "concerning", "exposure", "respiratory"],
        source="WHO & US EPA",
        source_reference="WHO AQG 2021; US EPA PM2.5 NAAQS Review 2024",
        version="1.0",
    ),

    # PM10 ------------------------------------------------------------
    KnowledgeDocument(
        doc_id="pm10_definition_001",
        title="PM10 Definition and Sources",
        content=(
            "PM10 refers to particulate matter with an aerodynamic diameter of 10 micrometers or less. "
            "It includes coarse particles (between 2.5 and 10 µm) plus fine particles (PM2.5). "
            "Primary sources include: road dust, construction sites, agriculture, industrial processes, "
            "quarrying, and desert dust storms. "
            "PM10 particles are filtered by the nose and upper respiratory tract and are less harmful than PM2.5, "
            "but can still cause respiratory irritation and exacerbate existing conditions."
        ),
        category="air_quality",
        tags=["pm10", "definition", "coarse", "dust", "sources", "construction"],
        source="WHO",
        source_reference="WHO Air Quality Guidelines, 2021. https://www.who.int/",
        version="1.0",
    ),

    KnowledgeDocument(
        doc_id="pm10_thresholds_001",
        title="PM10 Health Thresholds (CPCB & WHO)",
        content=(
            "CPCB NAAQS for PM10: Annual mean: 60 µg/m³; 24-hour mean: 100 µg/m³. "
            "WHO 2021 guidelines: Annual mean: 15 µg/m³; 24-hour mean: 45 µg/m³. "
            "Interpretation of 24-hour readings: "
            "0–50 µg/m³ = Good; 51–100 µg/m³ = Satisfactory; 101–250 µg/m³ = Moderate; "
            "251–350 µg/m³ = Poor; 351–430 µg/m³ = Very Poor; >430 µg/m³ = Severe. "
            "PM10 readings above 100 µg/m³ indicate exceedance of CPCB 24-hour standard."
        ),
        category="standards",
        tags=["pm10", "threshold", "standard", "cpcb", "who", "dangerous", "concerning", "health", "limit", "safe"],
        source="CPCB & WHO",
        source_reference="CPCB NAAQS 2009; WHO AQG 2021",
        version="1.0",
    ),

    # Atmospheric / Altitude -------------------------------------------
    KnowledgeDocument(
        doc_id="altitude_inversion_001",
        title="Atmospheric Temperature Inversions and Pollution",
        content=(
            "Normally, temperature decreases with altitude and warm surface air rises, dispersing pollutants. "
            "During a temperature inversion, a warmer air layer sits above cooler surface air, "
            "acting as a 'lid' that traps pollutants near the ground or at a specific altitude band. "
            "Inversions are most common during calm nights and early mornings, especially in valleys or "
            "after anticyclonic conditions. "
            "FLUXX drone measurements across altitudes can identify inversions: if pollutant concentrations "
            "are higher at an intermediate altitude band than at ground level, an inversion layer may be present. "
            "This is a significant finding that can explain why surface-level readings underestimate the total "
            "pollutant load in the atmosphere."
        ),
        category="atmospheric",
        tags=["altitude", "inversion", "temperature", "layer", "vertical", "height", "atmospheric", "trapped"],
        source="USEPA / AMS",
        source_reference="EPA Air Quality Fundamentals; AMS Glossary of Meteorology",
        version="1.0",
    ),

    KnowledgeDocument(
        doc_id="altitude_dispersion_001",
        title="Pollution Dispersion with Altitude",
        content=(
            "In well-mixed atmospheric conditions, pollutant concentrations typically decrease with altitude "
            "as dispersion occurs. The mixing height (also called the mixing layer or planetary boundary layer) "
            "defines the altitude up to which surface-emitted pollutants are distributed. "
            "Below the mixing height: pollutants are relatively well-mixed. "
            "Above the mixing height: concentrations drop sharply. "
            "FLUXX drone readings showing consistently lower pollution at higher altitudes indicate "
            "normal dispersion without significant inversion effects."
        ),
        category="atmospheric",
        tags=["altitude", "dispersion", "mixing", "height", "vertical", "layer", "boundary"],
        source="AMS / USEPA",
        source_reference="AMS Glossary of Meteorology; EPA Air Quality Criteria Document",
        version="1.0",
    ),

    # Hotspots ---------------------------------------------------------
    KnowledgeDocument(
        doc_id="hotspot_definition_001",
        title="Pollution Hotspot Definition",
        content=(
            "A pollution hotspot is a geographically bounded area where pollutant concentrations significantly "
            "exceed the surrounding background levels. The FLUXX system identifies hotspots using spatial "
            "clustering of high-AQI readings during a drone survey. "
            "Hotspots often indicate: proximity to an active emission source (industrial stack, road junction, "
            "waste burning), topographic trapping (basins, urban canyons), or wind-shadow effects behind "
            "large structures. "
            "Hotspot severity in FLUXX: LOW (<101 AQI), MODERATE (101–200), HIGH (201–300), CRITICAL (>300). "
            "A hotspot classified as MODERATE or above warrants immediate investigation to identify the source."
        ),
        category="air_quality",
        tags=["hotspot", "pollution", "cluster", "localized", "source", "emission", "severity"],
        source="FLUXX System / CPCB",
        source_reference="FLUXX Hotspot Detection Algorithm v1; CPCB Source Apportionment Guidelines",
        version="1.0",
    ),

    # Trends -----------------------------------------------------------
    KnowledgeDocument(
        doc_id="trend_interpretation_001",
        title="Interpreting Pollution Trends During a Mission",
        content=(
            "An increasing trend in AQI or PM concentration during a drone survey may indicate: "
            "(1) the drone is flying towards an emission source, "
            "(2) wind conditions are changing and bringing pollution from a new direction, "
            "(3) an emission source has become active during the survey (e.g., morning industrial startup). "
            "A decreasing trend may indicate: "
            "(1) the drone is moving away from the source, "
            "(2) increasing wind speed is dispersing pollutants, "
            "(3) the emission source has stopped. "
            "FLUXX trend analysis splits the mission timeline into two halves and compares average AQI. "
            "A difference of >5 AQI units between halves is considered a meaningful trend."
        ),
        category="interpretation",
        tags=["trend", "increase", "decrease", "change", "direction", "source", "wind", "temporal"],
        source="Environmental monitoring best practice",
        source_reference="EPA Air Monitoring Guidance; WHO Air Quality Guidelines 2021",
        version="1.0",
    ),

    # Mission / Survey -------------------------------------------------
    KnowledgeDocument(
        doc_id="drone_survey_context_001",
        title="FLUXX Drone Survey Context",
        content=(
            "FLUXX is a drone-based environmental monitoring system using a QUDRACOPTER airframe. "
            "Sensors measure PM1, PM2.5, PM10, and compute AQI in real time. "
            "Altitude is recorded as relative height above the takeoff point (RELATIVE_HOME datum), "
            "not WGS84 ellipsoid height. "
            "Each reading represents a point measurement at a specific GPS coordinate and altitude. "
            "Readings are associated with missions; each mission covers a spatial area. "
            "Mission statistics (total_readings, distance_km, average_aqi) are computed across all "
            "readings from that mission. "
            "Hotspots are detected post-mission by spatial clustering algorithms."
        ),
        category="system",
        tags=["fluxx", "drone", "mission", "survey", "qudracopter", "system", "readings", "context"],
        source="FLUXX System Documentation",
        source_reference="FLUXX QUDRACOPTER System v1.0 — Internal",
        version="1.0",
    ),

    KnowledgeDocument(
        doc_id="historical_comparison_001",
        title="Interpreting Historical Mission Comparisons",
        content=(
            "Comparing AQI between two missions at the same location reveals temporal pollution trends. "
            "An increase in average AQI between surveys may indicate: worsening emission sources, "
            "unfavourable meteorological conditions (low wind, inversion), or seasonal variation. "
            "A decrease may indicate: emission controls, favourable dispersion conditions, or source shutdown. "
            "When comparing missions: ensure coverage areas are similar; account for time-of-day differences "
            "(morning vs. afternoon surveys can differ by 20–40 AQI due to traffic and industrial patterns); "
            "consider meteorological conditions (wind speed/direction, temperature, humidity). "
            "A change of >10% in average AQI between surveys is considered operationally significant."
        ),
        category="interpretation",
        tags=["comparison", "historical", "previous", "mission", "temporal", "trend", "change", "survey"],
        source="Environmental monitoring best practice",
        source_reference="CPCB Ambient Air Quality Monitoring Guidelines; WHO AQG 2021",
        version="1.0",
    ),

    # General Environmental --------------------------------------------
    KnowledgeDocument(
        doc_id="air_quality_general_001",
        title="Understanding Air Quality Monitoring",
        content=(
            "Air quality monitoring measures the concentration of pollutants in the atmosphere to assess "
            "their impact on human health and the environment. Key pollutants monitored include: "
            "PM2.5, PM10, NO2, SO2, CO, O3. "
            "Drone-based monitoring (as used by FLUXX) provides spatial coverage that fixed ground stations "
            "cannot achieve, allowing mapping of pollution gradients, identification of hotspots, and "
            "assessment of vertical pollution profiles. "
            "Measurements from a single drone flight represent a snapshot in time; temporal variability "
            "must be considered when interpreting results. "
            "The FLUXX system focuses on particulate matter (PM1, PM2.5, PM10) as these are the most "
            "relevant pollutants for short-duration mobile monitoring."
        ),
        category="air_quality",
        tags=["air quality", "monitoring", "pollutants", "pm", "general", "what is", "explain", "meaning"],
        source="WHO / CPCB",
        source_reference="WHO Air Quality Guidelines 2021; CPCB Ambient Monitoring Protocol",
        version="1.0",
    ),

    KnowledgeDocument(
        doc_id="aqi_vs_pm_001",
        title="Relationship Between AQI and PM Measurements",
        content=(
            "AQI is a dimensionless index computed from measured pollutant concentrations using "
            "a piecewise linear formula. For PM2.5 in India (CPCB standard), the sub-index breakpoints are: "
            "PM2.5 (µg/m³): 0–30→AQI 0–50 (Good), 31–60→51–100 (Satisfactory), 61–90→101–200 (Moderate), "
            "91–120→201–300 (Poor), 121–250→301–400 (Very Poor), >250→401–500 (Severe). "
            "For PM10 (µg/m³): 0–50→AQI 0–50, 51–100→51–100, 101–250→101–200, 251–350→201–300, "
            "351–430→301–400, >430→401–500. "
            "The overall AQI is the maximum sub-index across all measured pollutants."
        ),
        category="standards",
        tags=["aqi", "pm25", "pm10", "formula", "calculation", "breakpoints", "index", "relationship"],
        source="CPCB",
        source_reference="CPCB AQI Technical Document 2014. https://cpcb.nic.in/",
        version="1.0",
    ),
]

# Build lookup index
_DOC_BY_ID: Dict[str, KnowledgeDocument] = {d.doc_id: d for d in _DOCUMENTS}


# ---------------------------------------------------------------------------
# Concrete implementation
# ---------------------------------------------------------------------------

class TagBasedDocumentStore:
    """
    Lightweight keyword/tag-based document store.
    No vector DB required. Can be replaced by a vector store by implementing IDocumentStore.
    """

    def __init__(self, documents: List[KnowledgeDocument] = _DOCUMENTS):
        self._docs = documents
        self._by_id = {d.doc_id: d for d in documents}

    def retrieve(self, tags: List[str], limit: int = 3) -> List[KnowledgeDocument]:
        """
        Retrieve documents ranked by number of tag matches.
        Tags are lowercased for comparison.
        Returns up to `limit` documents.
        """
        query_tags = {t.lower() for t in tags}
        scored: List[tuple[int, KnowledgeDocument]] = []

        for doc in self._docs:
            doc_tags = {t.lower() for t in doc.tags}
            score = len(query_tags & doc_tags)
            if score > 0:
                scored.append((score, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored[:limit]]

    def get_by_id(self, doc_id: str) -> Optional[KnowledgeDocument]:
        return self._by_id.get(doc_id)

    def all_documents(self) -> List[KnowledgeDocument]:
        return list(self._docs)


# ---------------------------------------------------------------------------
# Singleton instance
# ---------------------------------------------------------------------------

_default_store = TagBasedDocumentStore()


def get_document_store() -> TagBasedDocumentStore:
    """Return the default singleton document store."""
    return _default_store


# ---------------------------------------------------------------------------
# Intent → search tags mapping
# ---------------------------------------------------------------------------

INTENT_TAGS: Dict[str, List[str]] = {
    "highest_aqi":             ["aqi", "categories", "health", "interpretation", "levels"],
    "average_aqi":             ["aqi", "categories", "interpretation", "levels"],
    "highest_pm25":            ["pm25", "pm2.5", "threshold", "health", "dangerous", "concerning"],
    "average_pm25":            ["pm25", "pm2.5", "standard", "health"],
    "highest_pm10":            ["pm10", "threshold", "health", "dangerous"],
    "average_pm10":            ["pm10", "standard", "health"],
    "pollution_by_altitude":   ["altitude", "inversion", "vertical", "layer", "height"],
    "pollution_trend":         ["trend", "increase", "decrease", "change", "temporal"],
    "hotspot_analysis":        ["hotspot", "cluster", "localized", "source", "severity"],
    "highest_hotspot":         ["hotspot", "cluster", "severity", "dangerous"],
    "hotspot_count":           ["hotspot", "cluster"],
    "mission_summary":         ["fluxx", "mission", "survey", "context", "system"],
    "mission_comparison":      ["comparison", "historical", "previous", "temporal", "change"],
    "environmental_explanation":["air quality", "monitoring", "pollutants", "general", "explain", "meaning"],
    "data_plus_knowledge":     ["pm25", "pm10", "aqi", "threshold", "health", "dangerous", "concerning", "safe"],
    "unknown":                 ["air quality", "monitoring", "pollutants", "general"],
}


def get_tags_for_intent(intent: str) -> List[str]:
    return INTENT_TAGS.get(intent, ["air quality", "monitoring"])
