# Aviate.Navigate.Communicate (ANC UAV): weather and MET reading

## Direct device weather

The user selected Open-Meteo's free **non-commercial** service and accepted its terms on 10 November 2026. This does not authorize commercial operator use. The interface requires an end-user non-commercial-use/location-sharing confirmation before requesting GPS weather.

- Source/API: https://open-meteo.com/en/docs
- Service terms: https://open-meteo.com/en/terms
- Data licence and attribution: https://open-meteo.com/en/licence (CC BY 4.0).

Only the explicit weather action requests a current GPS fix, rounds coordinates to 0.001° (roughly 100 m latitude), and calls `api.open-meteo.com` directly from the device. The provider sees the requested location and IP address. No GPS accuracy, unrounded fix, provider credentials, user notes, or pasted briefing is sent. There is no app backend, Replit callback, API key, model service, automatic launch refresh, or background download. Device connectivity/mobile-data charges are separate from the free API.

The last successful validated forecast and rounded requested point are kept in ordinary local preferences, not the encrypted credential vault; OS backups may include them. Failed requests/invalid data retain the previous snapshot. Corrupt saved data is preserved until explicitly cleared. Repeat requests for the same area are suppressed for 30 minutes. Clear saved weather removes the snapshot and consent.

### Interpretation

This is forecast model output on a grid, not a local weather station reading or aviation briefing. Values retain forecast-valid UTC timestamps and retrieval time; retrieval time is not provider issue time. A saved area is not continuous GPS tracking. Forecasts older than three hours carry an age warning, and past hourly values are not substituted for a missing current-period forecast.

Wind speed/direction at 10, 80 and 120 m are model fields above ground. Gusts are only a 10 m preceding-hour field; no upper-level gust profile is manufactured. 120 m is about 394 ft; 400 ft is about 122 m. Terrain, structures, turbulence and localized gusts are unresolved. Precipitation amount and probability refer to the preceding hour ending at the displayed time, not to an entire flight. No missing value is treated as zero; probability zero does not guarantee dry conditions. No go/no-go judgement or aircraft-limit comparison is made.

## MET briefing reading

Pasted text is handled entirely in temporary app memory by a deterministic decoder. It is not saved, uploaded, logged, or sent to a model. The user can clear the text and result. Original text stays visible.

Supported subset: a single standard TAF (optionally AMD/COR), issue/validity day/time groups, FM, BECMG, Australian INTER/TEMPO, PROB30/40, common weather tokens, visibility, CAVOK, cloud amount/base/type, and a simple four-value T/Q remarks series. Unsupported tokens and remark formats are retained and flagged. CNL/NIL and METAR/SPECI formats are not decoded as valid forecasts.

The supplied airport briefing's narrative sections, TMA thunderstorm probability, other possibilities, outlook and notes are retained separately. Probabilities with different geographic/time scopes are never combined. Briefing-wrapper issue statements and TAF issue times remain separate. Source warnings about currency and amendment frequency are surfaced. UTC day/time groups do not silently acquire a month, year or local timezone. TAF winds are aerodrome surface forecasts, not a wind profile to 120 m at GPS.

Decoder conventions adapted from Bureau of Meteorology education material:
https://reg.bom.gov.au/aviation/data/education/taf.pdf
This education brochure states CC BY 4.0 licensing; ANC UAV implements a limited subset, without endorsement. Check the current official forecast and full official guidance; software tests do not establish operational approval.
