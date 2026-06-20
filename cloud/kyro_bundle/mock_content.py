"""
Hand-authored MOCK content for edh-core-v0-mock.kyro.

Purpose: give the EDGE stream a schema-correct, non-empty bundle to wire against TODAY.
The clinical facts are real (canonical EDH guidance) so the demo isn't embarrassing, but
this is NOT the validated knowledge base and the CGT here is a deliberately tiny placeholder.

  • L2 (chunks/nodes/edges): the REAL graph comes from C1→C5 (GraphRAG over the corpus).
  • L1 (cgt_*): the REAL spine comes from Gowrish's authoring workflow + mentor sign-off.

Everything here is replaced wholesale by the real pipeline. Keep it small.
"""

# --- L2: citeable source chunks (text_unit / community_report) -----------------------
# trust_tier: 0 = canonical guideline-grade, 1 = provisional/expert.

CHUNKS = [
    ("ch01", "text_unit",
     "The classic extradural (epidural) haematoma presents with a brief loss of "
     "consciousness, followed by a lucid interval of minutes to hours, then rapid "
     "neurological deterioration as the clot expands and raises intracranial pressure.",
     "WFNS Peshawar Recommendations 2019, p.3", "peshawar2019", 0),

    ("ch02", "text_unit",
     "An epidural haematoma larger than 30 cm3 should be surgically evacuated regardless "
     "of the Glasgow Coma Scale score. Smaller clots may be observed if the patient is "
     "neurologically intact and serial monitoring is available.",
     "Brain Trauma Foundation Surgical Guidelines, p.2", "btf-surgical", 0),

    ("ch03", "text_unit",
     "A unilateral fixed, dilated pupil with contralateral limb weakness signals uncal "
     "herniation and is a surgical emergency. The dilated pupil is almost always on the "
     "same side as the expanding mass lesion.",
     "Brain Trauma Foundation, Herniation Syndromes, p.5", "btf-herniation", 0),

    ("ch04", "text_unit",
     "A fall in the Glasgow Coma Scale of two or more points, or any GCS below 9 after a "
     "head injury, indicates a deteriorating patient who needs urgent imaging or, where "
     "imaging is unavailable, urgent surgical decision-making.",
     "WFNS Peshawar Recommendations 2019, p.4", "peshawar2019", 0),

    ("ch05", "text_unit",
     "Where no neurosurgeon is reachable and signs of herniation are present, the Peshawar "
     "consensus endorses evacuation of an extradural haematoma by a trained general "
     "practitioner or general surgeon under remote specialist supervision, as a "
     "life-saving measure when transfer is not feasible in time.",
     "WFNS Peshawar Recommendations 2019, p.6", "peshawar2019", 0),

    ("ch06", "text_unit",
     "Extradural haematoma is a time-critical 'talk and die' lesion. Mortality rises sharply "
     "with every hour of delay to evacuation; outcomes are excellent when the clot is removed "
     "before herniation becomes established.",
     "Brain Trauma Foundation, Outcomes, p.8", "btf-outcomes", 0),

    ("ch07", "text_unit",
     "Before and during transfer, prevent secondary brain injury: secure the airway, keep the "
     "head elevated 30 degrees, maintain oxygen saturation above 94 percent, and avoid "
     "hypotension. A single episode of hypoxia or hypotension worsens outcome.",
     "Brain Trauma Foundation, Prehospital Care, p.3", "btf-prehospital", 0),

    ("ch08", "community_report",
     "Acute EDH triage in resource-limited settings hinges on three signals: a lucid interval, "
     "an expanding anisocoria, and a falling GCS. With no CT, the operate-versus-transfer "
     "decision weighs herniation signs against realistic transfer time; abstention and live "
     "specialist escalation are the safe default whenever evidence is incomplete.",
     "Kyro edh-core community summary (mock)", "kyro-mock", 1),
]

# --- L2: entities (nodes) + description embeddings -----------------------------------

NODES = [
    ("n_edh", "Extradural Haematoma", "condition",
     "Collection of blood between the dura and skull, usually arterial; classic lucid "
     "interval then rapid deterioration.", 0),
    ("n_lucid", "Lucid Interval", "sign",
     "Transient recovery of consciousness between initial impact and secondary "
     "deterioration; hallmark of EDH.", 0),
    ("n_herniation", "Uncal Herniation", "condition",
     "Displacement of the uncus compressing the third nerve and brainstem; fixed dilated "
     "pupil + contralateral weakness.", 0),
    ("n_gcs", "Glasgow Coma Scale", "assessment",
     "15-point conscious-level score; a drop of >=2 or value <9 signals deterioration.", 0),
    ("n_anisocoria", "Anisocoria", "sign",
     "Unequal pupils; a unilateral fixed dilated pupil indicates ipsilateral mass effect.", 0),
    ("n_burrhole", "Burr Hole Evacuation", "procedure",
     "Emergency drainage of an extradural clot via a cranial burr hole when no "
     "neurosurgeon or imaging is available.", 0),
    ("n_peshawar", "Peshawar Recommendations", "guideline",
     "Pakistan-authored WFNS consensus endorsing supervised non-specialist EDH evacuation "
     "and golden-hour timing.", 0),
    ("n_secondary", "Secondary Injury Prevention", "principle",
     "Avoidance of hypoxia and hypotension and control of ICP to limit injury after the "
     "primary insult.", 0),
]

# --- L2: relationships (edges) -------------------------------------------------------

EDGES = [
    ("n_edh", "n_lucid", "presents_with", 0.9, "ch01"),
    ("n_edh", "n_herniation", "can_progress_to", 0.95, "ch01"),
    ("n_herniation", "n_anisocoria", "presents_with", 0.9, "ch03"),
    ("n_herniation", "n_gcs", "lowers", 0.85, "ch04"),
    ("n_edh", "n_burrhole", "treated_by", 0.9, "ch02"),
    ("n_burrhole", "n_peshawar", "sanctioned_by", 0.8, "ch05"),
    ("n_edh", "n_secondary", "managed_with", 0.7, "ch07"),
]

# --- L2: community membership --------------------------------------------------------

NODE_COMMUNITY = [
    ("n_edh", "c_edh_core", 0),
    ("n_lucid", "c_edh_core", 0),
    ("n_herniation", "c_edh_core", 0),
    ("n_gcs", "c_edh_core", 0),
    ("n_anisocoria", "c_edh_core", 0),
    ("n_burrhole", "c_edh_core", 0),
    ("n_peshawar", "c_edh_core", 0),
    ("n_secondary", "c_edh_core", 0),
]

# --- L1: MOCK Clinical Guidance Tree (placeholder — real spine from Gowrish's workflow) ---
# Just enough nodes/edges/strings for E3 to traverse advance/act/ask end-to-end and hit
# each of the four leaf actions. Uses doc 19 vocabulary: GUIDE / OBSERVE / STABILIZE_TRANSFER
# / ABSTAIN_STOP.

CGT_ROOT = "g_gcs"
CGT_VERSION = 0

CGT_NODES = [
    # id,        kind,       field,            required, action,              citation,                               tier
    ("g_gcs",    "gather",   "gcs",            1, None,                "WFNS Peshawar Recommendations 2019, p.4", 0),
    ("g_pupil",  "gather",   "pupil_left",     1, None,                "BTF Herniation Syndromes, p.5",           0),
    ("g_lucid",  "gather",   "lucid_interval", 1, None,                "WFNS Peshawar Recommendations 2019, p.3", 0),
    ("d_hern",   "decision", "herniation",     1, None,                "BTF Herniation Syndromes, p.5",           0),
    ("d_xfer",   "decision", "transfer_feasible", 1, None,             "WFNS Peshawar Recommendations 2019, p.6", 0),
    ("l_guide",  "leaf",     None,             0, "GUIDE",             "WFNS Peshawar Recommendations 2019, p.6", 0),
    ("l_xfer",   "leaf",     None,             0, "STABILIZE_TRANSFER","BTF Prehospital Care, p.3",               0),
    ("l_obs",    "leaf",     None,             0, "OBSERVE",           "BTF Surgical Guidelines, p.2",            0),
    ("l_abstain","leaf",     None,             0, "ABSTAIN_STOP",      "Kyro safety rule (mock)",                 0),
]

CGT_EDGES = [
    ("g_gcs",   "g_pupil",  "answered"),
    ("g_pupil", "g_lucid",  "answered"),
    ("g_lucid", "d_hern",   "answered"),
    # decision: herniation signs present?
    ("d_hern",  "d_xfer",   "herniation_present"),
    ("d_hern",  "l_obs",    "no_herniation_stable"),
    ("d_hern",  "l_abstain","evidence_incomplete"),
    # decision: can the patient reach a neurosurgeon in time?
    ("d_xfer",  "l_xfer",   "transfer_feasible"),
    ("d_xfer",  "l_guide",  "transfer_not_feasible"),
]

# (node_id, lang, prompt, recommendation)
CGT_STRINGS = [
    ("g_gcs", "en", "What is the patient's GCS right now (eyes, verbal, motor)?", None),
    ("g_pupil", "en", "Check the pupils. Is either pupil fixed and dilated? Which side?", None),
    ("g_lucid", "en", "Did the patient have a lucid interval — a period of being awake and "
                      "talking after the injury before getting worse?", None),
    ("d_hern", "en", "Assessing for herniation from the pupils and GCS trend...", None),
    ("d_xfer", "en", "Can the patient realistically reach a neurosurgical centre in time?", None),
    ("l_guide", "en", None,
     "Herniation with no feasible transfer: this meets the Peshawar criteria for supervised "
     "evacuation. Connect a neurosurgeon now for live guidance; do not proceed unsupervised."),
    ("l_xfer", "en", None,
     "Stabilise and transfer: secure airway, head up 30 degrees, keep SpO2 >94%, avoid "
     "hypotension, and move to the nearest neurosurgical centre urgently."),
    ("l_obs", "en", None,
     "No herniation signs and patient stable: observe with serial GCS and pupils; escalate "
     "immediately on any deterioration."),
    ("l_abstain", "en", None,
     "Critical evidence is missing or contradictory. Kyro is abstaining from a recommendation "
     "and connecting a live specialist. Continue gathering: GCS, pupils, lucid interval."),
]
