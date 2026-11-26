
(async function () {
  const zone = document.getElementById("annonces-professionnelles");
  const statut = document.getElementById("annonces-status");

  if (!zone || !statut) return;

  function afficherMessage(message) {
    statut.textContent = message;
  }

  function creerElement(tag, texte) {
    const element = document.createElement(tag);
    element.textContent = texte || "";
    return element;
  }
  const section = document.getElementById("annonces-pro");
  const appointmentUI = window.batilinkAppointments;
  const client = window.batilinkClient;
  // BatiLink UX actions progressives V2
  const appointmentTargets = new Map();
  const actionTargets = new Map();

  function afficherActions(id, reponse, entries) {
    const ui = actionTargets.get(id);
    if (!ui) return;
    const enAttente = entries.some(r => r.status === "pending_client" || r.status === "counter_proposed");
    const confirme = entries.some(r => r.status === "accepted");
    const termine = entries.some(r => r.status === "refused" || r.status === "cancelled");
    const interesse = Boolean(reponse) || entries.length > 0;
    ui.interet.hidden = interesse;
    ui.etat.hidden = !interesse || entries.length > 0;
    ui.etat.textContent = interesse ? "✓ Intérêt envoyé" : "";
    ui.formulaire.hidden = !reponse || enAttente;
    if (ui.formulaire.hidden) ui.formulaire.open = false;
    ui.ouvrir.textContent = confirme ? "Proposer un autre rendez-vous" :
      termine ? "Proposer une nouvelle date" : "Proposer un rendez-vous";
  }
  let orphanSection;
  let orphanList;
  let appointmentStatus;
  let generationChargement = 0;
  let appointmentRead = 0;
  let readingAppointments = false;

  function clearAnnouncements() {
    appointmentRead++;
    readingAppointments = false;
    appointmentTargets.clear();
    actionTargets.clear();
    orphanSection = null;
    orphanList = null;
    appointmentStatus = null;
    zone.replaceChildren();
  }
  async function chargerAnnonces() {
    const generation = ++generationChargement;
    clearAnnouncements();
    try {
      if (!window.batilinkConfig || !window.supabase || !client) {
        afficherMessage("Connexion Supabase indisponible.");
        return;
      }

      const { data: session, error: authError } =
        await client.auth.getUser();
      if (generation !== generationChargement) return;

      if (authError || !session.user) {
        afficherMessage("Connectez-vous pour consulter les annonces.");
        return;
      }

      const { data: professionnel, error: proError } = await client
        .from("batilink_professionals")
        .select("id,status")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (generation !== generationChargement) return;

      if (proError) {
        console.error("Erreur dossier professionnel :", proError);
        afficherMessage("Impossible de vérifier votre dossier pour le moment.");
        return;
      }
      if (!professionnel) {
        afficherMessage("Aucun dossier professionnel associé à ce compte.");
        return;
      }
      if (professionnel.status === "pending") {
        afficherMessage("Votre dossier professionnel est en attente de validation.");
        return;
      }
      if (professionnel.status !== "verified") {
        afficherMessage("Votre dossier professionnel n'est pas autorisé à consulter les annonces.");
        return;
      }

      appointmentStatus = creerElement("p", "");
      appointmentStatus.setAttribute("role", "status");
      orphanSection = document.createElement("section");
      orphanSection.hidden = true;
      orphanList = document.createElement("div");
      orphanSection.append(creerElement("h3", "Autres rendez-vous de chantier"), orphanList);
      zone.append(appointmentStatus, orphanSection);
      await refreshAppointments();

    } catch (erreur) {
      if (generation !== generationChargement) return;
      console.error("BatiLink annonces :", erreur);
      afficherMessage("Impossible de charger les annonces.");
    }
  }
  function appendAnnouncement(annonce, generation) {
    const carte = document.createElement("div");
    carte.className = "card";

    carte.appendChild(
      creerElement("h3", annonce.trade || "Travaux")
    );
    carte.appendChild(
      creerElement("p", "Commune : " + (annonce.commune || "Non précisée"))
    );
    carte.appendChild(
      creerElement("p", annonce.description || "Sans description")
    );
    carte.appendChild(
      creerElement("p", "Budget : " + (annonce.budget || "À définir"))
    );
    carte.appendChild(
      creerElement("p", "Début souhaité : " + (annonce.start_date || "À définir"))
    );


    const boutonInteret = creerElement("button", "Je suis intéressé");
    boutonInteret.type = "button";
    boutonInteret.className = "btn";
    boutonInteret.hidden = true;
    boutonInteret.style.minHeight = "44px";
    const etatInteret = creerElement("p", "Vérification de votre réponse…");
    etatInteret.setAttribute("role", "status");
    etatInteret.style.color = "#166534";
    etatInteret.style.fontWeight = "700";

    const retourInteret = creerElement("p", "");
    retourInteret.setAttribute("role", "status");

    boutonInteret.addEventListener("click", async () => {
      boutonInteret.disabled = true;
      retourInteret.textContent = "Envoi en cours...";

      try {
        const { error } = await client.rpc("batilink_submit_interest", {
          p_request_id: annonce.id,
          p_message: null
        });

        if (generation !== generationChargement) return;
        if (error) {
          if (error.message?.includes("Reponse deja envoyee")) {
            boutonInteret.textContent = "Déjà répondu";
            retourInteret.textContent = "Vous avez déjà répondu à cette annonce.";
            await refreshAppointments(true);
          } else {
            console.error("Erreur de réponse :", error);
            retourInteret.textContent = "Envoi impossible. Réessayez.";
            boutonInteret.disabled = false;
          }
          return;
        }

        boutonInteret.textContent = "Intérêt envoyé";
        retourInteret.textContent = "Votre intérêt a été enregistré.";
        boutonInteret.hidden = true;
        await refreshAppointments(true);
      } catch (erreur) {
        if (generation !== generationChargement) return;
        console.error("Erreur de connexion :", erreur);
        retourInteret.textContent = "Erreur de connexion. Réessayez.";
        boutonInteret.disabled = false;
      }
    });

    carte.append(boutonInteret, etatInteret, retourInteret);
    // BatiLink UX rendez-vous 2026-11-26
    const formulaireRdv = document.createElement("details");
    formulaireRdv.style.marginTop = "12px";
    formulaireRdv.hidden = true;
    const ouvrirRdv = document.createElement("summary");
    ouvrirRdv.className = "btn secondary";
    ouvrirRdv.style.cursor = "pointer";
    ouvrirRdv.style.fontSize = "16px";
    ouvrirRdv.dataset.rdvToggle = "true";
    ouvrirRdv.textContent = "Proposer un rendez-vous";
    formulaireRdv.append(ouvrirRdv);
    const dateRdv = document.createElement("input");
    dateRdv.type = "date";
    dateRdv.setAttribute("aria-label", "Date du rendez-vous");
    const heureRdv = appointmentUI.timeSelect("Heure du rendez-vous, heure de Nouvelle-Calédonie", "09:00");
    const labelRdv = creerElement(
      "p", "Date du rendez-vous (heure de Nouvelle-Calédonie)"
    );

    const messageRdv = document.createElement("textarea");
    messageRdv.placeholder = "Message facultatif";
    messageRdv.maxLength = 1000;

    const boutonRdv = creerElement(
      "button", "Envoyer la proposition"
    );
    boutonRdv.type = "button";
    boutonRdv.className = "btn";

    const annulerRdv = creerElement("button", "Annuler");
    annulerRdv.type = "button";
    annulerRdv.className = "btn secondary";
    annulerRdv.style.marginLeft = "8px";
    annulerRdv.addEventListener("click", () => {
      formulaireRdv.open = false;
      dateRdv.value = "";
      heureRdv.value = "09:00";
      messageRdv.value = "";
      retourRdv.textContent = "";
      ouvrirRdv.focus();
    });
    const retourRdv = creerElement("p", "");
    retourRdv.setAttribute("role", "status");

    boutonRdv.addEventListener("click", async () => {
      if (!dateRdv.value || !heureRdv.value) {
        retourRdv.textContent = "Choisissez une date et une heure.";
        return;
      }

      const dateChoisie = appointmentUI.toInstant(dateRdv.value, heureRdv.value);
      if (!Number.isFinite(dateChoisie.getTime()) ||
          dateChoisie.getTime() <= Date.now()) {
        retourRdv.textContent = "Choisissez une date future.";
        return;
      }

      if (!window.confirm("Envoyer cette proposition de rendez-vous ?")) {
        return;
      }

      boutonRdv.disabled = true;
      annulerRdv.disabled = true;
      retourRdv.textContent = "Envoi en cours...";

      try {
        const { data: reponses, error: erreurReponses } =
          await client.rpc("batilink_my_professional_responses");
        if (generation !== generationChargement) return;

        if (erreurReponses) throw erreurReponses;

        const reponse = (reponses ?? []).find(
          r => r.request_id === annonce.id
        );

        if (!reponse) {
          retourRdv.textContent =
            "Cliquez d'abord sur Je suis intéressé.";
          return;
        }

        const { error } = await client.rpc(
          "batilink_propose_appointment",
          {
            p_response_id: reponse.response_id,
            p_proposed_start_at: dateChoisie.toISOString(),
            p_message: messageRdv.value.trim() || null
          }
        );

        if (generation !== generationChargement) return;
        if (error) throw error;

        retourRdv.textContent = "Rendez-vous proposé au client.";
        dateRdv.value = "";
        messageRdv.value = "";
        formulaireRdv.open = false;
        await refreshAppointments(true);
      } catch (erreur) {
        if (generation !== generationChargement) return;
        console.error("Proposition rendez-vous :", erreur);
        retourRdv.textContent =
          "Envoi non confirmé. Vérifiez le suivi avant de réessayer.";
      } finally {
        boutonRdv.disabled = false;
        annulerRdv.disabled = false;
      }
    });

    const actionsRdv = document.createElement("div");
    actionsRdv.style.marginTop = "8px";
    actionsRdv.append(boutonRdv, annulerRdv);
    formulaireRdv.append(labelRdv, dateRdv, heureRdv, messageRdv, actionsRdv);
    const appointments = document.createElement("div");
    appointmentTargets.set(annonce.id, appointments);
    actionTargets.set(annonce.id, {
      carte, interet: boutonInteret, etat: etatInteret,
      formulaire: formulaireRdv, ouvrir: ouvrirRdv
    });
    carte.append(appointments, formulaireRdv, retourRdv);
    zone.insertBefore(carte, appointmentStatus);
  }

  async function refreshAppointments(force = false) {
    if (!orphanSection || (readingAppointments && !force)) return;
    const generation = generationChargement;
    const read = ++appointmentRead;
    readingAppointments = true;

    try {
      const [matching, rendezvous, reponses] = await Promise.all([
        client.rpc("batilink_matching_requests").select("id,trade,commune,description,budget,start_date"),
        client.rpc("batilink_my_appointments"),
        client.rpc("batilink_my_professional_responses")
      ]);
      if (read !== appointmentRead || generation !== generationChargement) return;
      if (matching.error) throw matching.error;
      const annonces = matching.data ?? [];
      const visibles = new Set(annonces.map(annonce => annonce.id));
      for (const [id, ui] of actionTargets) {
        if (visibles.has(id)) continue;
        ui.carte.remove();
        actionTargets.delete(id);
        appointmentTargets.delete(id);
      }
      for (const annonce of annonces) {
        if (!actionTargets.has(annonce.id)) appendAnnouncement(annonce, generation);
      }
      afficherMessage(annonces.length ? annonces.length + " annonce(s) disponible(s)." : "Aucune annonce disponible actuellement.");
      if (rendezvous.error) throw rendezvous.error;
      if (reponses.error) throw reponses.error;
      const data = rendezvous.data;
      const reponsesParAnnonce = new Map((reponses.data ?? []).map(r => [r.request_id, r]));

      const byRequest = new Map();
      const orphans = [];
      const seen = new Set();
      for (const rdv of data ?? []) {
        if (rdv.my_role !== "professional" || seen.has(rdv.appointment_id)) continue;
        seen.add(rdv.appointment_id);
        if (appointmentTargets.has(rdv.request_id)) {
          const entries = byRequest.get(rdv.request_id) ?? [];
          entries.push(rdv);
          byRequest.set(rdv.request_id, entries);
        } else {
          orphans.push(rdv);
        }
      }
      appointmentStatus.textContent = "";
      const render = rdv => renderAppointment(rdv, generation);
      for (const [id, target] of appointmentTargets) {
        const entries = byRequest.get(id) ?? [];
        appointmentUI.renderList(target, entries, render);
        afficherActions(id, reponsesParAnnonce.get(id), entries);
      }
      appointmentUI.renderList(orphanList, orphans, render);
      orphanSection.hidden = orphans.length === 0;
    } catch (error) {
      if (read !== appointmentRead || generation !== generationChargement) return;
      console.error("Chargement des rendez-vous :", error);
      appointmentStatus.textContent = "Impossible de vérifier vos réponses et rendez-vous. Réessayez dans un instant.";
      for (const ui of actionTargets.values()) {
        ui.interet.hidden = true;
        ui.formulaire.hidden = true;
        ui.formulaire.open = false;
        ui.etat.hidden = true;
      }
    } finally {
      if (read === appointmentRead) readingAppointments = false;
    }
  }

  function renderAppointment(rdv, generation) {
    const bloc = document.createElement("div");
    bloc.className = "card";

    const statuts = {
      pending_client: "En attente du client",
      accepted: "Rendez-vous confirmé",
      refused: "Rendez-vous refusé",
      counter_proposed: "Contre-proposition du client",
      cancelled: "Rendez-vous annulé",
      closed_assigned: "Demande attribuée — proposition close"
    };

    // BatiLink UX expiration V3
    const expire = appointmentUI.isExpired(rdv);
    const statutRdv = creerElement("p", expire ? "Date proposée dépassée" : (statuts[rdv.status] || rdv.status));
    statutRdv.style.fontWeight = "700";
    statutRdv.style.color = rdv.status === "accepted" ? "#166534" :
      rdv.status === "refused" || rdv.status === "cancelled" ? "#991b1b" : "#854d0e";
    if (expire) statutRdv.style.color = "#991b1b";
    bloc.append(creerElement("strong", "Rendez-vous de chantier"), statutRdv);
    for (const ligne of appointmentUI.dates(rdv)) bloc.append(creerElement("p", ligne));

    if (rdv.message) {
      bloc.appendChild(creerElement("p", rdv.message));
    }
    if (rdv.status === "counter_proposed") {
      const retour = creerElement("p", "");
      retour.setAttribute("role", "status");

      const accepter = creerElement("button", "Accepter la nouvelle date");
      const refuser = creerElement("button", "Refuser la nouvelle date");

      accepter.type = "button";
      refuser.type = "button";
      accepter.className = "btn";
      refuser.className = "btn secondary";
      for (const bouton of [accepter, refuser]) {
        bouton.style.minHeight = "44px";
        bouton.style.fontSize = "16px";
      }

      async function decision(action) {
        if (action === "accept" && appointmentUI.isExpired(rdv)) {
          await refreshAppointments(true);
          return;
        }
        accepter.disabled = true;
        refuser.disabled = true;
        retour.textContent = "Enregistrement en cours...";

        try {
          const { error } = await client.rpc(
            "batilink_professional_counter_decision",
            {
              p_appointment_id: rdv.appointment_id,
              p_action: action
            }
          );

          if (generation !== generationChargement) return;
          if (error) throw error;

          retour.textContent = "Décision enregistrée.";
          await refreshAppointments(true);

        } catch (erreur) {
          if (generation !== generationChargement) return;
          console.error("Décision rendez-vous :", erreur);
          retour.textContent = "Opération impossible. Réessayez.";
          accepter.disabled = false;
          refuser.disabled = false;
        }
      }

      accepter.addEventListener("click", () => decision("accept"));
      refuser.addEventListener("click", () => decision("refuse"));

      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.flexWrap = "wrap";
      actions.style.gap = "12px";
      if (!expire) actions.append(accepter);
      actions.append(refuser);
      bloc.append(actions, retour);
    }
    return bloc;
  }

  if (section) appointmentUI.watch(section, () => refreshAppointments());
  document.addEventListener("batilink:annonces-pro", chargerAnnonces);

  if (client) {
    let owner;
    client.auth.onAuthStateChange((event, session) => {
      const nextOwner = session?.user?.id ?? null;
      if (nextOwner === owner && event !== "SIGNED_OUT") return;
      owner = nextOwner;
      const generation = ++generationChargement;
      clearAnnouncements();
      if (!owner) {
        afficherMessage("Connectez-vous pour consulter les annonces.");
      } else if (section && !section.classList.contains("hidden")) {
        window.setTimeout(() => {
          if (generation === generationChargement && !section.classList.contains("hidden")) chargerAnnonces();
        }, 0);
      }
    });
  }
  if (section && !section.classList.contains("hidden")) chargerAnnonces();
})();
