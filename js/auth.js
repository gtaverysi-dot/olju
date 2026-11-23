/* OnlineJobs University — Log in modal + Reset password page
   - Log in: anything with [data-login-open] opens the modal (the nav's Sign in links,
     "Back to log in"). Any page opened with #login opens it on load. The markup lives
     in LOGIN_HTML below so every page shares one copy.
   - Reset password (reset-password.html): enter username or email → empty-field error
     or "Sending link…" → "Check your email", with a resend countdown.
   There is no backend yet. The TODO comments mark where the real requests go. */
(() => {
  const STORE_KEY = 'olju:username';   // carries the typed username between log in and reset
  const RESEND_SECONDS = 45;            // placeholder: match the real resend limit

  const store = {
    get: () => { try { return sessionStorage.getItem(STORE_KEY) || ''; } catch { return ''; } },
    set: (v) => { try { v ? sessionStorage.setItem(STORE_KEY, v) : sessionStorage.removeItem(STORE_KEY); } catch {} },
  };

  /* Phosphor icons (@phosphor-icons/core 2.1.1, regular) */
  const svg = (d, cls = '') => `<svg class="${cls}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
  const ICON = {
    x: svg('M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z'),
    eye: svg('M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z', 'icon-show'),
    eyeSlash: svg('M53.92,34.62A8,8,0,1,0,42.08,45.38L61.32,66.55C25,88.84,9.38,123.2,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208a127.11,127.11,0,0,0,52.07-10.83l22,24.21a8,8,0,1,0,11.84-10.76Zm47.33,75.84,41.67,45.85a32,32,0,0,1-41.67-45.85ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.16,133.16,0,0,1,25,128c4.69-8.79,19.66-33.39,47.35-49.38l18,19.75a48,48,0,0,0,63.66,70l14.73,16.2A112,112,0,0,1,128,192Zm6-95.43a8,8,0,0,1,3-15.72,48.16,48.16,0,0,1,38.77,42.64,8,8,0,0,1-7.22,8.71,6.39,6.39,0,0,1-.75,0,8,8,0,0,1-8-7.26A32.09,32.09,0,0,0,134,96.57Zm113.28,34.69c-.42.94-10.55,23.37-33.36,43.8a8,8,0,1,1-10.67-11.92A132.77,132.77,0,0,0,231.05,128a133.15,133.15,0,0,0-23.12-30.77C185.67,75.19,158.78,64,128,64a118.37,118.37,0,0,0-19.36,1.57A8,8,0,1,1,106,49.79,134,134,0,0,1,128,48c34.88,0,66.57,13.26,91.66,38.35,18.83,18.83,27.3,37.62,27.65,38.41A8,8,0,0,1,247.31,131.26Z', 'icon-hide'),
    warning: svg('M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z'),
  };

  /* ---------- Field helpers (shared by both forms) ---------- */
  const makeField = (el) => {
    const input = el.querySelector('input');
    const error = el.querySelector('.field__error');
    const field = { el, input, error };
    input.addEventListener('input', () => { if (el.classList.contains('is-invalid')) setError(field, null); });
    return field;
  };
  // msg: null clears; a string or an array of strings/nodes shows the error
  const setError = ({ el, input, error }, msg) => {
    const on = msg != null;
    el.classList.toggle('is-invalid', on);
    error.hidden = !on;
    if (on) {
      error.querySelector('span').replaceChildren(...[].concat(msg));
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', error.id);
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  };
  const errorLine = (id) => `<p class="field__error" id="${id}" hidden>${ICON.warning}<span></span></p>`;

  /* ==========================================================================
     Log in modal
     ========================================================================== */
  const LOGIN_HTML = `
<dialog class="login" id="login" aria-labelledby="login-title">
  <div class="login__inner">
    <div class="login__main">
      <div class="login__brand">
        <img src="assets/img/logo.png" alt="OnlineJobs University" width="96" height="32">
        <div>
          <h2 class="auth-title" id="login-title">Log in</h2>
          <p class="login__lede">Welcome back. Pick up where you left off.</p>
        </div>
      </div>

      <div class="login__group">
        <!-- TODO: link to the OnlineJobs.ph sign-in, and swap the OJ mark for the real logo -->
        <a class="btn btn-oj" href="#"><span class="oj-mark" aria-hidden="true">OJ</span>Continue with OnlineJobs.ph</a>
        <p class="divider">or log in with your OLJU account</p>
      </div>

      <form class="login__form" method="post" novalidate data-login-form>
        <div class="login__group">
          <div class="field">
            <label class="field__label" for="login-username">Username or email address</label>
            <div class="field__control">
              <input class="field__input" id="login-username" name="username" type="text"
                autocomplete="username" autocapitalize="none" spellcheck="false"
                placeholder="you@email.com" data-empty="Enter your username or email address.">
            </div>
            ${errorLine('login-username-error')}
          </div>

          <div class="field">
            <div class="field__head">
              <label class="field__label" for="login-password">Password</label>
              <a class="text-link" href="reset-password.html" data-reset-link>Lost your password?</a>
            </div>
            <div class="field__control field__control--password">
              <input class="field__input" id="login-password" name="password" type="password"
                autocomplete="current-password" placeholder="Enter your password" data-empty="Enter your password.">
              <button class="field__reveal" type="button" aria-pressed="false" aria-controls="login-password" data-reveal-password>
                <span class="sr-only">Show password</span>${ICON.eye}${ICON.eyeSlash}
              </button>
            </div>
            ${errorLine('login-password-error')}
          </div>
        </div>

        <div class="login__group">
          <label class="check"><input type="checkbox" name="remember"> Remember me</label>
          <button class="btn btn--primary btn--block" type="submit">Log in</button>
        </div>
      </form>
    </div>

    <aside class="login__aside" aria-labelledby="enroll-title">
      <div class="login__aside-copy">
        <p class="login__overline">Don't have an account yet?</p>
        <h2 class="auth-title" id="enroll-title">Enroll now</h2>
        <p>Free courses built by OnlineJobs.ph for Filipino online workers.</p>
      </div>
      <div class="login__aside-actions">
        <!-- TODO: point at student registration and the OnlineJobs.ph sign-up -->
        <a class="btn btn--accent btn--block" href="#">Student registration</a>
        <a class="btn btn--on-dark btn--block" href="#">Sign up with OnlineJobs.ph</a>
      </div>
    </aside>

    <button class="login__close" type="button" data-login-close><span class="sr-only">Close</span>${ICON.x}</button>
  </div>
</dialog>`;

  let login = null;

  const buildLogin = () => {
    document.body.insertAdjacentHTML('beforeend', LOGIN_HTML);
    const dialog = document.getElementById('login');
    const form = dialog.querySelector('[data-login-form]');
    const [user, pass] = [...form.querySelectorAll('.field')].map(makeField);
    const reveal = dialog.querySelector('[data-reveal-password]');

    const setReveal = (show) => {
      pass.input.type = show ? 'text' : 'password';
      reveal.setAttribute('aria-pressed', String(show));
    };
    reveal.addEventListener('click', () => setReveal(pass.input.type === 'password'));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const empty = [user, pass].filter((f) => !f.input.value.trim());
      [user, pass].forEach((f) => setError(f, empty.includes(f) ? f.input.dataset.empty : null));
      if (empty.length) { empty[0].input.focus(); return; }

      // TODO: send the log in request here. Until there is a backend, every
      // attempt shows the "incorrect password" state from the design.
      const resetLink = Object.assign(document.createElement('a'), { href: 'reset-password.html', textContent: 'reset your password' });
      resetLink.dataset.resetLink = '';
      setError(pass, ['That password is incorrect. Try again or ', resetLink, '.']);
      pass.input.focus();
      pass.input.select();
    });

    // Going to reset: carry the username over so it is already filled in
    dialog.addEventListener('click', (e) => {
      if (e.target.closest('[data-reset-link]')) store.set(user.input.value.trim());
    });

    dialog.querySelector('[data-login-close]').addEventListener('click', () => dialog.close());

    // Click on the scrim closes. Track where the press started so a drag out of a field doesn't.
    let pressedBackdrop = false;
    dialog.addEventListener('pointerdown', (e) => { pressedBackdrop = e.target === dialog; });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog && pressedBackdrop) dialog.close();
      pressedBackdrop = false;
    });

    dialog.addEventListener('close', () => {
      [user, pass].forEach((f) => setError(f, null));
      pass.input.value = '';
      setReveal(false);
    });

    login = { dialog, user, pass };
  };

  const openLogin = () => {
    if (!login) buildLogin();
    const { dialog, user, pass } = login;
    if (dialog.open) return;
    if (!user.input.value) user.input.value = store.get();
    dialog.showModal();
    (user.input.value ? pass.input : user.input).focus();
  };

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-login-open]');
    if (!opener) return;
    e.preventDefault();
    openLogin();
  });

  if (location.hash === '#login') {
    history.replaceState(null, '', location.pathname + location.search);
    openLogin();
  }

  /* ==========================================================================
     Reset password page
     ========================================================================== */
  const reset = document.querySelector('[data-reset]');
  if (!reset) return;

  const views = {
    request: reset.querySelector('[data-view="request"]'),
    sent: reset.querySelector('[data-view="sent"]'),
  };
  const form = views.request.querySelector('form');
  const field = makeField(form.querySelector('.field'));
  const submit = form.querySelector('[type="submit"]');
  const submitLabel = submit.querySelector('[data-label]');
  const status = reset.querySelector('[data-status]');
  const sentTo = views.sent.querySelector('[data-sent-to]');
  const sentPrefix = views.sent.querySelector('[data-sent-prefix]');
  const resend = views.sent.querySelector('[data-resend]');
  const pageTitle = document.title;
  let timer = 0;

  field.input.value = store.get();

  const setBusy = (busy) => {
    submit.classList.toggle('is-busy', busy);
    submit.setAttribute('aria-disabled', String(busy));
    submitLabel.textContent = busy ? 'Sending link…' : 'Send reset link';
    field.input.readOnly = busy;
    status.textContent = busy ? 'Sending link…' : '';
  };

  const startCountdown = () => {
    clearInterval(timer);
    let left = RESEND_SECONDS;
    const render = () => {
      const wait = left > 0;
      resend.setAttribute('aria-disabled', String(wait));
      resend.textContent = wait ? `resend in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'resend the email';
    };
    render();
    timer = setInterval(() => {
      left -= 1;
      render();
      if (left <= 0) clearInterval(timer);
    }, 1000);
  };

  const show = (name) => {
    views.request.hidden = name !== 'request';
    views.sent.hidden = name !== 'sent';
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submit.classList.contains('is-busy')) return;
    const value = field.input.value.trim();
    if (!value) {
      setError(field, field.input.dataset.empty);
      field.input.focus();
      return;
    }
    setBusy(true);
    // TODO: send the reset request here. The timeout stands in for it.
    setTimeout(() => {
      setBusy(false);
      store.set(value);
      sentTo.textContent = value;
      sentPrefix.hidden = value.includes('@');   // a username reads "…to the email address for juan_dc"
      show('sent');
      document.title = `Check your email · OnlineJobs University`;
      views.sent.querySelector('h1').focus();
      startCountdown();
    }, 1200);
  });

  resend.addEventListener('click', () => {
    if (resend.getAttribute('aria-disabled') === 'true') return;
    // TODO: send the reset request again here
    status.textContent = 'We sent the email again.';
    startCountdown();
  });

  views.sent.querySelector('[data-try-again]').addEventListener('click', () => {
    clearInterval(timer);
    status.textContent = '';
    document.title = pageTitle;
    show('request');
    field.input.focus();
    field.input.select();
  });
})();
