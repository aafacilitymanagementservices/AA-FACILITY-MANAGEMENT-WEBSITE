const body = document.body;
const menuToggle = document.querySelector('[data-menu-toggle]');
const mobileMenu = document.querySelector('[data-mobile-menu]');
const mobileServiceToggle = document.querySelector('[data-mobile-services-toggle]');
const mobileSubmenu = document.querySelector('[data-mobile-submenu]');
const quoteButtons = document.querySelectorAll('[data-open-quote]');
const quoteModal = document.querySelector('[data-quote-modal]');
const quoteForm = document.querySelector('[data-quote-form]');
const modalCloseButtons = document.querySelectorAll('[data-close-modal]');
const successMessage = document.querySelector('[data-success-message]');
const faqItems = document.querySelectorAll('[data-faq-item]');
const animatedElements = document.querySelectorAll('[data-animate]');
const contactForm = document.querySelector('[data-contact-form]');
const contactSuccessMessage = document.querySelector('[data-contact-success-message]');
const quoteDetailsField = document.querySelector('textarea[name="quote-details"]');
const whatsappNumber = '971502071744';

function prepareProtectedForm(form) {
  if (!form) {
    return;
  }

  let honeypot = form.querySelector('input[name="website"]');
  let startedAt = form.querySelector('input[name="form-started-at"]');

  if (!honeypot) {
    honeypot = document.createElement('input');
    honeypot.type = 'text';
    honeypot.name = 'website';
    honeypot.autocomplete = 'off';
    honeypot.tabIndex = -1;
    honeypot.setAttribute('aria-hidden', 'true');
    honeypot.style.display = 'none';
    form.appendChild(honeypot);
  }

  if (!startedAt) {
    startedAt = document.createElement('input');
    startedAt.type = 'hidden';
    startedAt.name = 'form-started-at';
    form.appendChild(startedAt);
  }

  refreshFormStartedAt(form);
}

function refreshFormStartedAt(form) {
  const startedAt = form?.querySelector('input[name="form-started-at"]');

  if (startedAt) {
    startedAt.value = String(Date.now());
  }
}

function createWhatsAppChat() {
  if (document.querySelector('[data-whatsapp-chat]')) {
    return;
  }

  const message = 'Hello AA Facilities Management Services, I would like to make an enquiry.';

  const chatLink = document.createElement('a');
  chatLink.className = 'whatsapp-chat';
  chatLink.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  chatLink.target = '_blank';
  chatLink.rel = 'noopener noreferrer';
  chatLink.setAttribute('aria-label', 'Chat with A A Facilities Management Services on WhatsApp');
  chatLink.setAttribute('data-whatsapp-chat', '');
  chatLink.innerHTML = `
    <span class="whatsapp-chat-icon" aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        <path d="M16 3.5c-6.9 0-12.5 5.3-12.5 11.9 0 2.2.7 4.4 1.9 6.2L4 28.5l7.2-1.8c1.5.6 3.1.9 4.8.9 6.9 0 12.5-5.3 12.5-11.9S22.9 3.5 16 3.5Zm0 21.9c-1.5 0-2.9-.3-4.2-1l-.4-.2-4.2 1 1-4-.3-.4c-1.3-1.6-2-3.5-2-5.5 0-5.3 4.5-9.6 10.1-9.6s10.1 4.3 10.1 9.6-4.5 10.1-10.1 10.1Zm5.5-7.2c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7.1-.1.3-.3.4-.5.2-.2.2-.3.3-.5.1-.2.1-.4 0-.5-.1-.2-.7-1.7-1-2.3-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6s1.1 3 1.3 3.2c.2.3 2.2 3.4 5.3 4.7.7.3 1.3.5 1.8.6.8.2 1.4.2 2 .1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4Z" />
      </svg>
    </span>
    <span class="whatsapp-chat-copy">
      <strong>Chat on WhatsApp</strong>
      <small>WhatsApp Business</small>
    </span>
  `;

  document.body.appendChild(chatLink);
}

function placeCaretAtStart(field) {
  if (!field || typeof field.setSelectionRange !== 'function') {
    return;
  }

  field.setSelectionRange(0, 0);
}

function normalizeEmptyTextarea(field) {
  if (!field || field.value.trim() !== '') {
    return;
  }

  field.value = '';
}

function closeMobileMenu() {
  if (!menuToggle || !mobileMenu) {
    return;
  }

  menuToggle.setAttribute('aria-expanded', 'false');
  mobileMenu.classList.remove('open');
  body.classList.remove('menu-open');
}

function openQuoteModal() {
  if (!quoteModal) {
    return;
  }

  closeMobileMenu();
  quoteModal.classList.add('open');
  body.classList.add('modal-open');
  refreshFormStartedAt(quoteForm);

  const firstInput = quoteModal.querySelector('input, select, textarea, button');

  if (firstInput) {
    firstInput.focus();
  }
}

function closeQuoteModal() {
  if (!quoteModal) {
    return;
  }

  quoteModal.classList.remove('open');
  body.classList.remove('modal-open');

  if (quoteForm) {
    quoteForm.style.display = '';
    quoteForm.reset();
    refreshFormStartedAt(quoteForm);
  }

  if (successMessage) {
    successMessage.classList.remove('show');
  }
}

createWhatsAppChat();
prepareProtectedForm(quoteForm);
prepareProtectedForm(contactForm);

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';

    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    mobileMenu.classList.toggle('open', !isOpen);
    body.classList.toggle('menu-open', !isOpen);
  });
}

const mobileMenuLinks = document.querySelectorAll('[data-mobile-menu] a');

mobileMenuLinks.forEach((link) => {
  link.addEventListener('click', () => {
    closeMobileMenu();
  });
});

if (mobileServiceToggle && mobileSubmenu) {
  mobileServiceToggle.addEventListener('click', () => {
    const isOpen = mobileServiceToggle.getAttribute('aria-expanded') === 'true';

    mobileServiceToggle.setAttribute('aria-expanded', String(!isOpen));
    mobileSubmenu.classList.toggle('open', !isOpen);
  });
}

normalizeEmptyTextarea(quoteDetailsField);

if (quoteDetailsField) {
  quoteDetailsField.addEventListener('pointerdown', (event) => {
    normalizeEmptyTextarea(quoteDetailsField);

    if (quoteDetailsField.value !== '') {
      return;
    }

    event.preventDefault();
    quoteDetailsField.focus();
    placeCaretAtStart(quoteDetailsField);
  });

  quoteDetailsField.addEventListener('focus', () => {
    normalizeEmptyTextarea(quoteDetailsField);

    if (quoteDetailsField.value === '') {
      placeCaretAtStart(quoteDetailsField);
    }
  });
}

quoteButtons.forEach((button) => {
  button.addEventListener('click', openQuoteModal);
});

modalCloseButtons.forEach((button) => {
  button.addEventListener('click', closeQuoteModal);
});

if (quoteModal) {
  quoteModal.addEventListener('click', (event) => {
    if (event.target === quoteModal) {
      closeQuoteModal();
    }
  });
}

if (quoteForm && successMessage) {
  quoteForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = quoteForm.querySelector('button[type="submit"]');
    const formData = new FormData(quoteForm);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
    }

    try {
      const response = await fetch(quoteForm.action, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        quoteForm.style.display = 'none';
        successMessage.classList.add('show');
        quoteForm.reset();
        refreshFormStartedAt(quoteForm);
      } else {
        console.error('Quote form submission failed:', result);
      }
    } catch (error) {
      console.error('Quote form network error:', error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Request →';
      }
    }
  });
}

if (contactForm && contactSuccessMessage) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const formData = new FormData(contactForm);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
    }

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        contactForm.style.display = 'none';
        contactSuccessMessage.classList.add('show');
        contactForm.reset();
        refreshFormStartedAt(contactForm);
      } else {
        console.error('Contact form submission failed:', result);
      }
    } catch (error) {
      console.error('Contact form network error:', error);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Send Message';
      }
    }
  });
}

faqItems.forEach((item) => {
  const question = item.querySelector('button');

  if (!question) {
    return;
  }

  question.addEventListener('click', () => {
    item.classList.toggle('open');
  });
});

if ('IntersectionObserver' in window && animatedElements.length > 0) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.14
  });

  animatedElements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index * 0.04, 0.28)}s`;
    observer.observe(element);
  });
} else {
  animatedElements.forEach((element) => {
    element.classList.add('is-visible');
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeQuoteModal();
    closeMobileMenu();
  }
});
