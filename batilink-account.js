
'use strict';

const config = window.batilinkConfig ?? {};
const configured = /^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey ?? '');
window.batilinkOnlineRequests = configured;

const accountForm = document.getElementById('account-form');
const accountStatus = document.getElementById('account-status');
const requestForm = document.getElementById('requestForm');
const requestMode = document.getElementById('request-mode');
const requestStatus = document.getElementById('request-status');
const requestButton = requestForm?.querySelector('button[type="submit"]');

if (configured && window.supabase?.createClient) {
 
window.batilinkClient = window.supabase.createClient(
  config.url,
  config.publishableKey
);
connectAccount(window.batilinkClient);

} else if (configured) {
  const message = 'La connexion est indisponible. Actualise la page et réessaie.';
  if (accountStatus) accountStatus.textContent = message;
  if (requestMode) requestMode.textContent = message;
  if (requestButton) requestButton.disabled = true;
} else {
  if (accountStatus) {
    accountStatus.textContent = 'La connexion au compte sera disponible après la configuration de Supabase.';
  }
}

function connectAccount(client) {
  const logout = document.getElementById('account-logout');
  const online = document.getElementById('online-requests');
  const onlineStatus = document.getElementById('online-status');
  const onlineList = document.getElementById('online-list');
  const remoteFields = 'id, created_at, trade, commune, description';

  let userId = null;
  let requestOwner = null;
  let requestId = null;
  let refreshVersion = 0;
  let appointmentRead = 0;
  let readingAppointments = false;
  const appointmentTargets = new Map();
  const appointmentUI = window.batilinkAppointments;

  if (online) online.hidden = false;
  if (requestButton) requestButton.textContent = 'Enregistrer dans mon compte';

  renderAccount();

const forgotPassword = document.getElementById('forgot-password');

if (forgotPassword) {
  forgotPassword.addEventListener('click', async () => {
    const email = document.getElementById('account-email').value.trim();

    if (!email) {
      accountStatus.textContent = 'Entre ton adresse e-mail.';
      return;
    }

    forgotPassword.disabled = true;
    accountStatus.textContent = 'Envoi du lien en cours...';

    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
      });

      if (error) throw error;

      accountStatus.textContent =
        'Si cette adresse possède un compte, un lien de réinitialisation sera envoyé.';
    } catch (error) {
      console.error(error);
      accountStatus.textContent =
        "Impossible d'envoyer le lien pour le moment.";
    } finally {
      forgotPassword.disabled = false;
    }
  });
}


  
  const resetForm = document.getElementById('reset-password-form');
  const resetStatus = document.getElementById('reset-password-status');

  if (resetForm) {
  
const changePasswordButton = document.createElement('button');
changePasswordButton.type = 'button';
changePasswordButton.className = 'btn secondary';

changePasswordButton.textContent = 'Modifier mon mot de passe';

changePasswordButton.hidden = true;

resetForm.before(changePasswordButton);


client.auth.onAuthStateChange((event, session) => {
  changePasswordButton.hidden = !session?.user;

  if (event === 'PASSWORD_RECOVERY') {
    resetForm.hidden = false;
    show('account');
  }
});

changePasswordButton.addEventListener('click', async () => {
  const { data, error } = await client.auth.getUser();

  if (error || !data?.user) {
    accountStatus.textContent = 'Session expirée. Demande un nouveau lien.';
    return;
  }

  const email = data.user.email;
  if (!confirm(`Modifier le mot de passe du compte ${email} ?`)) return;

  resetForm.hidden = false;
  show('account');
});
   
const cancelPasswordButton = document.createElement('button');
cancelPasswordButton.type = 'button';
cancelPasswordButton.className = 'btn secondary';
cancelPasswordButton.textContent = 'Annuler';
resetForm.appendChild(cancelPasswordButton);

cancelPasswordButton.addEventListener('click', () => {
  resetForm.reset();
  resetForm.hidden = true;
  resetStatus.textContent = '';
});



    resetForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const password = document.getElementById('new-password').value;
      const button = resetForm.querySelector('button[type="submit"]');

      button.disabled = true;
      resetStatus.textContent = 'Enregistrement en cours...';

      try {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;

        resetStatus.textContent = 'Mot de passe modifié avec succès.';
        resetForm.reset();
        resetForm.hidden = true;
        
let message = document.getElementById('password-success');

if (!message) {
  message = document.createElement('p');
  message.id = 'password-success';
  message.className = 'notice';
  message.setAttribute('role', 'status');
  document.getElementById('home').prepend(message);
}

message.textContent = 'Mot de passe modifié avec succès !';
show('home');

      } catch (error) {
        console.error(error);
        resetStatus.textContent = 'Modification impossible. Demande un nouveau lien.';
      } finally {
        button.disabled = false;
      }
    });
  }

  client.auth.onAuthStateChange((event, session) => {
    const nextUser = session?.user?.id ?? null;

    if (userId !== nextUser) {
      refreshVersion++;
      appointmentRead++;
      readingAppointments = false;
      appointmentTargets.clear();
      if (onlineList) onlineList.replaceChildren();

      if (userId && requestForm) {
        requestForm.reset();
        if (requestStatus) requestStatus.hidden = true;
      }

      requestId = null;
      requestOwner = null;
    }

    userId = nextUser;
    renderAccount();

    if (document.getElementById('tracking')?.classList.contains('hidden') === false) {
      setTimeout(refreshRequests, 0);
    }
  });

  function renderAccount() {
    if (accountForm) accountForm.hidden = Boolean(userId);
    if (logout) logout.hidden = !userId;

    if (accountStatus) {
      accountStatus.textContent = userId
        ? 'Tu es connectée.'
           : 'Connecte-toi ou crée un compte pour retrouver tes demandes sur un autre appareil.';
  accountStatus.style.color = userId ? '#16a34a' : '';
}

    if (requestMode) {
      requestMode.textContent = userId
        ? 'Ta demande sera enregistrée dans ton compte.'
        : 'Connecte-toi depuis Compte pour enregistrer ta demande.';
    }

    if (!userId) {
      refreshVersion++;
      if (onlineList) onlineList.replaceChildren();

      if (onlineStatus) {
        onlineStatus.textContent = 'Ouvre Compte et connecte-toi pour retrouver tes demandes.';
      }
    }
  }

  if (accountForm) {
    accountForm.addEventListener('submit', async event => {
      event.preventDefault();

      const credentials = Object.fromEntries(new FormData(accountForm));
      const signup = event.submitter?.value === 'signup';

      if (signup && (credentials.password ?? '').length < 8) {
        if (accountStatus) {
          accountStatus.textContent = 'Choisis un mot de passe d’au moins 8 caractères.';
        }
        return;
      }

      const buttons = [...accountForm.querySelectorAll('button')];
      buttons.forEach(button => { button.disabled = true; });

      try {
        const { data, error } = signup
          ? await client.auth.signUp({
              ...credentials,
              options: {
                emailRedirectTo: new URL('./', location.href).href
              }
            })
          : await client.auth.signInWithPassword(credentials);

        if (error) throw error;

        accountForm.reset();
        
if (!signup && data?.session?.user) {
  const home = document.getElementById('home');

  if (home) {
    document.getElementById('login-success')?.remove();

    const notice = document.createElement('p');
    notice.id = 'login-success';
    notice.className = 'notice';
    notice.setAttribute('role', 'status');
    notice.textContent =
      'Connexion réussie. Bienvenue sur BatiLink !';

    home.prepend(notice);
    setTimeout(() => notice.remove(), 6000);
  }

  show('home');
}


        if (signup && !data.session && accountStatus) {
          accountStatus.textContent =
            'Si l’inscription est disponible pour cette adresse, un e-mail de confirmation t’a été envoyé. Ouvre son lien puis connecte-toi.';
        }
      } catch (error) {
        console.error('Erreur authentification BatiLink :', error);
        if (accountStatus) {
          accountStatus.textContent = signup
            ? 'Inscription indisponible. Vérifie ton adresse et réessaie.'
            : 'Connexion impossible. Vérifie tes identifiants et la confirmation de ton e-mail.';
        }
      } finally {
        buttons.forEach(button => { button.disabled = false; });
      }
    });
  }

  if (logout) {
    logout.addEventListener('click', async () => {
      logout.disabled = true;

      try {
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) throw error;

        if (requestForm) requestForm.reset();
        if (requestStatus) requestStatus.hidden = true;
       
const home = document.getElementById('home');

if (home) {
  document.getElementById('logout-success')?.remove();

  const notice = document.createElement('p');
  notice.id = 'logout-success';
  notice.className = 'notice';
  notice.style.color = '#188038';
  notice.textContent = 'Vous êtes déconnecté de votre compte BatiLink.';
  notice.setAttribute('role', 'status');

  home.prepend(notice);

  setTimeout(() => notice.remove(), 6000);
}

      } catch {
        if (accountStatus) {
          accountStatus.textContent = 'Déconnexion impossible. Réessaie.';
        }
      } finally {
        logout.disabled = false;
      }
    });
  }

  if (requestForm) {
    requestForm.addEventListener('input', () => {
      requestId = null;
    });

    requestForm.addEventListener('submit', async event => {
      event.preventDefault();

      if (!userId) {
        show('account');
        return;
      }

      const owner = userId;
      const fields = Object.fromEntries(new FormData(requestForm));
      const id = requestOwner === owner && requestId
        ? requestId
        : crypto.randomUUID();

      requestOwner = owner;
      requestId = id;

      const request = {
        id,
        trade: fields.trade,
        commune: (fields.commune??'').trim(),
        description: (fields.description ?? '').trim(),
        budget: fields.budget === '' ? null : Number(fields.budget),
        start_date: fields.date || null,
        contact_name: (fields.name ?? '').trim(),
        phone: (fields.phone ?? '').trim()
      };

      if (requestStatus) {
        requestStatus.hidden = false;
        requestStatus.textContent = 'Enregistrement en cours…';
      }

      const controls = [...requestForm.elements];
      controls.forEach(control => { control.disabled = true; });

      try {
        const { error } = await client
          .from('batilink_requests')
          .insert(request);

        if (error?.code === '23505') {
          const retry = await client
            .from('batilink_requests')
            .select('id')
            .eq('id', id)
            .maybeSingle();

          if (retry.error || !retry.data) throw error;
        } else if (error) {
          throw error;
        }

        if (userId !== owner) return;

        requestId = null;
        requestForm.reset();

        if (requestStatus) {
          requestStatus.textContent = 'Demande enregistrée.';
        }

        if (document.getElementById('request')?.classList.contains('hidden') === false) {
          show('tracking');
        }
      } catch {
        if (userId === owner && requestStatus) {
          requestStatus.textContent =
            'Enregistrement non confirmé. Vérifie les champs et réessaie.';
        }
      } finally {
        controls.forEach(control => { control.disabled = false; });
      }
    });
  }

  document.addEventListener('batilink:tracking', refreshRequests);
  const tracking = document.getElementById('tracking');
  if (tracking) appointmentUI.watch(tracking, () => refreshAppointments());
refreshRequests();
  async function refreshRequests() {
    if (!userId || !onlineStatus || !onlineList) return;

    const version = ++refreshVersion;
    appointmentRead++;
    readingAppointments = false;
    appointmentTargets.clear();
    onlineStatus.textContent = 'Chargement des demandes…';
    onlineList.replaceChildren();

    try {
      const { data, error } = await client
        .from('batilink_requests')
        .select(remoteFields)
        .eq('user_id', userId).order('created_at', { ascending: false });

      if (version !== refreshVersion) return;
      if (error) throw error;

      const requests = data ?? [];

const { data: responses, error: responsesError } =
  await client.rpc('batilink_client_interests');

if (version !== refreshVersion) return;

if (responsesError) {
  console.error('Chargement des intérêts :', responsesError);
}

const responsesParAnnonce = new Map();

for (const response of responsesError ? [] : (responses ?? [])) {
  const liste = responsesParAnnonce.get(response.request_id) ?? [];
  liste.push(response);
  responsesParAnnonce.set(response.request_id, liste);
}

      onlineStatus.textContent = requests.length
        ? ''
        : 'Aucune demande enregistrée dans ce compte.';

      for (const item of requests) {
        const card = document.createElement('article');
        card.className = 'card';

        for (const [tag, value] of [
          ['b', item.trade],
          ['p', item.commune],
          ['p', item.description]
        ]) {
          const part = document.createElement(tag);
          part.textContent = value ?? '';
          card.append(part);
        }

const interets = (responsesParAnnonce.get(item.id) ?? [])
  .filter(reponse => reponse.response_status === 'interested');

const infoInterets = document.createElement('p');

infoInterets.textContent = responsesError
  ? 'Réponses momentanément indisponibles.'
  : interets.length
    ? `${interets.length} professionnel(s) intéressé(s) :`
    : 'Aucun professionnel intéressé pour le moment.';

card.append(infoInterets);

for (const reponse of interets) {
  const ligneInteret = document.createElement('p');

  ligneInteret.textContent =
    'Professionnel : ' + (reponse.company || 'Nom non renseigné') +
    (reponse.message ? ' — ' + reponse.message : '');

  card.append(ligneInteret);
}

        const appointments = document.createElement('div');
        const appointmentStatus = document.createElement('p');
        appointmentStatus.setAttribute('role', 'status');
        appointmentTargets.set(item.id, { appointments, appointmentStatus });
        card.append(appointmentStatus, appointments);
        onlineList.append(card);
      }
      await refreshAppointments();
    } catch {
      if (version === refreshVersion) {
        onlineStatus.textContent =
          'Impossible de charger tes demandes. Ouvre à nouveau Suivi pour réessayer.';
      }
    }
  }
  async function refreshAppointments(force = false) {
    if (!userId || appointmentTargets.size === 0 || (readingAppointments && !force)) return;
    const read = ++appointmentRead;
    const owner = userId;
    readingAppointments = true;

    try {
      const { data, error } = await client.rpc('batilink_my_appointments');
      if (read !== appointmentRead || owner !== userId) return;
      if (error) throw error;

      const byRequest = new Map();
      for (const rdv of data ?? []) {
        if (rdv.my_role !== 'client' || !appointmentTargets.has(rdv.request_id)) continue;
        const entries = byRequest.get(rdv.request_id) ?? [];
        entries.push(rdv);
        byRequest.set(rdv.request_id, entries);
      }
      for (const [id, { appointments, appointmentStatus }] of appointmentTargets) {
        appointmentStatus.textContent = '';
        appointmentUI.renderList(appointments, byRequest.get(id) ?? [], renderAppointment);
      }
    } catch (error) {
      if (read !== appointmentRead || owner !== userId) return;
      console.error('Chargement des rendez-vous :', error);
      for (const { appointmentStatus } of appointmentTargets.values()) {
        appointmentStatus.textContent = 'Rendez-vous momentanément indisponibles.';
      }
    } finally {
      if (read === appointmentRead) readingAppointments = false;
    }
  }

  function renderAppointment(rdv) {
    const statutsRdv = {
      pending_client: 'En attente de votre réponse',
      accepted: 'Rendez-vous confirmé',
      refused: 'Rendez-vous refusé',
      counter_proposed: 'Autre date proposée',
      cancelled: 'Rendez-vous annulé'
    };

    const bloc = document.createElement('div');
    bloc.className = 'card';

    const titre = document.createElement('strong');
    titre.textContent = 'Rendez-vous de chantier';

    const statut = document.createElement('p');
    statut.textContent = statutsRdv[rdv.status] || rdv.status;
    bloc.append(titre, statut);
    for (const ligne of appointmentUI.dates(rdv)) {
      const date = document.createElement('p');
      date.textContent = ligne;
      bloc.append(date);
    }

    if (rdv.message) {
      const message = document.createElement('p');
      message.textContent = rdv.message;
      bloc.append(message);
    }
    if (rdv.status === 'pending_client') {
      const actions = document.createElement('div');

      const nouvelleDate = document.createElement('input');
      nouvelleDate.type = 'date';
      const nouvelleHeure = appointmentUI.timeSelect('Heure proposée, heure de Nouvelle-Calédonie');
      nouvelleDate.setAttribute(
        'aria-label', 'Nouvelle date, heure de Nouvelle-Calédonie'
      );

      const indication = document.createElement('p');
      indication.textContent = 'Nouvelle date (heure de Nouvelle-Calédonie) :';

      const retour = document.createElement('p');
      retour.setAttribute('role', 'status');

      const boutons = [];

      for (const [action, libelle] of [
        ['accept', 'Accepter'],
        ['refuse', 'Refuser'],
        ['counter', 'Proposer une autre date']
      ]) {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.textContent = libelle;
        boutons.push(bouton);

        bouton.addEventListener('click', async () => {
          const owner = userId;
          const version = refreshVersion;
          let dateProposee = null;

          if (action === 'counter') {
            if (!nouvelleDate.value || !nouvelleHeure.value) {
              retour.textContent = 'Choisissez une date et une heure.';
              return;
            }

            const choix = appointmentUI.toInstant(nouvelleDate.value, nouvelleHeure.value);

            if (!Number.isFinite(choix.getTime()) ||
                choix.getTime() <= Date.now()) {
              retour.textContent = 'Choisissez une date future.';
              return;
            }

            dateProposee = choix.toISOString();
          }

          if (!window.confirm('Confirmer : ' + libelle + ' ?')) {
            return;
          }

          boutons.forEach(b => b.disabled = true);
          nouvelleDate.disabled = true;
          nouvelleHeure.disabled = true;
          retour.textContent = 'Enregistrement en cours...';

          try {
            const { error } = await client.rpc(
              'batilink_client_appointment_decision',
              {
                p_appointment_id: rdv.appointment_id,
                p_action: action,
                p_counter_start_at: dateProposee
              }
            );

            if (owner !== userId || version !== refreshVersion) return;
            if (error) throw error;

            retour.textContent = 'Décision enregistrée.';
            await refreshAppointments(true);

          } catch (err) {
            if (owner !== userId || version !== refreshVersion) return;
            console.error('Décision rendez-vous :', err);
            retour.textContent =
              'Impossible de confirmer la décision. Actualisez le suivi.';
            boutons.forEach(b => b.disabled = false);
            nouvelleDate.disabled = false;
            nouvelleHeure.disabled = false;
          }
        });

        actions.append(bouton);
      }

      bloc.append(indication, nouvelleDate, nouvelleHeure, actions, retour);
    }
    return bloc;
  }
}

async function chargerDemandesProfessionnelles() {
  const liste = document.getElementById('matching-list');
  if (!liste) return;

  liste.textContent = 'Chargement des demandes...';

  try {
    const config = window.batilinkConfig;
    if (!config?.url || !config?.publishableKey ||
        !window.supabase?.createClient) {
      throw new Error('Connexion indisponible');
    }

    const client = window.supabase.createClient(
      config.url,
      config.publishableKey
    );

    const { data, error } = await client.rpc(
      'batilink_matching_requests'
    );

    if (error) throw error;

    liste.replaceChildren();

    if (!data?.length) {
      liste.textContent = 'Aucune demande correspondante.';
      return;
    }

    for (const demande of data) {
      const carte = document.createElement('article');
      carte.className = 'card';

      for (const champ of ['trade', 'commune', 'description']) {
        const texte = document.createElement('p');
        texte.textContent = demande[champ] ?? '';
        carte.append(texte);
      }

      liste.append(carte);
    }
  } catch (erreur) {
    liste.textContent = 'Impossible de charger les demandes.';
    console.error(erreur);
  }
}

