/**
 * Sign in and create account.
 *
 * Two panels behind one tab strip. The `next` parameter carries whoever sent
 * the visitor here, so signing in returns them to the page they wanted
 * rather than dumping them on the home page.
 */

import { $, $$, on, esc, escAttr, delegate, query } from '../core/dom.js';
import { load } from '../core/data.js';
import { initShell } from '../core/shell.js';
import { signIn, register, currentUser } from '../core/auth.js';
import { toast } from '../core/toast.js';

initShell();

const params = query();
const state = { role: params.role === 'employer' ? 'employer' : 'seeker' };

/* Already signed in? Send them where they were going. */
const existing = currentUser();
if (existing && !params.need) {
  location.replace(params.next ? `./${params.next}` : (existing.role === 'employer' ? './employer.html' : './dashboard.html'));
}

const landing = (user) => {
  if (params.next) return `./${params.next}`;
  return user.role === 'employer' ? './employer.html' : './dashboard.html';
};

const fail = (message) => {
  const box = $('#auth-error');
  box.textContent = message;
  box.hidden = false;
};

const clearError = () => { $('#auth-error').hidden = true; };

/* ---------------------------------------------------------------- Tabs */

const showTab = (which) => {
  const isRegister = which === 'register';

  $('#tab-signin').setAttribute('aria-selected', String(!isRegister));
  $('#tab-register').setAttribute('aria-selected', String(isRegister));
  $('#panel-signin').hidden = isRegister;
  $('#panel-register').hidden = !isRegister;
  $('#auth-heading').textContent = isRegister
    ? 'Start tracking where you stand.'
    : 'Keep track of where you stand.';

  clearError();
};

on($('#tab-signin'), 'click', () => showTab('signin'));
on($('#tab-register'), 'click', () => showTab('register'));

if (params.tab === 'register') showTab('register');

if (params.need) {
  fail(params.need === 'employer'
    ? 'That page is for employer accounts. Sign in with one, or create one below.'
    : 'That page is for job seeker accounts. Sign in with one, or create one below.');
}

/* --------------------------------------------------------- Role choice */

const paintRole = () => {
  $$('.role-option').forEach((button) =>
    button.setAttribute('aria-pressed', String(button.dataset.role === state.role)));

  const isEmployer = state.role === 'employer';
  $('#company-field').hidden = !isEmployer;
  $('#company-name-field').hidden = !isEmployer || $('#register-company').value !== '__new';
};

delegate(document, 'click', '.role-option', (event, button) => {
  state.role = button.dataset.role;
  paintRole();
});

on($('#register-company'), 'change', () => {
  $('#company-name-field').hidden = $('#register-company').value !== '__new';
});

/* -------------------------------------------------------------- Submit */

on($('#panel-signin'), 'submit', (event) => {
  event.preventDefault();
  clearError();

  const result = signIn($('#signin-email').value, $('#signin-password').value);

  if (!result.ok) return fail(result.message);

  toast(`Signed in as ${result.user.name}`, 'ok');
  location.href = landing(result.user);
});

on($('#panel-register'), 'submit', (event) => {
  event.preventDefault();
  clearError();

  const companySelect = $('#register-company');
  const picked = companySelect.value;

  const details = {
    name: $('#register-name').value.trim(),
    email: $('#register-email').value.trim(),
    password: $('#register-password').value,
    role: state.role
  };

  if (state.role === 'employer') {
    if (picked === '__new') {
      const name = $('#register-company-name').value.trim();
      if (!name) return fail('Give your company a name, or pick one from the list.');
      details.companyName = name;
    } else if (picked) {
      details.companyId = picked;
    } else {
      return fail('Choose the company you are hiring for.');
    }
  }

  const result = register(details);
  if (!result.ok) return fail(result.message);

  toast('Account created', 'ok');
  location.href = landing(result.user);
});

/* ---------------------------------------------------------- Demo fills */

const fill = (email) => {
  $('#signin-email').value = email;
  $('#signin-password').value = 'password123';
  $('#signin-password').focus();
};

on($('#fill-seeker'), 'click', () => fill('jane@example.com'));
on($('#fill-employer'), 'click', () => fill('alex@example.com'));

/* ---------------------------------------------------------------- Boot */

load().then(({ companies }) => {
  $('#register-company').innerHTML = '<option value="">Choose a company…</option>'
    + companies.map((c) => `<option value="${escAttr(c.id)}">${esc(c.name)}</option>`).join('')
    + '<option value="__new">Somewhere else — I will name it</option>';

  paintRole();
}).catch(() => {
  /* The company list is only needed for employer signup; seeker signup still works. */
  $('#register-company').innerHTML = '<option value="__new">Name your company</option>';
  paintRole();
});
