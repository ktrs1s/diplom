(function initExclusiveCookiePopup() {
  const STORAGE_KEY = "exclusive-cookie-popup-accepted-v1";

  try {
    if (window.localStorage.getItem(STORAGE_KEY)) {
      return;
    }
  } catch {
  }

  const setPopupAccepted = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
    }
  };

  const mountStyles = () => {
    if (document.getElementById("exclusive-cookie-popup-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "exclusive-cookie-popup-styles";
    style.textContent = `
      .cookie-popup {
        position: fixed;
        right: clamp(14px, 2.5vw, 34px);
        bottom: clamp(14px, 2.5vw, 28px);
        z-index: 200;
        width: min(420px, calc(100vw - 28px));
        padding: 24px;
        border: 1px solid rgba(23, 23, 23, 0.1);
        border-radius: 30px;
        background: #fff;
        color: #171717;
        box-shadow: 0 20px 50px rgba(23, 23, 23, 0.08);
        text-transform: none;
        animation: cookie-popup-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .cookie-popup.is-leaving {
        animation: cookie-popup-out 0.24s ease both;
      }

      @keyframes cookie-popup-in {
        from {
          opacity: 0;
          transform: translate3d(0, 18px, 0) scale(0.98);
        }

        to {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
      }

      @keyframes cookie-popup-out {
        from {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }

        to {
          opacity: 0;
          transform: translate3d(0, 14px, 0) scale(0.98);
        }
      }

      .cookie-popup__grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 62px;
        gap: 16px;
        align-items: start;
      }

      .cookie-popup__title {
        margin: 0;
        max-width: 280px;
        font-size: 1.22rem;
        line-height: 1.22;
        font-weight: 500;
        letter-spacing: 0;
      }

      .cookie-popup__text {
        margin: 14px 0 0;
        max-width: 300px;
        color: #6f6a63;
        font-size: 0.92rem;
        line-height: 1.48;
        font-weight: 400;
      }

      .cookie-popup__icon {
        width: 58px;
        justify-self: center;
        color: #171717;
        opacity: 0.32;
      }

      .cookie-popup__icon path,
      .cookie-popup__icon circle {
        fill: none;
        stroke: currentColor;
        stroke-width: 9;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .cookie-popup__actions {
        margin-top: 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px 18px;
        align-items: center;
      }

      .cookie-popup__accept {
        min-width: 136px;
        min-height: 46px;
        padding: 0 24px;
        border: 1px solid #171717;
        border-radius: 999px;
        background: #171717;
        color: #fff;
        font: inherit;
        font-size: 0.95rem;
        font-weight: 400;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease;
      }

      .cookie-popup__more {
        color: #171717;
        font-size: 0.95rem;
        font-weight: 400;
        text-decoration: underline;
        text-decoration-thickness: 1px;
        text-underline-offset: 5px;
      }

      @media (hover: hover) {
        .cookie-popup__accept:hover {
          background: #fff;
          color: #171717;
        }
      }

      @media (max-width: 680px) {
        .cookie-popup {
          right: 14px;
          bottom: 14px;
          width: auto;
          padding: 22px 18px;
        }

        .cookie-popup__grid {
          grid-template-columns: minmax(0, 1fr) 50px;
        }

        .cookie-popup__icon {
          width: 48px;
        }

        .cookie-popup__actions {
          align-items: stretch;
        }

        .cookie-popup__accept {
          width: 100%;
          min-width: 0;
          min-height: 46px;
        }

        .cookie-popup__more {
          width: 100%;
          text-align: center;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .cookie-popup,
        .cookie-popup.is-leaving {
          animation: none;
        }
      }
    `;
    document.head.append(style);
  };

  const mountPopup = () => {
    mountStyles();

    const popup = document.createElement("section");
    popup.className = "cookie-popup";
    popup.setAttribute("aria-label", "Уведомление о cookie");
    popup.innerHTML = `
      <div class="cookie-popup__grid">
        <div>
          <h2 class="cookie-popup__title">Мы используем куки-файлы</h2>
          <p class="cookie-popup__text">Это позволяет нам анализировать взаимодействие посетителей с сайтом и делать его лучше.</p>
        </div>
        <svg class="cookie-popup__icon" viewBox="0 0 220 220" aria-hidden="true">
          <path d="M166 25C137 21 106 31 84 53C47 90 47 151 84 188C121 225 182 225 219 188C241 166 251 135 247 106" transform="translate(-38 -14)"></path>
          <circle cx="126" cy="80" r="8"></circle>
          <circle cx="170" cy="116" r="8"></circle>
          <circle cx="110" cy="140" r="8"></circle>
        </svg>
      </div>
      <div class="cookie-popup__actions">
        <button class="cookie-popup__accept" type="button">Понятно</button>
        <a class="cookie-popup__more" href="/privacy.pdf">Узнать больше</a>
      </div>
    `;

    popup.querySelector(".cookie-popup__accept")?.addEventListener("click", () => {
      setPopupAccepted();
      popup.classList.add("is-leaving");
      window.setTimeout(() => {
        popup.remove();
      }, 260);
    });

    popup.querySelector(".cookie-popup__more")?.addEventListener("click", setPopupAccepted);
    document.body.append(popup);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountPopup, { once: true });
  } else {
    mountPopup();
  }
})();
