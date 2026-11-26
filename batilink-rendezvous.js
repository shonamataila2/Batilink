"use strict";

window.batilinkAppointments = (() => {
  const timeZone = "Pacific/Noumea";
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone, dateStyle: "short", timeStyle: "short"
  });
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });

  function timeSelect(label, initial = "") {
    const select = document.createElement("select");
    select.setAttribute("aria-label", label);
    select.add(new Option("Choisissez une heure", ""));
    for (let hour = 0; hour < 24; hour++) {
      for (const minute of ["00", "30"]) {
        const value = String(hour).padStart(2, "0") + ":" + minute;
        select.add(new Option(value, value));
      }
    }
    select.value = initial;
    return select;
  }

  function toInstant(date, time) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(time)) {
      return new Date(NaN);
    }
    const localAsUtc = new Date(date + "T" + time + ":00Z");
    if (!Number.isFinite(localAsUtc.getTime())) return localAsUtc;
    function inNoumea(instant) {
      const parts = Object.fromEntries(clock.formatToParts(instant).map(({ type, value }) => [type, value]));
      return parts.year + "-" + parts.month + "-" + parts.day + "T" + parts.hour + ":" + parts.minute;
    }
    const offset = Date.parse(inNoumea(localAsUtc) + ":00Z") - localAsUtc.getTime();
    const instant = new Date(localAsUtc.getTime() - offset);
    return inNoumea(instant) === date + "T" + time ? instant : new Date(NaN);
  }

  function dates(appointment) {
    const proposed = appointment.proposed_start_at;
    const counter = appointment.counter_start_at;
    const accepted = appointment.status === "accepted";
    const confirmed = accepted ? (appointment.confirmed_start_at || (!counter ? proposed : null)) : null;
    const lines = [];
    function add(label, value) {
      const date = new Date(value);
      if (value && Number.isFinite(date.getTime())) lines.push(label + " : " + formatter.format(date));
    }
    add("Date confirmée", confirmed);
    if (proposed !== confirmed) add("Date proposée initialement", proposed);
    if (counter !== confirmed) add("Date proposée par le client", counter);
    if (accepted && !confirmed) lines.push("Le créneau retenu n’est pas précisé dans le suivi.");
    return lines;
  }

  // BatiLink UX expiration V3
  function isExpired(appointment) {
    const value = appointment.status === "pending_client" ? appointment.proposed_start_at :
      appointment.status === "counter_proposed" ? appointment.counter_start_at : null;
    if (!["pending_client", "counter_proposed"].includes(appointment.status)) return false;
    const time = Date.parse(value);
    return !Number.isFinite(time) || time <= Date.now();
  }

  function renderList(container, appointments, render) {
    const existing = new Map(Array.from(container.children, node => [node.dataset.appointmentId, node]));
    for (const appointment of appointments) {
      const id = String(appointment.appointment_id);
      const signature = JSON.stringify([
        appointment.status, appointment.proposed_start_at, appointment.counter_start_at,
        appointment.confirmed_start_at, appointment.message, isExpired(appointment)
      ]);
      const previous = existing.get(id);
      existing.delete(id);
      if (previous?.dataset.signature === signature) continue;
      const node = render(appointment);
      node.dataset.appointmentId = id;
      node.dataset.signature = signature;
      if (previous) previous.replaceWith(node);
      else container.append(node);
    }
    for (const node of existing.values()) node.remove();
  }

  function watch(section, refresh) {
    function check() {
      if (!document.hidden && !section.classList.contains("hidden")) refresh();
    }
    window.setInterval(check, 30000);
    document.addEventListener("visibilitychange", check);
  }

  return { timeSelect, toInstant, dates, renderList, watch, isExpired };
})();
