-- ============================================================
-- Kyro L1 CGT  —  Acute TBI/EDH, No-CT GMO setting  (FINAL v3, reconciled)
-- Matches the docs/08 §1 bundle contract EXACTLY:
--   cgt_nodes  (id, kind, field, required, action, source_citation, trust_tier)
--   cgt_edges  (src_id, dst_id, condition)
--   cgt_strings(node_id, lang, prompt, recommendation)   PRIMARY KEY (node_id, lang)
--   cgt_meta   (root_id, version, signature)
--
-- action  = doc-19 four-action vocabulary, on TERMINAL/LEAF nodes only:
--           'GUIDE' | 'OBSERVE' | 'STABILIZE_TRANSFER' | 'ABSTAIN_STOP'
--           (NULL on intermediate gather/decision/action nodes and on the
--            intermediate stabilization-chain leaves L10..L17, whose directive
--            force is the GREEN/YELLOW/RED mode overlay encoded in the strings.)
-- GREEN/YELLOW/RED (protocol/principles/stop) is the CONFIDENCE/MODE OVERLAY,
--           carried in cgt_strings.recommendation prose, NOT in the contract
--           schema. It is orthogonal to `action`.
-- trust_tier: 0 = citation-locked (BTF 4th Ed / Peshawar / Bullock, in corpus)
--             1 = provisional-cited (NICE NG232 content NOT in corpus -> [VERIFY-NICE])
--             2 = labeled principle (no cited number anywhere)
--
-- GUIDE invariant: L21b/L21c carry action='GUIDE' (operate-locally category) but
--   every GUIDE path funnels into N40 (action='ABSTAIN_STOP') for the drill-site /
--   localization step. Kyro NEVER names a burr-hole site, even under live
--   neurosurgeon supervision. L21a (transfer feasible) = 'STABILIZE_TRANSFER'.
-- ============================================================

CREATE TABLE IF NOT EXISTS cgt_nodes (
  id TEXT PRIMARY KEY,
  kind TEXT,
  field TEXT,
  required INTEGER,
  action TEXT,
  source_citation TEXT,
  trust_tier INTEGER
);
CREATE TABLE IF NOT EXISTS cgt_edges (src_id TEXT, dst_id TEXT, condition TEXT);
CREATE TABLE IF NOT EXISTS cgt_strings (
  node_id TEXT, lang TEXT, prompt TEXT, recommendation TEXT,
  PRIMARY KEY (node_id, lang)
);
CREATE TABLE IF NOT EXISTS cgt_meta (root_id TEXT, version INTEGER, signature TEXT);

-- ============================================================
-- NODES   (required: 1 = critical-evidence field; 0 = standard/NULL)
-- ============================================================
INSERT INTO cgt_nodes (id, kind, field, required, action, source_citation, trust_tier) VALUES
('N00','root',          NULL,                                                                          0, NULL,                 NULL, 0),
('N01','gather',        'mechanism;mechanism_class;time_since_injury_hr',                              1, NULL,                 'Peshawar Recommendations p.53 (injury-to-facility <=4h golden window); Peshawar surveillance minimum dataset (mechanism/circumstance). Penetrating/blast/open/non-trauma -> N22 per NICE NG232 1.4.16 [VERIFY-NICE]', 0),
('N1A','gather',        'anticoag_antiplatelet;known_coagulopathy',                                   1, NULL,                 'NICE lowered-threshold/transfer trigger for anticoagulation [VERIFY-NICE]; reversal=labeled principle; PATCH harm-trap wired at N16B', 1),
('N04','gather',        'gcs_e;gcs_v;gcs_m',                                                           1, NULL,                 'NICE NG232 1.3.1-1.3.3 (record E/V/M separately) [VERIFY-NICE]; with N05 reactivity -> GCS-P no-CT severity index (doc 10)', 1),
('N05','gather',        'pupil_size_l_mm;pupil_react_l;pupil_size_r_mm;pupil_react_r',                 1, NULL,                 'Bullock/BTF Surgical-EDH (anisocoria+coma operate ASAP; ANY-size fixed pupil); pupil min-obs=NICE [VERIFY-NICE]. 4mm floor REMOVED (VF-9)', 0),
('N06','gather',        'sbp_mmhg;age_yr;spo2_pct;spo2_available;blood_glucose;glucose_available',     1, NULL,                 'BTF 4th Ed Table 3 age-stratified SBP, Level III; Peshawar p.53 (prevent hypotension, oxygenate, no numeric cutoff). Glucose threshold uncited=tier2 (VF-7). age<15 -> N98 (S6)', 0),
('N07','gather',        'lucid_interval',                                                             1, NULL,                 'Classic EDH surrogate; Peshawar p.53 time-from-deterioration framing [VERIFY VF-1: no standalone operate threshold; cluster-weight only]', 0),
('N08','gather',        'focal_weakness_side;posturing;seizure_status',                               1, NULL,                 'NICE NG232 1.4.16 (progressive focal signs; seizure-without-recovery, regardless of imaging) [VERIFY-NICE]; BTF posturing (normal-CT ICP criteria, tier0)', 1),
('N09','gate',          NULL,                                                                         1, NULL,                 'Safety meta-rule S1 (completeness gate)', 0),
('N02','reask',         NULL,                                                                         1, NULL,                 'Safety meta-rule S1 (re-ask missing critical field)', 0),
('N03','reask',         NULL,                                                                         1, NULL,                 'Safety meta-rule S2 (contradiction guard; incl. cross-time pupil/GCS reversal)', 0),
('N10','decision',      'gcs_total',                                                                   1, NULL,                 'NICE severity bands + intubate GCS<=8 [VERIFY-NICE]; ketamine RSI=LMIC principle (doc 10 B1); independent intubation triggers = clinician-judgment overrides outside the tree', 1),
('L10a','leaf',         NULL,                                                                          0, NULL,                 'NICE NG232 (severe; intubate GCS<=8) [VERIFY-NICE]; ketamine RSI labeled principle (doc 10)', 1),
('L10b','leaf',         NULL,                                                                          0, NULL,                 'NICE severity (moderate 9-12); airway-protection detail=extrapolated good-practice [VERIFY VF-8]', 1),
('L10c','leaf',         NULL,                                                                          0, NULL,                 'NICE severity (mild 13-15) + obs schedule [VERIFY-NICE]', 1),
('N11','decision',      'sbp_mmhg;age_yr',                                                             1, NULL,                 'BTF 4th Ed Table 3 Level III (SBP>=100 age50-69; >=110 age15-49 or >70); no permissive hypotension (doc10 rule2); doc14 Nawaz (single hypotensive episode >50% mortality). Children diverted at N06->N98', 0),
('L11a','leaf',         NULL,                                                                          0, NULL,                 'BTF 4th Ed Table 3 Level III; isotonic 0.9% saline, avoid hypotonic/glucose fluids (doc10 B4)', 0),
('L11b','leaf',         NULL,                                                                          0, NULL,                 'BTF 4th Ed Table 3 Level III (maintain normotension)', 0),
('N12','decision',      'spo2_pct;spo2_available',                                                     1, NULL,                 'Peshawar p.53 / WHO-by-ref (adequate oxygenation; no numeric cutoff) [VERIFY VF-2]; pulse-ox=non-negotiable monitor (doc10 rule9); S5 unknown=not-excluded', 2),
('L12a','leaf',         NULL,                                                                          0, NULL,                 'Peshawar/WHO-by-ref [VERIFY VF-2: 94% is convention, not cited]', 2),
('L12b','leaf',         NULL,                                                                          0, NULL,                 'Peshawar (SpO2 monitoring prioritized); unknown treated as hypoxia-not-excluded (S5)', 2),
('L12c','leaf',         NULL,                                                                          0, NULL,                 'Peshawar/WHO-by-ref (oxygenation adequate)', 1),
('N13','action',        NULL,                                                                          0, NULL,                 'NO cited source [VERIFY VF-3: 30deg head-up absent from BTF 4th Ed and all cited sources]', 2),
('L13','leaf',          NULL,                                                                          0, NULL,                 'NO cited source [VERIFY VF-3]', 2),
('N14','decision',      'fixed_pupil_side;bilateral_fixed;posturing;gcs_trend;sbp_at_target;hypoxic;spo2_unknown;hypoglycemic;glucose_unknown', 1, NULL, 'BTF 4th Ed Table 1 LEGACY (mannitol restricted to herniation/progressive deterioration NOT attributable to extracranial causes; 0.25-1 g/kg) [VERIFY VF-6]; S5 unmeasured=not-excluded', 0),
('L14a','leaf',         NULL,                                                                          0, NULL,                 'BTF 4th Ed Table 1 (legacy, no current Level): mannitol 0.25-1 g/kg, extracranial causes excluded', 0),
('L14b','leaf',         NULL,                                                                          0, NULL,                 'BTF 4th Ed Table 1 (exclude/correct extracranial causes FIRST; unmeasured=not excluded, S5) - mannitol WITHHELD', 0),
('L14c','leaf',         NULL,                                                                          0, NULL,                 'BTF 4th Ed Table 1 (no prophylactic mannitol without herniation)', 0),
('N15','action',        NULL,                                                                          0, NULL,                 'BTF 4th Ed Table 1 Level IIA (phenytoin early PTS <=7d, then stop; levetiracetam not preferred); +TXA<3h overlay (doc10 rule4/CRASH-3) labeled principle [VERIFY-TXA]', 0),
('L15','leaf',          NULL,                                                                          0, NULL,                 'BTF 4th Ed Table 1 Level IIA (phenytoin <=7d early PTS, then stop); TXA<3h labeled principle [VERIFY-TXA]', 0),
('N16','action',        NULL,                                                                          0, NULL,                 'BTF 4th Ed Table 1: steroids Level I (contraindicated); hypothermia IIB (<=2.5h,48h,diffuse); prolonged HV<=25 IIB; "avoid HV first 24h"+"brief temporizing HV"=LEGACY no Level', 0),
('L16','leaf',          NULL,                                                                          0, NULL,                 'BTF 4th Ed Table 1 (steroids Level I contraindicated; hypothermia IIB w/ qualifiers; prolonged HV<=25 IIB; legacy HV statements flagged)', 0),
('N16B','action',       'anticoag_antiplatelet;known_coagulopathy',                                   0, NULL,                 'Coagulopathy=correctable secondary-injury driver (labeled principle); PATCH harm-trap (no platelet transfusion for antiplatelet ICH)', 2),
('L16Ba','leaf',        NULL,                                                                          0, NULL,                 'Labeled principle: reverse/correct warfarin/DOAC/coagulopathy per available agents; agent/dose not in corpus', 2),
('L16Bb','leaf',        NULL,                                                                          0, NULL,                 'PATCH harm-trap [VERIFY-PATCH]: do NOT routinely transfuse platelets for antiplatelet-associated traumatic ICH', 2),
('N16H','decision',     'herniation_signs',                                                            0, NULL,                 'BTF LEGACY 3rd-Ed (brief HV temporizing for active herniation ~ETCO2 35; avoid first 24h) - guarded action', 0),
('L16Ha','leaf',        NULL,                                                                          0, NULL,                 'Legacy principle: brief mild HV ONLY for ACTIVE herniation ~ETCO2/PaCO2 35; do not sustain; not PaCO2<=25; avoid first 24h', 0),
('L16Hb','leaf',        NULL,                                                                          0, NULL,                 'No herniation -> normoventilation, do NOT hyperventilate', 0),
('N17','action',        NULL,                                                                          0, NULL,                 'NICE NG232 1.9.10-1.9.12 (obs params + schedule) [VERIFY-NICE]', 1),
('L17','leaf',          NULL,                                                                          0, NULL,                 'NICE NG232 1.9.10-1.9.12 [VERIFY-NICE] (no-CT early-warning system)', 1),
('N20','decision',      'fixed_pupil_side;bilateral_fixed;focal_weakness_side;gcs_trend;lucid_interval;gcs_total;posturing;anticoag_antiplatelet;known_coagulopathy', 1, NULL, 'Bullock/BTF Surgical-EDH (coma+anisocoria operate ASAP); Peshawar p.53 (surgery prior to decompensation); doc14 blown-pupil clock. CT 30cm3/15mm/5mm=AUDIT-ONLY comparator, suppressed from GMO render (VF-COMP)', 0),
('N21','decision',      'time_since_injury_hr;transfer_feasible_within_window;teleconsult_available',  1, NULL,                 'Peshawar p.53 (<=4h, 30% vs 90% mortality), Sec D task-sharing under supervision; Bullock (Wester worse non-NS outcomes) [VERIFY VF-5: transfer/teleconsult are operational inputs]', 0),
('L21a','leaf',         NULL,                                                                          0, 'STABILIZE_TRANSFER', 'Peshawar p.53/Sec D (transfer to neurosurgery-capable facility; abstain local op) - herniation present BUT transfer feasible in window', 0),
('L21b','leaf',         NULL,                                                                          0, 'GUIDE',              'Peshawar Sec D (operate-locally indicated, no transfer, teleconsult available -> task-SHARING under LIVE supervision; Kyro provides ZERO operative guidance even under supervision; funnels to N40 ABSTAIN)', 0),
('L21c','leaf',         NULL,                                                                          0, 'GUIDE',              'Peshawar Sec D (operate-locally indicated, no transfer, no teleconsult -> maximal medical, keep trying; Kyro NOT authorized to direct unsupervised craniostomy; task-sharing NOT task-shifting; Bullock Wester; funnels to N40 ABSTAIN)', 0),
('N22','terminal-route',NULL,                                                                          1, NULL,                 'NICE NG232 1.4.16, 1.8.1 (discuss/transfer regardless of imaging) [VERIFY-NICE]; Peshawar transfer+tele-consult bridge', 1),
('L22','leaf',          NULL,                                                                          0, 'STABILIZE_TRANSFER', 'NICE 1.4.16/1.8.1 [VERIFY-NICE]; Peshawar (transfer + tele-consult). Severe/deterioration/focal/penetrating/anticoag WITHOUT complete herniation cluster -> abstain local op, stabilize, transfer', 1),
('N23','decision',      NULL,                                                                          1, NULL,                 'NICE 1.9.11/1.9.12 (observe); 1.4.16 (confusion>4h) [VERIFY-NICE]; doc14 PJNS RCT (<30mL+no deficit -> conservative). Reachable ONLY when all high-risk fields negated', 1),
('L23','leaf',          NULL,                                                                          0, 'OBSERVE',            'NICE 1.9.11/1.9.12/1.4.16 [VERIFY-NICE]; doc14 PJNS RCT clinical observe gate. Admit+observe+arm deterioration triggers; low threshold to transfer', 1),
('N30','monitor-loop',  'gcs_trend;pupil_react_l;pupil_react_r;focal_weakness_side;persistent_vomiting;severe_or_increasing_headache;agitation;second_observer_confirmed', 1, NULL, 'NICE 1.9.13 red flags (full set), 1.9.14 two-observer [VERIFY-NICE]; S2 cross-time reversal->N03; S4 monotonic', 1),
('N40','terminal',      'drill_site',                                                                  1, 'ABSTAIN_STOP',       'Peshawar Sec D (task-sharing requires neurosurgeon oversight); Bullock (craniotomy=NS-center; Wester). ZERO operative/localization guidance under ANY input incl active supervision', 0),
('L40','leaf',          NULL,                                                                          0, 'ABSTAIN_STOP',       'Peshawar Sec D; Bullock + Wester. Drill-site is OUTSIDE scope; never derivable from non-CT signs', 0),
('N97','terminal',      'bilateral_fixed;gcs_total',                                                   1, 'ABSTAIN_STOP',       'Bullock/Sakas (BFDP grave); BFDP-not-always-fatal counter-evidence (react-to-osmotherapy survival) [VERIFY VF-10]', 1),
('L97','leaf',          NULL,                                                                          0, 'ABSTAIN_STOP',       'Bilateral fixed: maximal medical, reassess pupils, defer operative decision to neurosurgeon; NOT auto-futile, NOT blind-drill', 1),
('N98','terminal',      'age_yr',                                                                      1, 'ABSTAIN_STOP',       'Adult BTF SBP bands (15-49/50-69/>70) and adult GCS do not cover age<15; pediatric SBP ~70+2*age = labeled principle. Out of MVP scope (S6)', 2),
('L98','leaf',          NULL,                                                                          0, 'ABSTAIN_STOP',       'Pediatric abstain: stabilize w/ labeled peds principles + transfer + tele-consult; do not apply adult thresholds', 2),
('N99','terminal',      NULL,                                                                          0, 'ABSTAIN_STOP',       'Safety meta-rule S3 (out-of-tree abstain)', 0),
('L99','leaf',          NULL,                                                                          0, 'ABSTAIN_STOP',       'Safety meta-rule S3 (input not recognized / out of range -> stabilize + transfer + escalate)', 0),
('L08S','leaf',         NULL,                                                                          0, 'STABILIZE_TRANSFER', 'Active seizure: abortive benzodiazepine (labeled principle) + re-eval airway (N10) + transfer/discuss (NICE 1.4.16) [VERIFY-NICE]', 2);

-- ============================================================
-- EDGES   (condition = classified-answer boolean; language-agnostic)
-- ============================================================
INSERT INTO cgt_edges (src_id, dst_id, condition) VALUES
('N00','N01','true'),
-- N01: penetrating/blast/open/non-trauma bypass to transfer; else anticoag capture
('N01','N22','mechanism_class IN [''penetrating'',''blast'',''open-depressed-fracture'',''non-trauma'']'),
('N01','N1A','mechanism_class = ''blunt'''),
('N1A','N04','true'),
('N04','N99','gcs_e NOT IN [1..4] OR gcs_v NOT IN [1..5] OR gcs_m NOT IN [1..6]'),
('N04','N03','gcs_recapture_conflict'),
('N04','N05','gcs_valid'),
('N05','N03','same_pupil_react_fixed_AND_brisk'),
('N05','N06','pupils_valid'),
-- N06: pediatric gate FIRST (S6), then range validation
('N06','N98','age_yr < 15'),
('N06','N99','sbp_mmhg < 40 OR sbp_mmhg > 300'),
('N06','N03','two_sbp_entries_diff_gt_40'),
('N06','N07','age_yr >= 15 AND bp_valid'),
('N07','N08','true'),
-- N08: active seizure branch (abortive + airway re-eval + transfer)
('N08','L08S','seizure_status = ''active-or-without-recovery'''),
('L08S','N10','true'),
('N08','N09','seizure_status IN [''none'',''single-resolved'']'),
-- Completeness gate (S1)
('N09','N02','any_critical_field_missing'),
('N09','N10','all_critical_fields_present'),
('N02','N09','field_supplied'),
('N03','N09','field_revalidated'),
-- Airway/severity
('N10','L10a','gcs_total <= 8'),
('N10','L10b','gcs_total >= 9 AND gcs_total <= 12'),
('N10','L10c','gcs_total >= 13'),
('L10a','N11','true'),
('L10b','N11','true'),
('L10c','N11','true'),
-- Hemodynamics (adult only; canonical predicate sbp_below_target)
('N11','L11a','(age_yr BETWEEN 50 AND 69 AND sbp_mmhg < 100) OR ((age_yr BETWEEN 15 AND 49 OR age_yr > 70) AND sbp_mmhg < 110)'),
('N11','L11b','NOT ((age_yr BETWEEN 50 AND 69 AND sbp_mmhg < 100) OR ((age_yr BETWEEN 15 AND 49 OR age_yr > 70) AND sbp_mmhg < 110))'),
('L11a','N12','true'),
('L11b','N12','true'),
-- Oxygenation (S5: unknown -> not excluded, enforced at N14)
('N12','L12a','spo2_available = ''yes'' AND spo2_pct < 94'),
('N12','L12b','spo2_available = ''no'''),
('N12','L12c','spo2_available = ''yes'' AND spo2_pct >= 94'),
('L12a','N13','true'),
('L12b','N13','true'),
('L12c','N13','true'),
('N13','L13','true'),
('L13','N14','true'),
-- Mannitol (S5 canonical extracranial_excluded predicate)
('N14','L14a','(fixed_pupil_side <> ''none'' OR bilateral_fixed OR posturing <> ''none'' OR gcs_trend = ''declining'') AND sbp_at_target AND NOT hypoxic AND NOT spo2_unknown AND NOT hypoglycemic AND NOT glucose_unknown'),
('N14','L14b','(fixed_pupil_side <> ''none'' OR bilateral_fixed OR posturing <> ''none'' OR gcs_trend = ''declining'') AND (NOT sbp_at_target OR hypoxic OR spo2_unknown OR hypoglycemic OR glucose_unknown)'),
('N14','L14c','fixed_pupil_side = ''none'' AND NOT bilateral_fixed AND posturing = ''none'' AND gcs_trend <> ''declining'''),
('L14a','N15','true'),
('L14b','N15','true'),
('L14c','N15','true'),
('N15','L15','true'),
('L15','N16','true'),
('N16','L16','true'),
('L16','N16B','true'),
-- Anticoagulation reversal / PATCH harm-trap
('N16B','L16Ba','anticoag_antiplatelet IN [''warfarin'',''DOAC''] OR known_coagulopathy = ''yes'''),
('N16B','L16Bb','anticoag_antiplatelet = ''antiplatelet'''),
('N16B','N16H','anticoag_antiplatelet IN [''none'',''unknown''] AND known_coagulopathy IN [''no'',''unknown'']'),
('L16Ba','N16H','true'),
('L16Bb','N16H','true'),
-- Hyperventilation guarded action (~ETCO2 35)
('N16H','L16Ha','herniation_signs = true'),
('N16H','L16Hb','herniation_signs = false'),
('L16Ha','N17','true'),
('L16Hb','N17','true'),
('N17','L17','true'),
('L17','N20','true'),
-- Herniation cluster (exhaustive, bilateral-aware, concordant-signs gate, no dead-ends)
('N20','N97','bilateral_fixed AND gcs_total < 9'),
('N20','N21','gcs_total < 9 AND fixed_pupil_side <> ''none'' AND NOT bilateral_fixed'),
('N20','N21','NOT bilateral_fixed AND ((fixed_pupil_side <> ''none'' AND focal_weakness_side <> ''none'') OR (fixed_pupil_side <> ''none'' AND gcs_trend = ''declining'') OR (gcs_trend = ''declining'' AND lucid_interval = ''yes''))'),
('N20','N22','NOT bilateral_fixed AND (gcs_total <= 8 OR gcs_trend = ''declining'' OR lucid_interval = ''yes'' OR lucid_interval = ''unknown'' OR posturing <> ''none'' OR anticoag_antiplatelet IN [''warfarin'',''DOAC'',''unknown''] OR known_coagulopathy IN [''yes'',''unknown''])'),
('N20','N23','gcs_total >= 13 AND fixed_pupil_side = ''none'' AND NOT bilateral_fixed AND focal_weakness_side = ''none'' AND lucid_interval = ''no'' AND posturing = ''none'' AND anticoag_antiplatelet = ''none'' AND known_coagulopathy = ''no'''),
-- N21 operate-vs-transfer sub-logic (ALL -> N40 abstain at the drill step)
('N21','L21a','transfer_feasible_within_window = ''yes'''),
('N21','L21b','transfer_feasible_within_window = ''no'' AND teleconsult_available = ''yes'''),
('N21','L21c','transfer_feasible_within_window = ''no'' AND teleconsult_available = ''no'''),
('L21a','N40','true'),
('L21b','N40','true'),
('L21c','N40','true'),
-- N22 / N23 routes
('N22','L22','true'),
('L22','N40','true'),
('N23','L23','true'),
('L23','N30','true'),
-- Special terminals -> N40 abstain
('N97','L97','true'),
('L97','N40','true'),
('N98','L98','true'),
('L98','N40','true'),
('N99','L99','true'),
-- Deterioration monitor (full red-flag set; S2 cross-time guard; S4 monotonic)
('N30','N03','cross_time_pupil_or_gcs_reversal_implausible'),
('N30','N20','(gcs_trend = ''declining'' OR pupil_change OR new_focal_asymmetry OR persistent_vomiting = ''yes'' OR severe_or_increasing_headache = ''yes'' OR agitation = ''yes'') AND second_observer_confirmed = ''yes'''),
('N30','L23','NOT redflag_fired AND gcs_total >= patient_baseline AND gcs_total >= 13 AND red_terminal_reached = false'),
-- Drill-site abstain terminal: N40 -> L40 (renders L40 string), L40 = hard terminal
('N40','L40','true'),
('L40',NULL,'TERMINAL_ABSTAIN_no_outgoing');

-- ============================================================
-- STRINGS   (the ONLY localizable layer; v1 ships lang='en')
-- ============================================================
INSERT INTO cgt_strings (node_id, lang, prompt, recommendation) VALUES
('N01','en','What caused the head injury - blunt blow, penetrating/gunshot, blast, open skull wound, or no trauma? How many hours since it happened?',NULL),
('N1A','en','Is the patient on any blood thinner (warfarin, a DOAC such as apixaban/rivaroxaban, or an antiplatelet such as aspirin/clopidogrel)? Any known bleeding disorder or liver disease?',NULL),
('N04','en','Score eye-opening (1-4), verbal (1-5), and best motor (1-6) separately.',NULL),
('N05','en','Left pupil size (mm) and reaction (brisk/sluggish/fixed); right pupil size (mm) and reaction.',NULL),
('N06','en','Systolic BP (mmHg); patient age (years); SpO2 % if a pulse-oximeter is available (say none if not); capillary/blood glucose if a glucometer is available (say none if not).',NULL),
('N07','en','Was there a lucid interval - patient coherent after the injury, then declined?',NULL),
('N08','en','Any one-sided limb weakness (which side)? Any abnormal posturing (decorticate/decerebrate)? Is the patient seizing now or not fully recovered from a seizure?',NULL),
('N02','en','Before any recommendation I need: {missing_field}. Please provide it.',NULL),
('N03','en','These two entries conflict: {a} vs {b}. Please re-check and re-enter - I will not guess.',NULL),
('L08S','en',NULL,'[YELLOW / STABILIZE_TRANSFER] Active or unresolved seizure. Give an abortive benzodiazepine per local availability (labeled principle - no agent/dose in the cited corpus). Re-evaluate the airway now. This is a discuss-with-neurosurgeon-regardless-of-imaging trigger: stabilize and transfer/tele-consult. (NICE 1.4.16 [VERIFY-NICE].)'),
('L10a','en',NULL,'[GREEN] Severe TBI (GCS<=8). Secure the airway: intubate and ventilate (NICE NG232 [VERIFY-NICE]); ketamine RSI is the LMIC-appropriate haemodynamically-stable induction (labeled principle, doc 10). NOTE: loss of laryngeal reflexes, irregular respirations, hypoxaemia or hypercarbia are independent intubation triggers but are clinician-judgment overrides OUTSIDE this deterministic tree (the tree captures no respiratory pattern or CO2).'),
('L10b','en',NULL,'[GREEN] Moderate TBI (GCS 9-12, NICE [VERIFY-NICE]). Protect the airway, give high-flow oxygen, monitor continuously, pre-empt deterioration. (Airway-protection detail is extrapolated good practice, not a verbatim NICE rec - VF-8.)'),
('L10c','en',NULL,'[GREEN] Mild TBI (GCS 13-15, NICE [VERIFY-NICE]). Observe on the NICE schedule (half-hourly until GCS 15, then per schedule). Airway watch only.'),
('L11a','en',NULL,'[GREEN] Hypotension below the BTF age target. Resuscitate with isotonic (0.9%) saline to SBP >=100 (age 50-69) or >=110 (age 15-49 or >70); avoid hypotonic/glucose fluids. Hypotension is a treatable cause of secondary brain injury; permissive hypotension is contraindicated with head injury (BTF 4th Ed Level III; doc 10 rule 2).'),
('L11b','en',NULL,'[GREEN] SBP at or above the BTF age-stratified target. Maintain normotension and recheck on the observation schedule (BTF 4th Ed Level III).'),
('L12a','en',NULL,'[YELLOW - LABELED NON-SPECIFIC] Peshawar/WHO require adequate oxygenation but state no numeric SpO2 cutoff; BTF gives none. Give supplemental oxygen and target adequate saturation. The 94% trigger is general critical-care convention, not a cited number (VF-2).'),
('L12b','en',NULL,'[YELLOW] No pulse-oximeter value. Give supplemental oxygen empirically and obtain oximetry as soon as possible. IMPORTANT: with oxygenation UNMEASURED, hypoxia is treated as NOT excluded - mannitol must not proceed on the assumption that oxygenation is adequate (S5).'),
('L12c','en',NULL,'[GREEN] Oxygenation adequate by the available reading; maintain.'),
('L13','en',NULL,'[YELLOW - LABELED NON-SPECIFIC] Position the head up about 30 degrees with neutral neck alignment (avoid jugular compression). Standard practice but NOT a recommendation in BTF 4th Ed or any cited source - apply as a general principle, not a guideline mandate (VF-3).'),
('L14a','en',NULL,'[GREEN] Herniation/progressive deterioration WITH extracranial causes affirmatively excluded (SBP at target, oxygenation measured-and-adequate, glucose measured-and-normal). Give mannitol 0.25-1 g/kg IV (BTF 4th Ed dose; legacy statement, no current Level - VF-6).'),
('L14b','en',NULL,'[YELLOW - LABELED CAUTION] Mannitol is restricted to deterioration NOT attributable to extracranial causes. An extracranial cause is either present OR UNMEASURED (hypotension, hypoxia, OR unknown SpO2/glucose). Correct hypotension/hypoxia/hypoglycaemia - or obtain the missing measurement - FIRST, then reassess. Do NOT give mannitol now; it can precipitate hypotension and worsen secondary injury (S5: unmeasured is not excluded).'),
('L14c','en',NULL,'[GREEN] No herniation signs. Do NOT give prophylactic mannitol (BTF: restrict pre-monitoring mannitol to herniation or progressive deterioration).'),
('L15','en',NULL,'[GREEN] Give phenytoin for early post-traumatic seizure prophylaxis (within 7 days of injury), then STOP - do NOT continue for late-seizure prevention (BTF 4th Ed Level IIA; levetiracetam not guideline-preferred over phenytoin). If within 3 h of injury with reactive pupils / mild-moderate GCS, early TXA is a cheap LMIC-recommendable adjunct (labeled principle, CRASH-3 [VERIFY-TXA]). Distinct from the active-seizure abortive order.'),
('L16','en',NULL,'[GREEN] DO NOT: (1) give steroids or high-dose methylprednisolone - CONTRAINDICATED, BTF Level I (strongest grade, increases mortality); (2) apply EARLY (within 2.5 h), short-term (48 h), prophylactic hypothermia in diffuse injury - BTF Level IIB; (3) use PROLONGED/prophylactic hyperventilation to PaCO2 <=25 - BTF Level IIB. Avoiding hyperventilation in the first 24 h and using brief hyperventilation only as an active-herniation temporizing rescue are BTF 4th Ed LEGACY 3rd-Edition statements (no current Level). Brief hyperventilation is handled as a guarded action (N16H), not an open instruction.'),
('L16Ba','en',NULL,'[YELLOW - LABELED PRINCIPLE] The patient is anticoagulated or has a known coagulopathy - a treatable secondary-injury driver. Reverse/correct per available agents (e.g. vitamin K + PCC for warfarin where available; obtain coagulation studies if possible). Specific agent and dose are NOT specified in the cited corpus.'),
('L16Bb','en',NULL,'[YELLOW - HARM-TRAP GUARD] Do NOT routinely recommend platelet transfusion for antiplatelet-associated traumatic intracranial haemorrhage (associated with harm - PATCH). Discuss with the receiving neurosurgeon. Labeled principle [VERIFY-PATCH].'),
('L16Ha','en',NULL,'[YELLOW - LABELED LEGACY PRINCIPLE] Brief, mild hyperventilation may be used ONLY as a short temporizing rescue for ACTIVE herniation while mannitol/transfer proceed (target ~ETCO2/PaCO2 35). Do NOT sustain it, do NOT drive PaCO2 to <=25, and avoid it in the first 24 h where feasible. Not a current-Level recommendation.'),
('L16Hb','en',NULL,'[GREEN] No herniation signs - use normoventilation. Do NOT hyperventilate (risk of ischaemia).'),
('L17','en',NULL,'[GREEN] Begin NICE neuro-observations [VERIFY-NICE]: GCS (E/V/M), pupil size and reactivity, limb movements, RR, HR, BP, temperature, SpO2. Frequency: half-hourly until GCS 15, then per schedule. Any deterioration reverts to half-hourly. This is the no-CT early-warning system.'),
('L21a','en',NULL,'[RED / STABILIZE_TRANSFER] Herniation surrogate present AND transfer reachable in the window. ABSTAIN from local operation. Intubate, give mannitol if criteria met, maintain SBP and oxygenation, transfer NOW to a neurosurgery-capable facility (Peshawar: target <=4 h injury-to-facility; 30% vs 90% mortality). Tele-consult a neurosurgeon en route. (Drill-site localization is deferred at N40.)'),
('L21b','en',NULL,'[GUIDE - operate-locally; RED at the act] Herniation surrogate present, transfer NOT achievable in window, tele-consult AVAILABLE. This is an operate-locally case: Peshawar authorises supervised TASK-SHARING only under live neurosurgeon supervision. Surface the cited operative context and HAND OFF NOW to the supervising neurosurgeon. Kyro provides ZERO operative or localization guidance under ANY circumstance, including active supervision - all operative direction comes from the supervising neurosurgeon, not Kyro. Continue all stabilization.'),
('L21c','en',NULL,'[GUIDE - operate-locally; RED at the act] Herniation surrogate present, NO transfer in window, NO tele-consult. This is an operate-locally case but with no supervisor reachable: Kyro is NOT authorised to direct an unsupervised craniostomy (Peshawar task-SHARING WITH oversight, not task-SHIFTING; Bullock/Wester: worse outcomes for non-neurosurgeons operating unsupervised). Give maximal medical therapy and CONTINUE attempting tele-consult and transfer. The drilling decision remains a neurosurgeon''s.'),
('L22','en',NULL,'[RED / STABILIZE_TRANSFER] Severe TBI (GCS<=8), progressive deterioration/focal signs, penetrating/blast/open injury, or anticoagulation WITHOUT a complete herniation cluster. Discuss with a neurosurgeon and transfer regardless of imaging (NICE 1.4.16/1.8.1 [VERIFY-NICE]). ABSTAIN from local operation. Stabilize, intubate if GCS<=8, transfer to a neurosurgery-capable facility, tele-consult now. For penetrating/blast: add broad-spectrum antibiotics + antiseizure cover (labeled principle); do not probe/remove deep fragments.'),
('L23','en',NULL,'[GREEN / OBSERVE] Mild/stable (GCS>=13, all pupils reactive, no focal signs, no lucid interval, blunt mechanism, NOT anticoagulated). Admit and observe on the NICE schedule. Arm deterioration triggers (N30). Low threshold to transfer: unexplained confusion >4 h, ANY GCS drop, new focal sign, or pupil change - re-enter the deterioration monitor. (PJNS RCT: small EDH with no deficit can be managed conservatively with monitoring.)'),
('N30','en','Repeat GCS (E/V/M), pupils, and limb movements at the scheduled interval. Any persistent vomiting, severe/increasing headache, or agitation? Has a second competent staff member confirmed any deterioration?',NULL),
('L40','en',NULL,'[RED / ABSTAIN_STOP] STOP. WHERE to place a burr hole or how to perform the craniostomy/craniotomy is OUTSIDE Kyro''s scope and is NOT derivable from non-CT clinical signs (a fixed pupil and motor signs lateralize imperfectly; localization without imaging is unreliable). Kyro provides ZERO operative or localization guidance under ANY circumstance, including active neurosurgeon supervision - all operative direction comes from the supervising neurosurgeon, not Kyro. Continue airway, normotension, oxygenation, head-up, mannitol-per-criteria, coagulopathy correction, and transfer efforts. Kyro will not name a drill site under any input.'),
('L97','en',NULL,'[RED / ABSTAIN_STOP] BILATERAL FIXED DILATED PUPILS - the most ominous herniation sign, but NOT automatically futile (if pupils react to osmotherapy a meaningful fraction survive). Do NOT nihilistically abandon and do NOT blind-drill. Give maximal medical therapy (airway, mannitol if extracranial causes excluded, normotension, oxygen), reassess pupillary response, and hand the decision to a neurosurgeon via tele-consult. Prognosis is grave; goals-of-care discussion is appropriate, but the operative decision is deferred to the neurosurgeon, never toward local autonomous operation. [VERIFY VF-10.]'),
('L98','en',NULL,'[RED / ABSTAIN_STOP] Patient age < 15 is OUTSIDE this tool''s encoded adult thresholds (adult BTF SBP bands and adult GCS do not apply to children - a hypotensive child must NOT be read as normotensive). Kyro ABSTAINS from adult-threshold guidance. Stabilize with labeled pediatric principles (airway; maintain age-based minimum SBP approx 70 + 2 x age mmHg - labeled non-specific; oxygenation; head-up; treat hypoglycaemia) and transfer + tele-consult a neurosurgeon now. Pediatric protocol is roadmap, not encoded.'),
('L99','en',NULL,'[RED / ABSTAIN_STOP] Input not recognised as a valid value, or an out-of-range entry. Kyro ABSTAINS rather than guess. Default safe action: stabilize (airway, normotension, oxygenation, head-up), transfer to a neurosurgery-capable facility, escalate via tele-consult. Re-enter the tree once valid structured fields are available.');

-- ============================================================
-- META   (ed25519 signature applied at bundle-compile time)
-- ============================================================
INSERT INTO cgt_meta (root_id, version, signature) VALUES
('N00', 3, 'UNSIGNED-pending-ed25519-at-bundle-compile');

-- ============================================================
-- [VERIFY-MENTOR] PROPOSED GRADUATED-ASSISTANCE CHANGES (v4 candidate) — UNSIGNED, NOT ACTIVE
-- ------------------------------------------------------------
-- Status: DRAFT for mentor sign-off. The ACTIVE tree above is UNCHANGED (the
--   doc-19 benchmark answer key stays stable). Everything below is intentionally
--   commented out: NOTHING here is live until the mentor approves and we
--   uncomment + bump cgt_meta.version + re-sign.
-- Why: "abstain-and-forward" is useless where no neurosurgeon is reachable (HM's
--   case). Re-badge grounded help from RED-abstain to YELLOW-grounded, and close
--   the one real dead-end (N22 has no "transfer infeasible" branch). Where-to-cut
--   (N40) STAYS a hard ABSTAIN_STOP — the imaging wall is real and non-negotiable.
-- Tracking: docs/21 mentor pack §PART 1 (VF-GRAD-1/2/3) + §PART 4.
-- ============================================================
--
-- ---- P1 [VERIFY-MENTOR] N98 pediatric: ABSTAIN_STOP -> grounded STABILIZE_TRANSFER ----
--   L98 already lists grounded peds stabilization; today it is badged as a refusal.
--   Re-badge to graduated grounded help; adult thresholds still NOT applied; any
--   operative step still funnels to N40 ABSTAIN. (REPLACES active N98/L98 + L98 string.)
-- ('N98','terminal','age_yr',1,'STABILIZE_TRANSFER','[VERIFY-MENTOR] Pediatric (age<15): adult BTF SBP bands + adult GCS do NOT apply; give LABELED peds stabilization instead of abstaining; operative step still N40 ABSTAIN; peds SBP ~70+2*age = labeled principle',2),
-- ('L98','leaf',NULL,0,'STABILIZE_TRANSFER','[VERIFY-MENTOR] grounded peds stabilization + transfer + tele-consult; no adult thresholds applied',2),
-- ('L98','en',NULL,'[YELLOW / STABILIZE_TRANSFER] Patient age < 15. Adult thresholds do NOT apply (a hypotensive child must not be read as normotensive), so Kyro does not give adult-protocol numbers - but it does NOT stop helping. Grounded pediatric stabilization: secure the airway; keep age-based minimum SBP approx 70 + 2 x age mmHg (labeled principle); ensure oxygenation; head-up; treat hypoglycaemia; transfer + tele-consult a neurosurgeon now. (Full pediatric pathway = roadmap, not yet encoded.)'),
--
-- ---- P2 [VERIFY-MENTOR] N22: close the "transfer infeasible" dead-end ----
--   Today N22 -> L22 unconditionally says "transfer", even where transfer is impossible
--   (HM). Make N22 capture transfer feasibility and branch to grounded maximal-medical
--   when transfer is NOT reachable. Non-herniation route => no local-operate decision.
--   (REPLACES active N22 node + ('N22','L22','true'); ADDS L22m node/edges/string.)
-- ('N22','decision','transfer_feasible_within_window',1,NULL,'[VERIFY-MENTOR] discuss/transfer-regardless triggers (NICE 1.4.16/1.8.1 [VERIFY-NICE]); branch on transfer feasibility so a no-transfer setting still gets grounded maximal medical, never a dead end',1),
-- ('L22m','leaf',NULL,0,'STABILIZE_TRANSFER','[VERIFY-MENTOR] transfer NOT feasible -> grounded maximal medical + keep attempting transfer/tele-consult; non-operative (no herniation cluster)',1),
--   edges:
-- ('N22','L22','transfer_feasible_within_window = ''yes'''),
-- ('N22','L22m','transfer_feasible_within_window IN [''no'',''unknown'']'),
-- ('L22m','N40','true'),
-- ('N22','en','Is transfer to a neurosurgery-capable facility feasible within the window?',NULL),
-- ('L22m','en',NULL,'[YELLOW / maximal medical] Severe or progressing injury without a complete herniation cluster, and transfer is NOT reachable in the window. This is NOT a local-operation case (no operate indication on these signs). Give grounded maximal medical therapy: airway/intubate if GCS<=8, normotension, oxygenation, head-up, mannitol-per-criteria, coagulopathy correction, seizure cover; keep attempting transfer + tele-consult; run the deterioration monitor. Re-enter the herniation gate if a concordant cluster develops.'),
--
-- ---- P3 [VERIFY-MENTOR] N99: keep RED for INVALID input, but lead with grounded help ----
--   N99 fires only on impossible/contradictory values (GCS/SBP out of range) -> abstaining
--   on the SPECIFIC out-of-range value is correct (cannot extrapolate from a typo). But the
--   safe default should read as grounded YELLOW help, not a bare refusal. Scope note: N99 is
--   for UNPARSEABLE/contradictory input ONLY; a plausible-but-uncovered presentation must
--   route to YELLOW grounded principles elsewhere, never here. (Logic unchanged; framing only.)
-- ('L99','en',NULL,'[YELLOW grounded default + RED on the specific value] An entry is out of range or self-contradictory, so Kyro will not guess that specific field - but it still helps: give grounded stabilization (airway, normotension, oxygenation, head-up), transfer to a neurosurgery-capable facility, tele-consult. Re-enter the tree once the field is valid.'),
