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
  }

  if (successMessage) {
    successMessage.classList.remove('show');
  }
}

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
