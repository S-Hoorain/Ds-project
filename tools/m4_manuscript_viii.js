// Section VIII of the Milestone 4 manuscript (ethical governance), used by tools/build_manuscript_m4.js.
// Exports a function that receives the builder helpers and the numbers object and adds the section.
module.exports = function sectionVIII({ add, H1, H2, P, BUL, table, nt }, N) {
  add(H1("VIII. Ethical Governance and Living-Lab Deployment"));

  add(
    H2("A. Assessment Against the FATEN Principles"),
    P("Table " + nt() + " assesses the final system against the principles of Fairness, Autonomy, Trust, Equity and Non-maleficence (FATEN). It separates what the audit can show, how errors are shared between the quintiles, from what it cannot, anyone the SPI does not measure."),
    table("The final system against the FATEN principles.", ["Principle", "What it asks here", "Evidence from our audit", "Remaining risk", "Safeguard"], N.fatenRows,
      [1100, 1700, 2350, 1950, 1926], ["l", "l", "l", "l", "l"], null, 16),
  );

  add(
    H2("B. Living-Lab Deployment"),
    P("A living lab tests a system with its real users in its real setting, under observation and free to change, before it is scaled up. Here it would be a six-month pilot with a social-protection desk at BISP or a provincial authority. Each Friday after the SPI release, the desk receives an alarm, a probability and the signals behind it for each quintile, staff decide whether to prepare a top-up, and every alarm, decision and outcome is logged. The stakeholders are the desk, the Ministry of Finance, PBS, the price setters (NEPRA, OGRA and the Economic Coordination Committee), beneficiary households and their representatives, and an independent reviewer. Our results already show how such a pilot would fail (Table " + nt() + ")."),
    table("Failure modes in a living-lab pilot and the safeguards against them.", ["Failure mode", "Evidence in our data", "Safeguard"], N.labRows,
      [2300, 3363, 3363], ["l", "l", "l"], null, 17),
  );

  add(
    H2("C. Digital Marginalization"),
    P("The SPI covers 17 cities, so rural households, who make up most of Pakistan's poor, are absent, and the quintiles rest on 2015-16 weights that may no longer describe today's baskets. Equal error rates across five urban quintiles say nothing about these groups. The alarm should therefore add to BISP's targeting and never replace it, a silent alarm must never be read as evidence that no help is needed, and rural price data (for example PBS's rural CPI) should be added before the system times support for rural beneficiaries."),
  );

  add(
    H2("D. Governance Recommendations"),
    BUL("**Human decision, machine warning.** Staff decide and see the probability and its reasons, and nobody's eligibility depends on the model."),
    BUL("**Fairness dashboard.** Monthly recall, false-positive rate and alert rate by quintile, with a review when a gap exceeds the agreed tolerance."),
    BUL("**Recalibration.** Re-choose the threshold when the alert and shock rates drift apart, and retrain and re-audit when the regime changes."),
    BUL("**Institutional warning.** The price setters notify the desk before an administered price change."),
    BUL("**Internal alarms.** Alarms stay internal, and results are published with a delay."),
    BUL("**Accountability.** A model card, a log of every alarm, decision and override, and an annual independent review."),
    BUL("**Open value judgements.** The 5 : 1 miss cost and the double Q1 weight are set by the agency with the people affected, not by the modelling team."),
  );
};
