
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

  async function chargerAnnonces() {
    zone.replaceChildren();
    try {
      const config = window.batilinkConfig;

      if (!config || !window.supabase) {
        afficherMessage("Connexion Supabase indisponible.");
        return;
      }

     
const client = window.batilinkClient;

if (!client) {
  afficherMessage("Connexion Supabase indisponible.");
  return;
}


      const { data: session, error: authError } =
        await client.auth.getUser();

      if (authError || !session.user) {
        afficherMessage("Connectez-vous pour consulter les annonces.");
        return;
      }

     
const { data: professionnel, error: proError } =
  await client
    .from("batilink_professionals")
    .select("id,status")
    .eq("user_id", session.user.id)
    .maybeSingle();

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


      const { data: annonces, error } = await client
       
.rpc("batilink_matching_requests")


.select("id,trade,commune,description,budget,start_date");

      if (error) throw error;

      zone.replaceChildren();

      if (!annonces || annonces.length === 0) {
        afficherMessage("Aucune annonce disponible actuellement.");
        return;
      }

      afficherMessage(annonces.length + " annonce(s) disponible(s).");

      annonces.forEach(function (annonce) {
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

    if (error) {
      if (error.message?.includes("Reponse deja envoyee")) {
        boutonInteret.textContent = "Déjà répondu";
        retourInteret.textContent = "Vous avez déjà répondu à cette annonce.";
      } else {
        console.error("Erreur de réponse :", error);
        retourInteret.textContent = "Envoi impossible. Réessayez.";
        boutonInteret.disabled = false;
      }
      return;
    }

    boutonInteret.textContent = "Intérêt envoyé";
    retourInteret.textContent = "Votre intérêt a été enregistré.";
  } catch (erreur) {
    console.error("Erreur de connexion :", erreur);
    retourInteret.textContent = "Erreur de connexion. Réessayez.";
    boutonInteret.disabled = false;
  }
});

carte.append(boutonInteret, retourInteret);

        zone.appendChild(carte);
      });

    } catch (erreur) {
      console.error("BatiLink annonces :", erreur);
      afficherMessage("Impossible de charger les annonces.");
    }
  }
const authClient = window.batilinkClient;

if (authClient) {
  authClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      zone.replaceChildren();
      afficherMessage("Connectez-vous pour consulter les annonces.");
    }
  });
}
  chargerAnnonces();
})();
