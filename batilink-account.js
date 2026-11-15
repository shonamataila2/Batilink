'use strict';

const config = window.batilinkConfig ?? {};
const configured = /^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey ?? '');
window.batilinkOnlineRequests = configured;


const accountForm = document.getElementById('account-form');

const accountStatus = document.getElementById('account-status');
const requestForm = document.getElementById('requestForm');
const requestMode = document.getElementById('request-mode');
const requestStatus = document.getElementById('request-status');
const requestButton = requestForm.querySelector('button[type="submit"]');

if (configured && window.supabase?.createClient) {
  connectAccount(window.supabase.createClient(config.url, config.publishableKey));
} else if (configured) {
  const message = 'La connexion est indisponible. Actualise la page et réessaie.';
  accountStatus.textContent = message;
  requestMode.textContent = message;
  requestButton.disabled = true;
} else {
  accountStatus.textContent = 'La connexion au compte sera disponible après la configuration de Supabase.';
}

function connectAccount(client) {
  const accountForm = document.getElementById('account-form');
  const logout = document.getElementById('account-logout');
  const online = document.getElementById('online-requests');
  const onlineStatus = document.getElementById('online-status');
  const onlineList = document.getElementById('online-list');
  const remoteFields = 'id, created_at, trade, commune, description';
  let userId = null;
  let requestOwner = null;
  let requestId = null;
  let refreshVersion = 0;

 if(online) online.hidden = false;
  requestButton.textContent = 'Enregistrer dans mon compte';
  renderAccount();

  client.auth.onAuthStateChange((event, session) => {
    const nextUser = session?.user.id ?? null;
    if (userId !== nextUser) {
      refreshVersion++;
      onlineList.replaceChildren();
      if (userId) {
        requestForm.reset();
        requestStatus.hidden = true;
      }
      requestId = null;
      requestOwner = null;
    }
    userId = nextUser;
    renderAccount();
    if (document.getElementById('tracking')?.classList.contains('hidden')===false) {
      setTimeout(refreshRequests, 0);
    }
  });

  function renderAccount() {
if (accountForm) accountForm.hidden = Boolean(userId);
    if(logout)logout.hidden = !userId;
   if(accountStatus) accountStatus.textContent = userId ? 'Tu es connectée.' : 'Connecte-toi ou crée un compte pour retrouver tes demandes sur un autre appareil.';
    if(requestMode)requestMode.textContent = userId ? 'Ta demande sera enregistrée dans ton compte.' : 'Connecte-toi depuis Compte pour enregistrer ta demande.';
    if (!userId) {
      refreshVersion++;
     if(onlineList) onlineList.replaceChildren();
      if(onlineStatus)onlineStatus.textContent = 'Ouvre Compte et connecte-toi pour retrouver tes demandes.';
    }
  }

 if(accounForm) accountForm.addEventListener('submit', async event => {
    event.preventDefault();
    const credentials = Object.fromEntries(new FormData(accountForm));
    const signup = event.submitter?.value === 'signup';
    if (signup && credentials.password.length < 8) {
      accountStatus.textContent = 'Choisis un mot de passe d’au moins 8 caractères.';
      return;
    }
    const buttons = [...accountForm.querySelectorAll('button')];
    buttons.forEach(button => { button.disabled = true; });
    try {
      const { data, error } = signup
        ? await client.auth.signUp({
          ...credentials,
          options: { emailRedirectTo: new URL('./', location.href).href },
        })
        : await client.auth.signInWithPassword(credentials);
      if (error) throw error;
      accountForm.reset();
      if (signup && !data.session) {
        accountStatus.textContent = 'Si l’inscription est disponible pour cette adresse, un e-mail de confirmation t’a été envoyé. Ouvre son lien puis connecte-toi.';
      }
    } catch {
      accountStatus.textContent = signup
        ? 'Inscription indisponible. Vérifie ton adresse et réessaie.'
        : 'Connexion impossible. Vérifie tes identifiants et la confirmation de ton e-mail.';
    } finally {
      buttons.forEach(button => { button.disabled = false; });
    }
  });

  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      requestForm.reset();
      requestStatus.hidden = true;
    } catch {
      accountStatus.textContent = 'Déconnexion impossible. Réessaie.';
    } finally {
      logout.disabled = false;
    }
  });

  requestForm.addEventListener('input', () => { requestId = null; });
  requestForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!userId) {
      show('account');
      return;
    }
    const owner = userId;
    const fields = Object.fromEntries(new FormData(requestForm));
    const id = requestOwner === owner && requestId ? requestId : crypto.randomUUID();
    requestOwner = owner;
    requestId = id;
    const request = {
      id,
      trade: fields.trade,
      commune: fields.commune,
      description: fields.description.trim(),
      budget: fields.budget === '' ? null : Number(fields.budget),
      start_date: fields.date || null,
      contact_name: fields.name.trim(),
      phone: fields.phone.trim(),
    };
    requestStatus.hidden = false;
    requestStatus.textContent = 'Enregistrement en cours…';
    const controls = [...requestForm.elements];
    controls.forEach(control => { control.disabled = true; });
    try {
      const { error } = await client.from('batilink_requests').insert(request);
      if (error?.code === '23505') {
        const retry = await client.from('batilink_requests').select('id').eq('id', id).maybeSingle();
        if (retry.error || !retry.data) throw error;
      } else if (error) {
        throw error;
      }
      if (userId !== owner) return;
      requestId = null;
      requestForm.reset();
      requestStatus.textContent = 'Demande enregistrée.';
      if (!document.getElementById('request').classList.contains('hidden')) show('tracking');
    } catch {
      if (userId === owner) requestStatus.textContent = 'Enregistrement non confirmé. Vérifie les champs et réessaie.';
    } finally {
      controls.forEach(control => { control.disabled = false; });
    }
  });

  document.addEventListener('batilink:tracking', refreshRequests);

  async function refreshRequests() {
    if (!userId) return;
    const version = ++refreshVersion;
    onlineStatus.textContent = 'Chargement des demandes…';
    onlineList.replaceChildren();
    try {
      const { data, error } = await client.from('batilink_requests')
        .select(remoteFields).order('created_at', { ascending: false });
      if (version !== refreshVersion) return;
      if (error) throw error;
      onlineStatus.textContent = data.length ? '' : 'Aucune demande enregistrée dans ce compte.';
      for (const item of data) {
        const card = document.createElement('article');
        card.className = 'card';
        for (const [tag, text] of [['b', item.trade], ['p', item.commune], ['p', item.description]]) {
          const part = document.createElement(tag);
          part.textContent = text;
          card.append(part);
        }
        onlineList.append(card);
      }
    } catch {
      if (version === refreshVersion) onlineStatus.textContent = 'Impossible de charger tes demandes. Ouvre à nouveau Suivi pour réessayer.';
    }
  }
}
