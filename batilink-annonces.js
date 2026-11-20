
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
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

      if (proError || !professionnel) {
        afficherMessage("Espace réservé aux professionnels inscrits.");
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

        zone.appendChild(carte);
      });

    } catch (erreur) {
      console.error("BatiLink annonces :", erreur);
      afficherMessage("Impossible de charger les annonces.");
    }
  }

  chargerAnnonces();
})();
