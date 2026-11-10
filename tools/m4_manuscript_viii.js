// Section VIII of the Milestone 4 manuscript (ethical governance), used by tools/build_manuscript_m4.js.
// Exports a function that receives the builder helpers and the numbers object and adds the section.
module.exports = function sectionVIII({ add, H1, H2, P, BUL, table, nt }, N) {
  add(H1("VIII. Ethical Governance and Living-Lab Deployment"));

  add(
    H2("A. Assessment Against the FATEN Principles"),
    P("The course frames responsible deployment through five principles, which are Fairness, Autonomy, Trust, Equity and Non-maleficence (FATEN). Table " + nt() + " assesses the final system against each, with the evidence from Sections VI and VII, the risk that remains and the safeguard we propose. The assessment separates what the audit can show, which is how errors are shared between the five quintiles, from what it cannot, which is anyone the SPI does not measure."),
    table("The final system against the FATEN principles.", ["Principle", "What it asks here", "Evidence from our audit", "Remaining risk", "Safeguard"], N.fatenRows,
      [1100, 1700, 2350, 1950, 1926], ["l", "l", "l", "l", "l"], null, 16),
  );

  add(
    H2("B. Living-Lab Deployment"),
    P("A living lab tests a system with its real users in its real setting, under close observation and with the freedom to change it, before it is scaled up. For this model it would be a pilot of about six months with a social-protection desk at BISP or a provincial social-protection authority. Each Friday, after PBS releases the SPI, the model is re-run and the desk receives an alarm and a probability for each quintile, together with the signals behind the alarm. Staff decide whether to prepare or bring forward a top-up, and the next release shows whether the shock came. Every alarm, decision and outcome is logged. The stakeholders are the desk (the users), the Ministry of Finance (the budget), PBS (the data), NEPRA, OGRA and the Economic Coordination Committee (who set administered prices), beneficiary households and the civil-society groups that represent them, and an independent reviewer."),
    P("Our results already show how the system would fail in such a pilot (Table " + nt() + "). The most likely failure is the one Milestone 3 found and Section VI-F confirms, that a threshold chosen in one inflation regime does not fit the next. The second is structural, because the shocks with no market lead signal, administered tariff increases and the first wave of a fuel price rise, are exactly the ones a model cannot learn to anticipate. The third is the one this milestone is about, that the system may serve one quintile worse than another without anyone noticing unless the gap is monitored."),
    table("Failure modes in a living-lab pilot and the safeguards against them.", ["Failure mode", "Evidence in our data", "Safeguard"], N.labRows,
      [2300, 3363, 3363], ["l", "l", "l"], null, 17),
  );

  add(
    H2("C. Digital Marginalization"),
    P("The households least visible to the data are the ones most at risk of being left out by any system that acts only on what the SPI measures. The SPI covers 17 cities, so rural households, who make up most of Pakistan's poor, are not in the data at all. The quintiles rest on 2015-16 expenditure weights, so households whose consumption has changed since then are described by a basket that is no longer theirs. Equal error rates across the five urban quintiles say nothing about these groups. Two rules follow. The alarm should add to BISP's existing targeting and never replace it, and an alarm that does not fire must never be read as evidence that no help is needed. In addition, the next version of the system should add rural price data (for example PBS's rural CPI) before it is used to time support for rural beneficiaries."),
  );

  add(
    H2("D. Governance Recommendations"),
    BUL("**Human decision, machine warning.** The model informs a decision taken by staff, and nobody's eligibility for support depends on it. Staff see the probability and its reasons, not only a yes or no."),
    BUL("**A fairness dashboard.** Recall, false-positive rate and alert rate are reported by quintile every month, with the same definitions as Section VII, and a gap beyond the agreed tolerance triggers a review."),
    BUL("**Recalibration rules.** The threshold is re-chosen on recent weeks whenever the alert rate and the realised shock rate drift apart, and the model is retrained and re-audited when the inflation regime changes. Milestone 5 will test how fast this works."),
    BUL("**Institutional early warning.** NEPRA, OGRA and the Economic Coordination Committee notify the desk before an administered price change takes effect, which is cheaper and more reliable than any forecast of these decisions."),
    BUL("**Internal alarms.** Alarms are not published, because a public warning of a price rise could feed expectations or hoarding. Results are published with a delay, together with the alarm record."),
    BUL("**Transparency and accountability.** A model card (data, features, thresholds, known failure modes), a log of every alarm, decision and override, and an independent annual review."),
    BUL("**Value judgements in the open.** The cost of a missed shock (five false alarms) and the extra weight on a missed Q1 shock (two) are policy choices. They should be set by the agency with the people affected, and revisited, not fixed by the modelling team."),
  );
};
