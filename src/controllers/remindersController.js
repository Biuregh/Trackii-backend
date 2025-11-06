const Profile = require("../models/Profile");
const Prescription = require("../models/Prescription");
const ReminderDismissal = require("../models/ReminderDismissal");

function parseFrequency(freqRaw) {
  const f = String(freqRaw || "").toLowerCase();
  if (/(2x|twice).*(day)/.test(f)) return { kind: "times", times: ["09:00", "21:00"] };
  if (/(1x|once|daily)/.test(f)) return { kind: "times", times: ["09:00"] };
  const m = f.match(/every\s+(\d+)\s*h/);
  if (m) return { kind: "interval", hours: Math.max(1, parseInt(m[1], 10)) };
  return { kind: "times", times: ["09:00"] };
}
function atTime(day, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}
function isoKey(d) { return new Date(d).toISOString(); }

async function list(req, res) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const hardCap = Math.min(Math.max(parseInt(req.query.limit || 100, 10), 1), 200);

  const profiles = await Profile.find({ userId: req.user.id }).select("_id name").lean();
  const profileIds = profiles.map(p => p._id);
  const nameById = new Map(profiles.map(p => [String(p._id), p.name]));

  const rxs = await Prescription.find({
    profileId: { $in: profileIds },
    active: true,
    startDate: { $lte: now },
    $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: now } }],
  }).lean();

  const candidates = [];

  for (const rx of rxs) {
    const sched = parseFrequency(rx.frequency);

    if (sched.kind === "times") {
      for (const add of [0, 1]) {
        const day = new Date(now);
        day.setDate(now.getDate() + add);
        for (const t of sched.times) {
          const ts = atTime(day, t);
          if (ts >= now && ts <= windowEnd) {
            candidates.push({
              key: `${rx._id}:${isoKey(ts)}`,
              when: ts,
              title: `Take ${rx.name}${rx.dosage ? ` ${rx.dosage}` : ""}`,
              type: "medication",
              profileId: rx.profileId,
              profileName: nameById.get(String(rx.profileId)) || "—",
              notes: rx.notes || "",
            });
          }
        }
      }
    } else if (sched.kind === "interval") {
      const step = sched.hours * 60 * 60 * 1000;
      let nextTs = new Date(Math.ceil(now.getTime() / step) * step);
      if (rx.endDate && nextTs > new Date(rx.endDate)) continue;

      candidates.push({
        key: `${rx._id}:${isoKey(nextTs)}`,
        when: nextTs,
        title: `Take ${rx.name}${rx.dosage ? ` ${rx.dosage}` : ""}`,
        type: "medication",
        profileId: rx.profileId,
        profileName: nameById.get(String(rx.profileId)) || "—",
        notes: rx.notes || "",
        _intervalStepMs: step,
      });
    }
  }

  const keys = candidates.map(c => c.key);
  const dismissals = keys.length
    ? await ReminderDismissal.find({ userId: req.user.id, key: { $in: keys }, expiresAt: { $gt: now } })
      .select("key").lean()
    : [];
  const dismissed = new Set(dismissals.map(d => d.key));
  const items = candidates.filter(c => !dismissed.has(c.key));

  items.sort((a, b) => a.when - b.when);
  res.json({ data: items.slice(0, hardCap) });
}

async function dismiss(req, res) {
  const raw = String(req.params.key || "");
  const [rxId, iso] = raw.split(":");
  let when = iso ? new Date(iso) : null;

  let expiresAt;
  if (when && !isNaN(when.getTime())) {
    expiresAt = new Date(when.getTime() + 5 * 60 * 1000);
  } else {
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  const key = raw;
  await ReminderDismissal.updateOne(
    { userId: req.user.id, key },
    { $set: { userId: req.user.id, key, expiresAt } },
    { upsert: true }
  );

  res.json({ data: { key, dismissed: true, until: expiresAt } });
}

module.exports = { list, dismiss };
