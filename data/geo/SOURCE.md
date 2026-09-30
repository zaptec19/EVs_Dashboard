# India state boundaries (GeoJSON)

- **File here:** `datameet_states_admin2_simplified.geojson` (36 features, property `ST_NM`)
- **Source:** DataMeet India community, `maps` repository, `States/Admin2.shp`
  https://github.com/datameet/maps/tree/master/States
- **Licence:** CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), per the repository README
  ("Unless explicitly stated, all datasets in this repository is shared under CC BY 4.0").
  Attribution: "India state boundaries by DataMeet India community (CC BY 4.0)".
- **Date accessed:** 2026-09-30 (raw.githubusercontent.com, `master` branch; Admin2.shp SHA-256
  b61ebc11a7487ce1c340d55fc9d0c1a2b63af1f73191fef691c11693c726130d)
- **The old v1 build's GeoJSON was not reused:** the v1 folder (`College/ug3/IDV`) was not on disk
  when v2 was built.

## Transformations
1. `mapshaper Admin2.shp -simplify 1.5% keep-shapes -clean -o format=geojson precision=0.001`
   (mapshaper 0.6). `-clean` removed 38 sliver gaps; all 36 features kept.
2. In `scripts/build-data.mjs` the name property is renamed to `name` and two names are changed
   to match the cleaned data: `Andaman & Nicobar` -> `Andaman & Nicobar Islands`,
   `Jammu & Kashmir` -> `Jammu and Kashmir`. Output: `public/data/india_states.geojson`.
3. Also in `scripts/build-data.mjs`: every polygon whose exterior ring is counter-clockwise (as
   mapshaper writes RFC 7946 GeoJSON) has its rings reversed, because d3-geo expects clockwise
   exteriors. Geometry is otherwise unchanged.

## External boundary check (2026-09-30)
Point-in-polygon tests on the published GeoJSON: Gilgit (74.31E, 35.92N), Skardu, Siachen Glacier
and Aksai Chin (79.5E, 35.2N) fall inside Ladakh; Muzaffarabad and Mirpur fall inside Jammu and
Kashmir. The northern tip is 74.708E, 37.077N. **However**, north of the Karakoram crest the outline
follows the K2 to Karakoram Pass line: the Shaksgam valley / Trans-Karakoram tract (roughly
76-77.8E, 35.8-36.5N) is outside every polygon. DataMeet's `Country/india-composite.geojson` has the
same outline there. Official Survey of India maps show that tract inside Ladakh, so this layer does
not fully match India's official external boundary. Not altered here; needs a decision.
Screenshot: `screenshots/map-boundary-light.png`, `screenshots/map-boundary-dark.png`.
